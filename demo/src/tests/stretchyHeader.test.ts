import { createStretchyHeader } from '@skills/stretchy-header/assets/createStretchyHeader'

// jsdom에는 PointerEvent가 없다 — 코어는 clientX/Y·button만 읽으므로 MouseEvent로 대체한다
const pointer = ({ el, type, x = 0, y }: { el: EventTarget; type: string; x?: number; y: number }) => {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }))
}

describe('createStretchyHeader — 당김 제스처와 스크롤 패럴랙스', () => {
  let container: HTMLElement
  let image: HTMLElement
  let destroy: () => void

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    container = document.createElement('div')
    image = document.createElement('div')
    container.appendChild(image)
    document.body.appendChild(container)
    Object.defineProperty(container, 'scrollTop', { value: 0, writable: true })
    destroy = createStretchyHeader({ container, image, headerHeight: 240 })
  })
  afterEach(() => {
    destroy()
    vi.useRealTimers()
    container.remove()
  })

  it('맨 위에서 아래로 당기면 transform에 scale이 들어가고(위 가장자리 고정), 전환은 꺼진다', () => {
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 220 })
    const match = image.style.transform.match(/scale\((\d+(?:\.\d+)?)\)/)
    expect(match).not.toBeNull()
    expect(Number(match![1])).toBeGreaterThan(1)
    expect(image.style.transform).toContain('translateY(0px)')
    expect(image.dataset.stretch).toBe('pulling')
  })

  it('놓으면 transform이 비워지고 CSS 전환으로 복귀한다(data-stretch=release)', () => {
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 220 })
    pointer({ el: window, type: 'pointerup', y: 220 })
    expect(image.style.transform).toBe('')
    expect(image.dataset.stretch).toBe('release')
  })

  it('가로로 먼저 움직이면 당김을 포기하고, 스크롤 중(scrollTop>0)에는 당김을 시작하지 않는다', () => {
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', x: 40, y: 104 })
    pointer({ el: container, type: 'pointermove', x: 40, y: 200 })
    expect(image.style.transform).toBe('')
    ;(container as unknown as { scrollTop: number }).scrollTop = 80
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: container, type: 'pointermove', y: 220 })
    expect(image.style.transform).not.toContain('scale')
  })

  it('스크롤하면 rAF 한 번에 패럴랙스(절반 속도 translateY·페이드)가 적용되고 destroy 후엔 멈춘다', () => {
    ;(container as unknown as { scrollTop: number }).scrollTop = 100
    container.dispatchEvent(new Event('scroll'))
    container.dispatchEvent(new Event('scroll')) // 같은 프레임의 중복 이벤트는 합쳐진다
    vi.advanceTimersToNextFrame()
    expect(image.style.transform).toBe('translateY(50px)')
    expect(Number(image.style.opacity)).toBeCloseTo(1 - 0.7 * (100 / 240))
    destroy()
    expect(image.style.transform).toBe('')
    ;(container as unknown as { scrollTop: number }).scrollTop = 200
    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersToNextFrame()
    expect(image.style.transform).toBe('')
  })

  it('iOS처럼 scrollTop이 음수면 native 늘어남 — 이미지를 그만큼 올려 붙이고 scale로 채운다', () => {
    ;(container as unknown as { scrollTop: number }).scrollTop = -60
    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersToNextFrame()
    expect(image.style.transform).toBe('translateY(-60px) scale(1.25)')
  })
})

