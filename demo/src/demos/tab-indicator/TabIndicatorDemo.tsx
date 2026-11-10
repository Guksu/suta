import { useState, type CSSProperties } from 'react'
import { nextTabIndex } from '@skills/tab-indicator/assets/moveTabIndicator'
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
  const { registerTab, indicatorRef, focusTab } = useTabIndicator({ activeIndex: active })

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
        {/* 좁은 화면에서는 탭 다섯 개가 한 줄에 들어가지 않는다 — 줄을 옆으로 스크롤하고 선택한 탭을 보이는 자리로 옮긴다 */}
        <nav className="tab-bar demo-tab-bar" role="tablist" aria-label={t.tabsLabel} data-scroll="true">
          {t.tabs.map((label, index) => (
            <button
              key={index}
              ref={registerTab(index)}
              type="button"
              role="tab"
              aria-selected={index === active}
              // 탭 줄은 Tab 한 번에 지나가고 안에서는 방향키로 오간다 — 선택된 탭만 Tab 순서에 둔다
              tabIndex={index === active ? 0 : -1}
              className="demo-tab"
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                const next = nextTabIndex({ key: event.key, index, count: t.tabs.length })
                if (next === null) return
                event.preventDefault()
                setActive(next)
                focusTab(next)
              }}
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
