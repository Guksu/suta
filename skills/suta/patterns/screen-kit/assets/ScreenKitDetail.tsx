import { useId, type ReactNode } from 'react'
import './screen-kit.css'
import './screen-kit-detail.css'

/* screen-kit 상세 부품의 얇은 React 래퍼 — 마크업과 접근성 연결(이름·묶음·상태)만 한다. 모양은 CSS가 정한다.
 * 사진 머리·이름 묶음·수량 줄은 마크업이 짧고 프로젝트마다 버튼·아이콘이 달라 래퍼 없이 클래스로 쓴다(PATTERN.md).
 * 수량 스테퍼는 quantity-stepper 패턴이다 — 이 파일은 그것을 import하지 않는다(패턴은 따로 복사한다). */

/* ---------------- 옵션 구역 ---------------- */

type OptionSectionProps = {
  title: ReactNode
  /** 고르는 법 한 줄 — "하나 선택"·"여러 개 선택"·"필수" */
  hint?: ReactNode
  /** 제목의 id — 안의 PickGroup·CheckList가 labelledBy로 이름을 이을 때. 없으면 만든다 */
  titleId?: string
  /** 사이트 머리·이름 묶음 아래면 2(기본) */
  level?: 2 | 3
  children: ReactNode
  className?: string
}

export const OptionSection = ({ title, hint, titleId, level = 2, children, className }: OptionSectionProps) => {
  const autoId = useId()
  const id = titleId ?? autoId
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <section className={className ? `kit-option ${className}` : 'kit-option'} aria-labelledby={id}>
      <div className="kit-option-head">
        <Heading id={id} className="kit-option-title">
          {title}
        </Heading>
        {hint && <p className="kit-option-hint">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/* ---------------- 하나 고르는 칸 ---------------- */

type PickOption = {
  value: string
  label: ReactNode
  /** 칸 안 둘째 글자(추가 금액 "+1,500원") — 보이는 글자라 이름에 함께 읽힌다 */
  extra?: ReactNode
  disabled?: boolean
}

type PickGroupProps = {
  /** 라디오 묶음 이름(name) — 폼 제출 값의 키 */
  name: string
  options: PickOption[]
  value: string
  onChange: (value: string) => void
  /** 묶음의 이름 — 보이는 구역 제목이 있으면 그 id를 labelledBy로 */
  label?: string
  labelledBy?: string
  className?: string
}

/** 숨긴 네이티브 라디오 + 회색 채움 칸 — 화살표 키로 옮기고, 고른 칸은 주 글자색 채움 + 굵게 */
export const PickGroup = ({ name, options, value, onChange, label, labelledBy, className }: PickGroupProps) => (
  <div className={className ? `kit-picks ${className}` : 'kit-picks'} role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}>
    {options.map((option) => (
      <label key={option.value} className="kit-pick">
        <input
          className="kit-pick-input"
          type="radio"
          name={name}
          value={option.value}
          checked={value === option.value}
          disabled={option.disabled}
          onChange={() => onChange(option.value)}
        />
        <span className="kit-pick-face">
          {option.label}
          {option.extra && <span className="kit-pick-extra"> {option.extra}</span>}
        </span>
      </label>
    ))}
  </div>
)

/* ---------------- 여러 개 고르는 체크 행 ---------------- */

type CheckOption = {
  value: string
  label: ReactNode
  /** 오른쪽 추가 금액("+1,000원") */
  price?: ReactNode
  disabled?: boolean
}

type CheckListProps = {
  options: CheckOption[]
  values: string[]
  /** 켜고 끈 뒤의 값 목록 — 옵션 순서를 따른다 */
  onChange: (values: string[]) => void
  label?: string
  labelledBy?: string
  /** 폼 제출 값의 키 */
  name?: string
  className?: string
}

/** 행 전체가 라벨인 실제 체크 상자 행 — 이름은 행의 보이는 글자(이름 + 추가 금액) */
export const CheckList = ({ options, values, onChange, label, labelledBy, name, className }: CheckListProps) => {
  const toggle = (value: string) => {
    const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
    // 누른 순서가 아니라 옵션 순서로 돌려준다 — 장바구니·주문 내역의 옵션 순서가 매번 같게
    onChange(options.map((option) => option.value).filter((item) => next.includes(item)))
  }
  return (
    <div className={className ? `kit-checks ${className}` : 'kit-checks'} role="group" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}>
      {options.map((option) => (
        <label key={option.value} className="kit-check">
          <input
            className="kit-check-input"
            type="checkbox"
            name={name}
            value={option.value}
            checked={values.includes(option.value)}
            disabled={option.disabled}
            onChange={() => toggle(option.value)}
          />
          <span className="kit-check-box" aria-hidden="true" />
          <span className="kit-check-name">{option.label}</span>
          {option.price && <span className="kit-check-price"> {option.price}</span>}
        </label>
      ))}
    </div>
  )
}

/* ---------------- 하단 고정 바 ---------------- */

type ActionBarProps = {
  /** 행동 이름 — "담기"·"예약하기" */
  label: ReactNode
  /** 형식을 맞춘 합계 — 버튼 오른쪽 끝 */
  total?: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  /** 창에 고정(position: fixed) — 본문 끝에 <div className="kit-actionbar-space" />를 둔다. 기본은 sticky */
  fixed?: boolean
  className?: string
}

/** 화면의 맨 끝 요소로 둔다 — sticky라 스크롤하는 동안 아래에 붙고, 끝에서는 마지막 내용 아래 제자리로 온다 */
export const ActionBar = ({ label, total, onClick, type = 'button', disabled, fixed, className }: ActionBarProps) => (
  <div className={className ? `kit-actionbar ${className}` : 'kit-actionbar'} data-fixed={fixed ? '' : undefined}>
    <button type={type} className="kit-button" onClick={onClick} disabled={disabled}>
      <span>{label}</span>
      {total !== undefined && <span className="kit-actionbar-total"> {total}</span>}
    </button>
  </div>
)
