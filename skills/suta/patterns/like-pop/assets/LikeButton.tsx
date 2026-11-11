import { useState } from 'react'
import './like-pop.css'

type LikeButtonProps = {
  liked: boolean
  onChange: (liked: boolean) => void
  /** 표시할 좋아요 수 (선택) */
  count?: number
  /** 수의 표시 — 기본은 천 단위 구분(1,280). 큰 수를 줄여 쓰려면(1.2만) 넘긴다 */
  formatCount?: (count: number) => string
  /** 화면 낭독 문구 — 기본은 한국어. 다른 언어로 쓰면 넘긴다 */
  labels?: { like: string; unlike: string }
  className?: string
}

const DEFAULT_LABELS = { like: '좋아요', unlike: '좋아요 취소' }
const defaultFormatCount = (count: number) => count.toLocaleString('ko-KR')

/**
 * 좋아요 토글 버튼 — aria-pressed 상태에 CSS가 반응해 하트가 팝(pop)한다.
 * 상태는 밖에서 소유한다(controlled) — 서버 동기화·낙관적 갱신은 호출부 책임.
 */
export const LikeButton = ({
  liked,
  onChange,
  count,
  formatCount = defaultFormatCount,
  labels = DEFAULT_LABELS,
  className,
}: LikeButtonProps) => {
  // 팝은 "방금 좋아요가 됐다"의 연출이다. 이미 좋아요인 채로 그려진 버튼까지 튀면
  // 목록을 열거나 스크롤로 행이 다시 그려질 때마다 모든 하트가 튄다 — 그려진 뒤의 변화에만 허용한다
  const [seenLiked, setSeenLiked] = useState(liked)
  const [changed, setChanged] = useState(false)
  if (liked !== seenLiked) {
    setSeenLiked(liked)
    setChanged(true)
  }

  const label = liked ? labels.unlike : labels.like
  const countText = count === undefined ? undefined : formatCount(count)

  return (
    <button
      type="button"
      className={className ? `like-btn ${className}` : 'like-btn'}
      aria-pressed={liked}
      /* aria-label은 버튼 안의 글자를 덮는다 — 수를 이름에 넣지 않으면 화면 낭독기는 수를 읽지 못한다 */
      aria-label={countText === undefined ? label : `${label} ${countText}`}
      data-pop={changed ? undefined : 'false'}
      onClick={() => onChange(!liked)}
    >
      <svg className="like-heart" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      {countText !== undefined && <span className="like-count">{countText}</span>}
    </button>
  )
}
