import { revealOnScroll } from '@skills/scroll-reveal/assets/revealOnScroll'

type ObserverRecord = {
  callback: IntersectionObserverCallback
  options?: IntersectionObserverInit
  observed: Element[]
  unobserved: Element[]
  disconnected: boolean
}

const observers: ObserverRecord[] = []

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []
  private record: ObserverRecord

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.record = { callback, options, observed: [], unobserved: [], disconnected: false }
    observers.push(this.record)
  }
  observe = (el: Element) => {
    this.record.observed.push(el)
  }
  unobserve = (el: Element) => {
    this.record.unobserved.push(el)
  }
  disconnect = () => {
    this.record.disconnected = true
  }
  takeRecords = () => []
}

const intersect = ({ record, el, isIntersecting }: { record: ObserverRecord; el: Element; isIntersecting: boolean }) => {
  record.callback([{ target: el, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
}

describe('revealOnScroll — 프레임워크 무관 뷰포트 공개 코어', () => {
  let el: HTMLElement

  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    el = document.createElement('div')
    document.body.appendChild(el)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    el.remove()
  })

  it('등록 즉시 data-revealed=false를 쓰고 옵저버에 등록한다', () => {
    revealOnScroll({ element: el })
    expect(el.dataset.revealed).toBe('false')
    expect(observers[0].observed).toContain(el)
  })

  it('threshold·rootMargin이 옵저버 옵션으로 전달된다', () => {
    revealOnScroll({ element: el, threshold: 0.5, rootMargin: '0px 0px -10% 0px' })
    expect(observers[0].options?.threshold).toEqual([0, 0.5])
    expect(observers[0].options?.rootMargin).toBe('0px 0px -10% 0px')
  })

  it('교차 시 data-revealed=true + onChange(true), 기본(once)은 관찰을 멈춘다', () => {
    const changes: boolean[] = []
    revealOnScroll({ element: el, onChange: (revealed) => changes.push(revealed) })
    intersect({ record: observers[0], el, isIntersecting: true })
    expect(el.dataset.revealed).toBe('true')
    expect(changes).toEqual([true])
    expect(observers[0].unobserved).toContain(el)
  })

  it('once=false면 벗어날 때 다시 감춘다', () => {
    revealOnScroll({ element: el, once: false })
    intersect({ record: observers[0], el, isIntersecting: true })
    intersect({ record: observers[0], el, isIntersecting: false })
    expect(el.dataset.revealed).toBe('false')
  })

  it('반환된 cleanup이 옵저버를 해제한다', () => {
    const cleanup = revealOnScroll({ element: el })
    cleanup()
    expect(observers[0].disconnected).toBe(true)
  })

  it('IntersectionObserver가 없으면 즉시 공개한다 (콘텐츠 실종 방지)', () => {
    vi.unstubAllGlobals()
    const original = globalThis.IntersectionObserver
    // @ts-expect-error 폴백 경로 테스트를 위한 의도적 제거
    delete globalThis.IntersectionObserver
    revealOnScroll({ element: el })
    expect(el.dataset.revealed).toBe('true')
    globalThis.IntersectionObserver = original
  })
})

type EntryInit = {
  record: ObserverRecord
  el: Element
  isIntersecting: boolean
  ratio?: number
  /** 요소의 화면 좌표 */
  top?: number
  height?: number
  rootHeight?: number
}

const entryOf = ({ el, isIntersecting, ratio = isIntersecting ? 1 : 0, top = 0, height = 100, rootHeight = 800 }: EntryInit) =>
  ({
    target: el,
    isIntersecting,
    intersectionRatio: ratio,
    boundingClientRect: { top, bottom: top + height, height },
    rootBounds: { top: 0, bottom: rootHeight, height: rootHeight },
  }) as unknown as IntersectionObserverEntry

const fire = (init: EntryInit) => init.record.callback([entryOf(init)], {} as IntersectionObserver)

describe('revealOnScroll — 상태와 경계', () => {
  let el: HTMLElement

  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    el = document.createElement('div')
    document.body.appendChild(el)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    el.remove()
  })

  it('모서리만 걸친 상태(threshold 미만)에서는 아직 공개하지 않는다', () => {
    revealOnScroll({ element: el })
    fire({ record: observers[0], el, isIntersecting: true, ratio: 0.02, top: 798 })
    expect(el.dataset.revealed).toBe('false')
    fire({ record: observers[0], el, isIntersecting: true, ratio: 0.2, top: 780 })
    expect(el.dataset.revealed).toBe('true')
  })

  it('화면보다 훨씬 긴 요소는 threshold에 닿을 수 없다 — 걸치는 순간 공개한다', () => {
    // 3000px 요소가 600px 화면에서 보일 수 있는 최대 비율은 0.2가 아니라 600/3000 = 0.2 미만일 수 있다
    revealOnScroll({ element: el, threshold: 0.3 })
    fire({ record: observers[0], el, isIntersecting: true, ratio: 0.01, top: 570, height: 3000, rootHeight: 600 })
    expect(el.dataset.revealed).toBe('true')
  })

  it('처음부터 화면 위로 지나간 요소(스크롤 복원·앵커 이동)는 움직임 없이 공개해 둔다', () => {
    const changes: boolean[] = []
    revealOnScroll({ element: el, onChange: (revealed) => changes.push(revealed) })
    fire({ record: observers[0], el, isIntersecting: false, top: -900 })
    expect(el.dataset.revealed).toBe('true')
    expect(changes).toEqual([true])
    expect(observers[0].unobserved).toContain(el)
  })

  it('화면 아래에 있는 요소는 감춘 채로 둔다', () => {
    revealOnScroll({ element: el })
    fire({ record: observers[0], el, isIntersecting: false, top: 1200 })
    expect(el.dataset.revealed).toBe('false')
  })

  it('once=false는 완전히 벗어났을 때만 다시 감춘다(경계에서 깜빡이지 않는다)', () => {
    revealOnScroll({ element: el, once: false })
    fire({ record: observers[0], el, isIntersecting: true, ratio: 0.5, top: 700 })
    fire({ record: observers[0], el, isIntersecting: true, ratio: 0.05, top: 795 })
    expect(el.dataset.revealed).toBe('true')
    fire({ record: observers[0], el, isIntersecting: false, top: 900 })
    expect(el.dataset.revealed).toBe('false')
  })

  it('이미 공개된 요소를 다시 등록해도(옵션 변경·재실행) 감췄다가 다시 재생하지 않는다', () => {
    revealOnScroll({ element: el })
    fire({ record: observers[0], el, isIntersecting: true })
    revealOnScroll({ element: el, threshold: 0.5 })
    expect(el.dataset.revealed).toBe('true')
    expect(observers).toHaveLength(1)
  })
})
