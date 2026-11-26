import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  classifyRequirement,
  colorDistance,
  columnsOf,
  companionAnchors,
  compareExpect,
  coverageOf,
  animationVerdict,
  findRepeatUnits,
  gapsOf,
  groupKey,
  leavesOf,
  parseColor,
  parsePx,
  parseSpec,
  summarizeFidelity,
  verdict,
  visibilityWindow,
  type FidelityRow,
  type Motion,
  type Requirement,
} from '../../../scripts/lib/fidelity'

const box = (left: number, top: number, width = 100, height = 100) => ({ left, top, right: left + width, bottom: top + height })

const CARDS = ['소금빵', '우유식빵', '크루아상', '딸기 생크림 케이크', '바닐라 라떼', '앙버터']

const req = (check: Record<string, unknown>, extra: Partial<Requirement> = {}): Requirement => ({ id: 'R01', kind: '수치', text: '시험 요구', check, ...extra })

describe('parseSpec — 요구 목록을 읽고 구조 오류를 가린다', () => {
  const spec = (requirements: unknown[], revisions: unknown[] = []) =>
    JSON.stringify({ requests: { 'bakery-pickup': { platform: 'app', requirements, revisions } } })

  it('요구마다 순서(order)와 요청의 요구 수(total)를 붙인다 — 위치별 충족률에 쓴다', () => {
    const parsed = parseSpec({
      json: spec([
        { id: 'R01', kind: '수치', text: 'a', check: { type: 'exists', target: { text: '빵' }, expect: { visible: true } } },
        { id: 'R02', kind: '색', text: 'b', check: { type: 'exists', target: { text: '떡' }, expect: { visible: true } } },
      ]),
    })
    expect(parsed.errors).toEqual([])
    expect(parsed.requests[0].requirements.map((r) => [r.id, r.order, r.total])).toEqual([
      ['R01', 0, 2],
      ['R02', 1, 2],
    ])
  })

  it('같은 요청 안에서 id가 겹치면 오류다', () => {
    const parsed = parseSpec({
      json: spec([
        { id: 'R01', kind: '수치', text: 'a', check: { type: 'exists', target: { text: '빵' } } },
        { id: 'R01', kind: '수치', text: 'b', check: { type: 'exists', target: { text: '떡' } } },
      ]),
    })
    expect(parsed.errors.join('\n')).toMatch(/R01.*중복/)
  })

  it('check나 type이 없으면 오류다', () => {
    const parsed = parseSpec({ json: spec([{ id: 'R01', kind: '수치', text: 'a' }, { id: 'R02', kind: '수치', text: 'b', check: {} }]) })
    expect(parsed.errors).toHaveLength(2)
  })

  it('설계 표에 없는 type은 경고하고 미지원으로 둔다', () => {
    const parsed = parseSpec({ json: spec([{ id: 'R01', kind: '수치', text: 'a', check: { type: 'style+spacing' } }]) })
    expect(parsed.errors).toEqual([])
    expect(parsed.warnings.join('\n')).toContain('style+spacing')
    expect(parsed.requests[0].requirements[0].support).toBe('unsupported')
  })

  it('수정 요청이 없는 요구를 가리키면 오류다', () => {
    const parsed = parseSpec({
      json: spec(
        [{ id: 'R01', kind: '수치', text: 'a', check: { type: 'exists', target: { text: '빵' } } }],
        [{ id: 'V1', prompt: '고쳐 줘', changes: [{ req: 'R99', expect: {} }] }],
      ),
    })
    expect(parsed.errors.join('\n')).toMatch(/V1.*R99/)
  })

  it('JSON이 아니면 오류 하나로 돌려준다', () => {
    expect(parseSpec({ json: '{' }).errors).toHaveLength(1)
  })

  it('저장소의 요구 목록 초안(요청 6개, 요구 114개)을 구조 오류 없이 읽는다', () => {
    const json = readFileSync(resolve(process.cwd(), '../evals/benchmark/fidelity/requirements.json'), 'utf8')
    const parsed = parseSpec({ json })
    expect(parsed.errors).toEqual([])
    expect(parsed.requests).toHaveLength(6)
    expect(parsed.requests.reduce((sum, r) => sum + r.requirements.length, 0)).toBe(114)
  })

  it('저장소의 요구 목록은 설계 표 밖의 type이 없고, 기계로 재는 요구가 80% 이상이다', () => {
    const json = readFileSync(resolve(process.cwd(), '../evals/benchmark/fidelity/requirements.json'), 'utf8')
    const parsed = parseSpec({ json })
    expect(parsed.warnings).toEqual([])
    const all = parsed.requests.flatMap((r) => r.requirements)
    expect(all.filter((r) => r.support === 'supported').length / all.length).toBeGreaterThanOrEqual(0.8)
  })

  it('checks·anyOf로 묶은 요구는 type 없이도 읽는다', () => {
    const parsed = parseSpec({
      json: spec([{ id: 'R01', kind: '상태', text: 'a', check: { type: 'attr', target: { unit: ['전체'] }, anyOf: [{ property: 'aria-pressed', expect: { equals: 'true' } }, { property: 'aria-selected', expect: { equals: 'true' } }] } }]),
    })
    expect(parsed.errors).toEqual([])
    expect(parsed.requests[0].requirements[0].support).toBe('supported')
  })
})

describe('classifyRequirement — 핵심 문법만 지원하고 나머지는 이유와 함께 미지원', () => {
  it('조작·조작 뒤 기대값(then)이 있는 style 요구는 지원한다', () => {
    const result = classifyRequirement({
      requirement: req({
        type: 'style',
        viewport: 390,
        target: { pinned: 'top' },
        property: 'height',
        expect: { px: 56 },
        then: { steps: [{ do: 'scroll', y: 300 }, { do: 'wait', ms: 600 }], expect: { px: 44 } },
      }),
    })
    expect(result).toEqual({ support: 'supported', reasons: [] })
  })

  it('되풀이 단위 + 단위 안 요소(inner)와 속성 배열은 지원한다', () => {
    const result = classifyRequirement({
      requirement: req({ type: 'style', target: { unit: CARDS, inner: { textMatches: '원$' } }, property: ['background-color', 'color'], expect: { color: ['#C2410C', '#FFFFFF'] } }),
    })
    expect(result.support).toBe('supported')
  })

  it('핵심이 아닌 expect 키는 키 이름을 이유로 남긴다', () => {
    const result = classifyRequirement({ requirement: req({ type: 'style', target: { text: '빵' }, property: 'background-color', expect: { rgbNear: '#FFFFFF', alphaBetween: [0.3, 0.95] } }) })
    expect(result.support).toBe('unsupported')
    expect(result.reasons).toEqual(['expect.rgbNear', 'expect.alphaBetween'])
  })

  it('핵심이 아닌 target 키는 안쪽(inner·within·near)까지 찾아 이유로 남긴다', () => {
    const result = classifyRequirement({ requirement: req({ type: 'style', target: { unit: CARDS, inner: { dot: { maxSize: 16 } } }, property: 'color', expect: { color: '#000000' } }) })
    expect(result.reasons).toEqual(['target.dot'])
    expect(classifyRequirement({ requirement: req({ type: 'exists', target: { dialog: true, ancestorPinned: 'top' }, expect: { visible: true } }) }).reasons).toEqual(['target.ancestorPinned'])
  })

  it('지원하지 않는 조작과 "$target" 참조는 미지원이다', () => {
    const result = classifyRequirement({
      requirement: req({ type: 'exists', steps: [{ do: 'clickEach', target: { text: 'a' } }, { do: 'click', target: '$target' }], target: { text: 'b' }, expect: { visible: true } }),
    })
    expect(result.reasons).toEqual(['steps.do:clickEach', 'steps.target:$target'])
  })

  it('조작의 추가 키(drag의 hold 등)도 미지원 이유다', () => {
    const result = classifyRequirement({ requirement: req({ type: 'exists', steps: [{ do: 'drag', target: { text: 'a' }, dx: 0, dy: 140, hold: true }], target: { text: 'b' }, expect: { visible: true } }) })
    expect(result.reasons).toEqual(['steps.drag.hold'])
  })

  it('설계 표의 나머지 type(copyTone·interaction 등)은 type 하나만 이유로 남긴다 — 그 type의 expect 키까지 세면 이유 순위가 흐려진다', () => {
    expect(classifyRequirement({ requirement: req({ type: 'copyTone', target: { text: 'a' }, expect: { tone: '합쇼체' } }) }).reasons).toEqual(['check.type:copyTone'])
  })

  it('judge는 판정 필요로 분류한다', () => {
    expect(classifyRequirement({ requirement: req({ type: 'judge', ask: '실존 회사 이름이 있는가' }) })).toEqual({ support: 'judge', reasons: [] })
  })

  it('"a|b"처럼 고르는 속성 이름과 상자 좌표(boundingBox)는 미지원이다', () => {
    expect(classifyRequirement({ requirement: req({ type: 'style', target: { text: 'a' }, property: 'stroke|border-color', expect: { color: '#000000' } }) }).reasons).toEqual(['property:a|b'])
    expect(classifyRequirement({ requirement: req({ type: 'style', target: { text: 'a' }, property: 'boundingBox', expect: { px: 1 } }) }).reasons).toEqual(['property:boundingBox'])
  })

  it('type에 맞지 않는 expect 키도 미지원이다 — exists에 count', () => {
    expect(classifyRequirement({ requirement: req({ type: 'exists', target: { text: 'a' }, expect: { count: 3 } }) }).reasons).toEqual(['expect.count'])
  })

  it('attr에 property가 없으면 미지원이지만, 다른 이유(뜻으로 쓴 expect 키)가 있으면 그것만 적는다', () => {
    expect(classifyRequirement({ requirement: req({ type: 'attr', target: { role: 'textbox', name: '연락처' }, expect: { equals: 'a' } }) }).reasons).toEqual(['check.property 없음'])
    expect(classifyRequirement({ requirement: req({ type: 'attr', target: { unit: ['전체'] }, expect: { anyOf: ['aria-selected=true'] } }) }).reasons).toEqual(['expect.anyOf'])
  })

  it('그 밖의 check 키(trigger·context 등)는 check.<키>로 남긴다', () => {
    expect(classifyRequirement({ requirement: req({ type: 'exists', trigger: { do: 'click' }, target: { text: 'a' }, expect: { visible: true } }) }).reasons).toEqual(['check.trigger'])
  })

  it('role의 "a|b"(둘 중 하나)는 지원한다 — 버튼이나 링크', () => {
    expect(classifyRequirement({ requirement: req({ type: 'exists', target: { role: 'button|link', name: '새 청구서' }, expect: { visible: true } }) }).support).toBe('supported')
  })
})

