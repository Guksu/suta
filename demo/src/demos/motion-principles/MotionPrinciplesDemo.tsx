import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DURATION, EASE, cubicBezier, exitDuration, staggerDelay, type MotionSize } from '@skills/motion-principles/assets/motionTokens'
import { Icon } from '@skills/layout-principles/assets/Icon'
import '@skills/motion-principles/assets/motion-tokens.css'
import { defineCopy, useDemoLang } from '../../demoLang'
import './motion-principles-demo.css'

type EaseKey = keyof typeof EASE

const SIZES: MotionSize[] = ['instant', 'fast', 'fast-plus', 'base', 'base-plus', 'slow', 'page']

const COPY = defineCopy({
  ko: {
    easeLabel: {
      out: 'ease-out — 들어오고 정착',
      inOut: 'in-out — 자리 옮김',
      drawer: 'drawer — 끝에서 길게 감속',
      overshoot: 'overshoot — 넘쳤다 돌아옴',
      linear: 'linear — 시간 비례',
    } as Record<EaseKey, string>,
    menu: ['잔치국수', '비빔국수', '칼국수', '손만두', '냉면', '콩국수', '들깨칼국수', '만두국'],
    controlsLabel: '모션 토큰 옵션',
    leftEase: '왼쪽 이징',
    rightEase: '오른쪽 이징 (비교용)',
    duration: '시간 단계',
    sizeOption: ({ key, ms, exitMs }: { key: string; ms: number; exitMs: number }) => `${key} — ${ms}ms (퇴장 ${exitMs}ms)`,
    stagger: '목록 스태거',
    staggerDetail: '30ms, 10개까지',
    note: '같은 시간에 이징만 다르게 두 카드를 나란히 움직여 보세요. 시간 단계는 "무엇이 움직이는가"로 고릅니다 — 작은 것은 짧게, 화면 크기의 것은 길게, 퇴장은 진입의 3/4. 아래 목록은 30ms 간격으로 차례로 나타납니다.',
    run: (ms: number) => `움직이기 (${ms}ms)`,
    replayList: '목록 다시 등장',
    listLabel: '오늘의 메뉴',
  },
  en: {
    easeLabel: {
      out: 'ease-out: enter and settle',
      inOut: 'in-out: move in place',
      drawer: 'drawer: long slowdown at the end',
      overshoot: 'overshoot: go past, come back',
      linear: 'linear: even over time',
    },
    menu: [
      'Anchovy-broth noodles',
      'Spicy mixed noodles',
      'Knife-cut noodles',
      'Handmade dumplings',
      'Cold noodles',
      'Cold soy-milk noodles',
      'Perilla knife-cut noodles',
      'Dumpling soup',
    ],
    controlsLabel: 'Motion token options',
    leftEase: 'Left easing',
    rightEase: 'Right easing (to compare)',
    duration: 'Duration step',
    sizeOption: ({ key, ms, exitMs }: { key: string; ms: number; exitMs: number }) => `${key}: ${ms}ms (exit ${exitMs}ms)`,
    stagger: 'List stagger',
    staggerDetail: '30ms, up to 10 items',
    note: 'Move two cards side by side with the same duration and different easing. Pick the duration step by what is moving: short for small things, long for screen-sized ones, and exits at 3/4 of the entry. The list below appears one item at a time, 30ms apart.',
    run: (ms: number) => `Move (${ms}ms)`,
    replayList: 'Replay list',
    listLabel: "Today's menu",
  },
})

/** 이징 곡선을 SVG path로 — x는 시간, y는 진행도(위가 1) */
const curvePath = (easing: string) => {
  const f = cubicBezier(easing)
  const points: string[] = []
  for (let i = 0; i <= 60; i += 1) {
    const t = i / 60
    points.push(`${(t * 100).toFixed(1)},${(100 - f(t) * 100).toFixed(1)}`)
  }
  return `M${points.join(' L')}`
}

