import { createInfiniteScroll, type InfiniteScrollStatus } from '@skills/infinite-scroll/assets/createInfiniteScroll'

type ObserverRecord = {
  callback: IntersectionObserverCallback
  options?: IntersectionObserverInit
  observed: Element[]
  disconnected: boolean
}

const observers: ObserverRecord[] = []

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []
  private record: ObserverRecord

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.record = { callback, options, observed: [], disconnected: false }
    observers.push(this.record)
  }
  observe = (el: Element) => {
    this.record.observed.push(el)
  }
  unobserve = () => {}
  disconnect = () => {
    this.record.disconnected = true
  }
  takeRecords = () => []
}

/** 가장 최근에 걸린 관찰자 — 코어는 페이지를 붙일 때마다 관찰을 새로 건다 */
const latest = () => observers[observers.length - 1]

const enterViewport = () => {
  const record = latest()
  record.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
}

describe('createInfiniteScroll — 감시 요소 기반 다음 페이지 로딩', () => {
  let sentinel: HTMLElement
  let statuses: InfiniteScrollStatus[]
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    sentinel = document.createElement('div')
    document.body.appendChild(sentinel)
    statuses = []
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.unstubAllGlobals()
    sentinel.remove()
  })

  const register = ({
    hasMore = () => true,
    loadMore,
    rootMarginPx,
    onError,
  }: {
    hasMore?: () => boolean
    loadMore: () => Promise<void> | void
    rootMarginPx?: number
    onError?: (error: unknown) => void
  }) => {
    const controller = createInfiniteScroll({
      sentinel,
      hasMore,
      loadMore,
      rootMarginPx,
      onError,
      onStatusChange: (status) => statuses.push(status),
    })
    cleanups.push(controller.destroy)
    return controller
  }

  it('감시 요소를 관찰하고 rootMargin으로 미리 부를 여유를 둔다', () => {
    register({ loadMore: () => {}, rootMarginPx: 600 })

    expect(latest().observed).toEqual([sentinel])
    expect(latest().options?.rootMargin).toBe('600px')
  })

  it('감시 요소가 화면에 들어오면 다음 페이지를 부른다', async () => {
    const loadMore = vi.fn(async () => {})
    register({ loadMore })

    enterViewport()
    expect(statuses).toEqual(['loading'])
    await vi.waitFor(() => expect(loadMore).toHaveBeenCalledTimes(1))
    expect(statuses).toEqual(['loading', 'idle'])
  })

  it('로딩이 끝나기 전에 다시 교차해도 한 번만 부른다 (중복 호출 차단)', async () => {
    let release: () => void = () => {}
    const loadMore = vi.fn(() => new Promise<void>((resolve) => (release = resolve)))
    register({ loadMore })

    enterViewport()
    enterViewport()
    enterViewport()
    expect(loadMore).toHaveBeenCalledTimes(1)

    release()
    await vi.waitFor(() => expect(latest().observed).toEqual([sentinel]))
  })

  it('한 페이지를 붙여도 화면이 안 차면 관찰을 새로 걸어 다음 페이지를 잇는다', async () => {
    register({ loadMore: async () => {} })
    const before = observers.length

    enterViewport()
    await vi.waitFor(() => expect(observers.length).toBe(before + 1))
    expect(latest().observed).toEqual([sentinel])
  })

  it('더 없으면 done이 되고 관찰을 끊는다', async () => {
    let pages = 0
    register({
      hasMore: () => pages < 1,
      loadMore: async () => {
        pages += 1
      },
    })

    enterViewport()
    await vi.waitFor(() => expect(statuses).toEqual(['loading', 'done']))
    expect(latest().disconnected).toBe(true)
  })

  it('처음부터 더 없으면 부르지 않고 바로 done이다', async () => {
    const loadMore = vi.fn()
    register({ hasMore: () => false, loadMore })

    enterViewport()
    await vi.waitFor(() => expect(statuses).toEqual(['done']))
    expect(loadMore).not.toHaveBeenCalled()
  })

  it('실패하면 멈추고 자동 재시도하지 않는다 — retry로만 재개된다', async () => {
    const failure = new Error('네트워크 오류')
    const onError = vi.fn()
    let attempts = 0
    const controller = register({
      loadMore: async () => {
        attempts += 1
        if (attempts === 1) throw failure
      },
      onError,
    })

    enterViewport()
    await vi.waitFor(() => expect(statuses).toEqual(['loading', 'error']))
    expect(onError).toHaveBeenCalledWith(failure)
    expect(latest().disconnected).toBe(true)

    controller.retry()
    enterViewport()
    await vi.waitFor(() => expect(attempts).toBe(2))
  })

  it('IntersectionObserver가 없어도 loadNow로는 불러올 수 있다 (버튼 대비책)', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const loadMore = vi.fn(async () => {})
    const controller = register({ loadMore })

    await controller.loadNow()
    expect(loadMore).toHaveBeenCalledTimes(1)
  })

  it('destroy 뒤에는 교차해도 부르지 않는다', () => {
    const loadMore = vi.fn()
    const controller = register({ loadMore })
    const record = latest()
    controller.destroy()

    record.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    expect(loadMore).not.toHaveBeenCalled()
  })

  it('retry는 감시 요소가 다시 교차하기를 기다리지 않고 바로 다시 부른다', async () => {
    let attempts = 0
    const controller = register({
      loadMore: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('네트워크 오류')
      },
    })

    enterViewport()
    await vi.waitFor(() => expect(statuses).toEqual(['loading', 'error']))

    controller.retry() // 교차 알림 없이
    expect(statuses).toEqual(['loading', 'error', 'loading'])
    await vi.waitFor(() => expect(attempts).toBe(2))
  })

  it('로딩 중 destroy되면 늦게 온 응답이 상태를 바꾸지 않는다', async () => {
    let release: () => void = () => {}
    const controller = register({ loadMore: () => new Promise<void>((resolve) => (release = resolve)) })

    enterViewport()
    controller.destroy()
    release()
    await Promise.resolve()
    await Promise.resolve()

    expect(statuses).toEqual(['loading'])
  })

  it('reset은 끝난(done) 목록을 되살려 다시 감시한다 — 필터·정렬을 바꿔 목록을 새로 채울 때', async () => {
    let more = false
    const controller = register({ hasMore: () => more, loadMore: async () => {} })

    enterViewport()
    await vi.waitFor(() => expect(statuses).toEqual(['done']))
    const before = observers.length

    more = true
    controller.reset()

    expect(controller.current()).toBe('idle')
    expect(observers.length).toBe(before + 1)
    expect(latest().observed).toEqual([sentinel])
    expect(latest().disconnected).toBe(false)
  })

  it('reset은 실패(error) 상태도 걷어 낸다', async () => {
    const controller = register({
      loadMore: async () => {
        throw new Error('네트워크 오류')
      },
    })

    enterViewport()
    await vi.waitFor(() => expect(statuses).toEqual(['loading', 'error']))

    controller.reset()
    expect(controller.current()).toBe('idle')
  })

  it('로딩 중 reset하면 앞선 요청의 응답은 버려진다 — 새 목록의 상태를 건드리지 않는다', async () => {
    const releases: Array<() => void> = []
    const fails: Array<(error: Error) => void> = []
    const loadMore = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          releases.push(resolve)
          fails.push(reject)
        }),
    )
    const onError = vi.fn()
    const controller = register({ loadMore, onError })

    enterViewport() // 앞 목록의 요청
    controller.reset()
    expect(controller.current()).toBe('idle')

    enterViewport() // 새 목록의 요청
    expect(loadMore).toHaveBeenCalledTimes(2)
    expect(controller.current()).toBe('loading')

    fails[0](new Error('앞 목록의 늦은 실패'))
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.current()).toBe('loading')
    expect(onError).not.toHaveBeenCalled()

    releases[1]()
    await vi.waitFor(() => expect(controller.current()).toBe('idle'))
  })
})
