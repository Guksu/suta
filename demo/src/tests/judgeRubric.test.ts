import { CRITERIA, RUBRIC_SCHEMA, resolveRubric, rubricInstruction, summarizeRubric, type RubricJudgment } from '../../../scripts/lib/judgeRubric'

const REQUEST = '헬스장 앱의 그룹 수업 시간표 화면을 모바일 기준으로 만들어 줘. 요일 선택, 수업 목록, 예약 버튼이 필요해.'

describe('rubricInstruction — 요청한 범위 안에서 항목별로 고르게 한다', () => {
  it('요청문과 항목 네 가지의 물음을 싣는다', () => {
    const text = rubricInstruction({ request: REQUEST, mobileOnly: true })
    expect(text).toContain(REQUEST)
    for (const criterion of CRITERIA) expect(text).toContain(criterion.ask)
    expect(CRITERIA.map((c) => c.id)).toEqual(['request', 'hierarchy', 'controls', 'finish'])
  })

  it('요청에 없는 것은 비교에 넣지 않고 화면별로 따로 적게 한다', () => {
    const text = rubricInstruction({ request: REQUEST, mobileOnly: true })
    expect(text).toContain('요청문에 적히지 않은')
    expect(text).toContain('extras')
  })

  it('무엇이 요청 밖인지 예를 들지 않는다 — 탭 바 같은 낱말을 주면 판정이 그쪽으로 기운다', () => {
    const text = rubricInstruction({ request: REQUEST, mobileOnly: true })
    for (const word of ['탭 바', '탭바', '내비게이션', '하단']) expect(text).not.toContain(word)
  })

  it('suta의 규칙(색·간격 값·금지선)을 싣지 않는다', () => {
    const text = rubricInstruction({ request: REQUEST, mobileOnly: false })
    for (const word of ['suta', '강조색', '그라데이션', '4px', '이모지']) expect(text).not.toContain(word)
  })

  it('앱 화면은 모바일 캡처만, 웹 화면은 데스크톱 캡처까지 알린다', () => {
    expect(rubricInstruction({ request: REQUEST, mobileOnly: true })).not.toContain('desktop')
    expect(rubricInstruction({ request: REQUEST, mobileOnly: false })).toContain('A-desktop.png')
  })

  it('답의 틀이 항목마다 A·B·tie, 화면별 요청 밖 목록, 이유를 요구한다', () => {
    const schema = JSON.parse(RUBRIC_SCHEMA)
    expect(Object.keys(schema.properties.criteria.properties)).toEqual(CRITERIA.map((c) => c.id))
    expect(schema.properties.criteria.properties.request.enum).toEqual(['A', 'B', 'tie'])
    expect(schema.properties.extras.required).toEqual(['A', 'B'])
    expect(schema.required).toEqual(['criteria', 'extras', 'reason'])
  })
})

describe('resolveRubric — A·B를 조건 이름으로 되돌린다', () => {
  const verdict = {
    criteria: { request: 'tie', hierarchy: 'A', controls: 'B', finish: 'A' },
    extras: { A: ['수업 후기'], B: [] },
    reason: 'A가 위계가 분명하다.',
  }

  it('suta가 A로 놓인 판정', () => {
    const resolved = resolveRubric({ verdict, order: 'suta-first' })
    expect(resolved?.criteria).toEqual({ request: 'tie', hierarchy: 'suta', controls: 'baseline', finish: 'suta' })
    expect(resolved?.extras).toEqual({ suta: ['수업 후기'], baseline: [] })
    expect(resolved?.winner).toBe('suta') // 항목 2 : 1
  })

  it('baseline이 A로 놓인 판정', () => {
    const resolved = resolveRubric({ verdict, order: 'base-first' })
    expect(resolved?.criteria).toEqual({ request: 'tie', hierarchy: 'baseline', controls: 'suta', finish: 'baseline' })
    expect(resolved?.extras).toEqual({ suta: [], baseline: ['수업 후기'] })
    expect(resolved?.winner).toBe('baseline')
  })

  it('이긴 항목 수가 같으면 비김이다', () => {
    const even = { ...verdict, criteria: { request: 'A', hierarchy: 'B', controls: 'tie', finish: 'tie' } }
    expect(resolveRubric({ verdict: even, order: 'suta-first' })?.winner).toBe('tie')
  })

  it('항목이 빠졌거나 값이 틀리면 판정 실패(null)다', () => {
    expect(resolveRubric({ verdict: null, order: 'suta-first' })).toBeNull()
    expect(resolveRubric({ verdict: { ...verdict, criteria: { request: 'A' } }, order: 'suta-first' })).toBeNull()
    expect(resolveRubric({ verdict: { ...verdict, criteria: { ...verdict.criteria, finish: 'C' } }, order: 'suta-first' })).toBeNull()
  })

  it('요청 밖 목록이 없거나 배열이 아니면 빈 목록으로 본다', () => {
    const resolved = resolveRubric({ verdict: { ...verdict, extras: { A: '없음' } }, order: 'suta-first' })
    expect(resolved?.extras).toEqual({ suta: [], baseline: [] })
  })
})

