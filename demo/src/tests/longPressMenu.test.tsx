import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LongPressMenu } from '@skills/long-press-menu/assets/LongPressMenu'

const setup = () => {
  const onSelect = vi.fn()
  render(
    <LongPressMenu
      label="잔치국수 동작"
      items={[
        { label: '장바구니 담기', onSelect: () => onSelect('cart') },
        { label: '즐겨찾기', onSelect: () => onSelect('fav') },
        { label: '숨기기', onSelect: () => onSelect('hide'), destructive: true },
      ]}
    >
      <article>잔치국수</article>
    </LongPressMenu>,
  )
  return { onSelect, trigger: screen.getByText('잔치국수').parentElement as HTMLElement }
}

describe('LongPressMenu — 열림·포커스·닫힘', () => {
  it('열리면 menu 역할이 생기고 첫 항목에 포커스가 간다', () => {
    const { trigger } = setup()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.contextMenu(trigger) // 우클릭 = 길게 누르기와 같은 경로
    expect(trigger).toHaveAttribute('data-open', 'true')
    expect(screen.getByRole('menu', { name: '잔치국수 동작' })).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '장바구니 담기' }))
    expect(screen.getByRole('menuitem', { name: '숨기기' })).toHaveAttribute('data-destructive', 'true')
  })

  it('방향키로 순환하고 항목을 고르면 onSelect 후 닫힌다', () => {
    const { onSelect, trigger } = setup()
    fireEvent.contextMenu(trigger)
    const menu = screen.getByRole('menu')

    fireEvent.keyDown(menu, { key: 'ArrowUp' }) // 첫 항목에서 위로 → 마지막으로 감긴다
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '숨기기' }))
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '장바구니 담기' }))

    fireEvent.click(screen.getByRole('menuitem', { name: '즐겨찾기' }))
    expect(onSelect).toHaveBeenCalledWith('fav')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Esc로 닫히고 포커스가 트리거로 돌아온다', () => {
    const { trigger } = setup()
    fireEvent.contextMenu(trigger)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('data-open', 'false')
    expect(document.activeElement).toBe(trigger)
  })
})

describe('LongPressMenu — 키보드로 열기·경계', () => {
  it('트리거에 포커스한 채 Enter·Space·ArrowDown으로 연다', () => {
    for (const key of ['Enter', ' ', 'ArrowDown']) {
      const { trigger } = setup()
      trigger.focus()
      const notPrevented = fireEvent.keyDown(trigger, { key })
      expect(notPrevented).toBe(false) // Space가 페이지를 굴리지 않는다
      expect(screen.getByRole('menu')).toBeInTheDocument()
      cleanup()
    }
  })

  it('카드 안의 버튼에서 누른 Enter는 메뉴를 열지 않는다(그 버튼의 것이다)', () => {
    render(
      <LongPressMenu items={[{ label: '담기', onSelect: () => {} }]}>
        <button type="button">상세 보기</button>
      </LongPressMenu>,
    )
    fireEvent.keyDown(screen.getByText('상세 보기'), { key: 'Enter' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('항목이 0개면 열지 않는다', () => {
    render(
      <LongPressMenu items={[]}>
        <article>잔치국수</article>
      </LongPressMenu>,
    )
    const trigger = screen.getByText('잔치국수').parentElement as HTMLElement
    fireEvent.contextMenu(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('data-open', 'false')
    expect(trigger).not.toHaveAttribute('aria-haspopup')
  })

  it('disabled 항목은 aria-disabled로 읽히고 눌러도 실행되지 않으며 메뉴는 열려 있다', () => {
    const onSelect = vi.fn()
    render(
      <LongPressMenu items={[{ label: '담기', onSelect, disabled: true }, { label: '즐겨찾기', onSelect: () => {} }]}>
        <article>잔치국수</article>
      </LongPressMenu>,
    )
    fireEvent.contextMenu(screen.getByText('잔치국수').parentElement as HTMLElement)
    const item = screen.getByRole('menuitem', { name: '담기' })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(item)
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('메뉴 안쪽의 스크롤로는 닫히지 않고, 페이지 스크롤과 창 크기 변경에는 닫힌다', () => {
    const { trigger } = setup()
    fireEvent.contextMenu(trigger)
    fireEvent.scroll(screen.getByRole('menu'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.scroll(document)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.contextMenu(trigger)
    fireEvent(window, new Event('resize'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('안쪽 요소가 이미 쓴 Esc(defaultPrevented)로는 닫지 않는다', () => {
    const { trigger } = setup()
    fireEvent.contextMenu(trigger)
    const used = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    used.preventDefault()
    window.dispatchEvent(used)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })
})
