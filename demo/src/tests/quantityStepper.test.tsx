import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { QuantityStepper } from '@skills/quantity-stepper/assets/QuantityStepper'

const Harness = ({
  initial = 1,
  min,
  max,
  step,
  disabled,
  onBelowMin,
  onChange,
}: {
  initial?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  onBelowMin?: () => void
  onChange?: (v: number) => void
}) => {
  const [value, setValue] = useState(initial)
  return (
    <QuantityStepper
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      label="멸치국수 수량"
      onBelowMin={onBelowMin}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('QuantityStepper — 수량 조절과 경계', () => {
  const plus = () => screen.getByRole('button', { name: '멸치국수 수량 늘리기' })
  const minus = () => screen.queryByRole('button', { name: '멸치국수 수량 줄이기' })
  const field = () => screen.getByRole('textbox', { name: '멸치국수 수량' })

  it('+를 누르면 늘고 −를 누르면 준다', () => {
    render(<Harness initial={2} />)

    fireEvent.pointerDown(plus())
    fireEvent.pointerUp(plus())
    expect(field()).toHaveValue('3')

    fireEvent.pointerDown(minus()!)
    fireEvent.pointerUp(minus()!)
    expect(field()).toHaveValue('2')
  })

  it('최댓값에서는 더 늘지 않고 버튼이 끝임을 알린다', () => {
    render(<Harness initial={5} max={5} />)

    expect(plus()).toHaveAttribute('aria-disabled', 'true')
    fireEvent.pointerDown(plus())
    expect(field()).toHaveValue('5')
  })

  it('최솟값에서는 더 줄지 않는다', () => {
    render(<Harness initial={1} min={1} />)

    expect(minus()).toHaveAttribute('aria-disabled', 'true')
    fireEvent.pointerDown(minus()!)
    expect(field()).toHaveValue('1')
  })

  it('onBelowMin을 주면 최솟값에서 −가 삭제로 바뀐다 (장바구니 관례)', () => {
    const onBelowMin = vi.fn()
    render(<Harness initial={1} min={1} onBelowMin={onBelowMin} />)

    const remove = screen.getByRole('button', { name: '멸치국수 수량 삭제' })
    expect(remove).not.toHaveAttribute('aria-disabled')

    fireEvent.pointerDown(remove)
    expect(onBelowMin).toHaveBeenCalledTimes(1)
    expect(field()).toHaveValue('1')
  })

  it('누르고 있으면 반복해서 올라가고, 떼면 멈춘다', () => {
    vi.useFakeTimers()
    render(<Harness initial={1} max={99} />)

    fireEvent.pointerDown(plus())
    expect(field()).toHaveValue('2') // 첫 실행은 누르는 즉시

    act(() => {
      vi.advanceTimersByTime(400) // 지연 뒤 첫 반복
      vi.advanceTimersByTime(500) // 그 뒤로 몇 번 더
    })
    const held = Number((field() as HTMLInputElement).value)
    expect(held).toBeGreaterThan(3)

    fireEvent.pointerUp(plus())
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(field()).toHaveValue(String(held))
    vi.useRealTimers()
  })

  it('손가락이 버튼 밖으로 나가도 멈춘다', () => {
    vi.useFakeTimers()
    render(<Harness initial={1} />)

    fireEvent.pointerDown(plus())
    fireEvent.pointerLeave(plus())
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(field()).toHaveValue('2')
    vi.useRealTimers()
  })

  it('숫자를 직접 입력하면 눈금과 범위에 맞춰 정리된다', () => {
    render(<Harness initial={1} min={1} max={20} step={2} />)

    fireEvent.change(field(), { target: { value: '15' } })
    fireEvent.blur(field())
    expect(field()).toHaveValue('15') // 1에서 2씩 → 15는 눈금 위

    fireEvent.change(field(), { target: { value: '999' } })
    fireEvent.blur(field())
    expect(field()).toHaveValue('19') // 최댓값 20 아래의 눈금
  })

  it('알아볼 수 없는 입력은 원래 값으로 되돌린다', () => {
    render(<Harness initial={3} />)

    fireEvent.change(field(), { target: { value: '곱빼기' } })
    fireEvent.blur(field())
    expect(field()).toHaveValue('3')
  })

  it('입력 칸에서 방향키로도 조절된다', () => {
    render(<Harness initial={3} />)

    fireEvent.keyDown(field(), { key: 'ArrowUp' })
    expect(field()).toHaveValue('4')

    fireEvent.keyDown(field(), { key: 'ArrowDown' })
    expect(field()).toHaveValue('3')
  })

  it('키보드(Enter·Space)나 화면 낭독기로 버튼을 누르면 한 칸 바뀐다 — pointerdown 없이 click만 온다', () => {
    render(<Harness initial={2} />)

    fireEvent.click(plus())
    expect(field()).toHaveValue('3')

    fireEvent.click(minus()!)
    expect(field()).toHaveValue('2')
  })

  it('포인터로 누른 뒤 따라오는 click은 다시 세지 않는다', () => {
    render(<Harness initial={2} />)

    fireEvent.pointerDown(plus())
    fireEvent.pointerUp(plus())
    fireEvent.click(plus())
    expect(field()).toHaveValue('3')
  })

  it('키보드로 최솟값의 삭제 버튼을 눌러도 onBelowMin이 불린다', () => {
    const onBelowMin = vi.fn()
    render(<Harness initial={1} min={1} onBelowMin={onBelowMin} />)

    fireEvent.click(screen.getByRole('button', { name: '멸치국수 수량 삭제' }))
    expect(onBelowMin).toHaveBeenCalledTimes(1)
  })

  it('마우스 오른쪽·가운데 버튼으로는 바뀌지 않는다 (메뉴가 뜨면 pointerup이 오지 않아 반복이 멎지 않는다)', () => {
    vi.useFakeTimers()
    render(<Harness initial={2} />)

    // jsdom에는 PointerEvent가 없어 fireEvent.pointerDown이 button을 싣지 못한다 — MouseEvent로 만들어 보낸다
    fireEvent(plus(), new MouseEvent('pointerdown', { bubbles: true, button: 2 }))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(field()).toHaveValue('2')
    vi.useRealTimers()
  })

  it('누르고 있는 동안 창이 포커스를 잃으면 반복을 멈춘다 (pointerup이 다른 창으로 간다)', () => {
    vi.useFakeTimers()
    render(<Harness initial={1} />)

    fireEvent.pointerDown(plus())
    fireEvent.blur(window)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(field()).toHaveValue('2')
    vi.useRealTimers()
  })

  it('누르고 있는 동안 disabled가 되면 반복을 멈춘다 (저장 중에 잠그는 경우)', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Harness initial={1} />)

    fireEvent.pointerDown(plus())
    rerender(<Harness initial={1} disabled />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(field()).toHaveValue('2')
    vi.useRealTimers()
  })

  it('disabled면 키보드로 눌러도 바뀌지 않는다', () => {
    render(<Harness initial={2} disabled />)

    fireEvent.click(plus())
    expect(field()).toHaveValue('2')
  })

  it('입력하다 Escape를 누르면 치던 글자를 버리고 원래 값으로 돌아간다', () => {
    const onChange = vi.fn()
    render(<Harness initial={3} onChange={onChange} />)

    fireEvent.change(field(), { target: { value: '17' } })
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(field()).toHaveValue('3')
    fireEvent.blur(field())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('버튼으로 바꾼 값은 화면 낭독기에 알린다 — 버튼에 초점이 있으면 숫자 칸의 변화가 읽히지 않는다', () => {
    render(<Harness initial={2} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('')

    fireEvent.click(plus())
    expect(status).toHaveTextContent('3')

    fireEvent.pointerDown(minus()!)
    fireEvent.pointerUp(minus()!)
    expect(status).toHaveTextContent('2')
  })

  it('누르고 있는 동안에는 알리지 않고, 뗐을 때 멎은 값만 알린다 (초당 스무 번 읽히지 않게)', () => {
    vi.useFakeTimers()
    render(<Harness initial={1} max={99} />)
    const status = screen.getByRole('status')

    fireEvent.pointerDown(plus())
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(status).toHaveTextContent('')

    fireEvent.pointerUp(plus())
    expect(status).toHaveTextContent((field() as HTMLInputElement).value)
    vi.useRealTimers()
  })

  it('직접 친 값이 범위에 맞춰 바뀌었으면 바뀐 값을 알린다', () => {
    render(<Harness initial={1} min={1} max={20} />)

    fireEvent.change(field(), { target: { value: '999' } })
    fireEvent.blur(field())
    expect(screen.getByRole('status')).toHaveTextContent('20')
  })

  it('Enter를 누르고 있어 반복되는 입력은 삭제로 넘어가지 않는다 — 삭제는 새로 누른 한 번만 받는다', () => {
    render(<Harness initial={1} min={1} onBelowMin={() => {}} />)
    const remove = screen.getByRole('button', { name: '멸치국수 수량 삭제' })

    // 기본 동작(click 만들기)을 막았으면 fireEvent가 false를 돌려준다
    expect(fireEvent.keyDown(remove, { key: 'Enter', repeat: true })).toBe(false)
    expect(fireEvent.keyDown(remove, { key: 'Enter' })).toBe(true)
    // 줄이기 버튼의 반복 입력은 막지 않는다(길게 눌러 내리기)
    expect(fireEvent.keyDown(plus(), { key: 'Enter', repeat: true })).toBe(true)
  })
})
