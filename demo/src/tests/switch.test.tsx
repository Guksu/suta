import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '@skills/switch/assets/Switch'

const Harness = ({ onChange = () => {} }: { onChange?: (checked: boolean) => void }) => {
  const [checked, setChecked] = useState(false)
  return (
    <Switch
      checked={checked}
      onChange={(next) => {
        setChecked(next)
        onChange(next)
      }}
      label="곱빼기"
    />
  )
}

describe('Switch — 네이티브 체크박스 기반 토글', () => {
  it('role=switch로 노출되고 라벨과 연결된다', () => {
    render(<Harness />)
    expect(screen.getByRole('switch', { name: '곱빼기' })).not.toBeChecked()
  })

  it('클릭하면 onChange가 다음 상태를 받고 checked가 바뀐다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const input = screen.getByRole('switch', { name: '곱빼기' })
    fireEvent.click(input)
    expect(onChange).toHaveBeenCalledWith(true)
    expect(input).toBeChecked()
    fireEvent.click(input)
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('disabled가 입력에 전달된다 — 조작 차단은 네이티브 체크박스가 보장한다', () => {
    render(<Switch checked={false} onChange={() => {}} label="파 많이" disabled />)
    expect(screen.getByRole('switch', { name: '파 많이' })).toBeDisabled()
  })

  it('라벨 없이 쓸 때 aria-label·name 같은 나머지 props가 input으로 간다 (설정 행처럼 이름이 옆 칸에 있을 때)', () => {
    render(<Switch checked onChange={() => {}} aria-label="주문 알림" name="orderAlert" aria-describedby="alert-help" />)
    const input = screen.getByRole('switch', { name: '주문 알림' })
    expect(input).toBeChecked()
    expect(input).toHaveAttribute('name', 'orderAlert')
    expect(input).toHaveAttribute('aria-describedby', 'alert-help')
  })

  it('나머지 props가 type·role을 덮어쓰지 못한다 — 켜짐/꺼짐 낭독의 근거다', () => {
    // @ts-expect-error type은 받지 않는다 — JS 프로젝트에서 잘못 넘겨도 스위치로 남아야 한다
    render(<Switch checked={false} onChange={() => {}} aria-label="주문 알림" type="text" />)
    const input = screen.getByRole('switch', { name: '주문 알림' })
    expect(input).toHaveAttribute('type', 'checkbox')
  })
})
