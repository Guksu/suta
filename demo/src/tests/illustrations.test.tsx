import { render } from '@testing-library/react'
import { Illustration } from '@skills/layout-principles/assets/Illustration'
import { ILLUSTRATIONS, illustrationSvg } from '@skills/layout-principles/assets/illustrations'

describe('layout-principles 그림 아이콘 한 벌', () => {
  it('모든 그림이 32 격자의 도형을 갖고, 색이 그림 안에 들어 있다', () => {
    for (const [name, inner] of Object.entries(ILLUSTRATIONS)) {
      expect(inner, name).toMatch(/^<(path|circle|rect|ellipse|g)\b/)
      expect(inner, name).toMatch(/fill="#[0-9A-Fa-f]{3,8}"/)
      // 그림끼리 겹쳐 그려도 서로의 정의를 덮지 않게 id·style·script가 없다
      expect(inner, name).not.toMatch(/\bid=|<style|<script/)
    }
  })

  it('배달·커머스 바로가기, 은행 계좌·혜택, 알림 종류에 필요한 이름을 모두 갖는다', () => {
    const needed = ['steaming-bowl', 'pizza', 'poultry-leg', 'hot-beverage', 'shopping-bags', 'package', 'bank', 'coin', 'credit-card', 'receipt', 'bell', 'megaphone', 'wrapped-gift', 'party-popper']
    for (const name of needed) expect(ILLUSTRATIONS).toHaveProperty(name)
    // 달러($) 표시가 든 돈주머니·지폐는 원화 서비스에 어긋나 넣지 않았다
    for (const name of ['money-bag', 'dollar-banknote']) expect(ILLUSTRATIONS).not.toHaveProperty(name)
  })

  it('옆에 이름 글자가 있으면 숨기고, 그림만으로 뜻을 전할 때만 이름을 읽힌다', () => {
    expect(illustrationSvg({ name: 'pizza' })).toContain('aria-hidden="true"')
    const labelled = illustrationSvg({ name: 'bank', size: 32, label: '한결은행 "주거래"' })
    expect(labelled).toContain('role="img"')
    expect(labelled).toContain('aria-label="한결은행 &quot;주거래&quot;"')
    expect(labelled).toContain('width="32"')
  })

  it('React 래퍼도 같은 그림을 같은 접근성 규칙으로 그린다', () => {
    const { container } = render(<Illustration name="steaming-bowl" size={48} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('width')).toBe('48')
    expect(svg.innerHTML).toContain('path')
    const { getByRole } = render(<Illustration name="coin" label="포인트" />)
    expect(getByRole('img', { name: '포인트' })).toBeTruthy()
  })
})
