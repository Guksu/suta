import { act, renderHook } from '@testing-library/react'
import { useInfiniteScroll } from '@skills/infinite-scroll/assets/useInfiniteScroll'

type ObserverRecord = { callback: IntersectionObserverCallback; disconnected: boolean }

const observers: ObserverRecord[] = []

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []
  private record: ObserverRecord

  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback, disconnected: false }
    observers.push(this.record)
  }
  observe = () => {}
  unobserve = () => {}
  disconnect = () => {
    this.record.disconnected = true
  }
  takeRecords = () => []
}

const latest = () => observers[observers.length - 1]

/** 가장 최근 관찰자에 "감시 요소가 보인다"를 알리고, 이어지는 비동기 로딩까지 흘려보낸다 */
const enterViewport = async () => {
  await act(async () => {
    latest().callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await Promise.resolve()
  })
}

type Props = { hasMore: boolean; loadMore: () => Promise<void>; rootMarginPx?: number }

/** 훅은 마운트 때 sentinelRef에 요소가 달려 있어야 감시를 건다 — 첫 렌더에서 ref를 채워 준다 */
const useFeed = (props: Props) => {
  const feed = useInfiniteScroll(props)
  if (!feed.sentinelRef.current) feed.sentinelRef.current = document.createElement('div')
  return feed
}

describe('useInfiniteScroll — 목록이 다시 채워질 때', () => {
  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('끝났던(done) 목록의 hasMore가 다시 true가 되면 감시를 되살린다', async () => {
    const loadMore = vi.fn(async () => {})
    const { result, rerender } = renderHook((props: Props) => useFeed(props), {
      initialProps: { hasMore: false, loadMore },
    })

    await enterViewport()
    expect(result.current.status).toBe('done')
    expect(latest().disconnected).toBe(true)

    // 필터를 바꿔 목록을 새로 채웠다 — 다시 더 불러올 것이 생겼다
    rerender({ hasMore: true, loadMore })
    expect(result.current.status).toBe('idle')
    expect(latest().disconnected).toBe(false)

    await enterViewport()
    expect(loadMore).toHaveBeenCalledTimes(1)
  })

  it('reset()은 실패 상태를 걷고 처음부터 다시 감시한다', async () => {
    const loadMore = vi.fn(async () => {
      throw new Error('네트워크 오류')
    })
    const { result } = renderHook((props: Props) => useFeed(props), { initialProps: { hasMore: true, loadMore } })

    await enterViewport()
    expect(result.current.status).toBe('error')

    act(() => result.current.reset())
    expect(result.current.status).toBe('idle')
  })

  it('옵션이 바뀌어 감시를 새로 걸어도 화면의 상태가 새 코어와 어긋나지 않는다', async () => {
    const loadMore = vi.fn(async () => {
      throw new Error('네트워크 오류')
    })
    const { result, rerender } = renderHook((props: Props) => useFeed(props), {
      initialProps: { hasMore: true, loadMore, rootMarginPx: 200 },
    })

    await enterViewport()
    expect(result.current.status).toBe('error')

    // 코어가 새로 만들어진다(idle). 화면이 error에 머물면 "다시 시도"가 아무 일도 하지 않는 버튼이 된다
    rerender({ hasMore: true, loadMore, rootMarginPx: 400 })
    expect(result.current.status).toBe('idle')
  })

  it('로딩 중에 옵션이 바뀌어 감시를 새로 걸어도 같은 페이지를 두 번 부르지 않는다', async () => {
    let release: () => void = () => {}
    const loadMore = vi.fn(() => new Promise<void>((resolve) => (release = resolve)))
    const { result, rerender } = renderHook((props: Props) => useFeed(props), {
      initialProps: { hasMore: true, loadMore, rootMarginPx: 200 },
    })

    await enterViewport()
    expect(loadMore).toHaveBeenCalledTimes(1)

    // 응답을 기다리는 중에 코어가 새로 만들어지고, 새 감시가 곧바로 교차를 알린다
    rerender({ hasMore: true, loadMore, rootMarginPx: 400 })
    await enterViewport()
    expect(loadMore).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('loading')

    await act(async () => {
      release()
      await Promise.resolve()
    })
    await vi.waitFor(() => expect(result.current.status).toBe('idle'))
  })

  it('reset() 뒤에는 앞 요청에 올라타지 않고 새 목록의 요청을 따로 보낸다', async () => {
    const loadMore = vi.fn(() => new Promise<void>(() => {}))
    const { result } = renderHook((props: Props) => useFeed(props), { initialProps: { hasMore: true, loadMore } })

    await enterViewport()
    act(() => result.current.reset())
    await enterViewport()

    expect(loadMore).toHaveBeenCalledTimes(2)
  })
})
