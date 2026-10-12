import { render } from '@testing-library/react'
import { CountUp } from '@skills/count-up/assets/CountUp'

// 낭독 영역(role=status·aria-live) 안에 카운트업을 두면 굴러가는 중간값(+0P, +5P, +11P…)이 모두 읽힌다.
// 화면 낭독기에는 최종값만 한 번 닿게 — 굴러가는 숫자는 aria-hidden, 최종값은 숨긴 글자로 따로 둔다.
describe('CountUp — 화면 낭독기에는 최종값만', () => {
  it('굴러가는 숫자는 aria-hidden이고, 최종값은 화면에서 숨긴 글자로 바로 들어 있다', () => {
    const { container } = render(<CountUp value={1200} format={(v) => `${Math.round(v).toLocaleString('ko-KR')}P`} />)
    const rolling = container.querySelector('[aria-hidden="true"]')
    expect(rolling).not.toBeNull()
    const spoken = container.querySelector('.count-up-sr')
    expect(spoken?.textContent).toBe('1,200P')
    expect(rolling?.contains(spoken as Node)).toBe(false)
  })

  it('낭독 영역 안에 두어도 읽히는 글자는 최종값 하나다 — 값이 바뀌면 새 최종값으로 한 번에 바뀐다', () => {
    const view = render(
      <p role="status">
        +<CountUp value={20} />P
      </p>,
    )
    const spokenText = () =>
      [...view.getByRole('status').querySelectorAll('.count-up-sr')].map((el) => el.textContent).join('')
    expect(spokenText()).toBe('20')
    view.rerender(
      <p role="status">
        +<CountUp value={120} />P
      </p>,
    )
    expect(spokenText()).toBe('120')
  })
})
