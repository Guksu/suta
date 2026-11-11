/**
 * 프레임워크 무관 확대 전환(공유 요소) 코어 (의존성 0).
 *
 * 썸네일의 복제(고스트)를 제자리에 띄운 뒤 화면 중앙 확대 크기로 transform 전환한다 —
 * 사용자에게는 "그 썸네일이 커진 것"으로 보인다(공유 요소 전환의 최소형).
 * 닫으면 역방향으로 제자리에 돌아가 정리된다. transform·opacity만 사용(GPU).
 */

import { createBackDismiss } from './createBackDismiss'

type OpenZoomOptions = {
  /** 확대할 요소 (보통 이미지·카드) — 복제되어 고스트가 된다 */
  source: HTMLElement
  durationMs?: number
  /** 화면 대비 최대 비율 (기본 0.9) */
  maxViewportRatio?: number
  /** 닫기 버튼(백드롭 전체)의 낭독 이름 — 기본 '닫기' */
  closeLabel?: string
  /** true면 열려 있는 동안 뒤로 가기가 페이지를 떠나지 않고 확대본을 닫는다 (기본 false) */
  closeOnBack?: boolean
  onClose?: () => void
}

/** 지금 열려 있는 확대본의 닫기 함수 — 화면을 덮는 것은 한 번에 하나다 */
let active: { close: () => void; backdrop: HTMLElement } | undefined

/** 열고 나서 돌려받는 함수를 호출하면 닫힌다 (백드롭 클릭·Esc로도 닫힘) */
export const openZoom = ({
  source,
  durationMs = 350,
  maxViewportRatio = 0.9,
  closeLabel = '닫기',
  closeOnBack = false,
  onClose,
}: OpenZoomOptions) => {
  // 포커스가 썸네일에 남은 채 Enter를 연타하면 확대본이 겹겹이 쌓인다 — 열려 있으면 그 닫기 함수를 돌려준다
  // (백드롭이 밖에서 지워졌으면 — 화면이 통째로 갈린 경우 — 열려 있지 않은 것으로 본다)
  if (active?.backdrop.isConnected) return active.close

  let from = source.getBoundingClientRect()
  // 숨겨진 요소는 크기가 0이라 배율이 무한대가 된다 — 열지 않는다
  if (from.width === 0 || from.height === 0) return () => {}

  // 백드롭 전체가 닫기 버튼이다 — 터치·마우스는 아무 데나 눌러 닫고, 키보드와 스크린 리더는 이 버튼 하나를 만난다
  const backdrop = document.createElement('button')
  backdrop.type = 'button'
  backdrop.className = 'zoom-backdrop'
  backdrop.setAttribute('aria-label', closeLabel)
  backdrop.dataset.open = 'false'

  const ghost = source.cloneNode(true) as HTMLElement
  ghost.classList.add('zoom-ghost')
  // 복제본은 그림일 뿐이다 — 같은 id가 둘이 되거나, 복제된 버튼이 Tab 순서·낭독에 끼지 않게 한다
  ghost.removeAttribute('id')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.setAttribute('inert', '')
  // 겹치는 순서는 백드롭(--z-viewer) 바로 위 — 숫자를 고정하면 토큰을 올린 프로젝트에서 백드롭 밑에 깔린다
  ghost.style.cssText += `;position: fixed; margin: 0; transform-origin: top left; transition: transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1); z-index: calc(var(--z-viewer, 90) + 1);`

  /** 출발 자리와 가운데 확대 목표 — 창 크기가 바뀌면 다시 계산한다 */
  const place = () => {
    ghost.style.left = `${from.left}px`
    ghost.style.top = `${from.top}px`
    ghost.style.width = `${from.width}px`
    ghost.style.height = `${from.height}px`
    // 중앙 확대 목표: 비율 유지 최대 확대(뷰포트의 maxViewportRatio 이내)
    const scale = Math.min(
      (window.innerWidth * maxViewportRatio) / from.width,
      (window.innerHeight * maxViewportRatio) / from.height,
    )
    const dx = (window.innerWidth - from.width * scale) / 2 - from.left
    const dy = (window.innerHeight - from.height * scale) / 2 - from.top
    return `translate(${dx}px, ${dy}px) scale(${scale})`
  }
  let target = place()

  const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : source
  document.body.append(backdrop, ghost)
  const body = document.body
  const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
  const widthBefore = document.documentElement.clientWidth
  body.style.overflow = 'hidden'
  // 스크롤바가 사라지며 넓어진 만큼 채운다 — 채우지 않으면 뒤 화면이 옆으로 밀려 썸네일과 고스트의 자리가 어긋난다
  const widened = document.documentElement.clientWidth - widthBefore
  if (widened > 0) body.style.paddingRight = `${(parseFloat(getComputedStyle(body).paddingRight) || 0) + widened}px`
  backdrop.focus({ preventScroll: true })

  let closing = false
  let opened = false
  let releaseBack: (() => void) | undefined

  const cleanup = () => {
    backdrop.remove()
    ghost.remove()
    body.style.overflow = previous.overflow
    body.style.paddingRight = previous.paddingRight
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', onResize)
    if (active?.close === close) active = undefined
    // 포커스를 연 자리로 돌려보낸다 — 돌려보내지 않으면 body로 떨어져 Tab이 문서 처음부터 다시 시작한다
    if (returnFocusTo.isConnected) returnFocusTo.focus({ preventScroll: true })
    onClose?.()
  }

  const close = () => {
    if (closing) return
    closing = true
    releaseBack?.()
    backdrop.dataset.open = 'false'
    ghost.style.transform = '' // 제자리로 — 역방향 전환
    let done = false
    const finish = () => {
      if (done) return
      done = true
      cleanup()
    }
    ghost.addEventListener('transitionend', finish, { once: true })
    setTimeout(finish, durationMs + 200) // transitionend 유실 폴백
    // 아직 열리는 중이었다면 전환이 즉시 끝날 수 있다 — 폴백이 정리를 보장한다
    if (!opened) requestAnimationFrame(finish)
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (!backdrop.isConnected) return
    if (event.key === 'Escape') close()
    // 포커스가 갈 곳은 닫기 버튼 하나다 — Tab이 가려진 뒤 화면으로 나가지 않게 한다
    if (event.key === 'Tab') event.preventDefault()
  }

  const onResize = () => {
    if (closing) return
    // 회전·창 크기 변경 — 옛 좌표에 두면 확대본이 가운데서 벗어나거나 화면 밖으로 나간다
    if (source.isConnected) from = source.getBoundingClientRect()
    if (from.width === 0 || from.height === 0) return
    target = place()
    if (!opened) return
    ghost.style.transition = 'none'
    ghost.style.transform = target
    void ghost.offsetWidth // 전이 없이 옮긴 스타일을 확정한 뒤 전이를 되살린다
    ghost.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
  }

  backdrop.addEventListener('click', (event) => {
    // 썸네일을 더블 클릭하면 두 번째 클릭이 방금 깔린 백드롭에 떨어진다 — 열리자마자 닫히지 않게 그 클릭은 넘긴다
    if (event.detail > 1) return
    close()
  })
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
  if (closeOnBack) releaseBack = createBackDismiss({ onDismiss: close })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (closing) return
      opened = true
      backdrop.dataset.open = 'true'
      ghost.style.transform = target
    })
  })

  active = { close, backdrop }
  return close
}
