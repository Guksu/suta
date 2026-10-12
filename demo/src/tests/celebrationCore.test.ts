import { burstPieces } from '@skills/celebration/assets/createCelebration'

describe('burstPieces — 한 번 터지는 조각의 궤적', () => {
  it('개수만큼 만들고, 같은 seed면 같은 궤적이다(새로 그릴 때마다 모양이 바뀌지 않는다)', () => {
    const a = burstPieces({ count: 14, seed: 7 })
    expect(a).toHaveLength(14)
    expect(burstPieces({ count: 14, seed: 7 })).toEqual(a)
    expect(burstPieces({ count: 14, seed: 8 })).not.toEqual(a)
  })

  it('조각은 위와 양옆으로 퍼진다 — 아래(제목·보상 글자 쪽)로는 거의 내려가지 않는다', () => {
    const pieces = burstPieces({ count: 16, seed: 3, maxDistance: 140 })
    expect(pieces.some((p) => p.x > 20)).toBe(true)
    expect(pieces.some((p) => p.x < -20)).toBe(true)
    expect(pieces.some((p) => p.y < -20)).toBe(true)
    for (const p of pieces) expect(p.y).toBeLessThanOrEqual(140 * 0.3)
  })

  it('날아가는 거리는 정한 범위 안이고, 시작 지연은 짧다(축하가 한 박자로 끝난다)', () => {
    for (const p of burstPieces({ count: 24, seed: 11, minDistance: 70, maxDistance: 150 })) {
      const distance = Math.hypot(p.x, p.y)
      expect(distance).toBeGreaterThanOrEqual(70 - 0.01)
      expect(distance).toBeLessThanOrEqual(150 + 0.01)
      expect(p.delayMs).toBeGreaterThanOrEqual(0)
      expect(p.delayMs).toBeLessThanOrEqual(120)
    }
  })

  it('색은 세 가지를 돌아가며 쓴다 — 보상 색·강조색·은색', () => {
    const tones = burstPieces({ count: 6, seed: 1 }).map((p) => p.tone)
    expect(tones).toEqual([0, 1, 2, 0, 1, 2])
  })

  it('0개면 빈 배열이다', () => {
    expect(burstPieces({ count: 0, seed: 1 })).toEqual([])
  })
})
