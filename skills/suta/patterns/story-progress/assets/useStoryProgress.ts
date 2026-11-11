import { useEffect, useRef, useState } from 'react'
import { createStoryProgress } from './createStoryProgress'
import './story-progress.css'

type UseStoryProgressOptions = {
  /** 구간(스토리 장면) 수 */
  count: number
  /** 구간 하나의 재생 시간 (기본 5000ms). 함수로 주면 구간마다 다르다. 바꿔도 재생이 처음으로 돌아가지 않는다 */
  durationMs?: number | ((index: number) => number)
  onComplete?: () => void
  /** 이보다 오래 눌렀다 뗀 뒤의 click은 장면을 넘기지 않는다 (기본 200ms) — tapNext·tapPrev가 쓴다 */
  holdThresholdMs?: number
}

const DEFAULT_DURATION_MS = 5000

/**
 * createStoryProgress 코어의 React 래퍼.
 * registerBar(index)를 각 .story-bar-fill에 달면 마운트 시 재생이 시작되고,
 * index로 장면을 전환하며 controls로 일시정지(길게 누름)·이동(탭)을 만든다.
 */
export const useStoryProgress = ({ count, durationMs, onComplete, holdThresholdMs = 200 }: UseStoryProgressOptions) => {
  const barsRef = useRef<Array<HTMLElement | null>>([])
  const [index, setIndex] = useState(0)
  const controlsRef = useRef<ReturnType<typeof createStoryProgress> | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  // 시간은 ref로 읽는다 — 의존성에 두면 값이 바뀔 때마다 첫 장면부터 다시 재생된다
  const durationRef = useRef(durationMs)
  durationRef.current = durationMs

  const registerBar = (barIndex: number) => (el: HTMLElement | null) => {
    barsRef.current[barIndex] = el
  }

  useEffect(
    function playStory() {
      const bars = barsRef.current.filter((bar): bar is HTMLElement => bar !== null)
      if (bars.length !== count) return
      const story = createStoryProgress({
        bars,
        durationMs: (barIndex) => {
          const duration = durationRef.current ?? DEFAULT_DURATION_MS
          return typeof duration === 'function' ? duration(barIndex) : duration
        },
        onIndexChange: setIndex,
        onComplete: () => onCompleteRef.current?.(),
      })
      controlsRef.current = story
      story.start()
      return () => {
        story.stop()
        // 장면 수가 바뀌어 새로 재생할 때 index가 앞 재생의 자리에 남지 않게 한다
        setIndex(0)
      }
    },
    [count],
  )

  // 길게 눌러 멈췄다 뗀 손가락도 click을 낸다 — 그 click으로 장면이 넘어가면 읽으려고 멈춘 장면을 놓친다
  const isTap = () => (controlsRef.current?.takeHoldMs() ?? 0) < holdThresholdMs

  return {
    registerBar,
    index,
    pause: () => controlsRef.current?.pause(),
    resume: () => controlsRef.current?.resume(),
    next: () => controlsRef.current?.next(),
    prev: () => controlsRef.current?.prev(),
    /** 좌우 탭 영역의 onClick에 단다 — 길게 눌렀다 뗀 click은 무시하고, 짧은 탭·키보드 Enter만 넘긴다 */
    tapNext: () => {
      if (isTap()) controlsRef.current?.next()
    },
    tapPrev: () => {
      if (isTap()) controlsRef.current?.prev()
    },
    restart: () => controlsRef.current?.start(),
  }
}
