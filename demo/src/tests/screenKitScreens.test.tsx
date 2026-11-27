import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { ActionBar, CheckList, OptionSection, PickGroup } from '@skills/screen-kit/assets/ScreenKitDetail'
import { ProfileRow, SettingsGroup, SettingsRow } from '@skills/screen-kit/assets/ScreenKitSettings'
import { AnswerHead, BarChart, Metrics, Periods, barShare } from '@skills/screen-kit/assets/ScreenKitDashboard'

const assetsDir = resolve(process.cwd(), '../skills/suta/patterns/screen-kit/assets')

/* ---------------- 상세 ---------------- */

describe('OptionSection — 옵션 구역 머리', () => {
  it('제목과 고르는 법 한 줄이 있고, 구역의 이름은 제목이다', () => {
    render(
      <OptionSection title="면 양" hint="하나 선택">
        <p>내용</p>
      </OptionSection>,
    )
    const section = screen.getByRole('region', { name: '면 양' })
    expect(section).toHaveClass('kit-option')
    expect(screen.getByRole('heading', { level: 2, name: '면 양' })).toHaveClass('kit-option-title')
    expect(screen.getByText('하나 선택')).toHaveClass('kit-option-hint')
  })
})

describe('PickGroup — 하나 고르는 칸', () => {
  const OPTIONS = [
    { value: 'regular', label: '보통' },
    { value: 'large', label: '곱빼기', extra: '+1,500원' },
  ]

  it('네이티브 라디오 묶음이다 — 고른 것은 checked, 이름은 보이는 글자', () => {
    render(<PickGroup name="size" label="면 양" options={OPTIONS} value="regular" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: '면 양' })).toHaveClass('kit-picks')
    expect(screen.getByRole('radio', { name: '보통' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '곱빼기 +1,500원' })).not.toBeChecked()
  })

  it('누르면 그 값으로 onChange를 부른다', () => {
    const onChange = vi.fn()
    render(<PickGroup name="size" label="면 양" options={OPTIONS} value="regular" onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: '곱빼기 +1,500원' }))
    expect(onChange).toHaveBeenCalledWith('large')
  })

  it('보이는 구역 제목이 있으면 그 id로 이름을 잇는다', () => {
    render(
      <>
        <h2 id="size-title">면 양</h2>
        <PickGroup name="size" labelledBy="size-title" options={OPTIONS} value="large" onChange={() => {}} />
      </>,
    )
    expect(screen.getByRole('radiogroup', { name: '면 양' })).toBeInTheDocument()
  })
})

describe('CheckList — 여러 개 고르는 체크 행', () => {
  const OPTIONS = [
    { value: 'egg', label: '달걀지단 더', price: '+1,000원' },
    { value: 'laver', label: '김가루 더', price: '+500원' },
    { value: 'mandu', label: '손만두 2개', price: '+3,000원', disabled: true },
  ]

  it('행마다 실제 체크 상자이고, 이름은 행의 보이는 글자(이름 + 추가 금액)다', () => {
    render(<CheckList label="추가" options={OPTIONS} values={['egg']} onChange={() => {}} />)
    expect(screen.getByRole('group', { name: '추가' })).toHaveClass('kit-checks')
    const egg = screen.getByRole('checkbox', { name: '달걀지단 더 +1,000원' })
    expect(egg).toBeChecked()
    expect(egg).toHaveAttribute('type', 'checkbox')
    expect(screen.getByRole('checkbox', { name: '김가루 더 +500원' })).not.toBeChecked()
  })

  it('누르면 켜고 끈 뒤의 값 목록으로 onChange를 부른다(옵션 순서 유지)', () => {
    const onChange = vi.fn()
    const { rerender } = render(<CheckList label="추가" options={OPTIONS} values={['egg']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: '김가루 더 +500원' }))
    expect(onChange).toHaveBeenLastCalledWith(['egg', 'laver'])
    rerender(<CheckList label="추가" options={OPTIONS} values={['laver', 'egg']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: '달걀지단 더 +1,000원' }))
    expect(onChange).toHaveBeenLastCalledWith(['laver'])
  })

  it('고를 수 없는 행은 disabled다', () => {
    render(<CheckList label="추가" options={OPTIONS} values={[]} onChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: '손만두 2개 +3,000원' })).toBeDisabled()
  })
})

