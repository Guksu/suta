import { createStoryProgress } from '@skills/story-progress/assets/createStoryProgress'

const scaleOf = (bar: HTMLElement) => bar.style.transform

describe('createStoryProgress — 구간 진행·일시정지·이동', () => {
  let bars: HTMLElement[]
  let completed: number

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
    bars = [0, 1, 2].map(() => {
      const bar = document.createElement('span')
      document.body.appendChild(bar)
      return bar
    })
    completed = 0
  })
  afterEach(() => {
    vi.useRealTimers()
    bars.forEach((bar) => bar.remove())
  })

  const make = () =>
    createStoryProgress({ bars, durationMs: 1000, onComplete: () => (completed += 1) })

  it('start 후 현재 구간이 차오르고, 다 차면 다음 구간으로 넘어간다', () => {
    const story = make()
    story.start()
    vi.advanceTimersByTime(500)
    expect(scaleOf(bars[0])).toMatch(/scaleX\(0\.\d+\)/)
    vi.advanceTimersByTime(600)
    expect(scaleOf(bars[0])).toBe('scaleX(1)')
    expect(story.getIndex()).toBe(1)
  })

  it('pause는 진행을 멈추고 resume은 멈춘 지점부터 잇는다', () => {
    const story = make()
    story.start()
    vi.advanceTimersByTime(400)
    story.pause()
    const frozen = scaleOf(bars[0])
    vi.advanceTimersByTime(1000)
    expect(scaleOf(bars[0])).toBe(frozen)
    story.resume()
    vi.advanceTimersByTime(700)
    expect(story.getIndex()).toBe(1)
  })

  it('next/prev는 구간을 이동하며 지난 구간은 1, 미래 구간은 0으로 표시된다', () => {
    const story = make()
    story.start()
    story.next()
    expect(story.getIndex()).toBe(1)
    expect(scaleOf(bars[0])).toBe('scaleX(1)')
    story.prev()
    expect(story.getIndex()).toBe(0)
    expect(scaleOf(bars[1])).toBe('scaleX(0)')
  })

  it('마지막 구간이 끝나면 onComplete가 한 번 불린다', () => {
    const story = make()
    story.start()
    vi.advanceTimersByTime(3500)
    expect(completed).toBe(1)
  })

  it('stop 후에는 진행이 없다', () => {
    const story = make()
    story.start()
    story.stop()
    vi.advanceTimersByTime(2000)
    expect(story.getIndex()).toBe(0)
    expect(completed).toBe(0)
  })
  it('끝난 뒤의 resume은 아무것도 하지 않는다 — 화면을 눌렀다 떼도 onComplete가 다시 불리지 않는다', () => {
    const story = make()
    story.start()
    vi.advanceTimersByTime(3500)
    expect(completed).toBe(1)
    story.pause()
    story.resume()
    vi.advanceTimersByTime(2000)
    expect(completed).toBe(1)
  })

  it('시작 전·stop 뒤의 resume은 재생을 시작하지 않는다', () => {
    const story = make()
    story.resume()
    vi.advanceTimersByTime(1500)
    expect(story.getIndex()).toBe(0)
    expect(scaleOf(bars[0])).toBe('')
    story.start()
    story.stop()
    story.resume()
    vi.advanceTimersByTime(1500)
    expect(story.getIndex()).toBe(0)
  })

  it('끝난 뒤 prev를 누르면 앞 구간에서 다시 재생된다', () => {
    const story = make()
    story.start()
    vi.advanceTimersByTime(3500)
    story.prev()
    expect(story.getIndex()).toBe(1)
    vi.advanceTimersByTime(500)
    expect(scaleOf(bars[1])).toMatch(/scaleX\(0\.\d+\)/)
  })

  it('멈춘 채로 구간을 옮기면 멈춘 상태가 유지되고, resume하면 새 구간의 처음부터 찬다', () => {
    const story = make()
    story.start()
    vi.advanceTimersByTime(400)
    story.pause()
    story.next()
    vi.advanceTimersByTime(1000)
    expect(scaleOf(bars[1])).toBe('scaleX(0)')
    story.resume()
    vi.advanceTimersByTime(500)
    expect(scaleOf(bars[1])).toMatch(/scaleX\(0\.\d+\)/)
  })

  it('프레임이 오래 끊겼다 돌아오면(탭이 가려졌다 돌아옴) 그 시간은 세지 않는다', () => {
    // 가려진 탭에서는 rAF가 돌지 않는다 — 프레임을 손으로 넘겨 30초 빈 간격을 만든다
    const queue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const frameAt = (time: number) => queue.shift()?.(time)
    const story = make()
    story.start()
    frameAt(0)
    frameAt(200)
    frameAt(400)
    frameAt(30_400)
    frameAt(30_416)
    vi.unstubAllGlobals()
    expect(story.getIndex()).toBe(0)
    expect(scaleOf(bars[0])).toBe('scaleX(0.416)')
  })

  it('start로 처음부터 다시 재생하면 onIndexChange(0)이 불린다 — 장면도 첫 장으로 돌아간다', () => {
    const seen: number[] = []
    const story = createStoryProgress({ bars, durationMs: 1000, onIndexChange: (i) => seen.push(i) })
    story.start()
    expect(seen).toEqual([])
    story.next()
    story.next()
    story.start()
    expect(seen).toEqual([1, 2, 0])
  })

  it('durationMs를 함수로 주면 구간마다 시간이 다르다', () => {
    const story = createStoryProgress({ bars, durationMs: (i) => (i === 0 ? 500 : 2000) })
    story.start()
    vi.advanceTimersByTime(600)
    expect(story.getIndex()).toBe(1)
    vi.advanceTimersByTime(1500)
    expect(story.getIndex()).toBe(1)
    vi.advanceTimersByTime(600)
    expect(story.getIndex()).toBe(2)
  })

  it('takeHoldMs는 직전 pause~resume 사이의 시간을 한 번만 돌려준다 — 길게 눌렀다 뗀 것을 탭과 구별한다', () => {
    const story = make()
    story.start()
    expect(story.takeHoldMs()).toBe(0)
    story.pause()
    vi.advanceTimersByTime(900)
    story.resume()
    expect(story.takeHoldMs()).toBe(900)
    // 읽으면 비운다 — 누름 없이 온 다음 click(키보드 Enter)이 지난 누름 때문에 무시되지 않는다
    expect(story.takeHoldMs()).toBe(0)
  })

  it('구간이 0개여도 던지지 않고 인덱스는 0에 머문다', () => {
    const story = createStoryProgress({ bars: [], durationMs: 100, onComplete: () => (completed += 1) })
    story.start()
    vi.advanceTimersByTime(300)
    expect(story.getIndex()).toBe(0)
    expect(completed).toBe(1)
  })
})
