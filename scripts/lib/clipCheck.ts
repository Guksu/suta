/**
 * 벤치마크 측정의 순수 로직 — 캡처를 눈으로 봐야 알던 두 결함을 숫자로 센다.
 *
 * 1. 칸 밖으로 잘린 글자: 큰 금액이 지표 칸 밖으로 나가 칸의 overflow: hidden에 잘린다(1280px에서도 생긴다).
 *    페이지 전체의 가로 넘침(overflow320)은 문서 폭만 보므로 칸 안의 잘림을 놓친다.
 * 2. 첫 화면 폭 밖의 표 열: 좁은 화면에서 표를 가로로 넘기게 두면 매출 같은 핵심 열이 첫 화면 밖에 남는다.
 *    정지 화면을 보는 사람(과 블라인드 판정)에게는 그 열이 없는 것과 같다.
 *
 * 브라우저 쪽(measure.mjs)은 상자 좌표만 모으고, 판정은 여기서 한다 — 그래야 테스트할 수 있다.
 */

export type Box = { left: number; right: number; top: number; bottom: number }

/**
 * 글자 하나의 탐침.
 * - clip: 글자를 잘라낼 수 있는 조상(overflow-x: hidden·clip)의 상자를 겹친 것, 없으면 null
 * - frame: 테두리나 바탕으로 눈에 보이는 가장 가까운 칸(지표 칸·카드·칩), 없으면 null
 */
export type TextProbe = { text: string; box: Box; clip: Box | null; frame?: Box | null; ellipsis: boolean }

// 하위 픽셀 반올림으로 생기는 1px 이내 차이는 잘림이 아니다
const TOLERANCE = 1

// 화면 낭독용으로 숨긴 칸(sr-only, 1px × 1px)보다 작은 칸은 보이는 칸이 아니다
const MIN_VISIBLE = 4

const tiny = (bound: Box) => bound.right - bound.left < MIN_VISIBLE || bound.bottom - bound.top < MIN_VISIBLE

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

// 글자가 칸(bound)과 겹치면서 좌우 끝을 넘었는가. 1px 칸(sr-only)과 칸 밖에 통째로 있는 글자는 아니다
const spills = (box: Box, bound: Box | null | undefined) => {
  if (!bound || tiny(bound)) return false
  if (!overlaps(box, bound)) return false
  return box.right > bound.right + TOLERANCE || box.left < bound.left - TOLERANCE
}

/**
 * 칸 밖으로 잘리거나 삐져나온 글자를 돌려준다.
 * - 잘라내는 조상(clip)의 끝을 넘으면 잘려서 안 보인다. 테두리·바탕이 있는 칸(frame)의 끝을 넘으면 칸 밖으로 삐져나와 보인다.
 * - 말줄임(text-overflow: ellipsis)은 의도한 자르기라 뺀다.
 * - 칸이 없으면 페이지가 넘치는 경우라 overflow 지표가 맡는다.
 * - 칸 밖에 통째로 있는 글자(캐러셀의 다음 장, 접힌 칸)는 숨김이라 뺀다 — 칸과 겹치면서 끝을 넘은 것만 센다.
 * - 1px 칸(sr-only)은 보이는 칸이 아니라 뺀다.
 */
export const clippedTexts = ({ probes }: { probes: TextProbe[] }): TextProbe[] =>
  probes.filter((probe) => {
    if (probe.ellipsis) return false
    // 1px 칸(sr-only)에 갇힌 글자는 화면에 보이지 않는다 — frame 밖으로 나가도 세지 않는다
    if (probe.clip && tiny(probe.clip)) return false
    return spills(probe.box, probe.clip) || spills(probe.box, probe.frame)
  })

/** 표 한 줄(너비가 있는 칸이 가장 많은 줄)의 칸 상자들 중, 보이는 폭(가로 스크롤 칸이나 화면)을 넘어 다 보이지 않는 열의 수 */
export const hiddenColumns = ({ cells, visible }: { cells: Box[]; visible: Box }): number =>
  cells.filter((cell) => cell.right > visible.right + TOLERANCE || cell.left < visible.left - TOLERANCE).length