describe('coverageOf — 요구 목록의 지원·미지원 분류표', () => {
  it('요청별 지원 수와 미지원 이유를 많은 순으로 센다', () => {
    const parsed = parseSpec({
      json: JSON.stringify({
        requests: {
          a: {
            requirements: [
              { id: 'R01', kind: '수치', text: 'a', check: { type: 'exists', target: { text: '빵' }, expect: { visible: true } } },
              { id: 'R02', kind: '수치', text: 'b', check: { type: 'copyTone', target: { text: '빵' } } },
              { id: 'R03', kind: '수치', text: 'c', check: { type: 'copyTone', target: { text: '빵' }, expect: { hue: 1 } } },
              { id: 'R05', kind: '색', text: 'e', check: { type: 'exists', target: { text: '빵' }, expect: { hue: 1 } } },
              { id: 'R04', kind: '데이터', text: 'd', check: { type: 'judge' } },
            ],
          },
        },
      }),
    })
    const coverage = coverageOf({ spec: parsed })
    expect(coverage.byRequest).toEqual([{ id: 'a', total: 5, supported: 1, unsupported: 3, judge: 1 }])
    expect(coverage.reasons[0]).toEqual({ reason: 'check.type:copyTone', count: 2 })
    expect(coverage.reasons[1]).toEqual({ reason: 'expect.hue', count: 1 })
  })
})

describe('parsePx·parseColor·colorDistance', () => {
  it('px 값을 수로 읽는다', () => {
    expect(parsePx({ value: '12px' })).toBe(12)
    expect(parsePx({ value: '12.5px' })).toBe(12.5)
    expect(parsePx({ value: '-4px' })).toBe(-4)
    expect(parsePx({ value: '0' })).toBe(0)
    expect(parsePx({ value: 'auto' })).toBeNull()
    expect(parsePx({ value: '' })).toBeNull()
  })

  it('#hex(3·4·6·8자리, 대소문자)를 읽는다', () => {
    expect(parseColor({ value: '#C2410C' })).toEqual({ r: 194, g: 65, b: 12, a: 1 })
    expect(parseColor({ value: '#c2410c' })).toEqual({ r: 194, g: 65, b: 12, a: 1 })
    expect(parseColor({ value: '#fff' })).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(parseColor({ value: '#00000080' })?.a).toBeCloseTo(0.502, 2)
  })

  it('rgb()·rgba()를 쉼표·공백·슬래시 알파 모두 읽는다', () => {
    expect(parseColor({ value: 'rgb(194, 65, 12)' })).toEqual({ r: 194, g: 65, b: 12, a: 1 })
    expect(parseColor({ value: 'rgba(0, 0, 0, 0.08)' })).toEqual({ r: 0, g: 0, b: 0, a: 0.08 })
    expect(parseColor({ value: 'rgb(194 65 12 / 50%)' })).toEqual({ r: 194, g: 65, b: 12, a: 0.5 })
    expect(parseColor({ value: 'transparent' })).toEqual({ r: 0, g: 0, b: 0, a: 0 })
  })

  it('계산된 값이 oklch()·color(srgb)로 나와도 읽는다 — 최근 Chromium은 oklch를 rgb로 바꾸지 않는다', () => {
    const oklch = parseColor({ value: 'oklch(0.5534 0.1739 38.402)' })
    expect(oklch && colorDistance({ a: oklch, b: { r: 194, g: 65, b: 12, a: 1 } })).toBeLessThanOrEqual(3)
    expect(parseColor({ value: 'color(srgb 1 0.5 0 / 0.5)' })).toEqual({ r: 255, g: 128, b: 0, a: 0.5 })
  })

  it('읽을 수 없는 색은 null', () => {
    expect(parseColor({ value: 'lab(50% 40 59)' })).toBeNull()
    expect(parseColor({ value: 'banana' })).toBeNull()
  })

  it('색 거리는 RGB 각 채널 차이의 합(알파 차이는 255배)이다', () => {
    expect(colorDistance({ a: { r: 10, g: 20, b: 30, a: 1 }, b: { r: 11, g: 18, b: 30, a: 1 } })).toBe(3)
    expect(colorDistance({ a: { r: 0, g: 0, b: 0, a: 1 }, b: { r: 0, g: 0, b: 0, a: 0.9 } })).toBeCloseTo(25.5, 5)
  })
})

