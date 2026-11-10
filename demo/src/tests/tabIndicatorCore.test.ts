import { moveTabIndicator, nextTabIndex, revealTab } from '@skills/tab-indicator/assets/moveTabIndicator'

const makeTab = ({ left, width }: { left: number; width: number }) => {
  const el = document.createElement('button')
  Object.defineProperty(el, 'offsetLeft', { value: left })
  Object.defineProperty(el, 'offsetWidth', { value: width })
  return el
}

describe('moveTabIndicator — 활성 탭 위치로 인디케이터 이동', () => {
  let indicator: HTMLElement

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    indicator = document.createElement('span')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('타깃 탭의 offsetLeft·offsetWidth를 translateX·scaleX로 옮긴다 (GPU 속성만)', () => {
    moveTabIndicator({ indicator, target: makeTab({ left: 120, width: 80 }) })
    expect(indicator.style.transform).toBe('translateX(120px) scaleX(80)')
  })

  it('immediate면 transition을 껐다가 다음 프레임에 복원한다 (첫 배치가 슬라이드로 보이지 않게)', () => {
    moveTabIndicator({ indicator, target: makeTab({ left: 40, width: 60 }), immediate: true })
    expect(indicator.style.transition).toBe('none')
    expect(indicator.style.transform).toBe('translateX(40px) scaleX(60)')
    vi.advanceTimersByTime(50)
    expect(indicator.style.transition).toBe('')
  })

  it('immediate가 아니면 transition을 건드리지 않는다', () => {
    moveTabIndicator({ indicator, target: makeTab({ left: 0, width: 50 }) })
    expect(indicator.style.transition).toBe('')
  })

  it('immediate여도 이미 그 자리면 transition을 끄지 않는다 (크기 감시의 첫 알림이 진행 중인 슬라이드를 끊지 않게)', () => {
    moveTabIndicator({ indicator, target: makeTab({ left: 120, width: 80 }) })
    moveTabIndicator({ indicator, target: makeTab({ left: 120, width: 80 }), immediate: true })
    expect(indicator.style.transition).toBe('')
  })

  it('immediate는 transition이 none인 채로 배치를 한 번 읽어 스타일을 확정한다 (처음 그릴 때 0에서 미끄러져 오지 않게)', () => {
    const seen: string[] = []
    indicator.getBoundingClientRect = () => {
      seen.push(`${indicator.style.transition}|${indicator.style.transform}`)
      return {} as DOMRect
    }
    moveTabIndicator({ indicator, target: makeTab({ left: 40, width: 60 }), immediate: true })
    expect(seen).toEqual(['none|translateX(40px) scaleX(60)'])
  })

  it('자리가 바뀌었으면 immediate가 즉시 다시 맞춘다 (글꼴이 늦게 와 탭 폭이 달라진 경우)', () => {
    moveTabIndicator({ indicator, target: makeTab({ left: 120, width: 80 }) })
    moveTabIndicator({ indicator, target: makeTab({ left: 132, width: 92 }), immediate: true })
    expect(indicator.style.transition).toBe('none')
    expect(indicator.style.transform).toBe('translateX(132px) scaleX(92)')
  })
})

