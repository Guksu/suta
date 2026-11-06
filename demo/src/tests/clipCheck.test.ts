import { clippedTexts, hiddenColumns, type Box } from '../../../scripts/lib/clipCheck'

const box = (left: number, right: number, top = 0, bottom = 20): Box => ({ left, right, top, bottom })

describe('clipCheck — 칸 밖으로 잘린 글자', () => {
  it('글자가 잘라내는 조상(overflow: hidden) 안에 있으면 잘리지 않았다', () => {
    expect(clippedTexts({ probes: [{ text: '429,531', box: box(10, 90), clip: box(0, 100), ellipsis: false }] })).toEqual([])
  })

  it('글자가 잘라내는 조상의 오른쪽 끝을 넘으면 잘렸다 — 1280px에서 칸 밖으로 나간 금액', () => {
    const probe = { text: '758,071,300원', box: box(1020, 1262), clip: box(1004, 1247), ellipsis: false }
    expect(clippedTexts({ probes: [probe] })).toEqual([probe])
  })

  it('왼쪽으로 나가도 잘렸다', () => {
    expect(clippedTexts({ probes: [{ text: '합계', box: box(-12, 40), clip: box(0, 300), ellipsis: false }] })).toHaveLength(1)
  })

  it('잘리지 않아도 테두리·바탕이 있는 칸(frame) 밖으로 삐져나오면 센다 — 지표 칸 테두리를 넘은 금액', () => {
    const probe = { text: '758,071,300원', box: box(1026, 1262), clip: null, frame: box(1003, 1247), ellipsis: false }
    expect(clippedTexts({ probes: [probe] })).toEqual([probe])
  })

  it('칸 안에 있으면 frame이 있어도 세지 않는다', () => {
    expect(clippedTexts({ probes: [{ text: '15,163', box: box(536, 650), clip: null, frame: box(512, 757), ellipsis: false }] })).toEqual([])
  })

  it('말줄임(text-overflow: ellipsis)은 의도한 자르기라 세지 않는다', () => {
    expect(clippedTexts({ probes: [{ text: '아주 긴 상품 이름', box: box(0, 400), clip: box(0, 200), ellipsis: true }] })).toEqual([])
  })

  it('잘라내는 조상이 없으면(clip: null) 페이지 넘침 지표가 맡으므로 세지 않는다', () => {
    expect(clippedTexts({ probes: [{ text: '넓은 표', box: box(0, 900), clip: null, ellipsis: false }] })).toEqual([])
  })

  it('칸 밖에 통째로 있는 글자(캐러셀의 다음 장, 접힌 칸)는 잘림이 아니라 숨김이라 세지 않는다', () => {
    expect(clippedTexts({ probes: [{ text: '다음 장', box: box(420, 700), clip: box(0, 390), ellipsis: false }] })).toEqual([])
    expect(clippedTexts({ probes: [{ text: '접힌 답', box: box(10, 300, 200, 220), clip: box(0, 390, 0, 180), ellipsis: false }] })).toEqual([])
  })

  it('화면 낭독용으로 숨긴 1px 칸(sr-only)은 세지 않는다', () => {
    expect(clippedTexts({ probes: [{ text: '장바구니 3개', box: box(0, 80), clip: box(0, 1, 0, 1), ellipsis: false }] })).toEqual([])
  })

  it('1px 칸(sr-only) 안의 글자는 frame 밖으로 나가도 세지 않는다 — 보이지 않는 글자다', () => {
    expect(clippedTexts({ probes: [{ text: '증가', box: box(300, 330), clip: box(300, 301, 0, 1), frame: box(0, 310), ellipsis: false }] })).toEqual([])
  })

  it('하위 픽셀 반올림(1px 이내)은 잘림으로 보지 않는다', () => {
    expect(clippedTexts({ probes: [{ text: '3.53%', box: box(10, 100.8), clip: box(0, 100), ellipsis: false }] })).toEqual([])
  })
})

describe('clipCheck — 첫 화면 폭 밖의 표 열', () => {
  it('모든 열이 보이는 폭 안에 있으면 0', () => {
    expect(hiddenColumns({ cells: [box(16, 120), box(120, 250), box(250, 374)], visible: box(16, 374) })).toBe(0)
  })

  it('보이는 폭을 넘는 열을 센다 — 가로로 넘겨야 보이는 매출 열', () => {
    const cells = [box(16, 140), box(140, 240), box(240, 340), box(340, 460), box(460, 580)]
    expect(hiddenColumns({ cells, visible: box(16, 374) })).toBe(2)
  })

  it('일부만 보이는 열도 센다(값이 잘려 읽히지 않는다)', () => {
    expect(hiddenColumns({ cells: [box(16, 200), box(200, 400)], visible: box(16, 374) })).toBe(1)
  })

  it('1px 이내의 차이는 보이는 것으로 본다', () => {
    expect(hiddenColumns({ cells: [box(16, 200), box(200, 374.6)], visible: box(16, 374) })).toBe(0)
  })
})
