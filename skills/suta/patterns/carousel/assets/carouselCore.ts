/**
 * 프레임워크 무관 캐러셀 코어 (의존성 0).
 *
 * 스크롤·스냅은 전적으로 CSS(scroll-snap)가 담당한다 — JS는 두 가지만 한다:
 * ① 어느 슬라이드가 활성인지 추적(IntersectionObserver, 과반 노출 기준 — 나중에 더해진 슬라이드 포함)
 * ② 도트·화살표로 특정 슬라이드로 이동(scrollTo — 스냅 정렬·글 방향을 따른다)
 * scroll 이벤트 리스너 없이 동작하므로 스크롤 성능을 깎지 않는다.
 */

type ObserveActiveSlideOptions = {
  /** overflow-x 스크롤 + scroll-snap이 걸린 트랙 — 직계 자식들이 슬라이드다 */
  track: HTMLElement
  onChange: (index: number) => void
}

export const observeActiveSlide = ({ track, onChange }: ObserveActiveSlideOptions) => {
  if (typeof IntersectionObserver === 'undefined') return () => {}

  let activeIndex = -1

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        // 순서는 알릴 때 센다 — 슬라이드가 더해지거나 빠지면 처음에 센 순서가 틀린다
        const index = Array.prototype.indexOf.call(track.children, entry.target)
        if (index !== -1 && index !== activeIndex) {
          activeIndex = index
          onChange(index)
        }
      }
    },
    // 트랙 안에서 과반이 보이는 슬라이드를 활성으로 본다
    { root: track, threshold: 0.6 },
  )

  const observed = new Set<Element>()
  const syncSlides = () => {
    const slides = new Set(Array.from(track.children))
    observed.forEach((slide) => {
      if (slides.has(slide)) return
      observer.unobserve(slide)
      observed.delete(slide)
    })
    slides.forEach((slide) => {
      if (observed.has(slide)) return
      observer.observe(slide)
      observed.add(slide)
    })
  }
  syncSlides()

  // 목록을 늦게 받으면 처음에는 슬라이드가 0장이다 — 나중에 더해진 슬라이드도 따라가게 자식 변화를 본다
  const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(syncSlides)
  mutations?.observe(track, { childList: true })

  return () => {
    mutations?.disconnect()
    observer.disconnect()
  }
}

type ScrollToSlideOptions = {
  track: HTMLElement
  index: number
  /** 기본: smooth, 단 모션 완화 사용자는 즉시 점프 */
  behavior?: ScrollBehavior
}

const preferredBehavior = (): ScrollBehavior =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'

const activeScrolls = new WeakMap<HTMLElement, () => void>()

// 사용자가 트랙을 직접 움직이기 시작했다는 신호 — 이때 프로그램 스크롤을 멈춘다
const USER_SCROLL_EVENTS = ['pointerdown', 'wheel', 'touchstart'] as const

/** snap 애니메이션 중 크롬이 프레임마다 스냅을 개입시키지 않도록, 이동 동안 스냅을 끄고 rAF로 보간한다.
 *  네이티브 scrollTo({behavior:'smooth'})를 쓰지 않는 이유: scroll-snap mandatory 트랙에서
 *  크롬이 smooth 프로그램 스크롤을 무시하는 문제가 있다. */
const animateScroll = ({ track, target }: { track: HTMLElement; target: number }) => {
  const from = track.scrollLeft
  if (from === target) return
  activeScrolls.get(track)?.()
  track.style.scrollSnapType = 'none'
  const durationMs = 320
  const start = performance.now()
  const easeOut = (progress: number) => 1 - Math.pow(1 - progress, 3)
  let frame = 0
  // 끝났거나 끊겼을 때 — 스냅을 되돌린다. 끊긴 자리에서는 브라우저가 가까운 슬라이드로 스냅한다
  const finish = () => {
    cancelAnimationFrame(frame)
    track.style.scrollSnapType = ''
    USER_SCROLL_EVENTS.forEach((type) => track.removeEventListener(type, finish))
    activeScrolls.delete(track)
  }
  const tick = (now: number) => {
    const progress = Math.min((now - start) / durationMs, 1)
    track.scrollLeft = from + (target - from) * easeOut(progress)
    if (progress < 1) {
      frame = requestAnimationFrame(tick)
      return
    }
    finish()
  }
  // 이동 중에 사용자가 트랙을 잡거나 휠을 굴리면 멈춘다 — 계속 scrollLeft를 쓰면 손가락과 다툰다
  USER_SCROLL_EVENTS.forEach((type) => track.addEventListener(type, finish, { passive: true }))
  activeScrolls.set(track, finish)
  frame = requestAnimationFrame(tick)
}

/** 슬라이드가 스냅되는 자리의 scrollLeft — CSS의 scroll-snap-align(center·start·end)을 따른다 */
const snapTarget = ({ track, slide }: { track: HTMLElement; slide: HTMLElement }) => {
  const max = track.scrollWidth - track.clientWidth
  const trackStyle = getComputedStyle(track)
  const rtl = trackStyle.direction === 'rtl'
  // 값이 둘이면(block inline) 뒤쪽이 가로축이다. 읽을 수 없으면 기본(center)으로 본다
  const align = (getComputedStyle(slide).scrollSnapAlign || 'center').split(' ').pop()
  const toLeftEdge = align === (rtl ? 'end' : 'start')
  const toRightEdge = align === (rtl ? 'start' : 'end')
  // 트랙이 position: relative(carousel.css)라 offsetLeft가 트랙 기준 좌표다
  const aligned = toLeftEdge
    ? slide.offsetLeft - (parseFloat(trackStyle.scrollPaddingLeft) || 0)
    : toRightEdge
      ? slide.offsetLeft + slide.offsetWidth - track.clientWidth + (parseFloat(trackStyle.scrollPaddingRight) || 0)
      : slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2
  // 오른쪽에서 왼쪽으로 쓰는 트랙은 스크롤 좌표가 0(처음)에서 -max(끝)로 간다
  return rtl ? Math.min(0, Math.max(aligned, -max)) : Math.max(0, Math.min(aligned, max))
}

export const scrollToSlide = ({ track, index, behavior = preferredBehavior() }: ScrollToSlideOptions) => {
  const slide = track.children[index] as HTMLElement | undefined
  if (!slide) return
  // 스냅이 맞출 자리와 같은 자리를 목표로 한다 — 다르면 이동이 끝난 뒤 스냅이 한 번 더 끌어당긴다
  const target = snapTarget({ track, slide })
  if (behavior === 'auto') {
    track.scrollTo({ left: target })
    return
  }
  animateScroll({ track, target })
}
