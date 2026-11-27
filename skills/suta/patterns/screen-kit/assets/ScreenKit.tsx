import { useId, type CSSProperties, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import './screen-kit.css'
import './screen-kit-list.css'
import './screen-kit-form.css'

/* screen-kit의 얇은 React 래퍼 — 마크업과 접근성 연결(라벨·설명·낭독 문구)만 한다. 모양은 모두 CSS가 정한다.
 * 탭 줄·날짜 띠·시간 칸·사진 카드는 마크업이 짧고 프로젝트마다 상태 연결이 달라 래퍼 없이 클래스로 쓴다(PATTERN.md). */

/* ---------------- 쪽 머리 ---------------- */

type PageHeadProps = {
  title: ReactNode
  /** 보조 한 줄 — 이유·조건·숫자. 제목을 되풀이하면 뺀다 */
  sub?: ReactNode
  /** 화면의 첫 제목이면 1(기본). 사이트 머리 안에 h1이 이미 있으면 2 */
  level?: 1 | 2
  className?: string
}

export const PageHead = ({ title, sub, level = 1, className }: PageHeadProps) => {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div className={className ? `kit-head ${className}` : 'kit-head'}>
      <Heading className="kit-head-title">{title}</Heading>
      {sub && <p className="kit-head-sub">{sub}</p>}
    </div>
  )
}

/* ---------------- 사진 틀 ---------------- */

/** content-art.css(layout-principles)의 장면과 색 한 벌 — 그 파일을 함께 불러와야 그려진다 */
export type ArtScene = 'food' | 'bowl' | 'dish' | 'drink' | 'room' | 'outdoor' | 'city' | 'product' | 'box' | 'shirt' | 'bag' | 'person' | 'pet' | 'shapes'
export type ArtTone = 'sand' | 'clay' | 'rose' | 'sage' | 'sky' | 'slate' | 'night'

type PhotoFrameProps = {
  /** 사진 주소. 없으면 art의 콘텐츠 그림으로 채운다 — 회색 칸 + 사진 아이콘으로 비우지 않는다 */
  src?: string
  /** 사진이 무엇인지. 옆에 같은 이름이 글자로 있으면 ""(장식으로 숨긴다) */
  alt: string
  /** 사진이 없을 때의 장면·색 한 벌. 목록에서는 색을 3~4개 돌려 쓴다 */
  art?: { scene: ArtScene; tone: ArtTone }
  /** CSS aspect-ratio 값 — 1(기본, 상품)·"4 / 3"(메뉴·장소)·"4 / 5"(옷) */
  ratio?: string
  /** 모서리 — 0(기본)에서 브랜드가 둥글면 8px까지 */
  radius?: string
  /** 그림 속 내용(illustrations.ts의 SVG 등) — art일 때만 */
  children?: ReactNode
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  className?: string
}

export const PhotoFrame = ({ src, alt, art = { scene: 'shapes', tone: 'slate' }, ratio, radius, children, width, height, loading = 'lazy', className }: PhotoFrameProps) => {
  const style = { '--kit-frame-ratio': ratio, '--kit-frame-radius': radius } as CSSProperties
  const extra = className ? ` ${className}` : ''
  if (src) {
    return <img className={`kit-frame${extra}`} src={src} alt={alt} width={width} height={height} loading={loading} decoding="async" style={style} />
  }
  // 사진 대역 그림 — 뜻이 있으면 이름 있는 그림(role="img"), 옆 글자와 겹치면 장식
  return (
    <div
      className={`kit-frame art art--${art.scene} art--${art.tone}${extra}`}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={style}
    >
      {children}
    </div>
  )
}

/* ---------------- 상품 칸 ---------------- */

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

/** 화면 낭독기가 읽는 문구 — 기본은 한국어. 다른 언어 화면이면 바꾼다 */
type ProductCellLabels = {
  add: (name: string) => string
  soldOut: string
  discount: string
  original: string
}

const DEFAULT_CELL_LABELS: ProductCellLabels = {
  add: (name) => `${name} 담기`,
  soldOut: '품절',
  discount: '할인',
  original: '정가',
}

type ProductCellProps = {
  name: string
  /** 형식을 맞춘 판매가("8,000원") — 숫자 서식은 프로젝트 몫 */
  price: ReactNode
  /** 할인율("10%") — 오류 빨강 한 곳 */
  discount?: ReactNode
  /** 정가 — 옅은 글자 취소선 */
  originalPrice?: ReactNode
  /** 보조 줄 하나(나오는 시각·한정 수량 같은 사실) */
  note?: ReactNode
  /** PhotoFrame. 이름이 바로 아래 글자로 있으니 alt=""로 둔다 */
  media: ReactNode
  soldOut?: boolean
  /** 담기 — 없으면 버튼을 두지 않는다 */
  onAdd?: () => void
  addIcon?: ReactNode
  /** 상세로 가는 주소 — 이름 링크가 칸 전체를 덮는다 */
  href?: string
  labels?: Partial<ProductCellLabels>
  className?: string
}

