/**
 * 프레임워크 무관 세그먼트 컨트롤 thumb 이동 코어 (의존성 0).
 *
 * 선택된 칸의 offsetLeft·offsetWidth를 thumb의 translateX·width로 옮긴다.
 * tab-indicator처럼 scaleX로 늘리면 thumb의 둥근 모서리·그림자가 가로로 찌그러진다 —
 * 알약 모양을 지켜야 하므로 폭은 width로 준다. 다만 CSS는 transform만 전이한다(segmented-control.css):
 * 칸이 같은 폭이면 이동 중 폭이 바뀌지 않고, 폭이 다른 칸이면 폭은 바로 맞고 위치만 미끄러진다.
 *
 * 바닐라 사용: 라디오 change 핸들러에서 moveSegmentThumb({ thumb, target: 선택된 라벨 })
 * React 사용: useSegmentedControl.ts가 이 코어를 감싼다.
 */

type SegmentMeasure = {
  offsetLeft: number
  offsetWidth: number
}

/** 측정값 → thumb 인라인 스타일. DOM 없이 계산만 하므로 테스트 대상이다. */
export const segmentThumbFrame = ({ offsetLeft, offsetWidth }: SegmentMeasure) => ({
  transform: `translateX(${offsetLeft}px)`,
  width: `${offsetWidth}px`,
})

type MoveSegmentThumbOptions = {
  /** transform-origin left·left:0인 thumb 요소 (segmented-control.css의 .segment-thumb) */
  thumb: HTMLElement
  /** 선택된 칸(라벨) — thumb와 같은 offsetParent(.segmented) 안에 있어야 좌표가 맞는다 */
  target: HTMLElement
  /** true면 슬라이드 없이 즉시 배치 — 첫 렌더가 0에서 미끄러져 오는 것을 막는다. 이미 그 자리면 아무것도 하지 않는다 */
  immediate?: boolean
}

export const moveSegmentThumb = ({ thumb, target, immediate = false }: MoveSegmentThumbOptions) => {
  const { transform, width } = segmentThumbFrame({
    offsetLeft: target.offsetLeft,
    offsetWidth: target.offsetWidth,
  })
  if (!immediate) {
    thumb.style.transform = transform
    thumb.style.width = width
    return
  }
  // 이미 그 자리면 그대로 둔다 — ResizeObserver는 observe() 직후 한 번 콜백을 부르는데,
  // 여기서 transition을 끄면 방금 시작한 슬라이드가 취소되고 thumb가 건너뛴다
  if (thumb.style.transform === transform && thumb.style.width === width) return
  thumb.style.transition = 'none'
  thumb.style.transform = transform
  thumb.style.width = width
  // 브라우저가 무전환 배치를 그린 다음 프레임에 transition을 복원한다
  requestAnimationFrame(() => {
    thumb.style.transition = ''
  })
}
