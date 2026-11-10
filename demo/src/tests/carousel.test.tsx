import { act, fireEvent, render, screen } from '@testing-library/react'
import { useCarousel } from '@skills/carousel/assets/useCarousel'

type ObserverRecord = { callback: IntersectionObserverCallback; observed: Element[] }
const observers: ObserverRecord[] = []

class MockIntersectionObserver {
  private record: ObserverRecord
  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback, observed: [] }
    observers.push(this.record)
  }
  observe = (el: Element) => this.record.observed.push(el)
  unobserve = () => {}
  disconnect = () => {}
  takeRecords = () => []
}

const Banner = ({ items, autoplayMs }: { items: string[] | null; autoplayMs?: number }) => {
  const { trackRef, activeIndex, goTo, autoplayOn, toggleAutoplay } = useCarousel({ autoplayMs })
  // 목록을 받기 전에는 트랙을 그리지 않는 화면 — 뼈대만 보이다가 트랙이 나중에 생긴다
  if (!items) return <p>불러오는 중</p>
  return (
    <div>
      <div ref={trackRef} className="carousel-track" data-testid="track">
        {items.map((item) => (
          <div key={item} className="carousel-slide">
            {item}
          </div>
        ))}
      </div>
      <output>{activeIndex}</output>
      <button type="button" onClick={() => goTo(1)}>
        둘째 장
      </button>
      <button type="button" onClick={toggleAutoplay}>
        {autoplayOn ? '일시정지' : '재생'}
      </button>
    </div>
  )
}

describe('useCarousel — 늦게 그려지는 트랙과 자동 넘김', () => {
  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('트랙이 나중에 그려져도(목록을 받은 뒤) 그때부터 지금 장을 따라간다', () => {
    const { rerender } = render(<Banner items={null} />)
    expect(observers).toHaveLength(0)
    rerender(<Banner items={['잔치국수', '비빔국수', '칼국수']} />)
    const record = observers.at(-1)!
    expect(record.observed).toHaveLength(3)
    act(() => record.callback([{ target: record.observed[2], isIntersecting: true } as unknown as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })

  it('포인터가 트랙 위에 있어 잠깐 선 동안에도 일시정지 버튼은 "일시정지"로 남는다 (사용자가 멈춘 것이 아니다)', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    render(<Banner items={['잔치국수', '비빔국수']} autoplayMs={1000} />)
    const toggle = screen.getByRole('button', { name: '일시정지' })
    fireEvent.pointerEnter(screen.getByTestId('track'))
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: '재생' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '재생' }))
    // 다시 켰다 — 포인터가 아직 트랙 위라 타이머는 서 있지만 버튼은 켜진 상태를 말한다
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
  })

  it('goTo로 옮기면 자동 넘김의 간격을 처음부터 다시 센다', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    render(<Banner items={['잔치국수', '비빔국수', '칼국수']} autoplayMs={1000} />)
    const track = screen.getByTestId('track')
    Object.defineProperty(track, 'scrollWidth', { value: 960, configurable: true })
    Object.defineProperty(track, 'clientWidth', { value: 320, configurable: true })
    Array.from(track.children).forEach((slide, index) => {
      Object.defineProperty(slide, 'offsetLeft', { value: index * 320 })
      Object.defineProperty(slide, 'offsetWidth', { value: 320 })
    })
    const record = observers.at(-1)!
    act(() => vi.advanceTimersByTime(900))
    fireEvent.click(screen.getByRole('button', { name: '둘째 장' }))
    // 둘째 장이 지금 장이 됐다 — 간격을 다시 세지 않으면 100ms 뒤(1000ms 시점)에 셋째 장으로 또 넘어간다
    act(() => record.callback([{ target: record.observed[1], isIntersecting: true } as unknown as IntersectionObserverEntry], {} as IntersectionObserver))
    act(() => vi.advanceTimersByTime(600))
    expect(track.scrollLeft).toBe(320)
    act(() => vi.advanceTimersByTime(900)) // goTo에서 1500ms — 다시 센 간격(1000ms)이 지나 셋째 장으로 간다
    expect(track.scrollLeft).toBe(640)
  })
})
