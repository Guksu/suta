/**
 * 프레임워크 무관 스크롤 리빌 코어 (의존성 0).
 *
 * IntersectionObserver로 뷰포트 진입을 감지해 요소의 data-revealed를 구동한다 —
 * 애니메이션 정의는 전적으로 CSS 몫이다(scroll-reveal.css).
 *
 * 바닐라 사용: document.querySelectorAll('.reveal').forEach((el) => revealOnScroll({ element: el }))
 * React 사용: useScrollReveal.ts가 이 코어를 감싼다.
 */

type RevealOnScrollOptions = {
  element: HTMLElement
  /** 요소가 몇 % 보였을 때 공개할지 (0~1). 기본 0.15 */
  threshold?: number
  /** 뷰포트 경계 보정 — 미리 공개하려면 '0px 0px -10% 0px' 형태로 */
  rootMargin?: string
  /** true(기본)면 한 번 공개 후 유지, false면 벗어날 때 다시 감춘다 */
  once?: boolean
  /** 공개 상태 변화 알림 (초기 등록은 변화가 아니므로 호출되지 않는다) */
  onChange?: (revealed: boolean) => void
}

/** 관찰을 시작하고 해제 함수를 반환한다 */
export const revealOnScroll = ({
  element,
  threshold = 0.15,
  rootMargin,
  once = true,
  onChange,
}: RevealOnScrollOptions) => {
  const apply = (revealed: boolean) => {
    element.dataset.revealed = revealed ? 'true' : 'false'
    onChange?.(revealed)
  }

  if (typeof IntersectionObserver === 'undefined') {
    // 구형 환경·SSR 폴백: 감추지 말고 그냥 보여준다 — 콘텐츠가 실종되는 것보다 낫다
    element.dataset.revealed = 'true'
    onChange?.(true)
    return () => {}
  }

  // 이미 공개된 요소를 다시 등록하는 경우(React effect 재실행·옵션 변경) — 감췄다가 다시 재생하지 않는다
  if (once && element.dataset.revealed === 'true') return () => {}

  element.dataset.revealed = 'false'

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const rootTop = entry.rootBounds?.top ?? 0
        const rootHeight = entry.rootBounds?.height ?? window.innerHeight
        const rect = entry.boundingClientRect
        if (entry.isIntersecting) {
          // 화면보다 훨씬 긴 요소는 보이는 비율이 threshold에 영영 닿지 못한다 — 걸치는 순간 공개한다
          const unreachable = rect !== undefined && rect.height * threshold > rootHeight
          // 비율을 주지 않는 환경(구형 폴리필)은 교차 여부만으로 판정한다
          const ratio = entry.intersectionRatio ?? 1
          if (ratio < threshold && !unreachable) continue
          apply(true)
          if (once) observer.unobserve(entry.target)
        } else if (!once) {
          apply(false)
        } else if (rect !== undefined && rect.bottom <= rootTop) {
          // 이미 위로 지나간 요소(스크롤 복원·앵커 이동으로 중간에서 시작) — 화면 밖에서 조용히 공개해 둔다.
          // 감춘 채 두면 위로 되돌아갈 때 지나온 내용이 다시 등장한다
          apply(true)
          observer.unobserve(entry.target)
        }
      }
    },
    // 0도 함께 본다 — 긴 요소가 걸치는 순간과 once=false가 완전히 벗어나는 순간을 알기 위해서다
    { threshold: threshold > 0 ? [0, threshold] : threshold, rootMargin },
  )
  observer.observe(element)
  return () => observer.disconnect()
}
