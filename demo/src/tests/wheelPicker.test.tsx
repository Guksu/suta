import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { WheelPicker } from '@skills/wheel-picker/assets/WheelPicker'
import { createWheel } from '@skills/wheel-picker/assets/createWheel'

const HOURS = Array.from({ length: 11 }, (_, i) => ({ value: String(11 + i), label: `${11 + i}시` }))

const Harness = ({ onChange = () => {} }: { onChange?: (value: string) => void }) => {
  const [value, setValue] = useState('13')
  return (
    <WheelPicker
      aria-label="예약 시"
      options={HOURS}
      value={value}
      itemHeight={40}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

describe('WheelPicker — listbox 역할·키보드·클릭 선택', () => {
  // jsdom에는 Element.scrollTo가 없다 — 호출 인자만 검증한다
  const scrollTo = vi.fn()
  beforeAll(() => {
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo
  })
  beforeEach(() => scrollTo.mockClear())

  it('listbox/option 역할을 갖고, 선택 항목이 aria-selected·aria-activedescendant로 표시된다', () => {
    render(<Harness />)
    const listbox = screen.getByRole('listbox', { name: '예약 시' })
    expect(listbox).toHaveAttribute('tabindex', '0')
    const selected = screen.getByRole('option', { name: '13시' })
    expect(selected).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: '11시' })).toHaveAttribute('aria-selected', 'false')
    expect(listbox).toHaveAttribute('aria-activedescendant', selected.id)
    // 초기 값 위치로 즉시(애니메이션 없이) 스크롤한다
    expect(scrollTo).toHaveBeenCalledWith({ top: 80, behavior: 'instant' })
  })

  it('ArrowDown/ArrowUp·End로 값이 바뀌고 해당 위치로 부드럽게 스크롤한다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const listbox = screen.getByRole('listbox')
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(onChange).toHaveBeenLastCalledWith('14')
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 120, behavior: 'smooth' })
    fireEvent.keyDown(listbox, { key: 'ArrowUp' })
    expect(onChange).toHaveBeenLastCalledWith('13')
    fireEvent.keyDown(listbox, { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('21')
    expect(screen.getByRole('option', { name: '21시' })).toHaveAttribute('aria-selected', 'true')
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('항목 클릭으로 그 항목이 선택된다 (마우스 사용자 대안)', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('option', { name: '18시' }))
    expect(onChange).toHaveBeenCalledWith('18')
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 280, behavior: 'smooth' })
  })
})

describe('WheelPicker — 경계(disabled·목록에 없는 값)', () => {
  const scrollTo = vi.fn()
  beforeAll(() => {
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo
  })
  beforeEach(() => scrollTo.mockClear())

  it('disabled면 aria-disabled가 붙고 Tab 순서에서 빠지며 키·클릭으로 값이 바뀌지 않는다', () => {
    const onChange = vi.fn()
    render(<WheelPicker aria-label="예약 시" options={HOURS} value="13" onChange={onChange} disabled />)
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('aria-disabled', 'true')
    expect(listbox).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('option', { name: '18시' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('value가 목록에 없으면 어느 항목도 선택으로 읽히지 않고, 첫 항목을 눌러 고를 수 있다', () => {
    const onChange = vi.fn()
    render(<WheelPicker aria-label="예약 시" options={HOURS} value="" onChange={onChange} />)
    expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-activedescendant')
    expect(screen.queryByRole('option', { selected: true })).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: '11시' }))
    expect(onChange).toHaveBeenCalledWith('11')
  })
})

describe('createWheel — 항목 0개·숨긴 채 마운트', () => {
  const scrollTo = vi.fn()
  let resize: (() => void) | undefined
  beforeAll(() => {
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo
  })
  beforeEach(() => {
    scrollTo.mockClear()
    resize = undefined
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe() {}
        disconnect() {}
      },
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  const build = (count: number) => {
    const track = document.createElement('div')
    for (let i = 0; i < count; i += 1) track.appendChild(document.createElement('div'))
    document.body.appendChild(track)
    return track
  }

  it('항목이 0개면 키를 눌러도 onChange를 부르지 않는다', () => {
    const track = build(0)
    const onChange = vi.fn()
    const wheel = createWheel({ container: track, onChange })
    fireEvent.keyDown(track, { key: 'End' })
    fireEvent.keyDown(track, { key: 'ArrowDown' })
    expect(onChange).not.toHaveBeenCalled()
    wheel.destroy()
    track.remove()
  })

  it('숨긴 채(display: none) 만들어진 휠은 보이게 될 때 항목 높이를 다시 재고 고른 자리로 맞춘다', () => {
    const track = build(10)
    const first = track.children[0] as HTMLElement
    let height = 0 // 숨겨진 동안은 0
    Object.defineProperty(first, 'offsetHeight', { get: () => height })
    Object.defineProperty(track, 'clientHeight', { get: () => height * 5 })
    const wheel = createWheel({ container: track })
    wheel.setIndex(4, { behavior: 'instant' })
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 4 * 36, behavior: 'instant' }) // 재지 못해 기본 36으로 계산했다

    height = 44 // 시트가 열려 보이게 됐다
    scrollTo.mockClear()
    resize?.()
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 4 * 44, behavior: 'instant' })
    wheel.destroy()
    track.remove()
  })

  it('크기가 바뀌어도 이미 제자리면 다시 스크롤하지 않는다', () => {
    const track = build(10)
    Object.defineProperty(track.children[0], 'offsetHeight', { get: () => 40 })
    Object.defineProperty(track, 'clientHeight', { get: () => 200 })
    const wheel = createWheel({ container: track })
    wheel.setIndex(3, { behavior: 'instant' })
    track.scrollTop = 120
    scrollTo.mockClear()
    resize?.()
    expect(scrollTo).not.toHaveBeenCalled()
    wheel.destroy()
    track.remove()
  })
})
