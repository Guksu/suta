/**
 * 항목별 블라인드 판정의 순수 로직 (DOM·파일·프로세스 없음 — 판정 실행은 scripts/benchmark/judge.mjs).
 *
 * 하나를 고르게 하는 판정("실제 앱에 내보내도 좋을 쪽")은 화면 전체의 인상으로 답한다. 그 인상에는
 * 요청에 없는 구역이 있어 화면이 더 차 보이는 것도 들어간다. 요청한 것을 얼마나 잘 만들었는지와
 * 요청에 없는 것을 얼마나 더 넣었는지가 한 숫자에 섞인다.
 *
 * 항목별 판정은 둘을 가른다.
 *  - 비교는 요청문에 적힌 범위 안에서만, 항목 네 가지로 한다.
 *  - 요청문에 없는 것은 비교에 넣지 않고 화면별로 따로 적게 한다(좋다·나쁘다를 묻지 않는다).
 * 무엇이 요청 밖인지 예는 들지 않는다. 낱말을 주면 판정이 그 낱말을 찾는다.
 */

export const CRITERIA = [
  { id: 'request', label: '요청 충족', en: 'Request coverage', ask: '요청문에 적힌 항목이 빠짐없이, 요청한 대로 들어 있는가' },
  { id: 'hierarchy', label: '정보 위계', en: 'Hierarchy', ask: '요청한 내용 가운데 먼저 봐야 할 것이 먼저, 크게 읽히는가' },
  { id: 'controls', label: '조작', en: 'Controls', ask: '요청한 조작(버튼·선택·입력)이 무엇을 하는지와 지금 상태가 한눈에 읽히는가' },
  { id: 'finish', label: '마감', en: 'Finish', ask: '간격·정렬·글자 크기·대비가 일관되고, 잘리거나 겹치거나 넘친 곳이 없는가' },
] as const

export type CriterionId = (typeof CRITERIA)[number]['id']
export type Side = 'suta' | 'baseline' | 'tie'
export type Order = 'suta-first' | 'base-first'

export type RubricJudgment = {
  pair: string
  prompt: string
  order: Order
  criteria: Record<CriterionId, Side>
  /** 판정자가 적은 "요청문에 없는 것" — 조건별 */
  extras: { suta: string[]; baseline: string[] }
  /** 이긴 항목 수로 정한 승패 — 판정자에게 따로 묻지 않는다 */
  winner: Side
  reason: string
}

const PICK = ['A', 'B', 'tie']

export const RUBRIC_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    criteria: {
      type: 'object',
      properties: Object.fromEntries(CRITERIA.map((criterion) => [criterion.id, { type: 'string', enum: PICK }])),
      required: CRITERIA.map((criterion) => criterion.id),
    },
    extras: {
      type: 'object',
      properties: { A: { type: 'array', items: { type: 'string' } }, B: { type: 'array', items: { type: 'string' } } },
      required: ['A', 'B'],
    },
    reason: { type: 'string' },
  },
  required: ['criteria', 'extras', 'reason'],
})

export const rubricInstruction = ({ request, mobileOnly }: { request: string; mobileOnly: boolean }) => {
  const files = mobileOnly
    ? `같은 요청으로 만든 모바일 앱 화면 두 개(A, B)의 스크린샷이 이 폴더에 있다.
- A-mobile.png, B-mobile.png: 390px 폭 모바일 화면 전체`
    : `같은 요청으로 만든 웹 화면 두 개(A, B)의 스크린샷이 이 폴더에 있다.
- A-mobile.png, B-mobile.png: 390px 폭 모바일 화면 전체
- A-desktop.png, B-desktop.png: 1280px 폭 데스크톱 첫 화면`
  return `${files}

요청: "${request}"

이미지를 모두 Read로 연 뒤 아래 순서로 답하라.

1. extras: 화면마다, 요청문에 적히지 않은 구역·기능·데이터 항목을 짧은 이름으로 적는다. 없으면 빈 목록. 좋은지 나쁜지는 판단하지 않는다.
2. criteria: 요청문에 적힌 범위 안에서만 두 화면을 비교해 항목마다 A·B·tie를 고른다. 1에서 적은 것은 이 비교에 넣지 않는다.
${CRITERIA.map((criterion) => `   - ${criterion.id} (${criterion.label}): ${criterion.ask}`).join('\n')}
   차이가 거의 없는 항목은 tie.
3. reason: 항목들을 가른 가장 큰 차이를 한국어 한 문장으로.`
}

