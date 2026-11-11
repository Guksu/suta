import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { runPageTransition, type NavDirection } from './runPageTransition'
import './page-transition.css'

type UsePageStackOptions<T> = {
  /** 첫 화면 */
  initial: T
  /** 스크롤되는 요소. 없으면 창(window) 기준 */
  scrollRef?: { current: HTMLElement | null }
  /**
   * true면 들어갈 때마다 history에 항목을 쌓아 브라우저 뒤로·앞으로 가기가 화면 스택을 따라간다(기본 false).
   * 주소는 바꾸지 않는다 — history.state에 순번만 심는다.
   */
  syncHistory?: boolean
}

type Nav<T> = { screens: T[]; index: number }
/** 들어갈 때 눌렀던 요소를 다시 찾을 단서 — 화면이 갈리면 DOM 노드는 새로 만들어지므로 노드를 쥐고 있을 수 없다 */
type Origin = { id: string } | { order: number }

const STATE_KEY = '__pageStack'
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const readView = () => document.querySelector<HTMLElement>('[data-page-view]')

const readStateObject = (): Record<string, unknown> => {
  const state: unknown = history.state
  return typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {}
}

/**
 * 화면 스택 — push로 들어가고 back으로 나온다. 라우터가 아니라 라우터 **없이도**
 * 앱 같은 전환을 쓰기 위한 최소 구현이다(라우터가 있다면 PATTERN.md의 조합 방법을 보라).
 *
 * 전환 자체 못지않게 중요한 것이 스크롤과 포커스다:
 *  - 들어갈 때: 지금 위치를 기억해 두고 새 화면은 맨 위에서 시작한다. 누른 항목이 사라지므로 포커스는 새 화면으로 옮긴다
 *  - 나올 때: 기억해 둔 위치로 되돌리고, 포커스는 들어갈 때 눌렀던 항목으로 돌려보낸다
 * 위치 복원은 전환이 끝난 뒤가 아니라 DOM을 바꾸는 그 순간에 한다. 나중에 되돌리면
 * 애니메이션이 끝나고 화면이 한 번 튄다.
 */