describe('compareExpect — 기대값과 관찰값', () => {
  it('px는 허용 오차 1px까지 지킴이다(경계 포함)', () => {
    expect(compareExpect({ expect: { px: 12 }, actual: '13px' }).ok).toBe(true)
    expect(compareExpect({ expect: { px: 12 }, actual: '11px' }).ok).toBe(true)
    expect(compareExpect({ expect: { px: 12 }, actual: '13.01px' }).ok).toBe(false)
  })

  it('기대값이 4px보다 작으면 허용 오차는 그 1/4이다 — 1px 선을 0px이, 2px 테두리를 1px이 지키지 않게', () => {
    expect(compareExpect({ expect: { px: 1 }, actual: '0px' }).ok).toBe(false)
    expect(compareExpect({ expect: { px: 1 }, actual: '1px' }).ok).toBe(true)
    expect(compareExpect({ expect: { px: 2 }, actual: '1px' }).ok).toBe(false)
    expect(compareExpect({ expect: { px: 0 }, actual: '1px' }).ok).toBe(false)
    expect(compareExpect({ expect: { px: 0 }, actual: '0px' }).ok).toBe(true)
  })

  it('tol로 허용 오차를 바꾼다', () => {
    expect(compareExpect({ expect: { px: 72, tol: 0 }, actual: '72.5px' }).ok).toBe(false)
    expect(compareExpect({ expect: { px: 72, tol: 3 }, actual: '74px' }).ok).toBe(true)
  })

  it('값이 여럿(모서리 넷)이면 모두 맞아야 한다', () => {
    expect(compareExpect({ expect: { px: 12 }, actual: '12px 12px 12px 12px' }).ok).toBe(true)
    const result = compareExpect({ expect: { px: 12 }, actual: '12px 12px 0px 0px' })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('0px')
  })

  it('px로 읽을 수 없는 값은 어김이다', () => {
    expect(compareExpect({ expect: { px: 12 }, actual: 'auto' }).ok).toBe(false)
  })

  it('색은 거리 2까지 지킴이다(경계 포함), 차이를 hex로 적는다', () => {
    expect(compareExpect({ expect: { color: '#C2410C' }, actual: 'rgb(194, 65, 12)' }).ok).toBe(true)
    expect(compareExpect({ expect: { color: '#C2410C' }, actual: 'rgb(195, 66, 12)' }).ok).toBe(true)
    const off = compareExpect({ expect: { color: '#C2410C' }, actual: 'rgb(195, 66, 13)' })
    expect(off.ok).toBe(false)
    expect(off.detail).toContain('#C3420D')
  })

  it('반투명은 같은 RGB라도 다른 색이다', () => {
    expect(compareExpect({ expect: { color: '#FFFFFF' }, actual: 'rgba(255, 255, 255, 0.7)' }).ok).toBe(false)
  })

  it('equals·matches·min·max', () => {
    expect(compareExpect({ expect: { equals: 'none' }, actual: 'none' }).ok).toBe(true)
    expect(compareExpect({ expect: { matches: 'blur\\(12px\\)' }, actual: 'blur(12px)' }).ok).toBe(true)
    expect(compareExpect({ expect: { matches: '^none$' }, actual: 'blur(12px)' }).ok).toBe(false)
    expect(compareExpect({ expect: { min: 44 }, actual: '44px' }).ok).toBe(true)
    expect(compareExpect({ expect: { min: 44 }, actual: '43.5px' }).ok).toBe(false)
    expect(compareExpect({ expect: { max: 300 }, actual: '301' }).ok).toBe(false)
  })
})

describe('columnsOf·gapsOf — 상자 좌표에서 열 수와 간격', () => {
  const grid = [box(16, 100, 173, 200), box(201, 100, 173, 200), box(16, 312, 173, 200), box(201, 312, 173, 200), box(16, 524, 173, 200), box(201, 524, 173, 200)]

  it('두 열 카드 여섯 장은 2열', () => {
    expect(columnsOf({ boxes: grid })).toBe(2)
  })

  it('마지막 줄이 덜 차도 열 수는 그대로다', () => {
    expect(columnsOf({ boxes: grid.slice(0, 5) })).toBe(2)
  })

  it('하위 픽셀로 위쪽이 조금 달라도 같은 줄이다', () => {
    expect(columnsOf({ boxes: [box(16, 100.4, 173), box(201, 100.6, 173)] })).toBe(2)
  })

  it('한 열 목록은 1열, 상자가 없으면 0', () => {
    expect(columnsOf({ boxes: [box(16, 100, 358), box(16, 212, 358)] })).toBe(1)
    expect(columnsOf({ boxes: [] })).toBe(0)
  })

  it('가로·세로 간격을 줄마다 잰다', () => {
    expect(gapsOf({ boxes: grid })).toEqual({ row: [12, 12], column: [12, 12, 12] })
  })

  it('하위 픽셀 간격은 소수 둘째 자리까지', () => {
    const gaps = gapsOf({ boxes: [box(16, 100, 172.5), box(200.5, 100, 172.5)] })
    expect(gaps.column).toEqual([12])
    expect(gaps.row).toEqual([])
  })

  it('높이가 다른 카드가 한 줄에 있으면 그 줄의 가장 아래에서 다음 줄까지', () => {
    expect(gapsOf({ boxes: [box(16, 100, 173, 200), box(201, 100, 173, 180), box(16, 312, 173, 200)] }).row).toEqual([12])
  })
})

describe('findRepeatUnits — 앵커 글자로 되풀이 단위(카드·행) 찾기', () => {
  // 트리: 1 body > 2 main > (3 칩 줄 > 10..14 칩 버튼) · (4 카드 격자 > 20..25 카드 > 30..35 이름)
  const chain = (...ids: number[]) => ids

  it('앵커마다 형제 중 다른 앵커를 품은 가장 낮은 조상을 단위로 잡는다', () => {
    const result = findRepeatUnits({
      anchors: ['소금빵', '우유식빵'],
      candidates: [
        { anchor: '소금빵', chain: chain(30, 20, 4, 2, 1), exact: true },
        { anchor: '우유식빵', chain: chain(31, 21, 4, 2, 1), exact: true },
      ],
    })
    expect(result).toEqual({ container: 4, units: { 소금빵: 20, 우유식빵: 21 } })
  })

  it('앵커가 두 곳(칩의 "케이크"와 카드의 "딸기 생크림 케이크")에 나오면 앵커를 더 많이 묶는 쪽을 고른다', () => {
    const result = findRepeatUnits({
      anchors: ['식빵', '페이스트리', '케이크'],
      candidates: [
        { anchor: '식빵', chain: chain(11, 3, 2, 1), exact: true },
        { anchor: '페이스트리', chain: chain(12, 3, 2, 1), exact: true },
        { anchor: '케이크', chain: chain(13, 3, 2, 1), exact: true },
        { anchor: '케이크', chain: chain(33, 23, 4, 2, 1), exact: false },
      ],
    })
    expect(result).toEqual({ container: 3, units: { 식빵: 11, 페이스트리: 12, 케이크: 13 } })
  })

  it('앵커가 버튼 안 글자(span)여도 단위는 버튼이다', () => {
    const result = findRepeatUnits({
      anchors: ['전체', '식빵'],
      candidates: [
        { anchor: '전체', chain: chain(40, 10, 3, 2, 1), exact: true },
        { anchor: '식빵', chain: chain(41, 11, 3, 2, 1), exact: true },
      ],
    })
    expect(result.units).toEqual({ 전체: 10, 식빵: 11 })
  })

  it('찾지 못한 앵커는 null', () => {
    const result = findRepeatUnits({
      anchors: ['소금빵', '우유식빵', '앙버터'],
      candidates: [
        { anchor: '소금빵', chain: chain(30, 20, 4, 2, 1), exact: true },
        { anchor: '우유식빵', chain: chain(31, 21, 4, 2, 1), exact: true },
      ],
    })
    expect(result.units['앙버터']).toBeNull()
  })

  it('앵커가 하나뿐이면 단위를 정할 수 없다', () => {
    expect(findRepeatUnits({ anchors: ['소금빵'], candidates: [{ anchor: '소금빵', chain: chain(30, 20, 4, 2, 1), exact: true }] })).toEqual({ container: null, units: { 소금빵: null } })
  })
})

describe('companionAnchors — 앵커가 적은 단위는 같은 요청의 다른 목록을 짝으로 쓴다', () => {
  it('묻는 앵커를 모두 품은 목록들의 합을 돌려준다', () => {
    expect(companionAnchors({ anchors: ['앙버터'], pools: [CARDS, ['전체', '식빵']] })).toEqual(CARDS)
  })

  it('맞는 목록이 없으면 묻는 앵커 그대로', () => {
    expect(companionAnchors({ anchors: ['없는 빵'], pools: [CARDS] })).toEqual(['없는 빵'])
  })
})

