import { render, screen, fireEvent } from '@testing-library/react'
import { CardStack } from '@skills/card-stack/assets/CardStack'

const CARDS = [
  { id: 'points', render: () => <span>적립 카드</span> },
  { id: 'coupon', render: () => <span>만두 쿠폰</span> },
  { id: 'prepaid', render: () => <span>선불 카드</span> },
]

describe('CardStack — 카드 묶음 React 래퍼', () => {
  it('카드마다 버튼이고 그룹 라벨·초기 stacked 모드·transform 인라인이 찍힌다', () => {
    render(<CardStack cards={CARDS} label="국수집 지갑" cardHeight={160} />)
    const group = screen.getByRole('group', { name: '국수집 지갑' })
    expect(group).toHaveAttribute('data-mode', 'stacked')
    expect(group.style.minHeight).toBe(`${160 + 56 * 2}px`)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    buttons.forEach((button) => expect(button).toHaveAttribute('aria-expanded', 'false'))
    expect(buttons[2].style.transform).toBe('translateY(112px) scale(1)')
    expect(buttons[0].style.getPropertyValue('--stack-index')).toBe('0')
  })

  it('카드를 누르면 펼쳐지고(fanned), 한 번 더 누르면 그 카드가 선택되어 aria-expanded가 켜진다', () => {
    const onStateChange = vi.fn()
    render(<CardStack cards={CARDS} onStateChange={onStateChange} />)
    const group = screen.getByRole('group')
    const coupon = screen.getByRole('button', { name: '만두 쿠폰' })

    fireEvent.click(coupon)
    expect(group).toHaveAttribute('data-mode', 'fanned')
    expect(group.style.minHeight).toBe(`${180 + 72 * 2}px`)

    fireEvent.click(coupon)
    expect(group).toHaveAttribute('data-mode', 'selected')
    expect(coupon).toHaveAttribute('aria-expanded', 'true')
    expect(coupon.style.transform).toBe('translateY(0px) scale(1)')
    expect(screen.getByRole('button', { name: '적립 카드' })).toHaveAttribute('aria-expanded', 'false')
    expect(onStateChange).toHaveBeenLastCalledWith({ mode: 'selected', selectedIndex: 1 })
  })

  it('Esc는 한 단계씩 되돌린다 (selected → fanned → stacked)', () => {
    render(<CardStack cards={CARDS} />)
    const group = screen.getByRole('group')
    const prepaid = screen.getByRole('button', { name: '선불 카드' })
    fireEvent.click(prepaid)
    fireEvent.click(prepaid)
    expect(group).toHaveAttribute('data-mode', 'selected')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(group).toHaveAttribute('data-mode', 'fanned')
    expect(prepaid).toHaveAttribute('aria-expanded', 'false')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(group).toHaveAttribute('data-mode', 'stacked')
  })
})

describe('CardStack — 상태와 경계', () => {
  const open = (name: string) => {
    fireEvent.click(screen.getByRole('button', { name }))
    fireEvent.click(screen.getByRole('button', { name }))
  }

  it('선택한 카드 앞의 카드가 사라져도 선택은 같은 카드에 남는다(순번이 아니라 id로 기억한다)', () => {
    const { rerender } = render(<CardStack cards={CARDS} />)
    open('선불 카드')
    expect(screen.getByRole('button', { name: '선불 카드' })).toHaveAttribute('aria-expanded', 'true')

    rerender(<CardStack cards={CARDS.filter((card) => card.id !== 'points')} />)
    expect(screen.getByRole('button', { name: '선불 카드' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: '만두 쿠폰' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('group')).toHaveAttribute('data-mode', 'selected')
  })

  it('선택한 카드 자체가 사라지면 펼침으로 돌아간다 — 다른 카드가 선택된 것처럼 보이지 않는다', () => {
    const onStateChange = vi.fn()
    const { rerender } = render(<CardStack cards={CARDS} onStateChange={onStateChange} />)
    open('만두 쿠폰')

    rerender(<CardStack cards={CARDS.filter((card) => card.id !== 'coupon')} onStateChange={onStateChange} />)
    expect(screen.getByRole('group')).toHaveAttribute('data-mode', 'fanned')
    screen.getAllByRole('button').forEach((button) => expect(button).toHaveAttribute('aria-expanded', 'false'))
    expect(onStateChange).toHaveBeenLastCalledWith({ mode: 'fanned', selectedIndex: null })
  })

  it('Esc는 포커스가 묶음 밖의 다른 요소(입력칸·열린 대화상자)에 있으면 받지 않는다', () => {
    render(
      <>
        <CardStack cards={CARDS} />
        <input aria-label="검색" />
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: '적립 카드' }))
    const input = screen.getByRole('textbox', { name: '검색' })
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByRole('group')).toHaveAttribute('data-mode', 'fanned')

    screen.getByRole('button', { name: '적립 카드' }).focus()
    fireEvent.keyDown(screen.getByRole('button', { name: '적립 카드' }), { key: 'Escape' })
    expect(screen.getByRole('group')).toHaveAttribute('data-mode', 'stacked')
  })

  it('카드가 0장이면 빈 그룹만 그리고 높이는 0이다', () => {
    render(<CardStack cards={[]} />)
    expect(screen.getByRole('group').style.minHeight).toMatch(/^0(px)?$/)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
