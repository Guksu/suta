import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { activeSectionFor, pillFrame, scrollTargetFor } from '@skills/glass-nav/assets/navSpyCore'
import { createGlassNav } from '@skills/glass-nav/assets/createGlassNav'

const SECTIONS = [
  { id: 'menu', top: 200 },
  { id: 'stores', top: 900 },
  { id: 'orders', top: 1500 },
]

describe('navSpyCore — 스크롤 위치로 활성 섹션을 정한다', () => {
  it('섹션 시작이 GNB 아래(navHeight + offset)로 들어오면 그 섹션이 활성', () => {
    const base = { sections: SECTIONS, navHeight: 56, offsetPx: 8 }
    expect(activeSectionFor({ ...base, scrollTop: 0 })).toBe('menu') // 첫 섹션 전에도 첫 섹션
    expect(activeSectionFor({ ...base, scrollTop: 835 })).toBe('menu') // 900 − 64 = 836 직전
    expect(activeSectionFor({ ...base, scrollTop: 836 })).toBe('stores')
    expect(activeSectionFor({ ...base, scrollTop: 1436 })).toBe('orders')
  })

  it('스크롤이 끝에 닿으면 마지막 섹션이 짧아도 마지막 섹션이 활성', () => {
    expect(activeSectionFor({ sections: SECTIONS, navHeight: 56, scrollTop: 1300, maxScrollTop: 1300 })).toBe('orders')
    expect(activeSectionFor({ sections: SECTIONS, navHeight: 56, scrollTop: 1200, maxScrollTop: 1300 })).toBe('stores')
  })

  it('섹션이 없으면 null', () => {
    expect(activeSectionFor({ sections: [], navHeight: 56, scrollTop: 100 })).toBeNull()
  })

  it('스크롤 목표는 섹션 시작 − GNB 높이 − 여유. 0 아래로 내려가지 않고, 소수는 올림', () => {
    expect(scrollTargetFor({ sectionTop: 900, navHeight: 56, offsetPx: 8 })).toBe(836)
    expect(scrollTargetFor({ sectionTop: 20, navHeight: 56 })).toBe(0)
    const target = scrollTargetFor({ sectionTop: 900.4, navHeight: 56, offsetPx: 8 })
    expect(activeSectionFor({ sections: SECTIONS.map((s) => (s.id === 'stores' ? { ...s, top: 900.4 } : s)), navHeight: 56, offsetPx: 8, scrollTop: target })).toBe('stores')
  })

  it('알약은 활성 링크의 왼쪽·오른쪽 끝을 clip-path inset으로 받는다 (링크 폭이 달라도 알약 모양 그대로, 레이아웃 전이 없이)', () => {
    expect(pillFrame({ offsetLeft: 72, offsetWidth: 48 })).toEqual({ clipPath: 'inset(0 calc(100% - 120px) 0 72px round 999px)' })
  })
})

