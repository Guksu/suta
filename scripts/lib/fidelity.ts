/**
 * 요구 충족률(fidelity) 측정의 순수 로직 (DOM·파일·프로세스 없음 — 브라우저 실행은 scripts/benchmark/fidelity.mjs).
 *
 * 요청문을 낱개 요구로 나눈 목록(evals/benchmark/fidelity/requirements.json)을 읽고,
 * 브라우저가 모아 온 관찰값(계산된 스타일·상자 좌표·글자·속성)으로 요구마다 다섯 결과 중 하나를 낸다.
 *  - 지킴(met)·어김(violated)
 *  - 찾지 못함(not-found): 대상이나 조작 대상을 찾지 못했다. 화면의 잘못인지 찾는 규칙의 모자람인지 모르므로 어김과 따로 센다
 *  - 판정 필요(needs-judge): 기계로 볼 수 없어 판정 모델이 봐야 한다(type: judge)
 *  - 미지원(unsupported): 이 검사기가 읽지 못하는 문법을 쓴 요구. 재지 않고 이유(키 이름)만 남긴다. 충족률 분모에 넣지 않는다
 *
 * 문법은 작게 둔다. 요구마다 새 키를 만들지 않고, 여러 확인은 checks(모두)·anyOf(하나라도)로 묶는다.
 * 묶음의 자식은 부모 키(type·viewport·state·steps·target·property)를 물려받는다 — leavesOf가 낱개 확인으로 편다.
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

/**
 * 브라우저가 대상 요소마다 모은 값.
 * - values: style이면 계산된 스타일, attr이면 속성 값(없으면 null)
 * - box: 페이지 좌표 상자, view: 지금 화면(viewport) 좌표 상자, textBox: 글자만 감싼 상자(오른쪽 정렬 비교용)
 * - label: 되풀이 단위(unit)로 찾았을 때 그 단위의 앵커 글자, focused: 자기나 자손에 포커스, hit: 가운데 점이 자기를 가리킴(덮이지 않음)
 */
export type ObservedElement = {
  visible: boolean
  text?: string
  box?: Box
  view?: Box
  textBox?: Box
  label?: string
  focused?: boolean
  hit?: boolean
  values?: Record<string, string | null>
}
/**
 * 조작 뒤 움직임 하나(CSS 전이·애니메이션·스크립트가 매 프레임 바꾼 style).
 * ms: 자기 길이(지연 포함, 끝나지 않으면 null). shift: 프레임마다 잰 상자 가운데가 끝 자리에서 가장 멀었던 거리(px, 잴 수 없으면 null).
 * dx·dy: 처음 가운데 − 끝 가운데(아래에서 올라오면 dy가 양수)
 */
export type Motion = { props: string[]; ms: number | null; startMs?: number; shift: number | null; dx: number | null; dy: number | null }
/**
 * error: 예외, missing: 대상·조작 대상을 찾지 못한 이유(targetMissing이면 대상 쪽), then: check.then의 조작 뒤 관찰.
 * absent: 되풀이 단위에서 그 앵커만 빠졌다(다른 단위는 찾았다). mismatch: 기준(role·글자)으로 찾은 대상은 있는데 조건(near·containsText·live)에 맞는 것이 없다.
 * viewport: 화면 크기, scrollableX: 대상들을 품은 칸이 가로로 넘어가는가(order), motions·scroll: 조작 뒤 움직임(motion),
 * samples: 조작 뒤 50ms마다 대상이 보였는가(timing), leaves: 묶음(checks·anyOf)의 낱개 확인별 관찰(경로 → 관찰)
 */
export type Observation = {
  error?: string
  missing?: string
  targetMissing?: boolean
  absent?: boolean
  mismatch?: string
  elements?: ObservedElement[]
  then?: Observation
  viewport?: { width: number; height: number }
  scrollableX?: boolean
  motions?: Motion[]
  scroll?: number[]
  samples?: { t: number; visible: boolean }[]
  leaves?: Record<string, Observation>
}

export type Verdict = { result: Result; detail: string }

// ── 지원 범위 ────────────────────────────────────────────────────────────────

/** 설계 표(4.2절)에 있는 type — 이 밖의 type은 요구 목록의 오타일 수 있어 경고한다. position은 수정 요청(I20)이 쓴다 */
const KNOWN_TYPES = ['style', 'spacing', 'columns', 'exists', 'count', 'text', 'attr', 'order', 'interaction', 'timing', 'motion', 'focus', 'reducedMotion', 'copyTone', 'covered', 'size', 'judge', 'position']