describe('verdict — 요구 + 관찰 → 다섯 결과', () => {
  const style = req({ type: 'style', target: { unit: CARDS }, property: 'border-radius', expect: { px: 12 } })

  it('미지원 요구는 관찰을 보지 않고 미지원', () => {
    const result = verdict({ requirement: req({ type: 'copyTone', target: { text: 'a' } }), observation: { elements: [] } })
    expect(result.result).toBe('unsupported')
    expect(result.detail).toContain('check.type:copyTone')
  })

  it('judge는 판정 필요', () => {
    expect(verdict({ requirement: req({ type: 'judge' }), observation: {} }).result).toBe('needs-judge')
  })

  it('예외·조작 대상 없음·대상 없음은 찾지 못함이고 사유를 남긴다', () => {
    expect(verdict({ requirement: style, observation: { error: 'Timeout' } })).toEqual({ result: 'not-found', detail: '오류: Timeout' })
    expect(verdict({ requirement: style, observation: { missing: '조작 1(click) 대상 없음' } }).detail).toContain('click')
    expect(verdict({ requirement: style, observation: { elements: [] } }).result).toBe('not-found')
  })

  it('글자로만 찾는 exists는 글자가 없으면 찾지 못함이 아니라 어김이다 — 요구한 문구 자체가 화면에 없다', () => {
    const empty = req({ type: 'exists', target: { text: '아직 준비된 빵이 없어요' }, expect: { visible: true } })
    const result = verdict({ requirement: empty, observation: { elements: [] } })
    expect(result.result).toBe('violated')
    expect(result.detail).toContain('아직 준비된 빵이 없어요')
    // 역할로 찾는 대상은 버튼이 div라서 못 찾았을 수도 있다 — 찾지 못함으로 둔다
    const button = req({ type: 'exists', target: { role: 'button', name: '다시 시도' }, expect: { visible: true } })
    expect(verdict({ requirement: button, observation: { elements: [] } }).result).toBe('not-found')
  })

  it('보이지 않아야 하는 요구는 대상이 없어도 지킴이다 — 닫힌 시트', () => {
    const closed = req({ type: 'exists', target: { dialog: true }, expect: { visible: false } })
    expect(verdict({ requirement: closed, observation: { elements: [] } }).result).toBe('met')
    expect(verdict({ requirement: closed, observation: { elements: [{ visible: true }] } }).result).toBe('violated')
  })

  it('style — 모든 대상이 맞으면 지킴, 하나라도 다르면 어김과 차이', () => {
    const elements = CARDS.map(() => ({ visible: true, values: { 'border-radius': '12px' } }))
    expect(verdict({ requirement: style, observation: { elements } }).result).toBe('met')
    elements[2] = { visible: true, values: { 'border-radius': '8px' } }
    const result = verdict({ requirement: style, observation: { elements } })
    expect(result.result).toBe('violated')
    expect(result.detail).toContain('8px')
  })

  it('style — 속성 배열과 색 배열을 차례로 맞춘다(바탕·글자)', () => {
    const buttons = req({ type: 'style', target: { role: 'button', name: '담기', all: true }, property: ['background-color', 'color'], expect: { color: ['#C2410C', '#FFFFFF'] } })
    const ok = { visible: true, values: { 'background-color': 'rgb(194, 65, 12)', color: 'rgb(255, 255, 255)' } }
    expect(verdict({ requirement: buttons, observation: { elements: [ok, ok] } }).result).toBe('met')
    const swapped = { visible: true, values: { 'background-color': 'rgb(255, 255, 255)', color: 'rgb(194, 65, 12)' } }
    expect(verdict({ requirement: buttons, observation: { elements: [ok, swapped] } }).result).toBe('violated')
  })

  it('style — all이 아니면 첫 대상만 본다', () => {
    const title = req({ type: 'style', target: { text: '밀밭제과' }, property: 'font-size', expect: { px: 20 } })
    const elements = [{ visible: true, values: { 'font-size': '20px' } }, { visible: true, values: { 'font-size': '14px' } }]
    expect(verdict({ requirement: title, observation: { elements } }).result).toBe('met')
  })

  it('style — 계산된 길이(글자 크기·모서리·테두리)는 허용 오차 0.5px, 상자에서 잰 폭·높이는 1px', () => {
    const tiny = req({ type: 'style', target: { text: '다음 물 주기' }, property: 'font-size', expect: { px: 11 } })
    expect(verdict({ requirement: tiny, observation: { elements: [{ visible: true, values: { 'font-size': '12px' } }] } }).result).toBe('violated')
    expect(verdict({ requirement: tiny, observation: { elements: [{ visible: true, values: { 'font-size': '11px' } }] } }).result).toBe('met')
    const row = req({ type: 'style', target: { unit: CARDS }, property: 'height', expect: { px: 72 } })
    expect(verdict({ requirement: row, observation: { elements: [{ visible: true, values: { height: '72.8px' } }] } }).result).toBe('met')
  })

  it('px와 색이 함께 있으면 길이 속성에는 px, 색 속성에는 색을 쓴다', () => {
    const button = req({ type: 'style', target: { role: 'button', name: '새 청구서' }, property: ['background-color', 'color', 'border-radius'], expect: { color: ['#4338CA', '#FFFFFF'], px: 6 } })
    const values = { 'background-color': 'rgb(67, 56, 202)', color: 'rgb(255, 255, 255)', 'border-radius': '6px' }
    expect(verdict({ requirement: button, observation: { elements: [{ visible: true, values }] } }).result).toBe('met')
  })

  it('then — 처음 값을 지켰으면 조작 뒤 값으로 가른다', () => {
    const header = req({ type: 'style', target: { pinned: 'top' }, property: 'height', expect: { px: 56 }, then: { steps: [{ do: 'scroll', y: 300 }], expect: { px: 44 } } })
    const before = [{ visible: true, values: { height: '56px' } }]
    expect(verdict({ requirement: header, observation: { elements: before, then: { elements: [{ visible: true, values: { height: '44px' } }] } } }).result).toBe('met')
    const stuck = verdict({ requirement: header, observation: { elements: before, then: { elements: [{ visible: true, values: { height: '56px' } }] } } })
    expect(stuck.result).toBe('violated')
    expect(stuck.detail).toContain('조작 뒤')
    expect(verdict({ requirement: header, observation: { elements: [{ visible: true, values: { height: '64px' } }], then: { elements: [{ visible: true, values: { height: '44px' } }] } } }).result).toBe('violated')
    expect(verdict({ requirement: header, observation: { elements: before, then: { missing: '대상 없음' } } }).result).toBe('not-found')
  })

  it('exists — 보이는 대상이 하나라도 있으면 보임', () => {
    const empty = req({ type: 'exists', target: { text: '아직 준비된 빵이 없어요' }, expect: { visible: true } })
    expect(verdict({ requirement: empty, observation: { elements: [{ visible: false }, { visible: true }] } }).result).toBe('met')
    expect(verdict({ requirement: empty, observation: { elements: [{ visible: false }] } }).result).toBe('violated')
  })

  it('count — 보이는 대상의 수', () => {
    const three = req({ type: 'count', target: { role: 'radio', all: true }, expect: { count: 3 } })
    expect(verdict({ requirement: three, observation: { elements: [{ visible: true }, { visible: true }, { visible: true }, { visible: false }] } }).result).toBe('met')
    expect(verdict({ requirement: req({ type: 'count', target: { text: 'a', all: true }, expect: { min: 3 } }), observation: { elements: [{ visible: true }] } }).result).toBe('violated')
  })

  it('text — 정규식(matches)과 같음(equals)은 공백을 하나로 줄여 비교한다', () => {
    const count = req({ type: 'text', target: { textMatches: '충전소' }, expect: { matches: '충전소\\s*5\\s*곳' } })
    expect(verdict({ requirement: count, observation: { elements: [{ visible: true, text: '충전소 5곳' }] } }).result).toBe('met')
    expect(verdict({ requirement: count, observation: { elements: [{ visible: true, text: '충전소 4곳' }] } }).result).toBe('violated')
    const exact = req({ type: 'text', target: { text: '오늘' }, expect: { equals: '오늘 물 줄 식물' } })
    expect(verdict({ requirement: exact, observation: { elements: [{ visible: true, text: ' 오늘   물 줄\n식물 ' }] } }).result).toBe('met')
  })

  it('attr — 속성 값을 equals·matches로', () => {
    const phone = req({ type: 'attr', target: { role: 'textbox', name: '연락처' }, property: 'value', expect: { equals: '010-1234-5678' } })
    expect(verdict({ requirement: phone, observation: { elements: [{ visible: true, values: { value: '010-1234-5678' } }] } }).result).toBe('met')
    expect(verdict({ requirement: phone, observation: { elements: [{ visible: true, values: { value: '01012345678' } }] } }).result).toBe('violated')
    expect(verdict({ requirement: phone, observation: { elements: [{ visible: true, values: { value: null } }] } }).result).toBe('violated')
  })

  it('columns — 보이는 대상 상자의 열 수', () => {
    const two = req({ type: 'columns', target: { unit: CARDS }, expect: { count: 2 } })
    const boxes = [box(16, 0), box(130, 0), box(16, 120), box(130, 120)]
    expect(verdict({ requirement: two, observation: { elements: boxes.map((b) => ({ visible: true, box: b })) } }).result).toBe('met')
    const one = verdict({ requirement: req({ type: 'columns', target: { unit: CARDS }, expect: { count: 1 } }), observation: { elements: boxes.map((b) => ({ visible: true, box: b })) } })
    expect(one.result).toBe('violated')
    expect(one.detail).toContain('2')
  })

  it('spacing — 줄 사이(row)와 칸 사이(column)가 모두 맞아야 지킴', () => {
    const gap = req({ type: 'spacing', target: { unit: CARDS }, expect: { row: { px: 12 }, column: { px: 12 } } })
    const at = (rowGap: number) => [box(16, 0, 100, 100), box(128, 0, 100, 100), box(16, 100 + rowGap, 100, 100), box(128, 100 + rowGap, 100, 100)]
    expect(verdict({ requirement: gap, observation: { elements: at(12).map((b) => ({ visible: true, box: b })) } }).result).toBe('met')
    const wide = verdict({ requirement: gap, observation: { elements: at(16).map((b) => ({ visible: true, box: b })) } })
    expect(wide.result).toBe('violated')
    expect(wide.detail).toContain('16')
  })

  it('spacing — 잴 상자 쌍이 없으면(한 열인데 칸 사이를 물음) 찾지 못함', () => {
    const gap = req({ type: 'spacing', target: { unit: CARDS }, expect: { column: { px: 12 } } })
    expect(verdict({ requirement: gap, observation: { elements: [box(16, 0), box(16, 112)].map((b) => ({ visible: true, box: b })) } }).result).toBe('not-found')
  })
})

