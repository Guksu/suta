import { COLOR, contrastRatio } from '@skills/layout-principles/assets/layoutTokens'
import { accentIssues, buildPalette, contrastExact, CVD_MIN_DISTANCE, CVD_MIN_LIGHTNESS, cvdPairCheck, formatCss, hexOfOklch, NORMAL_MIN_DISTANCE, oklchOf, simulateCvd } from '@skills/layout-principles/assets/palette'

// 색 조합 — 강조색 하나에서 한 벌(강조·강조 글자·선택 바탕·무채색)을 만든다. 기준은 레퍼런스 31곳 실측(tone.md 3·4절)
describe('palette — OKLCH 변환', () => {
  it('hex ↔ OKLCH가 오간다(왕복 오차 1 단계 안)', () => {
    for (const hex of ['#3182f6', '#fe6e0c', '#00b274', '#1c1c1c', '#fecc00']) {
      const back = hexOfOklch(oklchOf(hex))
      const [a, b] = [hex, back].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))
      for (let i = 0; i < 3; i += 1) expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(1)
    }
  })

  it('밝기·채도·색상각을 잰다 — 레퍼런스의 파랑은 밝기 0.62 · 채도 0.19 · 색상각 258 안팎', () => {
    const blue = oklchOf('#3182f6')
    expect(blue.l).toBeCloseTo(0.62, 2)
    expect(blue.c).toBeCloseTo(0.19, 2)
    expect(blue.h).toBeGreaterThan(255)
    expect(blue.h).toBeLessThan(261)
    expect(oklchOf('#1c1c1c').c).toBeLessThan(0.001)
  })

  it('sRGB 밖의 색은 채도를 줄여 안으로 넣는다(색상각·밝기는 유지)', () => {
    const hex = hexOfOklch({ l: 0.7, c: 0.4, h: 150 })
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    const back = oklchOf(hex)
    expect(back.l).toBeCloseTo(0.7, 1)
    expect(Math.abs(back.h - 150)).toBeLessThan(3)
  })
})

describe('palette — 강조색 진단', () => {
  it('어둡고 탁한 강조색(밝기 0.55 미만·채도 0.12 미만)을 잡는다 — 거의 검정처럼 읽힌다', () => {
    expect(accentIssues('#0e7a56')).toContain('muddy')
    expect(accentIssues('#6a3e26')).toContain('muddy')
    expect(accentIssues('#3182f6')).toEqual([])
    expect(accentIssues('#fe6e0c')).toEqual([])
  })

  it('무채색 강조색은 neutral, 옅은 파스텔은 pastel(비활성처럼 보인다)', () => {
    expect(accentIssues('#1c1c1c')).toEqual(['neutral'])
    expect(accentIssues('#a6bcf8')).toContain('pastel')
  })
})

