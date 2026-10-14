import { useState, type CSSProperties } from 'react'
import { ProgressRing } from '@skills/progress-ring/assets/ProgressRing'
import { ActivityRings } from '@skills/progress-ring/assets/ActivityRings'
import { clampProgress } from '@skills/progress-ring/assets/ringGeometry'
import { defineCopy, useDemoLang } from '../../demoLang'
import './progress-ring-demo.css'

/** 오늘 목표 3종 — 바깥 링부터 안쪽 순서. 이름·단위는 COPY에 둔다 */
const GOALS = [
  { key: 'bowls', max: 120, color: '#ff6b6b' },
  { key: 'dumplings', max: 200, color: '#ffd166' },
  { key: 'broth', max: 80, color: '#4ecdc4' },
] as const

type GoalKey = (typeof GOALS)[number]['key']

const COPY = defineCopy({
  ko: {
    goals: {
      bowls: { label: '판매 그릇 수', unit: '그릇' },
      dumplings: { label: '만두 빚기', unit: '개' },
      broth: { label: '육수 끓이기', unit: 'L' },
    } satisfies Record<GoalKey, { label: string; unit: string }>,
    controlsLabel: '애니메이션 옵션',
    orderProgress: '주문 준비 진행률',
    speed: '속도',
    indeterminate: '무한 로딩 보기',
    note: '슬라이더를 움직이면 링이 직전 위치에서 새 위치로 따라갑니다 — JS 프레임 루프 없이 stroke-dashoffset의 CSS transition만 씁니다. 목표(120%)를 넘기면 링은 한 바퀴에서 멈추고 번짐으로 초과를 알립니다.',
    todayGoals: '오늘 목표',
    over: '목표 초과',
    ringsCaption: '3중 링 — 바깥부터 안쪽으로 겹칩니다. 각 링이 개별 progressbar로 읽힙니다.',
    orderLabel: '잔치국수 2인분 준비',
    preparing: '준비 중',
    orderName: '잔치국수 2인분 · 손만두 1접시',
    checking: '주방에서 확인 중…',
    almost: '곧 나가요',
    boiling: '면 삶는 중',
    orderCaption: '가운데 슬롯에 퍼센트 숫자. 값이 없으면(무한 로딩) 짧은 호가 돕니다.',
  },
  en: {
    // 숫자 바로 뒤에 단위를 붙여 쓰므로(96그릇) 영어 단위는 앞에 띄어쓰기를 담는다
    goals: {
      bowls: { label: 'Bowls sold', unit: ' bowls' },
      dumplings: { label: 'Dumplings folded', unit: ' pcs' },
      broth: { label: 'Broth simmered', unit: 'L' },
    },
    controlsLabel: 'Animation options',
    orderProgress: 'Order progress',
    speed: 'Speed',
    indeterminate: 'Show indeterminate loading',
    note: 'Move a slider and the ring travels from where it was to the new value, with only a CSS transition on stroke-dashoffset and no JS frame loop. Push past the goal (for example to 120%) and the ring stops at one full turn and glows to show the overflow.',
    todayGoals: "Today's goals",
    over: 'Over goal',
    ringsCaption: 'Three nested rings, from the outside in. Each ring is read out as its own progressbar.',
    orderLabel: 'Preparing anchovy-broth noodles for 2',
    preparing: 'Preparing',
    orderName: 'Anchovy-broth noodles ×2 · Handmade dumplings ×1',
    checking: 'Checking with the kitchen…',
    almost: 'Coming out soon',
    boiling: 'Boiling the noodles',
    orderCaption: 'Percent in the center slot. With no value (indeterminate), a short arc spins.',
  },
})

export const ProgressRingDemo = () => {
  const t = COPY[useDemoLang()]
  const [values, setValues] = useState<Record<GoalKey, number>>({ bowls: 96, dumplings: 130, broth: 52 })
  const [orderProgress, setOrderProgress] = useState(45)
  const [durationMs, setDurationMs] = useState(600)
  const [showIndeterminate, setShowIndeterminate] = useState(false)

  const setValue = ({ key, value }: { key: GoalKey; value: number }) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const vars = { '--ring-duration': `${durationMs}ms` } as CSSProperties
  const orderPercent = Math.round(clampProgress({ value: orderProgress, max: 100 }).progress * 100)

  return (
    <div className="playground" style={vars}>
      <section className="controls" aria-label={t.controlsLabel}>
        {GOALS.map((goal) => (
          <label key={goal.key}>
            <span>
              {t.goals[goal.key].label} <code>value / {goal.max}</code>
            </span>
            <input
              type="range"
              min={0}
              max={Math.round(goal.max * 1.3)}
              step={1}
              value={values[goal.key]}
              onChange={(e) => setValue({ key: goal.key, value: Number(e.target.value) })}
            />
            <output>
              {values[goal.key]}
              {t.goals[goal.key].unit}
            </output>
          </label>
        ))}
        <label>
          <span>
            {t.orderProgress} <code>value</code>
          </span>
          <input
            type="range"
            min={0}
            max={120}
            step={1}
            value={orderProgress}
            onChange={(e) => setOrderProgress(Number(e.target.value))}
          />
          <output>{orderProgress}%</output>
        </label>
        <label>
          <span>
            {t.speed} <code>--ring-duration</code>
          </span>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{durationMs}ms</output>
        </label>
        <label className="controls-inline">
          <input type="checkbox" checked={showIndeterminate} onChange={(e) => setShowIndeterminate(e.target.checked)} />
          <span>
            {t.indeterminate} <code>value=undefined</code>
          </span>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="ring-grid">
        <section className="ring-card">
          <h2>{t.todayGoals}</h2>
          <div className="ring-stage">
            <ActivityRings
              size={180}
              stroke={16}
              gap={5}
              rings={GOALS.map((goal) => ({
                value: values[goal.key],
                max: goal.max,
                color: goal.color,
                label: t.goals[goal.key].label,
              }))}
            />
            <ul className="ring-legend">
              {GOALS.map((goal) => {
                const { over } = clampProgress({ value: values[goal.key], max: goal.max })
                return (
                  <li key={goal.key}>
                    <span className="ring-legend-swatch" style={{ background: goal.color }} aria-hidden="true" />
                    <span className="ring-legend-label">{t.goals[goal.key].label}</span>
                    <strong className="ring-legend-value">
                      {values[goal.key]} / {goal.max}
                      {t.goals[goal.key].unit}
                    </strong>
                    {over && <span className="ring-legend-over">{t.over}</span>}
                  </li>
                )
              })}
            </ul>
          </div>
          <p>{t.ringsCaption}</p>
        </section>

        <section className="ring-card">
          <h2>{t.orderProgress}</h2>
          <div className="ring-stage">
            <ProgressRing
              value={showIndeterminate ? undefined : orderProgress}
              max={100}
              size={140}
              stroke={12}
              color="var(--accent)"
              label={t.orderLabel}
            >
              {showIndeterminate ? (
                <span className="ring-center-text">{t.preparing}</span>
              ) : (
                <span className="ring-center-percent">{orderPercent}%</span>
              )}
            </ProgressRing>
            <div className="ring-order">
              <strong>{t.orderName}</strong>
              <span>{showIndeterminate ? t.checking : orderProgress >= 100 ? t.almost : t.boiling}</span>
            </div>
          </div>
          <p>{t.orderCaption}</p>
        </section>
      </div>
    </div>
  )
}
