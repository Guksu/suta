import { cardTransform, nextStackState, stackHeight } from '@skills/card-stack/assets/stackLayout'

const base = { count: 4, cardHeight: 180 }

describe('cardTransform — 모드별 카드 배치 (정수 px)', () => {
  it('stacked: index마다 peek만큼 내려가고 뒤(위) 카드일수록 살짝 작다', () => {
    expect(cardTransform({ ...base, mode: 'stacked', index: 0 })).toEqual({ translateY: 0, scale: 0.94, zIndex: 0 })
    expect(cardTransform({ ...base, mode: 'stacked', index: 3 })).toEqual({ translateY: 168, scale: 1, zIndex: 3 })
    expect(cardTransform({ ...base, mode: 'stacked', index: 1, peekPx: 40 })).toEqual({ translateY: 40, scale: 0.96, zIndex: 1 })
  })

  it('stacked: zIndex는 index 순 — 아래(뒤 index) 카드가 앞이라 위 카드는 윗가장자리만 보인다', () => {
    const zs = [0, 1, 2, 3].map((index) => cardTransform({ ...base, mode: 'stacked', index }).zIndex)
    expect(zs).toEqual([0, 1, 2, 3])
  })

  it('fanned: fanGap 간격으로 펼쳐지고 배율은 1', () => {
    expect(cardTransform({ ...base, mode: 'fanned', index: 2 })).toEqual({ translateY: 144, scale: 1, zIndex: 2 })
    expect(cardTransform({ ...base, mode: 'fanned', index: 2, fanGapPx: 100 })).toEqual({ translateY: 200, scale: 1, zIndex: 2 })
  })

  it('selected: 선택 카드는 맨 위·원래 크기·맨 앞(zIndex = count)', () => {
    expect(cardTransform({ ...base, mode: 'selected', selectedIndex: 2, index: 2 })).toEqual({ translateY: 0, scale: 1, zIndex: 4 })
  })

  it('selected: 나머지는 cardHeight + 16 아래에서 선택 카드를 뺀 순번으로 겹친다', () => {
    // 선택 2 → 나머지 순번: 0→0, 1→1, 3→2
    expect(cardTransform({ ...base, mode: 'selected', selectedIndex: 2, index: 0 })).toEqual({ translateY: 196, scale: 0.96, zIndex: 0 })
    expect(cardTransform({ ...base, mode: 'selected', selectedIndex: 2, index: 1 })).toEqual({ translateY: 252, scale: 0.98, zIndex: 1 })
    expect(cardTransform({ ...base, mode: 'selected', selectedIndex: 2, index: 3 })).toEqual({ translateY: 308, scale: 1, zIndex: 2 })
  })

  it('소수 peek·fanGap도 정수 px로 반올림되고, 컨테이너 높이는 모드별로 계산된다', () => {
    expect(cardTransform({ ...base, mode: 'stacked', index: 3, peekPx: 33.3 }).translateY).toBe(100)
    expect(stackHeight({ ...base, mode: 'stacked' })).toBe(180 + 56 * 3)
    expect(stackHeight({ ...base, mode: 'fanned' })).toBe(180 + 72 * 3)
    expect(stackHeight({ ...base, mode: 'selected' })).toBe(180 + 16 + 56 * 3)
    expect(stackHeight({ count: 0, cardHeight: 180, mode: 'stacked' })).toBe(0)
  })
})

describe('nextStackState — 탭·Esc 상태 전이', () => {
  it('stacked에서 묶음이나 카드를 누르면 펼쳐진다', () => {
    expect(nextStackState({ mode: 'stacked', selectedIndex: null, action: { type: 'tapStack' } })).toEqual({ mode: 'fanned', selectedIndex: null })
    expect(nextStackState({ mode: 'stacked', selectedIndex: null, action: { type: 'tapCard', index: 2 } })).toEqual({ mode: 'fanned', selectedIndex: null })
  })

  it('fanned에서 카드를 누르면 그 카드가 선택된다', () => {
    expect(nextStackState({ mode: 'fanned', selectedIndex: null, action: { type: 'tapCard', index: 1 } })).toEqual({ mode: 'selected', selectedIndex: 1 })
  })

  it('selected에서 같은 카드를 다시 누르면 펼침으로 돌아가고, 다른 카드를 누르면 교체된다', () => {
    expect(nextStackState({ mode: 'selected', selectedIndex: 1, action: { type: 'tapCard', index: 1 } })).toEqual({ mode: 'fanned', selectedIndex: null })
    expect(nextStackState({ mode: 'selected', selectedIndex: 1, action: { type: 'tapCard', index: 3 } })).toEqual({ mode: 'selected', selectedIndex: 3 })
  })

  it('selected에서 dismiss(Esc)는 펼침으로 한 단계만 물러난다', () => {
    expect(nextStackState({ mode: 'selected', selectedIndex: 1, action: { type: 'dismiss' } })).toEqual({ mode: 'fanned', selectedIndex: null })
  })

  it('fanned에서 dismiss는 접히고, stacked에서 dismiss는 아무 일도 없다', () => {
    expect(nextStackState({ mode: 'fanned', selectedIndex: null, action: { type: 'dismiss' } })).toEqual({ mode: 'stacked', selectedIndex: null })
    expect(nextStackState({ mode: 'stacked', selectedIndex: null, action: { type: 'dismiss' } })).toEqual({ mode: 'stacked', selectedIndex: null })
  })
})

describe('cardTransform — 카드가 많을 때', () => {
  it('수십 장이어도 맨 뒤 카드의 배율이 0.86 아래로 내려가지 않는다(60장이면 음수가 되어 뒤집혔다)', () => {
    const top = cardTransform({ index: 0, count: 60, mode: 'stacked', cardHeight: 180 })
    expect(top.scale).toBe(0.86)
    const nearFront = cardTransform({ index: 58, count: 60, mode: 'stacked', cardHeight: 180 })
    expect(nearFront.scale).toBe(0.98)
    const rest = cardTransform({ index: 0, count: 60, mode: 'selected', selectedIndex: 59, cardHeight: 180 })
    expect(rest.scale).toBe(0.86)
  })
})
