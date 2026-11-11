import { act, fireEvent, render, screen } from '@testing-library/react'
import { useVirtualList } from '@skills/virtual-list/assets/useVirtualList'

// jsdom은 레이아웃이 없다 — 스크롤 상자의 보이는 높이를 280px(행 5개)로 흉내 낸다
const VIEWPORT = 280
const ITEM = 56

const seen: Array<{ count: number; indexes: number[] }> = []

const List = ({ count }: { count: number }) => {
  const list = useVirtualList({ itemCount: count, itemHeight: ITEM, overscan: 1, maxLead: 0 })
  seen.push({ count, indexes: list.indexes })
  return (
    <div ref={list.containerRef} data-testid="viewport">
      <div data-testid="sizer" style={{ height: list.range.totalHeight }}>
        {list.indexes.map((index) => (
          <div key={index} role="listitem">
            {index}
          </div>
        ))}
      </div>
    </div>
  )
}

describe('useVirtualList — 항목 수가 바뀔 때', () => {
  let clientHeight: PropertyDescriptor | undefined

  beforeEach(() => {
    seen.length = 0
    clientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => VIEWPORT })
  })
  afterEach(() => {
    if (clientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', clientHeight)
  })

  const rows = () => screen.queryAllByRole('listitem').map((el) => Number(el.textContent))

  it('깊이 스크롤한 채로 항목이 줄어도(필터·삭제) 없는 항목을 그리려 하지 않는다', () => {
    const view = render(<List count={1000} />)
    const viewport = screen.getByTestId('viewport')
    act(() => {
      viewport.scrollTop = 900 * ITEM
      fireEvent.scroll(viewport)
    })
    expect(rows()[0]).toBe(899)

    // 브라우저는 내용이 짧아지면 scrollTop을 끝으로 당긴다 — jsdom에서는 손으로 맞춘다
    viewport.scrollTop = 0
    view.rerender(<List count={4} />)

    // 줄어든 뒤의 모든 렌더에서 인덱스는 0~3 안이다(첫 렌더 포함 — 옛 구간이 남아 있으면 orders[900]을 읽는다)
    const after = seen.filter((entry) => entry.count === 4)
    expect(after.length).toBeGreaterThan(0)
    after.forEach((entry) => entry.indexes.forEach((index) => expect(index).toBeLessThan(4)))
    expect(rows()).toEqual([0, 1, 2, 3])
    expect(screen.getByTestId('sizer').style.height).toBe(`${4 * ITEM}px`)
  })

  it('항목 수가 바뀐 바로 그 렌더에서 전체 높이도 새 개수로 나온다', () => {
    const view = render(<List count={10} />)
    view.rerender(<List count={0} />)
    const first = seen.find((entry) => entry.count === 0)
    expect(first?.indexes).toEqual([])
    expect(screen.getByTestId('sizer').style.height).toBe('0px')
  })

  it('1개면 그 하나만 그린다', () => {
    render(<List count={1} />)
    expect(rows()).toEqual([0])
  })
})
