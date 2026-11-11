import { useEffect, useRef, useState } from 'react'
import { createCountUp, defaultFormat } from './createCountUp'
import './count-up.css'

type CountUpProps = {
  /** 목표값 — 바뀔 때마다 화면에 보이던 값에서 새 값으로 굴러간다 */
  value: number
  /** 마운트 때의 시작값 (기본 0). value와 같게 주면 마운트 때 굴리지 않는다 — 이미 본 값을 다시 굴리지 않을 때 */
  initialValue?: number
  durationMs?: number
  format?: (value: number) => string
  className?: string
}

/**
 * createCountUp 코어의 React 래퍼 — value가 바뀔 때마다 보이던 값에서 이어서 굴러간다.
 * 굴러가는 숫자는 aria-hidden이고, 화면 낭독기에는 숨긴 글자로 최종값만 둔다.
 * 낭독 영역(role=status·aria-live) 안에 두어도 중간값(+0P, +5P, +11P…)이 읽히지 않고 최종값이 한 번 읽힌다.
 */
export const CountUp = ({ value, initialValue = 0, durationMs = 800, format, className }: CountUpProps) => {
  const elementRef = useRef<HTMLSpanElement | null>(null)
  // 지금 화면에 보이는 값 — 굴러가는 도중에 새 값이 오면 직전 목표가 아니라 여기서 이어 간다(숫자가 튀지 않는다)
  const shownRef = useRef(initialValue)
  // format은 인라인 함수로 넘기는 일이 많다. 의존성에 두면 부모가 다시 그릴 때마다 처음부터 다시 센다
  const formatRef = useRef(format)
  // 첫 그리기(서버 렌더 포함)에도 자리가 비지 않게 시작값을 넣는다. 이후 글자는 코어가 textContent로 쓴다
  const [initialText] = useState(() => (format ?? defaultFormat)(initialValue))

  useEffect(
    function applyLatestFormat() {
      formatRef.current = format
      // 멈춰 있는 숫자도 새 형식(언어·단위)으로 다시 쓴다. 굴러가는 중이면 다음 프레임이 덮는다
      if (elementRef.current) elementRef.current.textContent = (format ?? defaultFormat)(shownRef.current)
    },
    [format],
  )

  useEffect(
    function animateToValue() {
      const el = elementRef.current
      if (!el) return
      const counter = createCountUp({
        element: el,
        from: shownRef.current,
        to: value,
        durationMs,
        format: (v) => (formatRef.current ?? defaultFormat)(v),
        onUpdate: (v) => {
          shownRef.current = v
        },
      })
      counter.start()
      return () => counter.stop()
    },
    [value, durationMs],
  )

  return (
    <span className={className ? `count-up ${className}` : 'count-up'}>
      <span ref={elementRef} aria-hidden="true">
        {initialText}
      </span>
      <span className="count-up-sr">{(format ?? defaultFormat)(value)}</span>
    </span>
  )
}
