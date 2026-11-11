import { captureFlip } from '@skills/flip-list/assets/captureFlip'

const setRect = ({ el, top, left }: { el: HTMLElement; top: number; left: number }) => {
  el.getBoundingClientRect = () =>
    ({ top, left, width: 100, height: 40, right: left + 100, bottom: top + 40, x: left, y: top, toJSON: () => ({}) }) as DOMRect
}

describe('captureFlip — 재배치 전후 위치 차이를 transform으로 재생', () => {
  let container: HTMLElement
  let a: HTMLElement
  let b: HTMLElement

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    container = document.createElement('ul')
    a = document.createElement('li')
    a.dataset.flipId = 'a'
    b = document.createElement('li')
    b.dataset.flipId = 'b'
    container.append(a, b)
    document.body.appendChild(container)
    setRect({ el: a, top: 0, left: 0 })
    setRect({ el: b, top: 50, left: 0 })
  })
  afterEach(() => {
    vi.useRealTimers()
    container.remove()
  })

  it('이동한 요소는 이전 위치로 되돌린(invert) 뒤 프레임 뒤에 제자리로 전환한다', () => {
    const flip = captureFlip({ container })
    // 재배치: a와 b가 자리를 바꿈
    setRect({ el: a, top: 50, left: 0 })
    setRect({ el: b, top: 0, left: 0 })
    flip.play({ durationMs: 200 })
    expect(a.style.transform).toBe('translate(0px, -50px)')
    expect(b.style.transform).toBe('translate(0px, 50px)')
    expect(a.style.transition).toBe('none')
    vi.advanceTimersByTime(50)
    expect(a.style.transform).toBe('')
    expect(a.style.transition).toContain('200ms')
    a.dispatchEvent(new Event('transitionend'))
    expect(a.style.transition).toBe('')
  })

  it('움직이지 않은 요소는 건드리지 않는다', () => {
    const flip = captureFlip({ container })
    setRect({ el: b, top: 90, left: 0 })
    flip.play()
    expect(a.style.transform).toBe('')
    expect(b.style.transform).not.toBe('')
  })

  it('캡처 이후 새로 생긴 요소(data-flip-id 미등록)는 무시한다', () => {
    const flip = captureFlip({ container })
    const c = document.createElement('li')
    c.dataset.flipId = 'c'
    setRect({ el: c, top: 100, left: 0 })
    container.appendChild(c)
    flip.play()
    expect(c.style.transform).toBe('')
  })

  it('prefers-reduced-motion이면 재생하지 않는다', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    const flip = captureFlip({ container })
    setRect({ el: a, top: 50, left: 0 })
    flip.play()
    expect(a.style.transform).toBe('')
    vi.unstubAllGlobals()
  })
})

describe('captureFlip — 상태와 경계', () => {
  let container: HTMLElement
  let a: HTMLElement
  let b: HTMLElement

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    container = document.createElement('ul')
    a = document.createElement('li')
    a.dataset.flipId = 'a'
    b = document.createElement('li')
    b.dataset.flipId = 'b'
    container.append(a, b)
    document.body.appendChild(container)
    setRect({ el: container, top: 0, left: 0 })
    setRect({ el: a, top: 0, left: 0 })
    setRect({ el: b, top: 50, left: 0 })
  })
  afterEach(() => {
    vi.useRealTimers()
    container.remove()
  })

  it('캡처와 재생 사이에 페이지가 스크롤돼도 움직이지 않은 항목은 그대로 둔다', () => {
    const flip = captureFlip({ container })
    // 페이지를 200px 내렸다 — 화면 좌표는 전부 바뀌었지만 목록 안의 자리는 그대로다
    setRect({ el: container, top: -200, left: 0 })
    setRect({ el: a, top: -200, left: 0 })
    setRect({ el: b, top: -150, left: 0 })
    flip.play()
    expect(a.style.transform).toBe('')
    expect(b.style.transform).toBe('')
  })

  it('목록 안쪽 스크롤(scrollTop)이 바뀐 것도 이동으로 세지 않는다', () => {
    const flip = captureFlip({ container })
    container.scrollTop = 30
    setRect({ el: a, top: -30, left: 0 })
    setRect({ el: b, top: 20, left: 0 })
    flip.play()
    expect(a.style.transform).toBe('')
  })

  it('이동 중에 다시 재배치하면 지금 보이는 자리에서 이어서 움직인다', () => {
    const first = captureFlip({ container })
    setRect({ el: a, top: 50, left: 0 })
    setRect({ el: b, top: 0, left: 0 })
    first.play()
    vi.advanceTimersByTime(50)
    // 이동 중간: a는 새 자리(50)에서 -20만큼 덜 온 채로 보인다(화면 좌표 30)
    a.style.transform = 'translate(0px, -20px)'
    setRect({ el: a, top: 30, left: 0 })
    const second = captureFlip({ container })
    // 다시 재배치: a의 배치 자리는 0으로 돌아간다. 화면에는 아직 진행 중인 transform(-20)이 더해져 보인다
    setRect({ el: a, top: -20, left: 0 })
    second.play()
    // 보이던 자리(30)에서 새 자리(0)까지 — 30px
    expect(a.style.transform).toBe('translate(0px, 30px)')
  })

  it('이동 중에 배치가 그대로면(무관한 재렌더) 진행 중인 이동을 건드리지 않는다', () => {
    const first = captureFlip({ container })
    setRect({ el: a, top: 50, left: 0 })
    first.play()
    vi.advanceTimersByTime(50)
    a.style.transform = 'translate(0px, -20px)'
    const transitionBefore = a.style.transition
    setRect({ el: a, top: 30, left: 0 })
    captureFlip({ container }).play()
    expect(a.style.transform).toBe('translate(0px, -20px)')
    expect(a.style.transition).toBe(transitionBefore)
  })

  it('안쪽 요소의 transitionend(버블링)로는 이동이 끝난 것으로 치지 않는다', () => {
    const inner = document.createElement('button')
    a.appendChild(inner)
    const flip = captureFlip({ container })
    setRect({ el: a, top: 50, left: 0 })
    flip.play({ durationMs: 200 })
    vi.advanceTimersByTime(50)
    inner.dispatchEvent(new Event('transitionend', { bubbles: true }))
    expect(a.style.transition).toContain('200ms')
  })

  it('transitionend가 오지 않아도(가려진 탭·display none) 인라인 transition을 걷는다', () => {
    const flip = captureFlip({ container })
    setRect({ el: a, top: 50, left: 0 })
    flip.play({ durationMs: 200 })
    vi.advanceTimersByTime(50)
    expect(a.style.transition).toContain('200ms')
    vi.advanceTimersByTime(400)
    expect(a.style.transition).toBe('')
  })
})
