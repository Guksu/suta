/**
 * 프레임워크 무관 무한 스크롤 코어 (의존성 0).
 *
 * 목록 끝에 놓인 감시 요소(sentinel)가 화면에 다가오면 다음 페이지를 부른다.
 * 스크롤 이벤트를 듣지 않는다 — IntersectionObserver는 스크롤마다 깨어나지 않고
 * "보이기 시작함"만 알려주므로 위치 계산도, 스로틀도 필요 없다.
 *
 * 이 코어가 실제로 막아 주는 것들:
 *  - 중복 호출: 로딩 중에는 다시 부르지 않는다(같은 페이지를 두 번 붙이는 사고)
 *  - 연쇄 로딩: 한 페이지를 붙여도 sentinel이 여전히 보이면 다음 페이지를 이어서 부른다
 *    (IntersectionObserver는 "계속 보이는 중"을 다시 알려주지 않기 때문에 관찰을 새로 건다)
 *  - 실패 폭주: 실패하면 멈춘다. 자동 재시도는 하지 않고 retry()를 기다린다
 *  - 끝난 뒤의 되살리기: done은 관찰을 끊는다. 목록을 새로 채우면 reset()으로 다시 건다
 */

export type InfiniteScrollStatus = 'idle' | 'loading' | 'error' | 'done'

type CreateInfiniteScrollOptions = {
  /** 목록 끝에 두는 빈 감시 요소 — 마지막 항목이 아니라 별도 요소여야 한다 */
  sentinel: HTMLElement
  /** 더 불러올 것이 남았는지 — 매 로드 전후로 다시 묻는다 */
  hasMore: () => boolean
  /** 다음 페이지를 불러와 목록에 붙인다. 예외를 던지면 error 상태가 된다 */
  loadMore: () => Promise<void> | void
  /** 화면 밖 이만큼 미리 부른다 (px, 기본 400) — 사용자가 로딩을 거의 보지 않게 */
  rootMarginPx?: number
  /** 스크롤 컨테이너. 기본은 뷰포트(null) */
  root?: Element | null
  onStatusChange?: (status: InfiniteScrollStatus) => void
  /** 실패 원인 — 문구로 보여주고 싶을 때 */
  onError?: (error: unknown) => void
}

export const createInfiniteScroll = ({
  sentinel,
  hasMore,
  loadMore,
  rootMarginPx = 400,
  root = null,
  onStatusChange,
  onError,
}: CreateInfiniteScrollOptions) => {
  let status: InfiniteScrollStatus = 'idle'
  let destroyed = false
  let observer: IntersectionObserver | null = null
  // 목록을 새로 채울 때(reset)마다 올린다 — 그 전에 떠난 요청의 응답을 가려낸다
  let generation = 0

  const setStatus = (next: InfiniteScrollStatus) => {
    if (destroyed || next === status) return
    status = next
    onStatusChange?.(next)
  }

  const stopObserving = () => {
    observer?.disconnect()
    observer = null
  }

  /** retry만 error에서 출발할 수 있다 — 교차 알림이나 loadNow가 실패한 요청을 저절로 다시 보내지 않게 */
  const load = async ({ fromError = false }: { fromError?: boolean } = {}) => {
    if (destroyed) return
    if (status !== 'idle' && !(fromError && status === 'error')) return
    if (!hasMore()) {
      setStatus('done')
      stopObserving()
      return
    }

    const startedIn = generation
    setStatus('loading')
    try {
      await loadMore()
      // 기다리는 사이 목록이 새로 채워졌으면(reset) 이 응답은 지난 목록의 것이다 — 상태를 건드리지 않는다
      if (destroyed || startedIn !== generation) return
      if (!hasMore()) {
        setStatus('done')
        stopObserving()
        return
      }
      setStatus('idle')
      // sentinel이 아직 화면에 남아 있으면(한 페이지로 화면이 안 찼다) 다시 알림을 받아야 한다.
      // 관찰을 새로 걸면 브라우저가 현재 교차 상태를 처음부터 다시 통지한다.
      rearm()
    } catch (error) {
      if (destroyed || startedIn !== generation) return
      setStatus('error')
      stopObserving()
      onError?.(error)
    }
  }

  const rearm = () => {
    if (destroyed || typeof IntersectionObserver === 'undefined') return
    stopObserving()
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void load()
      },
      { root, rootMargin: `${rootMarginPx}px` },
    )
    observer.observe(sentinel)
  }

  rearm()

  return {
    current: () => status,
    /**
     * 실패 후 다시 시도 — 버튼에 연결한다(자동 재시도는 하지 않는다).
     * 감시 요소가 다시 교차하기를 기다리지 않고 바로 부른다. 누른 사람은 지금 다시 보내길 원한다
     */
    retry: () => {
      if (status !== 'error') return
      void load({ fromError: true })
    },
    /** 버튼("더 보기")이나 초기 로딩에서 직접 부를 때 — IntersectionObserver가 없는 환경의 유일한 경로 */
    loadNow: () => load(),
    /**
     * 목록을 처음부터 새로 채울 때 부른다(필터·정렬·검색어 변경, 당겨서 새로고침).
     * 끝남(done)·실패(error)를 걷고 다시 감시한다. 진행 중이던 요청의 응답은 상태를 바꾸지 못한다 —
     * 다만 그 응답이 목록에 항목을 붙이는 것까지는 막지 못하므로, loadMore 안에서 지난 요청을 가려내야 한다
     */
    reset: () => {
      if (destroyed) return
      generation += 1
      setStatus('idle')
      rearm()
    },
    destroy: () => {
      destroyed = true
      stopObserving()
    },
  }
}