describe('leavesOf·groupKey — 여러 확인(checks·anyOf)을 낱개 확인으로 펴기', () => {
  it('부모의 키(type·viewport·target·steps 등)를 자식이 물려받고, 자식 키가 이긴다', () => {
    const leaves = leavesOf({
      check: {
        type: 'attr',
        viewport: 390,
        target: { unit: ['전체'] },
        note: '부모 메모는 물려주지 않는다',
        anyOf: [{ property: 'aria-pressed', expect: { equals: 'true' } }, { type: 'style', property: 'color', expect: { color: '#000000' } }],
      },
    })
    expect(leaves.map((l) => l.path)).toEqual(['0', '1'])
    expect(leaves[0].check).toEqual({ type: 'attr', viewport: 390, target: { unit: ['전체'] }, property: 'aria-pressed', expect: { equals: 'true' } })
    expect(leaves[1].check.type).toBe('style')
  })

  it('묶음 안의 묶음도 편다 — 경로는 "1.0"처럼 적는다', () => {
    const leaves = leavesOf({ check: { type: 'exists', checks: [{ target: { text: 'a' }, expect: { visible: true } }, { anyOf: [{ target: { text: 'b' }, expect: { visible: true } }] }] } })
    expect(leaves.map((l) => l.path)).toEqual(['0', '1.0'])
    expect(leaves[1].check).toEqual({ type: 'exists', target: { text: 'b' }, expect: { visible: true } })
  })

  it('묶음이 아니면 자기 자신 하나', () => {
    expect(leavesOf({ check: { type: 'exists', target: { text: 'a' } } })).toEqual([{ path: '', check: { type: 'exists', target: { text: 'a' } } }])
  })

  it('같은 화면 크기·상태·조작이면 같은 열쇠 — 한 페이지에서 함께 관찰한다. 조작 중 시간을 재는 확인(motion·timing)과 then은 따로', () => {
    const a = { type: 'exists', viewport: 390, steps: [{ do: 'click', target: { text: 'a' } }], target: { text: 'x' } }
    const b = { type: 'style', viewport: 390, steps: [{ do: 'click', target: { text: 'a' } }], target: { text: 'y' }, property: 'color' }
    expect(groupKey({ check: a })).toBe(groupKey({ check: b }))
    expect(groupKey({ check: { ...a, viewport: 320 } })).not.toBe(groupKey({ check: a }))
    expect(groupKey({ check: { ...a, reducedMotion: true } })).not.toBe(groupKey({ check: a }))
    expect(groupKey({ check: { ...a, type: 'motion' } })).toBeNull()
    expect(groupKey({ check: { ...a, then: { expect: { visible: false } } } })).toBeNull()
  })
})

describe('classifyRequirement — 넓힌 문법', () => {
  it('order·motion·timing·focus는 지원한다', () => {
    const ok = (check: Record<string, unknown>) => classifyRequirement({ requirement: req(check) })
    expect(ok({ type: 'order', target: { unit: CARDS }, expect: { inOrder: true, sameRow: true, scrollableX: true } })).toEqual({ support: 'supported', reasons: [] })
    expect(ok({ type: 'order', target: { unit: CARDS }, expect: { first: ['소금빵'], alignRight: true, sorted: 'asc' } }).support).toBe('supported')
    expect(ok({ type: 'motion', steps: [{ do: 'click', target: { role: 'button', name: '필터' } }], target: { dialog: true }, expect: { animates: true, maxMs: 300, from: 'below' } }).support).toBe('supported')
    expect(ok({ type: 'motion', reducedMotion: true, steps: [{ do: 'click', target: { text: 'a' } }], expect: { moves: false } }).support).toBe('supported')
    expect(ok({ type: 'timing', steps: [{ do: 'click', target: { text: 'a' } }], target: { text: '담았어요' }, expect: { appearMs: 300, goneMs: [1700, 2600] } }).support).toBe('supported')
    expect(ok({ type: 'focus', steps: [{ do: 'press', key: 'Escape' }], target: { role: 'button', name: '필터' }, expect: { focused: true } }).support).toBe('supported')
  })

  it('motion·timing은 조작이 있어야 한다 — 마지막 조작부터 잰다. then은 쓸 수 없다', () => {
    expect(classifyRequirement({ requirement: req({ type: 'motion', target: { dialog: true }, expect: { animates: true } }) }).reasons).toEqual(['steps 없음'])
    expect(classifyRequirement({ requirement: req({ type: 'timing', steps: [{ do: 'click', target: { text: 'a' } }], target: { text: 'b' }, expect: { goneMs: [1, 2] }, then: { expect: { goneMs: [1, 2] } } }) }).reasons).toEqual(['check.then'])
  })

  it('timing의 goneMs는 [최소, 최대], motion의 from은 네 방향 중 하나', () => {
    expect(classifyRequirement({ requirement: req({ type: 'timing', steps: [{ do: 'click', target: { text: 'a' } }], target: { text: 'b' }, expect: { goneMs: 2000 } }) }).reasons).toEqual(['expect.goneMs:[최소, 최대] 아님'])
    expect(classifyRequirement({ requirement: req({ type: 'motion', steps: [{ do: 'click', target: { text: 'a' } }], expect: { from: 'top' } }) }).reasons).toEqual(['expect.from:top'])
  })

  it('새 대상 키(nameMatches·containsText·live·blank)와 끌기의 시작점(from)', () => {
    expect(classifyRequirement({ requirement: req({ type: 'exists', target: { role: 'button', nameMatches: '메뉴|menu' }, expect: { visible: true } }) }).support).toBe('supported')
    expect(classifyRequirement({ requirement: req({ type: 'exists', target: { dialog: true, containsText: '확인' }, expect: { visible: true } }) }).support).toBe('supported')
    expect(classifyRequirement({ requirement: req({ type: 'exists', target: { text: '담았어요', live: true }, expect: { present: true } }) }).support).toBe('supported')
    expect(classifyRequirement({ requirement: req({ type: 'count', target: { blank: { minWidth: 100, minHeight: 100 } }, expect: { count: 6 } }) }).support).toBe('supported')
    expect(classifyRequirement({ requirement: req({ type: 'count', target: { blank: { minWidth: 100, round: true } }, expect: { count: 6 } }) }).reasons).toEqual(['target.blank.round'])
    expect(classifyRequirement({ requirement: req({ type: 'exists', steps: [{ do: 'drag', target: { dialog: true }, from: 'top', dx: 0, dy: 300 }], target: { dialog: true }, expect: { visible: false } }) }).support).toBe('supported')
  })

  it('색 계열(hue·gray)은 색 속성의 기대값이다 — 칠한 색들(painted-colors)도 색 속성', () => {
    expect(classifyRequirement({ requirement: req({ type: 'style', target: { text: '1' }, property: 'background-color', expect: { hue: [340, 20] } }) }).support).toBe('supported')
    expect(classifyRequirement({ requirement: req({ type: 'style', target: { text: '1' }, property: 'painted-colors', expect: { color: '#16A34A' } }) }).support).toBe('supported')
    expect(classifyRequirement({ requirement: req({ type: 'style', target: { text: '1' }, property: 'font-size', expect: { gray: true } }) }).reasons).toEqual(['expect:속성에 맞는 기대값 없음'])
  })

  it('exists의 present·inView·withinWidth·uncovered', () => {
    expect(classifyRequirement({ requirement: req({ type: 'exists', target: { text: 'a' }, expect: { inView: true, withinWidth: true, uncovered: true } }) }).support).toBe('supported')
  })

  it('reducedMotion·report(보고문 — 이 검사기는 보지 않는다)는 check 키로 받는다', () => {
    expect(classifyRequirement({ requirement: req({ type: 'style', reducedMotion: true, report: { mustMention: '11px' }, target: { text: 'a' }, property: 'font-size', expect: { px: 11 } }) }).support).toBe('supported')
  })

  it('묶음은 자식 하나라도 미지원이면 미지원이고, 자식의 이유를 모은다. 묶음 안 judge는 쓸 수 없다', () => {
    const mixed = classifyRequirement({ requirement: req({ checks: [{ type: 'exists', target: { text: 'a' }, expect: { visible: true } }, { type: 'exists', target: { text: 'b' }, expect: { hue: 1 } }] }) })
    expect(mixed).toEqual({ support: 'unsupported', reasons: ['expect.hue'] })
    expect(classifyRequirement({ requirement: req({ checks: [{ type: 'judge', ask: '?' }] }) }).reasons).toEqual(['checks 안 judge'])
    expect(classifyRequirement({ requirement: req({ checks: [] }) }).reasons).toEqual(['checks:빈 배열'])
    expect(classifyRequirement({ requirement: req({ checks: [{ type: 'exists', target: { text: 'a' }, expect: {} }], anyOf: [] }) }).reasons).toContain('checks와 anyOf를 함께 씀')
  })
})