describe('createGlassNav spy — 링크 클릭 → 섹션 스크롤, 스크롤 → 활성 링크', () => {
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  /** jsdom은 레이아웃이 없다 — 컨테이너·섹션·GNB 치수를 손으로 준다 */
  const build = () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollHeight', { value: 2000 })
    Object.defineProperty(container, 'clientHeight', { value: 600 })
    container.getBoundingClientRect = () => ({ top: 0 }) as DOMRect
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
      container.scrollTop = top as number
    })
    container.scrollTo = scrollTo as unknown as typeof container.scrollTo

    const nav = document.createElement('header')
    Object.defineProperty(nav, 'offsetHeight', { value: 56 })
    nav.innerHTML = `
      <div class="gnav-bar">
        <nav class="gnav-links"><div>
          <span class="gnav-pill" aria-hidden="true"></span>
          <a href="#menu">메뉴</a><a href="#stores">매장</a><a href="#orders">주문 내역</a>
        </div></nav>
        <span class="gnav-current" aria-hidden="true">메뉴</span>
      </div>`
    container.append(nav)
    const links = Array.from(nav.querySelectorAll('a'))
    links.forEach((link, i) => {
      Object.defineProperty(link, 'offsetLeft', { value: 60 * i })
      Object.defineProperty(link, 'offsetWidth', { value: 50 })
    })
    for (const { id, top } of SECTIONS) {
      const section = document.createElement('section')
      section.id = id
      // 섹션 위치는 컨테이너 기준 고정값 — 화면 기준 rect는 스크롤만큼 위로 올라간다
      section.getBoundingClientRect = () => ({ top: top - container.scrollTop }) as DOMRect
      container.append(section)
    }
    document.body.append(container)
    return { container, nav, links, scrollTo }
  }

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers() // 가짜 타이머를 쓴 테스트가 실패해도 다음 테스트의 requestAnimationFrame이 돌게
  })

  it('처음에는 첫 섹션이 활성이고 알약이 그 링크 위에 놓인다', () => {
    const { container, nav, links } = build()
    const ctl = createGlassNav({ container, nav, spy: true })
    expect(links[0].getAttribute('aria-current')).toBe('page')
    expect(links[1].hasAttribute('aria-current')).toBe(false)
    const pill = nav.querySelector<HTMLElement>('.gnav-pill')!
    expect(pill.style.clipPath).toBe('inset(0 calc(100% - 50px) 0 0px round 999px)')
    ctl.destroy()
  })

  it('첫 배치는 전이 없이 놓는다 — 폭 0에서 자라나는 가짜 움직임을 막는다', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    const { container, nav } = build()
    const pill = nav.querySelector<HTMLElement>('.gnav-pill')!
    // 스타일 확정(배치 읽기) 때 transition이 꺼져 있어야 브라우저가 전이 없이 그린다
    const transitionsSeenOnRead: string[] = []
    const measure = pill.getBoundingClientRect.bind(pill)
    pill.getBoundingClientRect = () => {
      transitionsSeenOnRead.push(pill.style.transition)
      return measure()
    }
    const ctl = createGlassNav({ container, nav, spy: true })
    expect(pill.style.transition).toBe('none')
    expect(transitionsSeenOnRead).toContain('none')
    vi.advanceTimersByTime(50)
    expect(pill.style.transition).toBe('')
    ctl.destroy()
  })

  it('링크를 누르면 기본 이동을 막고 섹션 시작이 GNB 아래에 오도록 scrollTo를 부른다', () => {
    const { container, nav, links, scrollTo } = build()
    const onActive = vi.fn()
    const ctl = createGlassNav({ container, nav, spy: { onActive } })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    links[1].dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 836, behavior: 'smooth' })
    // 활성 표시는 스크롤이 끝나길 기다리지 않고 바로 옮긴다
    expect(links[1].getAttribute('aria-current')).toBe('page')
    expect(links[0].hasAttribute('aria-current')).toBe(false)
    expect(nav.querySelector('.gnav-current')!.textContent).toBe('매장')
    // 두 번째부터는 전이를 건드리지 않아 CSS의 clip-path 전이로 미끄러진다
    expect(nav.querySelector<HTMLElement>('.gnav-pill')!.style.clipPath).toBe('inset(0 calc(100% - 110px) 0 60px round 999px)')
    expect(onActive).toHaveBeenLastCalledWith('stores')
    ctl.destroy()
  })

  it('reduced-motion이면 즉시(auto) 스크롤한다', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    const { container, nav, links, scrollTo } = build()
    const ctl = createGlassNav({ container, nav, spy: true })
    links[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 1436, behavior: 'auto' })
    ctl.destroy()
    vi.unstubAllGlobals()
  })

  it('클릭 스크롤 중에는 바가 숨지 않고, 잠금이 풀린 뒤 스크롤 추적이 다시 돈다', async () => {
    const { container, nav, links } = build()
    const ctl = createGlassNav({ container, nav, mode: 'hide', spy: { lockMs: 40 } })
    links[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    // 부드러운 스크롤이 진행되는 중간 위치 — 아래 방향 큰 이동이지만 잠금이라 숨기지 않는다
    container.scrollTop = 700
    container.dispatchEvent(new Event('scroll'))
    await nextFrame()
    expect(nav.dataset.hidden).toBe('false')
    expect(links[2].getAttribute('aria-current')).toBe('page') // 중간 섹션을 지나도 활성은 목표에 고정

    await wait(60)
    // 잠금 해제 후 사용자가 위로 올리면 추적이 다시 돈다
    container.scrollTop = 400
    container.dispatchEvent(new Event('scroll'))
    await nextFrame()
    expect(links[0].getAttribute('aria-current')).toBe('page')
    expect(nav.querySelector('.gnav-current')!.textContent).toBe('메뉴')
    ctl.destroy()
  })

  it('스크롤이 끝에 닿으면 마지막 링크가 활성, destroy 후에는 클릭이 기본 동작으로 돌아간다', async () => {
    const { container, nav, links, scrollTo } = build()
    const ctl = createGlassNav({ container, nav, spy: true })
    container.scrollTop = 1400 // scrollHeight 2000 − clientHeight 600
    container.dispatchEvent(new Event('scroll'))
    await nextFrame()
    expect(links[2].getAttribute('aria-current')).toBe('page')

    ctl.destroy()
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    links[1].dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('glass-nav.css — 알약은 clip-path만 전이한다', () => {
  // width 전이는 매 프레임 레이아웃을 돌린다. 링크 폭이 달라 transform만으로는 폭이 어긋나고, scaleX는 둥근 끝을 찌그러뜨린다
  const css = readFileSync(resolve(process.cwd(), '../skills/suta/patterns/glass-nav/assets/glass-nav.css'), 'utf8')
  const pillBlock = css.match(/\.gnav-pill\s*\{([^}]*)\}/)?.[1] ?? ''
  const transition = pillBlock.match(/transition:\s*([^;]+);/)?.[1] ?? ''

  it('알약의 transition은 clip-path이고 width·transform이 없다', () => {
    expect(transition).toMatch(/clip-path/)
    expect(transition).not.toMatch(/width|transform/)
  })

  it('레이아웃 애니메이션 무시 주석이 남아 있지 않다', () => {
    expect(css).not.toMatch(/motion-audit-ignore:\s*layout-animation/)
  })
})
