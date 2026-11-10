/**
 * 프레임워크 무관 툴팁 트리거 코어 (의존성 0).
 *
 * 앵커에 이벤트를 걸어 툴팁의 data-open만 토글한다 — 뜨고 지는 모션은 tooltip.css 담당.
 * 규칙은 툴팁 관례 그대로: 호버는 지연 후 열림(스치는 커서에 반응하지 않게),
 * 키보드 포커스는 즉시 열림(기다릴 이유가 없다), Escape는 언제든 닫는다(WAI-ARIA 요구).
 *
 * 호버로 뜨는 내용이 지켜야 하는 세 가지(WCAG 1.4.13)도 여기서 맡는다:
 *  - 닫을 수 있다 — Escape. 그 Escape는 툴팁이 쓴 것이므로 바깥 모달·시트로 넘기지 않는다
 *  - 가리킬 수 있다 — 포인터가 말풍선 위로 옮겨 가도 닫지 않는다
 *  - 유지된다 — 시간이 지났다고 스스로 닫지 않는다
 *
 * 바닐라 사용: createTooltipTrigger({ anchor, tooltip }) — 반환값이 해제 함수.
 * React 사용: Tooltip.tsx가 이 코어를 감싼다.
 */

type TooltipPlace = 'top' | 'bottom' | 'left' | 'right'

type CreateTooltipTriggerOptions = {
  /** 이벤트를 받을 앵커 — 버튼·아이콘, 또는 그것을 감싼 래퍼(focusin/focusout은 버블링된다) */
  anchor: HTMLElement
  /** data-open을 받을 툴팁 요소 (tooltip.css의 .tooltip) */
  tooltip: HTMLElement
  /** 호버 열림 지연 (기본 400ms) — 포커스 열림에는 적용되지 않는다 */
  showDelayMs?: number
  /** 원래 방향 — 생략하면 툴팁의 data-place를 읽는다. 자리가 없으면 열 때 반대쪽으로 뒤집는다 */
  place?: TooltipPlace
}

const OPPOSITE: Record<TooltipPlace, TooltipPlace> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
/** 화면 가장자리에서 띄우는 여백 */
const EDGE_PADDING_PX = 8
/** 닫힌 말풍선은 앵커 쪽으로 이만큼 밀려 있다(tooltip.css의 --_slide) — 잰 값에 여유로 더한다 */
const SLIDE_PX = 4
/** 화살표(8px)가 둥근 모서리(8px) 안쪽에 남도록, 말풍선 가운데에서 밀 수 있는 한계를 정한다 */
const ARROW_KEEP_PX = 12

/** 지금 열려 있는 말풍선을 닫는 함수 — 말풍선은 화면에 하나만 둔다 */
let closeCurrent: (() => void) | undefined