describe('compareExpect — 색 계열(hue·gray)', () => {
  it('hue는 [시작, 끝] 각도 안(0도를 넘어 감싸도 된다)이고 채도가 있어야 한다', () => {
    expect(compareExpect({ expect: { hue: [340, 20] }, actual: 'rgb(220, 38, 38)' }).ok).toBe(true) // #DC2626 — 0도
    expect(compareExpect({ expect: { hue: [340, 20] }, actual: 'rgb(225, 29, 72)' }).ok).toBe(true) // #E11D48 — 347도
    expect(compareExpect({ expect: { hue: [340, 20] }, actual: 'rgb(234, 88, 12)' }).ok).toBe(false) // #EA580C — 21도 주황
    expect(compareExpect({ expect: { hue: [340, 20] }, actual: 'rgb(120, 110, 110)' }).ok).toBe(false) // 채도 없음
    expect(compareExpect({ expect: { hue: [340, 20] }, actual: 'rgba(220, 38, 38, 0)' }).ok).toBe(false) // 투명
  })

  it('gray는 무채색(채널 차 40 이하)이고 흰색·검정에 가깝지 않다 — 반투명은 흰 바탕에 섞어 본다', () => {
    expect(compareExpect({ expect: { gray: true }, actual: 'rgb(107, 114, 128)' }).ok).toBe(true) // #6B7280
    expect(compareExpect({ expect: { gray: true }, actual: 'rgb(243, 244, 246)' }).ok).toBe(true) // #F3F4F6 옅은 회색 바탕
    expect(compareExpect({ expect: { gray: true }, actual: 'rgb(26, 26, 26)' }).ok).toBe(false) // 거의 검정
    expect(compareExpect({ expect: { gray: true }, actual: 'rgb(255, 255, 255)' }).ok).toBe(false)
    expect(compareExpect({ expect: { gray: true }, actual: 'rgb(21, 128, 61)' }).ok).toBe(false)
    expect(compareExpect({ expect: { gray: true }, actual: 'rgba(0, 0, 0, 0.5)' }).ok).toBe(true)
  })
})

