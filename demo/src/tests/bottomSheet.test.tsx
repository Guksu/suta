import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { BottomSheet } from '@skills/bottom-sheet/assets/BottomSheet'

const Harness = ({
  onClose,
  snaps,
  nested = false,
  closeOnBack,
}: {
  onClose?: () => void
  snaps?: boolean
  nested?: boolean
  closeOnBack?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const [innerOpen, setInnerOpen] = useState(false)
  const [count, setCount] = useState(0)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        열기
      </button>
      <BottomSheet
        open={open}
        onClose={() => {
          setOpen(false)
          onClose?.()
        }}
        label="주문 옵션"
        // 인라인 배열 — 렌더마다 새 배열이 넘어간다
        snapOffsetsPx={snaps ? [0, 240] : undefined}
        closeOnBack={closeOnBack}
      >
        <button type="button" onClick={() => setCount((n) => n + 1)}>
          곱빼기 {count}
        </button>
        <button type="button" onClick={() => setInnerOpen(true)}>
          포장
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          담기
        </button>
      </BottomSheet>
      {nested && (
        <BottomSheet open={innerOpen} onClose={() => setInnerOpen(false)} label="포장 옵션">
          <button type="button">국물 따로</button>
        </BottomSheet>
      )}
    </>
  )
}

// 닫힌 시트는 aria-hidden이라 역할·이름으로는 찾을 수 없다 — 속성으로 찾는다
const sheet = (name = '주문 옵션') => document.querySelector<HTMLElement>(`[role="dialog"][aria-label="${name}"]`)!

describe('BottomSheet — 포커스·Esc·스크롤 잠금', () => {
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  it('열리면 포커스가 시트로 들어가고, 닫히면 열었던 버튼으로 돌아온다', () => {
    render(<Harness />)
    const opener = screen.getByText('열기')
    opener.focus()
    fireEvent.click(opener)
    expect(document.activeElement).toBe(sheet())

    fireEvent.click(screen.getByText('담기'))
    expect(document.activeElement).toBe(opener)
  })

  it('Tab은 시트 안에서만 돈다 — 마지막에서 처음으로, Shift+Tab은 처음에서 마지막으로', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('열기'))

    screen.getByText('담기').focus()
    expect(fireEvent.keyDown(document.activeElement!, { key: 'Tab' })).toBe(false)
    expect(document.activeElement).toBe(screen.getByText(/곱빼기/))

    expect(fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true })).toBe(false)
    expect(document.activeElement).toBe(screen.getByText('담기'))

    // 가운데 항목에서는 브라우저의 Tab 이동에 맡긴다
    screen.getByText('포장').focus()
    expect(fireEvent.keyDown(document.activeElement!, { key: 'Tab' })).toBe(true)
  })

  it('Escape로 닫기를 요청한다. 안쪽 요소가 이미 쓴 Escape(defaultPrevented)는 무시한다', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByText('열기'))

    const used = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    used.preventDefault()
    act(() => {
      screen.getByText('포장').dispatchEvent(used)
    })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByText('포장'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('시트 위에 시트가 열려 있으면 Escape는 위의 것만 닫는다', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} nested />)
    fireEvent.click(screen.getByText('열기'))
    screen.getByText('포장').focus() // 실제 브라우저에서는 누르는 순간 버튼이 포커스를 받는다
    fireEvent.click(screen.getByText('포장'))
    expect(sheet('포장 옵션')).toHaveAttribute('data-open', 'true')

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(sheet('포장 옵션')).toHaveAttribute('data-open', 'false')
    expect(onClose).not.toHaveBeenCalled()
    // 위 시트가 닫히면 포커스는 그것을 연 버튼(아래 시트 안)으로 돌아온다
    expect(document.activeElement).toBe(screen.getByText('포장'))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('열린 동안 body 스크롤을 잠그고, 스크롤바가 사라져 넓어진 만큼 padding으로 채운다 — 닫히면 둘 다 되돌린다', () => {
    // 스크롤바 15px: 잠그기 전 985, 잠근 뒤 1000
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      get: () => (document.body.style.overflow === 'hidden' ? 1000 : 985),
    })
    try {
      render(<Harness />)
      fireEvent.click(screen.getByText('열기'))
      expect(document.body.style.overflow).toBe('hidden')
      expect(document.body.style.paddingRight).toBe('15px')

      fireEvent.click(screen.getByText('담기'))
      expect(document.body.style.overflow).toBe('')
      expect(document.body.style.paddingRight).toBe('')
    } finally {
      // @ts-expect-error 테스트가 덮어쓴 값을 걷는다
      delete document.documentElement.clientWidth
    }
  })

  it('snapOffsetsPx를 인라인 배열로 넘겨도, 다시 그려질 때 끌어 올린 위치가 처음 스냅으로 되돌아가지 않는다', () => {
    render(<Harness snaps />)
    fireEvent.click(screen.getByText('열기'))
    expect(sheet().style.transform).toBe('translateY(240px)')

    sheet().style.transform = 'translateY(0px)' // 사용자가 전체 열림까지 끌어 올렸다
    fireEvent.click(screen.getByText(/곱빼기/)) // 시트 안에서 상태가 바뀌어 부모가 다시 그려진다
    expect(sheet().style.transform).toBe('translateY(0px)')
  })

  it('closeOnBack을 켜면 뒤로 가기가 페이지를 떠나지 않고 시트를 닫는다', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} closeOnBack />)
    const before = history.length
    fireEvent.click(screen.getByText('열기'))
    expect(history.length).toBe(before + 1)

    await act(async () => {
      history.back()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(sheet()).toHaveAttribute('data-open', 'false')
  })
})
