import { useEffect, useRef } from 'react'
import { createToastStack } from './createToastStack'
import './toast-stack.css'

type UseToastStackOptions = {
  durationMs?: number
  maxVisible?: number
  /** 'bottom'(기본) 또는 'top' — 상단 배너처럼 위에서 내려온다 */
  position?: 'bottom' | 'top'
}

/**
 * createToastStack 코어의 React 래퍼 — 마운트 시 스택을 만들고 언마운트 시 정리한다.
 * 반환된 toast(message)를 어디서든 호출하면 쌓인다.
 * 스택 하나가 라이브 영역 하나를 만든다 — 앱에서 한 곳(최상위 레이아웃)에서만 부르고 toast를 아래로 내려 준다.
 * 화면마다 따로 부르면 영역이 같은 자리에 겹치고, 화면이 바뀔 때 떠 있던 토스트가 함께 사라진다.
 */
export const useToastStack = ({ durationMs, maxVisible, position }: UseToastStackOptions = {}) => {
  const stackRef = useRef<ReturnType<typeof createToastStack> | null>(null)

  useEffect(
    function mountToastRegion() {
      const stack = createToastStack({ durationMs, maxVisible, position })
      stackRef.current = stack
      return () => {
        stackRef.current = null
        stack.destroy()
      }
    },
    [durationMs, maxVisible, position],
  )

  /** options.durationMs로 이 토스트 하나의 표시 시간을 바꿀 수 있다(긴 문장) */
  const toast = (message: string, options?: { durationMs?: number }) => stackRef.current?.show(message, options)
  /** 화면이 바뀔 때 부른다 — 라우터의 경로가 바뀌는 useEffect에서 */
  const clearToasts = () => stackRef.current?.clear()

  return { toast, clearToasts }
}
