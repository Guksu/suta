import { useEffect, useRef, type RefObject } from 'react'
import { observeHeaderCollapse } from './observeHeaderCollapse'
import './sticky-header.css'

type Watched = { header: HTMLElement; sentinel: HTMLElement; root: Element | null; stop: () => void }

/**
 * observeHeaderCollapse 코어의 React 래퍼.
 * headerRef를 고정 헤더에, sentinelRef를 큰 제목 블록에 달면
 * 제목이 스크롤에 밀려 헤더 아래로 들어갈 때 헤더에 data-collapsed가 걸린다.
 * 페이지가 아니라 특정 상자 안에서 스크롤되면 그 상자의 ref를 root로 넘긴다.
 */
export const useStickyHeader = <
  HeaderT extends HTMLElement = HTMLElement,
  SentinelT extends HTMLElement = HTMLElement,
>({ root }: { root?: RefObject<Element | null> } = {}) => {
  const headerRef = useRef<HeaderT | null>(null)
  const sentinelRef = useRef<SentinelT | null>(null)
  const watchedRef = useRef<Watched | null>(null)

  // 의존성 배열이 없다 — 데이터를 받은 뒤에야 헤더와 제목을 그리는 화면에서는 첫 렌더에 ref가 비어 있다.
  // 그릴 때마다 요소가 바뀌었는지만 보고, 같으면 바로 돌아간다
  useEffect(function watchSentinel() {
    const header = headerRef.current
    const sentinel = sentinelRef.current
    const rootElement = root?.current ?? null
    const watched = watchedRef.current
    if (watched && watched.header === header && watched.sentinel === sentinel && watched.root === rootElement) return
    watched?.stop()
    watchedRef.current =
      header && sentinel
        ? { header, sentinel, root: rootElement, stop: observeHeaderCollapse({ header, sentinel, root: rootElement }) }
        : null
  })

  useEffect(function stopWatchingOnUnmount() {
    return () => {
      watchedRef.current?.stop()
      watchedRef.current = null
    }
  }, [])

  return { headerRef, sentinelRef }
}