describe('verdict — 넓힌 문법', () => {
  it('painted-colors — 칠한 색 중 하나라도 기대 색이면 지킴', () => {
    const dot = req({ type: 'style', target: { unit: ['성수 공영주차장'] }, property: 'painted-colors', expect: { color: '#16A34A' } })
    const at = (colors: string) => ({ elements: [{ visible: true, values: { 'painted-colors': colors } }] })
    expect(verdict({ requirement: dot, observation: at('rgb(255, 255, 255) | rgb(22, 163, 74)') }).result).toBe('met')
    expect(verdict({ requirement: dot, observation: at('rgb(255, 255, 255) | rgb(245, 158, 11)') }).result).toBe('violated')
    expect(verdict({ requirement: dot, observation: at('') }).result).toBe('violated')
  })

  it('exists — present는 보이지 않아도(화면 낭독용 칸) 있으면 지킴', () => {
    const live = req({ type: 'exists', target: { text: '담았어요', live: true }, expect: { present: true } })
    expect(verdict({ requirement: live, observation: { elements: [{ visible: false }] } }).result).toBe('met')
    expect(verdict({ requirement: live, observation: { elements: [] } }).result).toBe('violated')
  })

  it('exists — inView는 위 끝이 화면 안(가로로 다 들어감), withinWidth는 가로만, uncovered는 가운데가 가려지지 않음', () => {
    const viewport = { width: 390, height: 844 }
    const el = (view: { left: number; right: number; top: number; bottom: number }, extra = {}) => ({ visible: true, view, ...extra })
    const inView = req({ type: 'exists', target: { text: 'a' }, expect: { inView: true } })
    expect(verdict({ requirement: inView, observation: { viewport, elements: [el({ left: 0, right: 300, top: 800, bottom: 900 })] } }).result).toBe('met')
    expect(verdict({ requirement: inView, observation: { viewport, elements: [el({ left: 0, right: 300, top: 900, bottom: 1000 })] } }).result).toBe('violated')
    // 위로 밀려 올라가 아래만 걸친 패널은 따라온 것이 아니다(스크롤이 짧은 페이지)
    expect(verdict({ requirement: inView, observation: { viewport, elements: [el({ left: 0, right: 300, top: -94, bottom: 306 })] } }).result).toBe('violated')
    const width = req({ type: 'exists', target: { text: 'a', all: true }, expect: { withinWidth: true } })
    expect(verdict({ requirement: width, observation: { viewport, elements: [el({ left: 16, right: 374, top: 2000, bottom: 2020 })] } }).result).toBe('met')
    const over = verdict({ requirement: width, observation: { viewport, elements: [el({ left: 16, right: 374, top: 0, bottom: 20 }), el({ left: 300, right: 420, top: 40, bottom: 60 })] } })
    expect(over.result).toBe('violated')
    expect(over.detail).toContain('2번째')
    const cover = req({ type: 'exists', target: { text: 'a' }, expect: { uncovered: true } })
    expect(verdict({ requirement: cover, observation: { viewport, elements: [el({ left: 0, right: 100, top: 700, bottom: 750 }, { hit: true })] } }).result).toBe('met')
    expect(verdict({ requirement: cover, observation: { viewport, elements: [el({ left: 0, right: 100, top: 700, bottom: 750 }, { hit: false })] } }).result).toBe('violated')
  })

  it('exists visible:false — 대상(단위 앵커)을 못 찾았으면 사라진 것이라 지킴. 조작 대상을 못 찾은 것은 찾지 못함', () => {
    const gone = req({ type: 'exists', target: { unit: ['보스턴고사리'] }, expect: { visible: false } })
    expect(verdict({ requirement: gone, observation: { missing: '되풀이 단위를 찾지 못한 앵커: 보스턴고사리', targetMissing: true } }).result).toBe('met')
    expect(verdict({ requirement: gone, observation: { missing: '조작 1(click) 대상을 찾지 못함' } }).result).toBe('not-found')
  })

  it('찾기 기준으로는 찾았는데 조건(near·containsText·live)에 맞는 것이 없으면(mismatch) 보여야 하는 요구는 어김이다', () => {
    const footer = req({ type: 'exists', target: { role: 'contentinfo', containsText: '사업자' }, expect: { visible: true } })
    const result = verdict({ requirement: footer, observation: { elements: [], mismatch: 'containsText "사업자"를 품은 것 없음(기준 대상 1개)' } })
    expect(result.result).toBe('violated')
    expect(result.detail).toContain('사업자')
    expect(verdict({ requirement: req({ type: 'count', target: { text: '예시', near: { text: '1만' } }, expect: { min: 1 } }), observation: { elements: [], mismatch: '48px 밖' } }).result).toBe('violated')
    expect(verdict({ requirement: footer, observation: { elements: [] } }).result).toBe('not-found')
  })

  it('되풀이 단위에서 그 앵커만 빠졌으면(다른 단위는 있음, absent) 보여야 하는 요구는 어김이다', () => {
    const back = req({ type: 'exists', target: { unit: ['보스턴고사리'] }, expect: { visible: true } })
    expect(verdict({ requirement: back, observation: { missing: '되풀이 단위를 찾지 못한 앵커: 보스턴고사리', targetMissing: true, absent: true } }).result).toBe('violated')
    expect(verdict({ requirement: back, observation: { missing: '되풀이 단위를 찾지 못한 앵커: 보스턴고사리', targetMissing: true } }).result).toBe('not-found')
  })

  it('뼈대(blank)도 글자처럼 화면 전체를 훑으므로, 없으면 찾지 못함이 아니라 어김이다', () => {
    const skeleton = req({ type: 'count', target: { blank: { minWidth: 120, minHeight: 8 } }, expect: { min: 3 } })
    expect(verdict({ requirement: skeleton, observation: { elements: [] } }).result).toBe('violated')
  })

  it('order — 같은 줄·읽는 순서·가로로 넘김', () => {
    const chips = req({ type: 'order', target: { unit: ['전체', '식빵', '케이크'] }, expect: { inOrder: true, sameRow: true, scrollableX: true } })
    const row = [box(16, 10, 60, 36), box(84, 10, 60, 36), box(152, 10, 60, 36)].map((b, i) => ({ visible: true, box: b, label: ['전체', '식빵', '케이크'][i] }))
    expect(verdict({ requirement: chips, observation: { elements: row, scrollableX: true } }).result).toBe('met')
    expect(verdict({ requirement: chips, observation: { elements: row, scrollableX: false } }).detail).toContain('가로')
    const swapped = [row[1], row[0], row[2]].map((e, i) => ({ ...e, label: ['전체', '식빵', '케이크'][i] }))
    expect(verdict({ requirement: chips, observation: { elements: swapped, scrollableX: true } }).result).toBe('violated')
    const wrapped = [row[0], row[1], { ...row[2], box: box(16, 56, 60, 36) }]
    expect(verdict({ requirement: chips, observation: { elements: wrapped, scrollableX: true } }).detail).toContain('줄')
  })

  it('order — first는 읽는 순서의 앞자리들이 그 이름들(순서는 상관없음)', () => {
    const plants = req({ type: 'order', target: { unit: ['몬스테라', '스투키', '보스턴고사리'] }, expect: { first: ['보스턴고사리'] } })
    const at = (tops: number[]) => ({ elements: tops.map((top, i) => ({ visible: true, box: box(16, top, 358, 80), label: ['몬스테라', '스투키', '보스턴고사리'][i] })) })
    expect(verdict({ requirement: plants, observation: at([200, 300, 100]) }).result).toBe('met')
    const late = verdict({ requirement: plants, observation: at([100, 300, 200]) })
    expect(late.result).toBe('violated')
    expect(late.detail).toContain('몬스테라')
  })

  it('order — alignRight는 글자 오른쪽 끝이 맞고, sorted는 글자 속 수가 읽는 순서로 오르거나 내린다', () => {
    const amounts = req({ type: 'order', target: { textMatches: '원$', all: true }, expect: { alignRight: true, sorted: 'asc' } })
    const cell = (top: number, right: number, text: string) => ({ visible: true, box: box(700, top, 160, 40), textBox: { left: right - 80, right, top, bottom: top + 20 }, text })
    expect(verdict({ requirement: amounts, observation: { elements: [cell(100, 860, '320,000원'), cell(140, 860.4, '1,250,000원')] } }).result).toBe('met')
    expect(verdict({ requirement: amounts, observation: { elements: [cell(100, 860, '320,000원'), cell(140, 830, '1,250,000원')] } }).detail).toContain('오른쪽')
    expect(verdict({ requirement: amounts, observation: { elements: [cell(100, 860, '1,250,000원'), cell(140, 860, '320,000원')] } }).detail).toContain('오름차순')
  })

  it('focus — 대상이나 그 안에 포커스가 있으면 지킴', () => {
    const back = req({ type: 'focus', target: { role: 'button', name: '필터' }, expect: { focused: true } })
    expect(verdict({ requirement: back, observation: { elements: [{ visible: true, focused: true }] } }).result).toBe('met')
    expect(verdict({ requirement: back, observation: { elements: [{ visible: true, focused: false }] } }).result).toBe('violated')
  })

  it('timing — 나타난 시각과 사라진 시각을 기대 구간과 비교한다', () => {
    const toast = req({ type: 'timing', steps: [{ do: 'click', target: { text: '담기' } }], target: { text: '장바구니에 담았어요' }, expect: { appearMs: 300, goneMs: [1700, 2600] } })
    const samples = (appear: number, gone: number | null) => Array.from({ length: 60 }, (_, i) => ({ t: i * 50, visible: i * 50 >= appear && (gone === null || i * 50 < gone) }))
    expect(verdict({ requirement: toast, observation: { samples: samples(100, 2150) } }).result).toBe('met')
    expect(verdict({ requirement: toast, observation: { samples: samples(100, 1200) } }).detail).toContain('1200')
    expect(verdict({ requirement: toast, observation: { samples: samples(100, null) } }).detail).toContain('사라지지 않음')
    expect(verdict({ requirement: toast, observation: { samples: samples(500, 2150) } }).result).toBe('violated')
    // 글자로만 찾는 대상이 끝내 나타나지 않으면 어김, 역할로 찾는 대상이면 찾지 못함
    expect(verdict({ requirement: toast, observation: { samples: samples(99999, null) } }).result).toBe('violated')
  })

  it('motion — 시간·방향은 animationVerdict가 가른다', () => {
    const sheet = req({ type: 'motion', steps: [{ do: 'click', target: { text: '필터' } }], target: { dialog: true }, expect: { animates: true, maxMs: 300, from: 'below' } })
    const up: Motion = { props: ['transform'], ms: 280, shift: 400, dx: 0, dy: 400 }
    expect(verdict({ requirement: sheet, observation: { motions: [up] } }).result).toBe('met')
    expect(verdict({ requirement: sheet, observation: { motions: [{ ...up, ms: 450 }] } }).result).toBe('violated')
    expect(verdict({ requirement: sheet, observation: { motions: [] } }).result).toBe('violated')
  })

  it('checks — 모두 지켜야 지킴. 하나라도 어기면 어김, 어김 없이 찾지 못함이 있으면 찾지 못함', () => {
    const both = req({ type: 'exists', checks: [{ target: { text: 'a' }, expect: { visible: true } }, { target: { role: 'button', name: 'b' }, expect: { visible: true } }] })
    const shown = { elements: [{ visible: true }] }
    expect(verdict({ requirement: both, observation: { leaves: { '0': shown, '1': shown } } }).result).toBe('met')
    const missing = verdict({ requirement: both, observation: { leaves: { '0': shown, '1': { elements: [] } } } })
    expect(missing.result).toBe('not-found')
    expect(missing.detail).toContain('[2]')
    expect(verdict({ requirement: both, observation: { leaves: { '0': { elements: [{ visible: false }] }, '1': { elements: [] } } } }).result).toBe('violated')
  })

  it('anyOf — 하나라도 지키면 지킴. 다 못 지켰으면 어김이 있으면 어김, 아니면 찾지 못함', () => {
    const pressed = req({ type: 'attr', target: { unit: ['전체'] }, anyOf: [{ property: 'aria-pressed', expect: { equals: 'true' } }, { property: 'aria-selected', expect: { equals: 'true' } }] })
    const value = (property: string, v: string | null) => ({ elements: [{ visible: true, values: { [property]: v } }] })
    expect(verdict({ requirement: pressed, observation: { leaves: { '0': value('aria-pressed', null), '1': value('aria-selected', 'true') } } }).result).toBe('met')
    expect(verdict({ requirement: pressed, observation: { leaves: { '0': value('aria-pressed', 'false'), '1': value('aria-selected', null) } } }).result).toBe('violated')
    expect(verdict({ requirement: pressed, observation: { leaves: { '0': { missing: 'x' }, '1': { missing: 'x' } } } }).result).toBe('not-found')
  })
})

