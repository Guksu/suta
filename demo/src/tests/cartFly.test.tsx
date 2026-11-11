import { render, screen, fireEvent } from '@testing-library/react'
import { useCartFly } from '@skills/cart-fly/assets/useCartFly'

const rect = ({ el, top, left }: { el: HTMLElement; top: number; left: number }) => {
  el.getBoundingClientRect = () =>
    ({ top, left, width: 40, height: 40, right: left + 40, bottom: top + 40, x: left, y: top, toJSON: () => ({}) }) as DOMRect
}

const Shop = ({ withCart, onArrive }: { withCart: boolean; onArrive: () => void }) => {
  const { targetRef, flyFrom } = useCartFly<HTMLButtonElement>()
  return (
    <>
      {withCart && (
        <button
          ref={(el) => {
            targetRef.current = el
            if (el) rect({ el, top: 0, left: 300 })
          }}
          type="button"
        >
          cart
        </button>
      )}
      <button
        type="button"
        onClick={(event) => {
          rect({ el: event.currentTarget, top: 400, left: 20 })
          flyFrom({ source: event.currentTarget, onArrive })
        }}
      >
        add
      </button>
    </>
  )
}

describe('useCartFly — React 훅', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    document.querySelectorAll('.fly-ghost').forEach((ghost) => ghost.remove())
  })

  it('장바구니 버튼이 화면에 없어도(targetRef가 비어 있다) 담은 결과는 잃지 않는다 — 바로 onArrive', () => {
    const onArrive = vi.fn()
    render(<Shop withCart={false} onArrive={onArrive} />)
    fireEvent.click(screen.getByText('add'))
    expect(onArrive).toHaveBeenCalledTimes(1)
  })

  it('나는 도중에 화면을 떠나면(언마운트) 고스트를 걷고 onArrive를 부르지 않는다', () => {
    const onArrive = vi.fn()
    const view = render(<Shop withCart onArrive={onArrive} />)
    fireEvent.click(screen.getByText('add'))
    expect(document.querySelectorAll('.fly-ghost')).toHaveLength(1)
    view.unmount()
    expect(document.querySelectorAll('.fly-ghost')).toHaveLength(0)
    vi.advanceTimersByTime(2000)
    expect(onArrive).not.toHaveBeenCalled()
  })

  it('동작 줄이기면 고스트 없이 바로 onArrive를 한 번 부른다', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    const onArrive = vi.fn()
    render(<Shop withCart onArrive={onArrive} />)
    fireEvent.click(screen.getByText('add'))
    vi.unstubAllGlobals()
    expect(onArrive).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('.fly-ghost')).toHaveLength(0)
  })
})
