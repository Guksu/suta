import { createCarouselAutoplay } from '@skills/carousel/assets/createCarouselAutoplay'

describe('createCarouselAutoplay — 자동재생과 정지 조건', () => {
  let track: HTMLElement
  let ticks: number
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    track = document.createElement('div')
    document.body.appendChild(track)
    ticks = 0
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.unstubAllGlobals()
    vi.useRealTimers()
    track.remove()
  })

  const register = () => {
    const autoplay = createCarouselAutoplay({ track, intervalMs: 1000, onTick: () => (ticks += 1) })
    cleanups.push(autoplay.stop)
    return autoplay
  }

  it('간격마다 onTick이 불린다', () => {
    register()
    vi.advanceTimersByTime(3100)
    expect(ticks).toBe(3)
  })

  it('포인터가 올라와 있는 동안 멈추고, 떠나면 재개한다', () => {
    register()
    track.dispatchEvent(new Event('pointerenter'))
    vi.advanceTimersByTime(3000)
    expect(ticks).toBe(0)
    track.dispatchEvent(new Event('pointerleave'))
    vi.advanceTimersByTime(1100)
    expect(ticks).toBe(1)
  })

  it('키보드 포커스가 안에 있는 동안 멈춘다', () => {
    register()
    track.dispatchEvent(new Event('focusin'))
    vi.advanceTimersByTime(2000)
    expect(ticks).toBe(0)
    track.dispatchEvent(new Event('focusout'))
    vi.advanceTimersByTime(1100)
    expect(ticks).toBe(1)
  })

  it('toggle()로 사용자 일시정지를 걸면 떠나도 재개되지 않는다', () => {
    const autoplay = register()
    autoplay.toggle()
    expect(autoplay.isPlaying()).toBe(false)
    vi.advanceTimersByTime(3000)
    expect(ticks).toBe(0)
    autoplay.toggle()
    vi.advanceTimersByTime(1100)
    expect(ticks).toBe(1)
  })

  it('prefers-reduced-motion이면 처음부터 재생하지 않는다', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    const autoplay = register()
    expect(autoplay.isPlaying()).toBe(false)
    vi.advanceTimersByTime(3000)
    expect(ticks).toBe(0)
  })

  it('탭이 가려진 동안(다른 탭·최소화) 멈추고, 돌아오면 간격을 처음부터 다시 센다', () => {
    let hidden = false
    const spy = vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    register()
    vi.advanceTimersByTime(900)
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(5000)
    expect(ticks).toBe(0)
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(900)
    expect(ticks).toBe(0)
    vi.advanceTimersByTime(200)
    expect(ticks).toBe(1)
    spy.mockRestore()
  })

  it('reset()은 간격을 처음부터 다시 센다 (점을 눌러 옮긴 직후에 자동으로 또 넘어가지 않게)', () => {
    const autoplay = register()
    vi.advanceTimersByTime(900)
    autoplay.reset()
    vi.advanceTimersByTime(900)
    expect(ticks).toBe(0)
    vi.advanceTimersByTime(200)
    expect(ticks).toBe(1)
  })

  it('reset()은 멈춰 있는 자동재생을 다시 켜지 않는다', () => {
    const autoplay = register()
    autoplay.toggle()
    autoplay.reset()
    vi.advanceTimersByTime(3000)
    expect(ticks).toBe(0)
  })

  it('isPaused()는 사용자가 멈췄는지를 알린다 — 호버로 잠깐 선 것과 구별한다 (일시정지 버튼의 글자용)', () => {
    const autoplay = register()
    track.dispatchEvent(new Event('pointerenter'))
    expect(autoplay.isPlaying()).toBe(false)
    expect(autoplay.isPaused()).toBe(false)
    autoplay.toggle()
    expect(autoplay.isPaused()).toBe(true)
  })

  it('stop() 뒤에는 탭이 다시 보여도 재생하지 않는다', () => {
    const autoplay = register()
    autoplay.stop()
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(3000)
    expect(ticks).toBe(0)
  })
})