describe('summarizeRubric — 항목별 집계', () => {
  const judgment = ({ pair, order, criteria, extras = { suta: [], baseline: [] } }: Pick<RubricJudgment, 'pair' | 'order' | 'criteria'> & { extras?: RubricJudgment['extras'] }): RubricJudgment => {
    const wins = (who: string) => Object.values(criteria).filter((value) => value === who).length
    const winner = wins('suta') > wins('baseline') ? 'suta' : wins('baseline') > wins('suta') ? 'baseline' : 'tie'
    return { pair, prompt: pair.replace(/-\d+$/, ''), order, criteria, extras, winner, reason: '' }
  }
  const all = (who: 'suta' | 'baseline' | 'tie') => ({ request: who, hierarchy: who, controls: who, finish: who })
  const judgments = [
    judgment({ pair: 'class-schedule-1', order: 'base-first', criteria: all('suta'), extras: { suta: [], baseline: ['수업 후기', '추천 수업'] } }),
    judgment({ pair: 'class-schedule-1', order: 'suta-first', criteria: { ...all('suta'), finish: 'baseline' }, extras: { suta: [], baseline: ['수업 후기'] } }),
    judgment({ pair: 'split-bill-1', order: 'base-first', criteria: all('baseline') }),
    judgment({ pair: 'split-bill-1', order: 'suta-first', criteria: { ...all('tie'), controls: 'suta' } }),
  ]
  const summary = summarizeRubric(judgments)

  it('항목마다 어느 쪽을 몇 번 골랐는지 센다', () => {
    expect(summary.judgments).toBe(4)
    expect(summary.criteria.request).toEqual({ suta: 2, baseline: 1, tie: 1 })
    expect(summary.criteria.finish).toEqual({ suta: 1, baseline: 2, tie: 1 })
    expect(summary.criteria.controls).toEqual({ suta: 3, baseline: 1, tie: 0 })
  })

  it('항목을 합친 승패와 요청별 승패를 낸다', () => {
    expect(summary.overall).toEqual({ suta: 3, baseline: 1, tie: 0 })
    expect(summary.byPrompt['class-schedule']).toEqual({ suta: 2, baseline: 0, tie: 0 })
    expect(summary.byPrompt['split-bill']).toEqual({ suta: 1, baseline: 1, tie: 0 })
  })

  it('순서를 바꾼 두 판정이 항목마다 같은 쪽을 고른 비율을 낸다 — 항목이 순서에 흔들리는지 본다', () => {
    // class-schedule-1: request·hierarchy·controls 일치, finish 불일치. split-bill-1: 넷 다 불일치
    expect(summary.orderAgreement.request).toEqual({ same: 1, pairs: 2 })
    expect(summary.orderAgreement.finish).toEqual({ same: 0, pairs: 2 })
    expect(summary.orderAgreement.overall).toEqual({ same: 1, pairs: 2 })
  })

  it('요청 밖 요소를 적은 판정 수와 적힌 개수를 조건별로 센다', () => {
    expect(summary.extras.baseline).toEqual({ judgments: 2, items: 3 })
    expect(summary.extras.suta).toEqual({ judgments: 0, items: 0 })
  })

  it('판정이 없으면 0으로 채운다', () => {
    const empty = summarizeRubric([])
    expect(empty.judgments).toBe(0)
    expect(empty.overall).toEqual({ suta: 0, baseline: 0, tie: 0 })
    expect(empty.orderAgreement.overall).toEqual({ same: 0, pairs: 0 })
  })
})
