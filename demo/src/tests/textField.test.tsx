import { createRef, useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TextField } from '@skills/floating-label/assets/TextField'

const Harness = () => {
  const [value, setValue] = useState('')
  return <TextField label="이름" value={value} onChange={(e) => setValue(e.target.value)} />
}

describe('TextField — 플로팅 라벨 배선', () => {
  it('라벨이 input과 htmlFor로 연결된다', () => {
    render(<Harness />)
    expect(screen.getByLabelText('이름')).toBeInstanceOf(HTMLInputElement)
  })

  it('placeholder는 항상 한 칸 공백이다 — :placeholder-shown 판정의 전제', () => {
    render(<Harness />)
    expect(screen.getByLabelText('이름')).toHaveAttribute('placeholder', ' ')
  })

  it('입력값이 반영된다 (controlled)', () => {
    render(<Harness />)
    const input = screen.getByLabelText('이름')
    fireEvent.change(input, { target: { value: '김국수' } })
    expect(input).toHaveValue('김국수')
  })

  it('외부 id를 주면 그 id로 연결된다', () => {
    render(<TextField label="연락처" id="phone" defaultValue="" />)
    expect(screen.getByLabelText('연락처')).toHaveAttribute('id', 'phone')
  })

  it('helperText는 입력 아래에 보이고 aria-describedby로 이어진다', () => {
    render(<TextField label="연락처" helperText="예약 확인 문자를 보내 드려요" />)
    const input = screen.getByLabelText('연락처')
    const helper = screen.getByText('예약 확인 문자를 보내 드려요')
    expect(input).toHaveAttribute('aria-describedby', helper.id)
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('errorText가 있으면 aria-invalid가 켜지고 도움말 자리에 오류 문구가 대신 선다', () => {
    render(<TextField label="연락처" helperText="예약 확인 문자를 보내 드려요" errorText="010-1234-5678 형식으로 입력해 주세요" />)
    const input = screen.getByLabelText('연락처')
    const error = screen.getByText('010-1234-5678 형식으로 입력해 주세요')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', error.id)
    expect(error).toHaveAttribute('data-kind', 'error')
    expect(screen.queryByText('예약 확인 문자를 보내 드려요')).toBeNull()
  })

  it('밖에서 준 aria-describedby는 지워지지 않고 문구 id와 함께 실린다', () => {
    render(<TextField label="인원" aria-describedby="party-note" helperText="4명부터 받아요" />)
    const input = screen.getByLabelText('인원')
    const helper = screen.getByText('4명부터 받아요')
    expect(input).toHaveAttribute('aria-describedby', `party-note ${helper.id}`)
  })

  it('문구가 없으면 aria-describedby도 문구 요소도 만들지 않는다', () => {
    const { container } = render(<TextField label="이름" />)
    expect(screen.getByLabelText('이름')).not.toHaveAttribute('aria-describedby')
    expect(container.querySelector('.field-message')).toBeNull()
  })

  it('ref는 input으로 간다 — 제출 실패 때 틀린 칸으로 포커스를 옮길 수 있다', () => {
    const ref = createRef<HTMLInputElement>()
    render(<TextField label="이름" ref={ref} />)
    expect(ref.current).toBe(screen.getByLabelText('이름'))
  })
})
