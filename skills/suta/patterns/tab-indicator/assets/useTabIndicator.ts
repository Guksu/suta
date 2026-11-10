import { useEffect, useRef } from 'react'
import { moveTabIndicator, revealTab } from './moveTabIndicator'
import './tab-indicator.css'

type Watched = { indicator: HTMLElement; target: HTMLElement; stop: () => void }

/**
 * moveTabIndicator 코어의 React 래퍼.
 * registerTab(index)를 각 탭의 ref로, indicatorRef를 인디케이터 요소에 달면
 * activeIndex가 바뀔 때마다 인디케이터가 활성 탭 위치로 미끄러진다.
 * 탭 줄이 가로로 넘치면(.tab-bar[data-scroll='true']) 선택한 탭이 보이게 줄도 함께 스크롤한다.
 */
export const useTabIndicator = ({ activeIndex }: { activeIndex: number }) => {
  const tabsRef = useRef<Array<HTMLElement | null>>([])
  const indicatorRef = useRef<HTMLElement | null>(null)
  const watchedRef = useRef<Watched | null>(null)

  const registerTab = (index: number) => (el: HTMLElement | null) => {
    tabsRef.current[index] = el
  }

  // 의존성 배열이 없다 — 탭 목록을 늦게 받으면 activeIndex는 그대로인데 탭 요소가 뒤늦게 생긴다.
  // 그릴 때마다 "선택된 탭 요소가 바뀌었는가"만 보고, 같으면 바로 돌아간다
  useEffect(function slideToActiveTab() {
    const indicator = indicatorRef.current
    const target = tabsRef.current[activeIndex]
    if (!indicator || !target) return
    const watched = watchedRef.current
    if (watched?.indicator === indicator && watched.target === target) return
    watched?.stop()

    // 첫 배치는 슬라이드 없이 — 0에서 미끄러져 오는 가짜 이동을 막는다. 인디케이터 요소가 새로 그려진 경우도 첫 배치다
    const first = watched?.indicator !== indicator
    moveTabIndicator({ indicator, target, immediate: first })
    const bar = indicator.parentElement
    if (bar) revealTab(first ? { bar, target, behavior: 'auto' } : { bar, target })

    // 글꼴 로드·창 크기·라벨 변경으로 탭 폭이나 자리가 바뀌면 제자리로 다시 잰다.
    // 선택된 탭만 보면 앞 탭의 글자가 바뀌어 밀린 경우(자기 폭은 그대로)를 놓친다 — 줄과 모든 탭을 본다
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => moveTabIndicator({ indicator, target, immediate: true }))
    if (observer) {
      if (bar) observer.observe(bar)
      tabsRef.current.forEach((tab) => tab && observer.observe(tab))
    }
    watchedRef.current = { indicator, target, stop: () => observer?.disconnect() }
  })

  useEffect(function stopWatchingOnUnmount() {
    return () => {
      watchedRef.current?.stop()
      watchedRef.current = null
    }
  }, [])

  /** 방향키 이동용 — nextTabIndex가 돌려준 순서의 탭으로 포커스를 옮긴다 */
  const focusTab = (index: number) => tabsRef.current[index]?.focus()

  return { registerTab, indicatorRef, focusTab }
}
