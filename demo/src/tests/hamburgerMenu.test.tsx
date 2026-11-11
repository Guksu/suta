import { useState } from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { HamburgerButton, Drawer } from '@skills/hamburger-menu/assets/HamburgerMenu'

const Harness = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <HamburgerButton open={open} onToggle={() => setOpen((prev) => !prev)} label="메뉴 열기" />
      <Drawer open={open} onClose={() => setOpen(false)}>
        <a href="#menu">면 메뉴</a>
      </Drawer>
    </>
  )
}

describe('HamburgerButton + Drawer — 토글·Esc·백드롭·스크롤 잠금', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('버튼 토글이 aria-expanded와 드로어 data-open을 함께 바꾼다', () => {
    render(<Harness />)
    const button = screen.getByRole('button', { name: '메뉴 열기' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog')).toHaveAttribute('data-open', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('Escape로 닫힌다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('백드롭 클릭으로 닫힌다', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    fireEvent.click(container.querySelector('.drawer-backdrop')!)
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('열려 있는 동안 body 스크롤이 잠기고 닫으면 풀린다', () => {
    render(<Harness />)
    const button = screen.getByRole('button', { name: '메뉴 열기' })
    fireEvent.click(button)
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(button)
    expect(document.body.style.overflow).toBe('')
  })
})

const FocusHarness = ({ closeAboveWidth, closeOnBack }: { closeAboveWidth?: number; closeOnBack?: boolean }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <HamburgerButton open={open} onToggle={() => setOpen((prev) => !prev)} label="메뉴 열기" />
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        label="전체 메뉴"
        closeAboveWidth={closeAboveWidth}
        closeOnBack={closeOnBack}
      >
        <a href="#intro">소개</a>
        <input
          aria-label="메뉴 검색"
          onKeyDown={(event) => {
            // 안쪽 자동완성이 Escape를 먼저 쓰는 상황
            if (event.key === 'Escape') event.preventDefault()
          }}
        />
        <a href="#location">매장 안내</a>
      </Drawer>
    </>
  )
}

describe('Drawer — 포커스·이름·넓은 화면·뒤로 가기', () => {
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    vi.unstubAllGlobals()
  })

  it('label이 대화상자 이름이 된다', () => {
    render(<FocusHarness />)
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    expect(screen.getByRole('dialog', { name: '전체 메뉴' })).toBeInTheDocument()
  })

  it('열리면 포커스가 드로어로 가고, 닫히면 연 버튼으로 돌아온다', () => {
    render(<FocusHarness />)
    const button = screen.getByRole('button', { name: '메뉴 열기' })
    button.focus()
    fireEvent.click(button)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(button)
  })

  it('Tab은 드로어 안에서만 돈다', () => {
    render(<FocusHarness />)
    const button = screen.getByRole('button', { name: '메뉴 열기' })
    button.focus()
    fireEvent.click(button)
    const first = screen.getByRole('link', { name: '소개' })
    const last = screen.getByRole('link', { name: '매장 안내' })

    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    // 드로어 자신(열린 직후)에서 Shift+Tab — 밖의 버튼이 아니라 마지막 링크로
    screen.getByRole('dialog').focus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('안쪽 요소가 이미 쓴 Escape로는 닫지 않는다', () => {
    render(<FocusHarness />)
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    const input = screen.getByRole('textbox', { name: '메뉴 검색' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toHaveAttribute('data-open', 'true')
  })

  it('드로어 위에 뜬 다른 창(모달)에 포커스가 있을 때의 Escape는 그 창의 몫이다 — 드로어는 닫지 않는다', () => {
    render(<FocusHarness />)
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    const modalButton = document.createElement('button')
    document.body.append(modalButton)
    modalButton.focus()
    fireEvent.keyDown(modalButton, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toHaveAttribute('data-open', 'true')
    modalButton.remove()
  })

  it('closeAboveWidth — 열린 채 화면이 그 폭 이상으로 넓어지면 닫는다', () => {
    let notify: ((event: { matches: boolean }) => void) | undefined
    const removeEventListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
          notify = listener
        },
        removeEventListener,
      })),
    )
    render(<FocusHarness closeAboveWidth={768} />)
    const button = screen.getByRole('button', { name: '메뉴 열기' })
    fireEvent.click(button)
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)')
    act(() => notify?.({ matches: true }))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.body.style.overflow).toBe('')
    expect(removeEventListener).toHaveBeenCalled()
  })

  it('closeAboveWidth — 이미 넓은 화면에서 열려 있으면 바로 닫는다', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    )
    render(<FocusHarness closeAboveWidth={768} />)
    const button = screen.getByRole('button', { name: '메뉴 열기' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('closeOnBack — 뒤로 가기(popstate)가 드로어만 닫는다', () => {
    render(<FocusHarness closeOnBack />)
    const button = screen.getByRole('button', { name: '메뉴 열기' })
    const lengthBefore = history.length
    fireEvent.click(button)
    expect(history.length).toBe(lengthBefore + 1)
    // 뒤로 가기가 우리 항목을 걷은 상황 — state에서 표식이 사라진 채 popstate가 온다
    history.replaceState(null, '')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})