// reducedMotion: 동작 줄이기를 켠 브라우저로 연다. report: 보고문(마지막 응답)에 있어야 할 말 — 화면 밖이라 이 검사기는 보지 않는다
const CHECK_KEYS = ['type', 'viewport', 'state', 'reducedMotion', 'target', 'property', 'steps', 'then', 'expect', 'note', 'report']
const JUDGE_KEYS = ['type', 'ask', 'viewport', 'state', 'note']
// nameMatches: 접근 이름 정규식. containsText·live는 찾은 요소를 거르는 조건(글자를 품음·실시간 알림 칸 안)
const TARGET_KEYS = ['role', 'name', 'nameMatches', 'exact', 'nth', 'all', 'text', 'textMatches', 'unit', 'inner', 'pinned', 'dialog', 'blank', 'near', 'within', 'containsText', 'live']
// 대상을 고르는 기준 — 이것 없이 nth·within만 있는 대상은 무엇을 찾는지 모른다
const TARGET_BASES = ['role', 'text', 'textMatches', 'unit', 'pinned', 'dialog', 'blank']
const BLANK_KEYS = ['minWidth', 'minHeight']
const STEP_KEYS: Record<string, string[]> = {
  click: ['target'],
  hover: ['target'],
  focus: ['target'],
  longPress: ['target', 'ms'],
  drag: ['target', 'dx', 'dy', 'from'],
  type: ['target', 'text'],
  scroll: ['y'],
  wait: ['ms'],
  press: ['key'],
}
/** type마다 쓸 수 있는 expect 키. 같은 키라도 type에 맞지 않으면(exists에 count) 무엇을 재야 할지 모호하므로 미지원이다 */
const EXPECT_KEYS: Record<string, string[]> = {
  style: ['px', 'color', 'hue', 'gray', 'equals', 'matches', 'min', 'max', 'tol'],
  attr: ['equals', 'matches', 'visible'],
  text: ['equals', 'matches'],
  exists: ['visible', 'present', 'inView', 'withinWidth', 'uncovered'],
  count: ['count', 'min', 'max'],
  columns: ['count', 'min', 'max'],
  spacing: ['row', 'column'],
  order: ['inOrder', 'sameRow', 'scrollableX', 'first', 'alignRight', 'sorted'],
  focus: ['focused'],
  motion: ['animates', 'moves', 'minMs', 'maxMs', 'from', 'smoothScroll'],
  timing: ['appearMs', 'goneMs'],
}
// 조작하는 동안 시간을 재는 확인 — 마지막 조작부터 재므로 조작이 있어야 하고, 다른 확인과 한 페이지를 나눠 쓰지 못한다
const TIMED_TYPES = ['motion', 'timing']
const STATES = ['loading', 'empty', 'error']
const DIRECTIONS = ['below', 'above', 'left', 'right']

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const toList = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value])
const unique = (list: string[]) => [...new Set(list)]

// 색 속성 — 기대값 color를 쓰는 속성
// painted-colors: 요소 안에 칠한 색들(바탕·테두리·SVG 채움·선) — 점·링처럼 글자 없는 표시의 색을 본다
const isColorProperty = (property: string) => /(^|-)color$/.test(property) || property === 'fill' || property === 'stroke' || property === 'painted-colors'
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
  // 색 계열(hue·gray)은 배열로 나누지 않는다 — hue 자체가 [시작, 끝] 배열이다
  if (isColorProperty(property)) for (const key of ['hue', 'gray']) if (expect[key] !== undefined) slice[key] = expect[key]
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
  if (target.blank !== undefined) {
    if (!isObject(target.blank)) reasons.push('target.blank:객체 아님')
    else for (const key of Object.keys(target.blank)) if (!BLANK_KEYS.includes(key)) reasons.push(`target.blank.${key}`)
  }
  if (target.live !== undefined && target.live !== true) reasons.push('target.live:true 아님')
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
    if (step.do === 'drag' && step.from !== undefined && step.from !== 'top') reasons.push(`steps.drag.from:${String(step.from)}`)
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
    if (key === 'goneMs' && !(Array.isArray(expect.goneMs) && expect.goneMs.length === 2 && expect.goneMs.every((x) => typeof x === 'number'))) reasons.push('expect.goneMs:[최소, 최대] 아님')
    if (key === 'from' && !DIRECTIONS.includes(String(expect.from))) reasons.push(`expect.from:${String(expect.from)}`)
    if (key === 'hue' && !(Array.isArray(expect.hue) && expect.hue.length === 2 && expect.hue.every((x) => typeof x === 'number'))) reasons.push('expect.hue:[시작, 끝] 아님')
    if (key === 'first' && !(Array.isArray(expect.first) && expect.first.every((x) => typeof x === 'string'))) reasons.push('expect.first:글자 배열 아님')
    if (key === 'sorted' && expect.sorted !== 'asc' && expect.sorted !== 'desc') reasons.push(`expect.sorted:${String(expect.sorted)}`)
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

const isCombinator = (check: Json) => check.checks !== undefined || check.anyOf !== undefined

/**
 * 묶음(checks·anyOf)을 낱개 확인으로 편다. 자식은 부모의 키를 물려받고 자기 키가 이긴다(target은 통째로 바꾼다).
 * 부모의 note는 물려주지 않는다 — 요구 전체에 단 메모다. 경로는 자식 순서를 점으로 잇는다("1.0"). 묶음이 아니면 경로 ""
 */
export const leavesOf = ({ check, path = '' }: { check: Json; path?: string }): { path: string; check: Json }[] => {
  if (!isCombinator(check)) return [{ path, check }]
  const shared: Json = { ...check }
  for (const key of ['checks', 'anyOf', 'note']) delete shared[key]
  const children = toList((check.checks ?? check.anyOf) as unknown[] | undefined)
  return children.flatMap((child, i) => {
    const merged = isObject(child) ? { ...shared, ...child } : { ...shared, __invalid: true }
    return leavesOf({ check: merged, path: path === '' ? String(i) : `${path}.${i}` })
  })
}

