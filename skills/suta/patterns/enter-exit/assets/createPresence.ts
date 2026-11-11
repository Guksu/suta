/**
 * 프레임워크 무관 진입/퇴장 상태 머신 (의존성 0).
 *
 * 요소의 data-state를 (없음) → entering → entered → exiting → (없음)으로 구동한다 —
 * 애니메이션 정의는 전적으로 CSS 몫이고(enter-exit.css), 이 코어는 상태 전이와
 * "퇴장이 끝난 뒤에 제거"라는 타이밍 문제만 푼다.
 *
 * 바닐라 사용: 요소를 DOM에 넣고 show(), 제거하려면 hide() 후 onChange(null)에서 element.remove().
 * React 사용: Presence.tsx가 이 코어를 감싼다.
 */

export type PresenceState = 'entering' | 'entered' | 'exiting'

type CreatePresenceOptions = {
  element: HTMLElement
  /** transitionend/animationend가 오지 않을 때의 종료 폴백(ms). CSS duration보다 길게 */
  timeoutMs?: number
  /** 상태 전이 알림 — null이면 퇴장 완료(제거해도 안전한 시점) */
  onChange?: (state: PresenceState | null) => void
}

export const createPresence = ({ element, timeoutMs = 500, onChange }: CreatePresenceOptions) => {
  let state: PresenceState | null = null
  let outerFrame = 0
  let innerFrame = 0
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined

  const applyState = (next: PresenceState | null) => {
    state = next
    if (next === null) delete element.dataset.state
    else element.dataset.state = next
    onChange?.(next)
  }

  const clearPending = () => {
    cancelAnimationFrame(outerFrame)
    cancelAnimationFrame(innerFrame)
    clearTimeout(fallbackTimer)
    element.removeEventListener('transitionend', onExitEnd)
    element.removeEventListener('animationend', onExitEnd)
  }

  const finishExit = () => {
    clearPending()
    applyState(null)
  }

  // 안쪽 요소(버튼의 hover 전이 등)의 transitionend는 버블링되어 여기까지 온다 —
  // 그것으로 끝내면 퇴장이 중간에 잘리므로 이 요소 자신의 이벤트만 받는다
  const onExitEnd = (event: Event) => {
    if (event.target !== element) return
    finishExit()
  }

  /** immediate: 처음부터 열려 있는 요소를 진입 애니메이션 없이 entered로 둔다(새로고침·복원된 화면) */
  const show = ({ immediate = false }: { immediate?: boolean } = {}) => {
    if (state === 'entering' || state === 'entered') return
    clearPending()
    // exiting에서 되돌릴 때는 요소가 이미 그려져 있다 — 프레임을 기다리면 그동안 계속 사라지다가 뒤집힌다
    if (immediate || state === 'exiting') {
      applyState('entered')
      return
    }
    applyState('entering')
    // 브라우저가 entering 스타일을 먼저 그려야 entered로의 transition이 발동한다 — 두 프레임 대기
    outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => applyState('entered'))
    })
  }

  const hide = () => {
    if (state === null || state === 'exiting') return
    const neverShown = state === 'entering'
    clearPending()
    // entering은 아직 한 번도 보이지 않은 상태다(가려진 탭에서는 프레임이 오지 않아 오래 머문다).
    // exiting과 스타일이 같아 transitionend도 없다 — 폴백 시간 동안 붙들지 않고 바로 끝낸다
    if (neverShown) {
      applyState(null)
      return
    }
    applyState('exiting')
    // transitionend는 유실될 수 있다(display 전환·탭 백그라운드) — 타임아웃이 안전망
    fallbackTimer = setTimeout(finishExit, timeoutMs)
    element.addEventListener('transitionend', onExitEnd)
    element.addEventListener('animationend', onExitEnd)
  }

  const destroy = () => {
    clearPending()
  }

  return { show, hide, destroy, getState: () => state }
}
