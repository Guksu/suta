/**
 * 요구 충족률(fidelity) 측정의 순수 로직 (DOM·파일·프로세스 없음 — 브라우저 실행은 scripts/benchmark/fidelity.mjs).
 *
 * 요청문을 낱개 요구로 나눈 목록(evals/benchmark/fidelity/requirements.json)을 읽고,
 * 브라우저가 모아 온 관찰값(계산된 스타일·상자 좌표·글자·속성)으로 요구마다 다섯 결과 중 하나를 낸다.
 *  - 지킴(met)·어김(violated)
 *  - 찾지 못함(not-found): 대상이나 조작 대상을 찾지 못했다. 화면의 잘못인지 찾는 규칙의 모자람인지 모르므로 어김과 따로 센다
 *  - 판정 필요(needs-judge): 기계로 볼 수 없어 판정 모델이 봐야 한다(type: judge)
 *  - 미지원(unsupported): 요구 목록 초안의 문법이 이 검사기보다 넓다. 지원하는 핵심 문법 밖의 키를 쓴 요구는
 *    재지 않고 이유(키 이름)만 남긴다. 충족률 분모에 넣지 않는다
 *
 * 설계: docs/research/2026-11-26-fidelity.md 4절. 브라우저 쪽은 관찰값만 모으고 판정은 여기서 한다 — clipCheck.ts와 같은 나눔이다.
 * Node가 타입만 벗겨 그대로 실행하므로 enum·namespace·매개변수 속성을 쓰지 않는다.
 */

export type Box = { left: number; right: number; top: number; bottom: number }
export type Rgba = { r: number; g: number; b: number; a: number }
export type Result = 'met' | 'violated' | 'not-found' | 'needs-judge' | 'unsupported'
export type Support = 'supported' | 'unsupported' | 'judge'

type Json = Record<string, unknown>

export type Requirement = { id: string; kind: string; text: string; conflict?: Json; check: Json }
export type ParsedRequirement = Requirement & { order: number; total: number; support: Support; reasons: string[] }
/** pools: 이 요청의 요구들이 쓴 앵커 목록(unit) 전부 — 앵커가 하나뿐인 단위를 찾을 때 짝으로 쓴다 */
export type ParsedRequest = { id: string; platform: string; requirements: ParsedRequirement[]; pools: string[][] }
export type ParsedSpec = { requests: ParsedRequest[]; errors: string[]; warnings: string[] }

/** 브라우저가 대상 요소마다 모은 값. values는 style이면 계산된 스타일, attr이면 속성 값(없으면 null) */
export type ObservedElement = { visible: boolean; text?: string; box?: Box; values?: Record<string, string | null> }
/** error: 예외, missing: 대상·조작 대상을 찾지 못한 이유, then: check.then의 조작 뒤 관찰 */
export type Observation = { error?: string; missing?: string; elements?: ObservedElement[]; then?: Observation }

export type Verdict = { result: Result; detail: string }

// ── 지원 범위 ────────────────────────────────────────────────────────────────

/** 설계 표(4.2절)에 있는 type — 이 밖의 type은 요구 목록의 오타일 수 있어 경고한다. position은 수정 요청(I20)이 쓴다 */
const KNOWN_TYPES = ['style', 'spacing', 'columns', 'exists', 'count', 'text', 'attr', 'order', 'interaction', 'timing', 'motion', 'focus', 'reducedMotion', 'copyTone', 'covered', 'size', 'judge', 'position']

const CHECK_KEYS = ['type', 'viewport', 'state', 'target', 'property', 'steps', 'then', 'expect', 'note']
const TARGET_KEYS = ['role', 'name', 'exact', 'nth', 'all', 'text', 'textMatches', 'unit', 'inner', 'pinned', 'dialog', 'near', 'within']
// 대상을 고르는 기준 — 이것 없이 nth·within만 있는 대상은 무엇을 찾는지 모른다
const TARGET_BASES = ['role', 'text', 'textMatches', 'unit', 'pinned', 'dialog']
const STEP_KEYS: Record<string, string[]> = {
  click: ['target'],
  hover: ['target'],
  focus: ['target'],
  longPress: ['target', 'ms'],
  drag: ['target', 'dx', 'dy'],
  type: ['target', 'text'],
  scroll: ['y'],
  wait: ['ms'],
  press: ['key'],
}
/** type마다 쓸 수 있는 expect 키. 같은 키라도 type에 맞지 않으면(exists에 count) 무엇을 재야 할지 모호하므로 미지원이다 */
const EXPECT_KEYS: Record<string, string[]> = {
  style: ['px', 'color', 'equals', 'matches', 'min', 'max', 'tol'],
  attr: ['equals', 'matches', 'visible'],
  text: ['equals', 'matches'],
  exists: ['visible'],
  count: ['count', 'min', 'max'],
  columns: ['count', 'min', 'max'],
  spacing: ['row', 'column'],
}
const STATES = ['loading', 'empty', 'error']

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const toList = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value])
const unique = (list: string[]) => [...new Set(list)]