/**
 * 한 페이지에서 함께 관찰해도 되는 낱개 확인의 열쇠 — 화면 크기·상태·동작 줄이기·조작이 같으면 조작을 한 번만 하고 차례로 본다.
 * 조작 중 시간을 재는 확인(motion·timing)과 조작을 한 번 더 하는 확인(then)은 페이지를 바꾸므로 따로 연다(null)
 */
export const groupKey = ({ check }: { check: Json }): string | null => {
  if (TIMED_TYPES.includes(String(check.type)) || check.then !== undefined) return null
  return JSON.stringify([check.viewport ?? null, check.state ?? null, check.reducedMotion === true, check.steps ?? []])
}

const classifyLeaf = ({ check }: { check: Json }): { support: Support; reasons: string[] } => {
  const type = String(check.type)
  if (type === 'judge') {
    const extra = Object.keys(check).filter((key) => !JUDGE_KEYS.includes(key)).map((key) => `check.${key}`)
    return extra.length === 0 ? { support: 'judge', reasons: [] } : { support: 'unsupported', reasons: extra }
  }
  if (check.__invalid) return { support: 'unsupported', reasons: ['checks:객체 아닌 자식'] }
  if (!EXPECT_KEYS[type]) return { support: 'unsupported', reasons: [`check.type:${type}`] }

  const reasons: string[] = []
  for (const key of Object.keys(check)) if (!CHECK_KEYS.includes(key)) reasons.push(`check.${key}`)
  if (check.viewport !== undefined && typeof check.viewport !== 'number') reasons.push('check.viewport:수 아님')
  if (check.state !== undefined && !STATES.includes(String(check.state))) reasons.push(`check.state:${String(check.state)}`)
  if (check.reducedMotion !== undefined && check.reducedMotion !== true) reasons.push('check.reducedMotion:true 아님')
  // motion은 대상이 없으면 화면 전체의 움직임을 본다(동작 줄이기에서 아무것도 움직이지 않는가)
  if (check.target === undefined) {
    if (type !== 'motion') reasons.push('check.target 없음')
  } else reasons.push(...targetReasons(check.target))
  const property = propertyReasons({ type, check })
  if (check.steps !== undefined) reasons.push(...stepReasons(check.steps))
  if (TIMED_TYPES.includes(type)) {
    if (!Array.isArray(check.steps) || check.steps.length === 0) reasons.push('steps 없음')
    if (check.then !== undefined) reasons.push('check.then')
  }
  if (check.expect === undefined) reasons.push('check.expect 없음')
  else reasons.push(...expectReasons({ type, expect: check.expect }))
  if (check.then !== undefined && !TIMED_TYPES.includes(type)) {
    if (!isObject(check.then)) reasons.push('check.then:객체 아님')
    else {
      for (const key of Object.keys(check.then)) if (!['steps', 'expect'].includes(key)) reasons.push(`then.${key}`)
      if (check.then.steps !== undefined) reasons.push(...stepReasons(check.then.steps))
      if (check.then.expect === undefined) reasons.push('then.expect 없음')
      else reasons.push(...expectReasons({ type, expect: check.then.expect }))
    }
  }
  // 뜻으로 쓴 expect 키가 이미 이유면 "property 없음"은 같은 문제를 한 번 더 세는 것이라, 다른 이유가 없을 때만 적는다
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

/**
 * 요구 하나가 지원 문법 안에 있는지 가른다. 미지원이면 어떤 키 때문인지 이유를 남긴다.
 * 설계 표의 나머지 type(copyTone 등)은 type 하나만 이유로 적는다 — 그 type 전용 키까지 세면 "무엇을 더 지원해야 하나"의 순위가 흐려진다.
 * 묶음은 자식이 하나라도 미지원이면 미지원이고 자식의 이유를 모은다. 묶음 안의 judge는 쓸 수 없다 — 기계 확인과 판정을 한 결과로 섞지 않는다.
 */
export const classifyRequirement = ({ requirement }: { requirement: Requirement }): { support: Support; reasons: string[] } => {
  const check = requirement.check
  if (!isCombinator(check)) return classifyLeaf({ check })
  const reasons: string[] = []
  if (check.checks !== undefined && check.anyOf !== undefined) reasons.push('checks와 anyOf를 함께 씀')
  const walk = (node: Json) => {
    for (const key of ['checks', 'anyOf']) {
      if (node[key] === undefined) continue
      if (!Array.isArray(node[key])) reasons.push(`${key}:배열 아님`)
      else if ((node[key] as unknown[]).length === 0) reasons.push(`${key}:빈 배열`)
      else for (const child of node[key] as unknown[]) if (isObject(child)) walk(child)
    }
  }
  walk(check)
  for (const leaf of leavesOf({ check })) {
    const result = classifyLeaf({ check: leaf.check })
    if (result.support === 'judge') reasons.push('checks 안 judge')
    else reasons.push(...result.reasons)
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
      if (!isObject(item.check) || (typeof item.check.type !== 'string' && !isCombinator(item.check))) return errors.push(`${requestId}/${item.id}: check.type 없음`)
      for (const leaf of leavesOf({ check: item.check })) {
        const type = leaf.check.type
        if (typeof type === 'string' && !KNOWN_TYPES.includes(type)) warnings.push(`${requestId}/${item.id}: 설계 표에 없는 type "${type}" — 미지원으로 센다`)
      }
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

const MIN_SATURATION = 0.35 // "빨간"이라 부를 만한 채도(HSL). 탁한 갈색·회색 기운은 빼려고
const GRAY_SPREAD = 40 // 회색으로 볼 RGB 채널 차의 최대 — 푸른 회색(#6B7280 차 21, #64748B 차 39)까지
const GRAY_LUMINANCE: [number, number] = [0.02, 0.96] // 거의 검정(#1A1A1A)·흰색은 회색이 아니다

/** 색상(도)·채도(HSL)·회색 여부. 반투명은 흰 바탕에 섞어 본다(대부분 흰 바탕 위에 놓인다) */
const colorFamily = (color: Rgba) => {
  const mix = (c: number) => c * color.a + 255 * (1 - color.a)
  const [r, g, b] = [mix(color.r), mix(color.g), mix(color.b)]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let hue = 0
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360
  }
  const lightness = (max + min) / 2 / 255
  const saturation = delta === 0 ? 0 : delta / 255 / (1 - Math.abs(2 * lightness - 1))
  const linear = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
  const spread = Math.round(delta)
  return { hue, saturation, luminance, spread, gray: spread <= GRAY_SPREAD && luminance >= GRAY_LUMINANCE[0] && luminance <= GRAY_LUMINANCE[1] }
}
const round2 = (x: number) => Math.round(x * 100) / 100

// ── 비교 ─────────────────────────────────────────────────────────────────────

const PX_TOLERANCE = 1 // 하위 픽셀 반올림
// 작은 값은 1px 오차가 뜻을 바꾼다(1px 선과 선 없음, 2px 테두리와 1px) — 기대값의 1/4, 최대 1px
const pxTolerance = (want: number) => Math.min(PX_TOLERANCE, Math.abs(want) / 4)
const CSS_TOLERANCE = 0.5 // 계산된 CSS 길이 — rem·em을 px로 바꾼 반올림만
const BOX_PROPERTIES = ['width', 'height'] // 상자(getBoundingClientRect)에서 재는 속성
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
    const limit = tol ?? pxTolerance(want)
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
  if (Array.isArray(expect.hue) || expect.gray === true) {
    const got = parseColor({ value: actual })
    if (!got) problems.push(`${actual} — 색으로 읽지 못함`)
    else {
      const family = colorFamily(got)
      if (Array.isArray(expect.hue)) {
        const [from, to] = expect.hue as number[]
        const inside = from <= to ? family.hue >= from && family.hue <= to : family.hue >= from || family.hue <= to
        if (got.a < 0.5 || family.saturation < MIN_SATURATION || !inside) problems.push(`${hexOf(got)} 색상 ${Math.round(family.hue)}도·채도 ${round2(family.saturation)}(기대 ${from}~${to}도)`)
      }
      if (expect.gray === true && !family.gray) problems.push(`${hexOf(got)} — 회색 아님(채널 차 ${family.spread}, 밝기 ${round2(family.luminance)})`)
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
const ALIGN_TOLERANCE = 1.5 // 오른쪽 끝이 맞다고 볼 차이 — 하위 픽셀

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

/** 읽는 순서 — 상자들을 줄(위→아래) 다음 왼쪽→오른쪽으로 세운 원래 번호들 */
const readingOrder = (boxes: Box[]): number[] => {
  const rows = rowsOf(boxes)
  return rows.flatMap((row) => row.map((b) => boxes.indexOf(b)))
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

// ── 움직임·시각 ──────────────────────────────────────────────────────────────

const MOTION_TOLERANCE = 20 // ms — 스크립트 움직임은 프레임(16ms) 단위로 잰다
const MIN_MOTION_MS = 20 // 이보다 짧은 움직임은 없는 것 — 동작 줄이기에서 흔한 0.01ms 전이
const MOVE_MIN_PX = 4 // 자리를 옮겼다고 볼 상자 가운데의 거리
// 색만 바뀌는 전이 — 마우스 올림·누름·포커스의 바탕색 변화는 "움직임"이 아니다
const COLOR_ONLY = /^(color|background-color|border(-(top|right|bottom|left))?-color|outline-color|text-decoration-color|fill|stroke|box-shadow|caret-color|accent-color)$/

/**
 * 조작 뒤 움직임 목록 → 기대값과 비교.
 * - animates: 색만 바뀌지 않는 움직임이 하나라도 있는가 / moves: 상자 가운데가 4px 넘게 자리를 옮겼는가
 * - minMs·maxMs: 가장 긴 움직임의 길이(지연 포함, 허용 오차 20ms). 끝나지 않는 움직임(회전하는 진행 표시)은 길이에서 뺀다
 * - from: 처음 자리가 끝 자리의 어느 쪽인가(below면 아래에서 올라옴) / smoothScroll: 스크롤이 처음과 끝 사이 값을 3번 넘게 지났는가
 */
export const animationVerdict = ({ motions, scroll, expect }: { motions: Motion[]; scroll?: number[]; expect: Json }): { ok: boolean; detail: string } => {
  const moving = motions.filter((m) => m.props.some((p) => !COLOR_ONLY.test(p)) && (m.ms === null || m.ms >= MIN_MOTION_MS))
  const problems: string[] = []
  const seen: string[] = []
  const props = unique(moving.flatMap((m) => m.props)).join('·')
  if (expect.animates !== undefined) {
    const any = moving.length > 0
    if (any !== (expect.animates === true)) problems.push(any ? `움직임 있음(${props}, 기대 없음)` : '움직임 없음')
    else seen.push(any ? `움직임 ${moving.length}개(${props})` : '움직임 없음')
  }
  if (expect.moves !== undefined) {
    const movers = moving.filter((m) => m.shift !== null && m.shift > MOVE_MIN_PX)
    const any = movers.length > 0
    const far = Math.round(Math.max(0, ...movers.map((m) => m.shift as number)))
    if (any !== (expect.moves === true)) problems.push(any ? `자리를 옮김(최대 ${far}px, 기대 안 옮김)` : `자리를 옮긴 움직임 없음${moving.length > 0 ? `(제자리 움직임 ${props})` : ''}`)
    else seen.push(any ? `자리를 옮김(최대 ${far}px)` : '자리를 옮긴 움직임 없음')
  }
  if (typeof expect.minMs === 'number' || typeof expect.maxMs === 'number') {
    const finite = moving.filter((m) => m.ms !== null).map((m) => m.ms as number)
    if (finite.length === 0) problems.push(moving.length === 0 ? '움직임 없음 — 시간을 잴 수 없다' : '끝나는 움직임 없음 — 시간을 잴 수 없다')
    else {
      const longest = Math.round(Math.max(...finite))
      const label = `가장 긴 움직임 ${longest}ms`
      if (typeof expect.minMs === 'number' && longest < expect.minMs - MOTION_TOLERANCE) problems.push(`${label}(기대 ${expect.minMs}ms 이상)`)
      else if (typeof expect.maxMs === 'number' && longest > expect.maxMs + MOTION_TOLERANCE) problems.push(`${label}(기대 ${expect.maxMs}ms 이하)`)
      else seen.push(label)
    }
  }
  if (typeof expect.from === 'string') {
    const toward = (m: Motion) => {
      if (m.dx === null || m.dy === null) return false
      if (expect.from === 'below') return m.dy > MOVE_MIN_PX
      if (expect.from === 'above') return m.dy < -MOVE_MIN_PX
      if (expect.from === 'right') return m.dx > MOVE_MIN_PX
      return m.dx < -MOVE_MIN_PX
    }
    const label = { below: '아래', above: '위', right: '오른쪽', left: '왼쪽' }[expect.from as string]
    if (moving.some(toward)) seen.push(`${label}에서 들어옴`)
    else {
      const shifts = moving.filter((m) => m.dx !== null && m.dy !== null).map((m) => `${Math.round(m.dx as number)},${Math.round(m.dy as number)}`)
      problems.push(`${label}에서 들어오는 움직임 없음${shifts.length > 0 ? `(처음−끝 가운데 ${shifts.slice(0, 3).join(' / ')}px)` : ''}`)
    }
  }
  if (expect.smoothScroll !== undefined) {
    const positions = scroll ?? []
    const start = positions[0]
    const end = positions[positions.length - 1]
    if (positions.length === 0 || start === end) problems.push('스크롤이 움직이지 않음')
    else {
      const lo = Math.min(start, end)
      const hi = Math.max(start, end)
      const between = unique(positions.filter((y) => y > lo + 1 && y < hi - 1).map(String)).length
      const smooth = between >= 3
      if (smooth !== (expect.smoothScroll === true)) problems.push(`스크롤 ${Math.round(start)}→${Math.round(end)}px, 사이 값 ${between}개(${expect.smoothScroll ? '부드럽게 3개 이상' : '바로'} 기대)`)
      else seen.push(`스크롤 ${Math.round(start)}→${Math.round(end)}px, 사이 값 ${between}개`)
    }
  }
  return problems.length > 0 ? { ok: false, detail: problems.join(', ') } : { ok: true, detail: seen.join(', ') }
}

/**
 * 조작 뒤 50ms마다 잰 "보이는가" → 처음 보인 시각과, 마지막으로 보인 덩어리 뒤 처음 안 보인 시각.
 * 깜빡이면(보였다 사라졌다 다시 보임) runs가 2 이상이다. 끝까지 보이면 goneAt은 null
 */
export const visibilityWindow = ({ samples }: { samples: { t: number; visible: boolean }[] }): { appearedAt: number | null; goneAt: number | null; runs: number } => {
  let appearedAt: number | null = null
  let goneAt: number | null = null
  let runs = 0
  let last = false
  for (const sample of samples) {
    if (sample.visible && !last) {
      runs += 1
      if (appearedAt === null) appearedAt = sample.t
      goneAt = null
    }
    if (!sample.visible && last) goneAt = sample.t
    last = sample.visible
  }
  return { appearedAt, goneAt, runs }
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
  const type = String(check.type)
  const target = isObject(check.target) ? check.target : {}
  // 사라져야 하는 단위(빠진 줄)는 앵커를 못 찾는 것이 곧 사라진 것이다 — 조작 대상을 못 찾은 것과 가른다
  if (observation.missing && observation.targetMissing && type === 'exists' && expect.visible === false) return { result: 'met', detail: `대상 없음(${observation.missing})` }
  // 목록은 찾았는데 그 항목만 없다 — 찾는 규칙의 모자람이 아니라 화면에 그 항목이 없는 것이다
  if (observation.missing && observation.absent && type === 'exists' && expect.visible !== false) return { result: 'violated', detail: `목록에 없다: ${observation.missing}` }
  if (observation.missing) return { result: 'not-found', detail: observation.missing }
  // 글자로만 찾는 대상은 찾는 규칙이 모자랄 수 없다(보이는 글자를 다 훑는다) — 없으면 요구한 문구가 화면에 없는 것이다.
  // 역할(role)·단위·관계로 찾는 대상은 화면이 역할을 빠뜨렸을 수도, 규칙이 모자랐을 수도 있어 찾지 못함으로 둔다
  // 뼈대(blank)도 화면의 요소를 다 훑으므로 글자와 같다
  const textOnly = (target.text !== undefined || target.textMatches !== undefined || target.blank !== undefined) && !['role', 'unit', 'dialog', 'pinned', 'near'].some((key) => target[key] !== undefined)
  const targetLabel = String(target.text ?? (target.textMatches !== undefined ? `/${String(target.textMatches)}/` : target.blank !== undefined ? '글자 없이 칠한 상자(뼈대)' : JSON.stringify(target)))
  if (type === 'motion') {
    const { ok, detail } = animationVerdict({ motions: observation.motions ?? [], scroll: observation.scroll, expect })
    return { result: ok ? 'met' : 'violated', detail }
  }
  if (type === 'timing') {
    const samples = observation.samples ?? []
    if (samples.length === 0) return { result: 'not-found', detail: '시각 표본 없음' }
    const { appearedAt, goneAt, runs } = visibilityWindow({ samples })
    if (appearedAt === null) return { result: textOnly ? 'violated' : 'not-found', detail: `${Math.round(samples[samples.length - 1].t)}ms 동안 나타나지 않음: ${targetLabel}` }
    const problems: string[] = []
    if (typeof expect.appearMs === 'number' && appearedAt > expect.appearMs) problems.push(`${Math.round(appearedAt)}ms에 나타남(기대 ${expect.appearMs}ms 안)`)
    if (Array.isArray(expect.goneMs)) {
      const [min, max] = expect.goneMs as number[]
      if (goneAt === null) problems.push(`${Math.round(samples[samples.length - 1].t)}ms까지 사라지지 않음(기대 ${min}~${max}ms)`)
      else if (goneAt < min || goneAt > max) problems.push(`${Math.round(goneAt)}ms에 사라짐(기대 ${min}~${max}ms)`)
    }
    const flicker = runs > 1 ? `, ${runs}번 깜빡임` : ''
    return problems.length > 0
      ? { result: 'violated', detail: problems.join(', ') + flicker }
      : { result: 'met', detail: `${Math.round(appearedAt)}ms에 나타나 ${goneAt === null ? '끝까지 보임' : `${Math.round(goneAt)}ms에 사라짐`}${flicker}` }
  }
  const elements = observation.elements ?? []
  if (elements.length === 0) {
    // 닫힌 시트처럼 "보이지 않아야" 하는 요구는 없어야 지킴이다
    if (type === 'exists' && expect.visible === false) return { result: 'met', detail: '대상 없음(보이지 않음)' }
    if ((type === 'count' || type === 'columns') && (expect.count === 0 || expect.max === 0)) return { result: 'met', detail: '대상 0개' }
    if ((type === 'exists' || type === 'count') && textOnly) return { result: 'violated', detail: `요구한 ${target.blank !== undefined ? '것이' : '글자가'} 화면에 없다: ${targetLabel}` }
    // 기준으로는 찾았는데 조건에 맞는 것이 없다(푸터는 있는데 '사업자'가 없음, 오류 문구는 있는데 격자에서 멂)
    if ((type === 'exists' || type === 'count') && observation.mismatch) return { result: 'violated', detail: observation.mismatch }
    return { result: 'not-found', detail: '대상을 찾지 못함' }
  }
  const visibleCount = elements.filter((e) => e.visible).length

  if (type === 'exists') {
    const problems: string[] = []
    const seen: string[] = []
    const placement = ['present', 'inView', 'withinWidth', 'uncovered'].filter((key) => expect[key] !== undefined)
    if (expect.visible !== undefined || placement.length === 0) {
      const want = expect.visible !== false
      const shown = visibleCount > 0
      if (shown !== want) problems.push(shown ? `보임(${visibleCount}개, 기대 안 보임)` : '있지만 보이지 않음')
      else seen.push(shown ? `보임(${visibleCount}개)` : '보이지 않음')
    }
    if (expect.present === true) seen.push(`있음(${elements.length}개)`)
    const viewport = observation.viewport
    const picked = chosen({ target, elements })
    picked.forEach((element, i) => {
      const where = picked.length > 1 ? ` — ${i + 1}번째 대상` : ''
      const v = element.view
      if ((expect.inView === true || expect.withinWidth === true) && (!v || !viewport)) return problems.push(`화면 좌표 없음${where}`)
      if (v && viewport) {
        const insideX = v.left >= -PX_TOLERANCE && v.right <= viewport.width + PX_TOLERANCE
        // 위 끝이 화면 안 — 아래만 걸친 것(위로 밀려 올라간 패널)은 따라온 것도, 그 구역에 닿은 것도 아니다
        const topInY = v.top >= -PX_TOLERANCE && v.top < viewport.height
        if (expect.inView === true && !(insideX && topInY)) problems.push(`화면 밖(가로 ${Math.round(v.left)}~${Math.round(v.right)}, 세로 ${Math.round(v.top)}~${Math.round(v.bottom)}px, 화면 ${viewport.width}×${viewport.height})${where}`)
        if (expect.withinWidth === true && !insideX) problems.push(`가로로 화면 밖(${Math.round(v.left)}~${Math.round(v.right)}px, 화면 폭 ${viewport.width})${where}`)
      }
      if (expect.uncovered === true && element.hit !== true) problems.push(`다른 요소에 가려짐(가운데 세로줄의 위·가운데·아래 중)${v && viewport && (v.bottom <= 0 || v.top >= viewport.height) ? '(화면 밖)' : ''}${where}`)
    })
    if (placement.some((key) => key !== 'present') && problems.length === 0) seen.push(placement.filter((key) => key !== 'present').join('·'))
    return problems.length > 0
      ? { result: 'violated', detail: problems.slice(0, MAX_PROBLEMS).join('; ') + (problems.length > MAX_PROBLEMS ? ` 외 ${problems.length - MAX_PROBLEMS}곳` : '') }
      : { result: 'met', detail: seen.join(', ') }
  }
  if (type === 'focus') {
    const focused = elements.some((e) => e.focused === true)
    const want = expect.focused !== false
    return { result: focused === want ? 'met' : 'violated', detail: focused ? '포커스 있음' : '포커스 없음' }
  }
  if (type === 'order') {
    const shown = elements.filter((e) => e.visible && e.box)
    const boxes = shown.map((e) => e.box as Box)
    const problems: string[] = []
    const seen: string[] = []
    const name = (e: ObservedElement, i: number) => e.label ?? normalize(e.text ?? '').slice(0, 20) ?? String(i + 1)
    const reading = readingOrder(boxes)
    if (expect.sameRow === true) {
      const rows = rowsOf(boxes).length
      if (rows !== 1) problems.push(`${rows}줄에 걸침(기대 한 줄)`)
      else seen.push('한 줄')
    }
    if (expect.inOrder === true) {
      const inOrder = reading.every((index, i) => i === 0 || index > reading[i - 1])
      if (!inOrder) problems.push(`읽는 순서 ${reading.map((index) => name(shown[index], index)).join(' → ')}`)
      else seen.push('순서대로')
    }
    if (Array.isArray(expect.first)) {
      const want = expect.first as string[]
      const head = reading.slice(0, want.length).map((index) => shown[index].label)
      if (head.some((label) => label === undefined)) problems.push('단위(unit) 대상이 아니라 앞자리를 이름으로 가를 수 없다')
      else if (!want.every((label) => head.includes(label))) problems.push(`앞자리 ${head.join('·')}(기대 ${want.join('·')})`)
      else seen.push(`앞자리 ${head.join('·')}`)
    }
    if (expect.scrollableX === true) {
      if (observation.scrollableX !== true) problems.push('가로로 넘기는 칸이 아님(overflow-x)')
      else seen.push('가로로 넘김')
    }
    if (expect.alignRight === true) {
      const rights = shown.map((e) => (e.textBox ?? e.box as Box).right)
      const spread = rights.length === 0 ? 0 : Math.max(...rights) - Math.min(...rights)
      if (spread > ALIGN_TOLERANCE) problems.push(`오른쪽 끝이 ${round2(spread)}px 어긋남`)
      else seen.push('오른쪽 끝 맞음')
    }
    if (expect.sorted === 'asc' || expect.sorted === 'desc') {
      const numbers = reading.map((index) => Number(String(shown[index].text ?? '').replace(/[^\d.-]/g, '')))
      const ok = numbers.every((n, i) => i === 0 || (expect.sorted === 'asc' ? n >= numbers[i - 1] : n <= numbers[i - 1]))
      const label = expect.sorted === 'asc' ? '오름차순' : '내림차순'
      if (numbers.some(Number.isNaN)) problems.push('수로 읽지 못한 글자가 있음')
      else if (!ok) problems.push(`${label} 아님: ${numbers.slice(0, 6).join(', ')}${numbers.length > 6 ? ' …' : ''}`)
      else seen.push(label)
    }
    return problems.length > 0 ? { result: 'violated', detail: problems.join(', ') } : { result: 'met', detail: seen.join(', ') }
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
      const limit = typeof want.tol === 'number' ? want.tol : pxTolerance(want.px as number)
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
      // 계산된 길이(글자 크기·모서리·테두리)는 하위 픽셀로 흔들리지 않는다 — 상자에서 잰 폭·높이만 1px을 봐준다
      if (typeof slice.px === 'number' && slice.tol === undefined && !BOX_PROPERTIES.includes(property)) slice.tol = Math.min(CSS_TOLERANCE, Math.abs(slice.px) / 4)
      if (Object.keys(slice).filter((k) => k !== 'tol').length === 0) return
      const actual = element.values?.[property]
      const where = picked.length > 1 ? ` — ${i + 1}번째 대상` : ''
      if (actual === null || actual === undefined) {
        problems.push(`${property} 없음${where}`)
        return
      }
      // 칠한 색들은 그중 하나라도 맞으면 지킴이다
      if (property === 'painted-colors') {
        const colors = actual.split(' | ').filter(Boolean)
        const hit = colors.find((color) => compareExpect({ expect: slice, actual: color }).ok)
        if (!hit) problems.push(`${property} ${colors.length === 0 ? '칠한 색 없음' : colors.map((c) => { const rgba = parseColor({ value: c }); return rgba ? hexOf(rgba) : c }).slice(0, 6).join('·')}(기대 ${JSON.stringify(slice.color ?? slice.hue ?? 'gray')} 포함)${where}`)
        else if (i === 0) seen.push(`${property}에 ${hit}`)
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

const judgeLeaf = ({ check, observation }: { check: Json; observation: Observation | undefined }): Verdict => {
  const first = judgeStage({ check, expect: check.expect as Json, observation })
  if (first.result !== 'met' || !isObject(check.then)) return first
  const after = judgeStage({ check, expect: check.then.expect as Json, observation: observation?.then })
  return { result: after.result, detail: `처음 ${first.detail} → 조작 뒤 ${after.detail}` }
}

/**
 * 묶음 판정. checks(모두): 어김이 하나라도 있으면 어김, 어김 없이 찾지 못함이 있으면 찾지 못함, 다 지키면 지킴.
 * anyOf(하나라도): 지킨 것이 있으면 지킴, 없고 어김이 있으면 어김(찾은 대상이 어느 방식도 따르지 않았다), 아니면 찾지 못함.
 * 차이 설명에는 자식 번호를 [1]처럼 붙인다(1부터)
 */
const judgeNode = ({ check, path, leaves }: { check: Json; path: string; leaves: Record<string, Observation> }): Verdict => {
  if (!isCombinator(check)) return judgeLeaf({ check, observation: leaves[path] })
  const shared: Json = { ...check }
  for (const key of ['checks', 'anyOf', 'note']) delete shared[key]
  const any = check.anyOf !== undefined
  const children = toList((check.checks ?? check.anyOf) as Json[])
  const verdicts = children.map((child, i) => judgeNode({ check: { ...shared, ...child }, path: path === '' ? String(i) : `${path}.${i}`, leaves }))
  const tag = (v: Verdict, i: number) => `[${i + 1}] ${v.detail}`
  const pick = (result: Result) => verdicts.map((v, i) => ({ v, i })).filter(({ v }) => v.result === result)
  if (any) {
    const met = pick('met')
    if (met.length > 0) return { result: 'met', detail: tag(met[0].v, met[0].i) }
    const violated = pick('violated')
    const result: Result = violated.length > 0 ? 'violated' : 'not-found'
    return { result, detail: `어느 방식도 아님 — ${verdicts.map(tag).join('; ')}` }
  }
  const violated = pick('violated')
  if (violated.length > 0) return { result: 'violated', detail: violated.map(({ v, i }) => tag(v, i)).join('; ') }
  const notFound = pick('not-found')
  if (notFound.length > 0) return { result: 'not-found', detail: notFound.map(({ v, i }) => tag(v, i)).join('; ') }
  return { result: 'met', detail: verdicts.map(tag).join('; ') }
}

/** 요구 + 관찰 → 다섯 결과 중 하나와 차이 설명. check.then이 있으면 처음 값을 지킨 뒤 조작 뒤 값으로 가른다. 묶음은 observation.leaves를 경로로 찾는다 */
export const verdict = ({ requirement, observation }: { requirement: Requirement; observation: Observation }): Verdict => {
  const { support, reasons } = classifyRequirement({ requirement })
  if (support === 'judge') return { result: 'needs-judge', detail: '기계로 볼 수 없는 요구 — 판정 모델이 본다' }
  if (support === 'unsupported') return { result: 'unsupported', detail: `미지원: ${reasons.join(', ')}` }
  const check = requirement.check
  if (!isCombinator(check)) return judgeLeaf({ check, observation })
  // 묶음 전체가 실패한 경우(index.html 없음·예외) — 낱개 관찰이 없으면 그 사유로 찾지 못함
  if (!observation.leaves) return judgeLeaf({ check: { type: 'exists' }, observation: { ...observation, elements: observation.elements ?? [] } })
  return judgeNode({ check, path: '', leaves: observation.leaves })
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
