import type { CSSProperties, ReactNode } from 'react'
import './screen-kit.css'
import './screen-kit-dashboard.css'

/* screen-kit 대시보드 부품의 얇은 React 래퍼 — 마크업과 접근성 연결만 한다. 모양은 CSS가 정한다.
 * 표·상태 표시·순위 목록·두 열 판은 마크업이 짧고 데이터 모양이 프로젝트마다 달라 래퍼 없이 클래스로 쓴다(PATTERN.md).
 * 막대 줄은 차트 라이브러리가 아니다 — 값 몇 개를 막대로 보이는 데까지만. 축·눈금·툴팁·여러 계열이 필요하면 차트 라이브러리를 쓴다. */

/* ---------------- 답 머리 ---------------- */

type AnswerHeadProps = {
  /** 무엇의 값인가 — 화면의 제목(h1)이 된다. "오늘 매출 · 11월 27일 금요일" */
  label: ReactNode
  /** 화면이 답하는 값 하나 — 56/700 */
  value: ReactNode
  /** 비교 한 줄 — 무엇과 비교했는지 + 차이. 차이는 <b>로 */
  compare?: ReactNode
  /** 오른쪽 — 기간 고르기(Periods) 등 */
  aside?: ReactNode
  /** 사이트 머리 안에 h1이 이미 있으면 2 */
  level?: 1 | 2
  className?: string
}

export const AnswerHead = ({ label, value, compare, aside, level = 1, className }: AnswerHeadProps) => {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div className={className ? `kit-answer ${className}` : 'kit-answer'}>
      <div className="kit-answer-main">
        <Heading className="kit-answer-label">{label}</Heading>
        <p className="kit-answer-value">{value}</p>
        {compare && <p className="kit-answer-compare">{compare}</p>}
      </div>
      {aside}
    </div>
  )
}

/* ---------------- 기간 고르기 ---------------- */

type PeriodsProps = {
  /** 묶음 이름 — "기간" */
  label: string
  options: { value: string; label: ReactNode }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/** 알약 글자 버튼 묶음 — 고른 것은 aria-pressed + 옅은 바탕 + 굵게 */
export const Periods = ({ label, options, value, onChange, className }: PeriodsProps) => (
  <div className={className ? `kit-periods ${className}` : 'kit-periods'} role="group" aria-label={label}>
    {options.map((option) => (
      <button key={option.value} type="button" className="kit-period" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
        {option.label}
      </button>
    ))}
  </div>
)

/* ---------------- 지표 줄 ---------------- */

type MetricsProps = {
  items: { label: ReactNode; value: ReactNode; sub?: ReactNode }[]
  className?: string
}

/** 정의 목록 — 칸마다 라벨(dt) → 값 → 보조(dd 둘) */
export const Metrics = ({ items, className }: MetricsProps) => (
  <dl className={className ? `kit-metrics ${className}` : 'kit-metrics'}>
    {items.map((item, index) => (
      <div key={index} className="kit-metric">
        <dt>{item.label}</dt>
        <dd className="kit-metric-value">{item.value}</dd>
        {item.sub && <dd className="kit-metric-sub">{item.sub}</dd>}
      </div>
    ))}
  </dl>
)

/* ---------------- 막대 줄 ---------------- */

/**
 * 막대 높이 — 가장 큰 값에 대한 0~1 비율. 값이 없는 칸(null: 아직 오지 않은 시간·쉬는 날)은 null로 두고 최댓값에서 뺀다.
 * 모두 0이면 0(0으로 나누지 않는다), 음수는 0으로 그린다 — 이 막대 줄은 0에서 위로만 자란다.
 */
export const barShare = ({ values }: { values: (number | null)[] }) => {
  const max = Math.max(0, ...values.map((value) => value ?? 0))
  return values.map((value) => (value === null ? null : max > 0 ? Math.max(0, value) / max : 0))
}

type BarChartProps = {
  /** 그림의 이름 — 값을 말하는 문장. "시간대별 매출, 단위 천 원. 11시 98, 12시 236, …, 18시 350이 가장 많다" */
  label: string
  data: { label: ReactNode; value: number | null }[]
  /** 주 글자색으로 칠할 칸 하나(지금·오늘·고른 값)의 위치 */
  emphasis?: number
  /** 막대 위 값 글자 — 기본은 숫자 그대로 */
  format?: (value: number) => string
  className?: string
}

/** role="img" 하나 — 안쪽 글자(값·축)는 보이는 그림의 일부이고, 낭독은 label이 맡는다 */
export const BarChart = ({ label, data, emphasis, format = String, className }: BarChartProps) => {
  const shares = barShare({ values: data.map((item) => item.value) })
  return (
    <div className={className ? `kit-chart ${className}` : 'kit-chart'} role="img" aria-label={label}>
      {data.map((item, index) => {
        const share = shares[index]
        return (
          <div
            key={index}
            className="kit-chart-col"
            data-empty={item.value === null ? '' : undefined}
            data-emphasis={index === emphasis ? '' : undefined}
            style={{ '--kit-chart-value': String(share ?? 0) } as CSSProperties}
          >
            {item.value !== null && <span className="kit-chart-value">{format(item.value)}</span>}
            <span className="kit-chart-bar" />
            <span className="kit-chart-label">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
