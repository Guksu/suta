import { openZoom } from '@skills/zoom-lightbox/assets/openZoom'

const withRect = ({ el, top, left, width, height }: { el: HTMLElement; top: number; left: number; width: number; height: number }) => {
  el.getBoundingClientRect = () =>
    ({ top, left, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect
  return el
}

describe('openZoom — 썸네일이 화면 중앙 확대본으로 전환', () => {
  let source: HTMLElement

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    source = withRect({ el: document.createElement('img'), top: 500, left: 100, width: 120, height: 80 })
    document.body.appendChild(source)
  })
  afterEach(() => {
    document.querySelectorAll('.zoom-backdrop, .zoom-ghost').forEach((el) => el.remove())
    source.remove()
    // 닫지 않고 끝난 테스트가 스크롤 잠금을 다음 테스트에 넘기지 않게 한다
    document.body.style.overflow = ''
    vi.useRealTimers()
  })

  it('열면 백드롭과 고스트가 출발 rect에 뜨고, 프레임 뒤 중앙 확대 transform이 걸린다', () => {
    openZoom({ source })
    const ghost = document.querySelector('.zoom-ghost') as HTMLElement
    const backdrop = document.querySelector('.zoom-backdrop') as HTMLElement
    expect(ghost.style.left).toBe('100px')
    expect(ghost.style.top).toBe('500px')
    expect(backdrop.dataset.open).toBe('false')
    vi.advanceTimersByTime(50)
    expect(backdrop.dataset.open).toBe('true')
    expect(ghost.style.transform).toContain('translate')
    expect(ghost.style.transform).toContain('scale')
  })

  it('close()는 원위치로 되돌린 뒤 transitionend에서 정리하고 onClose를 부른다', () => {
    let closed = 0
    const close = openZoom({ source, onClose: () => (closed += 1) })
    vi.advanceTimersByTime(50)
    close()
    const ghost = document.querySelector('.zoom-ghost') as HTMLElement
    expect(ghost.style.transform).toBe('')
    ghost.dispatchEvent(new Event('transitionend'))
    expect(document.querySelector('.zoom-ghost')).toBeNull()
    expect(document.querySelector('.zoom-backdrop')).toBeNull()
    expect(closed).toBe(1)
  })

  it('백드롭 클릭과 Escape로 닫힌다', () => {
    openZoom({ source })
    vi.advanceTimersByTime(50)
    const backdrop = document.querySelector('.zoom-backdrop') as HTMLElement
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect((document.querySelector('.zoom-ghost') as HTMLElement).style.transform).toBe('')
    // 이미 닫히는 중 — Escape가 중복 동작해도 안전해야 한다
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    vi.advanceTimersByTime(1000)
    expect(document.querySelector('.zoom-ghost')).toBeNull()
  })

  it('transitionend가 유실돼도 타임아웃 폴백으로 정리된다', () => {
    const close = openZoom({ source, durationMs: 300 })
    vi.advanceTimersByTime(50)
    close()
    vi.advanceTimersByTime(800)
    expect(document.querySelector('.zoom-ghost')).toBeNull()
  })

  it('열려 있는 동안 body 스크롤이 잠기고 닫으면 풀린다', () => {
    const close = openZoom({ source })
    expect(document.body.style.overflow).toBe('hidden')
    close()
    const ghost = document.querySelector('.zoom-ghost') as HTMLElement
    ghost.dispatchEvent(new Event('transitionend'))
    expect(document.body.style.overflow).toBe('')
  })
})

