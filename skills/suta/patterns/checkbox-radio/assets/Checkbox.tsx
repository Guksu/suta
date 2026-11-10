import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import './checkbox-radio.css'

type CheckboxProps = {
  label?: ReactNode
  className?: string
  /** 부분 선택 — "전체 동의"에서 아래 항목을 일부만 고른 상태. 체크 표시 대신 가로줄이 보이고 "일부 선택됨"으로 읽힌다 */
  indeterminate?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

/**
 * 네이티브 체크박스를 숨기고 박스+SVG 체크마크를 그린다 — 포커스·Space·폼 제출은 브라우저 몫.
 * 체크마크 path 길이(약 24)를 stroke-dasharray로 두고 dashoffset을 당겨 "그려지는" 모션을 만든다.
 */
export const Checkbox = ({ label, className, indeterminate = false, onChange, ...inputProps }: CheckboxProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  // indeterminate는 HTML 속성이 없고 DOM 속성뿐이라 렌더 뒤에 직접 맞춘다
  useEffect(
    function syncIndeterminate() {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate
    },
    [indeterminate],
  )

  return (
    <label className={className ? `check ${className}` : 'check'} data-kind="checkbox">
      <input
        ref={inputRef}
        type="checkbox"
        className="check-input"
        onChange={(event) => {
          onChange?.(event)
          // 브라우저는 클릭할 때 indeterminate를 끈다 — 부모 상태가 그대로면 표시만 어긋나므로 다시 맞춘다
          event.target.indeterminate = indeterminate
        }}
        {...inputProps}
      />
      <span className="check-box" aria-hidden="true">
        <svg className="check-mark" viewBox="0 0 24 24">
          <path d="M4 12.5l5 5L20 7" />
        </svg>
      </span>
      {label && <span className="check-label">{label}</span>}
    </label>
  )
}
