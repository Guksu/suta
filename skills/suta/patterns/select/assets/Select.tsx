import { useEffect, useId, useRef, useState } from 'react'
import { findTypeahead, initialHighlight, moveHighlight } from './selectCore'
import './select.css'

export type SelectOption = {
  value: string
  label: string
  /** 고를 수 없는 옵션(품절 등) — 보이지만 키보드가 건너뛰고 눌러도 고르지 않는다 */
  disabled?: boolean
}

type SelectProps = {
  options: SelectOption[]
  /** 선택된 값 — 없으면 null (placeholder 표시) */
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  /** 콤보박스의 이름(예: "면 종류"). 콤보박스는 안의 글자를 이름으로 쓰지 않는다 — 없으면 placeholder가 이름이 된다 */
  label?: string
  /** 화면에 보이는 라벨 요소의 id — 있으면 label보다 먼저 쓴다 */
  labelledBy?: string
  className?: string
  disabled?: boolean
  /** 오류 표시 — aria-invalid가 켜지고 테두리가 오류 색이 된다. 문구는 밖에서 둔다 */
  invalid?: boolean
  required?: boolean
  /** 폼 제출에 실을 이름 — 주면 숨은 input이 값을 들고 있다 */
  name?: string
}

/** 이어 친 글자를 한 낱말로 모으는 시간 — 이보다 쉬면 새 낱말로 본다 */
const TYPEAHEAD_RESET_MS = 500

/**
 * WAI-ARIA "select-only combobox" 패턴 — 포커스는 항상 트리거 버튼에 있고,
 * 활성 옵션은 aria-activedescendant로만 가리킨다(옵션으로 포커스를 옮기지 않는다).
 * 키보드 판정은 selectCore.ts의 순수 함수가 담당한다.
 */
export const Select = ({
  options,
  value,
  onChange,
  placeholder = '선택',
  label,
  labelledBy,
  className,
  disabled = false,
  invalid = false,
  required = false,
  name,
}: SelectProps) => {
  const [openState, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const typeahead = useRef<{ query: string; timer: ReturnType<typeof setTimeout> | undefined }>({ query: '', timer: undefined })
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const baseId = useId()
  const optionId = (index: number) => `${baseId}-option-${index}`

  const open = openState && !disabled // 열린 채 disabled가 되면 닫힌 것으로 그린다
  const isDisabled = (index: number) => Boolean(options[index]?.disabled)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = options[selectedIndex] ?? null
  const firstHighlight = () => initialHighlight({ selectedIndex, count: options.length, isDisabled })

  const openPanel = () => {
    setHighlight(firstHighlight())
    setOpen(true)
  }

  const commit = (index: number) => {
    const option = options[index]
    if (option?.disabled) return // 고를 수 없는 옵션 — 고르지도 닫지도 않는다
    if (option) onChange(option.value)
    setOpen(false)
    // 옵션(li)은 포커스를 받지 못해, 마우스로 고르면 포커스가 문서로 빠진다 — 트리거로 돌려 키보드로 이어 쓸 수 있게 한다
    triggerRef.current?.focus()
  }

  /** 타이핑으로 찾기 — 이어 친 글자로 시작하는 옵션으로 하이라이트를 옮긴다. 닫혀 있으면 열면서 옮긴다 */
  const typeAhead = (char: string) => {
    const state = typeahead.current
    clearTimeout(state.timer)
    state.query += char
    state.timer = setTimeout(() => {
      state.query = ''
    }, TYPEAHEAD_RESET_MS)

    const from = open ? highlight : selectedIndex
    const found = findTypeahead({ labels: options.map((option) => option.label), query: state.query, from, isDisabled })
    if (!open) {
      setHighlight(found === -1 ? firstHighlight() : found)
      setOpen(true)
    } else if (found !== -1) {
      setHighlight(found)
    }
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    // 글자 키 — Ctrl·Meta·Alt와 함께면 브라우저 단축키다. Space는 낱말을 치는 중일 때만 글자로 본다.
    // 한글 입력기가 조합 중일 때는 key가 글자가 아니라("Process") 여기에 걸리지 않는다
    const isCharacter =
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      (event.key !== ' ' || typeahead.current.query !== '')

    if (!open) {
      if (isCharacter) {
        event.preventDefault()
        typeAhead(event.key)
      } else if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault() // 버튼 기본 동작(click 발화)과 겹치지 않게
        openPanel()
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
      setHighlight(next)
    }
  }

  /**
   * 포인터가 실제로 움직였을 때만 하이라이트를 옮긴다. 키보드로 목록이 스크롤되면 브라우저는 포인터가 가만히 있어도
   * 그 밑에 새로 온 옵션에 포인터 이벤트를 보낸다 — 그대로 받으면 하이라이트가 포인터 밑으로 되돌아간다.
   * 처음 받은 이벤트는 위치만 기억한다(열리자마자 포인터 밑의 옵션으로 튀지 않게).
   */
  const handleOptionPointerMove = ({ event, index }: { event: React.PointerEvent; index: number }) => {
    const last = lastPointer.current
    if (last && last.x === event.screenX && last.y === event.screenY) return
    lastPointer.current = { x: event.screenX, y: event.screenY }
    if (!last || isDisabled(index) || index === highlight) return
    setHighlight(index)
  }

  useEffect(
    function closeOnOutsidePointer() {
      if (!open) return
      const handlePointerDown = (event: PointerEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
      }
      window.addEventListener('pointerdown', handlePointerDown)
      return () => window.removeEventListener('pointerdown', handlePointerDown)
    },
    [open],
  )

  useEffect(
    function scrollHighlightIntoView() {
      if (!open || highlight < 0) return
      document.getElementById(optionId(highlight))?.scrollIntoView?.({ block: 'nearest' })
    },
    [open, highlight],
  )

  useEffect(function clearTypeaheadTimerOnUnmount() {
    const state = typeahead.current
    return () => clearTimeout(state.timer)
  }, [])

  return (
    <div ref={rootRef} className={className ? `select ${className}` : 'select'}>
      <button
        ref={triggerRef}
        type="button"
        className="select-trigger"
        role="combobox"
        disabled={disabled}
        aria-label={labelledBy ? undefined : (label ?? placeholder)}
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-listbox`}
        aria-activedescendant={open && highlight >= 0 ? optionId(highlight) : undefined}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        onClick={(event) => {
          event.currentTarget.focus() // Safari는 버튼을 눌러도 포커스를 주지 않는다 — 키보드로 이어 쓰려면 포커스가 여기 있어야 한다
          if (open) setOpen(false)
          else openPanel()
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {selected ? (
          <span className="select-value">{selected.label}</span>
        ) : (
          <span className="select-value select-placeholder">{placeholder}</span>
        )}
        <svg className="select-chevron" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
      <ul
        id={`${baseId}-listbox`}
        className="select-panel"
        role="listbox"
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
      >
        {options.map((option, index) => (
          <li
            key={option.value}
            id={optionId(index)}
            role="option"
            className="select-option"
            aria-selected={option.value === value}
            aria-disabled={option.disabled || undefined}
            data-highlighted={index === highlight ? 'true' : 'false'}
            onPointerMove={(event) => handleOptionPointerMove({ event, index })}
            onClick={() => commit(index)}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
