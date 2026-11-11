import { createLongPress } from '@skills/long-press-menu/assets/createLongPress'
import { placeContextMenu } from '@skills/long-press-menu/assets/placeContextMenu'

/** jsdom에는 PointerEvent가 없다 — 코어가 읽는 button·clientX/Y는 MouseEvent에도 있으므로 타입명만 빌린다 */
const pointer = ({ el, type, x = 0, y = 0, button = 0 }: { el: HTMLElement; type: string; x?: number; y?: number; button?: number }) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button }))

describe('createLongPress — 길게 누르기 판정 코어', () => {
  let el: HTMLElement
  let presses: Array<{ x: number; y: number }>
  let controller: ReturnType<typeof createLongPress> | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('div')
    document.body.appendChild(el)
    presses = []
  })
  afterEach(() => {
    controller?.destroy()
    controller = undefined
    vi.useRealTimers()
    el.remove()
  })

  const register = (options: { delayMs?: number; moveTolerancePx?: number } = {}) => {
    controller = createLongPress({ target: el, onLongPress: (point) => presses.push(point), ...options })
  }

  it('지연 시간이 지나면 누른 좌표와 함께 발화한다', () => {
    register({ delayMs: 450 })
    pointer({ el, type: 'pointerdown', x: 40, y: 60 })

    vi.advanceTimersByTime(449)
    expect(presses).toHaveLength(0)

    vi.advanceTimersByTime(1)
    expect(presses).toEqual([{ x: 40, y: 60 }])
  })

  it('허용치보다 많이 움직이면(스크롤·드래그) 취소된다', () => {
    register({ delayMs: 450, moveTolerancePx: 10 })
    pointer({ el, type: 'pointerdown', x: 0, y: 0 })
    pointer({ el, type: 'pointermove', x: 3, y: 4 }) // 5px — 허용
    pointer({ el, type: 'pointermove', x: 0, y: 12 }) // 12px — 초과

    vi.advanceTimersByTime(1000)
    expect(presses).toHaveLength(0)
  })

  it('지연 전에 떼면 취소된다 — 짧은 탭은 그냥 탭이다', () => {
    register({ delayMs: 450 })
    pointer({ el, type: 'pointerdown' })
    vi.advanceTimersByTime(200)
    pointer({ el, type: 'pointerup' })

    vi.advanceTimersByTime(1000)
    expect(presses).toHaveLength(0)
  })

  it('contextmenu(우클릭)는 기다리지 않고 즉시 발화하며 브라우저 기본 메뉴를 막는다', () => {
    register()
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 15, clientY: 25 })
    el.dispatchEvent(event)

    expect(presses).toEqual([{ x: 15, y: 25 }])
    expect(event.defaultPrevented).toBe(true)
  })

  it('발화 뒤 따라오는 click은 한 번만 억제된다', () => {
    register({ delayMs: 450 })
    const clicks: boolean[] = []
    const record = (event: MouseEvent) => clicks.push(event.defaultPrevented)
    document.body.addEventListener('click', record)

    pointer({ el, type: 'pointerdown' })
    vi.advanceTimersByTime(450)
    pointer({ el, type: 'pointerup' })
    pointer({ el, type: 'click' })
    // 억제된 click은 캡처 단계에서 멈추므로 body까지 올라오지 않는다
    expect(clicks).toHaveLength(0)

    pointer({ el, type: 'pointerdown' })
    pointer({ el, type: 'pointerup' })
    pointer({ el, type: 'click' })
    expect(clicks).toEqual([false]) // 두 번째 클릭은 정상 통과
    document.body.removeEventListener('click', record)
  })
})

/** 1000×800 화면 한가운데 120×120 카드, 메뉴는 200×160 */
const base = {
  anchor: { top: 300, left: 400, width: 120, height: 120 },
  menu: { width: 200, height: 160 },
  viewport: { width: 1000, height: 800 },
}

describe('createLongPress — 두 번째 손가락', () => {
  let el: HTMLElement
  let presses: number
  let controller: ReturnType<typeof createLongPress>

  const idPointer = ({ type, x = 0, y = 0, id }: { type: string; x?: number; y?: number; id: number }) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })
    Object.defineProperty(event, 'pointerId', { value: id })
    el.dispatchEvent(event)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('div')
    document.body.appendChild(el)
    presses = 0
    controller = createLongPress({ target: el, onLongPress: () => (presses += 1) })
  })
  afterEach(() => {
    controller.destroy()
    vi.useRealTimers()
    el.remove()
  })

  it('누르는 중에 두 번째 손가락이 닿으면 취소한다(두 손가락은 확대·넘기기다)', () => {
    idPointer({ type: 'pointerdown', id: 1 })
    vi.advanceTimersByTime(200)
    idPointer({ type: 'pointerdown', id: 2 })
    vi.advanceTimersByTime(1000)
    expect(presses).toBe(0)
  })

  it('두 손가락을 다 뗀 뒤의 누름은 다시 받는다', () => {
    idPointer({ type: 'pointerdown', id: 1 })
    idPointer({ type: 'pointerdown', id: 2 })
    idPointer({ type: 'pointerup', id: 2 })
    idPointer({ type: 'pointerup', id: 1 })
    idPointer({ type: 'pointerdown', id: 3 })
    vi.advanceTimersByTime(450)
    expect(presses).toBe(1)
  })
})

describe('placeContextMenu — 앵커 아래 왼쪽 정렬, 안 맞으면 뒤집고 밀어 넣기', () => {
  it('아래 공간이 있으면 앵커 아래에 왼쪽 정렬로 붙고, 부족하면 위로 뒤집는다', () => {
    const below = placeContextMenu(base)
    expect(below).toEqual({ top: 428, left: 400, side: 'bottom' }) // 300 + 120 + 8(gap)

    const above = placeContextMenu({ ...base, anchor: { ...base.anchor, top: 700 } })
    expect(above.side).toBe('top')
    expect(above.top).toBe(532) // 700 - 8 - 160
  })

  it('좌우로 넘치면 8px 여백을 두고 화면 안으로 밀어 넣는다', () => {
    const right = placeContextMenu({ ...base, anchor: { ...base.anchor, left: 950 } })
    expect(right.left).toBe(792) // 1000 - 8 - 200

    const left = placeContextMenu({ ...base, anchor: { ...base.anchor, left: -30 } })
    expect(left.left).toBe(8)
  })
})
