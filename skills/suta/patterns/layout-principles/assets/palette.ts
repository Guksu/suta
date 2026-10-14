/**
 * layout-principles — 색 조합(의존성 0). 강조색 하나에서 한 벌을 만든다:
 * 주 버튼 면(--color-accent)과 그 위 글자, 링크·선택 글자(--color-accent-text), 선택 바탕(--color-accent-soft), 무채색 다섯.
 *
 * 왜 한 벌로 만드는가: AI는 강조색만 고르고 나머지는 프레임워크 회색을 그대로 쓴다. 그 회색은 대개 푸른 기운(slate)이라
 * 따뜻한 강조색(빨강·주황·노랑) 옆에서 차갑고 탁해 보인다. 잘 만든 앱 31곳을 재 보니 글자·면의 무채색은 순수 회색(29곳 중 24곳)이거나
 * 강조색 쪽으로만 아주 살짝 기울었다(파랑 강조색 서비스 4곳). 강조색은 맑았다 — 밝기 중앙값 0.67, 채도 중앙값 0.18(OKLCH).
 * 근거와 판단 기준은 references/tone.md 3·4절.
 *
 * CLI: `node <스킬 폴더>/scripts/palette.mjs <강조색 hex> [--tint]` — :root 블록을 출력한다.
 */
import { COLOR } from './layoutTokens.ts'

export type Oklch = { l: number; c: number; h: number }
export type Tint = 'pure' | 'accent'
export type AccentIssue = 'muddy' | 'neutral' | 'pastel'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

const rgbOf = (hex: string) => {
  const raw = hex.trim().replace('#', '')
  const full = raw.length === 3 ? [...raw].map((d) => d + d).join('') : raw.slice(0, 6)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
}

const hexOf = (rgb: number[]) => `#${rgb.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`

