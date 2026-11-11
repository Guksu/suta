import { flyToTarget } from '@skills/cart-fly/assets/flyToTarget'

const withRect = ({ el, top, left, width = 80, height = 80 }: { el: HTMLElement; top: number; left: number; width?: number; height?: number }) => {
  el.getBoundingClientRect = () =>
    ({ top, left, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect
  return el
}

describe('flyToTarget — 고스트가 출발지에서 목적지로 날아간다', () => {
  let source: HTMLElement
  let target: HTMLElement
  let arrived: number

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    source = withRect({ el: document.createElement('div'), top: 300, left: 100 })
    source.innerHTML = '<img alt="잔치국수" src="janchi.webp">'
    target = withRect({ el: document.createElement('button'), top: 20, left: 500, width: 40, height: 40 })
    document.body.append(source, target)
    arrived = 0
  })
  afterEach(() => {
    vi.useRealTimers()
    document.querySelectorAll('.fly-ghost').forEach((ghost) => ghost.remove())
    source.remove()
    target.remove()
  })

  it('출발지 복제 고스트를 body에 띄우고, 프레임 뒤 목적지로 향하는 transform이 걸린다', () => {
    flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    const ghost = document.querySelector('.fly-ghost') as HTMLElement
    expect(ghost).not.toBeNull()
    expect(ghost.querySelector('img')?.alt).toBe('잔치국수')
    expect(ghost.style.left).toBe('100px')
    expect(ghost.style.top).toBe('300px')
    vi.advanceTimersByTime(50)
    const inner = ghost.firstElementChild as HTMLElement
    expect(ghost.style.transform).toContain('translateX')
    expect(inner.style.transform).toContain('translateY')
  })

  it("기본 궤적(j자)은 가로 linear·세로 ease-in, arc: 'vertical-first'(r자)는 이징이 서로 바뀐다", () => {
    flyToTarget({ source, target })
    const jGhost = document.querySelector('.fly-ghost') as HTMLElement
    const jInner = jGhost.firstElementChild as HTMLElement
    expect(jGhost.style.transition).toContain('linear')
    expect(jInner.style.transition).toContain('cubic-bezier(0.55, 0, 1, 0.45)')
    jGhost.remove()

    flyToTarget({ source, target, arc: 'vertical-first' })
    const rGhost = document.querySelector('.fly-ghost') as HTMLElement
    const rInner = rGhost.firstElementChild as HTMLElement
    expect(rGhost.style.transition).toContain('cubic-bezier(0.55, 0, 1, 0.45)')
    expect(rInner.style.transition).toContain('transform 600ms linear')
  })

  it('안쪽 요소는 display: block이다 — 인라인 요소(span 등) 복제 시 transform이 무시되어 직선 비행이 되는 것을 막는다', () => {
    const inlineSource = withRect({ el: document.createElement('span'), top: 300, left: 100 })
    document.body.appendChild(inlineSource)
    flyToTarget({ source: inlineSource, target })
    const inner = document.querySelector('.fly-ghost')!.firstElementChild as HTMLElement
    expect(inner.style.display).toBe('block')
    inlineSource.remove()
  })

  it('안쪽(세로) 전환이 끝나면 고스트가 제거되고 onArrive가 불린다', () => {
    flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    vi.advanceTimersByTime(50)
    const ghost = document.querySelector('.fly-ghost') as HTMLElement
    const inner = ghost.firstElementChild as HTMLElement
    inner.dispatchEvent(new Event('transitionend'))
    expect(arrived).toBe(1)
    expect(document.querySelector('.fly-ghost')).toBeNull()
  })

  it('transitionend가 유실돼도 타임아웃 폴백으로 정리된다', () => {
    flyToTarget({ source, target, durationMs: 400, onArrive: () => (arrived += 1) })
    vi.advanceTimersByTime(1000)
    expect(arrived).toBe(1)
    expect(document.querySelector('.fly-ghost')).toBeNull()
  })

  it('prefers-reduced-motion이면 고스트 없이 즉시 onArrive', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    expect(document.querySelector('.fly-ghost')).toBeNull()
    expect(arrived).toBe(1)
    vi.unstubAllGlobals()
  })
  it('고스트는 화면 낭독기에 읽히지 않고(aria-hidden), 복제된 id는 지워진다 — 사진의 대체 글이 두 번 읽히거나 id가 겹치지 않는다', () => {
    source.id = 'thumb-1'
    source.innerHTML = '<img id="photo-1" alt="잔치국수" src="janchi.webp">'
    flyToTarget({ source, target })
    const ghost = document.querySelector('.fly-ghost') as HTMLElement
    expect(ghost.getAttribute('aria-hidden')).toBe('true')
    expect(ghost.querySelector('[id]')).toBeNull()
    expect(document.querySelectorAll('#thumb-1')).toHaveLength(1)
  })

  it('목적지가 화면에 없으면(display: none — 크기 0) 날리지 않고 바로 onArrive를 부른다', () => {
    withRect({ el: target, top: 0, left: 0, width: 0, height: 0 })
    flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    expect(document.querySelector('.fly-ghost')).toBeNull()
    expect(arrived).toBe(1)
  })

  it('durationMs가 0 이하이면 날리지 않고 바로 onArrive를 부른다', () => {
    flyToTarget({ source, target, durationMs: 0, onArrive: () => (arrived += 1) })
    expect(document.querySelector('.fly-ghost')).toBeNull()
    expect(arrived).toBe(1)
  })

  it('복제된 자식의 transitionend(버블)로는 끝내지 않는다 — 안쪽 요소 자신의 전환만 본다', () => {
    flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    vi.advanceTimersByTime(50)
    const inner = document.querySelector('.fly-ghost')!.firstElementChild as HTMLElement
    inner.querySelector('img')!.dispatchEvent(new Event('transitionend', { bubbles: true }))
    expect(arrived).toBe(0)
    expect(document.querySelector('.fly-ghost')).not.toBeNull()
  })

  it('돌려받은 cancel을 부르면 고스트를 걷고 onArrive는 부르지 않는다(화면을 떠날 때)', () => {
    const cancel = flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    cancel()
    expect(document.querySelector('.fly-ghost')).toBeNull()
    vi.advanceTimersByTime(2000)
    expect(arrived).toBe(0)
  })

  it('연타하면 고스트가 각자 날고 onArrive가 그 수만큼 불린다', () => {
    flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    flyToTarget({ source, target, onArrive: () => (arrived += 1) })
    expect(document.querySelectorAll('.fly-ghost')).toHaveLength(3)
    vi.advanceTimersByTime(1000)
    expect(arrived).toBe(3)
    expect(document.querySelectorAll('.fly-ghost')).toHaveLength(0)
  })
})
