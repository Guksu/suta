import { useEffect, useRef } from 'react'
import { animateSpring, type SpringHandle } from './animateSpring'
import type { SpringConfig } from './spring'

type UseSpringOptions = {
  /** 초기값 */
  initial?: number
  config?: SpringConfig
  /** 매 프레임 값 — 여기서 DOM에 직접 쓴다(React state로 올리면 프레임마다 렌더된다) */
  onUpdate: (value: number) => void
  /** to()로 보낸 목표에 정착했을 때 — 닫힌 요소를 걷는 일 등. set()으로 잡아 멈춘 경우에는 불리지 않는다 */
  onRest?: () => void
  /**
   * 동작 줄이기 설정이면 to()가 튕기지 않고 목표로 바로 간다 (기본 true).
   * 움직임 자체가 뜻을 전하는 경우에만 false로 둔다.
   */
  respectReducedMotion?: boolean
}

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 스프링 값 하나를 다루는 훅. to(target, velocity)로 목표를 주면 현재 위치·속도에서 이어서 움직인다.
 * 값은 React state가 아니다 — onUpdate에서 ref로 잡은 요소의 transform에 직접 쓴다.
 */
export const useSpring = ({ initial = 0, config, onUpdate, onRest, respectReducedMotion = true }: UseSpringOptions) => {
  const handleRef = useRef<SpringHandle | null>(null)
  const valueRef = useRef(initial)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const onRestRef = useRef(onRest)
  onRestRef.current = onRest
  const configRef = useRef(config)
  configRef.current = config

  useEffect(function stopOnUnmount() {
    return () => handleRef.current?.stop()
  }, [])

  /** 제스처 중 손가락 값을 그대로 쓸 때 — 애니메이션을 멈추고 값만 기록한다 */
  const set = (value: number) => {
    handleRef.current?.stop()
    handleRef.current = null
    valueRef.current = value
    onUpdateRef.current(value)
  }

  const to = (target: number, velocity?: number) => {
    // 숫자가 아닌 목표·속도가 들어가면 값이 NaN이 되고, NaN은 정착 판정을 통과하지 못해 프레임이 영원히 돈다
    if (!Number.isFinite(target)) return
    const safeVelocity = velocity !== undefined && !Number.isFinite(velocity) ? 0 : velocity

    if (respectReducedMotion && prefersReducedMotion()) {
      set(target)
      onRestRef.current?.()
      return
    }

    const running = handleRef.current
    if (running && safeVelocity === undefined) {
      running.retarget(target)
      return
    }
    const from = running ? running.current().value : valueRef.current
    const v = safeVelocity ?? running?.current().velocity ?? 0
    running?.stop()
    handleRef.current = animateSpring({
      from,
      to: target,
      velocity: v,
      config: configRef.current,
      onUpdate: (value) => {
        valueRef.current = value
        onUpdateRef.current(value)
      },
      onComplete: () => {
        // 정착한 핸들은 버린다 — 남겨 두면 다음 to()가 옛 config로 retarget한다(핸들은 만들 때의 config를 쥐고 있다)
        handleRef.current = null
        onRestRef.current?.()
      },
    })
  }

  return { to, set, get: () => valueRef.current }
}