describe('openZoom — 상태와 경계', () => {
  let source: HTMLButtonElement

  const settle = () => {
    document.querySelectorAll('.zoom-ghost').forEach((ghost) => ghost.dispatchEvent(new Event('transitionend')))
    vi.advanceTimersByTime(1000)
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    source = withRect({ el: document.createElement('button'), top: 500, left: 100, width: 120, height: 80 }) as HTMLButtonElement
    source.id = 'thumb'
    document.body.appendChild(source)
    source.focus()
  })
  afterEach(() => {
    settle()
    document.querySelectorAll('.zoom-backdrop, .zoom-ghost').forEach((el) => el.remove())
    source.remove()
    document.body.style.overflow = ''
    vi.useRealTimers()
  })

  it('열려 있는 동안 다시 불러도(Enter 연타) 겹쳐 열지 않고 같은 닫기 함수를 돌려준다', () => {
    const first = openZoom({ source })
    const second = openZoom({ source })
    expect(document.querySelectorAll('.zoom-ghost')).toHaveLength(1)
    expect(document.querySelectorAll('.zoom-backdrop')).toHaveLength(1)
    expect(second).toBe(first)
  })

  it('닫힌 뒤에는 다시 열 수 있다', () => {
    const close = openZoom({ source })
    vi.advanceTimersByTime(50)
    close()
    settle()
    openZoom({ source })
    expect(document.querySelectorAll('.zoom-ghost')).toHaveLength(1)
  })

  it('포커스가 닫기 버튼(백드롭)으로 가고, 닫히면 누른 썸네일로 돌아온다', () => {
    const close = openZoom({ source, closeLabel: '사진 닫기' })
    const backdrop = document.querySelector('.zoom-backdrop') as HTMLElement
    expect(backdrop.tagName).toBe('BUTTON')
    expect(backdrop.getAttribute('aria-label')).toBe('사진 닫기')
    expect(document.activeElement).toBe(backdrop)
    vi.advanceTimersByTime(50)
    close()
    settle()
    expect(document.activeElement).toBe(source)
  })

  it('Tab은 뒤 화면으로 나가지 않는다', () => {
    openZoom({ source })
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('고스트는 낭독·포커스에서 빠지고 원본의 id를 물려받지 않는다', () => {
    openZoom({ source })
    const ghost = document.querySelector('.zoom-ghost') as HTMLElement
    expect(ghost.getAttribute('aria-hidden')).toBe('true')
    expect(ghost.hasAttribute('inert')).toBe(true)
    expect(ghost.id).toBe('')
    expect(document.querySelectorAll('#thumb')).toHaveLength(1)
  })

  it('크기가 0인 요소(숨겨진 썸네일)는 열지 않는다', () => {
    withRect({ el: source, top: 0, left: 0, width: 0, height: 0 })
    let closed = 0
    const close = openZoom({ source, onClose: () => (closed += 1) })
    expect(document.querySelector('.zoom-ghost')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    close()
    expect(closed).toBe(0)
  })

  it('열려 있는 동안 창 크기가 바뀌면 전이 없이 새 화면의 가운데로 다시 놓는다', () => {
    openZoom({ source })
    vi.advanceTimersByTime(50)
    const ghost = document.querySelector('.zoom-ghost') as HTMLElement
    const before = ghost.style.transform
    const originalWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: originalWidth / 2, configurable: true })
    withRect({ el: source, top: 300, left: 20, width: 120, height: 80 })
    window.dispatchEvent(new Event('resize'))
    expect(ghost.style.left).toBe('20px')
    expect(ghost.style.top).toBe('300px')
    expect(ghost.style.transform).not.toBe(before)
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true })
  })

  it('closeOnBack이면 뒤로 가기가 페이지를 떠나지 않고 확대본을 닫는다', () => {
    const lengthBefore = history.length
    openZoom({ source, closeOnBack: true })
    vi.advanceTimersByTime(50)
    expect(history.length).toBe(lengthBefore + 1)
    history.replaceState(null, '')
    window.dispatchEvent(new PopStateEvent('popstate'))
    settle()
    expect(document.querySelector('.zoom-ghost')).toBeNull()
  })

  it('소스가 화면에서 사라진 뒤 닫히면 포커스를 억지로 돌려놓지 않는다', () => {
    const close = openZoom({ source })
    vi.advanceTimersByTime(50)
    source.remove()
    close()
    expect(() => settle()).not.toThrow()
    expect(document.querySelector('.zoom-backdrop')).toBeNull()
  })

  it('더블 클릭의 두 번째 클릭(detail 2)이 백드롭에 떨어져도 닫지 않는다', () => {
    openZoom({ source })
    const backdrop = document.querySelector('.zoom-backdrop') as HTMLElement
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
    vi.advanceTimersByTime(50)
    expect(backdrop.dataset.open).toBe('true')
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    expect(backdrop.dataset.open).toBe('false')
  })
})
