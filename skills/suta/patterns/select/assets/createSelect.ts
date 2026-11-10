/**
 * 프레임워크 무관 셀렉트 배선 (의존성 0) — React가 아닌 프로젝트에서 Select.tsx가 하는 일을 대신한다.
 *
 * 마크업(트리거 버튼 + ul 패널 + li 옵션)은 호출하는 쪽이 그려 둔다. 이 함수는 역할·ARIA 속성을 붙이고
 * 키보드·포인터·바깥 누름을 잇는다. 어느 키가 하이라이트를 어디로 옮기는지는 selectCore의 순수 함수가 답한다.
 * 포커스는 늘 트리거에 있고, 활성 옵션은 aria-activedescendant로만 가리킨다(Select.tsx와 같은 방식).
 */
import { findTypeahead, initialHighlight, moveHighlight } from './selectCore'

type CreateSelectOptions = {
  /** .select 루트 — 안에 .select-trigger(button)·.select-panel(ul)·.select-option(li, data-value)가 있다 */
  root: HTMLElement
  /** 처음 선택된 값 — 없으면 null */
  value?: string | null
  /** 값이 없을 때 트리거의 .select-value에 보일 글자 */
  placeholder?: string
  /** 사용자가 옵션을 골랐을 때 — setValue로 바꾼 것은 알리지 않는다 */
  onChange?: (value: string) => void
}

/** 이어 친 글자를 한 낱말로 모으는 시간 — 이보다 쉬면 새 낱말로 본다 */
const TYPEAHEAD_RESET_MS = 500

/** 한 페이지에 셀렉트가 여럿일 때 id가 겹치지 않게 */
let serial = 0

