import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COLOR, GAP, LEADING, LIMITS, RADIUS, RATIO, SPACE, TEXT, WEIGHT, contrastRatio, groupGapOk, isOnGrid, nearestSpace, toPx } from '@skills/layout-principles/assets/layoutTokens'

// vitest는 demo/에서 돈다 — 정본 CSS를 파일로 읽어 TS 상수와 비교한다(두 벌이 어긋나면 검사기와 화면이 다른 척도를 쓴다)
const css = readFileSync(resolve(process.cwd(), '../skills/suta/patterns/layout-principles/assets/layout-tokens.css'), 'utf8')
const cssVar = (name: string) => css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim()

describe('layoutTokens — CSS 토큰과 TS 상수가 같은 값이다', () => {
  it('간격 척도 8단계가 CSS와 일치하고, 이름의 숫자 × 4 = px다', () => {
    expect(Object.keys(SPACE)).toHaveLength(8)
    for (const [step, px] of Object.entries(SPACE)) {
      expect(cssVar(`--space-${step}`)).toBe(`${px}px`)
      expect(Number(step) * 4).toBe(px)
    }
  })

  it('글자 크기·줄 간격·굵기·반경이 CSS와 일치한다', () => {
    for (const [name, px] of Object.entries(TEXT)) expect(cssVar(`--text-${name}`)).toBe(`${px}px`)
    for (const [name, value] of Object.entries(LEADING)) expect(cssVar(`--leading-${name}`)).toBe(String(value))
    for (const [name, value] of Object.entries(WEIGHT)) expect(cssVar(`--weight-${name}`)).toBe(String(value))
    for (const [name, px] of Object.entries(RADIUS)) expect(cssVar(`--radius-${name}`)).toBe(`${px}px`)
  })

  it('간격 역할·크기 한계·이미지 비율이 CSS와 일치한다', () => {
    expect(cssVar('--gap-item')).toBe(`var(--space-${GAP.item / 4})`)
    expect(cssVar('--gap-group')).toBe(`var(--space-${GAP.group / 4})`)
    expect(cssVar('--gap-section')).toBe(`var(--space-${GAP.section / 4})`)
    expect(cssVar('--measure')).toBe(`${LIMITS.measureCh}ch`)
    expect(cssVar('--tap-min')).toBe(`${LIMITS.tapMinPx}px`)
    expect(cssVar('--control-height')).toBe(`${LIMITS.controlHeightPx}px`)
    expect(cssVar('--content-max')).toBe(`${LIMITS.contentMaxPx}px`)
    for (const [name, ratio] of Object.entries(RATIO)) expect(cssVar(`--ratio-${name}`)).toBe(ratio)
  })
})

describe('layoutTokens — 원칙이 값에 들어 있다', () => {
  it('묶음 안 간격은 묶음 사이의 절반 이하, 구역 사이는 묶음 사이보다 넓다 (P4)', () => {
    expect(groupGapOk({ inside: GAP.item, between: GAP.group })).toBe(true)
    expect(GAP.section).toBeGreaterThan(GAP.group)
    expect(groupGapOk({ inside: 16, between: 24 })).toBe(false)
    expect(groupGapOk({ inside: 12, between: 24 })).toBe(true)
  })

  it('글자 단계는 하한 12px에서 시작하고, 핵심 수치는 보조 줄의 2배·화면 제목은 본문의 1.5배 이상이다 (P2·P7)', () => {
    expect(Math.min(...Object.values(TEXT))).toBe(LIMITS.minTextPx)
    expect(TEXT.small).toBe(LIMITS.bodyMinPx)
    expect(TEXT.display / TEXT.small).toBeGreaterThanOrEqual(2)
    expect(TEXT.title / TEXT.body).toBeGreaterThanOrEqual(1.5)
  })

  it('굵기는 3종, 반경은 3종 + 완전 둥근 것이다 (P2·P10)', () => {
    expect(Object.keys(WEIGHT)).toHaveLength(3)
    expect(Object.keys(RADIUS).filter((name) => name !== 'full')).toHaveLength(3)
  })
})

