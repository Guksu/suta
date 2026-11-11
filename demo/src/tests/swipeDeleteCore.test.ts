import { createSwipeDelete } from '@skills/swipe-to-delete/assets/createSwipeDelete'

const pointer = ({ el, type, x, y = 0 }: { el: HTMLElement; type: string; x: number; y?: number }) => {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }))
}

describe('createSwipeDelete — 축 잠금·스냅 열림·끝까지 밀기 판정', () => {
  let content: HTMLElement
  let swipedOut: number
  let openChanges: boolean[]
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] })
    content = document.createElement('div')
    document.body.appendChild(content)
    swipedOut = 0
    openChanges = []
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
    content.remove()
  })

  const register = (options: { swipeOutThresholdPx?: number; swipeOutVelocity?: number } = {}) => {
    const controller = createSwipeDelete({
      content,
      actionWidth: 88,
      onOpenChange: (open) => openChanges.push(open),
      onSwipeOut: () => (swipedOut += 1),
      ...options,
    })
    cleanups.push(controller.destroy)
    return controller
  }

  /** 시간 간격을 두고 여러 점을 지나가는 드래그 — 속도 계산이 0이 되지 않게 한다 */
  const drag = ({ from, to, steps = 4, msPerStep = 20 }: { from: number; to: number; steps?: number; msPerStep?: number }) => {
    pointer({ el: content, type: 'pointerdown', x: from })
    for (let i = 1; i <= steps; i += 1) {
      vi.advanceTimersByTime(msPerStep)
      pointer({ el: content, type: 'pointermove', x: from + ((to - from) * i) / steps })
    }
  }

  it('가로로 끌면 transition을 끄고 손가락을 따라 translateX가 붙는다', () => {
    register()
    drag({ from: 200, to: 160 })
    expect(content.style.transition).toBe('none')
    expect(content.style.transform).toBe('translateX(-40px)')
  })

  it('오른쪽으로는 0을 넘지 못한다', () => {
    register()
    drag({ from: 200, to: 260 })
    expect(content.style.transform).toBe('translateX(0px)')
  })

  it('처음 움직임이 세로면 이 드래그를 포기한다 (스크롤과 공존)', () => {
    register()
    pointer({ el: content, type: 'pointerdown', x: 200, y: 100 })
    pointer({ el: content, type: 'pointermove', x: 198, y: 130 })
    pointer({ el: content, type: 'pointermove', x: 150, y: 160 })
    expect(content.style.transform).toBe('')
    pointer({ el: content, type: 'pointerup', x: 150, y: 160 })
    expect(openChanges).toEqual([])
  })

  it('액션 폭의 절반을 넘겨 놓으면 -actionWidth에 열린다', () => {
    register()
    drag({ from: 200, to: 150, msPerStep: 200 }) // 느리게 — 튕김 판정 배제
    pointer({ el: content, type: 'pointerup', x: 150 })
    expect(content.style.transition).toBe('')
    expect(content.style.transform).toBe('translateX(-88px)')
    expect(openChanges).toEqual([true])
  })

  it('절반 미만이면 0으로 스냅백한다', () => {
    register()
    drag({ from: 200, to: 180, msPerStep: 200 })
    pointer({ el: content, type: 'pointerup', x: 180 })
    expect(content.style.transform).toBe('')
    expect(openChanges).toEqual([])
  })

  it('임계 거리를 넘기면 끝까지 밀려 삭제된다', () => {
    register()
    drag({ from: 400, to: 100, msPerStep: 200 }) // 300px ≥ 88*2.5
    pointer({ el: content, type: 'pointerup', x: 100 })
    expect(content.style.transform).toBe('translateX(-100%)')
    expect(swipedOut).toBe(1)
  })

  it('짧게 끌어도 세게 튕기면 삭제된다 (속도 판정)', () => {
    register({ swipeOutVelocity: 0.8 })
    drag({ from: 200, to: 140, steps: 2, msPerStep: 10 }) // 60px/20ms = 3px/ms
    pointer({ el: content, type: 'pointerup', x: 140 })
    expect(swipedOut).toBe(1)
  })

  it('열린 상태에서 오른쪽으로 끌어 놓으면 닫힌다', () => {
    const controller = register()
    controller.open()
    expect(openChanges).toEqual([true])
    drag({ from: 100, to: 170, msPerStep: 200 }) // base -88 + 70 = -18 → 절반 미만
    pointer({ el: content, type: 'pointerup', x: 170 })
    expect(content.style.transform).toBe('')
    expect(openChanges).toEqual([true, false])
  })

  it('삭제로 빠진 뒤에는 open/close/드래그가 되돌리지 못한다', () => {
    const controller = register()
    controller.swipeOut()
    controller.close()
    controller.open()
    drag({ from: 200, to: 190 })
    expect(content.style.transform).toBe('translateX(-100%)')
    expect(swipedOut).toBe(1)
  })

  it('destroy 뒤에는 이벤트에 반응하지 않는다', () => {
    const controller = register()
    controller.destroy()
    drag({ from: 200, to: 100 })
    expect(content.style.transform).toBe('')
  })
  describe('끊김·두 번째 손가락·뒤따르는 click', () => {
    const idPointer = ({ type, x, id }: { type: string; x: number; id: number }) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 0, button: 0 })
      Object.defineProperty(event, 'pointerId', { value: id })
      content.dispatchEvent(event)
    }

    it('pointercancel이면 세게 밀던 중이어도 삭제하지 않고 끌기 전 자리로 돌린다', () => {
      register()
      drag({ from: 300, to: 20, msPerStep: 5 }) // 임계 거리도 속도도 넘겼다
      pointer({ el: content, type: 'pointercancel', x: 20 })
      expect(swipedOut).toBe(0)
      expect(openChanges).toEqual([])
      expect(content.style.transform).toBe('')
      expect(content.style.transition).toBe('')
    })

    it('열린 행을 끌다 끊기면 열린 자리로 돌아간다', () => {
      const controller = register()
      controller.open()
      drag({ from: 200, to: 240 })
      pointer({ el: content, type: 'pointercancel', x: 240 })
      expect(content.style.transform).toBe('translateX(-88px)')
      expect(openChanges).toEqual([true])
    })

    it('두 번째 손가락의 움직임과 뗌은 무시한다', () => {
      register()
      idPointer({ type: 'pointerdown', x: 300, id: 1 })
      idPointer({ type: 'pointermove', x: 270, id: 1 })
      const held = content.style.transform
      idPointer({ type: 'pointerdown', x: 100, id: 2 })
      idPointer({ type: 'pointermove', x: 0, id: 2 })
      expect(content.style.transform).toBe(held)
      idPointer({ type: 'pointerup', x: 0, id: 2 })
      expect(content.style.transition).toBe('none') // 첫 손가락은 아직 끌고 있다
      expect(swipedOut).toBe(0)
    })

    it('가로로 끈 뒤에 따라오는 click은 한 번 막는다(행 눌러 상세로 가기와 겹치지 않게)', () => {
      register()
      let clicks = 0
      content.addEventListener('click', () => (clicks += 1))
      drag({ from: 300, to: 240 })
      pointer({ el: content, type: 'pointerup', x: 240 })
      content.click()
      expect(clicks).toBe(0)
      content.click()
      expect(clicks).toBe(1)
    })

    it('끌지 않은 누름의 click은 그대로 지나간다', () => {
      register()
      let clicks = 0
      content.addEventListener('click', () => (clicks += 1))
      pointer({ el: content, type: 'pointerdown', x: 300 })
      pointer({ el: content, type: 'pointerup', x: 300 })
      content.click()
      expect(clicks).toBe(1)
    })

    it('열린 행의 내용을 누르면 닫히고 그 click은 내용에 닿지 않는다', () => {
      const controller = register()
      controller.open()
      let clicks = 0
      content.addEventListener('click', () => (clicks += 1))
      pointer({ el: content, type: 'pointerdown', x: 100 })
      pointer({ el: content, type: 'pointerup', x: 100 })
      content.click()
      expect(openChanges).toEqual([true, false])
      expect(clicks).toBe(0)
    })

    it('열린 행의 액션 버튼을 누르면 닫지 않는다(버튼의 click이 살아야 한다)', () => {
      const controller = register()
      const actions = document.createElement('div')
      actions.className = 'swipe-actions'
      const button = document.createElement('button')
      actions.appendChild(button)
      content.appendChild(actions)
      controller.open()
      let clicks = 0
      button.addEventListener('click', () => (clicks += 1))
      pointer({ el: button, type: 'pointerdown', x: 400 })
      pointer({ el: button, type: 'pointerup', x: 400 })
      button.click()
      expect(openChanges).toEqual([true])
      expect(clicks).toBe(1)
    })

    it('끄는 중에 destroy하면 꺼 둔 transition을 남기지 않는다', () => {
      const controller = register()
      drag({ from: 300, to: 260 })
      controller.destroy()
      expect(content.style.transition).toBe('')
      expect(content.style.transform).toBe('')
    })
  })
})
