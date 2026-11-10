import { useRef } from 'react'
import { render } from '@testing-library/react'
import { useStickyHeader } from '@skills/sticky-header/assets/useStickyHeader'

type ObserverRecord = { options?: IntersectionObserverInit; observed: Element[]; disconnected: boolean }
const observers: ObserverRecord[] = []

class MockIntersectionObserver {
  private record: ObserverRecord
  constructor(_callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.record = { options, observed: [], disconnected: false }
    observers.push(this.record)
  }
  observe = (el: Element) => this.record.observed.push(el)
  unobserve = () => {}
  disconnect = () => {
    this.record.disconnected = true
  }
  takeRecords = () => []
}

// 가게 정보를 받기 전에는 뼈대만 그리고, 받은 뒤에야 머리와 큰 제목을 그리는 상세 화면
const Detail = ({ name }: { name: string | null }) => {
  const { headerRef, sentinelRef } = useStickyHeader<HTMLElement, HTMLHeadingElement>()
  if (!name) return <p>불러오는 중</p>
  return (
    <>
      <header ref={headerRef} className="sticky-header">
        <span className="sticky-header-title">{name}</span>
      </header>
      <h1 ref={sentinelRef}>{name}</h1>
    </>
  )
}

const Boxed = () => {
  const boxRef = useRef<HTMLDivElement>(null)
  const { headerRef, sentinelRef } = useStickyHeader<HTMLElement, HTMLHeadingElement>({ root: boxRef })
  return (
    <div ref={boxRef} data-testid="box">
      <header ref={headerRef} className="sticky-header" />
      <h1 ref={sentinelRef}>성수동 손칼국수</h1>
    </div>
  )
}

describe('useStickyHeader — 늦게 그려지는 머리와 스크롤 상자', () => {
  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('머리와 큰 제목이 나중에 그려져도(데이터를 받은 뒤) 그때부터 본다', () => {
    const { rerender, container } = render(<Detail name={null} />)
    expect(observers).toHaveLength(0)
    rerender(<Detail name="성수동 손칼국수" />)
    expect(observers).toHaveLength(1)
    expect(observers[0].observed).toEqual([container.querySelector('h1')])
    expect(container.querySelector('header')).toHaveAttribute('data-collapsed', 'false')
  })

  it('같은 요소로 다시 그려질 때는 감시를 새로 걸지 않는다', () => {
    const { rerender } = render(<Detail name="성수동 손칼국수" />)
    rerender(<Detail name="성수동 손칼국수 본점" />)
    expect(observers).toHaveLength(1)
    expect(observers[0].disconnected).toBe(false)
  })

  it('언마운트하면 감시를 푼다', () => {
    const { unmount } = render(<Detail name="성수동 손칼국수" />)
    unmount()
    expect(observers.at(-1)!.disconnected).toBe(true)
  })

  it('root로 넘긴 스크롤 상자를 기준으로 본다', () => {
    const { getByTestId } = render(<Boxed />)
    expect(observers.at(-1)!.options?.root).toBe(getByTestId('box'))
  })
})
