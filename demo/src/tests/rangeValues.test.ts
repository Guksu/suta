import { clampPair, lowerOnTop, nearerHandle, snapValue, toPercent, valueAtPercent } from '@skills/range-slider/assets/rangeValues'

/** 가격 필터: 0~50,000원, 1,000원 단위 */
const price = { min: 0, max: 50000, step: 1000 }

describe('rangeValues — 눈금·경계·교차 규칙', () => {
  it('가까운 눈금으로 맞춘다', () => {
    expect(snapValue({ ...price, value: 12400 })).toBe(12000)
    expect(snapValue({ ...price, value: 12600 })).toBe(13000)
  })

  it('범위 밖 값은 경계로 가둔다', () => {
    expect(snapValue({ ...price, value: -5000 })).toBe(0)
    expect(snapValue({ ...price, value: 99000 })).toBe(50000)
  })

  it('소수 눈금에서도 부동소수 오차가 남지 않는다', () => {
    expect(snapValue({ min: 0, max: 5, step: 0.1, value: 0.30000000000000004 })).toBe(0.3)
    expect(snapValue({ min: 0, max: 5, step: 0.1, value: 2.25 })).toBe(2.3)
  })

  it('아래 손잡이를 올려도 위 손잡이를 밀어내지 않는다 — 자기가 멈춘다', () => {
    const next = clampPair({ lower: 40000, upper: 30000, moved: 'lower' })

    expect(next).toEqual({ lower: 30000, upper: 30000 })
  })

  it('위 손잡이를 내려도 아래 손잡이를 밀어내지 않는다', () => {
    const next = clampPair({ lower: 30000, upper: 20000, moved: 'upper' })

    expect(next).toEqual({ lower: 30000, upper: 30000 })
  })

  it('최소 간격을 두면 그만큼 떨어져 멈춘다', () => {
    const next = clampPair({ lower: 40000, upper: 30000, moved: 'lower', minDistance: 5000 })

    expect(next).toEqual({ lower: 25000, upper: 30000 })
  })

  it('서로를 지나치지 않으면 그대로 둔다', () => {
    const next = clampPair({ lower: 10000, upper: 30000, moved: 'lower' })

    expect(next).toEqual({ lower: 10000, upper: 30000 })
  })

  it('값과 트랙 위치를 서로 옮긴다', () => {
    expect(toPercent({ ...price, value: 12500 })).toBe(25)
    expect(valueAtPercent({ ...price, percent: 25 })).toBe(13000) // 눈금에 맞춰진다
    expect(valueAtPercent({ ...price, percent: 0 })).toBe(0)
    expect(valueAtPercent({ ...price, percent: 100 })).toBe(50000)
  })

  it('최소와 최대가 같아도 나눗셈이 깨지지 않는다', () => {
    expect(toPercent({ min: 5, max: 5, value: 5 })).toBe(0)
  })

  it('트랙을 누르면 가까운 손잡이가 움직인다', () => {
    expect(nearerHandle({ value: 8000, lower: 5000, upper: 40000 })).toBe('lower')
    expect(nearerHandle({ value: 38000, lower: 5000, upper: 40000 })).toBe('upper')
    // 정확히 가운데면 아래쪽
    expect(nearerHandle({ value: 10000, lower: 5000, upper: 15000 })).toBe('lower')
  })

  it('겹친 손잡이는 몰려 있는 쪽 반대로 끌 수 있게 쌓는다', () => {
    // 오른쪽 끝에 몰림 → 왼쪽으로 끌 테니 아래쪽이 위에
    expect(lowerOnTop({ ...price, lower: 50000, upper: 50000 })).toBe(true)
    // 왼쪽 끝에 몰림 → 오른쪽으로 끌 테니 위쪽이 위에
    expect(lowerOnTop({ ...price, lower: 0, upper: 0 })).toBe(false)
  })

  it('눈금이 범위를 나누지 못하면 최대 아래의 마지막 눈금에서 멈춘다 — 네이티브 input과 같다', () => {
    // 0·20·40까지만 있다. 50은 눈금이 아니다
    expect(snapValue({ min: 0, max: 50, step: 20, value: 50 })).toBe(40)
    expect(snapValue({ min: 0, max: 50, step: 20, value: 999 })).toBe(40)
    expect(valueAtPercent({ min: 0, max: 50, step: 20, percent: 100 })).toBe(40)
    // 소수 눈금에서도 마지막 눈금을 넘지 않는다
    expect(snapValue({ min: 0, max: 1, step: 0.3, value: 1 })).toBe(0.9)
  })

  it('최솟값이 소수면 그 자릿수를 지킨다', () => {
    expect(snapValue({ min: 0.5, max: 5.5, step: 1, value: 2.4 })).toBe(2.5)
  })

  it('눈금이 0 이하거나 숫자가 아니면 맞추지 않고 범위에만 가둔다', () => {
    expect(snapValue({ min: 0, max: 10, step: 0, value: 3.3 })).toBe(3.3)
    expect(snapValue({ min: 0, max: 10, step: -1, value: 30 })).toBe(10)
    expect(snapValue({ min: 0, max: 10, step: Number.NaN, value: -4 })).toBe(0)
  })

  it('최소와 최대가 같으면 값은 그 하나뿐이다', () => {
    expect(snapValue({ min: 5, max: 5, step: 1, value: 9 })).toBe(5)
    expect(valueAtPercent({ min: 5, max: 5, step: 1, percent: 70 })).toBe(5)
  })

  it('최소 간격 때문에 범위 밖으로 밀려나지 않는다', () => {
    // 위 손잡이가 3,000인데 간격이 5,000 — 아래 손잡이는 -2,000이 아니라 0에서 멈춘다
    expect(clampPair({ lower: 4000, upper: 3000, moved: 'lower', minDistance: 5000, min: 0, max: 50000 })).toEqual({
      lower: 0,
      upper: 3000,
    })
    expect(clampPair({ lower: 48000, upper: 20000, moved: 'upper', minDistance: 5000, min: 0, max: 50000 })).toEqual({
      lower: 48000,
      upper: 50000,
    })
  })

  it('범위 밖 값이 들어와도 위치는 0~100% 안이다', () => {
    expect(toPercent({ ...price, value: -100 })).toBe(0)
    expect(toPercent({ ...price, value: 80000 })).toBe(100)
  })
})