describe('createStretchyHeader — 상태와 경계', () => {
  let container: HTMLElement
  let image: HTMLElement
  let destroy: () => void = () => {}

  const setScroll = (value: number) => {
    ;(container as unknown as { scrollTop: number }).scrollTop = value
  }
  const pointerWithId = ({ el, type, y, id }: { el: EventTarget; type: string; y: number; id: number }) => {
    const event = new MouseEvent(type, { bubbles: true, clientX: 0, clientY: y, button: 0 })
    Object.defineProperty(event, 'pointerId', { value: id })
    el.dispatchEvent(event)
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    container = document.createElement('div')
    image = document.createElement('div')
    container.appendChild(image)
    document.body.appendChild(container)
    Object.defineProperty(container, 'scrollTop', { value: 0, writable: true })
  })
  afterEach(() => {
    destroy()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    container.remove()
  })

  it('당기는 중에 스크롤이 시작되면(휠) 당김을 그만두고 패럴랙스에 넘긴다', () => {
    destroy = createStretchyHeader({ container, image, headerHeight: 240 })
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: window, type: 'pointermove', y: 160 })
    expect(image.style.transform).toContain('scale')
    setScroll(80)
    pointer({ el: window, type: 'pointermove', y: 200 })
    expect(image.style.transform).not.toContain('scale')
    expect(image.dataset.stretch).not.toBe('pulling')
  })

  it('두 번째 손가락은 당김의 기준점을 바꾸지 않는다', () => {
    destroy = createStretchyHeader({ container, image, headerHeight: 240 })
    pointerWithId({ el: container, type: 'pointerdown', y: 100, id: 1 })
    pointerWithId({ el: window, type: 'pointermove', y: 160, id: 1 })
    const before = image.style.transform
    pointerWithId({ el: container, type: 'pointerdown', y: 400, id: 2 })
    pointerWithId({ el: window, type: 'pointermove', y: 420, id: 2 })
    expect(image.style.transform).toBe(before)
    pointerWithId({ el: window, type: 'pointerup', y: 420, id: 2 })
    expect(image.dataset.stretch).toBe('pulling')
    pointerWithId({ el: window, type: 'pointerup', y: 160, id: 1 })
    expect(image.dataset.stretch).toBe('release')
  })

  it('놓은 뒤의 복귀 전환(release)은 바운스 프레임이 오면 꺼진다 — 켜진 채면 프레임마다 300ms씩 뒤따라간다', () => {
    destroy = createStretchyHeader({ container, image, headerHeight: 240 })
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: window, type: 'pointermove', y: 160 })
    pointer({ el: window, type: 'pointerup', y: 160 })
    expect(image.dataset.stretch).toBe('release')
    setScroll(-30)
    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersToNextFrame()
    expect(image.dataset.stretch).toBeUndefined()
  })

  it('headerHeight를 주지 않으면 이미지 크기가 바뀔 때(숨겨진 채 마운트·화면 폭에 따라 다른 높이) 다시 잰다', () => {
    let notify = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    let measured = 0
    Object.defineProperty(image, 'offsetHeight', { get: () => measured })
    destroy = createStretchyHeader({ container, image })

    // 숨겨진 채 마운트됐다 — 높이 0이라 아무것도 하지 않는다
    setScroll(100)
    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersToNextFrame()
    expect(image.style.transform).toBe('')

    measured = 200
    notify()
    expect(image.style.transform).toBe('translateY(50px)')
    expect(Number(image.style.opacity)).toBeCloseTo(1 - 0.7 * (100 / 200))
  })

  it('동작 줄이기를 화면이 떠 있는 동안 켜도 다음 프레임부터 이동을 멈춘다', () => {
    const query = { matches: false }
    vi.stubGlobal('matchMedia', () => query)
    destroy = createStretchyHeader({ container, image, headerHeight: 240 })
    setScroll(100)
    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersToNextFrame()
    expect(image.style.transform).toBe('translateY(50px)')

    query.matches = true
    setScroll(120)
    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersToNextFrame()
    expect(image.style.transform).toBe('')
    expect(Number(image.style.opacity)).toBeCloseTo(1 - 0.7 * (120 / 240))
    pointer({ el: container, type: 'pointerdown', y: 100 })
    setScroll(0)
    pointer({ el: container, type: 'pointerdown', y: 100 })
    pointer({ el: window, type: 'pointermove', y: 160 })
    expect(image.style.transform).not.toContain('scale')
  })
})
