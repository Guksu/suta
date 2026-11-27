/* screen-kit — 시간 칸 고르기의 순수 로직(의존성 0). 프레임워크와 상관없이 그대로 쓴다.
 *
 * 왜 따로 두는가: 예약 시간은 "칸 하나"가 아니라 "이어진 구간"이다. 시작 칸과 끝 칸을 차례로 누르게 하면
 * 사이의 칸이 모두 골라지는데, 그 사이에 예약된 칸이 끼면 구간이 끊긴다. 이 판정을 화면 코드에 흩어 두면
 * 끊긴 구간이 골라지거나(겹친 예약) 다시 누른 칸이 풀리지 않는 결함이 생긴다. */

/** 고른 구간 — 칸 번호(0부터), 양 끝 포함. 아무것도 고르지 않았으면 null */
export type SlotRange = { start: number; end: number } | null

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const toTime = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

/** from 시각부터 to 시각 앞까지 stepMinutes 간격의 "HH:MM" 목록. to는 마지막 칸이 끝나는 때라 칸이 아니다 */
export const timeSlots = ({ from, to, stepMinutes = 30 }: { from: string; to: string; stepMinutes?: number }) => {
  const slots: string[] = []
  for (let minute = toMinutes(from); minute < toMinutes(to); minute += stepMinutes) slots.push(toTime(minute))
  return slots
}

/** 칸 하나를 눌렀을 때의 다음 구간.
 * - 예약된 칸(blocked)은 눌러도 그대로다.
 * - 고른 것이 없으면 누른 칸 하나. 칸 하나를 고른 상태에서 같은 칸이면 풀리고, 다른 칸이면 그 사이가 모두 골라진다.
 * - 사이에 예약된 칸이 끼거나 maxLength를 넘으면 이을 수 없으니 누른 칸에서 새로 시작한다.
 * - 이미 두 칸 이상의 구간이 있으면 다음 누름은 새 시작이다(구간을 고치는 가장 짧은 길). */
export const pickSlotRange = ({
  range,
  index,
  blocked,
  maxLength = Infinity,
}: {
  range: SlotRange
  index: number
  blocked: ReadonlySet<number>
  maxLength?: number
}): SlotRange => {
  if (blocked.has(index)) return range
  const single = { start: index, end: index }
  if (range === null || range.start !== range.end) return single
  if (index === range.start) return null

  const start = Math.min(range.start, index)
  const end = Math.max(range.start, index)
  if (end - start + 1 > maxLength) return single
  for (let between = start + 1; between < end; between += 1) if (blocked.has(between)) return single
  return { start, end }
}

/** 이 칸이 고른 구간 안인가 — 칸의 aria-pressed·선택 모양에 쓴다 */
export const inSlotRange = ({ range, index }: { range: SlotRange; index: number }) =>
  range !== null && index >= range.start && index <= range.end

/** 고른 구간의 시작 시각·끝 시각(마지막 칸이 끝나는 때)·분 — 요약 패널의 답과 금액 계산에 쓴다 */
export const slotRangeTime = ({ slots, range, stepMinutes = 30 }: { slots: readonly string[]; range: SlotRange; stepMinutes?: number }) => {
  if (range === null) return null
  const minutes = (range.end - range.start + 1) * stepMinutes
  return { from: slots[range.start], to: toTime(toMinutes(slots[range.start]) + minutes), minutes }
}
