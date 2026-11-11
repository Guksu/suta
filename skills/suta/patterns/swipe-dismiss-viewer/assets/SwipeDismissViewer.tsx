import { useEffect, useRef, type RefObject } from 'react'
import { createSwipeDismiss } from './createSwipeDismiss'
import './swipe-dismiss-viewer.css'

type SwipeDismissViewerProps = {
  src: string
  alt: string
  /** 열 때 출발하고 닫을 때 돌아갈 썸네일 */
  returnTo?: RefObject<HTMLElement | null>
  /** 복귀 애니메이션이 끝난 뒤 — 여기서 뷰어를 언마운트한다 */
  onClose: () => void
  /** 닫기 버튼의 이름 — 기본 '닫기' */
  closeLabel?: string
  className?: string
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * createSwipeDismiss의 React 래퍼 — 마운트되면 썸네일에서 열리고, 끌어내리거나 Esc·닫기 버튼으로 닫힌다.
 * open 상태는 부모가 소유한다: 열려면 마운트, onClose가 오면 언마운트.
 */
export const SwipeDismissViewer = ({ src, alt, returnTo, onClose, closeLabel = '닫기', className }: SwipeDismissViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const controllerRef = useRef<ReturnType<typeof createSwipeDismiss> | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(
    function bindViewer() {
      const viewer = viewerRef.current
      const image = imageRef.current
      if (!viewer || !image) return
      const controller = createSwipeDismiss({
        viewer,
        image,
        returnTo: () => returnTo?.current ?? null,
        onDismiss: () => onCloseRef.current(),
        spring: prefersReducedMotion() ? { stiffness: 600, damping: 50 } : undefined,
      })
      controllerRef.current = controller
      controller.open()

      // 열리면 포커스를 뷰어 안(닫기 버튼)으로 옮기고, 닫히면 열었던 요소로 돌려보낸다
      const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      closeRef.current?.focus({ preventScroll: true })

      const onKeydown = (event: KeyboardEvent) => {
        // 안쪽 요소가 이미 쓴 Esc(defaultPrevented)로는 닫지 않는다
        if (event.key === 'Escape' && !event.defaultPrevented) controller.close()
      }
      // 뒤 화면이 휠로 굴러가면 돌아갈 썸네일 자리가 달라진다 — 뷰어 위의 휠은 막는다
      const blockWheel = (event: WheelEvent) => event.preventDefault()
      window.addEventListener('keydown', onKeydown)
      viewer.addEventListener('wheel', blockWheel, { passive: false })
      return () => {
        window.removeEventListener('keydown', onKeydown)
        viewer.removeEventListener('wheel', blockWheel)
        controller.destroy()
        if (opener?.isConnected) opener.focus({ preventScroll: true })
      }
    },
    // returnTo는 ref 객체라 안정적이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div
      ref={viewerRef}
      className={className ? `viewer ${className}` : 'viewer'}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onKeyDown={(event) => {
        // 뷰어 안에서 포커스를 받는 것은 닫기 버튼 하나다 — Tab이 뒤 화면으로 나가지 않게 붙잡는다
        if (event.key !== 'Tab') return
        event.preventDefault()
        closeRef.current?.focus()
      }}
    >
      <div className="viewer-backdrop" />
      <img ref={imageRef} src={src} alt={alt} className="viewer-image" draggable={false} />
      <button ref={closeRef} type="button" className="viewer-chrome viewer-close" aria-label={closeLabel} onClick={() => controllerRef.current?.close()}>
        ✕
      </button>
    </div>
  )
}
