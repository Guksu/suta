import { createToastStack } from '@skills/toast-stack/assets/createToastStack'

describe('createToastStack — 토스트 쌓기·자동 소멸·재배치', () => {
  let stack: ReturnType<typeof createToastStack>
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    // jsdom은 레이아웃이 없어 offsetHeight가 0이다 — 모든 토스트를 40px로 고정해 결정적으로 만든다
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { value: 40, configurable: true })
    stack = createToastStack({ durationMs: 3000, gapPx: 10 })
  })
  afterEach(() => {
    stack.destroy()
    if (originalOffsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    vi.useRealTimers()
  })

  const toasts = () => [...document.querySelectorAll('.toast-item')] as HTMLElement[]

  /** 브라우저는 전이가 끝난 속성마다 transitionend를 따로 보낸다 — 어느 속성인지 실어 보낸다 */
  const endTransition = ({ toast, propertyName }: { toast: HTMLElement; propertyName: string }) => {
    toast.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName }))
  }

  it('show()는 폴라이트 라이브 영역에 토스트를 띄우고 entering→entered로 전환한다', () => {
    stack.show('저장되었습니다')
    const region = document.querySelector('.toast-region')!
    expect(region.getAttribute('aria-live')).toBe('polite')
    const toast = toasts()[0]
    expect(toast.textContent).toBe('저장되었습니다')
    expect(toast.dataset.state).toBe('entering')
    vi.advanceTimersByTime(50)
    expect(toast.dataset.state).toBe('entered')
  })

  it('clear()는 떠 있는 토스트를 모두 내보낸다 — 화면이 바뀔 때 앞 화면의 알림이 따라오지 않게', () => {
    stack.show('장바구니에 담았어요')
    stack.show('찜했어요')
    stack.clear()
    for (const toast of toasts()) expect(toast.dataset.state).toBe('exiting')
    vi.advanceTimersByTime(700)
    expect(toasts()).toHaveLength(0)
    stack.show('새 화면의 알림')
    expect(toasts()).toHaveLength(1)
  })

  it('새 토스트가 오면 기존 토스트가 높이+간격만큼 위로 밀린다', () => {
    stack.show('첫 번째')
    stack.show('두 번째')
    stack.show('세 번째')
    const [first, second, third] = toasts()
    expect(first.style.transform).toBe('translateY(-100px)') // (40+10)*2
    expect(second.style.transform).toBe('translateY(-50px)')
    expect(third.style.transform).toBe('translateY(0px)')
  })

  it('durationMs가 지나면 스스로 exiting을 거쳐 제거된다', () => {
    stack.show('사라질 토스트')
    vi.advanceTimersByTime(3100)
    const toast = toasts()[0]
    expect(toast.dataset.state).toBe('exiting')
    endTransition({ toast, propertyName: 'opacity' })
    expect(toasts()).toHaveLength(0)
  })

  it('퇴장 중에 스택 이동(transform) 전이가 먼저 끝나도 지우지 않는다 — 페이드가 끝나야 지운다', () => {
    stack.show('밀려 올라가던 토스트')
    const toast = toasts()[0]
    vi.advanceTimersByTime(3100)
    expect(toast.dataset.state).toBe('exiting')

    endTransition({ toast, propertyName: 'transform' })
    expect(toasts()).toHaveLength(1)

    endTransition({ toast, propertyName: 'opacity' })
    expect(toasts()).toHaveLength(0)
  })

  it('라이브 영역은 새로 온 토스트만 읽게 한다 (aria-atomic="false")', () => {
    // role="status"는 aria-atomic이 기본 true라, 토스트가 쌓일 때마다 떠 있는 것 전부를 다시 읽는다
    expect(document.querySelector('.toast-region')).toHaveAttribute('aria-atomic', 'false')
  })

  it('show()의 durationMs는 그 토스트 하나의 표시 시간만 바꾼다', () => {
    stack.show('짧은 알림')
    stack.show('포장 주문은 15분쯤 걸려요. 준비되면 알려 드릴게요', { durationMs: 6000 })
    const [short, long] = toasts()

    vi.advanceTimersByTime(3100)
    expect(short.dataset.state).toBe('exiting')
    expect(long.dataset.state).toBe('entered')

    vi.advanceTimersByTime(3000)
    expect(long.dataset.state).toBe('exiting')
  })

  it('창 크기가 바뀌어 토스트 높이가 달라지면 쌓인 간격을 다시 잰다 (긴 문구의 줄바꿈)', () => {
    stack.show('첫 번째')
    stack.show('두 번째')
    const [first] = toasts()
    expect(first.style.transform).toBe('translateY(-50px)')

    // 화면이 좁아져 문구가 두 줄로 꺾였다
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { value: 64, configurable: true })
    window.dispatchEvent(new Event('resize'))

    expect(first.style.transform).toBe('translateY(-74px)') // 64 + 10
  })

  it('destroy() 뒤에는 창 크기 변화를 더 듣지 않는다', () => {
    const removed = vi.spyOn(window, 'removeEventListener')
    const temp = createToastStack()
    temp.destroy()
    expect(removed).toHaveBeenCalledWith('resize', expect.any(Function))
    removed.mockRestore()
  })

  it('maxVisible을 넘으면 가장 오래된 토스트부터 밀려난다', () => {
    const limited = createToastStack({ durationMs: 60000, maxVisible: 2 })
    limited.show('1')
    limited.show('2')
    limited.show('3')
    const states = [...document.querySelectorAll('.toast-item')].map((toast) => (toast as HTMLElement).dataset.state)
    expect(states.filter((state) => state === 'exiting')).toHaveLength(1)
    limited.destroy()
  })

  it('show()가 돌려준 dismiss로 조기 종료할 수 있다', () => {
    const dismiss = stack.show('수동 종료')
    dismiss()
    expect(toasts()[0].dataset.state).toBe('exiting')
  })

  it('destroy()는 영역 전체를 제거한다', () => {
    stack.show('아무거나')
    stack.destroy()
    expect(document.querySelector('.toast-region')).toBeNull()
  })
})

describe('createToastStack — position: top (상단 배너)', () => {
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const created: Array<ReturnType<typeof createToastStack>> = []

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { value: 40, configurable: true })
  })
  afterEach(() => {
    created.splice(0).forEach((stack) => stack.destroy())
    if (originalOffsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    vi.useRealTimers()
  })

  const make = (options: Parameters<typeof createToastStack>[0]) => {
    const stack = createToastStack(options)
    created.push(stack)
    return stack
  }

  it('position이 top이면 영역에 data-position="top"이 붙고, 기본(bottom)은 top이 아니다', () => {
    make({ position: 'top' })
    expect(document.querySelector('.toast-region')).toHaveAttribute('data-position', 'top')
    created.splice(0).forEach((stack) => stack.destroy())
    make({})
    expect(document.querySelector('.toast-region')).not.toHaveAttribute('data-position', 'top')
  })

  it('top이면 최신이 위(0)에 오고 오래된 것이 아래로(+) 밀린다 — 부호가 반전된다', () => {
    const stack = make({ position: 'top', gapPx: 10 })
    stack.show('첫 번째')
    stack.show('두 번째')
    stack.show('세 번째')
    const [first, second, third] = [...document.querySelectorAll('.toast-item')] as HTMLElement[]
    expect(first.style.transform).toBe('translateY(100px)') // (40+10)*2
    expect(second.style.transform).toBe('translateY(50px)')
    expect(third.style.transform).toBe('translateY(0px)')
  })
})
