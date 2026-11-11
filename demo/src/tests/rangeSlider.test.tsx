import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { RangeSlider, type RangeValue } from '@skills/range-slider/assets/RangeSlider'

const Harness = ({
  minDistance,
  onChange,
  onChangeEnd,
  disabled,
}: {
  minDistance?: number
  onChange?: (v: RangeValue) => void
  onChangeEnd?: (v: RangeValue) => void
  disabled?: boolean
}) => {
  const [value, setValue] = useState<RangeValue>({ lower: 10000, upper: 40000 })
  return (
    <RangeSlider
      min={0}
      max={50000}
      step={1000}
      value={value}
      minDistance={minDistance}
      disabled={disabled}
      onChangeEnd={onChangeEnd}
      label={{ lower: '최저 가격', upper: '최고 가격' }}
      format={(v) => `${v.toLocaleString('ko-KR')}원`}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('RangeSlider — 네이티브 input 두 개로 만든 범위 슬라이더', () => {
  const lower = () => screen.getByRole('slider', { name: '최저 가격' })
  const upper = () => screen.getByRole('slider', { name: '최고 가격' })

  it('두 손잡이가 각각 slider로 노출되고 값이 문구로 읽힌다', () => {
    render(<Harness />)

    expect(lower()).toHaveValue('10000')
    expect(lower()).toHaveAttribute('aria-valuetext', '10,000원')
    expect(upper()).toHaveAttribute('aria-valuetext', '40,000원')
  })

  it('값을 바꾸면 눈금에 맞춰 반영된다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    fireEvent.change(lower(), { target: { value: '12400' } })
    expect(onChange).toHaveBeenCalledWith({ lower: 12000, upper: 40000 })
  })

  it('아래 손잡이를 위 손잡이 너머로 올려도 위쪽은 그대로다 — 자기가 멈춘다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    fireEvent.change(lower(), { target: { value: '45000' } })
    expect(onChange).toHaveBeenCalledWith({ lower: 40000, upper: 40000 })
  })

  it('최소 간격을 주면 그만큼 떨어져 멈춘다', () => {
    const onChange = vi.fn()
    render(<Harness minDistance={5000} onChange={onChange} />)

    fireEvent.change(upper(), { target: { value: '8000' } })
    expect(onChange).toHaveBeenCalledWith({ lower: 10000, upper: 15000 })
  })

  it('고른 구간이 CSS 변수로 나가 채움 막대가 그려진다', () => {
    const { container } = render(<Harness />)
    const root = container.querySelector('.range-root') as HTMLElement

    expect(root.style.getPropertyValue('--range-lower')).toBe('20%')
    expect(root.style.getPropertyValue('--range-upper')).toBe('80%')
  })

  it('두 손잡이가 오른쪽 끝에 겹치면 아래쪽을 위로 올린다 (왼쪽으로 끌 수 있게)', () => {
    const { container } = render(<Harness />)
    const root = container.querySelector('.range-root') as HTMLElement

    fireEvent.change(lower(), { target: { value: '50000' } })
    expect(root.dataset.onTop).toBe('lower')
  })

  /** jsdom에는 PointerEvent가 없어 fireEvent.pointerDown은 좌표를 싣지 못한다 — 좌표가 있는 MouseEvent에 이름만 빌린다 */
  const press = (root: HTMLElement, init: { clientX: number; button: number }) =>
    fireEvent(root, new MouseEvent('pointerdown', { bubbles: true, ...init }))

  /** 트랙 폭 200px — 누른 x좌표가 곧 0.5%씩이다 */
  const stubRect = (root: HTMLElement) => {
    root.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 24, right: 200, bottom: 24, x: 0, y: 0, toJSON: () => ({}) })
  }

  it('트랙을 누르면 가까운 손잡이가 그 자리로 온다', () => {
    const onChange = vi.fn()
    const { container } = render(<Harness onChange={onChange} />)
    const root = container.querySelector('.range-root') as HTMLElement
    stubRect(root)

    press(root, { clientX: 20, button: 0 })
    expect(onChange).toHaveBeenCalledWith({ lower: 5000, upper: 40000 })
  })

  it('오른쪽 버튼(문맥 메뉴)으로 누른 트랙은 값을 바꾸지 않는다', () => {
    const onChange = vi.fn()
    const { container } = render(<Harness onChange={onChange} />)
    const root = container.querySelector('.range-root') as HTMLElement
    stubRect(root)

    press(root, { clientX: 20, button: 2 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('dir="rtl"에서는 트랙의 오른쪽 끝이 최솟값이다', () => {
    const onChange = vi.fn()
    const { container } = render(
      <div dir="rtl">
        <Harness onChange={onChange} />
      </div>,
    )
    const root = container.querySelector('.range-root') as HTMLElement
    stubRect(root)

    // 왼쪽에서 20px = 오른쪽에서 90% → 45,000. 가까운 쪽은 위 손잡이(40,000)다
    press(root, { clientX: 20, button: 0 })
    expect(onChange).toHaveBeenCalledWith({ lower: 10000, upper: 45000 })
  })

  it('disabled면 두 손잡이가 잠기고 트랙을 눌러도 값이 바뀌지 않는다', () => {
    const onChange = vi.fn()
    const { container } = render(<Harness disabled onChange={onChange} />)
    const root = container.querySelector('.range-root') as HTMLElement
    stubRect(root)

    expect(lower()).toBeDisabled()
    expect(upper()).toBeDisabled()
    expect(root.dataset.disabled).toBe('true')
    press(root, { clientX: 20, button: 0 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('onChangeEnd는 손을 뗐을 때(네이티브 change) 한 번, 맞춰진 값으로 부른다', () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    render(<Harness onChange={onChange} onChangeEnd={onChangeEnd} />)

    // 끄는 동안 — input 이벤트만 온다
    fireEvent.input(lower(), { target: { value: '12400' } })
    fireEvent.input(lower(), { target: { value: '14200' } })
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChangeEnd).not.toHaveBeenCalled()

    // 손을 뗀다 — change 이벤트
    lower().dispatchEvent(new Event('change', { bubbles: true }))
    expect(onChangeEnd).toHaveBeenCalledTimes(1)
    expect(onChangeEnd).toHaveBeenCalledWith({ lower: 14000, upper: 40000 })
  })

  it('트랙을 눌러 옮긴 값도 onChangeEnd로 나간다', () => {
    const onChangeEnd = vi.fn()
    const { container } = render(<Harness onChangeEnd={onChangeEnd} />)
    const root = container.querySelector('.range-root') as HTMLElement
    stubRect(root)

    press(root, { clientX: 180, button: 0 })
    expect(onChangeEnd).toHaveBeenCalledWith({ lower: 10000, upper: 45000 })
  })
})
