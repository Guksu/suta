import { useState, type CSSProperties } from 'react'
import { useCarousel } from '@skills/carousel/assets/useCarousel'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import './carousel-demo.css'

// 언어와 무관한 데이터(id·사진)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const SLIDES = [
  { id: 'monthly', dish: 'kalguksu' },
  { id: 'new', dish: 'mandu' },
  { id: 'summer', dish: 'memil' },
  { id: 'challenge', dish: 'bibim' },
  { id: 'regulars', dish: 'janchi' },
] as const satisfies readonly { id: string; dish: DishId }[]

const COPY = defineCopy({
  ko: {
    slides: {
      monthly: { title: '이달의 국수', copy: '얼큰 칼국수 — 국물이 먼저 반겨요' },
      new: { title: '신메뉴', copy: '왕만두 세트 — 반죽부터 직접' },
      summer: { title: '여름 한정', copy: '냉모밀 — 육수 슬러시 직전' },
      challenge: { title: '도전 메뉴', copy: '지옥 비빔국수 — 우유 제공' },
      regulars: { title: '단골 혜택', copy: '10그릇 도장이면 만두 서비스' },
    },
    controlsLabel: '옵션',
    slideWidth: '슬라이드 폭',
    autoplay: '자동재생',
    pause: '일시정지',
    play: '재생',
    note: '트랙을 드래그(스와이프)하거나 도트를 눌러보세요 — 스냅·감속은 전부 CSS scroll-snap이 처리합니다. 자동재생은 호버·키보드 포커스 중엔 멈추고, 일시정지 버튼은 접근성 필수입니다(WCAG 2.2.2).',
    trackLabel: '가게 소식',
    dotsLabel: '슬라이드 선택',
    dot: (n: number) => `${n}번째 슬라이드`,
  },
  en: {
    slides: {
      monthly: { title: 'Noodle of the month', copy: 'Spicy knife-cut noodles. The broth greets you first.' },
      new: { title: 'New', copy: 'Jumbo dumpling set. We make the dough from scratch.' },
      summer: { title: 'Summer only', copy: 'Cold soba, with the broth chilled almost to slush' },
      challenge: { title: 'Challenge', copy: 'Inferno spicy mixed noodles. Milk on the house.' },
      regulars: { title: 'For regulars', copy: 'Collect 10 stamps for free dumplings' },
    },
    controlsLabel: 'Options',
    slideWidth: 'Slide width',
    autoplay: 'Autoplay',
    pause: 'Pause',
    play: 'Play',
    note: 'Drag (swipe) the track or tap a dot. CSS scroll-snap handles all the snapping and easing. Autoplay stops on hover and keyboard focus, and the pause button is required for accessibility (WCAG 2.2.2).',
    trackLabel: 'Shop news',
    dotsLabel: 'Choose a slide',
    dot: (n: number) => `Slide ${n}`,
  },
})

export const CarouselDemo = () => {
  const t = COPY[useDemoLang()]
  const [autoplay, setAutoplay] = useState(false)
  const { trackRef, activeIndex, goTo, autoplayOn, toggleAutoplay } = useCarousel({
    autoplayMs: autoplay ? 2500 : undefined,
  })
  const [slideWidth, setSlideWidth] = useState(70)

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.slideWidth} <code>--slide-width</code>
          </span>
          <input
            type="range"
            min={40}
            max={100}
            step={5}
            value={slideWidth}
            onChange={(e) => setSlideWidth(Number(e.target.value))}
          />
          <output>{slideWidth}%</output>
        </label>
        <label>
          <span>
            {t.autoplay} <code>autoplayMs</code>
          </span>
          <span className="controls-inline">
            <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
            {autoplay && (
              <button type="button" className="carousel-autoplay-toggle" onClick={toggleAutoplay}>
                <Icon name={autoplayOn ? 'pause' : 'play'} />
                {autoplayOn ? t.pause : t.play}
              </button>
            )}
          </span>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div style={{ '--slide-width': `${slideWidth}%` } as CSSProperties}>
        {/* 스크롤 트랙은 키보드로도 닿아야 한다 — 초점을 받으면 좌우 방향키로 넘겨 볼 수 있다 */}
        <div ref={trackRef} className="carousel-track" tabIndex={0} role="region" aria-label={t.trackLabel}>
          {SLIDES.map((slide) => (
            <div key={slide.id} className="carousel-slide banner-slide">
              {/* 글은 사진 밖, 아래에 둔다 — 사진 위에 얹으면 사진마다 대비가 달라진다 */}
              <DishPhoto dish={slide.dish} className="banner-photo" />
              <div className="banner-text">
                <strong>{t.slides[slide.id].title}</strong>
                <p>{t.slides[slide.id].copy}</p>
              </div>
            </div>
          ))}
        </div>
        {/* 도트는 탭이 아니라 이동 버튼 묶음이다 — tablist 대신 group, 지금 슬라이드는 aria-current로 알린다 */}
        <div className="carousel-dots" role="group" aria-label={t.dotsLabel}>
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className="carousel-dot"
              data-active={index === activeIndex ? 'true' : 'false'}
              aria-current={index === activeIndex ? 'true' : undefined}
              aria-label={t.dot(index + 1)}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
