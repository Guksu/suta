import { useEffect, useRef } from 'react'
import { flyToTarget } from './flyToTarget'

/**
 * flyToTarget 코어의 React 래퍼 — targetRef를 장바구니 버튼에 달고,
 * 담기 버튼에서 flyFrom({ source })를 부르면 고스트가 날아간다.
 */
export const useCartFly = <T extends HTMLElement = HTMLElement>() => {
  const targetRef = useRef<T | null>(null)
  // 날고 있는 고스트들의 취소 함수 — 화면을 떠날 때 걷는다
  const flightsRef = useRef(new Set<() => void>())

  useEffect(function cancelFlightsOnUnmount() {
    const flights = flightsRef.current
    return () => {
      // 고스트는 body에 붙어 있어 컴포넌트가 사라져도 남는다 — 다음 화면 위를 날지 않게 걷는다
      flights.forEach((cancel) => cancel())
      flights.clear()
    }
  }, [])

  const flyFrom = ({
    source,
    onArrive,
    arc,
    durationMs,
  }: {
    source: HTMLElement
    onArrive?: () => void
    arc?: 'horizontal-first' | 'vertical-first'
    durationMs?: number
  }) => {
    const target = targetRef.current
    if (!target) {
      // 장바구니 버튼이 지금 화면에 없다(좁은 화면에서 그리지 않는 머리글 등) — 날릴 곳은 없어도 담은 결과는 전한다
      onArrive?.()
      return
    }
    // 동작 줄이기 등으로 날리지 않을 때는 onArrive가 flyToTarget 안에서 바로 불린다 — 그때는 걷을 고스트가 없다
    let arrived = false
    const flight = { cancel: () => {} }
    flight.cancel = flyToTarget({
      source,
      target,
      arc,
      durationMs,
      onArrive: () => {
        arrived = true
        flightsRef.current.delete(flight.cancel)
        onArrive?.()
      },
    })
    if (!arrived) flightsRef.current.add(flight.cancel)
  }

  return { targetRef, flyFrom }
}
