import { runThemeTransition } from '@skills/theme-toggle/assets/runThemeTransition'

type StartViewTransition = (callback: () => void | Promise<void>) => { ready: Promise<void>; finished: Promise<void> }

const root = () => document.documentElement

const withViewTransitions = (impl: StartViewTransition) => {
  Object.defineProperty(document, 'startViewTransition', { value: impl, configurable: true, writable: true })
}

const withoutViewTransitions = () => Reflect.deleteProperty(document, 'startViewTransition')

/** 전환이 정상적으로 시작·완료되는 가짜 구현 — 콜백 안에서 화면을 바꾼다 */
const okTransition = (onCallback?: () => void): StartViewTransition => (callback) => {
  onCallback?.()
  void callback()
  return { ready: Promise.resolve(), finished: Promise.resolve() }
}

describe('runThemeTransition — 원이 퍼지는 테마 전환', () => {
  let animate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    animate = vi.fn()
    Object.defineProperty(root(), 'animate', { value: animate, configurable: true, writable: true })
    root().style.viewTransitionName = ''
  })
  afterEach(() => {
    withoutViewTransitions()
    root().style.viewTransitionName = ''
    vi.unstubAllGlobals()
  })

  it('View Transitions를 모르는 브라우저에서는 전환 없이 그냥 바꾼다', async () => {
    withoutViewTransitions()
    const apply = vi.fn()

    await runThemeTransition({ origin: { x: 10, y: 10 }, apply })

    expect(apply).toHaveBeenCalledTimes(1)
    expect(animate).not.toHaveBeenCalled()
  })

  it('모션을 줄이는 설정이면 원을 퍼뜨리지 않고 즉시 바꾼다', async () => {
    withViewTransitions(okTransition())
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }))
    const apply = vi.fn()

    await runThemeTransition({ origin: { x: 10, y: 10 }, apply })

    expect(apply).toHaveBeenCalledTimes(1)
    expect(animate).not.toHaveBeenCalled()
  })

  it('문서 전체 전환이면 전환 중에만 root에 이름을 붙였다가 되돌린다', async () => {
    let nameDuringTransition: string | undefined
    withViewTransitions(okTransition(() => (nameDuringTransition = root().style.viewTransitionName)))

    await runThemeTransition({ origin: { x: 10, y: 10 }, apply: () => {} })

    expect(nameDuringTransition).toBe('root')
    expect(root().style.viewTransitionName).toBe('')
  })

  it('page-transition 스킬이 :root를 꺼 놨어도 그 순간만 켠다 (원래 값으로 복원)', async () => {
    root().style.viewTransitionName = 'none'
    let nameDuringTransition: string | undefined
    withViewTransitions(okTransition(() => (nameDuringTransition = root().style.viewTransitionName)))

    await runThemeTransition({ origin: { x: 10, y: 10 }, apply: () => {} })

    expect(nameDuringTransition).toBe('root')
    expect(root().style.viewTransitionName).toBe('none')
  })

  it('영역만 바꿀 때는 그 요소에 이름을 주고 페이지 전체는 끈다', async () => {
    const card = document.createElement('div')
    document.body.appendChild(card)
    const seen: Array<string | undefined> = []
    withViewTransitions(okTransition(() => seen.push(root().style.viewTransitionName, card.style.viewTransitionName)))

    await runThemeTransition({ origin: { x: 10, y: 10 }, apply: () => {}, scope: card })

    expect(seen).toEqual(['none', 'theme-scope'])
    expect(root().style.viewTransitionName).toBe('')
    expect(card.style.viewTransitionName).toBe('')
    card.remove()
  })

  it('새 화면을 점에서 화면을 덮는 원까지 키운다 — 길이는 백분율로 준다', async () => {
    withViewTransitions(okTransition())
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 600)

    await runThemeTransition({ origin: { x: 0, y: 0 }, apply: () => {}, durationMs: 400 })

    expect(animate).toHaveBeenCalledTimes(1)
    const [keyframes, options] = animate.mock.calls[0]
    // px로 주면 레티나 화면에서 위치·크기가 절반으로 어긋난다(스냅샷은 장치 픽셀 기준) — 백분율은 안전하다
    expect(keyframes.clipPath[0]).toBe('circle(0% at 0% 0%)')
    // 모서리에서 시작하면 덮어야 할 거리는 대각선 전체, 백분율 기준값은 대각선÷√2 → 141.421%
    expect(keyframes.clipPath[1]).toBe('circle(141.421% at 0% 0%)')
    expect(options.duration).toBe(400)
    expect(options.pseudoElement).toBe('::view-transition-new(root)')
  })

  it('영역의 한가운데에서 시작하면 중심도 한가운데다', async () => {
    const card = document.createElement('div')
    card.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 400, height: 300, right: 500, bottom: 350, x: 100, y: 50, toJSON: () => ({}) }) as DOMRect
    document.body.appendChild(card)
    withViewTransitions(okTransition())

    await runThemeTransition({ origin: { x: 300, y: 200 }, apply: () => {}, scope: card })

    expect(animate.mock.calls[0][0].clipPath[0]).toBe('circle(0% at 50% 50%)')
    card.remove()
  })

  it('크기가 0인 영역이면 원을 그리지 않는다 (0으로 나누지 않는다)', async () => {
    const hidden = document.createElement('div')
    hidden.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    document.body.appendChild(hidden)
    const apply = vi.fn()
    withViewTransitions(okTransition())

    await runThemeTransition({ origin: { x: 0, y: 0 }, apply, scope: hidden })

    expect(apply).toHaveBeenCalledTimes(1)
    expect(animate).not.toHaveBeenCalled()
    hidden.remove()
  })

  it('브라우저가 전환을 건너뛰어도 테마는 바뀌고 이름은 원복된다', async () => {
    const apply = vi.fn()
    withViewTransitions((callback) => {
      void callback()
      return { ready: Promise.reject(new Error('aborted')), finished: Promise.resolve() }
    })

    await runThemeTransition({ origin: { x: 10, y: 10 }, apply })

    expect(apply).toHaveBeenCalledTimes(1)
    expect(animate).not.toHaveBeenCalled()
    expect(root().style.viewTransitionName).toBe('')
  })

  it('전환이 끝나기 전에 다시 눌러도(연타) 이름이 처음 값으로 돌아간다 — 도중의 값을 원래 값으로 착각하지 않는다', async () => {
    // 브라우저처럼: 두 번째 전환이 시작되면 첫 전환은 건너뛰어지고(finished가 끝난다), 두 번째는 나중에 끝난다
    const finishers: Array<() => void> = []
    withViewTransitions((callback) => {
      void callback()
      finishers.at(-1)?.()
      return { ready: Promise.resolve(), finished: new Promise<void>((resolve) => finishers.push(resolve)) }
    })
    root().style.viewTransitionName = 'none' // page-transition 패턴이 꺼 둔 상태

    const first = runThemeTransition({ origin: { x: 10, y: 10 }, apply: () => {} })
    const second = runThemeTransition({ origin: { x: 10, y: 10 }, apply: () => {} })
    await first
    // 첫 전환이 끝났어도 두 번째가 도는 동안은 이름을 쥐고 있다
    expect(root().style.viewTransitionName).toBe('root')

    finishers.at(-1)?.()
    await second
    expect(root().style.viewTransitionName).toBe('none')
  })
})
