/* @shared-core auditCore.ts origin: motion-audit — 다른 패턴 assets에 복사될 때 이 헤더를 유지한다(저장소 검사가 원본과 해시 비교) */
/**
 * 정적 검사기 공통 코어 — 결과 형식(Finding)과 소스 스캔 도구 (의존성 0, DOM 없음).
 *
 * motion-audit와 layout-audit가 같은 파일을 쓴다. 결과 형식이 같아야 두 검사를 한 번에 돌려 합칠 수 있고,
 * CSS를 블록으로 자르는 방법이 같아야 두 검사가 같은 줄 번호를 말한다.
 */

export type Severity = 'error' | 'warn'

export type Finding = {
  file: string
  line: number
  rule: string
  severity: Severity
  message: string
  /** 어떤 패턴·기법으로 고치는가 */
  fix: string
  /** 파일 단위 요약 지적(종류 수·척도 밖 간격 등)에 관여한 줄 전체 — 편집 후 훅이 이번 편집과 겹치는지 볼 때 쓴다 */
  lines?: number[]
}

export type Source = { file: string; text: string }

export type CssBlock = {
  /** @media·@supports 같은 묶음 선택자 + 자기 선택자 */
  selector: string
  /** SCSS·CSS 중첩을 풀어 쓴 자기 선택자(묶음 제외) — `.card { .price {} }`의 안쪽은 `.card .price` */
  fullSelector: string
  /** 중괄호 안 전체 — 중첩 블록 포함 */
  body: string
  /** 중첩 블록을 공백으로 지운 자기 선언만 — 부모 선언과 자식 선언이 섞이지 않는다 */
  ownBody: string
  /** body가 시작하는 줄 */
  line: number
  inReducedMotion: boolean
}

export type Declaration = { prop: string; value: string; line: number }

/** 줄바꿈만 남기고 공백으로 — 지운 자리의 줄 번호를 보존한다 */
export const blank = (part: string) => part.replace(/[^\n]/g, ' ')

/** 주석을 공백으로 지우되 줄바꿈은 남긴다 — 줄 번호가 어긋나면 file:line이 거짓말을 한다 */
export const blankComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, blank)

export const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length

const GROUP = /^@(media|supports|container|layer)/i

/** 중첩 선택자를 부모에 붙인다 — `&`가 있으면 그 자리에, 없으면 자손으로. 쉼표 목록은 첫 항목만 쓴다(판정용 근사) */
const resolveNested = ({ parent, child }: { parent: string; child: string }) => {
  if (!parent) return child
  const base = parent.split(',')[0].trim()
  return child
    .split(',')
    .map((part) => (part.includes('&') ? part.trim().replace(/&/g, base) : `${base} ${part.trim()}`))
    .join(', ')
}

/** 선택자 블록 단위로 잘라 (선택자, 본문, 시작 줄). 글자 단위로 중괄호를 세므로 한 줄 블록도 잡는다.
 * @media·@supports는 선택자 앞에 붙여 표시하고, 그 안에 prefers-reduced-motion이 있으면 inReducedMotion */
export const cssBlocks = (text: string): CssBlock[] => {
  // 주석은 같은 길이의 공백으로 바꿔 줄 번호를 보존한다
  const src = blankComments(text)
  const blocks: CssBlock[] = []
  type Open = { selector: string; fullSelector: string; selectorStart: number; bodyStart: number; isGroup: boolean; nested: Array<[number, number]> }
  const stack: Open[] = []
  let selectorStart = 0
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (ch === '{') {
      const selector = src.slice(selectorStart, i).trim()
      const isGroup = GROUP.test(selector)
      const parentRule = [...stack].reverse().find((open) => !open.isGroup)
      const fullSelector = isGroup ? parentRule?.fullSelector ?? '' : resolveNested({ parent: parentRule?.fullSelector ?? '', child: selector })
      stack.push({ selector, fullSelector, selectorStart, bodyStart: i + 1, isGroup, nested: [] })
      selectorStart = i + 1
    } else if (ch === '}') {
      const top = stack.pop()
      selectorStart = i + 1
      if (!top) continue
      // 바깥 블록의 자기 선언에서 이 블록(선택자부터 닫는 괄호까지)을 빼도록 범위를 남긴다
      const outer = stack[stack.length - 1]
      if (outer) outer.nested.push([top.selectorStart, i + 1])
      if (top.isGroup) continue
      const groups = stack.filter((s) => s.isGroup).map((s) => s.selector)
      const body = src.slice(top.bodyStart, i)
      let ownBody = body
      for (const [from, to] of top.nested) {
        const a = from - top.bodyStart
        const b = to - top.bodyStart
        ownBody = ownBody.slice(0, a) + blank(ownBody.slice(a, b)) + ownBody.slice(b)
      }
      blocks.push({
        selector: [...groups, top.selector].join(' '),
        fullSelector: top.fullSelector,
        body,
        ownBody,
        line: lineOf(src, top.bodyStart),
        inReducedMotion: groups.some((g) => /prefers-reduced-motion\s*:\s*reduce/.test(g)),
      })
    } else if (ch === ';') {
      selectorStart = i + 1 // 선언의 끝 — 다음 선택자(최상위 @import 다음, 중첩 블록 앞)는 여기서 시작한다
    }
  }
  return blocks
}

