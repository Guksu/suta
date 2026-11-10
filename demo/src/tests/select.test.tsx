import { useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Select } from '@skills/select/assets/Select'

const OPTIONS = [
  { value: 'somyeon', label: '소면' },
  { value: 'jungmyeon', label: '중면' },
  { value: 'kalguksu', label: '칼국수면' },
]

const Harness = ({ onChange = () => {} }: { onChange?: (value: string) => void }) => {
  const [value, setValue] = useState<string | null>(null)
  return (
    <Select
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
      placeholder="면 종류 선택"
    />
  )
}

describe('Select — 열림/닫힘·키보드 내비게이션·선택', () => {
  it('클릭으로 열리고 listbox 패널이 data-open이 된다', () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toHaveAttribute('data-open', 'true')
  })

  it('ArrowDown으로 열고 하이라이트를 옮겨 Enter로 선택한다 — onChange 후 닫힘', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // 열림 — 하이라이트 첫 항목
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // 두 번째 항목으로
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('jungmyeon')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('중면')
  })

  it('열린 동안 aria-activedescendant가 하이라이트 옵션을 가리킨다', () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const highlighted = screen.getAllByRole('option')[0]
    expect(trigger).toHaveAttribute('aria-activedescendant', highlighted.id)
  })

  it('옵션 클릭으로도 선택된다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: '칼국수면' }))
    expect(onChange).toHaveBeenCalledWith('kalguksu')
  })

  it('Escape는 선택 없이 닫는다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(onChange).not.toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('바깥 포인터다운으로 닫힌다', () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('선택된 옵션은 aria-selected로 표시된다', () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: '소면' }))
    fireEvent.click(trigger)
    expect(screen.getByRole('option', { name: /소면/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('옵션을 클릭해 고른 뒤 포커스가 트리거로 돌아온다 — 이어서 키보드로 다시 열 수 있다', () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: '중면' }))
    expect(document.activeElement).toBe(trigger)
  })

  it('옵션이 0개면 열어도 없는 옵션을 가리키지 않고, Enter는 onChange 없이 닫는다', () => {
    const onChange = vi.fn()
    render(<Select options={[]} value={null} onChange={onChange} placeholder="면 종류 선택" />)
    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).not.toHaveAttribute('aria-activedescendant')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('열린 동안의 Escape는 패널만 닫는다 — 기본 동작과 전파를 막아 바깥 대화상자가 함께 닫히지 않는다', () => {
    const onOuterKeyDown = vi.fn()
    render(
      <div onKeyDown={onOuterKeyDown}>
        <Harness />
      </div>,
    )
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    const notPrevented = fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(notPrevented).toBe(false)
    expect(onOuterKeyDown).not.toHaveBeenCalled()

    // 닫힌 뒤의 Escape는 건드리지 않는다 — 대화상자를 닫는 키로 남는다
    expect(fireEvent.keyDown(trigger, { key: 'Escape' })).toBe(true)
    expect(onOuterKeyDown).toHaveBeenCalledTimes(1)
  })
})

describe('Select — 상태(disabled·오류)와 옵션 경계', () => {
  const MENU = [
    { value: 'buckwheat', label: 'Buckwheat noodles' },
    { value: 'knife', label: 'Knife-cut noodles', disabled: true },
    { value: 'medium', label: 'Medium wheat noodles' },
    { value: 'rice', label: 'Rice noodles' },
  ]

  it('disabled면 트리거가 꺼지고 눌러도 열리지 않는다', () => {
    render(<Select options={MENU} value={null} onChange={() => {}} disabled />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('고를 수 없는 옵션은 aria-disabled로 알리고, 클릭해도 고르지 않으며 패널이 닫히지 않는다', () => {
    const onChange = vi.fn()
    render(<Select options={MENU} value={null} onChange={onChange} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    const soldOut = screen.getByRole('option', { name: 'Knife-cut noodles' })
    expect(soldOut).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(soldOut)
    expect(onChange).not.toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('화살표는 고를 수 없는 옵션을 건너뛴다', () => {
    const onChange = vi.fn()
    render(<Select options={MENU} value={null} onChange={onChange} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // 열림 — 첫 옵션
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // 두 번째는 건너뛰고 세 번째
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('medium')
  })

  it('닫힌 채로 글자를 치면 열리면서 그 글자로 시작하는 옵션을 가리킨다 (타이핑으로 찾기)', () => {
    render(<Select options={MENU} value={null} onChange={() => {}} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'r' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Rice noodles' }).id)
  })

  it('이어 친 글자는 500ms 동안 한 낱말로 모이고, 그 뒤에는 새로 시작한다', () => {
    vi.useFakeTimers()
    render(<Select options={MENU} value={null} onChange={() => {}} />)
    const trigger = screen.getByRole('combobox')
    const active = () => document.getElementById(trigger.getAttribute('aria-activedescendant') ?? '')?.textContent

    fireEvent.keyDown(trigger, { key: 'm' })
    fireEvent.keyDown(trigger, { key: 'e' })
    expect(active()).toBe('Medium wheat noodles')

    act(() => vi.advanceTimersByTime(500))
    fireEvent.keyDown(trigger, { key: 'b' })
    expect(active()).toBe('Buckwheat noodles')
    vi.useRealTimers()
  })

  it('Ctrl·Meta와 함께 누른 글자는 타이핑으로 보지 않는다 (브라우저 단축키)', () => {
    render(<Select options={MENU} value={null} onChange={() => {}} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'r', ctrlKey: true })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('name을 주면 숨은 input에 값이 실려 폼과 함께 제출된다', () => {
    const { container } = render(
      <form>
        <Select options={MENU} value="rice" onChange={() => {}} name="noodle" />
      </form>,
    )
    expect(new FormData(container.querySelector('form')!).get('noodle')).toBe('rice')
  })

  it('invalid·required가 트리거의 aria-invalid·aria-required로 실린다', () => {
    render(<Select options={MENU} value={null} onChange={() => {}} invalid required />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAttribute('aria-required', 'true')
  })

  it('포인터가 실제로 움직였을 때만 하이라이트가 따라간다 — 키보드로 목록이 스크롤돼 포인터 밑의 옵션이 바뀐 것은 무시한다', () => {
    render(<Select options={MENU} value={null} onChange={() => {}} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    const options = screen.getAllByRole('option')
    const highlighted = () => options.findIndex((option) => option.dataset.highlighted === 'true')
    // jsdom의 pointermove는 화면 좌표를 싣지 않는다 — 좌표가 있는 MouseEvent를 같은 이름으로 보낸다
    const movePointer = ({ index, y }: { index: number; y: number }) =>
      fireEvent(options[index], new MouseEvent('pointermove', { bubbles: true, screenX: 40, screenY: y }))

    movePointer({ index: 2, y: 118 }) // 처음 받은 이벤트는 위치만 기억한다
    expect(highlighted()).toBe(0)
    movePointer({ index: 2, y: 120 })
    expect(highlighted()).toBe(2)

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(highlighted()).toBe(3)
    // 목록이 스크롤되면 브라우저는 포인터가 가만히 있어도 그 밑의 새 옵션에 이벤트를 보낸다 — 좌표는 그대로다
    movePointer({ index: 0, y: 120 })
    expect(highlighted()).toBe(3)

    movePointer({ index: 0, y: 60 })
    expect(highlighted()).toBe(0)
  })
})
