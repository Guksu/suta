import { createPinchZoom } from '@skills/pinch-zoom/assets/createPinchZoom'

type T = { clientX: number; clientY: number }

/** jsdom에는 TouchEvent/Touch 생성자가 없다 — touches만 얹은 일반 이벤트로 대신한다 */
const touch = ({ el, type, touches }: { el: HTMLElement; type: string; touches: T[] }) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: touches.map((t, i) => ({ identifier: i, ...t })) })
  el.dispatchEvent(event)
  return event
}

describe('createPinchZoom — 두 손가락 추종·복귀·상태', () => {
  let element: HTMLElement
  let target: HTMLElement
  let states: Array<{ scale: number; active: boolean }>
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers()
    element = document.createElement('div')
    target = document.createElement('div')
    element.appendChild(target)
    document.body.appendChild(element)
    states = []
    cleanups.push(createPinchZoom({ element, target, onChange: (s) => states.push(s) }))
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
    element.remove()
  })

  const TWO: T[] = [{ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 100 }]

  it('한 손가락은 무시한다 (세로 스크롤은 브라우저 몫)', () => {
    touch({ el: element, type: 'touchstart', touches: [TWO[0]] })
    const move = touch({ el: element, type: 'touchmove', touches: [{ clientX: 100, clientY: 150 }] })
    expect(element.hasAttribute('data-zooming')).toBe(false)
    expect(move.defaultPrevented).toBe(false)
    expect(target.style.transform).toBe('')
  })

  it('두 손가락이 닿으면 active가 되고 중점이 transform-origin이 된다', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    expect(element.getAttribute('data-zooming')).toBe('active')
    expect(target.style.transformOrigin).toBe('150px 100px')
    expect(target.style.transition).toBe('none')
    expect(states.at(-1)).toEqual({ scale: 1, active: true })
  })

  it('두 손가락 이동은 preventDefault하고 손가락을 따라 translate·scale이 붙는다', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    const move = touch({
      el: element,
      type: 'touchmove',
      touches: [{ clientX: 60, clientY: 120 }, { clientX: 260, clientY: 120 }],
    })
    expect(move.defaultPrevented).toBe(true)
    expect(target.style.transform).toBe('translate(10px, 20px) scale(2)')
    expect(element.style.getPropertyValue('--pinch-progress')).toBe('1')
    expect(states.at(-1)).toEqual({ scale: 2, active: true })
  })

  it('손가락을 떼면 인라인 transform을 걷어 settling이 되고, transitionend 뒤 상태가 해제된다', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    touch({ el: element, type: 'touchmove', touches: [{ clientX: 50, clientY: 100 }, { clientX: 250, clientY: 100 }] })
    touch({ el: element, type: 'touchend', touches: [TWO[0]] })
    expect(target.style.transform).toBe('')
    expect(target.style.transition).toBe('')
    expect(element.getAttribute('data-zooming')).toBe('settling')
    expect(element.style.getPropertyValue('--pinch-progress')).toBe('0')
    target.dispatchEvent(new Event('transitionend'))
    expect(element.hasAttribute('data-zooming')).toBe(false)
    expect(states.at(-1)).toEqual({ scale: 1, active: false })
  })

  it('transitionend가 오지 않아도 폴백 타이머로 해제된다', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    touch({ el: element, type: 'touchmove', touches: [{ clientX: 50, clientY: 100 }, { clientX: 250, clientY: 100 }] })
    touch({ el: element, type: 'touchend', touches: [] })
    vi.advanceTimersByTime(500)
    expect(element.hasAttribute('data-zooming')).toBe(false)
  })

  it('움직이지 않고 떼면 전이가 없으므로 즉시 해제된다', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    touch({ el: element, type: 'touchend', touches: [] })
    expect(element.hasAttribute('data-zooming')).toBe(false)
  })

  it('핀치 중 한 손가락이 빠지면 즉시 복귀한다', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    touch({ el: element, type: 'touchmove', touches: [{ clientX: 50, clientY: 100 }, { clientX: 250, clientY: 100 }] })
    touch({ el: element, type: 'touchmove', touches: [{ clientX: 50, clientY: 100 }] })
    expect(target.style.transform).toBe('')
    expect(element.getAttribute('data-zooming')).toBe('settling')
  })

  it('destroy 뒤에는 반응하지 않는다', () => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    touch({ el: element, type: 'touchstart', touches: TWO })
    expect(element.hasAttribute('data-zooming')).toBe(false)
  })
  it('배율은 그대로 두고 옮기기만 했어도 복귀 전이를 거친다(곧바로 해제하면 돌아오는 사진이 형제 아래로 깔린다)', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    touch({ el: element, type: 'touchmove', touches: [{ clientX: 100, clientY: 160 }, { clientX: 200, clientY: 160 }] })
    expect(target.style.transform).toBe('translate(0px, 60px) scale(1)')
    touch({ el: element, type: 'touchend', touches: [] })
    expect(element.getAttribute('data-zooming')).toBe('settling')
    target.dispatchEvent(new Event('transitionend'))
    expect(element.hasAttribute('data-zooming')).toBe(false)
  })

  it('요소 밖에 댄 손가락을 떼어도 복귀한다(touchend가 요소로 오지 않는다)', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    touch({ el: element, type: 'touchmove', touches: [{ clientX: 50, clientY: 100 }, { clientX: 250, clientY: 100 }] })
    touch({ el: document.body, type: 'touchend', touches: [TWO[1]] })
    expect(target.style.transform).toBe('')
    expect(element.getAttribute('data-zooming')).toBe('settling')
  })

  it('복귀 전이가 꺼져 있으면(동작 줄이기) 폴백 타이머를 기다리지 않고 바로 해제한다', () => {
    target.style.transitionDuration = '0s'
    touch({ el: element, type: 'touchstart', touches: TWO })
    touch({ el: element, type: 'touchmove', touches: [{ clientX: 50, clientY: 100 }, { clientX: 250, clientY: 100 }] })
    touch({ el: element, type: 'touchend', touches: [] })
    expect(element.hasAttribute('data-zooming')).toBe(false)
    expect(states.at(-1)).toEqual({ scale: 1, active: false })
  })

  it('확대 중에 destroy하면 확대 흔적을 남기지 않는다', () => {
    touch({ el: element, type: 'touchstart', touches: TWO })
    touch({ el: element, type: 'touchmove', touches: [{ clientX: 50, clientY: 100 }, { clientX: 250, clientY: 100 }] })
    cleanups.splice(0).forEach((cleanup) => cleanup())
    expect(target.style.transform).toBe('')
    expect(target.style.transition).toBe('')
    expect(target.style.transformOrigin).toBe('')
    expect(element.hasAttribute('data-zooming')).toBe(false)
    expect(element.style.getPropertyValue('--pinch-progress')).toBe('')
  })
})
