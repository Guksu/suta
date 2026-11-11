import { createPullToRefresh } from '@skills/pull-to-refresh/assets/createPullToRefresh'

const pointer = ({ el, type, y }: { el: HTMLElement; type: string; y: number }) => {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientY: y, button: 0 }))
}

describe('createPullToRefresh — 당김 추적과 새로고침 판정', () => {
  let container: HTMLElement
  let content: HTMLElement
  let refreshCalls: Array<() => void>
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
    container = document.createElement('div')
    content = document.createElement('div')
    container.appendChild(content)
    document.body.appendChild(container)
    Object.defineProperty(container, 'scrollTop', { value: 0, writable: true })
    refreshCalls = []
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
    container.remove()
  })

  const register = (options: { thresholdPx?: number } = {}) => {
    const cleanup = createPullToRefresh({
      container,
      content,
      onRefresh: (done) => refreshCalls.push(done),
      ...options,
    })
    cleanups.push(cleanup)
    return cleanup
  }

  it('최상단에서 아래로 당기면 저항이 걸린 translateY와 진행률 변수가 붙는다', () => {
    register()
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 200 })
    const match = content.style.transform.match(/translateY\((\d+(?:\.\d+)?)px\)/)
    expect(match).not.toBeNull()
    const pulled = Number(match![1])
    expect(pulled).toBeGreaterThan(0)
    expect(pulled).toBeLessThan(100) // 저항 — 손가락 거리보다 덜 내려온다
    expect(Number(container.style.getPropertyValue('--pull-progress'))).toBeGreaterThan(0)
  })

  it('스크롤이 최상단이 아니면 당김을 시작하지 않는다', () => {
    register()
    ;(container as unknown as { scrollTop: number }).scrollTop = 120
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 250 })
    expect(content.style.transform).toBe('')
  })

  it('임계 미달로 놓으면 새로고침 없이 제자리로 돌아간다', () => {
    register({ thresholdPx: 80 })
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 140 })
    pointer({ el: container, type: 'pointerup', y: 140 })
    expect(refreshCalls).toHaveLength(0)
    expect(content.style.transform).toBe('')
  })

  it('임계를 넘겨 놓으면 onRefresh가 불리고, done()이 오면 제자리로 돌아간다', () => {
    register({ thresholdPx: 40 })
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 300 })
    pointer({ el: container, type: 'pointerup', y: 300 })
    expect(refreshCalls).toHaveLength(1)
    expect(container.dataset.refreshing).toBe('true')
    expect(content.style.transform).not.toBe('')
    refreshCalls[0]()
    expect(container.dataset.refreshing).toBe('false')
    expect(content.style.transform).toBe('')
  })

  it('새로고침 진행 중에는 새 당김을 받지 않는다', () => {
    register({ thresholdPx: 40 })
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 300 })
    pointer({ el: container, type: 'pointerup', y: 300 })
    const frozen = content.style.transform
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 400 })
    expect(content.style.transform).toBe(frozen)
  })
  describe('끊김·두 번째 손가락·가로 끌기', () => {
    const touchPointer = ({ type, x = 0, y, id }: { type: string; x?: number; y: number; id: number }) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
      Object.defineProperty(event, 'pointerId', { value: id })
      container.dispatchEvent(event)
    }

    it('pointercancel이면 임계를 넘겼어도 새로고침하지 않고 제자리로 돌린다', () => {
      register({ thresholdPx: 40 })
      touchPointer({ type: 'pointerdown', y: 100, id: 1 })
      touchPointer({ type: 'pointermove', y: 300, id: 1 })
      expect(content.style.transition).toBe('none')
      touchPointer({ type: 'pointercancel', y: 300, id: 1 })
      expect(refreshCalls).toHaveLength(0)
      expect(content.style.transform).toBe('')
      expect(content.style.transition).toBe('')
      expect(container.style.getPropertyValue('--pull-progress')).toBe('0')
      // 끊긴 뒤의 움직임은 당김이 아니다
      touchPointer({ type: 'pointermove', y: 400, id: 1 })
      expect(content.style.transform).toBe('')
    })

    it('두 번째 손가락의 움직임과 뗌은 무시한다', () => {
      register({ thresholdPx: 40 })
      touchPointer({ type: 'pointerdown', y: 100, id: 1 })
      touchPointer({ type: 'pointermove', y: 130, id: 1 })
      const held = content.style.transform
      touchPointer({ type: 'pointerdown', y: 10, id: 2 })
      touchPointer({ type: 'pointermove', y: 500, id: 2 })
      expect(content.style.transform).toBe(held)
      touchPointer({ type: 'pointerup', y: 500, id: 2 })
      expect(refreshCalls).toHaveLength(0)
      expect(content.style.transition).toBe('none') // 첫 손가락은 아직 끌고 있다
    })

    it('가로로 먼저 움직이면 당김으로 보지 않는다(안쪽 가로 스크롤)', () => {
      register({ thresholdPx: 40 })
      touchPointer({ type: 'pointerdown', x: 100, y: 100, id: 1 })
      touchPointer({ type: 'pointermove', x: 140, y: 110, id: 1 })
      touchPointer({ type: 'pointermove', x: 150, y: 300, id: 1 })
      expect(content.style.transform).toBe('')
      touchPointer({ type: 'pointerup', x: 150, y: 300, id: 1 })
      expect(refreshCalls).toHaveLength(0)
    })

    it('아래로 당기는 터치는 touchmove를 막아 브라우저 스크롤에 뺏기지 않는다', () => {
      register()
      const touchEvent = ({ type, x, y }: { type: string; x: number; y: number }) => {
        const event = new Event(type, { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'touches', { value: [{ clientX: x, clientY: y }] })
        container.dispatchEvent(event)
        return event
      }
      touchPointer({ type: 'pointerdown', x: 100, y: 100, id: 1 })
      touchEvent({ type: 'touchstart', x: 100, y: 100 })
      expect(touchEvent({ type: 'touchmove', x: 102, y: 130 }).defaultPrevented).toBe(true)
      // 위로 올리는 손가락은 목록 스크롤이므로 막지 않는다
      expect(touchEvent({ type: 'touchmove', x: 102, y: 60 }).defaultPrevented).toBe(false)
    })

    it('스크롤이 내려가 있으면 touchmove를 막지 않는다', () => {
      register()
      ;(container as unknown as { scrollTop: number }).scrollTop = 120
      const start = new Event('touchstart', { bubbles: true, cancelable: true })
      Object.defineProperty(start, 'touches', { value: [{ clientX: 0, clientY: 100 }] })
      container.dispatchEvent(start)
      const move = new Event('touchmove', { bubbles: true, cancelable: true })
      Object.defineProperty(move, 'touches', { value: [{ clientX: 0, clientY: 160 }] })
      container.dispatchEvent(move)
      expect(move.defaultPrevented).toBe(false)
    })
  })

  describe('새로고침 중 상태와 정리', () => {
    it('새로고침 중에는 aria-busy가 붙고 끝나면 걷힌다', () => {
      register({ thresholdPx: 40 })
      pointer({ el: container, type: 'pointerdown', y: 100 })
      pointer({ el: container, type: 'pointermove', y: 300 })
      pointer({ el: container, type: 'pointerup', y: 300 })
      expect(container.getAttribute('aria-busy')).toBe('true')
      refreshCalls[0]()
      expect(container.hasAttribute('aria-busy')).toBe(false)
    })

    it('done()을 두 번 불러도 다음 당김을 망가뜨리지 않는다', () => {
      register({ thresholdPx: 40 })
      pointer({ el: container, type: 'pointerdown', y: 100 })
      pointer({ el: container, type: 'pointermove', y: 300 })
      pointer({ el: container, type: 'pointerup', y: 300 })
      refreshCalls[0]()
      pointer({ el: container, type: 'pointerdown', y: 100 })
      pointer({ el: container, type: 'pointermove', y: 300 })
      pointer({ el: container, type: 'pointerup', y: 300 })
      refreshCalls[0]() // 지난 새로고침의 done — 지금 도는 새로고침을 끝내면 안 된다
      expect(container.dataset.refreshing).toBe('true')
      refreshCalls[1]()
      expect(container.dataset.refreshing).toBe('false')
    })

    it('당기는 중에 해제하면 끌던 자리를 남기지 않는다', () => {
      const cleanup = register({ thresholdPx: 40 })
      pointer({ el: container, type: 'pointerdown', y: 100 })
      pointer({ el: container, type: 'pointermove', y: 160 })
      cleanup()
      expect(content.style.transform).toBe('')
      expect(content.style.transition).toBe('')
    })
  })
})
