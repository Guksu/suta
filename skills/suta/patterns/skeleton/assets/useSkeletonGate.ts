import { useEffect, useRef, useState } from 'react'
import { createSkeletonGate, type SkeletonGate } from './createSkeletonGate'

type UseSkeletonGateOptions = {
  /** 지금 데이터를 기다리는 중인가 */
  loading: boolean
  /** 로딩이 이만큼 이어져야 뼈대를 띄운다 (ms, 기본 200) */
  delayMs?: number
  /** 한 번 띄운 뼈대를 유지하는 최소 시간 (ms, 기본 400) */
  minVisibleMs?: number
}

/**
 * createSkeletonGate 코어의 React 래퍼 — 로딩 값을 "뼈대를 그릴지"로 바꿔 준다.
 * 돌려주는 값이 true면 뼈대를, false면 데이터가 있을 때 내용을, 없을 때(첫 delayMs) 빈 자리를 그린다.
 */
export const useSkeletonGate = ({ loading, delayMs, minVisibleMs }: UseSkeletonGateOptions) => {
  const [visible, setVisible] = useState(false)
  const gateRef = useRef<SkeletonGate | null>(null)
  const loadingRef = useRef(loading)
  loadingRef.current = loading

  useEffect(
    function createGate() {
      const gate = createSkeletonGate({ delayMs, minVisibleMs, onChange: setVisible })
      gateRef.current = gate
      // 옵션이 바뀌어 다시 만들어졌을 때도 지금의 로딩 값에서 이어 간다
      gate.setLoading(loadingRef.current)
      return () => {
        gate.destroy()
        gateRef.current = null
        setVisible(false)
      }
    },
    [delayMs, minVisibleMs],
  )

  useEffect(
    function syncLoading() {
      gateRef.current?.setLoading(loading)
    },
    [loading],
  )

  return visible
}
