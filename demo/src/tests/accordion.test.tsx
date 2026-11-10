import { useState } from 'react'
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

  it('single인데 defaultOpenIds가 여러 개면 첫 항목만 연다 (하나만 열린다는 약속이 처음부터 지켜진다)', () => {
    render(<Accordion items={ITEMS} defaultOpenIds={['waiting', 'parking']} />)
    expect(screen.getByRole('button', { name: /웨이팅/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /주차/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('항목 id에 공백이 있어도 aria-controls·aria-labelledby가 한 요소를 가리킨다', () => {
    render(<Accordion items={[{ id: '포장 문의', title: '포장 되나요?', content: '네.' }]} />)
    const trigger = screen.getByRole('button', { name: /포장 되나요/ })
    const controls = trigger.getAttribute('aria-controls')!
    expect(controls).not.toMatch(/\s/)
    expect(trigger.id).not.toMatch(/\s/)
    expect(document.getElementById(controls)).toHaveAttribute('aria-labelledby', trigger.id)
  })

  it('openIds·onOpenChange를 주면 열림 상태를 밖에서 쥔다 (주소의 해시로 특정 질문 열기, 전부 펼치기)', () => {
    const changes: string[][] = []
    const Controlled = () => {
      const [openIds, setOpenIds] = useState(['parking'])
      return (
        <>
          <button type="button" onClick={() => setOpenIds(ITEMS.map((item) => item.id))}>
            전부 펼치기
          </button>
          <Accordion
            items={ITEMS}
            type="multiple"
            openIds={openIds}
            onOpenChange={(next) => {
              changes.push(next)
              setOpenIds(next)
            }}
          />
        </>
      )
    }
    render(<Controlled />)
    expect(screen.getByRole('button', { name: /주차/ })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: /포장 되나요/ }))
    expect(changes).toEqual([['parking', 'takeout']])
    fireEvent.click(screen.getByRole('button', { name: '전부 펼치기' }))
    screen.getAllByRole('button', { expanded: true }).forEach((trigger) => expect(trigger).toHaveClass('accordion-trigger'))
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(3)
  })

  it('openIds만 주고 onOpenChange가 상태를 바꾸지 않으면 눌러도 그대로다 (밖의 상태가 정본)', () => {
    render(<Accordion items={ITEMS} openIds={[]} onOpenChange={() => {}} />)
    const trigger = screen.getByRole('button', { name: /포장 되나요/ })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('내부 상태로 쓸 때도 onOpenChange로 바뀐 목록을 알린다', () => {
    const onOpenChange = vi.fn()
    render(<Accordion items={ITEMS} onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: /웨이팅/ }))
    expect(onOpenChange).toHaveBeenCalledWith(['waiting'])
  })

  it('headingLevel로 제목 단계를 문서 구조에 맞춘다 (기본 h3)', () => {
    const { container, rerender } = render(<Accordion items={ITEMS} />)
    expect(container.querySelectorAll('h3.accordion-header')).toHaveLength(3)
    rerender(<Accordion items={ITEMS} headingLevel={2} />)
    expect(container.querySelectorAll('h2.accordion-header')).toHaveLength(3)
  })

  it('여러 개가 함께 열리는 목록이 6개를 넘으면 패널에 region 역할을 달지 않는다 (랜드마크가 넘쳐 길 찾기를 방해한다)', () => {
    const many = Array.from({ length: 7 }, (_, index) => ({ id: `q${index}`, title: `질문 ${index + 1}`, content: `답 ${index + 1}` }))
    const { container, rerender } = render(<Accordion items={many} type="multiple" defaultOpenIds={['q0']} />)
    expect(container.querySelector('.accordion-panel')).not.toHaveAttribute('role')
    // 한 번에 하나만 열리면 보이는 region도 하나라 그대로 둔다
    rerender(<Accordion key="single" items={many} defaultOpenIds={['q0']} />)
    expect(container.querySelector('.accordion-panel')).toHaveAttribute('role', 'region')
  })
})