/** ul.kit-grid 안의 li 하나 */
export const ProductCell = ({ name, price, discount, originalPrice, note, media, soldOut = false, onAdd, addIcon, href, labels, className }: ProductCellProps) => {
  const text = { ...DEFAULT_CELL_LABELS, ...labels }
  const classes = ['kit-cell', soldOut && 'kit-cell-soldout', className].filter(Boolean).join(' ')
  return (
    <li className={classes}>
      <div className="kit-cell-media">
        {media}
        {soldOut ? (
          <span className="kit-cell-flag">{text.soldOut}</span>
        ) : (
          onAdd && (
            <button type="button" className="kit-cell-add" aria-label={text.add(name)} onClick={onAdd}>
              {addIcon ?? <PlusIcon />}
            </button>
          )
        )}
      </div>
      <p className="kit-cell-name">
        {href ? (
          <a className="kit-cell-link" href={href}>
            {name}
          </a>
        ) : (
          name
        )}
      </p>
      <p className="kit-cell-price">
        {discount && (
          <span className="kit-cell-discount">
            {discount}
            <span className="kit-sr"> {text.discount}</span>
          </span>
        )}
        <span>{price}</span>
        {originalPrice && (
          <del className="kit-cell-original">
            <span className="kit-sr">{text.original} </span>
            {originalPrice}
          </del>
        )}
      </p>
      {note && <p className="kit-cell-note">{note}</p>}
    </li>
  )
}

/* ---------------- 입력칸 묶음 ---------------- */

type FieldGroupProps = {
  /** 묶음의 이름 — 보이는 구역 제목이 있으면 그 id를 labelledBy로 */
  label?: string
  labelledBy?: string
  children: ReactNode
  className?: string
}

export const FieldGroup = ({ label, labelledBy, children, className }: FieldGroupProps) => (
  <div className={className ? `kit-fields ${className}` : 'kit-fields'} role="group" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}>
    {children}
  </div>
)

type FieldBase = {
  /** 보이는 라벨 — 입력칸의 이름이다. 안내 문구(placeholder)는 예시만 */
  label: ReactNode
  /** 안내 한 줄(선택 여부·형식) */
  hint?: ReactNode
  /** 무엇을 어떻게 고칠지 한 줄 — 있으면 오류 상태 */
  error?: ReactNode
  className?: string
}

type FieldProps = FieldBase &
  (({ multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) | ({ multiline: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>))

export const Field = (props: FieldProps) => {
  const { label, hint, error, className, multiline, ...control } = props
  const autoId = useId()
  const inputId = control.id ?? autoId
  const message = error ?? hint
  const messageId = `${inputId}-message`
  const wiring = {
    id: inputId,
    className: 'kit-field-input',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': message ? messageId : undefined,
  }
  return (
    <div className={className ? `kit-field ${className}` : 'kit-field'} data-invalid={error ? '' : undefined}>
      <label className="kit-field-label" htmlFor={inputId}>
        {label}
      </label>
      {multiline ? (
        <textarea {...(control as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...wiring} />
      ) : (
        <input {...(control as InputHTMLAttributes<HTMLInputElement>)} {...wiring} />
      )}
      {message && (
        <p id={messageId} className="kit-field-message">
          {message}
        </p>
      )}
    </div>
  )
}

/* ---------------- 요약 패널 ---------------- */

type SummaryPanelProps = {
  /** 패널 이름("예약 요약") — 보조 영역(aside)의 이름이 된다 */
  title: string
  /** 화면이 답하는 값(날짜·시간) — 24/700. 아직 없으면 null */
  answer: ReactNode
  /** answer가 없을 때 같은 자리에 적는 할 일 */
  placeholder?: ReactNode
  /** 답 아래 한 줄(장소·인원) */
  sub?: ReactNode
  /** 항목별 내역 — 라벨 · 값 */
  rows?: { label: ReactNode; value: ReactNode }[]
  totalLabel?: ReactNode
  /** 형식을 맞춘 합계 — 32/700 */
  total?: ReactNode
  /** 주 버튼 하나(.kit-button) */
  action?: ReactNode
  /** 버튼 아래 한 줄(취소 조건·잠긴 이유) */
  note?: ReactNode
  className?: string
}

export const SummaryPanel = ({ title, answer, placeholder, sub, rows = [], totalLabel, total, action, note, className }: SummaryPanelProps) => {
  const titleId = useId()
  return (
    <aside className={className ? `kit-summary ${className}` : 'kit-summary'} aria-labelledby={titleId}>
      <h2 id={titleId} className="kit-summary-title">
        {title}
      </h2>
      <p className="kit-summary-answer" data-empty={answer ? undefined : ''}>
        {answer ?? placeholder}
      </p>
      {sub && <p className="kit-summary-sub">{sub}</p>}
      {rows.length > 0 && (
        <dl className="kit-summary-rows">
          {rows.map((row, index) => (
            <div key={index}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {total !== undefined && (
        <p className="kit-summary-total">
          <span>{totalLabel}</span>
          <b>{total}</b>
        </p>
      )}
      {action}
      {note && <p className="kit-summary-note">{note}</p>}
    </aside>
  )
}
