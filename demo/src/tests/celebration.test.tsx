import { fireEvent, render, screen } from '@testing-library/react'
import { Celebration } from '@skills/celebration/assets/Celebration'

// jsdom은 showModal/close를 구현하지 않는다 — open 속성만 흉내 낸다
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
})
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open')
})

const mockReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const dialogEl = () => document.querySelector('dialog')!

describe('Celebration — 지금 화면 위에 한 번 뜨는 축하', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = showModal
    HTMLDialogElement.prototype.close = close
  })
  beforeEach(() => {
    showModal.mockClear()
    close.mockClear()
    mockReducedMotion(false)
  })

  it('열리면 showModal()로 띄우고, 제목이 대화상자 이름·보상과 설명이 설명이 된다', () => {
    render(<Celebration open onClose={() => {}} title="오늘 목표 달성!" reward="+100P" description="8,000걸음을 걸었어요" />)
    expect(showModal).toHaveBeenCalledTimes(1)
    const dialog = dialogEl()
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('오늘 목표 달성!')
    const described = document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent ?? ''
    expect(described).toContain('+100P')
    expect(described).toContain('8,000걸음을 걸었어요')
  })

  it('버튼은 하나이고 열리면 그 버튼에 포커스가 간다 — 기본 이름은 확인, 누르면 onAction(없으면 onClose)', () => {
    const onClose = vi.fn()
    const onAction = vi.fn()
    const view = render(<Celebration open onClose={onClose} title="배지를 얻었어요" />)
    const button = screen.getByRole('button', { name: '확인' })
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)
    expect(onClose).toHaveBeenCalledTimes(1)
    view.rerender(<Celebration open onClose={onClose} onAction={onAction} actionLabel="쿠폰 받기" title="배지를 얻었어요" />)
    fireEvent.click(screen.getByRole('button', { name: '쿠폰 받기' }))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Esc(cancel)는 브라우저가 바로 닫지 않게 막고 onClose를 부른다', () => {
    const onClose = vi.fn()
    render(<Celebration open onClose={onClose} title="레벨 업" />)
    const event = new Event('cancel', { cancelable: true })
    dialogEl().dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('조각은 열릴 때 그린다(장식이라 낭독하지 않는다) — 동작 줄이기면 날아가지 않고 제자리에 놓인다', () => {
    const view = render(<Celebration open onClose={() => {}} title="레벨 업" pieces={12} />)
    expect(document.querySelectorAll('.celebration-piece')).toHaveLength(12)
    const burst = document.querySelector('.celebration-burst')
    expect(burst?.getAttribute('aria-hidden')).toBe('true')
    expect(burst?.getAttribute('data-motion')).toBe('burst')
    view.unmount()
    mockReducedMotion(true)
    render(<Celebration open onClose={() => {}} title="레벨 업" pieces={12} />)
    expect(document.querySelectorAll('.celebration-piece')).toHaveLength(12)
    expect(document.querySelector('.celebration-burst')?.getAttribute('data-motion')).toBe('still')
  })

  it('닫혀 있으면 조각을 그리지 않는다 — 다시 열면 새로 붙어 한 번 더 터진다', () => {
    render(<Celebration open={false} onClose={() => {}} title="레벨 업" pieces={12} />)
    expect(document.querySelectorAll('.celebration-piece')).toHaveLength(0)
  })
  it('닫히는 중(닫힘 애니메이션 240ms)에는 버튼·Esc·바깥 누름을 받지 않는다 — 연타로 보상이 두 번 처리되지 않게', () => {
    const onClose = vi.fn()
    const onAction = vi.fn()
    const view = render(<Celebration open onClose={onClose} onAction={onAction} title="배지를 얻었어요" />)
    view.rerender(<Celebration open={false} onClose={onClose} onAction={onAction} title="배지를 얻었어요" />)
    const dialog = dialogEl()
    expect(dialog).toHaveAttribute('data-closing')
    fireEvent.click(screen.getByRole('button', { name: '확인', hidden: true }))
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog)
    expect(onAction).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('닫히는 중에 다시 열면 닫힘을 취소하고 그대로 열려 있다', () => {
    const view = render(<Celebration open onClose={() => {}} title="배지를 얻었어요" />)
    view.rerender(<Celebration open={false} onClose={() => {}} title="배지를 얻었어요" />)
    view.rerender(<Celebration open onClose={() => {}} title="배지를 얻었어요" />)
    expect(dialogEl()).not.toHaveAttribute('data-closing')
    expect(dialogEl()).toHaveAttribute('open')
    expect(close).not.toHaveBeenCalled()
  })
})
