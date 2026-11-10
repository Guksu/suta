/**
 * 프레임워크 무관 스티키 헤더 상태 전환 코어 (의존성 0).
 *
 * 큰 제목(센티널)이 스크롤에 밀려 고정 헤더 아래로 다 들어가는 순간을 IntersectionObserver로
 * 감지해 헤더의 data-collapsed를 전환한다. scroll 이벤트를 쓰지 않아 비용이 없고,
 * 높이를 애니메이션하지 않으므로(컴팩트 헤더는 고정 높이) 레이아웃 회귀도 없다.
 * 애니메이션 정의는 전적으로 CSS 몫(sticky-header.css).
 */

type ObserveHeaderCollapseOptions = {
  /** 고정 높이의 컴팩트 헤더 — data-collapsed가 여기에 걸린다 */
  header: HTMLElement
  /** 스크롤에 밀려 나가는 기준 요소(보통 큰 제목 블록) */
  sentinel: HTMLElement
  /** 페이지 전체가 아니라 특정 상자 안에서 스크롤되면 그 상자 — 기본은 화면(뷰포트) */
  root?: Element | null
  onChange?: (collapsed: boolean) => void
}

export const observeHeaderCollapse = ({ header, sentinel, root = null, onChange }: ObserveHeaderCollapseOptions) => {
  const apply = (collapsed: boolean) => {
    header.dataset.collapsed = collapsed ? 'true' : 'false'
    onChange?.(collapsed)
  }

  if (typeof IntersectionObserver === 'undefined') {
    // 폴백: 항상 펼침 — 컴팩트 제목이 안 뜰 뿐 콘텐츠는 멀쩡하다
    header.dataset.collapsed = 'false'
    return () => {}
  }

  header.dataset.collapsed = 'false'

  let first = true
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // 안 보이는 이유가 "위로 지나갔다"일 때만 접힘이다. 첫 화면이 낮아 센티널이 아직 화면 아래에 있는 것은 접힘이 아니다
        const rootTop = entry.rootBounds?.top ?? 0
        const passed = entry.boundingClientRect ? entry.boundingClientRect.top < rootTop : true
        const collapsed = !entry.isIntersecting && passed
        if (!first) {
          apply(collapsed)
          continue
        }
        // 첫 판정은 전이 없이 적용한다 — 스크롤 위치가 복원돼 중간에서 시작하면 작은 제목이 이미 떠 있어야 하고,
        // 그것이 떠오르는 연출로 보이면 안 된다. data-instant가 걸린 채로 배치를 한 번 읽어 스타일을 확정한 뒤 뗀다
        first = false
        header.dataset.instant = 'true'
        apply(collapsed)
        header.getBoundingClientRect()
        delete header.dataset.instant
      }
    },
    // 관찰 영역의 위를 헤더 높이만큼 줄인다 — 센티널이 화면 끝이 아니라 헤더 아래로 다 들어간 순간에 바뀐다.
    // 줄이지 않으면 큰 제목은 헤더에 가렸는데 작은 제목은 아직 없는 구간(헤더 높이만큼의 스크롤)이 생긴다
    { root, rootMargin: `-${header.offsetHeight}px 0px 0px 0px` },
  )
  observer.observe(sentinel)
  return () => observer.disconnect()
}
