import { useEffect, useRef, type ReactNode } from 'react'
import { createBackDismiss } from './createBackDismiss'
import './hamburger-menu.css'

type HamburgerButtonProps = {
  open: boolean
  onToggle: () => void
  /** 스크린 리더용 라벨 (기본 '메뉴 열기') */
  label?: string
  className?: string
}

/**
 * ≡ ↔ X 모핑 버튼 — 상태 표현은 aria-expanded 하나로 끝난다(CSS가 그 속성을 보고 모핑).
 * 시각 상태와 접근성 상태가 같은 속성이라 어긋날 수 없다.
 */
export const HamburgerButton = ({ open, onToggle, label = '메뉴 열기', className }: HamburgerButtonProps) => (
  <button
    type="button"
    className={className ? `hamburger ${className}` : 'hamburger'}
    aria-expanded={open}
    aria-label={label}
    onClick={onToggle}
  >
    <span className="hamburger-bar" aria-hidden="true" />
    <span className="hamburger-bar" aria-hidden="true" />
    <span className="hamburger-bar" aria-hidden="true" />
  </button>
)

type DrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 나오는 방향 (기본 left) */
  side?: 'left' | 'right'
  /** 스크린 리더가 읽을 드로어 이름 (예: "전체 메뉴"). 드로어 안에 제목이 보이면 labelledBy를 쓴다 */
  label?: string
  /** 드로어 안 제목 요소의 id — 보이는 제목이 곧 드로어 이름이 된다 */
  labelledBy?: string
  /** 화면 폭이 이 값(px) 이상이 되면 닫는다 — 햄버거 버튼이 사라지는 중단점을 적는다.
   *  열린 채 창을 넓히거나 태블릿을 가로로 돌렸을 때, 닫을 버튼 없이 뒤 화면이 잠긴 채 남지 않게 한다 */
  closeAboveWidth?: number
  /** 뒤로 가기(안드로이드 버튼·브라우저 뒤로)로 닫기 — 열려 있는 동안 history에 항목을 하나 쌓는다 (기본 false) */
  closeOnBack?: boolean
  className?: string
}

/** Tab이 멈추는 요소 — 드로어 안에서만 돌게 하려고 처음과 끝을 찾는 데 쓴다 */
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 사이드 드로어 — 백드롭 클릭·Esc(·뒤로 가기) 로 닫힌다.
 * 언마운트하지 않고 data-open으로 여닫아 닫힘 애니메이션을 CSS에 맡긴다.
 * 열리면 포커스를 드로어로 옮겨 그 안에 가두고, 닫히면 열었던 요소(햄버거 버튼)로 돌려보낸다.
 */
export const Drawer = ({
  open,
  onClose,
  children,
  side = 'left',
  label,
  labelledBy,
  closeAboveWidth,
  closeOnBack = false,
  className,
}: DrawerProps) => {
  const drawerRef = useRef<HTMLElement | null>(null)
  // 최신 콜백을 ref로 들고 있어 인라인 함수를 넘겨도 리스너가 재등록되지 않는다
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

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
      const drawer = drawerRef.current
      if (!open || !drawer) return
      const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      // 드로어 안의 요소가 이미 포커스를 가져갔으면(자식의 autoFocus) 건드리지 않는다.
      // 첫 링크가 아니라 드로어 자신에 준다 — 열자마자 Enter가 첫 링크를 실행하지 않게
      if (!drawer.contains(document.activeElement)) drawer.focus({ preventScroll: true })

      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' && event.key !== 'Tab') return
        const active = document.activeElement
        // 포커스가 드로어 밖의 다른 창(드로어 위에 뜬 모달 등)에 있으면 그 창의 몫이다 — Escape는 그 창만 닫고, Tab은 그 창이 가둔다
        if (active && active !== document.body && active !== opener && !drawer.contains(active)) return
        if (event.key === 'Escape') {
          // 안쪽의 검색 자동완성·메뉴가 이미 쓴 Escape다 — 같은 키로 드로어까지 닫지 않는다
          if (event.defaultPrevented) return
          onCloseRef.current()
          return
        }
        const stops = Array.from(drawer.querySelectorAll<HTMLElement>(TABBABLE))
        const first = stops[0]
        const last = stops[stops.length - 1]
        if (!first) {
          event.preventDefault()
          drawer.focus({ preventScroll: true })
        } else if (!drawer.contains(active)) {
          // 백드롭 옆으로 드러난 햄버거 버튼을 눌러 포커스가 밖에 있다 — 다음 Tab에 드로어로 들인다
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        } else if (event.shiftKey && (active === first || active === drawer)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
      window.addEventListener('keydown', handleKeydown)

      return () => {
        window.removeEventListener('keydown', handleKeydown)
        // 열었던 요소가 그사이 사라졌으면(넓은 화면에서 버튼이 숨겨짐) 돌려보낼 곳이 없다
        if (opener?.isConnected) opener.focus({ preventScroll: true })
      }
    },
    [open],
  )

  useEffect(
    function closeWhenViewportWidens() {
      if (!open || closeAboveWidth === undefined || typeof window.matchMedia !== 'function') return
      const query = window.matchMedia(`(min-width: ${closeAboveWidth}px)`)
      if (query.matches) {
        onCloseRef.current()
        return
      }
      const handleChange = (event: { matches: boolean }) => {
        if (event.matches) onCloseRef.current()
      }
      query.addEventListener('change', handleChange)
      return () => query.removeEventListener('change', handleChange)
    },
    [open, closeAboveWidth],
  )

  useEffect(
    function closeOnBackButton() {
      if (!open || !closeOnBack) return
      return createBackDismiss({ onDismiss: () => onCloseRef.current() })
    },
    [open, closeOnBack],
  )

  return (
    <>
      <div className="drawer-backdrop" data-open={open ? 'true' : 'false'} onClick={() => onCloseRef.current()} />
      <aside
        ref={drawerRef}
        className={className ? `drawer ${className}` : 'drawer'}
        data-open={open ? 'true' : 'false'}
        data-side={side}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-hidden={!open}
        // 드로어 자신이 포커스를 받는다(Tab 순서에는 들지 않는다)
        tabIndex={-1}
      >
        {children}
      </aside>
    </>
  )
}
