import { useRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useCardExpand } from '@skills/card-expand/assets/useCardExpand'

const CARDS = [
  { id: 'janchi', title: '잔치국수' },
  { id: 'bibim', title: '비빔국수' },
]

/** expand/collapse는 전환 완료를 기다리는 async 함수다 — 잠금(busy)이 풀리는 마이크로태스크 한 틱을 흘려보낸다 */
const settle = () => act(async () => {})

/** 훅을 쓰는 최소 화면 — 목록 + 상세. jsdom에는 View Transitions가 없으므로 코어의 폴백(즉시 교체)으로 돈다 */
const Screen = ({ closeOnBack = false }: { closeOnBack?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLElement>(null)
  const { expandedId, expand, collapse } = useCardExpand({ containerRef, detailRef, closeOnBack })
  const current = CARDS.find((card) => card.id === expandedId)

  return (
    <div ref={containerRef} className="card-expand-container">
      <ul inert={expandedId !== null} data-testid="list">
        {CARDS.map((card) => (
          <li key={card.id}>
            <button type="button" data-card-id={card.id} onClick={(event) => expand({ id: card.id, card: event.currentTarget })}>
              <span data-card-expand-part="title">{card.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <article ref={detailRef} role="dialog" aria-label={current.title} className="card-expand-detail">
          <button type="button" className="card-expand-close" aria-label="닫기" onClick={collapse}>
            ×
          </button>
          <p>{current.title} 상세</p>
          <button type="button">주문하기</button>
        </article>
      )}
    </div>
  )
}

describe('useCardExpand — 카드를 누르면 상세가 열리고, Esc·닫기로 돌아온다', () => {
  it('카드를 누르면 상세가 열리고 목록은 inert가 되며, Esc로 닫힌다', async () => {
    render(<Screen />)

    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '잔치국수' }))

    expect(screen.getByRole('dialog', { name: '잔치국수' })).toBeInTheDocument()
    expect(screen.getByTestId('list')).toHaveAttribute('inert')
    await settle()

    fireEvent.keyDown(window, { key: 'Escape' })
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('list')).not.toHaveAttribute('inert')
  })

  it('닫기 버튼으로도 닫히고, 상세가 없을 때 Esc는 아무 일도 하지 않는다', async () => {
    render(<Screen />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '비빔국수' }))
    expect(screen.getByRole('dialog', { name: '비빔국수' })).toBeInTheDocument()
    await settle()

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

type StartViewTransition = (callback: () => void | Promise<void>) => { finished: Promise<void> }

describe('useCardExpand — 상태와 경계', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, 'startViewTransition')
    history.replaceState(null, '')
  })

  it('열리면 포커스가 닫기 버튼으로 가고, 닫히면 눌렀던 카드로 돌아온다', async () => {
    render(<Screen />)
    const card = screen.getByRole('button', { name: '비빔국수' })
    card.focus()
    fireEvent.click(card)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '닫기' }))
    await settle()
    fireEvent.keyDown(window, { key: 'Escape' })
    await settle()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '비빔국수' }))
  })

  it('Tab은 상세 안에서 돈다 — 마지막 요소에서 처음으로, Shift+Tab은 처음에서 마지막으로', async () => {
    render(<Screen />)
    fireEvent.click(screen.getByRole('button', { name: '잔치국수' }))
    await settle()
    const close = screen.getByRole('button', { name: '닫기' })
    const order = screen.getByRole('button', { name: '주문하기' })

    order.focus()
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    act(() => {
      order.dispatchEvent(forward)
    })
    expect(forward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)

    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    act(() => {
      close.dispatchEvent(backward)
    })
    expect(document.activeElement).toBe(order)
  })

  it('열리는 전환 중에 누른 Esc는 버리지 않고, 전환이 끝나면 닫는다', async () => {
    const finishers: Array<() => void> = []
    const start: StartViewTransition = (callback) => {
      void callback()
      return { finished: new Promise<void>((resolve) => finishers.push(resolve)) }
    }
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true, writable: true })
    render(<Screen />)
    fireEvent.click(screen.getByRole('button', { name: '잔치국수' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    // 아직 여는 중 — 닫히지 않았다
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => {
      finishers[0]()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => {
      finishers[1]?.()
      await Promise.resolve()
    })
  })

  it('전환 중의 연타(같은 카드를 두 번)는 전환을 두 번 시작하지 않는다', async () => {
    let started = 0
    const finishers: Array<() => void> = []
    const start: StartViewTransition = (callback) => {
      started += 1
      void callback()
      return { finished: new Promise<void>((resolve) => finishers.push(resolve)) }
    }
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true, writable: true })
    render(<Screen />)
    const card = screen.getByRole('button', { name: '잔치국수' })
    fireEvent.click(card)
    fireEvent.click(card)
    expect(started).toBe(1)
    await act(async () => {
      finishers[0]()
      await Promise.resolve()
    })
  })

  it('closeOnBack이면 열 때 history에 항목을 쌓고, 뒤로 가기(popstate)로 닫힌다', async () => {
    render(<Screen closeOnBack />)
    const lengthBefore = history.length
    fireEvent.click(screen.getByRole('button', { name: '잔치국수' }))
    await settle()
    expect(history.length).toBe(lengthBefore + 1)

    act(() => {
      history.replaceState(null, '')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('돌아갈 카드가 사라졌으면(목록 갱신) 포커스를 컨테이너로 옮겨 body로 떨어지지 않게 한다', async () => {
    render(<Screen />)
    fireEvent.click(screen.getByRole('button', { name: '잔치국수' }))
    await settle()
    document.querySelector('[data-card-id="janchi"]')!.removeAttribute('data-card-id')
    fireEvent.keyDown(window, { key: 'Escape' })
    await settle()
    expect(document.activeElement).toBe(document.querySelector('.card-expand-container'))
  })
})
