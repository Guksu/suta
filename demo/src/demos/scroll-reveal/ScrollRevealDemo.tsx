import { useState, type CSSProperties } from 'react'
import { ScrollReveal } from '@skills/scroll-reveal/assets/ScrollReveal'
import { Icon } from '@skills/layout-principles/assets/Icon'
import '@skills/scroll-reveal/assets/scroll-reveal.css'
import { defineCopy, useDemoLang } from '../../demoLang'
import './scroll-reveal-demo.css'

const COPY = defineCopy({
  ko: {
    cards: ['첫 번째 섹션', '두 번째 섹션', '세 번째 섹션', '네 번째 섹션'],
    controlsLabel: '애니메이션 옵션',
    duration: '지속 시간',
    distance: '이동 거리',
    stagger: '연쇄 간격',
    threshold: '공개 시점',
    visibleAt: (percent: number) => `${percent}% 보일 때`,
    note: '연쇄 간격은 모션 토큰의 스태거 30ms(20~50ms)가 기본입니다. 옵션을 바꾼 뒤 아래 버튼으로 처음부터 다시 보세요.',
    replay: '처음부터 다시 보기',
    hint: '아래로 스크롤하세요 — 섹션이 뷰포트에 들어올 때 순차 공개됩니다.',
    scroll: '스크롤',
    cardBody: (percent: number) => `IntersectionObserver가 이 카드의 ${percent}%가 보이는 순간을 감지해 data-revealed를 바꾸고, 나머지는 CSS transition이 처리합니다.`,
    repeatTitle: 'once=false 예시',
    repeatBody: '이 카드는 뷰포트를 벗어나면 다시 감춰집니다 — 스크롤을 위아래로 움직여 보세요.',
  },
  en: {
    cards: ['First section', 'Second section', 'Third section', 'Fourth section'],
    controlsLabel: 'Animation options',
    duration: 'Duration',
    distance: 'Travel distance',
    stagger: 'Stagger',
    threshold: 'Reveal point',
    visibleAt: (percent: number) => `at ${percent}% visible`,
    note: 'The default stagger is the motion token\'s 30ms (20 to 50ms works). After changing options, use the button below to replay from the start.',
    replay: 'Replay from the start',
    hint: 'Scroll down. Each section is revealed in turn as it enters the viewport.',
    scroll: 'Scroll',
    cardBody: (percent: number) => `IntersectionObserver detects the moment ${percent}% of this card is visible and flips data-revealed. A CSS transition does the rest.`,
    repeatTitle: 'once=false example',
    repeatBody: 'This card hides again when it leaves the viewport. Scroll up and down to see it.',
  },
})

export const ScrollRevealDemo = () => {
  const t = COPY[useDemoLang()]
  // key를 바꿔 전체를 리마운트하는 리플레이 장치 — 데모 전용, 스킬 코드와 무관
  const [replayKey, setReplayKey] = useState(0)
  const [durationMs, setDurationMs] = useState(420)
  const [distancePx, setDistancePx] = useState(24)
  const [staggerMs, setStaggerMs] = useState(30)
  const [threshold, setThreshold] = useState(0.15)

  // SKILL.md의 커스터마이즈 포인트(CSS 변수·props)를 그대로 노출한다 — 데모 전용 장치
  const revealVars = {
    '--reveal-duration': `${durationMs}ms`,
    '--reveal-distance': `${distancePx}px`,
  } as CSSProperties

  return (
    <div className="reveal-demo">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>--reveal-duration</code>
          </span>
          <input
            type="range"
            min={200}
            max={1200}
            step={20}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{durationMs}ms</output>
        </label>
        <label>
          <span>
            {t.distance} <code>--reveal-distance</code>
          </span>
          <input
            type="range"
            min={0}
            max={80}
            step={8}
            value={distancePx}
            onChange={(e) => setDistancePx(Number(e.target.value))}
          />
          <output>{distancePx}px</output>
        </label>
        <label>
          <span>
            {t.stagger} <code>delayMs</code>
          </span>
          <input
            type="range"
            min={0}
            max={200}
            step={10}
            value={staggerMs}
            onChange={(e) => setStaggerMs(Number(e.target.value))}
          />
          <output>{staggerMs}ms</output>
        </label>
        <label>
          <span>
            {t.threshold} <code>threshold</code>
          </span>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
          <output>{t.visibleAt(Math.round(threshold * 100))}</output>
        </label>
        <p className="controls-note">
          {t.note}
        </p>
      </section>

      <div key={replayKey} className="reveal-list" style={revealVars}>
        <div className="reveal-toolbar">
          <button type="button" onClick={() => setReplayKey((prev) => prev + 1)}>
            {t.replay}
          </button>
          <p>{t.hint}</p>
        </div>
        <div className="reveal-spacer">
          <Icon name="chevron-down" />
          {t.scroll}
        </div>
        {t.cards.map((title, index) => (
          <ScrollReveal key={index} threshold={threshold} delayMs={(index % 2) * staggerMs}>
            <article className="reveal-card">
              <h2>{title}</h2>
              <p>{t.cardBody(Math.round(threshold * 100))}</p>
            </article>
          </ScrollReveal>
        ))}
        <ScrollReveal once={false} threshold={threshold}>
          <article className="reveal-card reveal-card-repeat">
            <h2>{t.repeatTitle}</h2>
            <p>{t.repeatBody}</p>
          </article>
        </ScrollReveal>
      </div>
    </div>
  )
}
