/**
 * 프레임워크 무관 숫자 카운트업 코어 (의존성 0).
 *
 * requestAnimationFrame으로 from→to를 보간해 요소의 textContent에 쓴다.
 * setInterval 방식과 달리 프레임에 정렬되어 끊김이 없고, 탭이 백그라운드면 자동으로 멈춘다.
 * 탭이 돌아오면 지난 시간만큼 건너뛴다 — 가려진 사이에 durationMs가 지났으면 다음 프레임에 목표값으로 끝난다.
 *
 * 바닐라 사용: createCountUp({ element, to: 1234567 }).start()
 * React 사용: CountUp.tsx가 이 코어를 감싼다.
 */

type CreateCountUpOptions = {
  element: HTMLElement
  from?: number
  to: number
  durationMs?: number
  /** 진행률(0~1) 커브 — 기본은 ease-out cubic(초반 빠르게, 끝에서 감속) */
  easing?: (progress: number) => number
  /** 값 → 표시 문자열. 기본: 정수 반올림 + 천 단위 구분(toLocaleString) */
  format?: (value: number) => string
  onUpdate?: (value: number) => void
}

const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3)

/** 기본 표시 — 정수 반올림 + 천 단위 구분. React 래퍼가 화면 낭독기용 최종값을 같은 형식으로 쓴다 */
// `+ 0`은 -0을 0으로 바꾼다. -0.4를 반올림하면 -0이고, toLocaleString은 이를 "-0"으로 찍는다
export const defaultFormat = (value: number) => (Math.round(value) + 0).toLocaleString('ko-KR')

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const createCountUp = ({
  element,
  from = 0,
  to,
  durationMs = 800,
  easing = easeOutCubic,
  format = defaultFormat,
  onUpdate,
}: CreateCountUpOptions) => {
  let frame = 0
  let startTime: number | null = null

  const apply = (value: number) => {
    element.textContent = format(value)
    onUpdate?.(value)
  }

  const tick = (now: number) => {
    if (startTime === null) startTime = now
    const progress = Math.min((now - startTime) / durationMs, 1)
    if (progress >= 1) {
      // 마지막 프레임은 보간식이 아니라 목표값 그대로 — 소수에서 0.30000000000000004 같은 오차를 넘기지 않는다
      apply(to)
      return
    }
    apply(from + (to - from) * easing(progress))
    frame = requestAnimationFrame(tick)
  }

  const start = () => {
    stop()
    // 모션 완화: 굴러가는 숫자는 이동 연출이므로 최종값을 즉시 보여준다.
    // 시간이 0 이하(0으로 나누면 NaN이 찍힌다)이거나 갈 곳이 같을 때도 굴리지 않는다
    if (prefersReducedMotion() || !(durationMs > 0) || from === to) {
      apply(to)
      return
    }
    startTime = null
    // 첫 프레임이 오기 전에도 자리가 비지 않게 시작값을 먼저 쓴다
    apply(from)
    frame = requestAnimationFrame(tick)
  }

  const stop = () => {
    cancelAnimationFrame(frame)
  }

  return { start, stop }
}