describe('palette — 한 벌 만들기', () => {
  it('흰 글자가 4.5:1이 안 되는 밝은 파랑은 같은 색상각으로 조금 어둡게 한다', () => {
    const { tokens, notes } = buildPalette({ accent: '#3182f6' })
    expect(contrastRatio(tokens['--color-on-accent'], tokens['--color-accent'])).toBeGreaterThanOrEqual(4.5)
    expect(tokens['--color-on-accent']).toBe('#ffffff')
    const before = oklchOf('#3182f6')
    const after = oklchOf(tokens['--color-accent'])
    expect(Math.abs(after.h - before.h)).toBeLessThan(4)
    expect(after.l).toBeLessThan(before.l)
    expect(after.l).toBeGreaterThan(before.l - 0.12)
    expect(notes.join(' ')).toMatch(/어둡게/)
  })

  it('대비는 반올림 없이 재고 여유를 둔다 — 4.495:1을 4.5로 올려 통과시키면 axe는 4.49로 떨어뜨린다', () => {
    expect(contrastExact('#ffffff', '#078857')).toBeLessThan(4.5)
    for (const accent of ['#2f9e6b', '#0f9d58', '#3182f6', '#fe6e0c', '#e8590c', '#d9622b']) {
      const { tokens } = buildPalette({ accent })
      expect(contrastExact(tokens['--color-on-accent'], tokens['--color-accent'])).toBeGreaterThanOrEqual(4.5)
      for (const ground of [tokens['--color-surface'], tokens['--color-canvas'], tokens['--color-accent-soft']]) expect(contrastExact(tokens['--color-accent-text'], ground)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('강조 글자는 선택 바탕 위에서도 4.5:1 이상이다 — 선택된 칩·현재 항목의 글자다(재측정에서 #007e54 / #e6f3ee 4.47)', () => {
    for (const accent of ['#00a86b', '#03c75a', '#3182f6', '#fecc00', '#c62828', '#7c3aed']) {
      for (const tint of ['pure', 'accent'] as const) {
        const { tokens } = buildPalette({ accent, tint })
        expect(contrastExact(tokens['--color-accent-text'], tokens['--color-accent-soft'])).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('밝은 노랑은 어둡게 하지 않고 위 글자를 짙은 색으로 바꾼다', () => {
    const { tokens } = buildPalette({ accent: '#fecc00' })
    expect(tokens['--color-accent']).toBe('#fecc00')
    expect(tokens['--color-on-accent']).toBe(COLOR.text)
    expect(contrastRatio(tokens['--color-on-accent'], tokens['--color-accent'])).toBeGreaterThanOrEqual(4.5)
  })

  it('강조 글자색은 흰 면과 옅은 바탕 모두에서 4.5:1 이상이다', () => {
    for (const accent of ['#3182f6', '#fecc00', '#fe6e0c', '#00b274', '#c62828']) {
      const { tokens } = buildPalette({ accent })
      for (const ground of [tokens['--color-surface'], tokens['--color-canvas']]) expect(contrastRatio(tokens['--color-accent-text'], ground)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('선택 바탕은 강조색을 흰 면에 10% 섞은 색이다(본문 글자 4.5:1 유지)', () => {
    const { tokens } = buildPalette({ accent: '#c62828' })
    const soft = oklchOf(tokens['--color-accent-soft'])
    expect(soft.l).toBeGreaterThan(0.93)
    expect(Math.abs(soft.h - oklchOf('#c62828').h)).toBeLessThan(15)
    expect(contrastRatio(tokens['--color-text'], tokens['--color-accent-soft'])).toBeGreaterThanOrEqual(4.5)
  })

  it('무채색은 기본이 순수 회색이고 layout-tokens.css 값과 같다 — 레퍼런스 29곳 중 24곳', () => {
    const { tokens } = buildPalette({ accent: '#fe6e0c' })
    expect(tokens['--color-text']).toBe(COLOR.text)
    expect(tokens['--color-text-secondary']).toBe(COLOR.textSecondary)
    expect(tokens['--color-text-tertiary']).toBe(COLOR.textTertiary)
    expect(tokens['--color-line']).toBe(COLOR.line)
    expect(tokens['--color-canvas']).toBe(COLOR.canvas)
    for (const name of ['--color-text', '--color-text-secondary', '--color-canvas']) expect(oklchOf(tokens[name]).c).toBeLessThan(0.002)
  })

  it('tint: accent면 무채색을 강조색 색상각으로 아주 살짝 기울이고 대비는 지킨다', () => {
    for (const accent of ['#3182f6', '#fe6e0c']) {
      const { tokens } = buildPalette({ accent, tint: 'accent' })
      const hue = oklchOf(accent).h
      for (const name of ['--color-text', '--color-text-secondary', '--color-canvas']) {
        const tone = oklchOf(tokens[name])
        expect(tone.c).toBeGreaterThan(0.002)
        expect(tone.c).toBeLessThanOrEqual(0.02)
        const gap = Math.abs(((tone.h - hue + 540) % 360) - 180)
        expect(gap).toBeLessThan(25)
      }
      for (const ground of [tokens['--color-surface'], tokens['--color-canvas']]) {
        for (const name of ['--color-text', '--color-text-secondary', '--color-text-tertiary']) expect(contrastRatio(tokens[name], ground)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('탁한 강조색이면 고칠 방향을 알려 준다', () => {
    const { notes } = buildPalette({ accent: '#0e7a56' })
    expect(notes.join(' ')).toMatch(/탁/)
  })

  it('formatCss는 :root 한 블록으로 낸다', () => {
    const css = formatCss(buildPalette({ accent: '#3182f6' }).tokens)
    expect(css.startsWith(':root {')).toBe(true)
    for (const name of ['--color-accent:', '--color-on-accent:', '--color-accent-text:', '--color-accent-soft:', '--color-text:', '--color-canvas:']) expect(css).toContain(name)
  })
})

// 색각 이상 시뮬레이션 — 적색·녹색 계열은 Viénot 1999, 청색 계열은 Brettel 1997(선형 sRGB, libDaltonLens 행렬).
// 기대값은 docs/research/2026-11-26-color-science.md 6절의 계산표다(따로 계산해 같은 값을 확인했다)
describe('palette — 색각 이상 시뮬레이션', () => {
  it('회색은 세 유형 모두 그대로다(행렬의 행 합이 1)', () => {
    for (const hex of ['#000000', '#ffffff', '#1c1c1c', '#686868', '#f3f3f3']) {
      for (const type of ['protan', 'deutan', 'tritan'] as const) expect(simulateCvd({ hex, type })).toBe(hex)
    }
  })

  it('순수 빨강·초록은 녹색 계열(deutan)에서 같은 색상각으로 모인다 — 남는 것은 밝기 차뿐이다', () => {
    const [red, green] = ['#ff0000', '#00ff00'].map((hex) => oklchOf(simulateCvd({ hex, type: 'deutan' })))
    expect(Math.abs(red.h - green.h)).toBeLessThan(5)
    const normal = cvdPairCheck({ a: '#ff0000', b: '#00ff00' })
    expect(normal.deutan.distance).toBeLessThan(normal.normal.distance / 2)
  })

  it('오류 빨강 ↔ 완료 초록은 정상 0.27 → 적록 색각 이상 0.11 — 색만으로는 약하다(cvd)', () => {
    const check = cvdPairCheck({ a: '#c8341f', b: '#13795b' })
    expect(check.normal.distance).toBeCloseTo(0.27, 2)
    expect(check.protan.distance).toBeCloseTo(0.11, 2)
    expect(check.deutan.distance).toBeCloseTo(0.11, 2)
    expect(check.tritan.distance).toBeCloseTo(0.26, 2)
    expect(check.verdict).toBe('cvd')
    expect(check.distinct).toBe(false)
    // 적색 계열은 거리 0.110이지만 밝기 차가 0.103이라 남는다 — 가장 나쁜 유형은 녹색 계열이다
    expect(check.worst).toBe('deutan')
  })

  it('국내 등락 빨강 ↔ 파랑은 세 유형 모두 0.26 이상으로 남는다 — 파랑-노랑 축에 실린다', () => {
    const check = cvdPairCheck({ a: '#d0262d', b: '#1b64da' })
    expect(check.normal.distance).toBeCloseTo(0.35, 2)
    expect(check.protan.distance).toBeCloseTo(0.27, 2)
    expect(check.deutan.distance).toBeCloseTo(0.31, 2)
    expect(check.tritan.distance).toBeCloseTo(0.30, 2)
    expect(check.verdict).toBe('distinct')
    expect(check.distinct).toBe(true)
  })

  it('옛 보상 금 #b07d00 ↔ 동 #a8662b는 정상 시각에서도 0.07 — 누구에게나 가깝다(all)', () => {
    const check = cvdPairCheck({ a: '#b07d00', b: '#a8662b' })
    expect(check.normal.distance).toBeCloseTo(0.07, 2)
    expect(check.deutan.distance).toBeCloseTo(0.06, 2)
    expect(check.verdict).toBe('all')
    expect(check.worst).toBe('normal')
  })

  it('밝기 차가 문턱을 넘으면 색상이 겹쳐도 구별된다 — 밝기는 색각 이상에서도 남는 신호다', () => {
    const check = cvdPairCheck({ a: '#ffffff', b: '#000000' })
    expect(check.verdict).toBe('distinct')
    expect(check.deutan.lightness).toBeGreaterThan(CVD_MIN_LIGHTNESS)
  })

  it('문턱은 이름 있는 상수다 — 색각 이상 0.12·밝기 0.1, 정상 0.1(판단값)', () => {
    expect(CVD_MIN_DISTANCE).toBe(0.12)
    expect(CVD_MIN_LIGHTNESS).toBe(0.1)
    expect(NORMAL_MIN_DISTANCE).toBe(0.1)
  })

  it('보상 색 세 값(금·은·동)은 정상·세 유형 모두에서 서로 구별된다', () => {
    const rewards = [COLOR.reward, COLOR.rewardSilver, COLOR.rewardBronze]
    for (let i = 0; i < rewards.length; i += 1) {
      for (let j = i + 1; j < rewards.length; j += 1) expect(cvdPairCheck({ a: rewards[i], b: rewards[j] }).verdict, `${rewards[i]} ↔ ${rewards[j]}`).toBe('distinct')
    }
  })
})
