import { inSlotRange, pickSlotRange, slotRangeTime, timeSlots } from '@skills/screen-kit/assets/slotRange'

describe('timeSlots — 시간 칸 목록', () => {
  it('시작 시각부터 끝 시각 앞까지 30분 단위로 만든다(끝 시각은 마지막 칸이 끝나는 때라 칸이 아니다)', () => {
    expect(timeSlots({ from: '09:00', to: '11:00' })).toEqual(['09:00', '09:30', '10:00', '10:30'])
  })

  it('칸 길이를 바꿀 수 있고 시·분을 두 자리로 채운다', () => {
    expect(timeSlots({ from: '08:40', to: '10:00', stepMinutes: 20 })).toEqual(['08:40', '09:00', '09:20', '09:40'])
  })

  it('끝이 시작보다 앞이거나 같으면 빈 목록이다', () => {
    expect(timeSlots({ from: '12:00', to: '12:00' })).toEqual([])
    expect(timeSlots({ from: '13:00', to: '12:00' })).toEqual([])
  })
})

describe('pickSlotRange — 시작 칸과 끝 칸을 차례로 눌러 이어진 구간을 고른다', () => {
  const none = new Set<number>()

  it('아무것도 고르지 않았으면 누른 칸 하나가 구간이 된다', () => {
    expect(pickSlotRange({ range: null, index: 3, blocked: none })).toEqual({ start: 3, end: 3 })
  })

  it('칸 하나를 고른 뒤 다른 칸을 누르면 그 사이가 모두 골라진다 — 앞쪽 칸을 눌러도 순서가 맞춰진다', () => {
    expect(pickSlotRange({ range: { start: 3, end: 3 }, index: 6, blocked: none })).toEqual({ start: 3, end: 6 })
    expect(pickSlotRange({ range: { start: 3, end: 3 }, index: 1, blocked: none })).toEqual({ start: 1, end: 3 })
  })

  it('고른 칸 하나를 다시 누르면 선택이 풀린다', () => {
    expect(pickSlotRange({ range: { start: 3, end: 3 }, index: 3, blocked: none })).toBeNull()
  })

  it('예약된 칸은 눌러도 바뀌지 않는다', () => {
    const blocked = new Set([4])
    expect(pickSlotRange({ range: null, index: 4, blocked })).toBeNull()
    expect(pickSlotRange({ range: { start: 1, end: 2 }, index: 4, blocked })).toEqual({ start: 1, end: 2 })
  })

  it('사이에 예약된 칸이 끼면 이어서 고를 수 없으니 누른 칸에서 새로 시작한다', () => {
    expect(pickSlotRange({ range: { start: 2, end: 2 }, index: 6, blocked: new Set([4]) })).toEqual({ start: 6, end: 6 })
  })

  it('구간이 이미 있으면 다음 누름은 새 시작이다', () => {
    expect(pickSlotRange({ range: { start: 2, end: 5 }, index: 8, blocked: none })).toEqual({ start: 8, end: 8 })
    expect(pickSlotRange({ range: { start: 2, end: 5 }, index: 3, blocked: none })).toEqual({ start: 3, end: 3 })
  })

  it('최대 칸 수를 넘는 구간은 만들지 않고 누른 칸에서 새로 시작한다', () => {
    expect(pickSlotRange({ range: { start: 0, end: 0 }, index: 3, blocked: none, maxLength: 4 })).toEqual({ start: 0, end: 3 })
    expect(pickSlotRange({ range: { start: 0, end: 0 }, index: 4, blocked: none, maxLength: 4 })).toEqual({ start: 4, end: 4 })
  })
})

describe('inSlotRange·slotRangeTime — 고른 구간 읽기', () => {
  const slots = timeSlots({ from: '09:00', to: '13:00' })

  it('구간 안의 칸만 골라진 칸이다', () => {
    expect(inSlotRange({ range: { start: 2, end: 4 }, index: 2 })).toBe(true)
    expect(inSlotRange({ range: { start: 2, end: 4 }, index: 4 })).toBe(true)
    expect(inSlotRange({ range: { start: 2, end: 4 }, index: 5 })).toBe(false)
    expect(inSlotRange({ range: null, index: 0 })).toBe(false)
  })

  it('시작 시각·끝 시각(마지막 칸이 끝나는 때)·분을 낸다', () => {
    expect(slotRangeTime({ slots, range: { start: 4, end: 7 } })).toEqual({ from: '11:00', to: '13:00', minutes: 120 })
    expect(slotRangeTime({ slots, range: { start: 0, end: 0 }, stepMinutes: 30 })).toEqual({ from: '09:00', to: '09:30', minutes: 30 })
  })

  it('고른 구간이 없으면 null이다', () => {
    expect(slotRangeTime({ slots, range: null })).toBeNull()
  })
})