/** 블록 본문을 선언(속성·값·줄)으로 — 값이 빈 것은 뺀다 */
export const declarationsOf = ({ body, line }: { body: string; line: number }): Declaration[] => {
  const out: Declaration[] = []
  let offset = 0
  for (const decl of body.split(';').map((d) => d.trim()).filter(Boolean)) {
    const at = body.indexOf(decl, offset)
    offset = at + decl.length
    const [rawProp, ...rest] = decl.split(':')
    const value = rest.join(':').trim()
    if (!value) continue
    out.push({ prop: rawProp.trim().toLowerCase(), value, line: line + body.slice(0, at).split('\n').length - 1 })
  }
  return out
}

/** `{marker}` 주석이 있는 줄과 그 다음 줄 — 이유를 적은 의도적 예외. 검사에서 뺀다 */
export const ignoredLines = ({ text, marker }: { text: string; marker: RegExp }) => {
  const set = new Set<number>()
  text.split('\n').forEach((line, i) => {
    if (marker.test(line)) {
      set.add(i + 1)
      set.add(i + 2)
    }
  })
  return set
}

export const sortFindings = (findings: Finding[]) => findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

/* ---------------- JS·TS 코드 스캔 (React Native 스타일 객체·애니메이션 호출) ---------------- */

const QUOTES = new Set(["'", '"', '`'])
const OPEN_TO_CLOSE: Record<string, string> = { '(': ')', '[': ']', '{': '}' }

/** 문자열은 그대로 두고 // · 블록 주석만 공백으로 지운다 — 'https://…' 같은 문자열 속 //를 주석으로 보지 않는다 */
export const codeWithoutComments = (text: string) => {
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (QUOTES.has(ch)) {
      let j = i + 1
      while (j < text.length && text[j] !== ch) j += text[j] === '\\' ? 2 : 1
      out += text.slice(i, j + 1)
      i = j + 1
    } else if (ch === '/' && text[i + 1] === '/') {
      const end = text.indexOf('\n', i)
      const stop = end === -1 ? text.length : end
      out += blank(text.slice(i, stop))
      i = stop
    } else if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      const stop = end === -1 ? text.length : end + 2
      out += blank(text.slice(i, stop))
      i = stop
    } else {
      out += ch
      i += 1
    }
  }
  return out
}

/** 여는 괄호 위치 → 짝이 맞는 닫는 괄호 위치(문자열 안 괄호는 건너뛴다). 짝이 없으면 -1 */
export const matchingClose = (code: string, open: number) => {
  const stack: string[] = []
  for (let i = open; i < code.length; i += 1) {
    const ch = code[i]
    if (QUOTES.has(ch)) {
      let j = i + 1
      while (j < code.length && code[j] !== ch) j += code[j] === '\\' ? 2 : 1
      i = j
    } else if (OPEN_TO_CLOSE[ch]) stack.push(OPEN_TO_CLOSE[ch])
    else if (ch === stack[stack.length - 1]) {
      stack.pop()
      if (stack.length === 0) return i
    }
  }
  return -1
}

/** [start, end) 구간을 깊이 0의 쉼표로 나눈다 — 각 조각의 앞뒤 공백을 뺀 글자와 시작 위치 */
export const splitTopLevelCode = ({ code, start, end }: { code: string; start: number; end: number }) => {
  const parts: Array<{ text: string; index: number }> = []
  let depth = 0
  let from = start
  const close = (to: number) => {
    const raw = code.slice(from, to)
    const lead = raw.length - raw.trimStart().length
    if (raw.trim()) parts.push({ text: raw.trim(), index: from + lead })
  }
  for (let i = start; i < end; i += 1) {
    const ch = code[i]
    if (QUOTES.has(ch)) {
      let j = i + 1
      while (j < end && code[j] !== ch) j += code[j] === '\\' ? 2 : 1
      i = j
    } else if (OPEN_TO_CLOSE[ch]) depth += 1
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1
    else if (ch === ',' && depth === 0) {
      close(i)
      from = i + 1
    }
  }
  close(end)
  return parts
}

/** `callee(` 호출마다 인자 구간 — 정규식 이름(예: /useAnimatedStyle/)과 여는 괄호·닫는 괄호 위치 */
export const callsOf = ({ code, callee }: { code: string; callee: RegExp }) => {
  const pattern = new RegExp(`(?:^|[^\\w$.])(${callee.source})\\s*\\(`, 'g')
  const calls: Array<{ index: number; open: number; close: number }> = []
  for (const match of code.matchAll(pattern)) {
    const open = (match.index ?? 0) + match[0].length - 1
    const close = matchingClose(code, open)
    if (close > open) calls.push({ index: (match.index ?? 0) + match[0].indexOf(match[1]), open, close })
  }
  return calls
}

/** 결과를 `file:line rule message` 줄로 — 에이전트가 그대로 읽고 고칠 수 있는 형식 */
export const formatFindings = (findings: Finding[]) =>
  findings.map((f) => `${f.file}:${f.line} [${f.severity}] ${f.rule} — ${f.message}\n    → ${f.fix}`).join('\n')

export const summarize = (findings: Finding[]) => ({
  errors: findings.filter((f) => f.severity === 'error').length,
  warnings: findings.filter((f) => f.severity === 'warn').length,
})
