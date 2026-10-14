import { useState, type CSSProperties } from 'react'
import { useTabIndicator } from '@skills/tab-indicator/assets/useTabIndicator'
import { defineCopy, useDemoLang } from '../../demoLang'
import './tab-indicator-demo.css'

const COPY = defineCopy({
  ko: {
    tabs: ['소개', '면 메뉴', '오늘의 국수', '리뷰', '매장 안내'],
    controlsLabel: '애니메이션 옵션',
    duration: '슬라이드 시간',
    height: '두께',
    note: '탭을 번갈아 눌러보세요 — 밑줄이 폭이 다른 탭 사이를 늘었다 줄며 미끄러집니다(전부 transform, 레이아웃 애니메이션 없음).',
    tabsLabel: '데모 탭',
    panel: '선택된 탭의 콘텐츠 영역이에요.',
  },
  en: {
    // 폭이 다른 탭 사이를 오가는 것이 데모의 요점이라, 한국어판처럼 길이가 고르지 않은 짧은 이름을 고른다
    tabs: ['About', 'Noodles', 'Specials', 'Reviews', 'Location'],
    controlsLabel: 'Animation options',
    duration: 'Slide duration',
    height: 'Thickness',
    note: 'Switch between tabs. The underline stretches and shrinks as it slides between tabs of different widths (all transform, no layout animation).',
    tabsLabel: 'Demo tabs',
    panel: 'This is the content area for the selected tab.',
  },
})

export const TabIndicatorDemo = () => {
  const t = COPY[useDemoLang()]
  const [active, setActive] = useState(0)
  const [durationMs, setDurationMs] = useState(250)
  const [heightPx, setHeightPx] = useState(2)
  const { registerTab, indicatorRef } = useTabIndicator({ activeIndex: active })

  const vars = {
    '--tab-indicator-duration': `${durationMs}ms`,
    '--tab-indicator-height': `${heightPx}px`,
  } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>--tab-indicator-duration</code>
          </span>
          <input
            type="range"
            min={100}
            max={600}
            step={50}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{durationMs}ms</output>
        </label>
        <label>
          <span>
            {t.height} <code>--tab-indicator-height</code>
          </span>
          <input
            type="range"
            min={2}
            max={6}
            step={1}
            value={heightPx}
            onChange={(e) => setHeightPx(Number(e.target.value))}
          />
          <output>{heightPx}px</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="tab-demo" style={vars}>
        <nav className="tab-bar demo-tab-bar" role="tablist" aria-label={t.tabsLabel}>
          {t.tabs.map((label, index) => (
            <button
              key={index}
              ref={registerTab(index)}
              type="button"
              role="tab"
              aria-selected={index === active}
              className="demo-tab"
              onClick={() => setActive(index)}
            >
              {label}
            </button>
          ))}
          <span ref={indicatorRef} className="tab-indicator" aria-hidden="true" />
        </nav>
        <section className="tab-panel">
          <strong>{t.tabs[active]}</strong>
          <p>{t.panel}</p>
        </section>
      </div>
    </div>
  )
}