// 색 속성 — 기대값 color를 쓰는 속성
const isColorProperty = (property: string) => /(^|-)color$/.test(property) || property === 'fill' || property === 'stroke'
// 길이 속성 — 기대값 px를 쓰는 속성. 색·굵기·정렬처럼 px로 읽을 수 없는 속성에 px를 대지 않으려고 나눈다
const isLengthProperty = (property: string) =>
  /^(width|height|(min|max)-(width|height)|font-size|line-height|letter-spacing|gap|row-gap|column-gap|top|right|bottom|left|inset.*|(padding|margin)(-.+)?|border(-.+)?-radius|border(-.+)?-width|outline-width|outline-offset)$/.test(property)

/** 속성 배열과 기대값 배열을 차례로 맞춘다 — color는 색 속성끼리, px는 길이 속성끼리, equals·matches는 모든 속성의 순서로 */
const expectFor = ({ expect, properties, index }: { expect: Json; properties: string[]; index: number }): Json => {
  const property = properties[index]
  const slice: Json = {}
  const pick = (value: unknown, at: number) => (Array.isArray(value) ? value[at] : value)
  if (isColorProperty(property) && expect.color !== undefined) {
    const at = properties.slice(0, index).filter(isColorProperty).length
    slice.color = pick(expect.color, at)
  }
  if (isLengthProperty(property) && expect.px !== undefined) {
    const at = properties.slice(0, index).filter(isLengthProperty).length
    slice.px = pick(expect.px, at)
  }
  for (const key of ['equals', 'matches']) if (expect[key] !== undefined) slice[key] = pick(expect[key], index)
  if (!isColorProperty(property)) for (const key of ['min', 'max']) if (expect[key] !== undefined) slice[key] = expect[key]
  for (const key of Object.keys(slice)) if (slice[key] === undefined) delete slice[key]
  if (Object.keys(slice).length > 0 && expect.tol !== undefined) slice.tol = expect.tol
  return slice
}

const targetReasons = (target: unknown): string[] => {
  if (typeof target === 'string') return [`target:${target.startsWith('$') ? '$target' : '글자'}`]
  if (!isObject(target)) return ['target:객체 아님']
  const reasons: string[] = []
  for (const key of Object.keys(target)) if (!TARGET_KEYS.includes(key)) reasons.push(`target.${key}`)
  if (target.pinned !== undefined && target.pinned !== 'top' && target.pinned !== 'bottom') reasons.push(`target.pinned:${String(target.pinned)}`)
  if (target.dialog !== undefined && target.dialog !== true) reasons.push('target.dialog:true 아님')
  if (target.unit !== undefined && !(Array.isArray(target.unit) && target.unit.every((a) => typeof a === 'string'))) reasons.push('target.unit:글자 배열 아님')
  for (const key of ['inner', 'near', 'within']) if (target[key] !== undefined) reasons.push(...targetReasons(target[key]))
  // 모르는 키가 있으면 그 키가 기준 노릇을 하려던 것이다 — 기준 없음은 따로 적지 않는다
  if (reasons.length === 0 && !TARGET_BASES.some((key) => target[key] !== undefined)) reasons.push('target:기준 없음')
  return reasons
}

const stepReasons = (steps: unknown): string[] => {
  if (!Array.isArray(steps)) return ['steps:배열 아님']
  const reasons: string[] = []
  for (const step of steps) {
    if (!isObject(step) || typeof step.do !== 'string') {
      reasons.push('steps:do 없음')
      continue
    }
    const allowed = STEP_KEYS[step.do]
    if (!allowed) {
      reasons.push(`steps.do:${step.do}`)
      continue
    }
    for (const key of Object.keys(step)) if (key !== 'do' && !allowed.includes(key)) reasons.push(`steps.${step.do}.${key}`)
    if (allowed.includes('target')) {
      if (typeof step.target === 'string' && step.target.startsWith('$')) reasons.push('steps.target:$target')
      else reasons.push(...targetReasons(step.target))
    }
    if (step.do === 'scroll' && typeof step.y !== 'number' && step.y !== 'end') reasons.push('steps.scroll.y')
  }
  return reasons
}

const expectReasons = ({ type, expect }: { type: string; expect: unknown }): string[] => {
  if (!isObject(expect)) return ['expect:객체 아님']
  const allowed = EXPECT_KEYS[type] ?? []
  const reasons: string[] = []
  for (const key of Object.keys(expect)) {
    if (!allowed.includes(key)) {
      reasons.push(`expect.${key}`)
      continue
    }
    // spacing의 row·column은 {px, tol}만
    if (type === 'spacing') {
      const axis = expect[key]
      if (!isObject(axis) || typeof axis.px !== 'number') reasons.push(`expect.${key}:px 없음`)
      else for (const inner of Object.keys(axis)) if (!['px', 'tol'].includes(inner)) reasons.push(`expect.${key}.${inner}`)
    }
  }
  return reasons
}

