/**
 * 프레임워크 무관 탭 인디케이터 이동 코어 (의존성 0).
 *
 * 활성 탭의 offsetLeft·offsetWidth를 인디케이터의 translateX·scaleX로 옮긴다.
 * left/width를 직접 애니메이션하면 매 프레임 레이아웃이 돌아 성능을 깎는다 —
 * 인디케이터를 폭 1px로 두고 scaleX로 늘리면 transform(GPU 합성)만으로 끝난다.
 *
 * 바닐라 사용: 탭 클릭 핸들러에서 moveTabIndicator({ indicator, target: 클릭된 탭 })
 * React 사용: useTabIndicator.ts가 이 코어를 감싼다.
 */

type MoveTabIndicatorOptions = {
  /** 폭 1px·transform-origin left인 인디케이터 요소 (tab-indicator.css의 .tab-indicator) */
  indicator: HTMLElement
  /** 활성 탭 요소 — 인디케이터와 같은 offsetParent 안에 있어야 좌표가 맞는다 */
  target: HTMLElement
  /** true면 슬라이드 없이 즉시 배치 — 첫 렌더가 0에서 미끄러져 오는 것을 막는다. 이미 그 자리면 아무것도 하지 않는다 */
  immediate?: boolean
}

export const moveTabIndicator = ({ indicator, target, immediate = false }: MoveTabIndicatorOptions) => {
  const transform = `translateX(${target.offsetLeft}px) scaleX(${target.offsetWidth})`
  if (!immediate) {
    indicator.style.transform = transform
    return
  }
  // 이미 그 자리면 그대로 둔다 — ResizeObserver는 observe() 직후 한 번 콜백을 부르는데,
  // 여기서 transition을 끄면 방금 시작한 슬라이드가 취소되고 밑줄이 건너뛴다
  if (indicator.style.transform === transform) return
  indicator.style.transition = 'none'
  indicator.style.transform = transform
  // 여기서 스타일을 한 번 확정한다. rAF 콜백은 다음 프레임의 스타일 계산보다 먼저 돌아서,
  // 확정하지 않으면 브라우저가 none을 보지 못하고 첫 배치가 0에서 미끄러져 온다.
  // 속성 읽기(void el.offsetWidth)는 일부 압축기가 부작용 없는 식으로 보고 지우므로 메서드 호출로 읽는다
  indicator.getBoundingClientRect()
  // 다음 프레임에 transition을 복원한다
  requestAnimationFrame(() => {
    indicator.style.transition = ''
  })
}

type RevealTabOptions = {
  /** 가로로 스크롤되는 탭 줄 (tab-indicator.css의 .tab-bar[data-scroll='true']) */
  bar: HTMLElement
  /** 보이게 할 탭 — bar가 offsetParent여야 좌표가 맞는다 */
  target: HTMLElement
  /** 기본: smooth, 동작 줄이기 설정이면 auto(즉시) */
  behavior?: ScrollBehavior
}

const preferredBehavior = (): ScrollBehavior =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/**
 * 탭이 많아 줄이 가로로 넘칠 때, 선택한 탭을 줄 가운데로 스크롤한다. 넘치지 않으면 아무것도 하지 않는다.
 * scrollIntoView를 쓰지 않는 이유: 페이지까지 세로로 함께 스크롤될 수 있다 — 탭 줄만 옆으로 움직여야 한다.
 */
export const revealTab = ({ bar, target, behavior = preferredBehavior() }: RevealTabOptions) => {
  const max = bar.scrollWidth - bar.clientWidth
  if (max <= 0) return
  const centered = target.offsetLeft - (bar.clientWidth - target.offsetWidth) / 2
  // 오른쪽에서 왼쪽으로 쓰는 줄은 스크롤 좌표가 0(처음)에서 -max(끝)로 간다
  const rtl = getComputedStyle(bar).direction === 'rtl'
  const left = rtl ? Math.min(0, Math.max(centered, -max)) : Math.max(0, Math.min(centered, max))
  bar.scrollTo({ left, behavior })
}

type NextTabIndexOptions = {
  /** KeyboardEvent.key */
  key: string
  /** 지금 포커스가 있는 탭의 순서 */
  index: number
  /** 탭 개수 */
  count: number
  /** 오른쪽에서 왼쪽으로 쓰는 줄이면 true — 방향키가 뒤집힌다 */
  rtl?: boolean
}

/**
 * 탭 줄의 키보드 이동 (WAI-ARIA 탭 패턴) — 좌우 방향키는 옆 탭으로(끝에서 돈다), Home·End는 처음·마지막으로.
 * 옮겨 갈 탭의 순서를 돌려주고, 탭 이동과 무관한 키면 null이다. role="tablist"는 줄 전체가 Tab 한 번에 지나가고
 * 안에서는 방향키로 오가는 것이 약속이라, 선택된 탭만 tabIndex 0이고 나머지는 -1로 둔다.
 */
export const nextTabIndex = ({ key, index, count, rtl = false }: NextTabIndexOptions): number | null => {
  if (count <= 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null
  const forward = (key === 'ArrowRight') !== rtl
  return (index + (forward ? 1 : -1) + count) % count
}
