import { render, screen } from '@testing-library/react'
import { ProgressRing } from '@skills/progress-ring/assets/ProgressRing'
import { ActivityRings } from '@skills/progress-ring/assets/ActivityRings'

describe('ProgressRing — 원형 진행 표시의 접근성 속성과 상태 훅', () => {
  it('progressbar 역할과 aria 값(now/min/max/label)을 갖는다', () => {
    render(<ProgressRing value={60} max={100} label="주문 준비" />)
    const bar = screen.getByRole('progressbar', { name: '주문 준비' })
    expect(bar).toHaveAttribute('aria-valuenow', '60')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).not.toHaveAttribute('data-over')
    expect(bar).not.toHaveAttribute('data-indeterminate')
  })

  it('목표 초과 값은 링을 100%로 클램프하고 data-over를 붙인다', () => {
    render(<ProgressRing value={120} max={100} label="판매 그릇" />)
    const bar = screen.getByRole('progressbar', { name: '판매 그릇' })
    expect(bar).toHaveAttribute('data-over', 'true')
    // 실제 값은 보조기기에 그대로 전달한다 — 링만 시각적으로 클램프
    expect(bar).toHaveAttribute('aria-valuenow', '120')
    // 링은 가득 찬 상태(offset 0)
    expect(bar.style.getPropertyValue('--ring-offset')).toBe('0px')
  })

  it('value가 없으면 indeterminate — aria-valuenow 없이 data-indeterminate를 붙인다', () => {
    render(<ProgressRing label="불러오는 중" />)
    const bar = screen.getByRole('progressbar', { name: '불러오는 중' })
    expect(bar).toHaveAttribute('data-indeterminate', 'true')
    expect(bar).not.toHaveAttribute('aria-valuenow')
  })

  it('ActivityRings — 링마다 개별 progressbar를 만들고 각자 over를 판정한다', () => {
    render(
      <ActivityRings
        rings={[
          { value: 130, max: 120, color: '#f00', label: '판매 그릇 수' },
          { value: 80, max: 200, color: '#0f0', label: '만두 빚기' },
          { value: 20, max: 80, color: '#00f', label: '육수 끓이기' },
        ]}
      />,
    )
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(3)
    expect(screen.getByRole('progressbar', { name: '판매 그릇 수' })).toHaveAttribute('data-over', 'true')
    expect(screen.getByRole('progressbar', { name: '만두 빚기' })).toHaveAttribute('aria-valuenow', '80')
    expect(screen.getByRole('progressbar', { name: '만두 빚기' })).not.toHaveAttribute('data-over')
  })
  it('숫자가 아닌 값(NaN)은 빈 링으로 그리고 aria-valuenow에 "NaN"을 싣지 않는다', () => {
    render(<ProgressRing value={Number.NaN} label="달성률" size={120} stroke={12} />)
    const bar = screen.getByRole('progressbar', { name: '달성률' })
    expect(bar).toHaveAttribute('aria-valuenow', '0')
    expect(bar).not.toHaveAttribute('data-indeterminate')
    // 빈 링 = offset이 둘레와 같다
    expect(bar.style.getPropertyValue('--ring-offset')).toBe(bar.style.getPropertyValue('--ring-circumference'))
  })
})
