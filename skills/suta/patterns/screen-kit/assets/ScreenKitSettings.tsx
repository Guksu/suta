import { useId, type ReactNode } from 'react'
import './screen-kit.css'
import './screen-kit-settings.css'

/* screen-kit 설정 부품의 얇은 React 래퍼 — 마크업과 접근성 연결만 한다. 모양은 CSS가 정한다.
 * 스위치 행은 switch 패턴의 Switch를 행 안에 넣는다(이 파일은 그것을 import하지 않는다 — 패턴은 따로 복사한다):
 *   <li className="kit-row"><Switch className="kit-row-switch" label="주문 알림" checked={on} onChange={setOn} /></li> */

const ChevronIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

/* ---------------- 프로필 줄 ---------------- */

type ProfileRowProps = {
  name: string
  /** 이메일·연락처 한 줄 */
  sub?: ReactNode
  /** 원 안 글자 — 기본은 이름의 첫 글자 */
  initial?: string
  /** 사진이 있으면 원 안 img(alt="" — 이름이 옆 글자로 있다) */
  photo?: string
  href?: string
  onClick?: () => void
  className?: string
}

/** 행 전체가 내 정보로 들어가는 링크(또는 버튼). 상자를 씌우지 않는다 */
export const ProfileRow = ({ name, sub, initial, photo, href, onClick, className }: ProfileRowProps) => {
  const classes = className ? `kit-profile ${className}` : 'kit-profile'
  const body = (
    <>
      <span className="kit-profile-avatar" aria-hidden="true">
        {photo ? <img src={photo} alt="" /> : (initial ?? [...name][0])}
      </span>
      <span className="kit-profile-text">
        <span className="kit-profile-name">{name}</span>
        {sub && <span className="kit-profile-sub"> {sub}</span>}
      </span>
      <span className="kit-chevron">
        <ChevronIcon />
      </span>
    </>
  )
  return href ? (
    <a className={classes} href={href} onClick={onClick}>
      {body}
    </a>
  ) : (
    <button type="button" className={classes} onClick={onClick}>
      {body}
    </button>
  )
}

/* ---------------- 묶음 ---------------- */

type SettingsGroupProps = {
  /** 작은 옅은 묶음 이름 — 구역의 이름이 된다 */
  label: ReactNode
  /** 묶음 아래 안내 한 줄(조건·예외) */
  note?: ReactNode
  /** SettingsRow 또는 <li className="kit-row"> */
  children: ReactNode
  className?: string
}

export const SettingsGroup = ({ label, note, children, className }: SettingsGroupProps) => {
  const id = useId()
  return (
    <section className={className ? `kit-group ${className}` : 'kit-group'} aria-labelledby={id}>
      <h2 id={id} className="kit-group-label">
        {label}
      </h2>
      <ul className="kit-rows">{children}</ul>
      {note && <p className="kit-group-note">{note}</p>}
    </section>
  )
}

/* ---------------- 행 ---------------- */

type SettingsRowProps = {
  label: ReactNode
  /** 오른쪽 현재 값("한국어") — 보이는 글자라 이름에 함께 읽힌다 */
  value?: ReactNode
  /** 다른 화면으로 가면 href(링크), 그 자리에서 시트로 고르면 onClick(버튼) */
  href?: string
  onClick?: () => void
  className?: string
}

/** 행 전체가 누르는 영역 — 왼쪽 라벨, 오른쪽 현재 값 + 꺾쇠 */
export const SettingsRow = ({ label, value, href, onClick, className }: SettingsRowProps) => {
  const body = (
    <>
      <span className="kit-row-label">{label}</span>
      {value !== undefined && <span className="kit-row-value"> {value}</span>}
      <span className="kit-chevron">
        <ChevronIcon />
      </span>
    </>
  )
  return (
    <li className={className ? `kit-row ${className}` : 'kit-row'}>
      {href ? (
        <a className="kit-row-link" href={href} onClick={onClick}>
          {body}
        </a>
      ) : (
        <button type="button" className="kit-row-link" onClick={onClick}>
          {body}
        </button>
      )}
    </li>
  )
}