export const usePageStack = <T,>({ initial, scrollRef, syncHistory = false }: UsePageStackOptions<T>) => {
  const [nav, setNav] = useState<Nav<T>>({ screens: [initial], index: 0 })
  // popstate 처리기와 연타 판정은 렌더를 기다리지 않고 최신 값을 봐야 한다
  const navRef = useRef(nav)
  const busyRef = useRef(false)
  const scrollMemory = useRef(new Map<number, number>())
  const originMemory = useRef(new Map<number, Origin>())

  const readScroll = () => (scrollRef?.current ? scrollRef.current.scrollTop : window.scrollY)
  const writeScroll = (top: number) => {
    if (scrollRef?.current) scrollRef.current.scrollTop = top
    else window.scrollTo(0, top)
  }

  const rememberOrigin = (index: number) => {
    const view = readView()
    const active = document.activeElement
    if (!view || !(active instanceof HTMLElement) || !view.contains(active)) {
      originMemory.current.delete(index)
      return
    }
    originMemory.current.set(
      index,
      active.id ? { id: active.id } : { order: Array.from(view.querySelectorAll(FOCUSABLE)).indexOf(active) },
    )
  }

  /** 화면이 갈리며 포커스가 body로 떨어졌거나 영역 자체에 머물러 있을 때만 옮긴다 — 헤더의 뒤로 버튼처럼 살아남은 요소의 포커스는 건드리지 않는다 */
  const moveFocus = (index: number) => {
    const view = readView()
    if (!view) return
    // 영역 자체에 있는 포커스는 지난 화면에 들어올 때 임시로 둔 것이다 — 살아남은 요소로 치지 않는다
    const active = document.activeElement
    if (active && active !== document.body && active !== view && active.isConnected) return
    const origin = originMemory.current.get(index)
    const target = origin
      ? 'id' in origin
        ? document.getElementById(origin.id)
        : view.querySelectorAll<HTMLElement>(FOCUSABLE)[origin.order]
      : null
    if (target) {
      target.focus({ preventScroll: true })
      return
    }
    // 새 화면: 영역 자체로 옮긴다. 스크린 리더는 새 내용의 처음부터 읽고, Tab은 새 화면의 첫 요소로 간다
    if (!view.hasAttribute('tabindex')) view.setAttribute('tabindex', '-1')
    view.focus({ preventScroll: true })
  }

  const go = ({ direction, next, scrollTo, animate }: { direction: NavDirection; next: Nav<T>; scrollTo: number; animate: boolean }) => {
    const from = navRef.current.index
    scrollMemory.current.set(from, readScroll())
    if (direction === 'forward') rememberOrigin(from)
    // 사진을 찍기 전에도 최신 값이어야 한다 — 그 한 프레임 사이의 연타가 같은 화면을 두 번 쌓지 않게
    navRef.current = next
    const update = () => {
      flushSync(() => setNav(next))
      writeScroll(scrollTo)
      moveFocus(next.index)
    }
    if (!animate || !('startViewTransition' in document)) {
      update()
      return
    }
    busyRef.current = true
    void runPageTransition({ direction, update }).finally(() => {
      busyRef.current = false
    })
  }

  const push = (screen: T) => {
    // 전환 중의 연타(더블 탭·Enter 연타)는 받지 않는다 — 받으면 같은 화면이 두 장 쌓여 뒤로를 두 번 눌러야 한다
    if (busyRef.current) return
    const { screens, index } = navRef.current
    const next = { screens: [...screens.slice(0, index + 1), screen], index: index + 1 }
    originMemory.current.delete(next.index)
    if (syncHistory) history.pushState({ ...readStateObject(), [STATE_KEY]: next.index }, '')
    go({ direction: 'forward', next, scrollTo: 0, animate: true })
  }

  const back = () => {
    const { screens, index } = navRef.current
    if (index <= 0 || busyRef.current) return
    if (syncHistory) {
      // 화면은 popstate가 바꾼다 — 버튼으로 나오든 브라우저 뒤로 가기로 나오든 history와 스택이 어긋나지 않는다
      history.back()
      return
    }
    go({
      direction: 'back',
      next: { screens: screens.slice(0, index), index: index - 1 },
      scrollTo: scrollMemory.current.get(index - 1) ?? 0,
      animate: true,
    })
  }

  const goRef = useRef(go)
  useEffect(function keepLatestGo() {
    goRef.current = go
  })

  useEffect(
    function followBrowserHistory() {
      if (!syncHistory) return
      history.replaceState({ ...readStateObject(), [STATE_KEY]: navRef.current.index }, '')
      const onPopState = (event: PopStateEvent) => {
        const { screens, index } = navRef.current
        const state: unknown = event.state
        const wanted = typeof state === 'object' && state !== null ? Number((state as Record<string, unknown>)[STATE_KEY]) : 0
        // 새로고침 뒤에는 스택이 첫 화면뿐이다 — 없는 화면의 순번은 가진 범위로 당긴다
        const target = Math.min(Math.max(Number.isFinite(wanted) ? wanted : 0, 0), screens.length - 1)
        if (target === index) return
        goRef.current({
          direction: target < index ? 'back' : 'forward',
          next: { screens, index: target },
          scrollTo: scrollMemory.current.get(target) ?? 0,
          // 가장자리 쓸기로 돌아오면 브라우저가 이미 넘기는 장면을 보여 줬다 — 한 번 더 재생하지 않는다
          animate: !(event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition,
        })
      }
      window.addEventListener('popstate', onPopState)
      return () => window.removeEventListener('popstate', onPopState)
    },
    [syncHistory],
  )

  return {
    current: nav.screens[nav.index],
    depth: nav.index + 1,
    canGoBack: nav.index > 0,
    push,
    back,
  }
}