describe('revealTab — 가로로 넘치는 탭 줄에서 선택한 탭을 보이는 자리로', () => {
  const makeBar = ({ clientWidth, scrollWidth, rtl = false }: { clientWidth: number; scrollWidth: number; rtl?: boolean }) => {
    const bar = document.createElement('nav')
    if (rtl) bar.style.direction = 'rtl'
    Object.defineProperty(bar, 'clientWidth', { value: clientWidth })
    Object.defineProperty(bar, 'scrollWidth', { value: scrollWidth })
    const calls: ScrollToOptions[] = []
    bar.scrollTo = ((options: ScrollToOptions) => calls.push(options)) as typeof bar.scrollTo
    document.body.appendChild(bar)
    return { bar, calls }
  }
  const makeTabIn = ({ bar, left, width }: { bar: HTMLElement; left: number; width: number }) => {
    const tab = document.createElement('button')
    Object.defineProperty(tab, 'offsetLeft', { value: left })
    Object.defineProperty(tab, 'offsetWidth', { value: width })
    bar.appendChild(tab)
    return tab
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('선택한 탭이 줄 가운데에 오는 좌표로 스크롤한다', () => {
    const { bar, calls } = makeBar({ clientWidth: 320, scrollWidth: 900 })
    revealTab({ bar, target: makeTabIn({ bar, left: 400, width: 80 }), behavior: 'auto' })
    // 400 - (320 - 80) / 2 = 280
    expect(calls).toEqual([{ left: 280, behavior: 'auto' }])
  })

  it('처음·끝 탭은 스크롤 범위 안으로 가둔다', () => {
    const { bar, calls } = makeBar({ clientWidth: 320, scrollWidth: 900 })
    revealTab({ bar, target: makeTabIn({ bar, left: 0, width: 80 }), behavior: 'auto' })
    revealTab({ bar, target: makeTabIn({ bar, left: 820, width: 80 }), behavior: 'auto' })
    expect(calls.map((call) => call.left)).toEqual([0, 580])
  })

  it('줄이 넘치지 않으면 아무것도 하지 않는다', () => {
    const { bar, calls } = makeBar({ clientWidth: 320, scrollWidth: 320 })
    revealTab({ bar, target: makeTabIn({ bar, left: 200, width: 80 }) })
    expect(calls).toHaveLength(0)
  })

  it('오른쪽에서 왼쪽으로 쓰는 줄은 스크롤 좌표가 0에서 음수로 간다', () => {
    const { bar, calls } = makeBar({ clientWidth: 320, scrollWidth: 900, rtl: true })
    // 넘친 탭의 offsetLeft는 음수다 — -300 - (320 - 80) / 2 = -420
    revealTab({ bar, target: makeTabIn({ bar, left: -300, width: 80 }), behavior: 'auto' })
    revealTab({ bar, target: makeTabIn({ bar, left: 240, width: 80 }), behavior: 'auto' })
    revealTab({ bar, target: makeTabIn({ bar, left: -580, width: 80 }), behavior: 'auto' })
    expect(calls.map((call) => call.left)).toEqual([-420, 0, -580])
  })

  it('동작 줄이기 설정이면 부드러운 스크롤 대신 바로 옮긴다', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    const { bar, calls } = makeBar({ clientWidth: 320, scrollWidth: 900 })
    revealTab({ bar, target: makeTabIn({ bar, left: 400, width: 80 }) })
    expect(calls[0].behavior).toBe('auto')
    vi.unstubAllGlobals()
  })
})

describe('nextTabIndex — 방향키로 탭 사이를 오간다', () => {
  it('오른쪽·왼쪽 방향키는 옆 탭으로, 끝에서는 반대쪽 끝으로 돈다', () => {
    expect(nextTabIndex({ key: 'ArrowRight', index: 0, count: 4 })).toBe(1)
    expect(nextTabIndex({ key: 'ArrowRight', index: 3, count: 4 })).toBe(0)
    expect(nextTabIndex({ key: 'ArrowLeft', index: 0, count: 4 })).toBe(3)
  })

  it('Home·End는 처음·마지막 탭으로 간다', () => {
    expect(nextTabIndex({ key: 'Home', index: 2, count: 4 })).toBe(0)
    expect(nextTabIndex({ key: 'End', index: 0, count: 4 })).toBe(3)
  })

  it('오른쪽에서 왼쪽으로 쓰는 줄에서는 방향키가 뒤집힌다', () => {
    expect(nextTabIndex({ key: 'ArrowLeft', index: 0, count: 4, rtl: true })).toBe(1)
    expect(nextTabIndex({ key: 'ArrowRight', index: 0, count: 4, rtl: true })).toBe(3)
  })

  it('다른 키와 탭이 없는 줄은 null이다 (기본 동작을 막지 않는다)', () => {
    expect(nextTabIndex({ key: 'Enter', index: 0, count: 4 })).toBeNull()
    expect(nextTabIndex({ key: 'ArrowRight', index: 0, count: 0 })).toBeNull()
  })
})