/** A·B를 조건 이름으로 되돌린다. 답이 틀에 맞지 않으면 null(판정 실패) */
export const resolveRubric = ({ verdict, order }: { verdict: unknown; order: Order }): Pick<RubricJudgment, 'criteria' | 'extras' | 'winner' | 'reason'> | null => {
  if (!verdict || typeof verdict !== 'object') return null
  const { criteria, extras, reason } = verdict as { criteria?: Record<string, unknown>; extras?: Record<string, unknown>; reason?: unknown }
  if (!criteria || typeof criteria !== 'object') return null
  const [a, b]: [Side, Side] = order === 'suta-first' ? ['suta', 'baseline'] : ['baseline', 'suta']
  const resolved = {} as Record<CriterionId, Side>
  for (const { id } of CRITERIA) {
    const picked = criteria[id]
    if (picked !== 'A' && picked !== 'B' && picked !== 'tie') return null
    resolved[id] = picked === 'tie' ? 'tie' : picked === 'A' ? a : b
  }
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [])
  const bySide = { [a]: list(extras?.A), [b]: list(extras?.B) } as Record<'suta' | 'baseline', string[]>
  const wins = (who: Side) => Object.values(resolved).filter((value) => value === who).length
  const winner: Side = wins('suta') > wins('baseline') ? 'suta' : wins('baseline') > wins('suta') ? 'baseline' : 'tie'
  return { criteria: resolved, extras: { suta: bySide.suta, baseline: bySide.baseline }, winner, reason: typeof reason === 'string' ? reason : '' }
}

type Tally = Record<Side, number>
const tally = (sides: Side[]): Tally => ({
  suta: sides.filter((side) => side === 'suta').length,
  baseline: sides.filter((side) => side === 'baseline').length,
  tie: sides.filter((side) => side === 'tie').length,
})

/** 같은 키끼리 묶는다 — Object.groupBy는 데모의 타입 검사 대상(lib)에 없어 직접 둔다 */
const groupBy = (judgments: RubricJudgment[], key: (judgment: RubricJudgment) => string) => {
  const groups: Record<string, RubricJudgment[]> = {}
  for (const judgment of judgments) (groups[key(judgment)] ??= []).push(judgment)
  return groups
}

export const summarizeRubric = (judgments: RubricJudgment[]) => {
  const pairs = Object.values(groupBy(judgments, (judgment) => judgment.pair)).filter((pair) => pair.length === 2)
  // 순서를 바꾼 두 판정이 같은 쪽을 골랐는가 — 낮으면 그 항목은 놓인 자리에 흔들린다
  const agreement = (pick: (judgment: RubricJudgment) => Side) => ({ same: pairs.filter(([first, second]) => pick(first) === pick(second)).length, pairs: pairs.length })
  const extrasOf = (side: 'suta' | 'baseline') => ({
    judgments: judgments.filter((judgment) => judgment.extras[side].length > 0).length,
    items: judgments.reduce((sum, judgment) => sum + judgment.extras[side].length, 0),
  })
  return {
    judgments: judgments.length,
    criteria: Object.fromEntries(CRITERIA.map(({ id }) => [id, tally(judgments.map((judgment) => judgment.criteria[id]))])) as Record<CriterionId, Tally>,
    overall: tally(judgments.map((judgment) => judgment.winner)),
    byPrompt: Object.fromEntries(Object.entries(groupBy(judgments, (judgment) => judgment.prompt)).map(([prompt, list]) => [prompt, tally(list.map((judgment) => judgment.winner))])),
    orderAgreement: {
      ...(Object.fromEntries(CRITERIA.map(({ id }) => [id, agreement((judgment) => judgment.criteria[id])])) as Record<CriterionId, { same: number; pairs: number }>),
      overall: agreement((judgment) => judgment.winner),
    },
    extras: { suta: extrasOf('suta'), baseline: extrasOf('baseline') },
  }
}
