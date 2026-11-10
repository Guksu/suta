import { createSelect } from '@skills/select/assets/createSelect'

describe('createSelect — React 없이 마크업에 셀렉트 동작을 잇는다', () => {
  let root: HTMLElement
  let changes: string[]
  const cleanups: Array<() => void> = []

  const mount = ({ value = null, options }: { value?: string | null; options?: string } = {}) => {
    root = document.createElement('div')
    root.className = 'select'
    root.innerHTML = `
      <button type="button" class="select-trigger" aria-label="면 종류">
        <span class="select-value"></span>
      </button>
      <input type="hidden" name="noodle" />
      <ul class="select-panel">
        ${
          options ??
          `<li class="select-option" data-value="buckwheat">Buckwheat noodles</li>
           <li class="select-option" data-value="knife" aria-disabled="true">Knife-cut noodles</li>
           <li class="select-option" data-value="medium">Medium wheat noodles</li>
           <li class="select-option" data-value="rice">Rice noodles</li>`
        }
      </ul>`
    document.body.appendChild(root)
    changes = []
    const controller = createSelect({ root, value, placeholder: '면 종류 선택', onChange: (next) => changes.push(next) })
    cleanups.push(controller.destroy, () => root.remove())
    return controller
  }

  afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()))

  const trigger = () => root.querySelector<HTMLButtonElement>('.select-trigger')!
  const panel = () => root.querySelector<HTMLElement>('.select-panel')!
  const options = () => Array.from(root.querySelectorAll<HTMLElement>('.select-option'))
  const press = (key: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    trigger().dispatchEvent(event)
    return event
  }
  const active = () => document.getElementById(trigger().getAttribute('aria-activedescendant') ?? '')

  it('역할과 ARIA 속성을 붙인다 — 마크업에는 클래스와 data-value만 있으면 된다', () => {
    mount()
    expect(trigger()).toHaveAttribute('role', 'combobox')
    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveAttribute('aria-controls', panel().id)
    expect(panel()).toHaveAttribute('role', 'listbox')
    expect(panel()).toHaveAttribute('data-open', 'false')
    expect(panel()).toHaveAttribute('aria-hidden', 'true')
    options().forEach((option) => {
      expect(option).toHaveAttribute('role', 'option')
      expect(option.id).not.toBe('')
    })
  })

  it('값이 없으면 placeholder를, 있으면 그 옵션의 글자를 트리거에 보인다', () => {
    mount()
    expect(root.querySelector('.select-value')).toHaveTextContent('면 종류 선택')
    expect(root.querySelector('.select-value')).toHaveClass('select-placeholder')
    cleanups.splice(0).forEach((cleanup) => cleanup())

    mount({ value: 'rice' })
    expect(root.querySelector('.select-value')).toHaveTextContent('Rice noodles')
    expect(root.querySelector('.select-value')).not.toHaveClass('select-placeholder')
    expect(options()[3]).toHaveAttribute('aria-selected', 'true')
    expect(root.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe('rice')
  })

  it('클릭으로 열고 옵션을 눌러 고른다 — 값·표시·숨은 input이 바뀌고 닫히며 포커스가 트리거로 돌아온다', () => {
    const controller = mount()
    trigger().click()
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(panel()).toHaveAttribute('data-open', 'true')

    options()[2].click()
    expect(changes).toEqual(['medium'])
    expect(controller.value()).toBe('medium')
    expect(root.querySelector('.select-value')).toHaveTextContent('Medium wheat noodles')
    expect(root.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe('medium')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(trigger())
  })

  it('고를 수 없는 옵션은 눌러도 고르지 않고, 화살표가 건너뛴다', () => {
    mount()
    trigger().click()
    options()[1].click()
    expect(changes).toEqual([])
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')

    press('ArrowDown') // 첫 옵션에서 → 두 번째는 건너뛰고 세 번째
    expect(active()).toBe(options()[2])
    expect(options()[2]).toHaveAttribute('data-highlighted', 'true')
    press('Enter')
    expect(changes).toEqual(['medium'])
  })

  it('닫힌 채 ArrowDown으로 열면 선택된 옵션(없으면 첫 옵션)을 가리킨다', () => {
    mount({ value: 'rice' })
    const event = press('ArrowDown')
    expect(event.defaultPrevented).toBe(true)
    expect(active()).toBe(options()[3])
  })

  it('글자를 치면 그 글자로 시작하는 옵션을 가리킨다 (타이핑으로 찾기)', () => {
    mount()
    press('r')
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(active()).toBe(options()[3])

    press('r', { ctrlKey: true }) // 단축키는 타이핑이 아니다
    expect(active()).toBe(options()[3])
  })

  it('열린 동안의 Escape는 닫고 기본 동작을 막는다. 닫힌 뒤의 Escape는 건드리지 않는다', () => {
    mount()
    trigger().click()
    expect(press('Escape').defaultPrevented).toBe(true)
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(press('Escape').defaultPrevented).toBe(false)
    expect(changes).toEqual([])
  })

  it('바깥을 누르면 닫히고, 안을 누르면 닫히지 않는다', () => {
    mount()
    trigger().click()
    panel().dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('옵션이 0개면 열어도 없는 옵션을 가리키지 않는다', () => {
    mount({ options: '' })
    press('ArrowDown')
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(trigger()).not.toHaveAttribute('aria-activedescendant')
    press('Enter')
    expect(changes).toEqual([])
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('setValue는 표시만 바꾸고 onChange는 부르지 않는다. 옵션을 갈아 끼운 뒤 refresh로 다시 잇는다', () => {
    const controller = mount()
    controller.setValue('buckwheat')
    expect(root.querySelector('.select-value')).toHaveTextContent('Buckwheat noodles')
    expect(changes).toEqual([])

    panel().innerHTML = '<li class="select-option" data-value="ramyeon">Ramyeon</li>'
    controller.refresh()
    expect(options()[0]).toHaveAttribute('role', 'option')
    expect(root.querySelector('.select-value')).toHaveTextContent('면 종류 선택') // 고른 값이 옵션에 없으면 placeholder
  })

  it('destroy 뒤에는 반응하지 않는다', () => {
    const controller = mount()
    controller.destroy()
    trigger().click()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })
})