describe('ActionBar — 하단 고정 바', () => {
  it('버튼 하나에 행동 이름과 합계가 보이는 글자로 든다', () => {
    const onClick = vi.fn()
    const { container } = render(<ActionBar label="담기" total="16,000원" onClick={onClick} />)
    const button = screen.getByRole('button', { name: '담기 16,000원' })
    expect(button).toHaveClass('kit-button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.kit-actionbar')).not.toHaveAttribute('data-fixed')
  })

  it('fixed면 화면에 고정하는 표시를 단다(본문 아래 자리는 .kit-actionbar-space)', () => {
    const { container } = render(<ActionBar label="담기" total="7,000원" fixed />)
    expect(container.querySelector('.kit-actionbar')).toHaveAttribute('data-fixed')
  })
})

/* ---------------- 설정 ---------------- */

describe('ProfileRow — 프로필 줄', () => {
  it('행 전체가 링크이고, 이름은 보이는 글자(이름 + 보조)다. 첫 글자 원은 장식이다', () => {
    const { container } = render(<ProfileRow name="김국수" sub="noodle@example.com" href="#/me" />)
    const link = screen.getByRole('link', { name: '김국수 noodle@example.com' })
    expect(link).toHaveClass('kit-profile')
    expect(container.querySelector('.kit-profile-avatar')).toHaveTextContent('김')
    expect(container.querySelector('.kit-profile-avatar')).toHaveAttribute('aria-hidden', 'true')
  })

  it('initial로 원 안 글자를 바꾼다', () => {
    const { container } = render(<ProfileRow name="Alex Kim" initial="A" href="#/me" />)
    expect(container.querySelector('.kit-profile-avatar')).toHaveTextContent('A')
  })
})

