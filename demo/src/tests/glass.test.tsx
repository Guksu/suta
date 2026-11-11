import { render, screen } from '@testing-library/react'
import { Glass } from '@skills/glass-surface/assets/Glass'

describe('Glass — 유리판 래퍼가 CSS 훅(클래스·data 속성·변수)을 올바르게 찍는다', () => {
  it('기본값은 흰 유리 카드다', () => {
    render(<Glass>본문</Glass>)
    const el = screen.getByText('본문')
    expect(el.tagName).toBe('DIV')
    expect(el).toHaveClass('glass', 'glass-card')
    expect(el).toHaveAttribute('data-tone', 'light')
    expect(el).not.toHaveAttribute('data-opaque')
  })

  it('as·variant·tone이 태그·변형 클래스·톤 속성으로 갈린다', () => {
    render(
      <Glass as="nav" variant="nav" tone="dark" aria-label="주메뉴">
        메뉴
      </Glass>,
    )
    const el = screen.getByRole('navigation', { name: '주메뉴' })
    expect(el).toHaveClass('glass', 'glass-nav')
    expect(el).not.toHaveClass('glass-card')
    expect(el).toHaveAttribute('data-tone', 'dark')
  })

  it('blur는 CSS 변수로, opaque는 data-opaque로 내려간다', () => {
    render(
      <Glass blur={8} opaque>
        폴백
      </Glass>
    )
    const el = screen.getByText('폴백')
    expect(el.style.getPropertyValue('--glass-blur')).toBe('8px')
    expect(el).toHaveAttribute('data-opaque', 'true')
  })

  it('interactive와 사용자 className이 함께 붙는다', () => {
    render(
      <Glass interactive className="menu-card">
        누르기
      </Glass>,
    )
    expect(screen.getByText('누르기')).toHaveClass('glass', 'glass-card', 'glass-interactive', 'menu-card')
  })

  it('누를 수 있는 유리는 button·a로 그린다 — div에 onClick만 달면 키보드로 누를 수 없다', () => {
    const { container, rerender } = render(
      <Glass as="button" interactive disabled>
        담기
      </Glass>,
    )
    const button = container.querySelector('button')!
    expect(button).toHaveAttribute('type', 'button') // 폼 안에서 제출 버튼이 되지 않게
    expect(button).toBeDisabled()
    expect(button).toHaveClass('glass-interactive')

    rerender(
      <Glass as="a" href="/menu" interactive>
        메뉴 보기
      </Glass>,
    )
    expect(container.querySelector('a')).toHaveAttribute('href', '/menu')
  })
})
