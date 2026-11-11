import { createDragReorder } from '@skills/drag-to-reorder/assets/createDragReorder'

const ITEM_HEIGHT = 50
const GAP = 10
const SLOT = ITEM_HEIGHT + GAP

type ReorderDetail = { id: string; from: number; to: number; total: number }

/** jsdom은 레이아웃을 계산하지 않는다 — 항목 위치를 직접 심는다 (높이 50, 간격 10) */
const stubRect = ({ el, index }: { el: HTMLElement; index: number }) => {
  const top = index * SLOT
  el.getBoundingClientRect = () =>
    ({ top, bottom: top + ITEM_HEIGHT, height: ITEM_HEIGHT, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
}

const pointer = ({
  el,
  type,
  y,
  x = 0,
  pointerType = 'touch',
}: {
  el: HTMLElement | Window
  type: string
  y: number
  x?: number
  pointerType?: string
}) => {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  el.dispatchEvent(event)
}

describe('createDragReorder — 끌어서 순서 바꾸기', () => {
  let container: HTMLElement
  let items: HTMLElement[]
  let handles: HTMLElement[]
  let reorders: ReorderDetail[]
  let dragChanges: Array<string | null>
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('ul')
    document.body.appendChild(container)
    items = []
    handles = []
    reorders = []
    dragChanges = []

    for (let i = 0; i < 4; i += 1) {
      const item = document.createElement('li')
      item.dataset.reorderId = `item-${i}`
      const handle = document.createElement('button')
      handle.setAttribute('data-reorder-handle', '')
      item.appendChild(handle)
      container.appendChild(item)
      stubRect({ el: item, index: i })
      items.push(item)
      handles.push(handle)
    }
  })

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
    container.remove()
  })

  const register = (options: { longPressMs?: number } = {}) => {
    const controller = createDragReorder({
      container,
      ...options,
      onDragChange: (id) => dragChanges.push(id),
      onReorder: (detail) => reorders.push(detail),
    })
    cleanups.push(controller.destroy)
    return controller
  }

  it('손잡이를 끌면 그 항목만 전환 없이 손가락을 따라온다', () => {
    register()
    pointer({ el: handles[0], type: 'pointerdown', y: 25 })
    pointer({ el: window, type: 'pointermove', y: 55 })

    expect(items[0].dataset.dragging).toBe('true')
    expect(items[0].style.transform).toBe('translateY(30px) scale(1.02)')
    expect(container.dataset.reordering).toBe('true')
    expect(dragChanges).toEqual(['item-0'])
  })

  it('다른 항목의 중심을 지나가면 그 항목이 자리를 비켜 준다', () => {
    register()
    pointer({ el: handles[0], type: 'pointerdown', y: 25 })
    pointer({ el: window, type: 'pointermove', y: 95 }) // 중심 25→95, 두 번째 항목 중심(85)을 지남

    expect(items[1].style.transform).toBe(`translateY(-${SLOT}px)`)
    expect(items[2].style.transform).toBe('')
  })

  it('놓으면 빈 자리로 정착한 뒤에야 새 순서를 알린다', () => {
    register()
    pointer({ el: handles[0], type: 'pointerdown', y: 25 })
    pointer({ el: window, type: 'pointermove', y: 95 })
    pointer({ el: window, type: 'pointerup', y: 95 })

    // 정착 이동 중 — 아직 순서는 바뀌지 않았다
    expect(items[0].style.transform).toBe(`translateY(${SLOT}px)`)
    expect(reorders).toEqual([])

    vi.advanceTimersByTime(300)
    expect(items[0].style.transform).toBe('')
    expect(items[0].dataset.dragging).toBeUndefined()
    expect(container.dataset.reordering).toBeUndefined()
    expect(reorders).toEqual([{ id: 'item-0', from: 0, to: 1, total: 4 }])
    expect(dragChanges).toEqual(['item-0', null])
  })

  it('위로도 옮길 수 있다', () => {
    register()
    pointer({ el: handles[2], type: 'pointerdown', y: 145 })
    pointer({ el: window, type: 'pointermove', y: 55 }) // 중심 145→55, 첫 항목 중심(25)보다 아래 두 번째(85) 위
    expect(items[1].style.transform).toBe(`translateY(${SLOT}px)`)

    pointer({ el: window, type: 'pointerup', y: 55 })
    vi.advanceTimersByTime(300)
    expect(reorders).toEqual([{ id: 'item-2', from: 2, to: 1, total: 4 }])
  })

  it('제자리에 놓으면 순서를 바꾸지 않는다', () => {
    register()
    pointer({ el: handles[0], type: 'pointerdown', y: 25 })
    pointer({ el: window, type: 'pointermove', y: 40 })
    pointer({ el: window, type: 'pointerup', y: 40 })
    vi.advanceTimersByTime(300)

    expect(reorders).toEqual([])
    expect(items[0].style.transform).toBe('')
  })

  it('손잡이가 아닌 곳을 누르면 시작하지 않는다 (기본값)', () => {
    register()
    pointer({ el: items[0], type: 'pointerdown', y: 25 })
    pointer({ el: window, type: 'pointermove', y: 95 })

    expect(items[0].dataset.dragging).toBeUndefined()
    expect(dragChanges).toEqual([])
  })

  it('longPressMs를 주면 항목 전체를 길게 눌러 끌 수 있다', () => {
    register({ longPressMs: 250 })
    pointer({ el: items[0], type: 'pointerdown', y: 25 })
    expect(items[0].dataset.dragging).toBeUndefined()

    vi.advanceTimersByTime(250)
    expect(items[0].dataset.dragging).toBe('true')
  })

  it('길게 누르는 동안 손가락이 움직이면 스크롤로 보고 포기한다', () => {
    register({ longPressMs: 250 })
    pointer({ el: items[0], type: 'pointerdown', y: 25 })
    pointer({ el: window, type: 'pointermove', y: 60 })
    vi.advanceTimersByTime(250)

    expect(items[0].dataset.dragging).toBeUndefined()
  })

  it('마우스는 길게 누르기를 기다리지 않는다', () => {
    register({ longPressMs: 250 })
    pointer({ el: items[0], type: 'pointerdown', y: 25, pointerType: 'mouse' })

    expect(items[0].dataset.dragging).toBe('true')
  })

  it('손잡이에 포커스한 채 방향키로 옮길 수 있다 (드래그 없이)', () => {
    register()
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    handles[0].dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(reorders).toEqual([{ id: 'item-0', from: 0, to: 1, total: 4 }])
  })

  it('목록 끝을 넘어가는 방향키는 무시한다', () => {
    register()
    handles[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }))
    handles[3].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))

    expect(reorders).toEqual([])
  })

  it('destroy 뒤에는 반응하지 않는다', () => {
    const controller = register()
    controller.destroy()
    pointer({ el: handles[0], type: 'pointerdown', y: 25 })
    pointer({ el: window, type: 'pointermove', y: 95 })

    expect(items[0].dataset.dragging).toBeUndefined()
  })
  describe('끊김·취소·두 번째 손가락·정리', () => {
    const idPointer = ({ el, type, y, id }: { el: HTMLElement | Window; type: string; y: number; id: number }) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: 0, clientY: y, button: 0 })
      Object.defineProperty(event, 'pointerType', { value: 'touch' })
      Object.defineProperty(event, 'pointerId', { value: id })
      el.dispatchEvent(event)
    }

    it('pointercancel이면 옮기던 자리를 확정하지 않고 원래 자리로 돌린다', () => {
      register()
      pointer({ el: handles[0], type: 'pointerdown', y: 25 })
      pointer({ el: window, type: 'pointermove', y: 95 })
      pointer({ el: window, type: 'pointercancel', y: 95 })

      expect(items[0].style.transform).toBe('translateY(0px)')
      expect(items[1].style.transform).toBe('') // 비켜 준 이웃도 돌아온다
      vi.advanceTimersByTime(300)
      expect(reorders).toEqual([])
      expect(container.dataset.reordering).toBeUndefined()
      expect(dragChanges).toEqual(['item-0', null])
    })

    it('끄는 중에 Esc를 누르면 취소한다', () => {
      register()
      pointer({ el: handles[0], type: 'pointerdown', y: 25 })
      pointer({ el: window, type: 'pointermove', y: 155 })
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      vi.advanceTimersByTime(300)
      expect(reorders).toEqual([])
      expect(items[0].dataset.dragging).toBeUndefined()
      // 취소된 뒤의 pointerup은 아무것도 확정하지 않는다
      pointer({ el: window, type: 'pointerup', y: 155 })
      vi.advanceTimersByTime(300)
      expect(reorders).toEqual([])
    })

    it('끄는 중에 창이 포커스를 잃으면 취소한다(pointerup을 받지 못한다)', () => {
      register()
      pointer({ el: handles[0], type: 'pointerdown', y: 25 })
      pointer({ el: window, type: 'pointermove', y: 95 })
      window.dispatchEvent(new Event('blur'))
      vi.advanceTimersByTime(300)
      expect(reorders).toEqual([])
      expect(container.dataset.reordering).toBeUndefined()
    })

    it('두 번째 손가락의 움직임과 뗌은 무시한다', () => {
      register()
      idPointer({ el: handles[0], type: 'pointerdown', y: 25, id: 1 })
      idPointer({ el: window, type: 'pointermove', y: 35, id: 1 })
      idPointer({ el: window, type: 'pointermove', y: 200, id: 2 })
      expect(items[0].style.transform).toBe('translateY(10px) scale(1.02)')
      idPointer({ el: window, type: 'pointerup', y: 200, id: 2 })
      expect(items[0].dataset.dragging).toBe('true')
    })

    it('정착하는 동안에는 새 끌기를 시작하지 않는다', () => {
      register()
      pointer({ el: handles[0], type: 'pointerdown', y: 25 })
      pointer({ el: window, type: 'pointermove', y: 95 })
      pointer({ el: window, type: 'pointerup', y: 95 })
      pointer({ el: handles[2], type: 'pointerdown', y: 145 })
      expect(items[2].dataset.dragging).toBeUndefined()
      vi.advanceTimersByTime(300)
      expect(reorders).toHaveLength(1)
      pointer({ el: handles[2], type: 'pointerdown', y: 145 })
      expect(items[2].dataset.dragging).toBe('true')
    })

    it('정착 전환이 꺼져 있으면(동작 줄이기) 타이머를 기다리지 않고 바로 확정한다', () => {
      register()
      items[0].style.transitionDuration = '0s'
      pointer({ el: handles[0], type: 'pointerdown', y: 25 })
      pointer({ el: window, type: 'pointermove', y: 95 })
      pointer({ el: window, type: 'pointerup', y: 95 })
      expect(reorders).toEqual([{ id: 'item-0', from: 0, to: 1, total: 4 }])
      expect(items[0].style.transform).toBe('')
    })

    it('끄는 중에 destroy하면 옮기던 흔적을 지우고 순서는 바꾸지 않는다', () => {
      const controller = register()
      pointer({ el: handles[0], type: 'pointerdown', y: 25 })
      pointer({ el: window, type: 'pointermove', y: 95 })
      controller.destroy()
      expect(items[0].style.transform).toBe('')
      expect(items[1].style.transform).toBe('')
      expect(items[0].dataset.dragging).toBeUndefined()
      expect(container.dataset.reordering).toBeUndefined()
      vi.advanceTimersByTime(300)
      expect(reorders).toEqual([])
    })

    it('항목이 하나뿐이면 끌어도 순서를 알리지 않는다', () => {
      items.slice(1).forEach((item) => item.remove())
      register()
      pointer({ el: handles[0], type: 'pointerdown', y: 25 })
      pointer({ el: window, type: 'pointermove', y: 300 })
      pointer({ el: window, type: 'pointerup', y: 300 })
      vi.advanceTimersByTime(300)
      expect(reorders).toEqual([])
      expect(items[0].style.transform).toBe('')
    })
  })
})
