import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createSuggestSearch, type SuggestStatus } from './createSuggestSearch'
import './search-suggest.css'

type UseSearchSuggestOptions<T> = {
  fetchSuggestions: (args: { query: string; signal: AbortSignal }) => Promise<T[]>
  /** 제안 하나를 골랐을 때 */
  onSelect: (item: T) => void
  /** 입력창에 채울 문자열 — 목록을 고르면 이 값이 들어간다 */
  toText: (item: T) => string
  debounceMs?: number
  minLength?: number
  /** 응답을 이만큼 기다린 뒤에야 "찾는 중"을 띄운다 (ms, 기본 200). 그 안에 오면 아무것도 띄우지 않는다 */
  loadingDelayMs?: number
}

/**
 * createSuggestSearch 코어의 React 래퍼 + 콤보박스 조작.
 *
 * 코어가 "언제 부를지"를 담당하고, 이 훅은 "어떻게 고를지"(키보드·포커스·ARIA)를 담당한다.
 * 화면에 붙이는 속성은 직접 쓰지 말고 inputProps·listProps·getOptionProps를 펼친다 —
 * 콤보박스는 속성 하나만 빠져도 스크린 리더에서 그냥 입력창으로 읽힌다.
 */
export const useSearchSuggest = <T,>({
  fetchSuggestions,
  onSelect,
  toText,
  debounceMs,
  minLength,
  loadingDelayMs = 200,
}: UseSearchSuggestOptions<T>) => {
  const listId = useId()
  const [query, setQueryState] = useState('')
  const [items, setItems] = useState<T[]>([])
  const [status, setStatus] = useState<SuggestStatus>('idle')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // 마지막으로 끝난 요청의 결과 — 다음 응답을 기다리는 동안에도 "결과 없음"을 유지할지 정한다
  const [settled, setSettled] = useState<SuggestStatus>('idle')
  // loading이 loadingDelayMs를 넘겼는가 — 금방 오는 응답에 "찾는 중"이 깜빡이지 않게 한다
  const [slow, setSlow] = useState(false)
  // 방향키로 옮겼을 때만 활성 항목을 스크롤해 보인다 (마우스로 가리킬 때 스크롤하면 목록이 포인터 밑에서 달아난다)
  const scrollActiveRef = useRef(false)

  const controllerRef = useRef<ReturnType<typeof createSuggestSearch<T>> | null>(null)
  const fetchRef = useRef(fetchSuggestions)
  fetchRef.current = fetchSuggestions

  useEffect(
    function createController() {
      const controller = createSuggestSearch<T>({
        fetchSuggestions: (args) => fetchRef.current(args),
        debounceMs,
        minLength,
        onStateChange: (next) => {
          setItems(next.items)
          setStatus(next.status)
          if (next.status !== 'loading') setSettled(next.status)
        },
      })
      controllerRef.current = controller
      return () => {
        controller.destroy()
        controllerRef.current = null
      }
    },
    [debounceMs, minLength],
  )

  useEffect(
    function revealLoadingWhenSlow() {
      if (status !== 'loading') {
        setSlow(false)
        return
      }
      const timer = setTimeout(() => setSlow(true), loadingDelayMs)
      return () => clearTimeout(timer)
    },
    [status, loadingDelayMs],
  )

  useEffect(
    function scrollActiveOptionIntoView() {
      if (!scrollActiveRef.current) return
      scrollActiveRef.current = false
      if (activeIndex < 0) return
      // aria-activedescendant는 포커스를 옮기지 않으므로 브라우저가 대신 스크롤해 주지 않는다
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' })
    },
    [activeIndex, listId],
  )

  // 목록이 비어 있을 때만 "찾는 중"을 띄운다 — 앞선 목록 위에 끼워 넣으면 응답마다 줄이 밀렸다 돌아온다
  const showLoading = status === 'loading' && slow && items.length === 0
  const isOpen = open && (items.length > 0 || showLoading || status === 'error')
  // 결과 0개 — listbox에는 option만 들어가므로 목록(isOpen)과 따로 알린다. 다음 응답을 기다리는 동안에도 유지한다
  const isEmpty = open && items.length === 0 && settled === 'ready' && (status === 'ready' || (status === 'loading' && !slow))

  const close = () => {
    setOpen(false)
    setActiveIndex(-1)
    controllerRef.current?.cancel()
  }

  const setQuery = (next: string) => {
    setQueryState(next)
    setActiveIndex(-1) // 글자가 바뀌면 이전 선택은 의미가 없다
    setOpen(true)
    controllerRef.current?.setQuery(next)
  }

  const choose = (index: number) => {
    const item = items[index]
    if (!item) return
    setQueryState(toText(item))
    close()
    onSelect(item)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글·일본어 조합 중의 키는 입력기가 쓴다. 조합이 끝나며 같은 키가 한 번 더 오므로
    // 여기서 처리하면 방향키는 두 칸을 가고 Enter는 두 번 고른다 (사파리는 keyCode 229로만 알린다)
    if (event.nativeEvent.isComposing || event.keyCode === 229) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault() // 커서가 글자 끝으로 튀지 않게
      if (items.length === 0) return
      setOpen(true)
      scrollActiveRef.current = true
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((prev) => {
        // 아직 아무것도 안 골랐으면 아래는 첫 항목, 위는 마지막 항목으로 들어간다
        if (prev === -1) return step === 1 ? 0 : items.length - 1
        // 끝에서는 반대편으로 감는다 — 목록이 짧을수록 되돌아가는 조작이 잦다
        return (prev + step + items.length) % items.length
      })
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      choose(activeIndex)
      return
    }

    if (event.key === 'Escape') {
      // 닫을 것이 보일 때만 Esc를 가져간다 — 바깥 모달·시트가 같은 Esc에 함께 닫히지 않고,
      // type="search"의 "Esc로 지우기"도 다음 Esc로 밀린다
      if (isOpen || isEmpty) event.preventDefault()
      close()
    }
  }

  return {
    query,
    items,
    status,
    activeIndex,
    isOpen,
    /** 응답이 loadingDelayMs보다 늦고 보여 줄 목록이 없다 — "찾는 중"을 그린다 */
    showLoading,
    /** 결과가 0개다 — 목록 밖 role="status" 영역에 "검색 결과 없음"을 그린다 */
    isEmpty,
    close,
    /** 입력창에 펼친다 */
    inputProps: {
      role: 'combobox' as const,
      type: 'search' as const,
      value: query,
      'aria-expanded': isOpen,
      'aria-controls': listId,
      'aria-autocomplete': 'list' as const,
      'aria-activedescendant': activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined,
      autoComplete: 'off',
      onChange: (event: { target: { value: string } }) => setQuery(event.target.value),
      onKeyDown,
      onFocus: () => {
        if (items.length > 0) setOpen(true)
      },
      onBlur: close,
    },
    /** 제안 목록(ul)에 펼친다 */
    listProps: {
      id: listId,
      role: 'listbox' as const,
      'aria-busy': status === 'loading',
      // 목록의 빈 곳이나 스크롤바를 눌러도 입력창이 포커스를 잃지 않게 — blur가 목록을 닫는다
      onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
    },
    /** 제안 항목(li)마다 펼친다 */
    getOptionProps: (index: number) => ({
      id: `${listId}-${index}`,
      role: 'option' as const,
      'aria-selected': index === activeIndex,
      'data-active': index === activeIndex ? 'true' : 'false',
      // blur가 먼저 일어나 목록이 닫히면 click이 오지 않는다 — 눌리는 순간 고른다
      onMouseDown: (event: { preventDefault: () => void }) => {
        event.preventDefault()
        choose(index)
      },
      onMouseEnter: () => setActiveIndex(index),
    }),
  }
}
