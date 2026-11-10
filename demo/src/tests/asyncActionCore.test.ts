import { createAsyncAction, type AsyncActionStatus } from '@skills/loading-button/assets/createAsyncAction'

describe('createAsyncAction — 중복 차단·최소 로딩·표시 유지', () => {
  let statuses: AsyncActionStatus[]

  beforeEach(() => {
    vi.useFakeTimers()
    statuses = []
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const register = (options: { minLoadingMs?: number; successHoldMs?: number; errorHoldMs?: number } = {}) =>
    createAsyncAction({ ...options, onChange: (status) => statuses.push(status) })

  /** 대기 중인 마이크로태스크와 타이머를 함께 흘려보낸다 */
  const advance = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms)
  }

  it('응답이 즉시 와도 minLoadingMs 동안은 loading을 유지한다', async () => {
    const action = register({ minLoadingMs: 400 })
    const running = action.run(async () => 'ok')

    await advance(399)
    expect(action.current()).toBe('loading')

    await advance(1)
    expect(action.current()).toBe('success')
    await expect(running).resolves.toEqual({ ok: true, value: 'ok' })
  })

  it('성공 표시는 successHoldMs 뒤 idle로 돌아온다', async () => {
    const action = register({ minLoadingMs: 0, successHoldMs: 1200 })
    await action.run(async () => 'ok')

    expect(action.current()).toBe('success')
    await advance(1200)
    expect(action.current()).toBe('idle')
    expect(statuses).toEqual(['loading', 'success', 'idle'])
  })

  it('진행 중 다시 실행하면 무시된다 — 작업은 한 번만 돈다 (중복 제출 차단)', async () => {
    const action = register({ minLoadingMs: 0 })
    let calls = 0
    const task = async () => {
      calls += 1
      return calls
    }

    const first = action.run(task)
    const second = action.run(task)

    await expect(second).resolves.toMatchObject({ ok: false })
    await advance(0)
    await first
    expect(calls).toBe(1)
  })

  it('결과 표시 중(success)에도 재실행되지 않는다', async () => {
    const action = register({ minLoadingMs: 0, successHoldMs: 1000 })
    await action.run(async () => 'ok')

    const blocked = await action.run(async () => 'again')
    expect(blocked).toMatchObject({ ok: false })
  })

  it('작업이 던지면 error가 되고 errorHoldMs 뒤 idle로 돌아온다', async () => {
    const action = register({ minLoadingMs: 0, errorHoldMs: 1800 })
    const failure = new Error('네트워크 오류')

    const result = await action.run(async () => {
      throw failure
    })

    expect(result).toEqual({ ok: false, error: failure })
    expect(action.current()).toBe('error')
    await advance(1800)
    expect(action.current()).toBe('idle')
  })

  it('reset은 표시 유지를 기다리지 않고 즉시 idle로 되돌린다', async () => {
    const action = register({ minLoadingMs: 0, successHoldMs: 5000 })
    await action.run(async () => 'ok')

    action.reset()
    expect(action.current()).toBe('idle')
  })

  it('destroy 뒤 늦게 도착한 응답은 상태를 바꾸지 못한다', async () => {
    const action = register({ minLoadingMs: 0 })
    let resolveTask: (value: string) => void = () => {}
    const running = action.run(() => new Promise<string>((resolve) => (resolveTask = resolve)))

    action.destroy()
    resolveTask('늦은 응답')
    await running
    await advance(1000)

    expect(statuses).toEqual(['loading'])
  })

  it('실패 표시 중에 다시 실행하면 기다리지 않고 재시도한다', async () => {
    const action = register({ minLoadingMs: 0, errorHoldMs: 1800 })
    await action.run(async () => {
      throw new Error('품절')
    })
    expect(action.current()).toBe('error')

    let resolveRetry: (value: string) => void = () => {}
    const retry = action.run(() => new Promise<string>((resolve) => (resolveRetry = resolve)))
    expect(action.current()).toBe('loading')

    // 앞선 실패의 표시 유지 타이머가 남아 재시도 중인 상태를 idle로 되돌리면 안 된다
    await advance(1800)
    expect(action.current()).toBe('loading')

    resolveRetry('ok')
    await expect(retry).resolves.toEqual({ ok: true, value: 'ok' })
    expect(statuses).toEqual(['loading', 'error', 'loading', 'success'])
  })

  it('setOptions로 바꾼 시간은 다음 실행부터 쓰인다', async () => {
    const action = register({ minLoadingMs: 400 })
    action.setOptions({ minLoadingMs: 0, successHoldMs: 100 })

    await action.run(async () => 'ok')
    expect(action.current()).toBe('success')

    await advance(100)
    expect(action.current()).toBe('idle')
  })

  it('setOptions에 빠진 값은 앞의 값을 그대로 둔다', async () => {
    const action = register({ minLoadingMs: 400 })
    action.setOptions({ successHoldMs: 100 })

    void action.run(async () => 'ok')
    await advance(399)
    expect(action.current()).toBe('loading')
  })
})
