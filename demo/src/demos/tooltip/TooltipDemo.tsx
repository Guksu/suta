import { useState } from 'react'
import { Tooltip } from '@skills/tooltip/assets/Tooltip'
import { defineCopy, useDemoLang } from '../../demoLang'
import './tooltip-demo.css'

// 말풍선은 줄바꿈 없이 한 줄로 뜬다 — 영어 문구도 한국어만큼 짧게 둔다
const COPY = defineCopy({
  ko: {
    controlsLabel: '애니메이션 옵션',
    delay: '호버 지연',
    note: '마우스는 지연 후, 키보드 포커스(Tab 이동)는 즉시 열립니다 — 스치는 커서에는 반응하지 않고 의도가 분명한 포커스는 기다리게 하지 않습니다. Esc로 닫힙니다.',
    extra: { button: '면 추가', tip: '곱빼기는 +1,000원' },
    spice: { button: '맵기', tip: '2단계 — 국물이 칼칼해요' },
    fresh: { button: '생면', tip: '매일 아침 뽑은 생면만 써요' },
    takeout: { button: '포장', tip: '국물은 따로 담아드려요' },
  },
  en: {
    controlsLabel: 'Animation options',
    delay: 'Hover delay',
    note: 'With a mouse it opens after the delay. With keyboard focus (Tab) it opens right away. A passing cursor does nothing, and deliberate focus never has to wait. Esc closes it.',
    extra: { button: 'Extra noodles', tip: 'Double portion +₩1,000' },
    spice: { button: 'Spice', tip: 'Level 2: the broth has a kick' },
    fresh: { button: 'Fresh noodles', tip: 'Made fresh every morning' },
    takeout: { button: 'Takeout', tip: 'Broth packed separately' },
  },
})

export const TooltipDemo = () => {
  const t = COPY[useDemoLang()]
  const [delayMs, setDelayMs] = useState(400)

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.delay} <code>showDelayMs</code>
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            step={100}
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
          />
          <output>{delayMs}ms</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="tooltip-stage">
        <Tooltip label={t.extra.tip} place="top" showDelayMs={delayMs}>
          <button type="button">{t.extra.button}</button>
        </Tooltip>
        <Tooltip label={t.spice.tip} place="bottom" showDelayMs={delayMs}>
          <button type="button">{t.spice.button}</button>
        </Tooltip>
        <Tooltip label={t.fresh.tip} place="left" showDelayMs={delayMs}>
          <button type="button">{t.fresh.button}</button>
        </Tooltip>
        <Tooltip label={t.takeout.tip} place="right" showDelayMs={delayMs}>
          <button type="button">{t.takeout.button}</button>
        </Tooltip>
      </div>
    </div>
  )
}
