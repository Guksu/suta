/**
 * 모션 토큰 사슬 검사의 순수 로직 — 패턴 CSS의 시간·이징이 토큰을 거치는지 본다.
 *
 * 왜: 패턴 CSS가 `var(--sheet-duration, 350ms)`처럼 숫자로 끝나면, 프로젝트가 motion-tokens.css를 넣어도
 * 패턴은 따라오지 않는다. 0.22까지 패턴 CSS 53개 중 토큰을 참조한 파일이 0개였고, 기본 시간이 14종으로 흩어졌다.
 * 그래서 시간·이징은 `var(--x, var(--motion-…, 기본값))` 사슬을 거치거나, 같은 줄에 "토큰 밖" 주석으로 이유를 적어야 한다.
 *
 * 범위
 * - transition·animation 계열 속성과 사용자 정의 속성(--x)의 값만 본다. 다른 속성의 숫자는 시간이 아니다.
 * - 동작 줄이기(prefers-reduced-motion: reduce) 블록 안은 보지 않는다 — 줄인 페이드는 토큰의 줄인 값과 일부러 다르다.
 * - 0·0s(visibility 계단 지연)는 시간이 아니다. linear·steps()는 토큰과 같은 뜻이라 어긋날 수 없다.
 *
 * validateSkills.mjs가 파일을 읽어 넘기고, 판정은 여기서 한다 — 그래야 테스트할 수 있다.
 */

export type MotionFinding = { line: number; kind: 'time' | 'ease'; value: string; text: string }
export type StaleFallback = { line: number; token: string; fallback: string; expected: string }

const EXEMPT = '토큰 밖'
const MOTION_PROPS = /^(transition|transition-duration|transition-delay|transition-timing-function|animation|animation-duration|animation-delay|animation-timing-function)$/
const TIME = /(?<![\w.#-])(\d*\.?\d+)(ms|s)(?![\w-])/g
const BEZIER = /cubic-bezier\([^)]*\)/g
const EASE_KEYWORD = /(?<![\w-])ease(?:-in-out|-in|-out)?(?![\w-])/g
// 바로 앞이 `var(--motion-이름, `이면 토큰 사슬의 맨 끝 기본값이다
const CHAINED = /var\(\s*--motion-[\w-]+\s*,\s*$/

// 주석과 문자열을 같은 길이의 공백으로 — 위치(줄 번호)는 그대로 두고 내용만 지운다
const mask = (css: string) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(["'])(?:(?!\1)[^\\\n]|\\.)*\1/g, (m) => ' '.repeat(m.length))

// 동작 줄이기 블록의 [시작, 끝) 범위
const reducedRanges = (masked: string) => {
  const ranges: Array<[number, number]> = []
  for (const match of masked.matchAll(/@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g)) {
    let depth = 1
    let i = (match.index ?? 0) + match[0].length
    while (i < masked.length && depth > 0) {
      if (masked[i] === '{') depth += 1
      if (masked[i] === '}') depth -= 1
      i += 1
    }
    ranges.push([match.index ?? 0, i])
  }
  return ranges
}

const lineAt = (text: string, offset: number) => text.slice(0, offset).split('\n').length

/** 선언 하나 — 속성 이름과 값의 시작 위치 */
const declarations = (masked: string) => {
  const result: Array<{ prop: string; value: string; valueStart: number }> = []
  let start = 0
  for (let i = 0; i <= masked.length; i += 1) {
    const ch = masked[i]
    if (i < masked.length && ch !== '{' && ch !== '}' && ch !== ';') continue
    const segment = masked.slice(start, i)
    // `{` 앞은 선택자·at 규칙이다
    if (ch !== '{') {
      const colon = segment.indexOf(':')
      if (colon > 0) {
        const prop = segment.slice(0, colon).trim()
        if (/^(--[\w-]+|[a-z-]+)$/.test(prop)) result.push({ prop, value: segment.slice(colon + 1), valueStart: start + colon + 1 })
      }
    }
    start = i + 1
  }
  return result
}

/** 토큰 파일(:root)의 기본값 — 동작 줄이기 블록의 값은 뺀다. 같은 이름이 여러 번 나오면 처음 값(넓은 화면 블록보다 앞) */
export const parseTokenDefaults = (css: string) => {
  const masked = mask(css)
  let base = masked
  for (const [from, to] of reducedRanges(masked).reverse()) base = base.slice(0, from) + base.slice(to)
  const tokens: Record<string, string> = {}
  for (const [, name, value] of base.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    if (!(name in tokens)) tokens[name] = value.trim()
  }
  return tokens
}

/** 토큰을 거치지 않은 시간·이징 — 같은 줄에 "토큰 밖" 주석이 있으면 이유가 적힌 예외로 본다 */
export const findUnchainedMotion = (css: string): MotionFinding[] => {
  const lines = css.split('\n')
  const masked = mask(css)
  const skipped = reducedRanges(masked)
  const inReduced = (offset: number) => skipped.some(([from, to]) => offset >= from && offset < to)
  const found: Array<MotionFinding & { offset: number }> = []

  const report = ({ offset, kind, value, before }: { offset: number; kind: MotionFinding['kind']; value: string; before: string }) => {
    if (inReduced(offset) || CHAINED.test(before)) return
    const line = lineAt(css, offset)
    const original = lines[line - 1] ?? ''
    if (original.includes(EXEMPT)) return
    found.push({ line, kind, value, text: original.trim(), offset })
  }

  for (const { prop, value, valueStart } of declarations(masked)) {
    if (!MOTION_PROPS.test(prop) && !prop.startsWith('--')) continue
    for (const match of value.matchAll(TIME)) {
      if (Number.parseFloat(match[1]) === 0) continue
      const index = match.index ?? 0
      report({ offset: valueStart + index, kind: 'time', value: match[0], before: value.slice(0, index) })
    }
    for (const match of value.matchAll(BEZIER)) {
      const index = match.index ?? 0
      report({ offset: valueStart + index, kind: 'ease', value: match[0], before: value.slice(0, index) })
    }
    for (const match of value.matchAll(EASE_KEYWORD)) {
      const index = match.index ?? 0
      report({ offset: valueStart + index, kind: 'ease', value: match[0], before: value.slice(0, index) })
    }
  }
  return found.sort((a, b) => a.offset - b.offset).map(({ offset: _offset, ...rest }) => rest)
}

const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase()

/**
 * `var(--토큰, 기본값)`의 기본값이 토큰 파일의 값과 다른 곳.
 * 다르면 토큰 파일을 넣었을 때와 안 넣었을 때 화면이 달라진다. 기본값이 다시 변수면 보지 않는다.
 */
export const findStaleFallbacks = ({ css, tokens }: { css: string; tokens: Record<string, string> }): StaleFallback[] => {
  const masked = mask(css)
  const found: StaleFallback[] = []
  for (const match of masked.matchAll(/var\(\s*(--[\w-]+)\s*,/g)) {
    const token = match[1]
    if (!(token in tokens)) continue
    // 짝이 맞는 닫는 괄호까지가 기본값이다
    let depth = 1
    const from = (match.index ?? 0) + match[0].length
    let i = from
    while (i < masked.length && depth > 0) {
      if (masked[i] === '(') depth += 1
      if (masked[i] === ')') depth -= 1
      i += 1
    }
    const fallback = masked.slice(from, i - 1).trim()
    if (fallback.startsWith('var(')) continue
    if (normalize(fallback) !== normalize(tokens[token])) {
      found.push({ line: lineAt(css, match.index ?? 0), token, fallback, expected: tokens[token] })
    }
  }
  return found
}
