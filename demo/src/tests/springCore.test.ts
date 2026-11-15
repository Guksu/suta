import { dampingRatio, springAt, springDuration, springState, springToLinear } from '@skills/spring-physics/assets/spring'

describe('spring.ts — 감쇠 조화진동 닫힌 해', () => {
  it('t=0에서 from, 충분한 시간 뒤 to에 정착한다', () => {
    const motion = { from: 100, to: 0 }
    expect(springAt({ t: 0, motion })).toBeCloseTo(100)
    expect(springAt({ t: 3, motion })).toBeCloseTo(0, 3)
    expect(springState({ t: 3, motion }).done).toBe(true)
  })

  it('감쇠비 1 미만(기본 170/26 ≈ 1.0 근처가 아닌 300/15)은 목표를 지나쳤다 돌아온다 (오버슈트)', () => {
    const config = { stiffness: 300, damping: 15 }
    expect(dampingRatio({ stiffness: 300, damping: 15, mass: 1 })).toBeLessThan(1)
    const motion = { from: 1, to: 0 }
    let minValue = Infinity
    for (let ms = 0; ms < 600; ms += 8) minValue = Math.min(minValue, springAt({ t: ms / 1000, motion, config }))
    expect(minValue).toBeLessThan(0)
  })

  it('임계 감쇠(ζ=1)와 과감쇠(ζ>1)는 목표를 지나치지 않는다', () => {
    const motion = { from: 1, to: 0 }
    for (const config of [
      { stiffness: 100, damping: 20 }, // ζ = 20 / (2·10) = 1
      { stiffness: 100, damping: 40 }, // ζ = 2
    ]) {
      for (let ms = 0; ms < 2000; ms += 8) {
        expect(springAt({ t: ms / 1000, motion, config })).toBeGreaterThanOrEqual(-1e-9)
      }
    }
  })

  it('시작 속도를 이어받는다 — 목표 방향으로 던지면 더 빨리 도착한다', () => {
    const motion = { from: 100, to: 0 }
    const slow = springDuration({ motion })
    const fast = springDuration({ motion: { ...motion, velocity: -2000 } })
    expect(fast).toBeLessThan(slow)
    // 반대 방향으로 던지면 처음엔 목표에서 멀어진다
    expect(springAt({ t: 0.02, motion: { ...motion, velocity: 3000 } })).toBeGreaterThan(100)
  })

  it('springState는 정착 시 값을 정확히 to로 고정하고 속도 0을 준다', () => {
    const state = springState({ t: 5, motion: { from: 50, to: 10 } })
    expect(state).toEqual({ value: 10, velocity: 0, done: true })
  })

  it('springDuration — 이동이 없으면 0, 기본 스프링은 UI 예산 안(≤1s)', () => {
    expect(springDuration({ motion: { from: 5, to: 5 } })).toBe(0)
    const ms = springDuration({ motion: { from: 100, to: 0 } })
    expect(ms).toBeGreaterThan(100)
    expect(ms).toBeLessThanOrEqual(1000)
  })

  it('springToLinear — 0에서 시작해 1로 끝나는 linear() 문자열과 duration을 준다', () => {
    const { easing, duration } = springToLinear({ config: { stiffness: 300, damping: 20 }, samples: 10 })
    expect(easing.startsWith('linear(0 0%')).toBe(true)
    expect(easing.endsWith('100%)')).toBe(true)
    expect(easing.split(',').length).toBe(11)
    const last = Number(easing.slice(7, -1).split(',').at(-1)!.trim().split(' ')[0])
    expect(last).toBeCloseTo(1, 2)
    expect(duration).toBeGreaterThan(0)
  })
})

describe('spring.ts — 깨진 입력에서도 끝난다', () => {
  it('속도·위치가 숫자가 아니면 바로 정착한 것으로 본다 — 값은 목표, 속도 0', () => {
    for (const motion of [
      { from: 100, to: 0, velocity: Number.NaN },
      { from: Number.NaN, to: 0 },
      { from: 100, to: 0, velocity: Number.POSITIVE_INFINITY },
    ]) {
      expect(springState({ t: 0.1, motion })).toEqual({ value: 0, velocity: 0, done: true })
    }
  })

  it('목표가 숫자가 아니면 시작 위치에 멈춘다 — NaN을 화면에 쓰지 않는다', () => {
    expect(springState({ t: 0.1, motion: { from: 40, to: Number.NaN } })).toEqual({ value: 40, velocity: 0, done: true })
  })

  it('강성·질량이 0 이하면 해가 숫자가 아니다 — 그때도 정착으로 끝낸다', () => {
    const motion = { from: 100, to: 0 }
    expect(springState({ t: 0.1, motion, config: { stiffness: 0 } }).done).toBe(true)
    expect(springState({ t: 0.1, motion, config: { mass: 0 } }).done).toBe(true)
    expect(springState({ t: 0.1, motion, config: { stiffness: -10 } }).value).toBe(0)
  })

  it('시간이 음수로 들어와도(첫 프레임의 시각이 시작 시각보다 이를 때) 시작 위치에서 벗어나지 않는다', () => {
    expect(springState({ t: -0.005, motion: { from: 100, to: 0 } }).value).toBeCloseTo(100)
  })
})
