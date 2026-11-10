import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useTabIndicator } from '@skills/tab-indicator/assets/useTabIndicator'

const TabBar = ({ tabs, initial = 0, barKey }: { tabs: string[]; initial?: number; barKey?: string }) => {
  const [active, setActive] = useState(initial)
  const { registerTab, indicatorRef } = useTabIndicator({ activeIndex: active })
  return (
    <nav key={barKey} className="tab-bar" role="tablist">
      {tabs.map((label, index) => (
        <button key={label} ref={registerTab(index)} role="tab" aria-selected={index === active} onClick={() => setActive(index)}>
          {label}
        </button>
      ))}
      <span ref={indicatorRef} className="tab-indicator" aria-hidden="true" />
    </nav>
  )
}

const NOODLES = ['잔치국수', '비빔국수', '칼국수']

describe('useTabIndicator — 크기 감시와 늦게 오는 탭', () => {
  // ResizeObserver는 observe() 직후 한 번 콜백을 부른다. 그 콜백이 transition: none으로 즉시 배치하면
  // 탭을 눌러도 밑줄이 미끄러지지 않고 건너뛴다(브라우저에서 transitioncancel로 확인)
  let observers: Array<{ callback: ResizeObserverCallback; observed: Element[] }> = []
  let tabWidth = 100

  beforeEach(() => {
    observers = []
    tabWidth = 100
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private record: { callback: ResizeObserverCallback; observed: Element[] }
        constructor(callback: ResizeObserverCallback) {
          this.record = { callback, observed: [] }
          observers.push(this.record)
        }
        observe(el: Element) {
          this.record.observed.push(el)
        }
        unobserve() {}
        disconnect() {}
      },
    )
    // jsdom은 배치를 계산하지 않으므로 탭 위치를 순서 × 폭으로 준다
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function offsetLeft(this: HTMLElement) {
      return this.getAttribute('role') === 'tab' ? [...(this.parentElement?.children ?? [])].indexOf(this) * tabWidth : 0
    })
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => tabWidth)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const notifyLatest = () => act(() => observers.at(-1)?.callback([], {} as ResizeObserver))
  const indicatorOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.tab-indicator')!

  it('처음에는 선택된 탭 자리에 슬라이드 없이 놓인다', () => {
    const { container } = render(<TabBar tabs={NOODLES} initial={2} />)
    const indicator = indicatorOf(container)
    expect(indicator.style.transform).toBe('translateX(200px) scaleX(100)')
    expect(indicator.style.transition).toBe('none')
    vi.advanceTimersByTime(50)
    expect(indicator.style.transition).toBe('')
  })

  it('탭을 누른 뒤 첫 크기 알림이 와도 밑줄의 transition을 끄지 않는다', () => {
    const { container } = render(<TabBar tabs={NOODLES} />)
    const indicator = indicatorOf(container)
    notifyLatest()
    vi.advanceTimersByTime(50)
    fireEvent.click(screen.getByRole('tab', { name: '칼국수' }))
    expect(indicator.style.transform).toBe('translateX(200px) scaleX(100)')
    notifyLatest()
    expect(indicator.style.transition).toBe('')
  })

  it('탭 폭이 바뀌면 크기 알림이 밑줄을 즉시 다시 맞춘다', () => {
    const { container } = render(<TabBar tabs={NOODLES} />)
    const indicator = indicatorOf(container)
    vi.advanceTimersByTime(50)
    fireEvent.click(screen.getByRole('tab', { name: '칼국수' }))
    tabWidth = 120
    notifyLatest()
    expect(indicator.style.transition).toBe('none')
    expect(indicator.style.transform).toBe('translateX(240px) scaleX(120)')
  })

  it('선택된 탭만이 아니라 탭 줄과 모든 탭의 크기를 본다 (앞 탭의 글자가 바뀌면 선택된 탭이 밀린다)', () => {
    const { container } = render(<TabBar tabs={NOODLES} />)
    const observed = observers.at(-1)!.observed
    expect(observed).toContain(container.querySelector('.tab-bar'))
    screen.getAllByRole('tab').forEach((tab) => expect(observed).toContain(tab))
  })

  it('탭이 나중에 그려져도(목록을 늦게 받은 경우) 그때 밑줄이 슬라이드 없이 놓인다', () => {
    const { container, rerender } = render(<TabBar tabs={[]} initial={1} />)
    const indicator = indicatorOf(container)
    expect(indicator.style.transform).toBe('')
    rerender(<TabBar tabs={NOODLES} initial={1} />)
    expect(indicator.style.transform).toBe('translateX(100px) scaleX(100)')
    expect(indicator.style.transition).toBe('none')
  })

  it('탭 줄을 새로 그리면(key 변경) 새 밑줄도 슬라이드 없이 놓인다', () => {
    const { container, rerender } = render(<TabBar tabs={NOODLES} initial={2} barKey="ltr" />)
    vi.advanceTimersByTime(50)
    rerender(<TabBar tabs={NOODLES} initial={2} barKey="rtl" />)
    const indicator = indicatorOf(container)
    expect(indicator.style.transform).toBe('translateX(200px) scaleX(100)')
    expect(indicator.style.transition).toBe('none')
  })

  it('focusTab(index)가 그 탭으로 포커스를 옮긴다 (방향키 이동용)', () => {
    const Bar = () => {
      const { registerTab, indicatorRef, focusTab } = useTabIndicator({ activeIndex: 0 })
      return (
        <nav className="tab-bar" role="tablist">
          {NOODLES.map((label, index) => (
            <button key={label} ref={registerTab(index)} role="tab" onKeyDown={() => focusTab(2)}>
              {label}
            </button>
          ))}
          <span ref={indicatorRef} className="tab-indicator" />
        </nav>
      )
    }
    render(<Bar />)
    fireEvent.keyDown(screen.getByRole('tab', { name: '잔치국수' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: '칼국수' })).toHaveFocus()
  })
})
