import { createEdgeSwipe } from '@skills/edge-swipe-back/assets/createEdgeSwipe'

const pointer = ({ el, type, x, y = 100, t }: { el: HTMLElement; type: string; x: number; y?: number; t: number }) => {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
  Object.defineProperty(event, 'timeStamp', { value: t })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  el.dispatchEvent(event)
}

describe('createEdgeSwipe — 가장자리 캡처·추종·커밋/취소 스프링', () => {
  let container: HTMLElement
  let screen: HTMLElement
  let underlay: HTMLElement
  let dim: HTMLElement
  let backs: number
  let canGoBack: boolean
  let destroy: (() => void) | undefined

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
    container = document.createElement('div')
    underlay = document.createElement('div')
    dim = document.createElement('div')
    screen = document.createElement('div')
    container.append(underlay, dim, screen)
    document.body.appendChild(container)
    // jsdom에는 레이아웃이 없다 — 컨테이너 폭 400px을 직접 준다
    container.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 600 }) as DOMRect
    backs = 0
    canGoBack = true
  })
  afterEach(() => {
    destroy?.()
    destroy = undefined
    vi.useRealTimers()
    vi.unstubAllGlobals()
    container.remove()
  })

  const bind = (options: Partial<Parameters<typeof createEdgeSwipe>[0]> = {}) => {
    const controller = createEdgeSwipe({
      container,
      screen,
      underlay,
      dim,
      canGoBack: () => canGoBack,
      onBack: () => (backs += 1),
      ...options,
    })
    destroy = controller.destroy
    return controller
  }

  it('가장자리 밖에서 시작한 드래그는 무시한다', () => {
    const c = bind()
    pointer({ el: container, type: 'pointerdown', x: 120, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 220, t: 16 })
    expect(screen.style.transform).toBe('')
    expect(c.progress).toBe(0)
  })

  it('canGoBack이 false면 가장자리에서 시작해도 무시한다', () => {
    canGoBack = false
    bind()
    pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 110, t: 16 })
    expect(screen.style.transform).toBe('')
  })

  it('드래그 중 현재 화면은 px로 따라오고 이전 화면·어둠은 진행도로 계산된다', () => {
    const c = bind()
    pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 110, t: 16 }) // dx 100 / 400 → 0.25
    expect(screen.style.transition).toBe('none')
    expect(screen.style.transform).toBe('translateX(100px)')
    expect(underlay.style.transform).toBe('translateX(-22.5%)')
    expect(Number(dim.style.opacity)).toBeCloseTo(0.3)
    expect(container.dataset.edgeSwipe).toBe('dragging')
    expect(c.progress).toBe(0.25)
  })

  it('처음 움직임이 세로면 이 드래그를 포기한다 (스크롤과 공존)', () => {
    bind()
    pointer({ el: container, type: 'pointerdown', x: 10, y: 100, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 12, y: 130, t: 16 })
    pointer({ el: container, type: 'pointermove', x: 120, y: 160, t: 32 })
    expect(screen.style.transform).toBe('')
    pointer({ el: container, type: 'pointerup', x: 120, y: 160, t: 48 })
    expect(backs).toBe(0)
  })

  it('임계를 넘겨 놓으면 스프링으로 끝까지 간 뒤 onBack이 한 번 불리고 transform이 초기화된다', () => {
    const c = bind()
    pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 210, y: 100, t: 300 }) // 0.5 ≥ 0.4, 느리게(속도 판정 배제)
    pointer({ el: container, type: 'pointerup', x: 210, t: 320 })
    expect(backs).toBe(0) // 아직 스프링 중
    expect(container.dataset.edgeSwipe).toBe('settling')
    vi.advanceTimersByTime(3000)
    expect(backs).toBe(1)
    expect(c.progress).toBe(0)
    expect(screen.style.transform).toBe('')
    expect(screen.style.transition).toBe('')
    expect(underlay.style.transform).toBe('')
    expect(dim.style.opacity).toBe('')
    expect(container.dataset.edgeSwipe).toBeUndefined()
  })

  it('임계 미만에서 놓으면 0으로 되돌아오고 onBack은 불리지 않는다', () => {
    const c = bind()
    pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 90, t: 300 }) // 0.2 < 0.4
    pointer({ el: container, type: 'pointerup', x: 90, t: 320 })
    vi.advanceTimersByTime(3000)
    expect(backs).toBe(0)
    expect(c.progress).toBe(0)
    expect(screen.style.transform).toBe('')
  })

  it('짧게 끌어도 오른쪽으로 세게 튕기면 간다 (속도 판정)', () => {
    bind()
    pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 30, t: 10 })
    pointer({ el: container, type: 'pointermove', x: 50, t: 20 }) // 2px/ms
    pointer({ el: container, type: 'pointerup', x: 50, t: 24 })
    vi.advanceTimersByTime(3000)
    expect(backs).toBe(1)
  })

  it('reduced-motion이면 놓는 즉시 커밋한다 (스프링 없음)', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    bind()
    pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 210, t: 300 })
    pointer({ el: container, type: 'pointerup', x: 210, t: 320 })
    expect(backs).toBe(1)
    expect(screen.style.transform).toBe('')
  })

  it('destroy 뒤에는 반응하지 않는다', () => {
    const c = bind()
    c.destroy()
    destroy = undefined
    pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 110, t: 16 })
    expect(screen.style.transform).toBe('')
  })

  describe('포인터 캡처·두 번째 손가락·끊김', () => {
    const idPointer = ({ type, x, y = 100, t, id }: { type: string; x: number; y?: number; t: number; id: number }) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
      Object.defineProperty(event, 'timeStamp', { value: t })
      Object.defineProperty(event, 'pointerId', { value: id })
      container.dispatchEvent(event)
    }

    it('누르는 순간에는 포인터를 잡지 않는다 — 잡으면 가장자리 24px 안 버튼의 click이 상자로 간다', () => {
      const captured: number[] = []
      container.setPointerCapture = (id: number) => void captured.push(id)
      bind()
      pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
      expect(captured).toEqual([])
      pointer({ el: container, type: 'pointermove', x: 30, t: 16 }) // 가로로 6px 넘게 — 여기서 끌기가 된다
      expect(captured).toEqual([1])
    })

    it('두 번째 손가락은 끌기를 가로채지 못한다', () => {
      const c = bind()
      idPointer({ type: 'pointerdown', x: 10, t: 0, id: 1 })
      idPointer({ type: 'pointermove', x: 110, t: 16, id: 1 })
      expect(c.progress).toBeCloseTo(0.25)
      idPointer({ type: 'pointerdown', x: 5, t: 20, id: 2 })
      idPointer({ type: 'pointermove', x: 395, t: 36, id: 2 })
      expect(c.progress).toBeCloseTo(0.25)
      idPointer({ type: 'pointerup', x: 395, t: 40, id: 2 })
      idPointer({ type: 'pointermove', x: 210, t: 50, id: 1 })
      expect(c.progress).toBeCloseTo(0.5) // 첫 손가락은 여전히 끌고 있다
    })

    it('pointercancel이면 임계를 넘겼어도 돌아가지 않고 제자리로 복귀한다', () => {
      const c = bind()
      pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
      pointer({ el: container, type: 'pointermove', x: 310, t: 16 })
      pointer({ el: container, type: 'pointercancel', x: 310, t: 32 })
      vi.advanceTimersByTime(3000)
      expect(backs).toBe(0)
      expect(c.progress).toBe(0)
      expect(screen.style.transform).toBe('')
    })

    it('포인터 캡처를 잃으면(창이 포커스를 잃음) 끌기를 끝내고 제자리로 복귀한다', () => {
      const c = bind()
      pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
      pointer({ el: container, type: 'pointermove', x: 310, t: 16 })
      pointer({ el: container, type: 'lostpointercapture', x: 310, t: 32 })
      pointer({ el: container, type: 'pointermove', x: 380, t: 48 }) // 끝난 끌기 — 따라가지 않는다
      vi.advanceTimersByTime(3000)
      expect(backs).toBe(0)
      expect(c.progress).toBe(0)
    })
  })
})

describe('createEdgeSwipe — CSS 변수를 기준값으로 읽는다', () => {
  it('--edge-shift·--edge-dim이 컨테이너에 있으면 옵션 없이도 그 값으로 이전 화면을 움직인다', () => {
    const container = document.createElement('div')
    const screen = document.createElement('div')
    const underlay = document.createElement('div')
    const dim = document.createElement('div')
    container.append(underlay, dim, screen)
    document.body.appendChild(container)
    container.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 600 }) as DOMRect
    container.style.setProperty('--edge-shift', '50%')
    container.style.setProperty('--edge-dim', '0.8')
    const c = createEdgeSwipe({ container, screen, underlay, dim, canGoBack: () => true, onBack: () => {} })
    pointer({ el: container, type: 'pointerdown', x: 10, t: 0 })
    pointer({ el: container, type: 'pointermove', x: 210, t: 16 }) // 0.5
    expect(underlay.style.transform).toBe('translateX(-25%)')
    expect(Number(dim.style.opacity)).toBeCloseTo(0.4)
    c.destroy()
    container.remove()
  })
})
