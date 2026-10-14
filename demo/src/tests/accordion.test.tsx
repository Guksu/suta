import { render, screen, fireEvent } from '@testing-library/react'
import { Accordion } from '@skills/accordion/assets/Accordion'

const ITEMS = [
  { id: 'takeout', title: '포장 되나요?', content: '네, 모든 메뉴 포장 가능합니다.' },
  { id: 'waiting', title: '웨이팅은 어떻게 하나요?', content: '매장 앞 태블릿에 등록해 주세요.' },
  { id: 'parking', title: '주차할 곳이 있나요?', content: '건물 지하 주차장 1시간 무료입니다.' },
]

describe('Accordion — 단일/다중 열림·ARIA 배선', () => {
  it('처음에는 전부 닫혀 있고, 누르면 aria-expanded와 패널 data-open이 함께 바뀐다', () => {
    render(<Accordion items={ITEMS} />)
    const trigger = screen.getByRole('button', { name: /포장 되나요/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!
    expect(panel).toHaveAttribute('data-open', 'true')
  })

  it('single(기본): 다른 항목을 열면 이전 항목이 닫힌다', () => {
    render(<Accordion items={ITEMS} />)
    const first = screen.getByRole('button', { name: /포장 되나요/ })
    const second = screen.getByRole('button', { name: /웨이팅/ })
    fireEvent.click(first)
    fireEvent.click(second)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveAttribute('aria-expanded', 'true')
  })

  it('multiple: 여러 항목이 동시에 열린다', () => {
    render(<Accordion items={ITEMS} type="multiple" />)
    const first = screen.getByRole('button', { name: /포장 되나요/ })
    const second = screen.getByRole('button', { name: /웨이팅/ })
    fireEvent.click(first)
    fireEvent.click(second)
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(second).toHaveAttribute('aria-expanded', 'true')
  })

  it('defaultOpenIds로 처음부터 열어둘 수 있다', () => {
    render(<Accordion items={ITEMS} defaultOpenIds={['parking']} />)
    expect(screen.getByRole('button', { name: /주차/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('패널은 role=region으로 트리거와 aria-labelledby로 연결된다', () => {
    render(<Accordion items={ITEMS} defaultOpenIds={['takeout']} />)
    const trigger = screen.getByRole('button', { name: /포장 되나요/ })
    const region = screen.getByRole('region', { name: /포장 되나요/ })
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.id)
  })
})
