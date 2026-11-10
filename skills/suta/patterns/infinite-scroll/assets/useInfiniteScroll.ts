import { useEffect, useRef, useState } from 'react'
import { createInfiniteScroll, type InfiniteScrollStatus } from './createInfiniteScroll'

type UseInfiniteScrollOptions = {
  /** 더 불러올 것이 남았는지 */
  hasMore: boolean
  /** 다음 페이지를 불러와 상태에 붙인다 */
  loadMore: () => Promise<void> | void
  rootMarginPx?: number
  /** 스크롤 컨테이너 ref — 없으면 뷰포트 기준 */
  rootRef?: { current: Element | null }
}

/**
 * createInfiniteScroll 코어의 React 래퍼.
 * sentinelRef를 목록 끝의 빈 요소에 달면, 그 요소가 화면에 다가올 때 loadMore가 불린다.
 *
 * hasMore·loadMore는 ref로 최신값을 읽는다 — 페이지를 붙일 때마다 관찰을 새로 걸면
 * 다시 로드가 걸려 무한 루프가 되기 때문이다(관찰은 마운트 때 한 번만 건다).
 */
export const useInfiniteScroll = ({ hasMore, loadMore, rootMarginPx, rootRef }: UseInfiniteScrollOptions) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<ReturnType<typeof createInfiniteScroll> | null>(null)
  const [status, setStatus] = useState<InfiniteScrollStatus>('idle')

  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore
  // 지금 돌고 있는 요청 — 옵션이 바뀌어 코어를 새로 만들어도 같은 페이지를 한 번 더 부르지 않게 훅이 쥐고 있다
  const inFlightRef = useRef<Promise<void> | null>(null)

  /** 돌고 있는 요청이 있으면 그 요청에 올라탄다(새 코어도 그 응답을 기다렸다가 이어 간다) */
  const loadOnce = () => {
    if (inFlightRef.current) return inFlightRef.current
    const request: Promise<void> = (async () => {
      await loadMoreRef.current()
    })().finally(() => {
      if (inFlightRef.current === request) inFlightRef.current = null
    })
    inFlightRef.current = request
    return request
  }

  useEffect(
    function observeSentinel() {
      const sentinel = sentinelRef.current
      if (!sentinel) return
      const controller = createInfiniteScroll({
        sentinel,
        root: rootRef?.current ?? null,
        rootMarginPx,
        hasMore: () => hasMoreRef.current,
        loadMore: loadOnce,
        onStatusChange: setStatus,
      })
      controllerRef.current = controller
      // 옵션이 바뀌어 코어를 새로 만든 경우, 화면의 상태도 새 코어(idle)에 맞춘다 —
      // 앞 코어의 error가 남으면 "다시 시도"가 아무 일도 하지 않는다
      setStatus(controller.current())
      return () => {
        controller.destroy()
        controllerRef.current = null
      }
    },
    [rootMarginPx, rootRef],
  )

  useEffect(
    function reviveWhenMoreArrives() {
      // 끝났던 목록에 다시 불러올 것이 생겼다(필터를 바꿔 새로 채웠다) — done은 관찰을 끊어 두므로 다시 건다
      if (hasMore && controllerRef.current?.current() === 'done') controllerRef.current.reset()
    },
    [hasMore],
  )

  return {
    sentinelRef,
    status,
    isLoading: status === 'loading',
    /** 실패 후 재시도 버튼에 연결한다 */
    retry: () => controllerRef.current?.retry(),
    /** "더 보기" 버튼에 연결한다 — 자동 로딩이 막힌 환경의 대비책 */
    loadNow: () => controllerRef.current?.loadNow(),
    /** 목록을 처음부터 새로 채울 때 부른다(필터·정렬 변경) — 끝남·실패를 걷고, 진행 중이던 요청의 응답은 상태를 바꾸지 못한다 */
    reset: () => {
      inFlightRef.current = null // 새 목록의 첫 요청이 지난 목록의 요청에 올라타지 않게 한다
      controllerRef.current?.reset()
    },
  }
}