describe('SettingsGroup·SettingsRow — 폭 가득 행', () => {
  it('묶음 이름이 구역의 이름이고, 아래 안내 한 줄이 있다', () => {
    render(
      <SettingsGroup label="화면" note="테마는 기기 설정을 따라요">
        <SettingsRow label="언어" value="한국어" href="#/lang" />
      </SettingsGroup>,
    )
    const group = screen.getByRole('region', { name: '화면' })
    expect(group.querySelector('ul.kit-rows')).not.toBeNull()
    expect(screen.getByText('테마는 기기 설정을 따라요')).toHaveClass('kit-group-note')
  })

  it('링크 행은 행 전체가 누르는 영역이고, 이름은 라벨 + 현재 값(보이는 글자)이다', () => {
    render(
      <ul>
        <SettingsRow label="언어" value="한국어" href="#/lang" />
      </ul>,
    )
    const link = screen.getByRole('link', { name: '언어 한국어' })
    expect(link).toHaveClass('kit-row-link')
    expect(link.closest('li')).toHaveClass('kit-row')
  })

  it('href 대신 onClick이면 버튼 행이다(바텀시트로 고를 때)', () => {
    const onClick = vi.fn()
    render(
      <ul>
        <SettingsRow label="테마" value="기기 설정 따름" onClick={onClick} />
      </ul>,
    )
    fireEvent.click(screen.getByRole('button', { name: '테마 기기 설정 따름' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

/* ---------------- 대시보드 ---------------- */

describe('barShare — 막대 높이(가장 큰 값에 대한 비율)', () => {
  it('가장 큰 값이 1이고 나머지는 그 비율이다', () => {
    expect(barShare({ values: [50, 100, 25] })).toEqual([0.5, 1, 0.25])
  })

  it('값이 없는 칸(null)은 null로 두고 최댓값 계산에서 뺀다', () => {
    expect(barShare({ values: [10, null, 40] })).toEqual([0.25, null, 1])
  })

  it('모두 0이면 0이다(0으로 나누지 않는다)', () => {
    expect(barShare({ values: [0, 0] })).toEqual([0, 0])
    expect(barShare({ values: [] })).toEqual([])
  })

  it('음수는 0으로 그린다(막대가 아래로 뚫고 나가지 않게)', () => {
    expect(barShare({ values: [-5, 10] })).toEqual([0, 1])
  })
})

describe('BarChart — CSS 막대 줄', () => {
  const DATA = [
    { label: '11', value: 98 },
    { label: '12', value: 236 },
    { label: '19', value: null },
  ]

  it('그림 하나(role="img")이고, 이름은 값을 말하는 문장이다', () => {
    render(<BarChart label="시간대별 매출, 단위 천 원. 11시 98, 12시 236" data={DATA} />)
    expect(screen.getByRole('img', { name: '시간대별 매출, 단위 천 원. 11시 98, 12시 236' })).toHaveClass('kit-chart')
  })

  it('막대 높이는 --kit-chart-value(가장 큰 값에 대한 비율)로 넘기고, 값 글자를 막대 위에 둔다', () => {
    const { container } = render(<BarChart label="매출" data={DATA} format={(value) => value.toLocaleString('ko-KR')} />)
    const columns = container.querySelectorAll<HTMLElement>('.kit-chart-col')
    expect(columns).toHaveLength(3)
    expect(columns[1].style.getPropertyValue('--kit-chart-value')).toBe('1')
    expect(columns[0].style.getPropertyValue('--kit-chart-value')).toBe(String(98 / 236))
    expect(columns[1].querySelector('.kit-chart-value')).toHaveTextContent('236')
    expect(columns[0].querySelector('.kit-chart-label')).toHaveTextContent('11')
  })

  it('값이 없는 칸은 비워 두고(data-empty) 값 글자가 없다', () => {
    const { container } = render(<BarChart label="매출" data={DATA} />)
    const empty = container.querySelectorAll('.kit-chart-col')[2]
    expect(empty).toHaveAttribute('data-empty')
    expect(empty.querySelector('.kit-chart-value')).toBeNull()
  })

  it('강조할 칸 하나만 data-emphasis다', () => {
    const { container } = render(<BarChart label="매출" data={DATA} emphasis={1} />)
    const marked = container.querySelectorAll('[data-emphasis]')
    expect(marked).toHaveLength(1)
    expect(marked[0]).toBe(container.querySelectorAll('.kit-chart-col')[1])
  })
})

describe('AnswerHead·Periods·Metrics', () => {
  it('답 머리 — 라벨이 제목이고 큰 수치·비교 한 줄이 이어진다', () => {
    const { container } = render(<AnswerHead label="오늘 매출" value="1,284,000원" compare="지난주보다 +96,000원" />)
    expect(screen.getByRole('heading', { level: 1, name: '오늘 매출' })).toHaveClass('kit-answer-label')
    expect(container.querySelector('.kit-answer-value')).toHaveTextContent('1,284,000원')
    expect(container.querySelector('.kit-answer-compare')).toHaveTextContent('지난주보다 +96,000원')
  })

  it('기간 고르기 — 이름 있는 묶음 안의 글자 버튼, 고른 것은 aria-pressed', () => {
    const onChange = vi.fn()
    render(
      <Periods
        label="기간"
        options={[
          { value: 'today', label: '오늘' },
          { value: 'week', label: '이번 주' },
        ]}
        value="today"
        onChange={onChange}
      />,
    )
    expect(screen.getByRole('group', { name: '기간' })).toHaveClass('kit-periods')
    expect(screen.getByRole('button', { name: '오늘' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '이번 주' }))
    expect(onChange).toHaveBeenCalledWith('week')
  })

  it('지표 줄 — 정의 목록(라벨 → 값 → 보조)이다', () => {
    const { container } = render(
      <Metrics
        items={[
          { label: '주문', value: '148건', sub: '지난주 139건' },
          { label: '품절', value: '1개' },
        ]}
      />,
    )
    const list = container.querySelector('dl.kit-metrics')
    expect(list?.querySelectorAll('.kit-metric')).toHaveLength(2)
    expect(list?.querySelector('dt')).toHaveTextContent('주문')
    expect(list?.querySelector('.kit-metric-value')).toHaveTextContent('148건')
    expect(list?.querySelector('.kit-metric-sub')).toHaveTextContent('지난주 139건')
  })
})

/* ---------------- CSS 규약 ---------------- */

describe('표 — 좁은 화면에서 목록으로 바뀐다', () => {
  it('screen-kit-dashboard.css가 화면 틀(컨테이너) 쿼리 안에서 표의 display를 바꾼다(검사 규칙 table-squeeze)', () => {
    const css = readFileSync(resolve(assetsDir, 'screen-kit-dashboard.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const query = css.slice(css.indexOf('@container kit'))
    expect(query).toMatch(/\.kit-table[^{]*\{[^}]*display\s*:/)
  })
})
