/**
 * 프레임워크 무관 스토리 프로그레스 코어 (의존성 0).
 *
 * 구간 막대들을 rAF로 차례로 채운다(transform: scaleX — GPU 속성만).
 * CSS animation 대신 rAF를 쓰는 이유: 일시정지·재개·임의 구간 이동을
 * 프레임 정확도로 제어해야 하기 때문이다(길게 눌러 멈춤이 스토리 UI의 관례).
 */

type CreateStoryProgressOptions = {
  /** 구간 막대의 채움 요소들(transform-origin: left) — 순서 = 재생 순서 */
  bars: HTMLElement[]
  /** 구간 하나의 재생 시간 (기본 5000ms). 함수로 주면 구간마다 다르게 정한다(영상 장면은 영상 길이만큼) */
  durationMs?: number | ((index: number) => number)
  /** 구간이 바뀔 때(수동 이동·처음부터 다시 재생 포함) — 배경 콘텐츠 전환은 여기서 */
  onIndexChange?: (index: number) => void
  /** 마지막 구간까지 끝났을 때 */
  onComplete?: () => void
}

/** idle: 시작 전·stop 뒤 / playing: 차오르는 중 / paused: pause로 멈춤 / ended: 마지막 구간까지 끝남 */
type StoryState = 'idle' | 'playing' | 'paused' | 'ended'

// 프레임 사이가 이보다 길면 탭이 가려졌거나 기기가 잠들었던 것으로 본다.
// rAF는 가려진 탭에서 멈추고, 돌아온 첫 프레임에 지난 시간이 한꺼번에 온다 — 세면 못 본 장면이 넘어간다
const MAX_FRAME_GAP_MS = 250

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export const createStoryProgress = ({
  bars,
  durationMs = 5000,
  onIndexChange,
  onComplete,
}: CreateStoryProgressOptions) => {
  let index = 0
  let elapsed = 0
  let lastTick: number | null = null
  let frame = 0
  let state: StoryState = 'idle'
  let pausedAt = 0
  let lastHoldMs = 0

  const lastIndex = () => Math.max(0, bars.length - 1)

  // 0 이하·NaN이면 0으로 나누게 된다 — 1ms로 막는다
  const durationOf = (barIndex: number) => {
    const value = typeof durationMs === 'function' ? durationMs(barIndex) : durationMs
    return value > 0 ? value : 1
  }

  const paint = (progress: number) => {
    bars.forEach((bar, barIndex) => {
      if (barIndex < index) bar.style.transform = 'scaleX(1)'
      else if (barIndex > index) bar.style.transform = 'scaleX(0)'
      else bar.style.transform = `scaleX(${Math.min(progress, 1)})`
    })
  }

  const tick = (time: number) => {
    if (lastTick !== null) {
      const delta = time - lastTick
      if (delta <= MAX_FRAME_GAP_MS) elapsed += delta
    }
    lastTick = time
    const progress = elapsed / durationOf(index)
    paint(progress)
    if (progress >= 1) {
      advance()
      return
    }
    frame = requestAnimationFrame(tick)
  }

  const finish = () => {
    cancelAnimationFrame(frame)
    index = lastIndex()
    paint(1)
    state = 'ended'
    lastTick = null
    onComplete?.()
  }

  const advance = () => {
    if (index >= bars.length - 1) {
      finish()
      return
    }
    setIndex(index + 1)
  }

  const setIndex = (next: number) => {
    const before = index
    index = Math.max(0, Math.min(next, lastIndex()))
    elapsed = 0
    lastTick = null
    paint(0)
    if (index !== before) onIndexChange?.(index)
    if (state === 'playing') frame = requestAnimationFrame(tick)
  }

  const start = () => {
    cancelAnimationFrame(frame)
    state = 'playing'
    // 도중에 다시 시작하면 장면도 첫 장으로 돌아가야 한다
    setIndex(0)
  }

  const pause = () => {
    // 재생 중일 때만 멈춘다 — 끝난 뒤·시작 전의 pause/resume 쌍이 재생을 되살리지 않게
    if (state !== 'playing') return
    cancelAnimationFrame(frame)
    state = 'paused'
    lastTick = null
    pausedAt = now()
  }

  const resume = () => {
    if (state !== 'paused') return
    lastHoldMs = now() - pausedAt
    state = 'playing'
    frame = requestAnimationFrame(tick)
  }

  const next = () => {
    cancelAnimationFrame(frame)
    if (index >= bars.length - 1) {
      // 마지막 장에서의 "다음"은 사용자가 닫으려는 것이다 — 끝난 뒤에 눌러도 onComplete를 부른다
      if (state !== 'idle') finish()
      return
    }
    setIndex(index + 1)
  }

  const prev = () => {
    cancelAnimationFrame(frame)
    // 끝난 뒤 앞으로 돌아가면 거기서 다시 재생한다
    if (state === 'ended') state = 'playing'
    if (index === 0) {
      // 첫 장에서의 "이전"은 첫 장을 처음부터 다시 채운다
      elapsed = 0
      lastTick = null
      paint(0)
      if (state === 'playing') frame = requestAnimationFrame(tick)
      return
    }
    setIndex(index - 1)
  }

  const stop = () => {
    cancelAnimationFrame(frame)
    state = 'idle'
    lastTick = null
    index = 0
    elapsed = 0
    paint(0)
  }

  return {
    start,
    pause,
    resume,
    next,
    prev,
    stop,
    getIndex: () => index,
    getState: () => state,
    /**
     * 직전 pause~resume 사이의 시간(ms)을 돌려주고 비운다.
     * 길게 눌러 멈췄다 뗀 뒤에 오는 click을 "다음 장"으로 치지 않을 때 쓴다.
     * 읽으면 0으로 비우므로, 누름 없이 온 click(키보드 Enter)은 늘 0을 받는다
     */
    takeHoldMs: () => {
      const held = lastHoldMs
      lastHoldMs = 0
      return held
    },
  }
}
