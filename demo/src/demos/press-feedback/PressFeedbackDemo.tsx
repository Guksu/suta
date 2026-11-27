import { useState, type CSSProperties } from 'react'
import '@skills/press-feedback/assets/press-feedback.css'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import './press-feedback-demo.css'

const COPY = defineCopy({
  ko: {
    controlsLabel: '옵션',
    scale: '눌림 배율',
    note: '꾹 눌러보세요 — 누름은 60ms 즉각, 복귀는 220ms 스프링(비대칭 타이밍)입니다. 0.9 이하로 과장하면 고빈도 사용에서 금방 피로해집니다.',
    basic: '기본 — pressable',
    order: '주문하기',
    card: '카드형 — pressable-dim',
    cardTitle: '오늘의 국수',
    cardMeta: '얼큰 칼국수 9,000원',
    lift: '호버 리프트 — pressable-lift',
    save: '찜하기',
    statesTitle: '상태 한 벌 — 포커스·호버·눌림·잠김',
    statesNote: 'Tab으로 옮기면 강조색 링이 바깥 2px에 그려지고, 마우스를 올리면 면이 한 단계 어두워져요. 값은 모두 토큰(layout-tokens.css·motion-tokens.css)에서 가져와요.',
    cart: '장바구니에 담기',
    soldOut: '품절',
    soldOutReason: '비빔국수는 오늘 재료가 떨어졌어요. 내일 오전 11시에 다시 열어요.',
  },
  en: {
    controlsLabel: 'Options',
    scale: 'Press scale',
    note: 'Press and hold. The press lands in 60ms and the release springs back over 220ms (asymmetric timing). Push it to 0.9 or lower and it quickly gets tiring on buttons people tap often.',
    basic: 'Default: pressable',
    order: 'Order',
    card: 'Card: pressable-dim',
    cardTitle: "Today's noodles",
    cardMeta: 'Spicy knife-cut noodles ₩9,000',
    lift: 'Hover lift: pressable-lift',
    save: 'Save',
    statesTitle: 'One set of states: focus, hover, press, disabled',
    statesNote: 'Tab to a button and an accent ring appears 2px outside it. Point at it with a mouse and the surface turns one step darker. Every value comes from the tokens (layout-tokens.css and motion-tokens.css).',
    cart: 'Add to cart',
    soldOut: 'Sold out',
    soldOutReason: 'Spicy mixed noodles are out of ingredients today. We reopen tomorrow at 11 am.',
  },
})

export const PressFeedbackDemo = () => {
  const t = COPY[useDemoLang()]
  const [pressScale, setPressScale] = useState(0.96)

  const vars = { '--press-scale': String(pressScale) } as CSSProperties

  return (
    <div className="playground" style={vars}>
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.scale} <code>--press-scale</code>
          </span>
          <input
            type="range"
            min={0.85}
            max={1}
            step={0.01}
            value={pressScale}
            onChange={(e) => setPressScale(Number(e.target.value))}
          />
          <output>{pressScale.toFixed(2)}</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="press-grid">
        <section className="press-cell">
          <h2>{t.basic}</h2>
          <button type="button" className="pressable press-primary">
            {t.order}
          </button>
        </section>
        <section className="press-cell">
          <h2>{t.card}</h2>
          <button type="button" className="pressable pressable-dim press-card">
            <DishPhoto dish="kalguksu" className="press-card-photo" />
            <strong>{t.cardTitle}</strong>
            <small>{t.cardMeta}</small>
          </button>
        </section>
        <section className="press-cell">
          <h2>{t.lift}</h2>
          <button type="button" className="pressable pressable-lift press-primary">
            {t.save}
          </button>
        </section>
      </div>

      <section className="press-states" aria-labelledby="press-states-title">
        <h2 id="press-states-title">{t.statesTitle}</h2>
        <p className="press-states-note">{t.statesNote}</p>
        <div className="press-states-row">
          <button type="button" className="pressable press-state press-state-fill">
            {t.order}
          </button>
          <button type="button" className="pressable press-state press-state-line">
            {t.cart}
          </button>
          <button type="button" className="pressable press-state press-state-fill" disabled aria-describedby="press-states-reason">
            {t.soldOut}
          </button>
        </div>
        <p id="press-states-reason" className="press-states-note">
          {t.soldOutReason}
        </p>
      </section>
    </div>
  )
}
