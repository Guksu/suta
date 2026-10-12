import { render } from '@testing-library/react'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { FILL_CUTOUTS, ICONS, iconSvg } from '@skills/layout-principles/assets/icons'

describe('layout-principles 아이콘 한 벌', () => {
  it('모든 아이콘이 24 격자의 도형을 하나 이상 갖는다', () => {
    for (const [name, nodes] of Object.entries(ICONS)) {
      expect(nodes.length, name).toBeGreaterThan(0)
      for (const [tag, attrs] of nodes) expect(Object.keys(attrs).length, `${name} ${tag}`).toBeGreaterThan(0)
    }
  })

  it('커머스 앱의 하단 탭·머리·상품 행에 필요한 이름을 모두 갖는다', () => {
    const needed = ['home', 'category', 'search', 'heart', 'user', 'cart', 'bell', 'settings', 'chevron-left', 'chevron-right', 'close', 'plus', 'minus', 'star', 'share', 'trash']
    for (const name of needed) expect(ICONS).toHaveProperty(name)
  })

  it('게이미피케이션 앱의 순위·배지·출석·연속 기록에 필요한 이름을 모두 갖는다 — 이모지 메달·불꽃 대신', () => {
    const needed = ['trophy', 'medal', 'lock', 'flame', 'calendar-check', 'footprints', 'chart', 'gift', 'point', 'check']
    for (const name of needed) expect(ICONS).toHaveProperty(name)
  })

  it('뜻이 있으면 role="img"와 이름, 장식이면 aria-hidden — 채움은 fill만 바꾼다', () => {
    const labelled = iconSvg({ name: 'cart', label: '장바구니 "3"' })
    expect(labelled).toContain('role="img"')
    expect(labelled).toContain('aria-label="장바구니 &quot;3&quot;"')
    expect(labelled).toContain('fill="none"')
    const decorative = iconSvg({ name: 'heart', filled: true, size: 20 })
    expect(decorative).toContain('aria-hidden="true"')
    expect(decorative).toContain('fill="currentColor"')
    expect(decorative).toContain('width="20"')
    expect(decorative).toContain('stroke-width="1.75"')
  })

  it('채운 모양에서 안쪽 선(가방 손잡이·집 문)은 바탕색으로 남겨 덩어리로 보이지 않는다', () => {
    // 채움이 같은 색이면 안쪽 선이 묻혀 가방이 검은 사각형이 된다(증권 웹 점검에서 하단 탭 "내 자산"이 그렇게 보였다)
    const cut = (svg: string) => svg.split('stroke:var(--icon-cutout').length - 1
    expect(cut(iconSvg({ name: 'bag', filled: true }))).toBe(2)
    expect(cut(iconSvg({ name: 'home', filled: true }))).toBe(1)
    expect(cut(iconSvg({ name: 'heart', filled: true }))).toBe(0)
    expect(cut(iconSvg({ name: 'bag' }))).toBe(0)
    // 안쪽 선은 채운 외곽보다 나중에 그려야 덮이지 않는다 — 집의 문은 정의에서 앞에 있어도 맨 뒤로
    expect(iconSvg({ name: 'home', filled: true }).replace(/<\/svg>$/, '').split('/>').filter(Boolean).at(-1)).toContain('--icon-cutout')
    for (const [name, indexes] of Object.entries(FILL_CUTOUTS)) {
      for (const index of indexes) expect(ICONS[name as keyof typeof ICONS][index], `${name} ${index}`).toBeDefined()
    }
  })

  it('React 래퍼도 채울 때만 안쪽 선을 바탕색으로 그린다', () => {
    const filled = render(<Icon name="bag" filled />).container.querySelectorAll('path')
    expect([...filled].map((path) => path.style.stroke)).toEqual(['', 'var(--icon-cutout, #fff)', 'var(--icon-cutout, #fff)'])
    const home = render(<Icon name="home" filled />).container.querySelectorAll('path')
    expect(home[home.length - 1].style.stroke).toBe('var(--icon-cutout, #fff)')
    const line = render(<Icon name="bag" />).container.querySelectorAll('path')
    expect([...line].every((path) => path.style.stroke === '')).toBe(true)
  })
})
