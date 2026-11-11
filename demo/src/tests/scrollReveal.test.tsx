import { act, render, screen } from '@testing-library/react'
import { ScrollReveal } from '@skills/scroll-reveal/assets/ScrollReveal'

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
  act(() => {
    record.callback([{ target: el, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
  })
}

describe('ScrollReveal — 뷰포트 진입 시 공개', () => {
  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('초기에는 data-revealed=false이고 옵저버에 등록된다', () => {
    render(
      <ScrollReveal>
        <p>본문</p>
      </ScrollReveal>,
    )
    const el = screen.getByText('본문').parentElement!
    expect(el).toHaveAttribute('data-revealed', 'false')
    expect(observers).toHaveLength(1)
    expect(observers[0].observed).toContain(el)
  })

  it('threshold 옵션이 옵저버에 전달된다', () => {
    render(
      <ScrollReveal threshold={0.5}>
        <p>본문</p>
      </ScrollReveal>,
    )
    expect(observers[0].options?.threshold).toEqual([0, 0.5])
  })

  it('뷰포트에 들어오면 data-revealed=true가 되고 기본(once)은 관찰을 멈춘다', () => {
    render(
      <ScrollReveal>
        <p>본문</p>
      </ScrollReveal>,
    )
    const el = screen.getByText('본문').parentElement!
    intersect({ record: observers[0], el, isIntersecting: true })
    expect(el).toHaveAttribute('data-revealed', 'true')
    expect(observers[0].unobserved).toContain(el)
    intersect({ record: observers[0], el, isIntersecting: false })
    expect(el).toHaveAttribute('data-revealed', 'true')
  })

  it('once=false면 벗어날 때 다시 감춰진다', () => {
    render(
      <ScrollReveal once={false}>
        <p>본문</p>
      </ScrollReveal>,
    )
    const el = screen.getByText('본문').parentElement!
    intersect({ record: observers[0], el, isIntersecting: true })
    expect(el).toHaveAttribute('data-revealed', 'true')
    intersect({ record: observers[0], el, isIntersecting: false })
    expect(el).toHaveAttribute('data-revealed', 'false')
  })

  it('언마운트 시 옵저버 연결을 해제한다 (누수 방지)', () => {
    const { unmount } = render(
      <ScrollReveal>
        <p>본문</p>
      </ScrollReveal>,
    )
    unmount()
    expect(observers[0].disconnected).toBe(true)
  })
})