const propertyReasons = ({ type, check }: { type: string; check: Json }): string[] => {
  if (type !== 'style' && type !== 'attr') return check.property === undefined ? [] : ['check.property']
  const properties = toList(check.property as string | string[] | undefined)
  if (properties.length === 0) return ['check.property 없음']
  const reasons: string[] = []
  for (const property of properties) {
    if (typeof property !== 'string') reasons.push('property:글자 아님')
    else if (property.includes('|')) reasons.push('property:a|b')
    else if (!/^[a-z-]+$/.test(property)) reasons.push(`property:${property}`)
  }
  return reasons
}

/**
 * 요구 하나가 핵심 문법 안에 있는지 가른다. 미지원이면 어떤 키 때문인지 이유를 남긴다.
 * 설계 표의 나머지 type(order·timing·motion 등)은 type 하나만 이유로 적는다 — 그 type 전용 키까지 세면
 * "무엇을 더 지원해야 하나"의 순위가 흐려진다.
 */
export const classifyRequirement = ({ requirement }: { requirement: Requirement }): { support: Support; reasons: string[] } => {
  const check = requirement.check
  const type = String(check.type)
  if (type === 'judge') return { support: 'judge', reasons: [] }
  if (!EXPECT_KEYS[type]) return { support: 'unsupported', reasons: [`check.type:${type}`] }

  const reasons: string[] = []
  for (const key of Object.keys(check)) if (!CHECK_KEYS.includes(key)) reasons.push(`check.${key}`)
  if (check.viewport !== undefined && typeof check.viewport !== 'number') reasons.push('check.viewport:수 아님')
  if (check.state !== undefined && !STATES.includes(String(check.state))) reasons.push(`check.state:${String(check.state)}`)
  if (check.target === undefined) reasons.push('check.target 없음')
  else reasons.push(...targetReasons(check.target))
  const property = propertyReasons({ type, check })
  if (check.steps !== undefined) reasons.push(...stepReasons(check.steps))
  if (check.expect === undefined) reasons.push('check.expect 없음')
  else reasons.push(...expectReasons({ type, expect: check.expect }))
  if (check.then !== undefined) {
    if (!isObject(check.then)) reasons.push('check.then:객체 아님')
    else {
      for (const key of Object.keys(check.then)) if (!['steps', 'expect'].includes(key)) reasons.push(`then.${key}`)
      if (check.then.steps !== undefined) reasons.push(...stepReasons(check.then.steps))
      if (check.then.expect === undefined) reasons.push('then.expect 없음')
      else reasons.push(...expectReasons({ type, expect: check.then.expect }))
    }
  }
  // 초안의 attr 요구는 property 없이 뜻으로 쓴 expect(anyOf·ariaExpanded 등)를 쓴다. 그 키가 이미 이유면
  // "property 없음"은 같은 문제를 한 번 더 세는 것이라, 다른 이유가 없을 때만 적는다
  if (!(property.length === 1 && property[0] === 'check.property 없음' && reasons.length > 0)) reasons.push(...property)
  // style은 속성마다 맞출 기대값이 하나는 있어야 잰다(색 속성에 px만 주면 잴 것이 없다)
  if (type === 'style' && reasons.length === 0 && isObject(check.expect)) {
    const properties = toList(check.property as string | string[])
    const expectation = check.expect
    if (!properties.some((_, index) => Object.keys(expectFor({ expect: expectation, properties, index })).length > 0)) reasons.push('expect:속성에 맞는 기대값 없음')
  }
  const all = unique(reasons)
  return { support: all.length === 0 ? 'supported' : 'unsupported', reasons: all }
}

// ── 요구 목록 읽기 ───────────────────────────────────────────────────────────

const unitPools = (value: unknown, pools: string[][] = []): string[][] => {
  if (Array.isArray(value)) value.forEach((item) => unitPools(item, pools))
  else if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'unit' && Array.isArray(item) && item.every((a) => typeof a === 'string')) pools.push(item as string[])
      else unitPools(item, pools)
    }
  }
  return pools
}

