import type { CSSProperties } from 'react'
import './skeleton.css'

type SkeletonProps = {
  /** 형태 — text(글줄)·circle(아바타)·rect(썸네일·카드) */
  variant?: 'text' | 'circle' | 'rect'
  /** text 전용: 글줄 수 (마지막 줄은 자동으로 짧아진다) */
  lines?: number
  width?: string | number
  /** rect·circle은 상자 높이. text는 막대 두께다 — 글줄 상자의 높이는 그 자리의 line-height가 정한다 */
  height?: string | number
  className?: string
}

const toCssLength = (value: string | number) => (typeof value === 'number' ? `${value}px` : value)

/**
 * skeleton.css의 React 편의 래퍼 — 로직이 없는 순수 마크업 도우미다.
 * 순수 JS에서는 CSS 클래스만으로 동일하게 쓸 수 있다: <div class="skeleton skeleton-text" />
 */
export const Skeleton = ({ variant = 'rect', lines = 1, width, height, className }: SkeletonProps) => {
  // text는 height를 상자가 아니라 막대 두께(--skeleton-line)로 넘긴다 — 상자는 실제 글 한 줄 높이를 지켜야 한다
  const style: CSSProperties =
    variant === 'text'
      ? ({ width, ...(height === undefined ? {} : { '--skeleton-line': toCssLength(height) }) } as CSSProperties)
      : { width, height }
  const classes = ['skeleton', variant === 'rect' ? '' : `skeleton-${variant}`, className]
    .filter(Boolean)
    .join(' ')

  if (variant === 'text' && lines > 1) {
    return (
      <div aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className={classes} style={style} />
        ))}
      </div>
    )
  }

  return <div aria-hidden="true" className={classes} style={style} />
}
