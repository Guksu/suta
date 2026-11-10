import { fireEvent, render, screen } from '@testing-library/react'
import { BottomNav } from '@skills/bottom-nav/assets/BottomNav'

const items = [
  { href: '/', label: '홈', icon: <svg /> },
  { href: '/category', label: '카테고리', icon: <svg /> },
  { href: '/wish', label: '찜', icon: <svg />, badge: 12 },
  { href: '/my', label: '마이', icon: <svg />, badge: 'dot' as const },
]

describe('BottomNav — 하단 탭 바', () => {
  it('nav 랜드마크 안의 링크 목록이고, 현재 탭에 aria-current="page"가 붙는다', () => {
    render(<BottomNav items={items} path="/category/noodles" />)
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /카테고리/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /홈/ })).not.toHaveAttribute('aria-current')
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('개수 배지는 숫자를, 점은 말로 화면 낭독기에 알린다', () => {
    render(<BottomNav items={items} path="/" />)
    expect(screen.getByRole('link', { name: '찜 새 항목 12개' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '마이 새 소식 있음' })).toBeInTheDocument()
    expect(screen.getByText('12')).toHaveAttribute('aria-hidden', 'true')
  })

  it('다른 탭을 누르면 onNavigate가 주소를 받고, 지금 탭을 다시 누르면 onReselect가 불린다', () => {
    const onNavigate = vi.fn(({ event }: { event: { preventDefault: () => void } }) => event.preventDefault())
    const onReselect = vi.fn()
    render(<BottomNav items={items} path="/" onNavigate={onNavigate} onReselect={onReselect} />)
    fireEvent.click(screen.getByRole('link', { name: /카테고리/ }))
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ href: '/category' }))
    fireEvent.click(screen.getByRole('link', { name: /홈/ }))
    expect(onReselect).toHaveBeenCalledWith('/')
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('hidden이거나 입력칸에 초점이 있으면 숨기고 inert로 키보드 이동에서도 뺀다', () => {
    const { rerender, container } = render(
      <>
        <input aria-label="검색" />
        <BottomNav items={items} path="/" />
      </>,
    )
    const nav = container.querySelector('nav') as HTMLElement
    expect(nav).not.toHaveAttribute('data-hidden')
    fireEvent.focusIn(screen.getByLabelText('검색'))
    expect(nav).toHaveAttribute('data-hidden', 'true')
    expect(nav).toHaveAttribute('inert')
    fireEvent.focusOut(screen.getByLabelText('검색'))
    expect(nav).not.toHaveAttribute('data-hidden')
    rerender(
      <>
        <input aria-label="검색" />
        <BottomNav items={items} path="/products/janchi" hidden />
      </>,
    )
    expect(nav).toHaveAttribute('data-hidden', 'true')
  })

  it('새 탭으로 열기(Ctrl·Cmd·Shift 클릭)는 가로채지 않는다 — 링크의 기본 동작에 맡긴다', () => {
    const onNavigate = vi.fn()
    const onReselect = vi.fn()
    // 탭 바의 핸들러가 지나간 뒤 기본 동작이 막혔는지 기록한다. jsdom은 실제 이동을 못 하므로 기록한 뒤에 막는다
    const prevented: boolean[] = []
    const probe = (event: Event) => {
      prevented.push(event.defaultPrevented)
      event.preventDefault()
    }
    document.addEventListener('click', probe)
    render(<BottomNav items={items} path="/" onNavigate={onNavigate} onReselect={onReselect} />)
    fireEvent.click(screen.getByRole('link', { name: /카테고리/ }), { metaKey: true })
    fireEvent.click(screen.getByRole('link', { name: /카테고리/ }), { ctrlKey: true })
    fireEvent.click(screen.getByRole('link', { name: /카테고리/ }), { shiftKey: true })
    fireEvent.click(screen.getByRole('link', { name: /홈/ }), { metaKey: true })
    document.removeEventListener('click', probe)
    expect(onNavigate).not.toHaveBeenCalled()
    expect(onReselect).not.toHaveBeenCalled()
    expect(prevented).toEqual([false, false, false, false])
  })

  it('화면이 바뀌면 키보드 판정을 지금 초점으로 다시 맞춘다 (초점이 있던 입력칸이 focusout 없이 사라져도 탭 바가 숨은 채 남지 않는다)', () => {
    // 탭 바는 같은 자리에 두고 입력칸만 뗐다 붙인다 — 탭 바가 다시 마운트되면 상태가 초기화돼 검증이 되지 않는다
    const Screen = ({ path, withInput }: { path: string; withInput: boolean }) => (
      <>
        <BottomNav items={items} path={path} />
        {withInput && <input aria-label="검색" />}
      </>
    )
    const { rerender, container } = render(<Screen path="/search" withInput />)
    const nav = container.querySelector('nav') as HTMLElement
    fireEvent.focusIn(screen.getByLabelText('검색'))
    expect(nav).toHaveAttribute('data-hidden', 'true')
    // 검색 화면을 떠난다 — 입력칸은 사라지고 focusout은 오지 않았다
    rerender(<Screen path="/" withInput={false} />)
    expect(container.querySelector('nav')).toBe(nav)
    expect(nav).not.toHaveAttribute('data-hidden')
  })

  it('처음부터 입력칸에 초점이 있으면(autofocus) 숨긴 채 그린다', () => {
    const { container } = render(
      <>
        <input aria-label="검색" autoFocus />
        <BottomNav items={items} path="/search" />
      </>,
    )
    expect(container.querySelector('nav')).toHaveAttribute('data-hidden', 'true')
  })
})