/** 요구 목록 JSON → 요청별 요구(순서·지원 여부 포함) + 구조 오류 + 경고 */
export const parseSpec = ({ json }: { json: string }): ParsedSpec => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch (error) {
    return { requests: [], errors: [`JSON을 읽지 못함: ${(error as Error).message}`], warnings: [] }
  }
  const errors: string[] = []
  const warnings: string[] = []
  if (!isObject(data) || !isObject(data.requests)) return { requests: [], errors: ['requests 객체가 없음'], warnings }
  const requests: ParsedRequest[] = []
  for (const [requestId, raw] of Object.entries(data.requests)) {
    if (!isObject(raw) || !Array.isArray(raw.requirements)) {
      errors.push(`${requestId}: requirements 배열이 없음`)
      continue
    }
    const valid: Requirement[] = []
    const seen = new Set<string>()
    raw.requirements.forEach((item: unknown, index: number) => {
      const where = `${requestId} ${index + 1}번째 요구`
      if (!isObject(item) || typeof item.id !== 'string') return errors.push(`${where}: id 없음`)
      if (seen.has(item.id)) return errors.push(`${requestId}/${item.id}: id 중복`)
      seen.add(item.id)
      if (!isObject(item.check) || typeof item.check.type !== 'string') return errors.push(`${requestId}/${item.id}: check.type 없음`)
      if (!KNOWN_TYPES.includes(item.check.type)) warnings.push(`${requestId}/${item.id}: 설계 표에 없는 type "${item.check.type}" — 미지원으로 센다`)
      valid.push({ id: item.id, kind: String(item.kind ?? ''), text: String(item.text ?? ''), conflict: isObject(item.conflict) ? item.conflict : undefined, check: item.check })
    })
    for (const revision of toList(raw.revisions as unknown[] | undefined)) {
      if (!isObject(revision)) continue
      for (const change of toList(revision.changes as unknown[] | undefined)) {
        if (isObject(change) && typeof change.req === 'string' && !seen.has(change.req)) errors.push(`${requestId} ${String(revision.id)}: 없는 요구 ${change.req}를 가리킴`)
      }
    }
    requests.push({
      id: requestId,
      platform: String(raw.platform ?? ''),
      pools: unitPools(valid.map((r) => r.check)),
      requirements: valid.map((requirement, order) => ({ ...requirement, order, total: valid.length, ...classifyRequirement({ requirement }) })),
    })
  }
  return { requests, errors, warnings }
}

/** 지원·미지원 분류표 — 요청별 수와, 미지원 이유를 많은 순으로(요구 하나에 이유 하나씩) */
export const coverageOf = ({ spec }: { spec: ParsedSpec }) => {
  const reasonCount = new Map<string, number>()
  const byRequest = spec.requests.map((request) => {
    const count = (support: Support) => request.requirements.filter((r) => r.support === support).length
    for (const r of request.requirements) for (const reason of r.reasons) reasonCount.set(reason, (reasonCount.get(reason) ?? 0) + 1)
    return { id: request.id, total: request.requirements.length, supported: count('supported'), unsupported: count('unsupported'), judge: count('judge') }
  })
  return { byRequest, reasons: [...reasonCount].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count) }
}

// ── 값 읽기 ──────────────────────────────────────────────────────────────────

/** "12px"·"0" → 수. 단위가 px가 아니거나(%·em·auto) 읽을 수 없으면 null */
export const parsePx = ({ value }: { value: string }): number | null => {
  const match = value.trim().match(/^(-?\d*\.?\d+(?:e[+-]?\d+)?)(px)?$/i)
  if (!match) return null
  if (!match[2] && Number(match[1]) !== 0) return null
  return Number(match[1])
}

const clamp255 = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
const alphaOf = (token: string | undefined) => (token === undefined ? 1 : token.endsWith('%') ? Number(token.slice(0, -1)) / 100 : Number(token))

// oklch → sRGB (Björn Ottosson의 변환식). 최근 Chromium은 oklch로 준 색을 계산된 값에서도 oklch로 돌려준다
const oklchToRgb = ({ l, c, h }: { l: number; c: number; h: number }) => {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
  const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(x, 0) ** (1 / 2.4) - 0.055)
  return linear.map((x) => clamp255(gamma(x) * 255))
}

/** #hex(3·4·6·8자리)·rgb()·rgba()·oklch()·color(srgb)·transparent → RGBA. 읽을 수 없으면 null */
export const parseColor = ({ value }: { value: string }): Rgba | null => {
  const text = value.trim().toLowerCase()
  if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const hex = text.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    const digits = hex[1]
    if (![3, 4, 6, 8].includes(digits.length)) return null
    const full = digits.length <= 4 ? [...digits].map((d) => d + d).join('') : digits
    const channel = (at: number) => parseInt(full.slice(at, at + 2), 16)
    return { r: channel(0), g: channel(2), b: channel(4), a: full.length === 8 ? channel(6) / 255 : 1 }
  }
  const fn = text.match(/^([a-z]+)\((.*)\)$/)
  if (!fn) return null
  const [main, alpha] = fn[2].includes('/') ? fn[2].split('/').map((s) => s.trim()) : [fn[2], undefined]
  const parts = main.split(/[\s,]+/).filter(Boolean)
  if (fn[1] === 'rgb' || fn[1] === 'rgba') {
    if (parts.length < 3) return null
    const channel = (token: string) => (token.endsWith('%') ? (Number(token.slice(0, -1)) / 100) * 255 : Number(token))
    const [r, g, b] = parts.slice(0, 3).map(channel)
    const a = alphaOf(alpha ?? parts[3])
    if ([r, g, b, a].some(Number.isNaN)) return null
    return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a }
  }
  if (fn[1] === 'oklch') {
    if (parts.length < 3) return null
    const l = parts[0].endsWith('%') ? Number(parts[0].slice(0, -1)) / 100 : Number(parts[0])
    const c = Number(parts[1])
    const h = parts[2] === 'none' ? 0 : Number(parts[2])
    const a = alphaOf(alpha)
    if ([l, c, h, a].some(Number.isNaN)) return null
    const [r, g, b] = oklchToRgb({ l, c, h })
    return { r, g, b, a }
  }
  if (fn[1] === 'color' && parts[0] === 'srgb' && parts.length >= 4) {
    const [r, g, b] = parts.slice(1, 4).map((token) => clamp255(Number(token) * 255))
    const a = alphaOf(alpha)
    if ([r, g, b, a].some(Number.isNaN)) return null
    return { r, g, b, a }
  }
  return null
}

