import { cloneElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react'
import { createTooltipTrigger } from './createTooltipTrigger'
import './tooltip.css'

type TooltipProps = {
  /** 말풍선 내용 — 한 줄 보조 설명. 상호작용 요소를 넣지 않는다(pointer-events가 없다) */
  label: ReactNode
  /** 배치 방향 (기본 top). 그쪽에 자리가 없고 반대쪽에 있으면 열 때 뒤집힌다 */
  place?: 'top' | 'bottom' | 'left' | 'right'
  /** 호버 열림 지연 (기본 400ms) */
  showDelayMs?: number
  /** 앵커 — 포커스 가능한 단일 요소(버튼·링크 등). aria-describedby가 주입된다 */
  children: ReactElement<{ 'aria-describedby'?: string }>
}

/**
 * createTooltipTrigger 코어의 React 래퍼.
 * 앵커를 감싼 래퍼가 이벤트를 받고(focusin/focusout은 버블링), 말풍선은 앵커 기준 절대 배치.
 */
export const Tooltip = ({ label, place = 'top', showDelayMs, children }: TooltipProps) => {
  const tooltipId = useId()
  const anchorRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLElement | null>(null)

  useEffect(
    function wireTooltipTrigger() {
      const anchor = anchorRef.current
      const tooltip = tooltipRef.current
      if (!anchor || !tooltip) return
      // place를 코어에 넘긴다 — 코어가 뒤집어 놓은 data-place가 아니라 prop이 "원래 방향"이다
      return createTooltipTrigger({ anchor, tooltip, showDelayMs, place })
    },
    [showDelayMs, place],
  )

  return (
    <span className="tooltip-anchor" ref={anchorRef}>
      {cloneElement(children, { 'aria-describedby': tooltipId })}
      <span ref={tooltipRef} id={tooltipId} className="tooltip" role="tooltip" data-place={place}>
        {label}
      </span>
    </span>
  )
}
