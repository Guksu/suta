/**
 * 리스트박스 키보드 내비게이션의 순수 판정 (의존성 0, DOM 무관).
 *
 * "이 키가 하이라이트를 어디로 옮기는가"만 답한다 — 열림/닫힘·선택 확정은 래퍼 몫.
 * 하이라이트 없음은 -1: ArrowDown이면 처음부터, ArrowUp이면 끝부터 진입한다(WAI-ARIA 콤보박스 관례).
 * 고를 수 없는(disabled) 옵션은 isDisabled로 알려 주면 건너뛴다.
 */

type IsDisabled = (index: number) => boolean

type MoveHighlightOptions = {
  /** 현재 하이라이트 인덱스 — 없으면 -1 */
  index: number
  /** 옵션 개수 */
  count: number
  /** KeyboardEvent.key */
  key: string
  /** 그 옵션을 고를 수 없는지 — 없으면 전부 고를 수 있다 */
  isDisabled?: IsDisabled
}

/** PageUp·PageDown 한 번에 건너뛰는 칸 수 — 수백 개짜리 목록을 화살표만으로 내려가지 않게 */
const PAGE_STEP = 10

/** start부터 delta 방향으로 가며 고를 수 있는 첫 옵션을 찾는다. 없으면 -1 */
const seek = ({ start, delta, count, isDisabled }: { start: number; delta: 1 | -1; count: number; isDisabled?: IsDisabled }) => {
  for (let index = start; index >= 0 && index < count; index += delta) {
    if (!isDisabled?.(index)) return index
  }
  return -1
}

export const moveHighlight = ({ index, count, key, isDisabled }: MoveHighlightOptions) => {
  if (count === 0) return -1
  const last = count - 1
  /** 찾은 곳이 없으면 제자리 */
  const orStay = (found: number) => (found === -1 ? index : found)

  switch (key) {
    case 'ArrowDown':
      return orStay(seek({ start: index < 0 ? 0 : index + 1, delta: 1, count, isDisabled }))
    case 'ArrowUp':
      return orStay(seek({ start: index < 0 ? last : index - 1, delta: -1, count, isDisabled }))
    case 'Home':
      return orStay(seek({ start: 0, delta: 1, count, isDisabled }))
    case 'End':
      return orStay(seek({ start: last, delta: -1, count, isDisabled }))
    case 'PageDown': {
      const target = Math.min(Math.max(index, 0) + PAGE_STEP, last)
      const forward = seek({ start: target, delta: 1, count, isDisabled })
      return orStay(forward === -1 ? seek({ start: target, delta: -1, count, isDisabled }) : forward)
    }
    case 'PageUp': {
      const target = Math.max((index < 0 ? last : index) - PAGE_STEP, 0)
      const backward = seek({ start: target, delta: -1, count, isDisabled })
      return orStay(backward === -1 ? seek({ start: target, delta: 1, count, isDisabled }) : backward)
    }
    default:
      return index
  }
}

type InitialHighlightOptions = {
  /** 지금 선택된 옵션의 인덱스 — 없으면 -1 */
  selectedIndex: number
  count: number
  isDisabled?: IsDisabled
}

/**
 * 패널을 열 때 처음 가리킬 옵션 — 선택된 옵션이 있으면 그것, 없으면 고를 수 있는 첫 옵션.
 * 옵션이 없으면 -1이다. 0을 돌려주면 aria-activedescendant가 없는 요소를 가리키게 된다.
 */
export const initialHighlight = ({ selectedIndex, count, isDisabled }: InitialHighlightOptions) => {
  if (selectedIndex >= 0 && selectedIndex < count && !isDisabled?.(selectedIndex)) return selectedIndex
  return seek({ start: 0, delta: 1, count, isDisabled })
}

type FindTypeaheadOptions = {
  /** 옵션 이름들 — 화면에 보이는 글자 */
  labels: string[]
  /** 지금까지 이어 친 글자 */
  query: string
  /** 현재 하이라이트 인덱스 — 없으면 -1 */
  from: number
  isDisabled?: IsDisabled
}

/**
 * 타이핑으로 옵션 찾기 — 이어 친 글자로 시작하는 옵션의 인덱스, 없으면 -1.
 * 같은 글자를 거듭 치면("rr") 그 글자로 시작하는 옵션을 차례로 돈다(네이티브 select의 관례).
 * 여러 글자를 이어 치면("ra") 지금 가리키는 옵션부터 다시 맞춘다 — 이미 맞는 옵션에서 달아나지 않는다.
 */
export const findTypeahead = ({ labels, query, from, isDisabled }: FindTypeaheadOptions) => {
  const typed = Array.from(query.toLocaleLowerCase())
  if (typed.length === 0) return -1

  const repeated = typed.every((char) => char === typed[0])
  const needle = repeated ? typed[0] : typed.join('')
  const start = Math.max(repeated ? from + 1 : from, 0)

  for (let offset = 0; offset < labels.length; offset += 1) {
    const index = (start + offset) % labels.length
    if (isDisabled?.(index)) continue
    if (labels[index].toLocaleLowerCase().startsWith(needle)) return index
  }
  return -1
}
