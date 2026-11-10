import { useId, type InputHTMLAttributes, type Ref } from 'react'
import './floating-label.css'

type TextFieldProps = {
  label: string
  className?: string
  /** 입력 아래에 늘 보이는 도움말 — 형식 예시나 쓰임을 적는다. placeholder를 쓸 수 없는 이 패턴에서 안내 문구의 자리다 */
  helperText?: string
  /** 오류 문구 — 있으면 도움말 자리에 대신 서고 aria-invalid가 켜진다 */
  errorText?: string
  /** input으로 간다 — 제출 실패 때 틀린 칸으로 포커스를 옮길 때 쓴다 */
  ref?: Ref<HTMLInputElement>
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder' | 'className'>

/**
 * 플로팅 라벨 입력 — 떠오름 판정은 전부 CSS(:focus·:placeholder-shown)라 JS 상태가 없다.
 * placeholder는 " "로 고정한다: 비어 있을 때 :placeholder-shown이 성립해야 라벨이 내려온다.
 * 라벨이 placeholder를 대신하므로 별도 placeholder 문구는 받지 않는다 — 안내는 helperText로 둔다.
 */
export const TextField = ({ label, className, id, helperText, errorText, ...inputProps }: TextFieldProps) => {
  const autoId = useId()
  const inputId = id ?? autoId
  const message = errorText || helperText
  const messageId = `${inputId}-message`
  // 밖에서 준 설명(aria-describedby)을 지우지 않고 뒤에 잇는다
  const describedBy = [inputProps['aria-describedby'], message ? messageId : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className={className ? `field ${className}` : 'field'}>
      <input
        id={inputId}
        className="field-input"
        placeholder=" "
        aria-invalid={errorText ? true : undefined}
        {...inputProps}
        aria-describedby={describedBy}
      />
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      {message && (
        <p id={messageId} className="field-message" data-kind={errorText ? 'error' : 'helper'}>
          {message}
        </p>
      )}
    </div>
  )
}
