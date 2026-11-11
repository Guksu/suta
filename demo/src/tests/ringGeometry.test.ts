import { circumference, clampProgress, dashOffset, ringRadii } from '@skills/progress-ring/assets/ringGeometry'

describe('ringGeometry — 진행 링의 순수 기하 계산', () => {
  it('둘레는 2πr', () => {
    expect(circumference({ radius: 50 })).toBeCloseTo(2 * Math.PI * 50)
  })

  it('offset — 진행률 0이면 둘레 전체(빈 링), 1이면 0(가득 찬 링)', () => {
    const full = circumference({ radius: 40 })
    expect(dashOffset({ radius: 40, progress: 0 })).toBeCloseTo(full)
    expect(dashOffset({ radius: 40, progress: 1 })).toBe(0)
  })

  it('offset — 진행률 0.5면 둘레의 절반', () => {
    expect(dashOffset({ radius: 40, progress: 0.5 })).toBeCloseTo(circumference({ radius: 40 }) / 2)
  })

  it('offset — 진행률은 0~1로 클램프된다(음수·1 초과 방어)', () => {
    expect(dashOffset({ radius: 40, progress: -0.3 })).toBeCloseTo(circumference({ radius: 40 }))
    expect(dashOffset({ radius: 40, progress: 1.7 })).toBe(0)
  })

  it('clampProgress — 목표 안이면 비율 그대로, over는 false', () => {
    expect(clampProgress({ value: 60, max: 100 })).toEqual({ progress: 0.6, over: false })
    expect(clampProgress({ value: 0, max: 100 })).toEqual({ progress: 0, over: false })
    expect(clampProgress({ value: 100, max: 100 })).toEqual({ progress: 1, over: false })
  })

  it('clampProgress — 목표 초과는 1로 클램프하고 over를 표시, 음수는 0', () => {
    expect(clampProgress({ value: 120, max: 100 })).toEqual({ progress: 1, over: true })
    expect(clampProgress({ value: -5, max: 100 })).toEqual({ progress: 0, over: false })
  })

  it('clampProgress — max가 0 이하면 0으로 안전하게 처리한다(0 나누기 방어)', () => {
    expect(clampProgress({ value: 50, max: 0 })).toEqual({ progress: 0, over: false })
  })

  it('ringRadii — 바깥부터 안쪽으로 stroke+gap 간격의 반지름 배열', () => {
    // 바깥 링: 캔버스 절반에서 획 두께 절반을 뺀다(획이 캔버스 밖으로 잘리지 않게)
    expect(ringRadii({ size: 120, stroke: 12, gap: 4, count: 3 })).toEqual([54, 38, 22])
    expect(ringRadii({ size: 120, stroke: 12, gap: 4, count: 1 })).toEqual([54])
    expect(ringRadii({ size: 120, stroke: 12, gap: 4, count: 0 })).toEqual([])
  })
  it('clampProgress — 숫자가 아닌 값(NaN: 0/0으로 계산한 달성률)은 빈 링이다. 가득 찬 링으로 그려지면 안 된다', () => {
    expect(clampProgress({ value: Number.NaN, max: 100 })).toEqual({ progress: 0, over: false })
    expect(clampProgress({ value: 10, max: Number.NaN })).toEqual({ progress: 0, over: false })
    expect(dashOffset({ radius: 50, progress: Number.NaN })).toBeCloseTo(circumference({ radius: 50 }))
  })

  it('ringRadii — 링이 많아 안쪽 반지름이 음수가 되면 0으로 막는다(SVG는 음수 r을 오류로 본다)', () => {
    expect(ringRadii({ size: 60, stroke: 12, gap: 4, count: 4 })).toEqual([24, 8, 0, 0])
  })
})