export const createSelect = ({ root, value: initialValue = null, placeholder = '선택', onChange }: CreateSelectOptions) => {
  const trigger = root.querySelector<HTMLButtonElement>('.select-trigger')
  const panel = root.querySelector<HTMLElement>('.select-panel')
  if (!trigger || !panel) throw new Error('createSelect: root 안에 .select-trigger와 .select-panel이 있어야 한다')

  const valueText = trigger.querySelector<HTMLElement>('.select-value')
  /** 있으면 고른 값을 실어 폼과 함께 제출되게 한다 */
  const hiddenInput = root.querySelector<HTMLInputElement>('input[type="hidden"]')
  serial += 1
  const baseId = panel.id || `select-${serial}`

  let options: HTMLElement[] = []
  let value = initialValue
  let open = false
  let highlight = -1
  let query = ''
  let queryTimer: ReturnType<typeof setTimeout> | undefined
  let lastPointer: { x: number; y: number } | null = null
  let optionSerial = 0

  const isDisabled = (index: number) => options[index]?.getAttribute('aria-disabled') === 'true'
  const selectedIndex = () => options.findIndex((option) => option.dataset.value === value)
  const firstHighlight = () => initialHighlight({ selectedIndex: selectedIndex(), count: options.length, isDisabled })

  /** 상태(열림·하이라이트·값)를 속성으로 옮긴다 — CSS는 이 속성만 본다 */
  const render = () => {
    trigger.setAttribute('aria-expanded', String(open))
    panel.dataset.open = String(open)
    panel.setAttribute('aria-hidden', String(!open))

    const activeOption = open ? options[highlight] : undefined
    if (activeOption) trigger.setAttribute('aria-activedescendant', activeOption.id)
    else trigger.removeAttribute('aria-activedescendant')

    const selected = options[selectedIndex()]
    options.forEach((option, index) => {
      option.setAttribute('aria-selected', String(option === selected))
      option.dataset.highlighted = String(index === highlight)
    })
    if (valueText) {
      // 고른 값이 옵션에 없으면(옵션을 갈아 끼운 뒤 등) placeholder로 돌아간다
      valueText.textContent = selected ? (selected.textContent ?? '').trim() : placeholder
      valueText.classList.toggle('select-placeholder', !selected)
    }
    if (hiddenInput) hiddenInput.value = value ?? ''
    activeOption?.scrollIntoView?.({ block: 'nearest' })
  }

  const onOutsidePointerDown = (event: Event) => {
    if (!root.contains(event.target as Node)) setOpen(false)
  }

  const setOpen = (next: boolean) => {
    if (next === open) return
    open = next
    if (open) {
      highlight = firstHighlight()
      window.addEventListener('pointerdown', onOutsidePointerDown)
    } else {
      window.removeEventListener('pointerdown', onOutsidePointerDown)
    }
    render()
  }

  const commit = (index: number) => {
    const option = options[index]
    if (option && isDisabled(index)) return // 고를 수 없는 옵션 — 고르지도 닫지도 않는다
    const next = option?.dataset.value
    if (next !== undefined) value = next
    setOpen(false)
    render() // 이미 닫혀 있었어도 값 표시는 갱신한다
    // 옵션(li)은 포커스를 받지 못해, 마우스로 고르면 포커스가 문서로 빠진다 — 트리거로 돌려 키보드로 이어 쓸 수 있게 한다
    trigger.focus()
    if (next !== undefined) onChange?.(next)
  }

  /** 타이핑으로 찾기 — 이어 친 글자로 시작하는 옵션으로 하이라이트를 옮긴다. 닫혀 있으면 열면서 옮긴다 */
  const typeAhead = (char: string) => {
    clearTimeout(queryTimer)
    query += char
    queryTimer = setTimeout(() => {
      query = ''
    }, TYPEAHEAD_RESET_MS)

    const from = open ? highlight : selectedIndex()
    const found = findTypeahead({
      labels: options.map((option) => (option.textContent ?? '').trim()),
      query,
      from,
      isDisabled,
    })
    if (!open) setOpen(true)
    if (found !== -1) highlight = found
    render()
  }

  const onTriggerClick = () => {
    trigger.focus() // Safari는 버튼을 눌러도 포커스를 주지 않는다
    setOpen(!open)
  }

  const onTriggerKeyDown = (event: KeyboardEvent) => {
    // 글자 키 — Ctrl·Meta·Alt와 함께면 브라우저 단축키다. Space는 낱말을 치는 중일 때만 글자로 본다
    const isCharacter =
      event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && (event.key !== ' ' || query !== '')

    if (!open) {
      if (isCharacter) {
        event.preventDefault()
        typeAhead(event.key)
      } else if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault() // 버튼 기본 동작(click 발화)과 겹치지 않게
        setOpen(true)
      }
      return
    }
    if (event.key === 'Escape') {
      // 이 Escape는 패널을 닫는 데 썼다 — 바깥의 대화상자·시트가 같은 키로 함께 닫히지 않게 한다
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (event.key === 'Tab') {
      setOpen(false) // 포커스가 떠나는 키 — 닫되 이동은 막지 않는다
      return
    }
    if (isCharacter) {
      event.preventDefault()
      typeAhead(event.key)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      commit(highlight)
      return
    }
    const next = moveHighlight({ index: highlight, count: options.length, key: event.key, isDisabled })
    if (next !== highlight) {
      event.preventDefault() // 화살표의 페이지 스크롤을 막는다
      highlight = next
      render()
    }
  }

  const optionIndexOf = (event: Event) => {
    const option = (event.target as HTMLElement).closest<HTMLElement>('.select-option')
    return option ? options.indexOf(option) : -1
  }

  const onPanelClick = (event: Event) => {
    const index = optionIndexOf(event)
    if (index !== -1) commit(index)
  }

  /** 포인터가 실제로 움직였을 때만 하이라이트를 옮긴다 — 키보드로 목록이 스크롤돼 포인터 밑의 옵션이 바뀐 것은 무시한다 */
  const onPanelPointerMove = (event: PointerEvent) => {
    const last = lastPointer
    if (last && last.x === event.screenX && last.y === event.screenY) return
    lastPointer = { x: event.screenX, y: event.screenY }
    const index = optionIndexOf(event)
    if (!last || index === -1 || isDisabled(index) || index === highlight) return
    highlight = index
    render()
  }

  /** 옵션을 다시 읽어 역할·id를 붙인다 — 옵션 마크업을 갈아 끼운 뒤 부른다 */
  const refresh = () => {
    options = Array.from(panel.querySelectorAll<HTMLElement>('.select-option'))
    options.forEach((option) => {
      option.setAttribute('role', 'option')
      // 자리 번호가 아니라 일련번호를 쓴다 — 옵션을 사이에 끼워 넣어도 id가 겹치지 않는다
      if (!option.id) option.id = `${baseId}-option-${(optionSerial += 1)}`
    })
    if (highlight >= options.length) highlight = firstHighlight()
    render()
  }

  panel.id = baseId
  panel.setAttribute('role', 'listbox')
  trigger.setAttribute('role', 'combobox')
  trigger.setAttribute('aria-haspopup', 'listbox')
  trigger.setAttribute('aria-controls', baseId)
  trigger.addEventListener('click', onTriggerClick)
  trigger.addEventListener('keydown', onTriggerKeyDown)
  panel.addEventListener('click', onPanelClick)
  panel.addEventListener('pointermove', onPanelPointerMove)
  refresh()

  return {
    value: () => value,
    /** 밖에서 값을 바꾼다(폼 초기화 등) — onChange는 부르지 않는다 */
    setValue: (next: string | null) => {
      value = next
      render()
    },
    open: () => setOpen(true),
    close: () => setOpen(false),
    refresh,
    destroy: () => {
      clearTimeout(queryTimer)
      window.removeEventListener('pointerdown', onOutsidePointerDown)
      trigger.removeEventListener('click', onTriggerClick)
      trigger.removeEventListener('keydown', onTriggerKeyDown)
      panel.removeEventListener('click', onPanelClick)
      panel.removeEventListener('pointermove', onPanelPointerMove)
    },
  }
}
