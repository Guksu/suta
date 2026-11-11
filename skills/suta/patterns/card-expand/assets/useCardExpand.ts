import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { createBackDismiss } from './createBackDismiss'
import { runCardExpand, type CardExpandNames } from './runCardExpand'
import './card-expand.css'

type ElementRef<T extends HTMLElement> = { current: T | null }

type UseCardExpandOptions = {
  /** 목록과 상세를 함께 담는 컨테이너(.card-expand-container) — 닫을 때 돌아갈 카드를 여기서 찾는다 */
  containerRef: ElementRef<HTMLElement>
  /** 상세 화면의 루트(.card-expand-detail) — 열 때의 도착점, 닫을 때의 출발점 */
  detailRef: ElementRef<HTMLElement>
  names?: CardExpandNames
  /** true면 열려 있는 동안 뒤로 가기가 페이지를 떠나지 않고 상세를 닫는다 (기본 false) */
  closeOnBack?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 포커스를 받을 수 없는 요소(컨테이너·상세 루트)로 옮길 때 — tabindex="-1"을 붙여 코드로만 받게 한다 */
const focusElement = (element: HTMLElement | null) => {
  if (!element) return
  if (!element.matches(FOCUSABLE) && !element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1')
  element.focus({ preventScroll: true })
}

/**
 * 카드 확장 상태 훅 — expand로 열고 collapse로 닫는다.
 *
 * 컨테이너 안의 카드에는 `data-card-id`, 상세 루트에는 detailRef를 달아 두면 된다.
 * 열림/닫힘의 DOM 교체는 flushSync로 **동기적으로** 일어난다 — View Transitions가 "바뀐 뒤" 사진을
 * 찍을 때 실제로 바뀌어 있어야 하기 때문이다. 포커스(열리면 닫기 버튼, 닫히면 눌렀던 카드, Tab은 상세 안에서 돈다)와
 * Esc·뒤로 가기로 닫는 처리까지 포함한다(목록을 inert로 막는 것은 화면 쪽에서 `inert={expandedId !== null}`로).
 */
export const useCardExpand = ({ containerRef, detailRef, names, closeOnBack = false }: UseCardExpandOptions) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // 비동기 함수와 키 처리기는 렌더를 기다리지 않고 최신 값을 봐야 한다
  const expandedRef = useRef<string | null>(null)
  // 전환이 도는 동안 겹쳐 들어온 요청은 새 전환을 시작하지 않는다 — 시작하면 진행 중이던 것이 건너뛰어져 화면이 툭 끊긴다
  const busy = useRef(false)
  // 여는 전환 중에 들어온 닫기(Esc·뒤로 가기)는 버리지 않고 전환이 끝난 뒤에 한다 —
  // 버리면 뒤로 가기는 이미 history 항목을 걷었는데 상세만 남는다
  const pendingCollapse = useRef(false)

  const findCard = (id: string) =>
    containerRef.current?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`) ?? null

  const expand = async ({ id, card }: { id: string; card: HTMLElement | null }) => {
    if (busy.current || expandedRef.current === id) return
    busy.current = true
    try {
      await runCardExpand({
        direction: 'open',
        from: card ?? findCard(id),
        update: () => {
          expandedRef.current = id
          flushSync(() => setExpandedId(id))
          // 목록은 inert가 되어 누른 카드가 포커스를 잃는다 — 상세의 닫기 버튼(없으면 상세 루트)으로 옮긴다
          const detail = detailRef.current
          focusElement(detail?.querySelector<HTMLElement>('.card-expand-close') ?? detail)
        },
        to: () => detailRef.current,
        names,
      })
    } finally {
      busy.current = false
      if (pendingCollapse.current) {
        pendingCollapse.current = false
        void collapse()
      }
    }
  }

  const collapse = async () => {
    const id = expandedRef.current
    if (id === null) return
    if (busy.current) {
      pendingCollapse.current = true
      return
    }
    busy.current = true
    try {
      await runCardExpand({
        direction: 'close',
        from: detailRef.current,
        update: () => {
          expandedRef.current = null
          flushSync(() => setExpandedId(null))
        },
        // 새 사진을 찍는 시점에 목록의 그 카드가 이름을 가져야 "그 자리로 돌아간다"
        to: () => findCard(id),
        names,
      })
    } finally {
      busy.current = false
      pendingCollapse.current = false
      // 키보드 사용자는 눌렀던 카드로 돌아와야 한다. 스크롤은 건드리지 않는다 — 카드는 이미 보이는 자리다.
      // 그 사이 목록이 갱신되어 카드가 없으면 컨테이너로 — body로 떨어지면 Tab이 문서 처음부터 다시 시작한다
      focusElement(findCard(id) ?? containerRef.current)
    }
  }

  const collapseRef = useRef(collapse)
  collapseRef.current = collapse

  useEffect(
    function handleKeysWhileOpen() {
      if (expandedId === null) return
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          void collapseRef.current()
          return
        }
        if (event.key !== 'Tab') return
        // 상세는 aria-modal이다 — Tab이 컨테이너 밖(헤더·탭 바)으로 나가지 않고 상세 안에서 돈다
        const detail = detailRef.current
        if (!detail) return
        const items = Array.from(detail.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) {
          event.preventDefault()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        const outside = !(active instanceof Node) || !detail.contains(active) || active === detail
        if (event.shiftKey && (active === first || outside)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (active === last || outside)) {
          event.preventDefault()
          first.focus()
        }
      }
      window.addEventListener('keydown', handleKeydown)
      return () => window.removeEventListener('keydown', handleKeydown)
    },
    [expandedId, detailRef],
  )

  useEffect(
    function closeOnBackButton() {
      if (expandedId === null || !closeOnBack) return
      return createBackDismiss({ onDismiss: () => void collapseRef.current() })
    },
    [expandedId, closeOnBack],
  )

  return { expandedId, expand, collapse }
}