export const MotionPrinciplesDemo = () => {
  const t = COPY[useDemoLang()]
  const [leftEase, setLeftEase] = useState<EaseKey>('out')
  const [rightEase, setRightEase] = useState<EaseKey>('inOut')
  const [size, setSize] = useState<MotionSize>('base')
  const [runKey, setRunKey] = useState(0)
  const [staggerOn, setStaggerOn] = useState(true)
  const [listKey, setListKey] = useState(0)
  const [moved, setMoved] = useState(false)
  const firstRun = useRef(true)

  useEffect(
    function replayMoveAfterRun() {
      if (firstRun.current) {
        firstRun.current = false
        return
      }
      setMoved(false)
      const timer = setTimeout(() => setMoved(true), 30)
      return () => clearTimeout(timer)
    },
    [runKey],
  )

  const ms = DURATION[size]
  const vars = { '--demo-duration': `${ms}ms`, '--demo-exit': `${exitDuration(ms)}ms` } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.leftEase} <code>--motion-ease-*</code>
          </span>
          <select value={leftEase} onChange={(e) => setLeftEase(e.target.value as EaseKey)}>
            {(Object.keys(EASE) as EaseKey[]).map((key) => (
              <option key={key} value={key}>
                {t.easeLabel[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.rightEase}</span>
          <select value={rightEase} onChange={(e) => setRightEase(e.target.value as EaseKey)}>
            {(Object.keys(EASE) as EaseKey[]).map((key) => (
              <option key={key} value={key}>
                {t.easeLabel[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>
            {t.duration} <code>--motion-duration-*</code>
          </span>
          <select value={size} onChange={(e) => setSize(e.target.value as MotionSize)}>
            {SIZES.map((key) => (
              <option key={key} value={key}>
                {t.sizeOption({ key, ms: DURATION[key], exitMs: exitDuration(DURATION[key]) })}
              </option>
            ))}
          </select>
        </label>
        <label className="controls-inline">
          <input type="checkbox" checked={staggerOn} onChange={(e) => setStaggerOn(e.target.checked)} />
          <span>
            {t.stagger} <code>--motion-stagger</code> {t.staggerDetail}
          </span>
        </label>
        <p className="controls-note">
          {t.note}
        </p>
      </section>

      <div className="mp-stage" style={vars}>
        <div className="mp-compare">
          {([leftEase, rightEase] as EaseKey[]).map((key, side) => (
            <div key={side} className="mp-lane">
              <svg className="mp-curve" viewBox="-5 -15 110 130" aria-hidden="true">
                <line x1="0" y1="100" x2="100" y2="100" />
                <line x1="0" y1="0" x2="0" y2="100" />
                <path d={curvePath(EASE[key])} />
              </svg>
              <div className="mp-track">
                {/* layout-audit-ignore: nested-card — 이징을 비교하려고 움직이는 48px 말이다(무언가를 담는 상자가 아니다) */}
                <div className="mp-card" data-moved={moved ? 'true' : 'false'} style={{ '--demo-ease': EASE[key] } as CSSProperties}>
                  <Icon name="bowl" />
                </div>
              </div>
              <code className="mp-ease-value">{EASE[key]}</code>
            </div>
          ))}
        </div>
        <div className="mp-actions">
          <button type="button" onClick={() => setRunKey((k) => k + 1)}>
            {t.run(ms)}
          </button>
          <button type="button" onClick={() => setListKey((k) => k + 1)}>
            {t.replayList}
          </button>
        </div>

        <ul className="mp-list" key={listKey} aria-label={t.listLabel}>
          {t.menu.map((name, index) => (
            // layout-audit-ignore: nested-card — 차례로 나타나는 칩 — 스태거를 눈으로 세려면 항목마다 경계가 있어야 한다
            <li
              key={name}
              className="mp-item"
              style={{ '--delay': `${staggerOn ? staggerDelay({ index }) : 0}ms` } as CSSProperties}
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
