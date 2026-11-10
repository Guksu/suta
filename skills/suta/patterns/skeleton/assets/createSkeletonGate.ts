/**
 * 프레임워크 무관 뼈대 표시 문지기 (의존성 0).
 *
 * 뼈대의 실제 문제는 그리는 것이 아니라 시간이다:
 *  - 응답이 120ms 만에 온다 → 뼈대가 한 번 번쩍이고 사라진다. 아무것도 안 띄운 것보다 산만하다
 *  - 뼈대를 띄운 직후(210ms)에 응답이 온다 → 뼈대가 10ms만 보인다. 같은 깜빡임이다
 * 이 코어가 그 두 가지를 맡는다: 로딩이 delayMs를 넘길 때만 띄우고, 띄웠으면 minVisibleMs는 유지한다.
 *
 * 쓰는 쪽은 "로딩 중인가"만 알려 주고(setLoading), 뼈대를 그릴지는 onChange·isVisible로 받는다.
 * 뼈대가 아직 안 떴고 데이터도 없는 첫 delayMs 동안은 자리만 잡아 두고 비워 둔다.
 */

type CreateSkeletonGateOptions = {
  /** 로딩이 이만큼 이어져야 뼈대를 띄운다 (ms, 기본 200) — 그 안에 끝나면 한 번도 띄우지 않는다 */
  delayMs?: number
  /** 한 번 띄운 뼈대를 유지하는 최소 시간 (ms, 기본 400) — 띄우자마자 내리는 깜빡임을 막는다 */
  minVisibleMs?: number
  onChange: (visible: boolean) => void
}

export const createSkeletonGate = ({ delayMs = 200, minVisibleMs = 400, onChange }: CreateSkeletonGateOptions) => {
  let loading = false
  let visible = false
  let shownAt = 0
  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let destroyed = false

  const setVisible = (next: boolean) => {
    if (destroyed || next === visible) return
    visible = next
    if (next) shownAt = Date.now()
    onChange(next)
  }

  /** 로딩이 시작되거나 끝날 때마다 부른다. 같은 값을 거듭 불러도 타이머를 다시 세지 않는다 */
  const setLoading = (next: boolean) => {
    if (destroyed || next === loading) return
    loading = next

    if (next) {
      // 유지 시간을 채우려고 기다리던 중이면 내리지 않고 그대로 이어 간다
      clearTimeout(hideTimer)
      hideTimer = undefined
      if (visible) return
      if (delayMs <= 0) {
        setVisible(true)
        return
      }
      showTimer = setTimeout(() => setVisible(true), delayMs)
      return
    }

    // 아직 띄우기 전이면 띄우지 않는다 — 빠른 응답은 뼈대 없이 지나간다
    clearTimeout(showTimer)
    showTimer = undefined
    if (!visible) return
    const remaining = minVisibleMs - (Date.now() - shownAt)
    if (remaining <= 0) {
      setVisible(false)
      return
    }
    hideTimer = setTimeout(() => setVisible(false), remaining)
  }

  return {
    setLoading,
    /** 지금 뼈대를 그려야 하는가 */
    isVisible: () => visible,
    destroy: () => {
      destroyed = true // 언마운트 뒤 남은 타이머가 상태를 건드리지 못한다
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    },
  }
}

export type SkeletonGate = ReturnType<typeof createSkeletonGate>