export const createTooltipTrigger = ({ anchor, tooltip, showDelayMs = 400, place }: CreateTooltipTriggerOptions) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  // 마지막 입력이 포인터였는가 — 눌러서 생긴 포커스와 키보드로 옮겨 온 포커스를 가른다
  let lastInputWasPointer = false
  const preferred = place ?? (tooltip.dataset.place as TooltipPlace | undefined) ?? 'top'
  tooltip.dataset.open = 'false'

  /**
   * 말풍선이 화면 밖으로 나가면 반대쪽으로 뒤집고(주축), 옆으로 넘친 만큼 밀어 넣는다(교차축).
   * 배치 자체는 CSS가 한다 — 여기서는 data-place와 --_shift만 고른다.
   */
  const fitToViewport = () => {
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight
    if (viewportWidth === 0 || viewportHeight === 0) return

    // 잴 때마다 원래 방향에서 시작한다 — 스크롤로 자리가 생겼으면 돌아와야 한다.
    // transition을 잠깐 꺼서, 닫힌 채 옮기는 이동이 다음 등장 모션에 섞이지 않게 한다
    tooltip.style.transition = 'none'
    tooltip.dataset.place = preferred
    tooltip.style.removeProperty('--_shift')

    const box = (tooltip.offsetParent ?? anchor).getBoundingClientRect()
    let tip = tooltip.getBoundingClientRect()
    if (tip.width > 0 && tip.height > 0) {
      const room = { top: box.top, bottom: viewportHeight - box.bottom, left: box.left, right: viewportWidth - box.right }
      /** 지금 놓인 방향으로 말풍선이 앵커 밖으로 차지하는 길이가 그쪽 여유 안에 드는가 */
      const fits = (at: TooltipPlace) => {
        const need = { top: box.top - tip.top, bottom: tip.bottom - box.bottom, left: box.left - tip.left, right: tip.right - box.right }[at]
        return need + SLIDE_PX <= room[at]
      }
      if (!fits(preferred)) {
        // 반대쪽을 먼저 보고, 좌우는 둘 다 좁으면(좁은 화면) 위·아래로 돌린다.
        // 어디에도 자리가 없으면 정한 방향을 지킨다 — 어느 쪽이든 잘린다면 덜 놀라운 쪽이 낫다
        const fallbacks: TooltipPlace[] =
          preferred === 'left' || preferred === 'right' ? [OPPOSITE[preferred], 'top', 'bottom'] : [OPPOSITE[preferred]]
        const found = fallbacks.find((candidate) => {
          tooltip.dataset.place = candidate
          tip = tooltip.getBoundingClientRect()
          return fits(candidate)
        })
        if (!found) {
          tooltip.dataset.place = preferred
          tip = tooltip.getBoundingClientRect()
        }
      }

      const vertical = tooltip.dataset.place === 'left' || tooltip.dataset.place === 'right'
      const start = vertical ? tip.top : tip.left
      const end = vertical ? tip.bottom : tip.right
      const limit = (vertical ? viewportHeight : viewportWidth) - EDGE_PADDING_PX
      const overflow = start < EDGE_PADDING_PX ? EDGE_PADDING_PX - start : end > limit ? limit - end : 0
      const maxShift = Math.max(0, (end - start) / 2 - ARROW_KEEP_PX)
      const shift = Math.round(Math.min(Math.max(overflow, -maxShift), maxShift))
      if (shift !== 0) tooltip.style.setProperty('--_shift', `${shift}px`)
    }

    void tooltip.offsetWidth // 옮긴 자리를 확정한 뒤에 transition을 되살린다
    tooltip.style.transition = ''
  }

  const close = () => {
    clearTimeout(timer)
    timer = undefined
    tooltip.dataset.open = 'false'
    if (closeCurrent === close) closeCurrent = undefined
  }
  const open = () => {
    if (tooltip.dataset.open === 'true') return
    if (closeCurrent && closeCurrent !== close) closeCurrent()
    closeCurrent = close
    fitToViewport()
    tooltip.dataset.open = 'true'
  }

  const isInside = ({ target, container }: { target: EventTarget | null; container: HTMLElement }) =>
    target instanceof Node && container.contains(target)

  const onPointerEnter = (event: PointerEvent | MouseEvent) => {
    // 터치에는 호버가 없다. 누를 때 오는 pointerenter로 열면 손을 뗀 뒤에도 말풍선이 남는다
    if ('pointerType' in event && event.pointerType === 'touch') return
    clearTimeout(timer)
    timer = setTimeout(open, showDelayMs)
  }
  const onAnchorPointerLeave = (event: PointerEvent | MouseEvent) => {
    // 말풍선 위로 옮겨 간 것은 벗어난 것이 아니다 (말풍선이 앵커의 형제일 때)
    if (isInside({ target: event.relatedTarget, container: tooltip })) return
    close()
  }
  const onTooltipPointerLeave = (event: PointerEvent | MouseEvent) => {
    if (isInside({ target: event.relatedTarget, container: anchor })) return
    close()
  }
  const onAnchorPointerDown = (event: PointerEvent | MouseEvent) => {
    // 누른 사람은 이미 무엇을 하려는지 안다 — 말풍선이 누른 결과(메뉴·모달)를 가리지 않게 닫는다
    if (isInside({ target: event.target, container: tooltip })) return
    close()
  }
  const onFocusIn = () => {
    // 눌러서 생긴 포커스로는 열지 않는다. 키보드로 옮겨 온 포커스만 즉시 연다
    if (lastInputWasPointer) return
    clearTimeout(timer)
    open()
  }
  const onWindowPointerDown = () => {
    lastInputWasPointer = true
  }
  const onWindowKeyDown = (event: KeyboardEvent) => {
    lastInputWasPointer = false
    if (event.key !== 'Escape') return
    const wasOpen = tooltip.dataset.open === 'true'
    close()
    // 이 Escape는 말풍선을 닫는 데 썼다 — 바깥 모달·시트가 같은 키로 함께 닫히지 않게 한다
    if (wasOpen) event.preventDefault()
  }

  anchor.addEventListener('pointerenter', onPointerEnter)
  anchor.addEventListener('pointerleave', onAnchorPointerLeave)
  anchor.addEventListener('pointerdown', onAnchorPointerDown)
  anchor.addEventListener('focusin', onFocusIn)
  anchor.addEventListener('focusout', close)
  tooltip.addEventListener('pointerleave', onTooltipPointerLeave)
  // 캡처 단계에서 듣는다 — 포커스보다 먼저 입력 종류를 알아야 하고, Escape는 바깥 리스너보다 먼저 써야 한다
  window.addEventListener('pointerdown', onWindowPointerDown, true)
  window.addEventListener('keydown', onWindowKeyDown, true)

  // 닫힌 말풍선도 자리를 차지한다 — 가장자리 앵커의 말풍선이 페이지를 옆으로 넓히지 않게 미리 한 번 맞춘다.
  // 넘칠 때만 고친다: 읽기만 하면 말풍선이 수백 개여도 레이아웃 계산은 한 번이다.
  // 붙인 뒤에 레이아웃이 바뀌면 다음에 열 때까지는 어긋난다 — 그때는 감싸는 영역의 overflow-x: clip이 막는다
  const initial = tooltip.getBoundingClientRect()
  if (initial.left < 0 || initial.right > document.documentElement.clientWidth) fitToViewport()

  return () => {
    close()
    anchor.removeEventListener('pointerenter', onPointerEnter)
    anchor.removeEventListener('pointerleave', onAnchorPointerLeave)
    anchor.removeEventListener('pointerdown', onAnchorPointerDown)
    anchor.removeEventListener('focusin', onFocusIn)
    anchor.removeEventListener('focusout', close)
    tooltip.removeEventListener('pointerleave', onTooltipPointerLeave)
    window.removeEventListener('pointerdown', onWindowPointerDown, true)
    window.removeEventListener('keydown', onWindowKeyDown, true)
    tooltip.dataset.place = preferred
    tooltip.style.removeProperty('--_shift')
  }
}
