import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cardTransform, nextStackState, stackHeight, type StackAction, type StackState } from './stackLayout'
import './card-stack.css'

export type CardStackCard = {
  id: string
  /** 카드 안쪽 내용 — 버튼 안에 들어가므로 button·a 같은 인터랙티브 요소는 넣지 않는다 */
  render: () => ReactNode
}

type CardStackProps = {
  cards: CardStackCard[]
  cardHeight?: number
  /** 겹침 높이(뒤 카드가 삐져나오는 px, 기본 56) */
  peekPx?: number
  /** 펼침 간격(px, 기본 72) */
  fanGapPx?: number
  /** 그룹 이름 — 스크린리더가 "카드 지갑, 그룹"으로 읽는다 */
  label?: string
  /** 모드가 바뀔 때 알림 (상태 표시·분석용) */
  onStateChange?: (state: StackState) => void
  className?: string
}

/** 선택은 순번이 아니라 id로 기억한다 — 카드가 추가·삭제되어 순번이 밀려도 다른 카드가 선택된 것처럼 보이지 않는다 */
type Held = { mode: StackState['mode']; selectedId: string | null }

const INITIAL_HELD: Held = { mode: 'stacked', selectedId: null }

/**
 * stackLayout 코어의 React 래퍼.
 * 카드마다 <button>이라 Tab으로 오가고 Enter/Space로 누른다. Esc는 한 단계 되돌린다(selected→fanned→stacked).
 * 높이는 모드별 min-height로 즉시 바꾸고, 이동은 CSS가 카드 transform만 전환한다.
 */
export const CardStack = ({ cards, cardHeight = 180, peekPx = 56, fanGapPx = 72, label = '카드 지갑', onStateChange, className }: CardStackProps) => {
  const [held, setHeld] = useState<Held>(INITIAL_HELD)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const count = cards.length
  // 최신 콜백을 ref로 들고 있어 인라인 함수를 넘겨도 알림 effect가 매 렌더 다시 돌지 않는다
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange

  // 화면에 쓰는 상태 — 선택한 카드가 목록에서 사라졌으면 펼침으로 본다
  const selectedIndex = held.mode === 'selected' ? cards.findIndex((card) => card.id === held.selectedId) : -1
  const state: StackState =
    held.mode === 'selected'
      ? selectedIndex === -1
        ? { mode: 'fanned', selectedIndex: null }
        : { mode: 'selected', selectedIndex }
      : { mode: held.mode, selectedIndex: null }

  const dispatch = (action: StackAction) => {
    const next = nextStackState({ ...state, action })
    setHeld({ mode: next.mode, selectedId: next.selectedIndex === null ? null : (cards[next.selectedIndex]?.id ?? null) })
  }
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  useEffect(
    function notifyStateChange() {
      // 마운트 직후 초기 상태(stacked)도 한 번 알린다 — 표시 UI가 첫 화면부터 맞는다
      onStateChangeRef.current?.({ mode: state.mode, selectedIndex: state.selectedIndex })
    },
    [state.mode, state.selectedIndex],
  )

  useEffect(
    function dismissOnEscape() {
      if (state.mode === 'stacked') return
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return
        // 포커스가 다른 곳(입력칸·위에 열린 대화상자·다른 카드 묶음)에 있으면 그쪽의 Esc다.
        // body는 받는다 — 사파리는 버튼을 눌러도 포커스를 주지 않아 방금 누른 묶음의 포커스가 body에 있다
        const active = document.activeElement
        const elsewhere = active !== null && active !== document.body && !containerRef.current?.contains(active)
        if (elsewhere) return
        dispatchRef.current({ type: 'dismiss' })
      }
      window.addEventListener('keydown', handleKeydown)
      return () => window.removeEventListener('keydown', handleKeydown)
    },
    [state.mode],
  )

  const layout = { count, mode: state.mode, peekPx, fanGapPx, cardHeight }
  const containerStyle = {
    minHeight: stackHeight(layout),
    '--stack-count': count,
    '--stack-peek': `${peekPx}px`,
    '--stack-fan-gap': `${fanGapPx}px`,
    '--stack-card-height': `${cardHeight}px`,
  } as CSSProperties

  return (
    <div ref={containerRef} className={className ? `card-stack ${className}` : 'card-stack'} role="group" aria-label={label} data-mode={state.mode} style={containerStyle}>
      {cards.map((card, index) => {
        const { translateY, scale, zIndex } = cardTransform({ ...layout, index, selectedIndex: state.selectedIndex })
        const selected = state.mode === 'selected' && state.selectedIndex === index
        const cardStyle = {
          transform: `translateY(${translateY}px) scale(${scale})`,
          zIndex,
          '--stack-index': index,
        } as CSSProperties
        return (
          <button
            key={card.id}
            type="button"
            className="card-stack-card"
            aria-expanded={selected}
            data-selected={selected ? 'true' : undefined}
            style={cardStyle}
            onClick={() => dispatch({ type: 'tapCard', index })}
          >
            {card.render()}
          </button>
        )
      })}
    </div>
  )
}
