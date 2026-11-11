/* @shared-core createBackDismiss.ts origin: bottom-sheet — 다른 패턴 assets에 복사될 때 이 헤더를 유지한다(validateSkills가 원본과 해시 비교) */
/**
 * 뒤로 가기로 오버레이(시트·모달) 닫기 (의존성 0).
 *
 * 모바일에서 시트가 열린 채 뒤로 가기를 누르면 사람은 시트가 닫히기를 기대하는데,
 * 브라우저는 시트를 모르므로 페이지를 떠난다. 그래서 열 때 history에 항목을 하나 쌓아 두고,
 * 뒤로 가기(popstate)가 그 항목을 걷으면 onDismiss를 부른다.
 * 버튼·Esc·백드롭처럼 다른 길로 닫혔을 때는 반환한 함수가 그 항목을 직접 걷는다(history.back()).
 *
 * 주소는 바꾸지 않는다. history.state에 표식 하나를 더할 뿐이고, 라우터가 둔 값은 그대로 둔다.
 *
 * 사용: const release = createBackDismiss({ onDismiss: close }) — 닫힐 때 release()를 부른다.
 */

type CreateBackDismissOptions = {
  /** 뒤로 가기로 닫혔을 때 — 여기서 오버레이를 닫는다(open 상태를 false로) */
  onDismiss: () => void
}

const STATE_KEY = '__overlayBackDismiss'

let sequence = 0
/** 방금 닫힌 오버레이가 걷으려고 예약해 둔 history.back() — 곧바로 다시 열리면 취소하고 항목을 물려준다 */
let pendingBack: ReturnType<typeof setTimeout> | undefined

const readMarker = () => {
  const state: unknown = history.state
  return typeof state === 'object' && state !== null ? (state as Record<string, unknown>)[STATE_KEY] : undefined
}

const withMarker = (marker: string) => {
  const state: unknown = history.state
  return { ...(typeof state === 'object' && state !== null ? state : {}), [STATE_KEY]: marker }
}

export const createBackDismiss = ({ onDismiss }: CreateBackDismissOptions) => {
  const marker = `overlay-${Date.now().toString(36)}-${(sequence += 1)}`
  let active = true

  if (pendingBack !== undefined) {
    // 닫자마자 다시 열렸다(시트에서 시트로 넘어가기, React StrictMode의 이중 실행).
    // 걷었다가 다시 쌓으면 그 사이의 popstate가 새 오버레이를 닫아 버린다 — 남아 있는 항목을 물려받는다
    clearTimeout(pendingBack)
    pendingBack = undefined
    history.replaceState(withMarker(marker), '')
  } else {
    history.pushState(withMarker(marker), '')
  }

  const onPopState = () => {
    if (!active) return
    // 우리 항목으로 "돌아온" 것이면 위에 겹쳐 열렸던 다른 오버레이가 닫힌 것이다
    if (readMarker() === marker) return
    active = false
    window.removeEventListener('popstate', onPopState)
    onDismiss()
  }
  window.addEventListener('popstate', onPopState)

  /** 오버레이가 닫힐 때 부른다 — 뒤로 가기로 닫힌 뒤에 불러도 된다(아무 일도 하지 않는다) */
  return () => {
    if (!active) return
    active = false
    window.removeEventListener('popstate', onPopState)
    // 오버레이 안의 링크로 화면이 이미 넘어갔으면 맨 위 항목은 우리 것이 아니다 — 건드리면 그 화면에서 뒤로 가 버린다
    if (readMarker() !== marker) return
    pendingBack = setTimeout(() => {
      pendingBack = undefined
      if (readMarker() === marker) history.back()
    }, 0)
  }
}
