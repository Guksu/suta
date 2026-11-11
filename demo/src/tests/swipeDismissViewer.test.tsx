import { fireEvent, render, screen } from '@testing-library/react'
import { SwipeDismissViewer } from '@skills/swipe-dismiss-viewer/assets/SwipeDismissViewer'

describe('SwipeDismissViewer — 포커스와 Esc', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('열리면 닫기 버튼으로 포커스가 가고, 닫히면 열었던 요소로 돌아간다', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = render(<SwipeDismissViewer src="a.jpg" alt="들깨칼국수" onClose={() => {}} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '닫기' }))
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('Tab은 뷰어 밖으로 나가지 않는다', () => {
    render(<SwipeDismissViewer src="a.jpg" alt="들깨칼국수" onClose={() => {}} />)
    const close = screen.getByRole('button', { name: '닫기' })
    const notPrevented = fireEvent.keyDown(close, { key: 'Tab' })
    expect(notPrevented).toBe(false)
    expect(document.activeElement).toBe(close)
  })

  it('Esc로 닫히고, 안쪽 요소가 이미 쓴 Esc(defaultPrevented)로는 닫히지 않는다', () => {
    const onClose = vi.fn()
    render(<SwipeDismissViewer src="a.jpg" alt="들깨칼국수" onClose={onClose} />)
    const used = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    used.preventDefault()
    window.dispatchEvent(used)
    vi.advanceTimersByTime(3000)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    vi.advanceTimersByTime(3000)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
