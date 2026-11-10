import { fireEvent, render, screen } from '@testing-library/react'
import { DropdownMenu, type MenuItem } from '@skills/dropdown-menu/assets/DropdownMenu'
import { createMenu } from '@skills/dropdown-menu/assets/createMenu'

const makeItems = (onSelect: (id: string) => void): MenuItem[] => [
  { id: 'rename', label: '이름 바꾸기', onSelect: () => onSelect('rename') },
  { id: 'share', label: '공유하기', onSelect: () => onSelect('share') },
  { id: 'archive', label: '보관하기', onSelect: () => onSelect('archive'), disabled: true },
  { id: 'delete', label: '삭제하기', onSelect: () => onSelect('delete'), danger: true },
]

describe('DropdownMenu — 로빙 포커스와 닫기 규칙', () => {
  const trigger = () => screen.getByRole('button', { name: '주문 관리' })
  const setup = () => {
    const onSelect = vi.fn()
    render(<DropdownMenu label="주문 관리" items={makeItems(onSelect)} />)
    return { onSelect }
  }

  it('닫혀 있을 때는 메뉴가 감춰지고 트리거가 메뉴를 가리킨다', () => {
    setup()

    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument() // hidden이라 접근성 트리에서 빠진다
  })

  it('누르면 열리고 첫 항목으로 포커스가 옮겨 간다 (메뉴는 aria-activedescendant가 아니라 실제 포커스)', () => {
    setup()
    fireEvent.click(trigger())

    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '이름 바꾸기' }))
  })

  it('위 방향키로 열면 마지막 항목부터 들어간다', () => {
    setup()
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' })

    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '삭제하기' }))
  })

  it('방향키로 옮기고 끝에서는 반대편으로 감긴다', () => {
    setup()
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '공유하기' }))

    fireEvent.keyDown(menu, { key: 'End' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '삭제하기' }))

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '이름 바꾸기' }))
  })

  it('비활성 항목은 방향키가 건너뛴다', () => {
    setup()
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    // 공유하기 다음은 보관하기(비활성)가 아니라 삭제하기다
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '삭제하기' }))
  })

  it('첫 글자를 치면 그 항목으로 건너뛴다', () => {
    setup()
    fireEvent.click(trigger())

    fireEvent.keyDown(screen.getByRole('menu'), { key: '삭' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '삭제하기' }))
  })

  it('항목을 고르면 실행하고 닫으며 포커스를 트리거로 되돌린다', () => {
    const { onSelect } = setup()
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: '공유하기' }))

    expect(onSelect).toHaveBeenCalledWith('share')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(trigger())
  })

  it('비활성 항목은 눌러도 실행되지 않는다', () => {
    const { onSelect } = setup()
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: '보관하기' }))

    expect(onSelect).not.toHaveBeenCalled()
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
  })

  it('Escape로 닫으면 포커스가 트리거로 돌아온다', () => {
    setup()
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(trigger())
  })

  it('바깥을 누르면 닫히되 포커스를 빼앗지 않는다 — 누른 곳을 누르려던 것이다', () => {
    setup()
    fireEvent.click(trigger())

    fireEvent.pointerDown(document.body)
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).not.toBe(trigger())
  })

  it('Tab으로 빠져나가면 닫히되 포커스는 탭이 가는 곳에 맡긴다', () => {
    setup()
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' })

    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).not.toBe(trigger())
  })

  it('한글 자판의 낱자 키는 항목의 초성과 맞춘다 — 버튼 위에서는 글자가 조합되지 않는다', () => {
    setup()
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')

    fireEvent.keyDown(menu, { key: 'ㅅ' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '삭제하기' }))
  })

  it('낱자를 이어 치면 초성 순서로 좁힌다 (ㄱ, ㅇ → 공유하기)', () => {
    setup()
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')

    fireEvent.keyDown(menu, { key: 'ㄱ' })
    fireEvent.keyDown(menu, { key: 'ㅇ' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '공유하기' }))
  })

  it('찾는 글자가 없을 때의 스페이스는 찾기에 넣지 않는다 (항목을 누르는 키다)', () => {
    setup()
    fireEvent.click(trigger())
    const menu = screen.getByRole('menu')

    fireEvent.keyDown(menu, { key: ' ' })
    fireEvent.keyDown(menu, { key: '삭' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '삭제하기' }))
  })

  it('포커스가 실행 가능한 항목 밖에 있을 때 위 방향키는 마지막 항목으로 간다', () => {
    setup()
    fireEvent.click(trigger())
    // 비활성 항목은 마우스로 누르면 포커스를 받는다
    screen.getByRole('menuitem', { name: '보관하기' }).focus()

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '삭제하기' }))
  })

  it('실행할 수 있는 항목이 없으면 메뉴 자신이 포커스를 받는다 — Escape와 Tab이 그대로 듣는다', () => {
    render(<DropdownMenu label="빈 메뉴" items={[{ id: 'a', label: '준비 중', onSelect: () => {}, disabled: true }]} />)
    const button = screen.getByRole('button', { name: '빈 메뉴' })
    fireEvent.click(button)
    const menu = screen.getByRole('menu')
    expect(document.activeElement).toBe(menu)

    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(button)
  })
})