describe('animationVerdict — 조작 뒤 움직임의 시간·방향', () => {
  const m = (extra: Partial<Motion>): Motion => ({ props: ['transform'], ms: 300, shift: 0, dx: 0, dy: 0, ...extra })

  it('색만 바뀌는 전이(마우스 올림·누름의 바탕색)와 20ms 미만(동작 줄이기의 0.01ms)은 움직임으로 세지 않는다', () => {
    expect(animationVerdict({ motions: [m({ props: ['background-color'] }), m({ ms: 0.01 })], expect: { animates: true } }).ok).toBe(false)
    expect(animationVerdict({ motions: [m({ props: ['background-color', 'opacity'] })], expect: { animates: true } }).ok).toBe(true)
  })

  it('maxMs·minMs는 가장 긴 움직임의 길이(지연 포함)로, 허용 오차 20ms', () => {
    expect(animationVerdict({ motions: [m({ ms: 320 })], expect: { maxMs: 300 } }).ok).toBe(true)
    expect(animationVerdict({ motions: [m({ ms: 321 })], expect: { maxMs: 300 } }).ok).toBe(false)
    expect(animationVerdict({ motions: [m({ ms: 150 }), m({ ms: 300 })], expect: { minMs: 250, maxMs: 350 } }).ok).toBe(true)
    expect(animationVerdict({ motions: [m({ ms: 150 })], expect: { minMs: 250 } }).detail).toContain('150')
  })

  it('끝나지 않는 움직임(회전하는 진행 표시)은 시간에서 빼되 움직임으로는 센다', () => {
    expect(animationVerdict({ motions: [m({ ms: null, props: ['rotate'] })], expect: { animates: true } }).ok).toBe(true)
    expect(animationVerdict({ motions: [m({ ms: null })], expect: { maxMs: 300 } }).ok).toBe(false)
  })

  it('moves는 상자가 4px 넘게 자리를 옮긴 움직임이 있는가 — 같은 자리의 크기·투명도 변화는 아니다', () => {
    expect(animationVerdict({ motions: [m({ shift: 80, dy: 80 })], expect: { moves: true } }).ok).toBe(true)
    expect(animationVerdict({ motions: [m({ shift: 2, props: ['transform', 'opacity'] })], expect: { moves: true } }).ok).toBe(false)
    expect(animationVerdict({ motions: [m({ shift: null })], expect: { moves: false } }).ok).toBe(true)
    expect(animationVerdict({ motions: [], expect: { moves: false } }).ok).toBe(true)
  })

  it('from은 처음 자리가 끝 자리의 어느 쪽인가 — 아래에서 올라오면 dy가 양수', () => {
    expect(animationVerdict({ motions: [m({ shift: 300, dy: 300 })], expect: { from: 'below' } }).ok).toBe(true)
    expect(animationVerdict({ motions: [m({ shift: 400, dx: 400 })], expect: { from: 'right' } }).ok).toBe(true)
    expect(animationVerdict({ motions: [m({ shift: 400, dx: -400 })], expect: { from: 'right' } }).ok).toBe(false)
    expect(animationVerdict({ motions: [m({ shift: 0, dy: 0, props: ['opacity'] })], expect: { from: 'below' } }).ok).toBe(false)
  })

  it('smoothScroll은 스크롤 위치가 처음과 끝 사이 값을 3번 이상 지나야 한다', () => {
    expect(animationVerdict({ motions: [], scroll: [0, 0, 120, 480, 900, 1100, 1100], expect: { smoothScroll: true } }).ok).toBe(true)
    expect(animationVerdict({ motions: [], scroll: [0, 0, 1100, 1100], expect: { smoothScroll: true } }).ok).toBe(false)
    expect(animationVerdict({ motions: [], scroll: [0, 0, 0], expect: { smoothScroll: true } }).detail).toContain('움직이지')
  })
})

describe('visibilityWindow — 시각별 보임에서 나타난·사라진 시각', () => {
  it('처음 보인 시각과, 마지막으로 보인 뒤 처음 안 보인 시각', () => {
    const samples = [0, 50, 100, 150, 200, 250].map((t) => ({ t, visible: t >= 50 && t < 200 }))
    expect(visibilityWindow({ samples })).toEqual({ appearedAt: 50, goneAt: 200, runs: 1 })
  })

  it('깜빡이면(보였다 안 보였다 다시 보임) runs가 늘고 사라진 시각은 마지막 덩어리 뒤', () => {
    const pattern = [false, true, false, true, true, false]
    expect(visibilityWindow({ samples: pattern.map((visible, i) => ({ t: i * 50, visible })) })).toEqual({ appearedAt: 50, goneAt: 250, runs: 2 })
  })

  it('끝까지 안 사라지면 goneAt은 null, 한 번도 안 보이면 둘 다 null', () => {
    expect(visibilityWindow({ samples: [{ t: 0, visible: true }] })).toEqual({ appearedAt: 0, goneAt: null, runs: 1 })
    expect(visibilityWindow({ samples: [{ t: 0, visible: false }] })).toEqual({ appearedAt: null, goneAt: null, runs: 0 })
  })
})

describe('summarizeFidelity — 충족률과 나눔', () => {
  const row = (result: FidelityRow['result'], extra: Partial<FidelityRow> = {}): FidelityRow => ({ request: 'bakery-pickup', id: 'R01', kind: '수치', conflict: false, order: 0, total: 3, result, ...extra })

  it('엄격 충족률은 찾지 못함을 분모에 넣고, 너그러운 충족률은 넣지 않는다', () => {
    const summary = summarizeFidelity({ results: [row('met'), row('met'), row('violated'), row('not-found'), row('unsupported', { reasons: ['expect.hue'] }), row('needs-judge')] })
    expect(summary.counts).toEqual({ met: 2, violated: 1, notFound: 1, needsJudge: 1, unsupported: 1, total: 6 })
    expect(summary.strict).toBeCloseTo(2 / 4, 5)
    expect(summary.lenient).toBeCloseTo(2 / 3, 5)
    expect(summary.notFoundRate).toBeCloseTo(1 / 4, 5)
  })

  it('kind별·부딪침 유무별로 나눈다', () => {
    const summary = summarizeFidelity({ results: [row('met', { kind: '색', conflict: true }), row('violated', { kind: '색' }), row('met', { kind: '수치' })] })
    expect(summary.byKind['색'].strict).toBeCloseTo(0.5, 5)
    expect(summary.byKind['수치'].strict).toBe(1)
    expect(summary.byConflict.conflict.counts.met).toBe(1)
    expect(summary.byConflict.plain.counts.total).toBe(2)
  })

  it('요구 순서를 셋으로 나눈다 — 20개면 0~6·7~13·14~19', () => {
    const results = Array.from({ length: 20 }, (_, order) => row(order < 7 ? 'met' : 'violated', { id: `R${order}`, order, total: 20 }))
    const summary = summarizeFidelity({ results })
    expect(summary.byTercile.map((t) => t.counts.total)).toEqual([7, 7, 6])
    expect(summary.byTercile.map((t) => t.strict)).toEqual([1, 0, 0])
  })

  it('미지원 이유는 요구 하나에 한 번씩(반복 실행을 겹쳐 세지 않게) 센다', () => {
    const summary = summarizeFidelity({
      results: [
        row('unsupported', { id: 'R05', reasons: ['expect.matchesEach'] }),
        row('unsupported', { id: 'R05', reasons: ['expect.matchesEach'] }),
        row('unsupported', { id: 'R06', reasons: ['expect.anyOf', 'expect.matchesEach'] }),
      ],
    })
    expect(summary.counts.unsupported).toBe(3)
    expect(summary.unsupportedReasons).toEqual([
      { reason: 'expect.matchesEach', count: 2 },
      { reason: 'expect.anyOf', count: 1 },
    ])
  })

  it('결과가 없으면 충족률은 null', () => {
    const summary = summarizeFidelity({ results: [] })
    expect(summary.strict).toBeNull()
    expect(summary.lenient).toBeNull()
    expect(summary.notFoundRate).toBeNull()
  })
})
