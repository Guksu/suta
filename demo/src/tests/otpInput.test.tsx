import { createRef } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { OtpInput, type OtpHandle } from '@skills/otp-input/assets/OtpInput'

const cellsOf = () => screen.getAllByRole('textbox') as HTMLInputElement[]

describe('OtpInput — React 래퍼의 배선', () => {
  it('칸의 maxlength는 1이 아니라 칸 수다 — 1이면 브라우저가 자동 입력의 여러 글자를 첫 글자만 남기고 자른다', () => {
    render(<OtpInput length={4} onComplete={() => {}} autoFocus={false} />)
    cellsOf().forEach((cell) => expect(cell).toHaveAttribute('maxlength', '4'))
  })

  it('첫 칸에 코드 전체가 들어오면 칸마다 나뉘고 onComplete가 한 번 불린다', () => {
    const onComplete = vi.fn()
    render(<OtpInput onComplete={onComplete} autoFocus={false} />)
    fireEvent.input(cellsOf()[0], { target: { value: '482913' } })

    expect(cellsOf().map((cell) => cell.value).join('')).toBe('482913')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('482913')
  })

  it('invalid를 주면 모든 칸에 aria-invalid가 켜지고, 빼면 꺼진다', () => {
    const { rerender } = render(<OtpInput onComplete={() => {}} autoFocus={false} invalid />)
    cellsOf().forEach((cell) => expect(cell).toHaveAttribute('aria-invalid', 'true'))
    rerender(<OtpInput onComplete={() => {}} autoFocus={false} />)
    cellsOf().forEach((cell) => expect(cell).not.toHaveAttribute('aria-invalid'))
  })

  it('ref의 clear()는 전부 비우고 첫 칸으로 포커스를 돌린다 — 채워진 칸 표시도 함께 꺼진다', () => {
    const ref = createRef<OtpHandle>()
    render(<OtpInput ref={ref} onComplete={() => {}} autoFocus={false} />)
    fireEvent.input(cellsOf()[0], { target: { value: '48' } })
    expect(cellsOf()[1]).toHaveAttribute('data-filled', 'true')

    act(() => ref.current?.clear())
    expect(ref.current?.value()).toBe('')
    expect(document.activeElement).toBe(cellsOf()[0])
    cellsOf().forEach((cell) => expect(cell).toHaveAttribute('data-filled', 'false'))
  })
})
