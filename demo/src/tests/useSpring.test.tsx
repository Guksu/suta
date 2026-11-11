import { renderHook } from '@testing-library/react'
import { useSpring } from '@skills/spring-physics/assets/useSpring'

describe('useSpring — 훅이 막는 경계', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const setup = (options: { respectReducedMotion?: boolean } = {}) => {
    const values: number[] = []
    const onRest = vi.fn()
    const hook = renderHook(() => useSpring({ initial: 100, onUpdate: (v) => values.push(v), onRest, ...options }))
    return { values, onRest, spring: hook.result.current, hook }
  }

  it('to()는 지금 값에서 목표로 움직이고, 정착하면 onRest를 한 번 부른다', () => {
    const { values, onRest, spring } = setup()
    spring.to(0)
    vi.advanceTimersByTime(100)
    expect(values.at(-1)).toBeGreaterThan(0)
    expect(values.at(-1)).toBeLessThan(100)
    expect(onRest).not.toHaveBeenCalled()
    vi.advanceTimersByTime(3000)
    expect(values.at(-1)).toBe(0)
    expect(onRest).toHaveBeenCalledTimes(1)
  })

  it('속도가 숫자가 아니면(NaN — 시간 차 0으로 나눈 값) 0으로 본다. 값이 NaN이 되어 영원히 돌지 않는다', () => {
    const { values, spring } = setup()
    spring.to(0, Number.NaN)
    vi.advanceTimersByTime(3000)
    expect(values.every((v) => Number.isFinite(v))).toBe(true)
    expect(values.at(-1)).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('목표가 숫자가 아니면 움직이지 않는다', () => {
    const { values, spring } = setup()
    spring.to(Number.NaN)
    vi.advanceTimersByTime(500)
    expect(values).toEqual([])
    expect(spring.get()).toBe(100)
  })

  it('동작 줄이기면 튕기지 않고 목표로 바로 간다 — onRest도 부른다', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    const { values, onRest, spring } = setup()
    spring.to(0, 2000)
    expect(values).toEqual([0])
    expect(onRest).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('respectReducedMotion: false면 동작 줄이기에서도 스프링으로 움직인다(손가락을 따라가는 이동처럼 뜻이 있는 움직임)', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    const { values, spring } = setup({ respectReducedMotion: false })
    spring.to(0)
    vi.advanceTimersByTime(100)
    expect(values.at(-1)).toBeGreaterThan(0)
  })

  it('움직이는 중에 set()으로 잡으면 멈추고 onRest는 부르지 않는다. 언마운트해도 프레임이 남지 않는다', () => {
    const { values, onRest, spring, hook } = setup()
    spring.to(0)
    vi.advanceTimersByTime(50)
    spring.set(40)
    vi.advanceTimersByTime(3000)
    expect(values.at(-1)).toBe(40)
    expect(onRest).not.toHaveBeenCalled()
    spring.to(0)
    hook.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('정착한 뒤 config가 바뀌면 다음 to()는 새 config로 움직인다', () => {
    const values: number[] = []
    const hook = renderHook(({ stiffness, damping }) => useSpring({ config: { stiffness, damping }, onUpdate: (v) => values.push(v) }), {
      initialProps: { stiffness: 170, damping: 26 },
    })
    hook.result.current.to(100)
    vi.advanceTimersByTime(3000)
    expect(values.at(-1)).toBe(100)
    // 아주 무른 스프링 — 100ms 동안 거의 움직이지 못한다(기본 스프링이면 절반 가까이 간다)
    hook.rerender({ stiffness: 1, damping: 2 })
    hook.result.current.to(0)
    vi.advanceTimersByTime(100)
    expect(values.at(-1)).toBeGreaterThan(95)
  })
})
