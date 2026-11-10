import { observeHeaderCollapse } from '@skills/sticky-header/assets/observeHeaderCollapse'

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
  observe = (el: Element) => this.record.observed.push(el)
  unobserve = () => {}
  disconnect = () => {
    this.record.disconnected = true
  }
  takeRecords = () => []
}

const intersect = ({ el, isIntersecting }: { el: Element; isIntersecting: boolean }) => {
  observers[0].callback([{ target: el, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
}

describe('observeHeaderCollapse — 센티널 이탈로 헤더 상태 전환', () => {
  let header: HTMLElement
  let sentinel: HTMLElement

  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    header = document.createElement('header')
    sentinel = document.createElement('div')
    document.body.append(header, sentinel)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    header.remove()
    sentinel.remove()
  })

  it('초기에는 data-collapsed=false이고 센티널을 관찰한다', () => {
    observeHeaderCollapse({ header, sentinel })
    expect(header.dataset.collapsed).toBe('false')
    expect(observers[0].observed).toContain(sentinel)
  })

  it('센티널이 뷰포트를 벗어나면 collapsed=true, 돌아오면 false', () => {
    const states: boolean[] = []
    observeHeaderCollapse({ header, sentinel, onChange: (collapsed) => states.push(collapsed) })
    intersect({ el: sentinel, isIntersecting: false })
    expect(header.dataset.collapsed).toBe('true')
    intersect({ el: sentinel, isIntersecting: true })
    expect(header.dataset.collapsed).toBe('false')
    expect(states).toEqual([true, false])
  })

  it('cleanup이 옵저버를 해제한다', () => {
    const cleanup = observeHeaderCollapse({ header, sentinel })
    cleanup()
    expect(observers[0].disconnected).toBe(true)
  })

  it('IntersectionObserver가 없으면 펼침 상태로 남는다 (기능 저하 폴백)', () => {
    vi.unstubAllGlobals()
    const original = globalThis.IntersectionObserver
    // @ts-expect-error 폴백 경로 테스트를 위한 의도적 제거
    delete globalThis.IntersectionObserver
    observeHeaderCollapse({ header, sentinel })
    expect(header.dataset.collapsed).toBe('false')
    globalThis.IntersectionObserver = original
  })

  it('머리 높이만큼 위를 줄여 본다 — 큰 제목이 머리 아래로 다 들어간 순간에 작은 제목이 나온다', () => {
    Object.defineProperty(header, 'offsetHeight', { value: 52 })
    observeHeaderCollapse({ header, sentinel })
    expect(observers[0].options?.rootMargin).toBe('-52px 0px 0px 0px')
  })

  it('root를 주면 그 스크롤 상자를 기준으로 본다', () => {
    const box = document.createElement('div')
    observeHeaderCollapse({ header, sentinel, root: box })
    expect(observers[0].options?.root).toBe(box)
  })

  it('센티널이 아직 화면 아래에 있어 안 보이는 것은 접힘이 아니다 (첫 화면이 낮아 제목이 아래에 있는 경우)', () => {
    observeHeaderCollapse({ header, sentinel })
    const rootBounds = { top: 52, bottom: 320 } as DOMRectReadOnly
    observers[0].callback(
      [{ target: sentinel, isIntersecting: false, boundingClientRect: { top: 400, bottom: 440 }, rootBounds } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    expect(header.dataset.collapsed).toBe('false')
    observers[0].callback(
      [{ target: sentinel, isIntersecting: false, boundingClientRect: { top: 10, bottom: 50 }, rootBounds } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    expect(header.dataset.collapsed).toBe('true')
  })

  it('첫 판정은 전이 없이 적용한다 — 스크롤 위치가 복원돼 중간에서 시작해도 작은 제목이 떠오르는 연출이 없다', () => {
    const seen: string[] = []
    header.getBoundingClientRect = () => {
      seen.push(`${header.dataset.instant}|${header.dataset.collapsed}`)
      return {} as DOMRect
    }
    observeHeaderCollapse({ header, sentinel })
    intersect({ el: sentinel, isIntersecting: false })
    // data-instant가 걸린 채로 배치를 한 번 읽어 스타일을 확정하고, 바로 뗀다
    expect(seen).toEqual(['true|true'])
    expect(header.dataset.instant).toBeUndefined()
    intersect({ el: sentinel, isIntersecting: true })
    expect(seen).toHaveLength(1)
  })
})
