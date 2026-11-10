import { useEffect, useRef, type ReactNode } from 'react'
import { createBackDismiss } from './createBackDismiss'
import { createSheetDrag } from './createSheetDrag'
import './bottom-sheet.css'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 스크린 리더가 읽을 시트 이름 (예: "주문 옵션"). 시트 안에 제목이 보이면 labelledBy를 쓴다 */
  label?: string
  /** 시트 안 제목 요소의 id — 보이는 제목이 곧 시트 이름이 된다 */
  labelledBy?: string
  /** 이만큼 끌어내리면 닫힘 (기본 120px) */
  dismissThresholdPx?: number
  /** 스냅 위치들(px, 0=전체 열림). 지정하면 마지막 스냅(가장 낮게 열림)에서 시작하고,
   *  드래그로 스냅 사이를 오가며, 마지막 스냅 아래로 끌면 닫힌다. 0을 포함하라 */
  snapOffsetsPx?: number[]
  /** 뒤로 가기(안드로이드 버튼·브라우저 뒤로)로 닫기 — 열려 있는 동안 history에 항목을 하나 쌓는다 (기본 false) */
  closeOnBack?: boolean
  className?: string
}

/** Tab이 멈추는 요소 — 시트 안에서만 돌게 하려고 처음과 끝을 찾는 데 쓴다 */
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 지금 열려 있는 시트들(열린 순서). Escape·Tab은 맨 위 시트만 받는다 */
const openSheets: HTMLElement[] = []

/**
 * createSheetDrag 코어의 React 래퍼 — 백드롭·Esc·드래그(·뒤로 가기) 로 닫힌다.
 * 시트는 언마운트하지 않고 data-open으로 여닫아 닫힘 애니메이션을 CSS에 맡긴다.
 * 열리면 포커스를 시트로 옮겨 그 안에 가두고, 닫히면 열었던 요소로 돌려보낸다.
 */
export const BottomSheet = ({
  open,
  onClose,
  children,
  label,
  labelledBy,
  dismissThresholdPx,
  snapOffsetsPx,
  closeOnBack = false,
  className,
}: BottomSheetProps) => {
  const sheetRef = useRef<HTMLElement | null>(null)
  // 최신 콜백을 ref로 들고 있어 인라인 함수를 넘겨도 리스너가 재등록되지 않는다
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  // 스냅 배열은 내용으로 비교한다 — [0, 260]처럼 인라인으로 넘기면 렌더마다 새 배열이라,
  // 배열 자체를 의존성으로 쓰면 다시 그려질 때마다 드래그가 다시 붙고 시트가 처음 스냅으로 되돌아간다
  const snapsRef = useRef(snapOffsetsPx)
  snapsRef.current = snapOffsetsPx
  const snapKey = snapOffsetsPx?.join(',') ?? ''

  useEffect(
    function lockBodyScroll() {
      if (!open) return
      const { body, documentElement: root } = document
      const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
      const widthBefore = root.clientWidth
      body.style.overflow = 'hidden'
      // 스크롤바가 사라지며 넓어진 만큼 채운다 — 없으면 뒤 화면이 스크롤바 폭만큼 옆으로 흔들린다.
      // 잠근 뒤에 재므로 스크롤바가 자리를 차지하지 않는 환경(모바일·scrollbar-gutter: stable)에서는 0이다
      const widened = root.clientWidth - widthBefore
      if (widened > 0) body.style.paddingRight = `${(parseFloat(getComputedStyle(body).paddingRight) || 0) + widened}px`
      return () => {
        body.style.overflow = previous.overflow
        body.style.paddingRight = previous.paddingRight
      }
    },
    [open],
  )

  useEffect(
    function holdFocusWhileOpen() {
      const sheet = sheetRef.current
      if (!open || !sheet) return
      const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      openSheets.push(sheet)
      // 시트 안의 요소가 이미 포커스를 가져갔으면(자식의 autoFocus) 건드리지 않는다
      if (!sheet.contains(document.activeElement)) sheet.focus({ preventScroll: true })

      const isTop = () => openSheets[openSheets.length - 1] === sheet
      const handleKeydown = (event: KeyboardEvent) => {
        if (!isTop()) return
        if (event.key === 'Escape') {
          // 안쪽의 메뉴·툴팁·자동완성이 이미 쓴 Escape다 — 같은 키로 시트까지 닫지 않는다
          if (event.defaultPrevented) return
          onCloseRef.current()
          return
        }
        if (event.key !== 'Tab') return
        const active = document.activeElement
        // 포커스가 시트 밖의 다른 창(시트 위에 뜬 모달 등)에 있으면 그 창의 몫이다
        if (active && active !== document.body && !sheet.contains(active)) return
        const stops = Array.from(sheet.querySelectorAll<HTMLElement>(TABBABLE))
        const first = stops[0]
        const last = stops[stops.length - 1]
        if (!first) {
          event.preventDefault()
          sheet.focus({ preventScroll: true })
        } else if (event.shiftKey && (active === first || active === sheet || active === document.body)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (active === last || active === document.body)) {
          event.preventDefault()
          first.focus()
        }
      }
      document.addEventListener('keydown', handleKeydown)

      return () => {
        document.removeEventListener('keydown', handleKeydown)
        const index = openSheets.indexOf(sheet)
        if (index !== -1) openSheets.splice(index, 1)
        // 열었던 요소가 그사이 사라졌으면(삭제된 행 등) 돌려보낼 곳이 없다 — 그때는 화면을 바꾸는 쪽에서 포커스를 정한다
        if (opener?.isConnected) opener.focus({ preventScroll: true })
      }
    },
    [open],
  )

  useEffect(
    function closeOnBackButton() {
      if (!open || !closeOnBack) return
      return createBackDismiss({ onDismiss: () => onCloseRef.current() })
    },
    [open, closeOnBack],
  )

  useEffect(
    function attachDragToDismiss() {
      const sheet = sheetRef.current
      if (!sheet) return
      return createSheetDrag({
        sheet,
        onDismiss: () => onCloseRef.current(),
        dismissThresholdPx,
        snapOffsetsPx: snapsRef.current,
      })
    },
    [dismissThresholdPx, snapKey],
  )

  useEffect(
    function openAtInitialSnap() {
      const sheet = sheetRef.current
      const snaps = snapsRef.current
      if (!sheet || !snaps?.length) return
      if (!open) {
        sheet.style.transform = '' // 인라인을 걷어야 CSS의 translateY(100%)로 닫힌다
        return
      }
      // 마지막(가장 낮게 열리는) 스냅에서 시작. rAF 없이 즉시 설정해도
      // data-open 전환과 같은 커밋이라 닫힘 위치(100%)에서 스냅 위치로 transition된다
      sheet.style.transform = `translateY(${Math.max(...snaps)}px)`
    },
    [open, snapKey],
  )

  return (
    <>
      <div className="sheet-backdrop" data-open={open ? 'true' : 'false'} onClick={() => onCloseRef.current()} />
      <section
        ref={sheetRef}
        className={className ? `bottom-sheet ${className}` : 'bottom-sheet'}
        data-open={open ? 'true' : 'false'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-hidden={!open}
        // 시트 자신이 포커스를 받는다(Tab 순서에는 들지 않는다) — 열리자마자 첫 버튼에 포커스를 주면 실수로 실행된다
        tabIndex={-1}
      >
        <div className="sheet-handle" aria-hidden="true" />
        {children}
      </section>
    </>
  )
}
