import { useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Modal } from '@skills/modal-dialog/assets/Modal'

// jsdom은 showModal/close를 구현하지 않는다 — open 속성만 흉내 낸다
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
})
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open')
})

const Harness = ({
  onClose = () => {},
  dismissOnBackdrop,
  refuseClose = false,
  closeOnBack,
}: {
  onClose?: () => void
  dismissOnBackdrop?: boolean
  /** 닫기 요청을 받아도 open을 내리지 않는다 — "저장 중에는 닫지 않는다" 같은 부모 */
  refuseClose?: boolean
  closeOnBack?: boolean
}) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        열기
      </button>
      <Modal
        open={open}
        onClose={() => {
          if (!refuseClose) setOpen(false)
          onClose()
        }}
        labelledBy="title"
        dismissOnBackdrop={dismissOnBackdrop}
        closeOnBack={closeOnBack}
      >
        <h2 id="title">주문을 취소할까요?</h2>
        <button type="button">돌아가기</button>
      </Modal>
    </>
  )
}

const dialogEl = () => document.querySelector('dialog')!

describe('Modal — 네이티브 dialog 기반 열림·닫힘 지연·Esc·백드롭', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = showModal
    HTMLDialogElement.prototype.close = close
  })
  beforeEach(() => {
    showModal.mockClear()
    close.mockClear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('open이 true가 되면 showModal()로 연다 (show()가 아니다)', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('열기'))
    expect(showModal).toHaveBeenCalledTimes(1)
    expect(dialogEl()).toHaveAttribute('open')
    expect(dialogEl()).toHaveAttribute('aria-labelledby', 'title')
  })

  it('닫을 때 data-closing을 먼저 붙이고, animationend 뒤에야 close()한다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('열기'))
    act(() => {
      dialogEl().dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(dialogEl()).toHaveAttribute('data-closing')
    expect(close).not.toHaveBeenCalled()
    fireEvent.animationEnd(dialogEl())
    expect(close).toHaveBeenCalledTimes(1)
    expect(dialogEl()).not.toHaveAttribute('data-closing')
  })

  it('animationend가 오지 않아도 폴백 타이머로 닫힌다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('열기'))
    act(() => {
      dialogEl().dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('Esc(cancel 이벤트)는 기본 닫힘을 막고 onClose로 위임한다', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByText('열기'))
    const cancel = new Event('cancel', { cancelable: true })
    act(() => {
      dialogEl().dispatchEvent(cancel)
    })
    expect(cancel.defaultPrevented).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('백드롭 클릭(target이 dialog 자신)만 닫고, 패널 안쪽 클릭은 닫지 않는다', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByText('열기'))
    fireEvent.click(screen.getByText('돌아가기'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(dialogEl())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dismissOnBackdrop=false면 백드롭 클릭을 무시한다', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} dismissOnBackdrop={false} />)
    fireEvent.click(screen.getByText('열기'))
    fireEvent.click(dialogEl())
    expect(onClose).not.toHaveBeenCalled()
  })

  /** 브라우저가 스스로 닫는 상황을 흉내 낸다 — open 속성이 사라지고 close 이벤트가 온다 */
  const closeNatively = () => {
    act(() => {
      dialogEl().removeAttribute('open')
      dialogEl().dispatchEvent(new Event('close'))
    })
  }

  it('브라우저가 스스로 닫으면(막을 수 없는 두 번째 Esc, <form method="dialog">) onClose로 알린다 — open 상태가 어긋나지 않는다', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByText('열기'))

    closeNatively()
    expect(onClose).toHaveBeenCalledTimes(1)

    // 부모의 open이 내려갔으므로 다시 열 수 있다
    fireEvent.click(screen.getByText('열기'))
    expect(showModal).toHaveBeenCalledTimes(2)
  })

  it('부모가 닫기를 거부하면(open을 그대로 두면) 다시 연다 — open이 true인데 창이 없는 상태로 남지 않는다', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} refuseClose />)
    fireEvent.click(screen.getByText('열기'))

    closeNatively()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(showModal).toHaveBeenCalledTimes(2)
    expect(dialogEl()).toHaveAttribute('open')
  })

  it('우리가 닫아서 온 close 이벤트에는 onClose를 다시 부르지 않는다', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByText('열기'))
    fireEvent.click(dialogEl()) // 백드롭 → onClose 1회 → 닫힘 애니메이션
    fireEvent.animationEnd(dialogEl())
    act(() => {
      dialogEl().dispatchEvent(new Event('close'))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closeOnBack을 켜면 열려 있는 동안 history에 항목을 쌓고, 뒤로 가기가 모달을 닫는다', async () => {
    vi.useRealTimers()
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
    expect(dialogEl()).toHaveAttribute('data-closing')
  })
})
