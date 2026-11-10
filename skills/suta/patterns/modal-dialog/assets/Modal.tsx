import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createBackDismiss } from './createBackDismiss'
import './modal-dialog.css'

type ModalProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 스크린 리더가 읽을 제목 요소의 id (내용 안 h2에 같은 id를 붙인다) */
  labelledBy?: string
  /** 백드롭 클릭으로 닫기 허용 (기본 true — 파괴적 확인 모달이면 false) */
  dismissOnBackdrop?: boolean
  /** 뒤로 가기(안드로이드 버튼·브라우저 뒤로)로 닫기 — 열려 있는 동안 history에 항목을 하나 쌓는다 (기본 false) */
  closeOnBack?: boolean
  className?: string
}

/** 닫힘 애니메이션이 끝나지 않는 환경(animation 미지원·jsdom)을 위한 상한 */
const CLOSE_FALLBACK_MS = 500

/**
 * 네이티브 <dialog>.showModal() 기반 모달 — 포커스 트랩·배경 inert·Esc·포커스 복귀는 브라우저가 담당한다.
 * 이 컴포넌트가 더하는 것은 딱 하나: dialog.close()가 즉시 사라지는 문제를 data-closing 애니메이션 뒤로 미루는 것.
 * open 상태는 부모가 소유한다 — Esc·백드롭은 onClose를 부를 뿐 스스로 닫지 않는다.
 * 브라우저가 스스로 닫아 버린 경우에도 onClose로 알리고, 부모가 open을 그대로 두면 다시 연다.
 */
export const Modal = ({
  open,
  onClose,
  children,
  labelledBy,
  dismissOnBackdrop = true,
  closeOnBack = false,
  className,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const openRef = useRef(open)
  openRef.current = open
  // 브라우저가 스스로 닫을 때마다 올린다 — open prop이 그대로여도 아래 동기화가 다시 돌게 한다
  const [nativeCloses, setNativeCloses] = useState(0)

  useEffect(
    function syncOpenState() {
      const dialog = dialogRef.current
      if (!dialog) return

      if (open) {
        dialog.removeAttribute('data-closing')
        if (!dialog.open) dialog.showModal()
        return
      }
      if (!dialog.open) return

      // 닫힘: 애니메이션을 먼저 재생하고, 끝난 뒤에 실제로 닫는다
      let done = false
      const finish = () => {
        if (done) return
        done = true
        dialog.removeAttribute('data-closing')
        dialog.close()
      }
      dialog.setAttribute('data-closing', '')
      dialog.addEventListener('animationend', finish, { once: true })
      const timer = window.setTimeout(finish, CLOSE_FALLBACK_MS)
      return () => {
        dialog.removeEventListener('animationend', finish)
        window.clearTimeout(timer)
        // 닫히는 도중 다시 열리면 즉시 정리한다 — data-closing이 남으면 열림 애니메이션과 충돌
        if (!done) dialog.removeAttribute('data-closing')
      }
    },
    [open, nativeCloses],
  )

  useEffect(
    function closeOnBackButton() {
      if (!open || !closeOnBack) return
      return createBackDismiss({ onDismiss: () => onCloseRef.current() })
    },
    [open, closeOnBack],
  )

  useEffect(function routeNativeCloseToParent() {
    const dialog = dialogRef.current
    if (!dialog) return
    // Esc — 브라우저가 즉시 close()하려는 것을 막고 부모에게 닫기를 요청한다(애니메이션 경유)
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onCloseRef.current()
    }
    // 브라우저가 우리를 거치지 않고 닫은 경우 — 사용자 조작 없이 이어진 두 번째 Esc(크롬은 cancel을 막지 못하게 한다),
    // 안쪽의 <form method="dialog">. open prop은 아직 true인데 창은 닫혀 있다.
    // 부모에게 알리고, 부모가 open을 그대로 두면(닫기 거부) 위의 동기화가 다시 연다
    const handleClose = () => {
      if (!openRef.current || dialog.open) return // 우리가 닫은 것이거나, 그사이 다시 열렸다
      onCloseRef.current()
      setNativeCloses((count) => count + 1)
    }
    dialog.addEventListener('cancel', handleCancel)
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      dialog.removeEventListener('close', handleClose)
    }
  }, [])

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    // 패널 안쪽 클릭은 자식 요소가 target이고, ::backdrop 클릭만 dialog 자신이 target이다
    if (dismissOnBackdrop && event.target === event.currentTarget) onCloseRef.current()
  }

  return (
    <dialog
      ref={dialogRef}
      className={className ? `modal ${className}` : 'modal'}
      aria-labelledby={labelledBy}
      onClick={handleBackdropClick}
    >
      <div className="modal-body">{children}</div>
    </dialog>
  )
}
