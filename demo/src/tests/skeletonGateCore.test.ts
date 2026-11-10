import { createSkeletonGate } from '@skills/skeleton/assets/createSkeletonGate'

describe('createSkeletonGate — 뼈대를 늦게 띄우고, 띄웠으면 잠깐은 유지한다', () => {
  let changes: boolean[]

  beforeEach(() => {
    vi.useFakeTimers()
    changes = []
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const register = (options: { delayMs?: number; minVisibleMs?: number } = {}) =>
    createSkeletonGate({ ...options, onChange: (visible) => changes.push(visible) })

  it('로딩이 delayMs 안에 끝나면 뼈대를 한 번도 띄우지 않는다', () => {
    const gate = register({ delayMs: 200 })

    gate.setLoading(true)
    vi.advanceTimersByTime(199)
    gate.setLoading(false)
    vi.advanceTimersByTime(1000)

    expect(changes).toEqual([])
    expect(gate.isVisible()).toBe(false)
  })

  it('delayMs가 지나도 로딩 중이면 뼈대를 띄운다', () => {
    const gate = register({ delayMs: 200 })

    gate.setLoading(true)
    vi.advanceTimersByTime(199)
    expect(gate.isVisible()).toBe(false)

    vi.advanceTimersByTime(1)
    expect(gate.isVisible()).toBe(true)
    expect(changes).toEqual([true])
  })

  it('띄운 직후 로딩이 끝나도 minVisibleMs 동안은 유지한 뒤 내린다', () => {
    const gate = register({ delayMs: 200, minVisibleMs: 400 })

    gate.setLoading(true)
    vi.advanceTimersByTime(200) // 뼈대가 뜬다
    vi.advanceTimersByTime(50)
    gate.setLoading(false) // 뜬 지 50ms 만에 응답이 왔다

    vi.advanceTimersByTime(349)
    expect(gate.isVisible()).toBe(true)

    vi.advanceTimersByTime(1)
    expect(gate.isVisible()).toBe(false)
    expect(changes).toEqual([true, false])
  })

  it('minVisibleMs를 이미 넘겼으면 로딩이 끝나는 즉시 내린다', () => {
    const gate = register({ delayMs: 200, minVisibleMs: 400 })

    gate.setLoading(true)
    vi.advanceTimersByTime(200 + 400)
    gate.setLoading(false)

    expect(gate.isVisible()).toBe(false)
    expect(changes).toEqual([true, false])
  })

  it('유지하는 동안 다시 로딩이 시작되면 내리지 않고 이어 간다', () => {
    const gate = register({ delayMs: 200, minVisibleMs: 400 })

    gate.setLoading(true)
    vi.advanceTimersByTime(250)
    gate.setLoading(false) // 유지 시간이 350ms 남았다
    vi.advanceTimersByTime(100)
    gate.setLoading(true) // 다시 불러온다 — 뼈대가 깜빡이면 안 된다

    vi.advanceTimersByTime(2000)
    expect(gate.isVisible()).toBe(true)
    expect(changes).toEqual([true])

    gate.setLoading(false)
    expect(gate.isVisible()).toBe(false)
  })

  it('같은 값을 거듭 알려도 지연을 처음부터 다시 세지 않는다', () => {
    const gate = register({ delayMs: 200 })

    gate.setLoading(true)
    vi.advanceTimersByTime(150)
    gate.setLoading(true) // 렌더마다 같은 값이 다시 들어와도
    vi.advanceTimersByTime(50)

    expect(gate.isVisible()).toBe(true)
  })

  it('delayMs가 0이면 기다리지 않고 바로 띄운다', () => {
    const gate = register({ delayMs: 0 })

    gate.setLoading(true)

    expect(gate.isVisible()).toBe(true)
    expect(changes).toEqual([true])
  })

  it('destroy 뒤에는 타이머가 남아 있어도 알리지 않는다', () => {
    const gate = register({ delayMs: 200 })

    gate.setLoading(true)
    gate.destroy()
    vi.advanceTimersByTime(1000)

    expect(changes).toEqual([])
  })
})