/** 색 거리 — RGB 각 채널 차이의 합. 알파 차이는 255배로 더한다(반투명 흰색은 흰색이 아니다) */
export const colorDistance = ({ a, b }: { a: Rgba; b: Rgba }): number => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) + Math.abs(a.a - b.a) * 255

const hexOf = ({ r, g, b, a }: Rgba) => {
  const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
  return a < 1 ? `${hex} 알파 ${Math.round(a * 100) / 100}` : hex
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
const round2 = (x: number) => Math.round(x * 100) / 100

// ── 비교 ─────────────────────────────────────────────────────────────────────

const PX_TOLERANCE = 1 // 하위 픽셀 반올림
const COLOR_TOLERANCE = 2 // 색 공간 변환의 반올림

/**
 * 기대값(px·color·equals·matches·min·max, tol)과 계산된 값 하나를 비교한다. 있는 키는 모두 맞아야 지킴이다.
 * px는 값이 여럿이면(모서리 넷) 모두 맞아야 한다.
 */
export const compareExpect = ({ expect, actual }: { expect: Json; actual: string }): { ok: boolean; detail: string } => {
  const problems: string[] = []
  const tol = typeof expect.tol === 'number' ? expect.tol : undefined
  if (typeof expect.px === 'number') {
    const want = expect.px
    const values = actual.trim().split(/\s+/).map((token) => parsePx({ value: token }))
    const limit = tol ?? PX_TOLERANCE
    if (values.length === 0 || values.some((v) => v === null)) problems.push(`${actual} — px로 읽지 못함(기대 ${want}px)`)
    else if (values.some((v) => Math.abs((v as number) - want) > limit)) problems.push(`${actual}(기대 ${want}px±${limit})`)
  }
  if (typeof expect.color === 'string') {
    const want = parseColor({ value: expect.color })
    const got = parseColor({ value: actual })
    const limit = tol ?? COLOR_TOLERANCE
    if (!want) problems.push(`기대 색 ${expect.color}을 읽지 못함`)
    else if (!got) problems.push(`${actual} — 색으로 읽지 못함(기대 ${expect.color})`)
    else {
      const distance = colorDistance({ a: got, b: want })
      if (distance > limit) problems.push(`${hexOf(got)}(기대 ${expect.color.toUpperCase()}, 거리 ${round2(distance)})`)
    }
  }
  if (typeof expect.equals === 'string' && normalize(actual) !== normalize(expect.equals)) problems.push(`"${normalize(actual)}"(기대 "${expect.equals}")`)
  if (typeof expect.matches === 'string' && !new RegExp(expect.matches).test(actual)) problems.push(`"${normalize(actual).slice(0, 60)}"(기대 /${expect.matches}/)`)
  if (typeof expect.min === 'number' || typeof expect.max === 'number') {
    const number = parsePx({ value: actual }) ?? Number(actual)
    if (Number.isNaN(number)) problems.push(`${actual} — 수로 읽지 못함`)
    else {
      if (typeof expect.min === 'number' && number < expect.min) problems.push(`${actual}(기대 ${expect.min} 이상)`)
      if (typeof expect.max === 'number' && number > expect.max) problems.push(`${actual}(기대 ${expect.max} 이하)`)
    }
  }
  return problems.length > 0 ? { ok: false, detail: problems.join(', ') } : { ok: true, detail: normalize(actual).slice(0, 60) }
}

const compareNumber = ({ expect, actual, label }: { expect: Json; actual: number; label: string }): { ok: boolean; detail: string } => {
  const problems: string[] = []
  if (typeof expect.count === 'number' && actual !== expect.count) problems.push(`기대 ${expect.count}`)
  if (typeof expect.min === 'number' && actual < expect.min) problems.push(`기대 ${expect.min} 이상`)
  if (typeof expect.max === 'number' && actual > expect.max) problems.push(`기대 ${expect.max} 이하`)
  return { ok: problems.length === 0, detail: `${label} ${actual}${problems.length > 0 ? `(${problems.join(', ')})` : ''}` }
}

// ── 상자 좌표 ────────────────────────────────────────────────────────────────

const ROW_TOLERANCE = 2 // 같은 줄로 볼 위쪽(또는 가운데) 차이 — 하위 픽셀과 테두리 1px

const rowsOf = (boxes: Box[]): Box[][] => {
  const rows: Box[][] = []
  for (const b of [...boxes].sort((x, y) => x.top - y.top || x.left - y.left)) {
    const center = (x: Box) => (x.top + x.bottom) / 2
    const row = rows.find((r) => Math.abs(r[0].top - b.top) <= ROW_TOLERANCE || Math.abs(center(r[0]) - center(b)) <= ROW_TOLERANCE)
    if (row) row.push(b)
    else rows.push([b])
  }
  return rows.map((row) => row.sort((x, y) => x.left - y.left))
}

/** 열 수 — 가장 많이 찬 줄의 상자 수. 마지막 줄이 덜 차도 그대로다 */
export const columnsOf = ({ boxes }: { boxes: Box[] }): number => Math.max(0, ...rowsOf(boxes).map((row) => row.length))

/** 줄 사이(row: 위아래 줄의 틈)와 칸 사이(column: 한 줄 안 이웃 칸의 틈). 소수 둘째 자리까지 */
export const gapsOf = ({ boxes }: { boxes: Box[] }): { row: number[]; column: number[] } => {
  const rows = rowsOf(boxes)
  const column = rows.flatMap((row) => row.slice(1).map((b, i) => round2(b.left - row[i].right)))
  const row = rows.slice(1).map((r, i) => round2(Math.min(...r.map((b) => b.top)) - Math.max(...rows[i].map((b) => b.bottom))))
  return { row, column }
}

// ── 되풀이 단위 ──────────────────────────────────────────────────────────────

/** 앵커 글자를 품은 요소 하나. chain은 자기부터 body까지 조상 id, exact는 글자가 앵커와 똑같은가 */
export type AnchorCandidate = { anchor: string; chain: number[]; exact: boolean }

/**
 * 앵커 글자들로 되풀이 단위(카드·행·칩)를 찾는다(설계 4.3절의 2).
 * 앵커를 품은 요소마다 조상을 올라가며, 형제 중에 다른 앵커를 품은 요소가 있는 가장 낮은 조상을 단위로 잡는다.
 * 같은 앵커가 두 곳에 나오면(칩의 "케이크"와 카드의 "딸기 생크림 케이크") 앵커를 가장 많이 묶는 부모(container)를 고른다.
 * 앵커가 하나뿐이면 형제를 비교할 수 없어 단위를 정하지 못한다 — 부르는 쪽이 companionAnchors로 짝을 붙인다.
 */
export const findRepeatUnits = ({ anchors, candidates }: { anchors: string[]; candidates: AnchorCandidate[] }): { container: number | null; units: Record<string, number | null> } => {
  const placements = candidates.flatMap((candidate) => {
    for (let k = 0; k < candidate.chain.length - 1; k += 1) {
      const self = candidate.chain[k]
      const parent = candidate.chain[k + 1]
      const sibling = candidates.some((other) => other.anchor !== candidate.anchor && other.chain.includes(parent) && !other.chain.includes(self))
      if (sibling) return [{ anchor: candidate.anchor, unit: self, container: parent, exact: candidate.exact }]
    }
    return []
  })
  const groups = new Map<number, typeof placements>()
  for (const placement of placements) groups.set(placement.container, [...(groups.get(placement.container) ?? []), placement])
  const score = (group: typeof placements) => [new Set(group.map((p) => p.anchor)).size, group.filter((p) => p.exact).length]
  const best = [...groups].sort(([, a], [, b]) => {
    const [sa, ea] = score(a)
    const [sb, eb] = score(b)
    return sb - sa || eb - ea
  })[0]
  const units: Record<string, number | null> = Object.fromEntries(anchors.map((anchor) => [anchor, null]))
  if (!best) return { container: null, units }
  for (const anchor of anchors) {
    const mine = best[1].filter((p) => p.anchor === anchor).sort((a, b) => Number(b.exact) - Number(a.exact))
    units[anchor] = mine[0]?.unit ?? null
  }
  return { container: best[0], units }
}

/** 묻는 앵커를 모두 품은 같은 요청의 목록들을 합친다 — ["앙버터"] 하나로는 카드를 못 찾으니 메뉴 여섯 개를 짝으로 */
export const companionAnchors = ({ anchors, pools }: { anchors: string[]; pools: string[][] }): string[] => {
  const matching = pools.filter((pool) => anchors.every((anchor) => pool.includes(anchor)))
  return matching.length === 0 ? anchors : unique([...anchors, ...matching.flat()]).sort((a, b) => {
    const order = matching.flat()
    return order.indexOf(a) - order.indexOf(b)
  })
}

// ── 판정 ─────────────────────────────────────────────────────────────────────

// 되풀이 단위(unit)는 본래 여럿이라 all이 없어도 모두 본다. 그 밖에는 all일 때만 모두, 아니면 첫 대상
const chosen = ({ target, elements }: { target: Json; elements: ObservedElement[] }): ObservedElement[] => {
  const visible = elements.filter((e) => e.visible)
  const pool = visible.length > 0 ? visible : elements
  return target.all === true || target.unit !== undefined ? pool : pool.slice(0, 1)
}

const MAX_PROBLEMS = 3

const judgeStage = ({ check, expect, observation }: { check: Json; expect: Json; observation: Observation | undefined }): Verdict => {
  if (!observation) return { result: 'not-found', detail: '관찰 없음' }
  if (observation.error) return { result: 'not-found', detail: `오류: ${observation.error}` }
  if (observation.missing) return { result: 'not-found', detail: observation.missing }
  const type = String(check.type)
  const target = isObject(check.target) ? check.target : {}
  const elements = observation.elements ?? []
  if (elements.length === 0) {
    // 닫힌 시트처럼 "보이지 않아야" 하는 요구는 없어야 지킴이다
    if (type === 'exists' && expect.visible === false) return { result: 'met', detail: '대상 없음(보이지 않음)' }
    if ((type === 'count' || type === 'columns') && (expect.count === 0 || expect.max === 0)) return { result: 'met', detail: '대상 0개' }
    // 글자로만 찾는 대상은 찾는 규칙이 모자랄 수 없다(보이는 글자를 다 훑는다) — 없으면 요구한 문구가 화면에 없는 것이다.
    // 역할(role)·단위·관계로 찾는 대상은 화면이 역할을 빠뜨렸을 수도, 규칙이 모자랐을 수도 있어 찾지 못함으로 둔다
    const textOnly = (target.text !== undefined || target.textMatches !== undefined) && !['role', 'unit', 'dialog', 'pinned', 'near'].some((key) => target[key] !== undefined)
    if (type === 'exists' && textOnly) return { result: 'violated', detail: `요구한 글자가 화면에 없다: ${String(target.text ?? `/${String(target.textMatches)}/`)}` }
    return { result: 'not-found', detail: '대상을 찾지 못함' }
  }
  const visibleCount = elements.filter((e) => e.visible).length

  if (type === 'exists') {
    const want = expect.visible !== false
    const shown = visibleCount > 0
    return { result: shown === want ? 'met' : 'violated', detail: shown ? `보임(${visibleCount}개)` : '있지만 보이지 않음' }
  }
  if (type === 'count') {
    const { ok, detail } = compareNumber({ expect, actual: visibleCount, label: '보이는 대상' })
    return { result: ok ? 'met' : 'violated', detail }
  }
  if (type === 'columns') {
    const boxes = elements.filter((e) => e.visible && e.box).map((e) => e.box as Box)
    const { ok, detail } = compareNumber({ expect, actual: columnsOf({ boxes }), label: '열' })
    return { result: ok ? 'met' : 'violated', detail }
  }
  if (type === 'spacing') {
    const boxes = elements.filter((e) => e.visible && e.box).map((e) => e.box as Box)
    const gaps = gapsOf({ boxes })
    const problems: string[] = []
    const seen: string[] = []
    for (const axis of ['row', 'column'] as const) {
      const want = expect[axis]
      if (!isObject(want) || typeof want.px !== 'number') continue
      const label = axis === 'row' ? '줄 사이' : '칸 사이'
      if (gaps[axis].length === 0) return { result: 'not-found', detail: `${label} 간격을 잴 상자 쌍이 없다(상자 ${boxes.length}개, ${columnsOf({ boxes })}열)` }
      const limit = typeof want.tol === 'number' ? want.tol : PX_TOLERANCE
      const values = unique(gaps[axis].map(String)).join('·')
      seen.push(`${label} ${values}px`)
      if (gaps[axis].some((g) => Math.abs(g - (want.px as number)) > limit)) problems.push(`${label} ${values}px(기대 ${want.px}px±${limit})`)
    }
    return problems.length > 0 ? { result: 'violated', detail: problems.join(', ') } : { result: 'met', detail: seen.join(', ') }
  }
  if (type === 'text') {
    const problems: string[] = []
    const picked = chosen({ target, elements })
    picked.forEach((element, i) => {
      const { ok, detail } = compareExpect({ expect, actual: element.text ?? '' })
      if (!ok) problems.push(picked.length > 1 ? `${detail} — ${i + 1}번째 대상` : detail)
    })
    return problems.length > 0
      ? { result: 'violated', detail: problems.slice(0, MAX_PROBLEMS).join('; ') }
      : { result: 'met', detail: `"${normalize(picked[0].text ?? '').slice(0, 60)}"` }
  }
  // style·attr — 속성마다 기대값을 맞춘다
  const properties = toList(check.property as string | string[])
  const picked = chosen({ target, elements })
  const problems: string[] = []
  const seen: string[] = []
  if (type === 'attr' && expect.visible !== undefined && (visibleCount > 0) !== (expect.visible !== false)) problems.push(visibleCount > 0 ? '보임(기대 안 보임)' : '안 보임')
  picked.forEach((element, i) => {
    properties.forEach((property, index) => {
      const slice = expectFor({ expect, properties, index })
      delete slice.visible
      if (Object.keys(slice).filter((k) => k !== 'tol').length === 0) return
      const actual = element.values?.[property]
      const where = picked.length > 1 ? ` — ${i + 1}번째 대상` : ''
      if (actual === null || actual === undefined) {
        problems.push(`${property} 없음${where}`)
        return
      }
      const { ok, detail } = compareExpect({ expect: slice, actual })
      if (!ok) problems.push(`${property} ${detail}${where}`)
      else if (i === 0) seen.push(`${property} ${detail}`)
    })
  })
  return problems.length > 0
    ? { result: 'violated', detail: problems.slice(0, MAX_PROBLEMS).join('; ') + (problems.length > MAX_PROBLEMS ? ` 외 ${problems.length - MAX_PROBLEMS}곳` : '') }
    : { result: 'met', detail: seen.join(', ') }
}

/** 요구 + 관찰 → 다섯 결과 중 하나와 차이 설명. check.then이 있으면 처음 값을 지킨 뒤 조작 뒤 값으로 가른다 */
export const verdict = ({ requirement, observation }: { requirement: Requirement; observation: Observation }): Verdict => {
  const { support, reasons } = classifyRequirement({ requirement })
  if (support === 'judge') return { result: 'needs-judge', detail: '기계로 볼 수 없는 요구 — 판정 모델이 본다' }
  if (support === 'unsupported') return { result: 'unsupported', detail: `미지원: ${reasons.join(', ')}` }
  const check = requirement.check
  const first = judgeStage({ check, expect: check.expect as Json, observation })
  if (first.result !== 'met' || !isObject(check.then)) return first
  const after = judgeStage({ check, expect: check.then.expect as Json, observation: observation.then })
  return { result: after.result, detail: `처음 ${first.detail} → 조작 뒤 ${after.detail}` }
}

// ── 집계 ─────────────────────────────────────────────────────────────────────

/** 실행 하나의 요구 하나의 결과. order는 요청 안의 요구 순서(0부터), total은 그 요청의 요구 수 */
export type FidelityRow = {
  request: string
  id: string
  kind: string
  conflict: boolean
  order: number
  total: number
  result: Result
  reasons?: string[]
  detail?: string
  condition?: string
  run?: string
}

type Counts = { met: number; violated: number; notFound: number; needsJudge: number; unsupported: number; total: number }
export type Rates = { counts: Counts; strict: number | null; lenient: number | null }

const KEY: Record<Result, keyof Omit<Counts, 'total'>> = { met: 'met', violated: 'violated', 'not-found': 'notFound', 'needs-judge': 'needsJudge', unsupported: 'unsupported' }

const ratesOf = (rows: FidelityRow[]): Rates => {
  const counts: Counts = { met: 0, violated: 0, notFound: 0, needsJudge: 0, unsupported: 0, total: rows.length }
  for (const row of rows) counts[KEY[row.result]] += 1
  const strictBase = counts.met + counts.violated + counts.notFound
  const lenientBase = counts.met + counts.violated
  return { counts, strict: strictBase === 0 ? null : counts.met / strictBase, lenient: lenientBase === 0 ? null : counts.met / lenientBase }
}

const groupBy = <K extends string>(rows: FidelityRow[], keyOf: (row: FidelityRow) => K) => {
  const groups = {} as Record<K, FidelityRow[]>
  for (const row of rows) (groups[keyOf(row)] ??= []).push(row)
  return groups
}

/**
 * 결과 행들 → 충족률.
 * - 엄격: 지킴 ÷ (지킴 + 어김 + 찾지 못함), 너그러움: 지킴 ÷ (지킴 + 어김). 판정 필요·미지원은 분모에 넣지 않는다
 * - 찾지 못함 비율: 찾지 못함 ÷ (지킴 + 어김 + 찾지 못함) — 5% 아래면 측정을 믿고 쓴다(설계 4.3절)
 * - 위치별: 요청 안 요구 순서를 셋으로 나눈다(긴 요청의 뒷부분을 놓치는가)
 * - 미지원 이유: 반복 실행이 같은 요구를 여러 번 세지 않게 (요청, id)마다 한 번
 */
export const summarizeFidelity = ({ results }: { results: FidelityRow[] }) => {
  const overall = ratesOf(results)
  const { met, violated, notFound } = overall.counts
  const checked = met + violated + notFound
  const byKind = Object.fromEntries(Object.entries(groupBy(results, (r) => r.kind)).map(([kind, rows]) => [kind, ratesOf(rows)]))
  const tercile = (row: FidelityRow) => Math.min(2, Math.floor((row.order * 3) / Math.max(1, row.total)))
  const reasonCount = new Map<string, number>()
  const seen = new Set<string>()
  for (const row of results) {
    const key = `${row.request}/${row.id}`
    if (row.result !== 'unsupported' || seen.has(key)) continue
    seen.add(key)
    for (const reason of row.reasons ?? []) reasonCount.set(reason, (reasonCount.get(reason) ?? 0) + 1)
  }
  return {
    ...overall,
    notFoundRate: checked === 0 ? null : notFound / checked,
    byKind,
    byConflict: { conflict: ratesOf(results.filter((r) => r.conflict)), plain: ratesOf(results.filter((r) => !r.conflict)) },
    byTercile: [0, 1, 2].map((t) => ratesOf(results.filter((r) => tercile(r) === t))),
    unsupportedReasons: [...reasonCount].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  }
}