describe('layoutTokens — 판정 함수', () => {
  it('toPx는 px·rem·em을 px로 바꾸고, 렌더 없이 모르는 값은 null이다', () => {
    expect(toPx('12px')).toBe(12)
    expect(toPx('0.75rem')).toBe(12)
    expect(toPx('1.5em')).toBe(24)
    expect(toPx('0')).toBe(0)
    expect(toPx('-8px')).toBe(-8)
    expect(toPx('50%')).toBeNull()
    expect(toPx('var(--space-4)')).toBeNull()
    expect(toPx('calc(1rem + 2px)')).toBeNull()
    expect(toPx('auto')).toBeNull()
  })

  it('isOnGrid는 4px 격자 위의 값과 선 두께(1·2px)를 허용한다', () => {
    expect([0, 1, 2, 4, 8, 20, 64, -16].every(isOnGrid)).toBe(true)
    expect([3, 5, 6, 10, 13, 18, 9.6].some(isOnGrid)).toBe(false)
  })

  it('nearestSpace는 척도에서 가장 가까운 값을 고르고, 같은 거리면 작은 쪽이다', () => {
    expect(nearestSpace(13)).toBe(12)
    expect(nearestSpace(10)).toBe(8)
    expect(nearestSpace(20)).toBe(16)
    expect(nearestSpace(28)).toBe(24)
    expect(nearestSpace(100)).toBe(64)
    expect(nearestSpace(-6)).toBe(-4)
  })

  it('contrastRatio는 WCAG 명암비를 계산하고 두 색의 순서와 무관하다', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
    expect(contrastRatio('#777777', '#777777')).toBe(1)
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1)
    expect(contrastRatio('#FFF', '#000')).toBeCloseTo(21, 1)
  })
})

describe('layoutTokens — 색 역할 (P2 농도·P3 강조·P5 면)', () => {
  it('색 역할이 CSS와 일치한다', () => {
    const name = (key: string) => `--color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
    for (const [key, value] of Object.entries(COLOR)) expect(cssVar(name(key))).toBe(value)
  })

  it('글자 색 3단계는 흰 면과 옅은 바탕 모두에서 4.5:1 이상이고, 단계가 눈에 띄게 다르다', () => {
    for (const ground of [COLOR.surface, COLOR.canvas]) {
      for (const text of [COLOR.text, COLOR.textSecondary, COLOR.textTertiary]) expect(contrastRatio(text, ground)).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrastRatio(COLOR.text, COLOR.surface)).toBeGreaterThan(contrastRatio(COLOR.textSecondary, COLOR.surface) * 1.5)
    expect(contrastRatio(COLOR.textSecondary, COLOR.surface)).toBeGreaterThan(contrastRatio(COLOR.textTertiary, COLOR.surface) * 1.2)
  })

  it('상태 색은 글자로 써도 흰 면에서 4.5:1 이상이다', () => {
    for (const state of [COLOR.danger, COLOR.success]) expect(contrastRatio(state, COLOR.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(COLOR.onAccent, COLOR.accent)).toBeGreaterThanOrEqual(4.5)
  })

  it('등락 색(상승·하락)은 흰 면과 옅은 바탕에서 4.5:1 이상이고, 흰 글자를 얹어도(매수·매도 버튼) 4.5:1 이상이다', () => {
    for (const tone of [COLOR.rise, COLOR.fall]) {
      for (const ground of [COLOR.surface, COLOR.canvas]) expect(contrastRatio(tone, ground)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(COLOR.onAccent, tone)).toBeGreaterThanOrEqual(4.5)
    }
    // 오류 빨강과 다른 값이다 — 시세가 오른 것을 오류처럼 보이게 하지 않는다
    expect(COLOR.rise).not.toBe(COLOR.danger)
  })

  it('보상 색(금·은·동)은 그림(메달·코인·1~3위 표시)이라 흰 면과 옅은 바탕에서 3:1 이상이고, 세 값과 강조색·오류 빨강이 모두 다르다', () => {
    const rewards = [COLOR.reward, COLOR.rewardSilver, COLOR.rewardBronze]
    for (const tone of rewards) {
      for (const ground of [COLOR.surface, COLOR.canvas]) expect(contrastRatio(tone, ground)).toBeGreaterThanOrEqual(3)
    }
    expect(new Set([...rewards, COLOR.accent, COLOR.danger]).size).toBe(5)
    // 금색 면 위의 글자(메달 안 숫자)는 주 글자색으로 — 흰 글자는 3.6:1이라 작은 글자에 모자란다
    expect(contrastRatio(COLOR.text, COLOR.reward)).toBeGreaterThanOrEqual(4.5)
  })

  it('옅은 바탕은 흰 면과 구별되지만 선·글자보다 약하다 — 면은 톤 차이로 나눈다', () => {
    const canvas = contrastRatio(COLOR.canvas, COLOR.surface)
    expect(canvas).toBeGreaterThanOrEqual(1.05)
    expect(canvas).toBeLessThan(contrastRatio(COLOR.line, COLOR.surface))
    expect(contrastRatio(COLOR.line, COLOR.surface)).toBeLessThan(1.5)
  })

  it('구역 사이 간격은 좁은 화면 32px, 넓은 화면 48px이고 구역 띠는 8px이다 (레퍼런스 구역 사이 중앙값 29)', () => {
    expect(GAP.section).toBe(32)
    expect(GAP.sectionWide).toBe(48)
    expect(css).toMatch(/@media \(min-width: 768px\)\s*\{\s*:root\s*\{[^}]*--gap-section:\s*var\(--space-12\)/)
    expect(cssVar('--band')).toBe('var(--space-2)')
  })
})