/** 상대 휘도(WCAG) */
const luminanceOf = (hex: string) => {
  const [r, g, b] = rgbOf(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * 반올림하지 않은 명암비. layoutTokens의 contrastRatio는 소수 둘째 자리로 반올림해 4.495를 4.5로 올린다 —
 * 색을 만들 때 그 값으로 경계를 맞추면 axe는 4.49로 떨어뜨린다(재측정에서 실제로 났다)
 */
export const contrastExact = (a: string, b: string) => {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** 만드는 색의 목표 대비 — 4.5에 여유를 둔다(브라우저·검사 도구마다 반올림이 달라 경계값은 떨어질 수 있다) */
const TARGET = 4.6

/** sRGB hex → OKLCH(밝기 0~1, 채도 0~0.4, 색상각 0~360) */
export const oklchOf = (hex: string): Oklch => {
  const [r, g, b] = rgbOf(hex).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}

const linearOf = ({ l, c, h }: Oklch) => {
  const A = c * Math.cos((h * Math.PI) / 180)
  const B = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0001 && v <= 1.0001)

/** OKLCH → sRGB hex. 화면에 없는 색이면 밝기·색상각을 두고 채도만 줄여 넣는다 */
export const hexOfOklch = (color: Oklch): string => {
  let linear = linearOf(color)
  if (!inGamut(linear)) {
    let lo = 0
    let hi = color.c
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2
      if (inGamut(linearOf({ ...color, c: mid }))) lo = mid
      else hi = mid
    }
    linear = linearOf({ ...color, c: lo })
  }
  return hexOf(linear.map((v) => toGamma(clamp01(v))))
}

/**
 * 강조색 진단 — 레퍼런스 31곳의 강조색은 밝기 0.58~0.76, 채도 0.16~0.22(사분위)였다.
 * - muddy: 밝기 0.55 미만 + 채도 0.03~0.12 — 거의 검정처럼 읽혀 선택 상태·주 버튼이 묻힌다(레퍼런스 1곳, 브랜드색)
 * - neutral: 무채색 강조색 — 근거 없는 화면의 기본값으로는 되지만, 서비스 성격이 있으면 색을 고른다
 * - pastel: 밝기 0.78 이상 + 채도 0.12 미만 — 비활성 버튼처럼 보인다
 */
export const accentIssues = (hex: string): AccentIssue[] => {
  const { l, c } = oklchOf(hex)
  if (c < 0.03) return ['neutral']
  const issues: AccentIssue[] = []
  if (l < 0.55 && c < 0.12) issues.push('muddy')
  if (l >= 0.78 && c < 0.12) issues.push('pastel')
  return issues
}

/** 같은 색상각·채도에서 밝기만 낮춰 바탕 위 대비가 target 이상이 되는 가장 밝은 색 */
const darkenUntil = ({ hex, ground, target }: { hex: string; ground: string; target: number }) => {
  if (contrastExact(hex, ground) >= target) return hex
  const base = oklchOf(hex)
  let lo = 0
  let hi = base.l
  for (let i = 0; i < 28; i += 1) {
    const mid = (lo + hi) / 2
    if (contrastExact(hexOfOklch({ ...base, l: mid }), ground) >= target) lo = mid
    else hi = mid
  }
  return hexOfOklch({ ...base, l: lo })
}

/** 흰 면에 강조색을 ratio만큼 섞는다(선택 칩·현재 탭 바탕) — CSS color-mix(in srgb, accent 10%, white)와 같은 값 */
const mixWithWhite = ({ hex, ratio }: { hex: string; ratio: number }) => hexOf(rgbOf(hex).map((v) => v * ratio + (1 - ratio)))

/**
 * 무채색 다섯. pure는 layout-tokens.css 값 그대로, accent는 같은 밝기에서 강조색 색상각으로 채도를 아주 조금(글자 0.012, 면 0.006 — 레퍼런스의 기운 면은 0.006~0.009).
 * 기울인 뒤에도 글자 세 단계가 흰 면·옅은 바탕에서 4.5:1을 넘는지 확인하고, 모자라면 그 단계만 어둡게 한다.
 */
const neutralsFor = ({ accent, tint }: { accent: Oklch; tint: Tint }) => {
  const base = { text: COLOR.text, textSecondary: COLOR.textSecondary, textTertiary: COLOR.textTertiary, line: COLOR.line, canvas: COLOR.canvas }
  if (tint === 'pure' || accent.c < 0.03) return base
  const lean = ({ hex, chroma }: { hex: string; chroma: number }) => hexOfOklch({ l: oklchOf(hex).l, c: chroma, h: accent.h })
  const canvas = lean({ hex: base.canvas, chroma: 0.006 })
  const safe = (hex: string) => darkenUntil({ hex: darkenUntil({ hex, ground: '#ffffff', target: TARGET }), ground: canvas, target: TARGET })
  return {
    text: safe(lean({ hex: base.text, chroma: 0.012 })),
    textSecondary: safe(lean({ hex: base.textSecondary, chroma: 0.014 })),
    textTertiary: safe(lean({ hex: base.textTertiary, chroma: 0.012 })),
    line: lean({ hex: base.line, chroma: 0.005 }),
    canvas,
  }
}

const fmt = (o: Oklch) => `밝기 ${o.l.toFixed(2)} · 채도 ${o.c.toFixed(2)}`

/**
 * 강조색 하나 → 한 벌. 주 버튼 위 글자는 4.5:1 이상(만들 때는 여유를 둔 4.6)이 되게 한다:
 * 흰 글자가 되면 그대로, 밝은 노랑·연두처럼 짙은 글자가 되면 위 글자를 짙게, 둘 다 아니면 같은 색상각으로 조금 어둡게 한다.
 */
export const buildPalette = ({ accent, tint = 'pure' }: { accent: string; tint?: Tint }) => {
  const source = hexOf(rgbOf(accent))
  const tone = oklchOf(source)
  const neutrals = neutralsFor({ accent: tone, tint })
  const notes: string[] = []

  let fill = source
  let onAccent: string = COLOR.surface
  const ratio = (a: string, b: string) => contrastExact(a, b).toFixed(2)
  if (contrastExact(COLOR.surface, source) < 4.5) {
    if (tone.l >= 0.75 && contrastExact(neutrals.text, source) >= TARGET) {
      onAccent = neutrals.text
      notes.push(`밝은 강조색이라 주 버튼 위 글자를 짙은 색(${neutrals.text})으로 둔다 — 흰 글자는 ${ratio(COLOR.surface, source)}:1이라 읽히지 않는다.`)
    } else {
      fill = darkenUntil({ hex: source, ground: COLOR.surface, target: TARGET })
      notes.push(`흰 글자가 ${ratio(COLOR.surface, source)}:1이라 주 버튼 면을 같은 색상각으로 조금 어둡게 했다(${source} → ${fill}). 로고·그림 속 브랜드색은 원래 값을 쓴다.`)
    }
  }
  // 강조 글자는 흰 면·옅은 바탕·선택 바탕(선택된 칩·현재 항목) 세 곳에 놓인다. 바탕이 모두 밝아 어둡게만 맞추면 앞의 조건도 지켜진다
  const soft = mixWithWhite({ hex: fill, ratio: 0.1 })
  const accentText = [COLOR.surface, neutrals.canvas, soft].reduce((hex, ground) => darkenUntil({ hex, ground, target: TARGET }), fill)
  if (accentText !== fill) notes.push(`링크·선택 글자는 흰 면·옅은 바탕·선택 바탕에서 4.5:1이 되게 ${accentText}로 둔다.`)

  const issues = accentIssues(source)
  if (issues.includes('muddy')) {
    // 같은 색상각에서 레퍼런스 쪽(밝기 0.6·채도 0.15 이상)으로 옮긴 뒤, 흰 글자 4.5:1이 되게 맞춘 제안값
    const suggestion = darkenUntil({ hex: hexOfOklch({ l: Math.max(tone.l, 0.6), c: Math.max(tone.c, 0.15), h: tone.h }), ground: COLOR.surface, target: TARGET })
    notes.push(`탁한 강조색이다(${fmt(tone)}) — 거의 검정처럼 읽혀 선택 상태·주 버튼이 묻힌다. 레퍼런스 31곳의 강조색은 밝기 0.58~0.76, 채도 0.16~0.22였다. 브랜드색이 아니면 같은 색상각에서 채도를 올린다(예: ${suggestion}).`)
  }
  if (issues.includes('pastel')) notes.push(`옅은 파스텔이다(${fmt(tone)}) — 채운 버튼이 비활성처럼 보인다. 채도를 올리거나 더 짙은 같은 계열을 쓴다.`)
  if (issues.includes('neutral')) notes.push('무채색 강조색이다 — 서비스 이름·업종·내용에 근거가 있으면 색을 고른다(tone.md 3절).')

  const tokens: Record<string, string> = {
    '--color-accent': fill,
    '--color-on-accent': onAccent,
    '--color-accent-text': accentText,
    '--color-accent-soft': soft,
    '--color-text': neutrals.text,
    '--color-text-secondary': neutrals.textSecondary,
    '--color-text-tertiary': neutrals.textTertiary,
    '--color-line': neutrals.line,
    '--color-surface': COLOR.surface,
    '--color-canvas': neutrals.canvas,
  }
  return { tokens, notes, issues }
}

/** :root 한 블록 — layout-tokens.css 뒤에 두면 같은 이름의 값을 덮는다 */
export const formatCss = (tokens: Record<string, string>) => `:root {\n${Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}\n`
