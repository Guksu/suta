import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import { clampPair, lowerOnTop, nearerHandle, snapValue, toPercent, valueAtPercent } from './rangeValues'
import './range-slider.css'

export type RangeValue = { lower: number; upper: number }

type RangeSliderProps = {
  min: number
  max: number
  step?: number
  value: RangeValue
  onChange: (next: RangeValue) => void
  /** 조작이 끝났을 때(손을 뗌·키 한 번·트랙 누름) 한 번 — 서버 요청·주소 갱신처럼 끄는 내내 하면 안 되는 일을 여기서 한다 */
  onChangeEnd?: (next: RangeValue) => void
  /** 두 값 사이 최소 간격 (기본 0) */
  minDistance?: number
  /** 각 손잡이의 접근성 이름 */
  label?: { lower: string; upper: string }
  /** 스크린 리더가 읽을 값 문구 — "12000" 대신 "12,000원"으로 읽히게 한다 */
  format?: (value: number) => string
  /** 잠금 — 두 손잡이가 Tab 순서에서 빠지고 트랙을 눌러도 움직이지 않는다 */
  disabled?: boolean
  className?: string
}

/**
 * 두 손잡이 범위 슬라이더.
 *
 * **네이티브 `<input type="range">` 두 개를 겹쳐 놓았다.** 직접 그린 div로 만들면
 * 키보드 조작·스크린 리더·터치·고대비 모드를 전부 다시 만들어야 하는데, 네이티브를 쓰면 공짜다.
 * 화면에 보이는 트랙과 채움은 별도 요소이고, input 자신은 투명하게 만들어 손잡이만 남긴다.
 *
 * 값의 규칙(눈금·경계·교차)은 rangeValues가, 모양은 CSS가 담당한다.
 */
export const RangeSlider = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  onChangeEnd,
  minDistance = 0,
  label = { lower: '최솟값', upper: '최댓값' },
  format,
  disabled = false,
  className,
}: RangeSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null)

  /** 움직인 쪽의 새 값을 눈금·범위·교차 규칙에 맞춘 한 쌍으로 */
  const resolve = ({ next, moved }: { next: number; moved: 'lower' | 'upper' }) => {
    const snapped = snapValue({ value: next, min, max, step })
    const pair = moved === 'lower' ? { lower: snapped, upper: value.upper } : { lower: value.lower, upper: snapped }
    return clampPair({ ...pair, moved, minDistance, min, max })
  }

  const commit = (change: { next: number; moved: 'lower' | 'upper' }) => {
    const pair = resolve(change)
    onChange(pair)
    return pair
  }

  // 리스너를 한 번만 붙이려고 최신 값을 ref로 든다
  const latestRef = useRef({ resolve, onChangeEnd })
  latestRef.current = { resolve, onChangeEnd }

  useEffect(function reportWhenDragEnds() {
    const root = trackRef.current
    if (!root) return
    // 네이티브 change는 손을 뗐을 때(키보드는 누를 때마다) 한 번 온다. React의 onChange는 끄는 내내 오는 input 이벤트라 구별이 안 된다.
    // 값은 input에서 직접 읽는다 — 부모가 아직 다시 그리지 않았어도 맞는 값이 나간다
    const handleChange = (event: Event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || !input.dataset.handle) return
      const moved = input.dataset.handle === 'lower' ? 'lower' : 'upper'
      latestRef.current.onChangeEnd?.(latestRef.current.resolve({ next: Number(input.value), moved }))
    }
    root.addEventListener('change', handleChange)
    return () => root.removeEventListener('change', handleChange)
  }, [])

  /** 트랙을 누르면 가까운 손잡이가 그 자리로 온다 — 손잡이를 정확히 집지 않아도 조작할 수 있다 */
  const onTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track || disabled || (event.target as HTMLElement).tagName === 'INPUT') return
    // 오른쪽 버튼(문맥 메뉴)·가운데 버튼은 조작이 아니다
    if (event.button !== 0) return
    const rect = track.getBoundingClientRect()
    if (rect.width === 0) return
    const fromLeft = ((event.clientX - rect.left) / rect.width) * 100
    // 오른쪽에서 읽는 문서에서는 네이티브 input이 뒤집힌다(오른쪽 끝이 최솟값) — 누른 자리도 같이 뒤집는다
    const rtl = getComputedStyle(track).direction === 'rtl' || track.closest('[dir]')?.getAttribute('dir') === 'rtl'
    const percent = rtl ? 100 - fromLeft : fromLeft
    const next = valueAtPercent({ percent, min, max, step })
    const pair = commit({ next, moved: nearerHandle({ value: next, lower: value.lower, upper: value.upper }) })
    onChangeEnd?.(pair)
  }

  const vars = {
    '--range-lower': `${toPercent({ value: value.lower, min, max })}%`,
    '--range-upper': `${toPercent({ value: value.upper, min, max })}%`,
  } as CSSProperties

  const inputProps = (handle: 'lower' | 'upper') => ({
    type: 'range' as const,
    className: 'range-input',
    min,
    max,
    step,
    disabled,
    value: value[handle],
    'aria-label': label[handle],
    // 숫자만 읽으면 "12000"이 된다 — 단위까지 읽히게 문구를 준다
    'aria-valuetext': format?.(value[handle]),
    onChange: (event: { target: { value: string } }) => commit({ next: Number(event.target.value), moved: handle }),
  })

  return (
    <div
      ref={trackRef}
      className={className ? `range-root ${className}` : 'range-root'}
      style={vars}
      data-disabled={disabled ? 'true' : undefined}
      data-on-top={lowerOnTop({ lower: value.lower, upper: value.upper, min, max }) ? 'lower' : 'upper'}
      onPointerDown={onTrackPointerDown}
    >
      <div className="range-track" aria-hidden="true" />
      <input {...inputProps('lower')} data-handle="lower" />
      <input {...inputProps('upper')} data-handle="upper" />
    </div>
  )
}
