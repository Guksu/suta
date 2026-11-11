import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useSpring } from '@skills/spring-physics/assets/useSpring'
import { dampingRatio, springDuration, springToLinear } from '@skills/spring-physics/assets/spring'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { defineCopy, useDemoLang } from '../../demoLang'
import './spring-physics-demo.css'

// 언어와 무관한 값(강성·감쇠)은 밖에, 프리셋 이름은 COPY에 id로 둔다
const PRESETS = [
  { id: 'crisp', stiffness: 170, damping: 26 },
  { id: 'bouncy', stiffness: 300, damping: 15 },
  { id: 'heavy', stiffness: 120, damping: 30 },
  { id: 'critical', stiffness: 200, damping: 28 },
] as const

type NoteArgs = { ratio: number; feel: string; settleMs: number }

const COPY = defineCopy({
  ko: {
    presets: { crisp: '크리스프', bouncy: '통통', heavy: '묵직', critical: '임계' },
    feel: { bouncy: '튐', critical: '임계 근처', sluggish: '굼뜸' },
    controlsLabel: '스프링 옵션',
    stiffness: '강성',
    damping: '감쇠',
    note: ({ ratio, feel, settleMs }: NoteArgs) => (
      <>
        감쇠비 ζ = {ratio.toFixed(2)} ({feel}) · 100px 복귀 정착 약 {settleMs}ms.
        공을 잡아 던져 보세요 — 놓는 순간 속도를 이어받습니다. 아래 회색 공은 같은 자리에서 <code>300ms ease-out</code>으로
        돌아오는 비교용입니다.
      </>
    ),
    ballLabel: '스프링 공 — 끌어서 놓기',
    pop: 'CSS linear() 팝',
  },
  en: {
    presets: { crisp: 'Crisp', bouncy: 'Bouncy', heavy: 'Heavy', critical: 'Critical' },
    feel: { bouncy: 'bouncy', critical: 'near critical', sluggish: 'sluggish' },
    controlsLabel: 'Spring options',
    stiffness: 'Stiffness',
    damping: 'Damping',
    note: ({ ratio, feel, settleMs }: NoteArgs) => (
      <>
        Damping ratio ζ = {ratio.toFixed(2)} ({feel}) · settles from 100px in about {settleMs}ms.
        Grab the ball and throw it: it keeps the speed you release it with. The gray ball below is for comparison. It
        returns from the same spot with <code>300ms ease-out</code>.
      </>
    ),
    ballLabel: 'Spring ball: drag and release',
    pop: 'CSS linear() pop',
  },
})

export const SpringPhysicsDemo = () => {
  const t = COPY[useDemoLang()]
  const [stiffness, setStiffness] = useState(170)
  const [damping, setDamping] = useState(26)
  const [popped, setPopped] = useState(false)
  const config = { stiffness, damping }

  const ballRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, lastX: 0, lastT: 0, velocity: 0 })

  const x = useSpring({
    config,
    onUpdate: (value) => {
      if (ballRef.current) ballRef.current.style.transform = `translateX(${value}px)`
    },
  })

  // duration 비교용 고스트 — 같은 출발점에서 300ms ease-out으로 돌아온다
  const releaseGhost = (from: number) => {
    const ghost = ghostRef.current
    if (!ghost) return
    ghost.style.transition = 'none'
    ghost.style.transform = `translateX(${from}px)`
    void ghost.offsetWidth
    ghost.style.transition = 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'
    ghost.style.transform = 'translateX(0px)'
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { active: true, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.active) return
    const dt = Math.max(1, e.timeStamp - d.lastT)
    d.velocity = ((e.clientX - d.lastX) / dt) * 1000
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    x.set(x.get() + e.movementX)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    releaseGhost(x.get())
    // 끌다가 멈춘 뒤 놓으면 마지막 이동 때의 속도가 남아 있다 — 100ms 넘게 멈춰 있었으면 던진 것이 아니다.
    // 동작 줄이기는 훅이 맡는다(튕기지 않고 바로 0으로)
    x.to(0, e.timeStamp - d.lastT > 100 ? 0 : d.velocity)
  }

  const linear = springToLinear({ config })
  const ratio = dampingRatio({ stiffness, damping, mass: 1 })
  const settleMs = springDuration({ motion: { from: 100, to: 0 }, config })
  const feel = ratio < 0.98 ? 'bouncy' : ratio <= 1.02 ? 'critical' : 'sluggish'

  useEffect(
    function applyLinearToPop() {
      const el = document.querySelector<HTMLElement>('.spring-pop')
      if (el) el.style.transition = `transform ${linear.duration}ms ${linear.easing}`
    },
    [linear.duration, linear.easing],
  )

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.stiffness} <code>stiffness</code>
          </span>
          <input type="range" min={50} max={500} step={10} value={stiffness} onChange={(e) => setStiffness(Number(e.target.value))} />
          <output>{stiffness}</output>
        </label>
        <label>
          <span>
            {t.damping} <code>damping</code>
          </span>
          <input type="range" min={5} max={60} step={1} value={damping} onChange={(e) => setDamping(Number(e.target.value))} />
          <output>{damping}</output>
        </label>
        <div className="spring-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setStiffness(p.stiffness)
                setDamping(p.damping)
              }}
            >
              {t.presets[p.id]}
            </button>
          ))}
        </div>
        <p className="controls-note">{t.note({ ratio, feel: t.feel[feel], settleMs })}</p>
      </section>

      <div className="spring-stage">
        <div className="spring-track">
          <div
            ref={ballRef}
            className="spring-ball"
            role="slider"
            aria-label={t.ballLabel}
            aria-valuenow={0}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') x.to(160)
              if (e.key === 'ArrowLeft') x.to(0)
            }}
          >
            <Icon name="bowl" />
          </div>
        </div>
        <div className="spring-track spring-track-ghost" aria-hidden="true">
          <div ref={ghostRef} className="spring-ball spring-ball-ghost">
            <Icon name="clock" />
          </div>
        </div>

        <div className="spring-linear">
          <button
            type="button"
            className="spring-pop"
            data-popped={popped}
            onClick={() => setPopped((p) => !p)}
          >
            <Icon name="heart" filled={popped} />
            {t.pop}
          </button>
          <code className="spring-linear-code">{linear.easing.slice(0, 80)}… ({linear.duration}ms)</code>
        </div>
      </div>
    </div>
  )
}
