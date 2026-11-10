import { useEffect, useRef, useState } from 'react'
import { observeActiveSlide, scrollToSlide } from './carouselCore'
import { createCarouselAutoplay } from './createCarouselAutoplay'
import './carousel.css'

/**
 * carousel 코어의 React 래퍼 — trackRef를 트랙에 달면
 * activeIndex가 스와이프를 따라가고, goTo(index)로 도트·화살표 이동을 만든다.
 * autoplayMs를 주면 자동재생이 붙는다(호버·포커스·가려진 탭에서 정지, 일시정지 토글 제공).
 */
export const useCarousel = ({ autoplayMs }: { autoplayMs?: number } = {}) => {
  const trackRef = useRef<HTMLDivElement | null>(null)
  // 트랙 요소 자체를 상태로도 쥔다 — 목록을 받은 뒤에야 트랙을 그리는 화면에서는 첫 렌더에 ref가 비어 있다
  const [track, setTrack] = useState<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  const autoplayRef = useRef<ReturnType<typeof createCarouselAutoplay> | null>(null)
  const [autoplayOn, setAutoplayOn] = useState(false)

  // 의존성 배열이 없다 — 그릴 때마다 트랙 요소가 바뀌었는지만 본다(같으면 상태를 건드리지 않는다)
  useEffect(function followTrackElement() {
    if (trackRef.current !== track) setTrack(trackRef.current)
  })

  useEffect(
    function trackActiveSlide() {
      if (!track) return
      return observeActiveSlide({
        track,
        onChange: (index) => {
          activeIndexRef.current = index
          setActiveIndex(index)
        },
      })
    },
    [track],
  )

  useEffect(
    function runAutoplay() {
      if (!track || !autoplayMs) return
      const autoplay = createCarouselAutoplay({
        track,
        intervalMs: autoplayMs,
        onTick: () => {
          const count = track.children.length
          // 마지막 장 다음은 첫 장이다. 한 장뿐이면 넘길 곳이 없다
          if (count > 1) scrollToSlide({ track, index: (activeIndexRef.current + 1) % count })
        },
      })
      autoplayRef.current = autoplay
      setAutoplayOn(!autoplay.isPaused())
      return () => {
        autoplay.stop()
        autoplayRef.current = null
        setAutoplayOn(false)
      }
    },
    [track, autoplayMs],
  )

  const goTo = (index: number) => {
    const current = trackRef.current
    if (!current) return
    scrollToSlide({ track: current, index })
    // 직접 옮긴 직후에 자동으로 또 넘어가지 않게 간격을 다시 센다
    autoplayRef.current?.reset()
  }

  /**
   * 자동재생 일시정지 버튼용 — 자동재생은 사용자가 멈출 수단이 있어야 한다(WCAG 2.2.2).
   * autoplayOn은 "사용자가 켜 두었는가"다. 호버·포커스로 잠깐 선 동안에도 true로 남아 버튼 글자가 뒤집히지 않는다
   */
  const toggleAutoplay = () => {
    const autoplay = autoplayRef.current
    if (!autoplay) return
    autoplay.toggle()
    setAutoplayOn(!autoplay.isPaused())
  }

  return { trackRef, activeIndex, goTo, autoplayOn, toggleAutoplay }
}