describe('createMenu — 놓이는 층과 자리', () => {
  const mount = ({ dir, align }: { dir?: 'rtl'; align?: 'start' | 'end' } = {}) => {
    const trigger = document.createElement('button')
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menu.innerHTML = '<button role="menuitem" tabindex="-1">영수증 보기</button>'
    if (dir) trigger.style.direction = dir
    document.body.append(trigger, menu)
    // 트리거는 (500, 100)에 40×40, 메뉴는 200×120, 화면은 1024×768(jsdom 기본)
    trigger.getBoundingClientRect = () => ({ top: 100, left: 500, width: 40, height: 40, right: 540, bottom: 140, x: 500, y: 100, toJSON: () => ({}) })
    Object.defineProperty(menu, 'offsetWidth', { configurable: true, value: 200 })
    Object.defineProperty(menu, 'offsetHeight', { configurable: true, value: 120 })
    return { trigger, menu, controller: createMenu({ trigger, menu, align }) }
  }
  const destroyers: Array<() => void> = []
  afterEach(() => {
    destroyers.splice(0).forEach((destroy) => destroy())
    document.body.innerHTML = ''
  })

  it('popover를 쓸 수 있으면 맨 위 층에 띄운다 — transform·overflow가 걸린 조상(시트·카드) 안에서도 제자리에 뜬다', () => {
    const showPopover = vi.fn()
    const hidePopover = vi.fn()
    HTMLElement.prototype.showPopover = showPopover
    HTMLElement.prototype.hidePopover = hidePopover
    try {
      const { menu, controller } = mount()
      destroyers.push(controller.destroy)
      expect(menu).toHaveAttribute('popover', 'manual')

      controller.open()
      expect(showPopover).toHaveBeenCalledTimes(1)
      controller.close()
      expect(hidePopover).toHaveBeenCalledTimes(1)
    } finally {
      // @ts-expect-error jsdom에는 원래 없다 — 다른 테스트에 남기지 않는다
      delete HTMLElement.prototype.showPopover
      // @ts-expect-error 위와 같다
      delete HTMLElement.prototype.hidePopover
    }
  })

  it('popover가 없는 환경에서는 hidden만으로 여닫는다', () => {
    const { menu, controller } = mount()
    destroyers.push(controller.destroy)
    expect(menu).not.toHaveAttribute('popover')
    controller.open()
    expect(menu.hidden).toBe(false)
    controller.close()
    expect(menu.hidden).toBe(true)
  })

  it('열고 닫을 때 data-open을 직접 건다 — React 없이도 등장 모션이 돈다', () => {
    const { menu, controller } = mount()
    destroyers.push(controller.destroy)
    controller.open()
    expect(menu.dataset.open).toBe('true')
    controller.close()
    expect(menu.dataset.open).toBe('false')
  })

  it('오른쪽에서 왼쪽으로 쓰는 화면(dir="rtl")에서는 start가 오른쪽 맞춤이다', () => {
    const ltr = mount({ align: 'start' })
    destroyers.push(ltr.controller.destroy)
    ltr.controller.open()
    expect(ltr.menu.style.left).toBe('500px')

    const rtl = mount({ dir: 'rtl', align: 'start' })
    destroyers.push(rtl.controller.destroy)
    rtl.controller.open()
    expect(rtl.menu.style.left).toBe('340px') // 트리거 오른쪽 끝(540) - 메뉴 폭(200)
  })

  it('열린 채 스크롤해 트리거가 화면 밖으로 나가면 닫는다 — 메뉴만 화면에 남지 않게. 포커스는 스크롤 없이 트리거로 돌린다', () => {
    const { trigger, controller } = mount()
    destroyers.push(controller.destroy)
    controller.open()
    const focus = vi.spyOn(trigger, 'focus')

    trigger.getBoundingClientRect = () => ({ top: -80, left: 500, width: 40, height: 40, right: 540, bottom: -40, x: 500, y: -80, toJSON: () => ({}) })
    window.dispatchEvent(new Event('scroll'))

    expect(controller.isOpen()).toBe(false)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })
})
