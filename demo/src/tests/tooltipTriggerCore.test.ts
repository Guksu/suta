import { createTooltipTrigger } from '@skills/tooltip/assets/createTooltipTrigger'

// window 리스너를 반드시 해제한다 — 남으면 앞 테스트의 열린 말풍선이 다음 테스트의 Escape를 받는다
const cleanups: Array<() => void> = []

const setup = ({ showDelayMs }: { showDelayMs?: number } = {}) => {
  const anchor = document.createElement('button')
  const tooltip = document.createElement('span')
  document.body.append(anchor, tooltip)
  const cleanup = createTooltipTrigger({ anchor, tooltip, showDelayMs })
  cleanups.push(cleanup)
  return { anchor, tooltip, cleanup }
}

describe('createTooltipTrigger — 호버 지연·포커스 즉시·Esc 닫기', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('생성 직후에는 닫힘 상태다', () => {
    const { tooltip } = setup()
    expect(tooltip.dataset.open).toBe('false')
  })

  it('마우스 진입 후 지연(기본 400ms)이 지나야 열린다 — 스치는 커서에 반응하지 않게', () => {
    const { anchor, tooltip } = setup()
    anchor.dispatchEvent(new MouseEvent('pointerenter'))
    vi.advanceTimersByTime(399)
    expect(tooltip.dataset.open).toBe('false')
    vi.advanceTimersByTime(1)
    expect(tooltip.dataset.open).toBe('true')
  })

  it('지연이 끝나기 전에 이탈하면 열리지 않는다', () => {
    const { anchor, tooltip } = setup()
    anchor.dispatchEvent(new MouseEvent('pointerenter'))
    vi.advanceTimersByTime(200)
    anchor.dispatchEvent(new MouseEvent('pointerleave'))
    vi.advanceTimersByTime(1000)
    expect(tooltip.dataset.open).toBe('false')
  })

  it('키보드 포커스는 지연 없이 즉시 연다', () => {
    const { anchor, tooltip } = setup()
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.open).toBe('true')
    anchor.dispatchEvent(new FocusEvent('focusout'))
    expect(tooltip.dataset.open).toBe('false')
  })

  it('showDelayMs 옵션으로 지연을 바꿀 수 있다', () => {
    const { anchor, tooltip } = setup({ showDelayMs: 100 })
    anchor.dispatchEvent(new MouseEvent('pointerenter'))
    vi.advanceTimersByTime(100)
    expect(tooltip.dataset.open).toBe('true')
  })

  it('열린 상태에서 Escape로 닫힌다', () => {
    const { anchor, tooltip } = setup()
    anchor.dispatchEvent(new FocusEvent('focusin'))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(tooltip.dataset.open).toBe('false')
  })

  it('cleanup 후에는 어떤 이벤트에도 반응하지 않는다', () => {
    const { anchor, tooltip, cleanup } = setup()
    cleanup()
    anchor.dispatchEvent(new MouseEvent('pointerenter'))
    vi.advanceTimersByTime(1000)
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.open).toBe('false')
  })

  it('터치로 누른 것은 호버가 아니다 — 열지 않는다 (누른 뒤 말풍선이 남는 것을 막는다)', () => {
    const { anchor, tooltip } = setup()
    const touch = new MouseEvent('pointerenter')
    Object.defineProperty(touch, 'pointerType', { value: 'touch' })
    anchor.dispatchEvent(touch)
    vi.advanceTimersByTime(1000)
    expect(tooltip.dataset.open).toBe('false')
  })

  it('앵커를 누르면 닫히고, 그 누름이 가져온 포커스로는 다시 열지 않는다', () => {
    const { anchor, tooltip } = setup({ showDelayMs: 0 })
    anchor.dispatchEvent(new MouseEvent('pointerenter'))
    vi.advanceTimersByTime(0)
    expect(tooltip.dataset.open).toBe('true')

    anchor.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    expect(tooltip.dataset.open).toBe('false')
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.open).toBe('false')

    // 키보드로 돌아오면 포커스가 다시 연다
    anchor.dispatchEvent(new FocusEvent('focusout'))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.open).toBe('true')
  })

  it('열린 말풍선을 닫은 Escape는 기본 동작을 막는다 — 바깥 모달·시트가 함께 닫히지 않게. 닫혀 있으면 건드리지 않는다', () => {
    const { anchor, tooltip } = setup()
    const idle = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    window.dispatchEvent(idle)
    expect(idle.defaultPrevented).toBe(false)

    anchor.dispatchEvent(new FocusEvent('focusin'))
    const used = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    window.dispatchEvent(used)
    expect(tooltip.dataset.open).toBe('false')
    expect(used.defaultPrevented).toBe(true)
  })

  it('포인터가 말풍선 위로 옮겨 가면 닫지 않고, 말풍선에서 벗어나면 닫는다 (WCAG 1.4.13 hoverable)', () => {
    const { anchor, tooltip } = setup({ showDelayMs: 0 })
    anchor.dispatchEvent(new MouseEvent('pointerenter'))
    vi.advanceTimersByTime(0)

    anchor.dispatchEvent(new MouseEvent('pointerleave', { relatedTarget: tooltip }))
    expect(tooltip.dataset.open).toBe('true')

    tooltip.dispatchEvent(new MouseEvent('pointerleave', { relatedTarget: document.body }))
    expect(tooltip.dataset.open).toBe('false')
  })

  it('말풍선은 한 번에 하나만 열린다 — 다른 앵커가 열리면 먼저 열린 것을 닫는다', () => {
    const first = setup()
    const second = setup()
    first.anchor.dispatchEvent(new FocusEvent('focusin'))
    second.anchor.dispatchEvent(new MouseEvent('pointerenter'))
    vi.advanceTimersByTime(400)

    expect(second.tooltip.dataset.open).toBe('true')
    expect(first.tooltip.dataset.open).toBe('false')
  })
})

describe('createTooltipTrigger — 화면 가장자리', () => {
  const VIEWPORT = { width: 320, height: 600 }
  const rect = ({ left, top, width, height }: { left: number; top: number; width: number; height: number }) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect

  /** 앵커 상자와 말풍선 크기로, CSS가 놓을 자리를 흉내 낸다 (간격 10px, 가운데 정렬 + --_shift) */
  const setup = ({ anchorBox, tip, place }: { anchorBox: { left: number; top: number; width: number; height: number }; tip: { width: number; height: number }; place: string }) => {
    const anchor = document.createElement('button')
    const tooltip = document.createElement('span')
    tooltip.dataset.place = place
    document.body.append(anchor, tooltip)
    anchor.getBoundingClientRect = () => rect(anchorBox)
    tooltip.getBoundingClientRect = () => {
      const shift = parseFloat(tooltip.style.getPropertyValue('--_shift') || '0')
      const centerX = anchorBox.left + anchorBox.width / 2
      const centerY = anchorBox.top + anchorBox.height / 2
      const at = tooltip.dataset.place
      if (at === 'top') return rect({ left: centerX - tip.width / 2 + shift, top: anchorBox.top - 10 - tip.height, ...tip })
      if (at === 'bottom') return rect({ left: centerX - tip.width / 2 + shift, top: anchorBox.top + anchorBox.height + 10, ...tip })
      if (at === 'left') return rect({ left: anchorBox.left - 10 - tip.width, top: centerY - tip.height / 2 + shift, ...tip })
      return rect({ left: anchorBox.left + anchorBox.width + 10, top: centerY - tip.height / 2 + shift, ...tip })
    }
    const cleanup = createTooltipTrigger({ anchor, tooltip })
    cleanups.push(cleanup)
    return { anchor, tooltip, cleanup }
  }

  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: VIEWPORT.width })
    Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: VIEWPORT.height })
  })
  afterEach(() => {
    // @ts-expect-error 테스트가 덮어쓴 값을 걷는다 — jsdom 기본값(0)으로 돌아간다
    delete document.documentElement.clientWidth
    // @ts-expect-error 위와 같다
    delete document.documentElement.clientHeight
    cleanups.splice(0).forEach((cleanup) => cleanup())
    document.body.innerHTML = ''
  })

  it('자리가 넉넉하면 방향도 위치도 그대로 둔다', () => {
    const { anchor, tooltip } = setup({ anchorBox: { left: 140, top: 300, width: 40, height: 40 }, tip: { width: 120, height: 32 }, place: 'top' })
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.place).toBe('top')
    expect(tooltip.style.getPropertyValue('--_shift')).toBe('')
  })

  it('위가 좁고 아래가 넉넉하면 아래로 뒤집는다', () => {
    const { anchor, tooltip } = setup({ anchorBox: { left: 140, top: 20, width: 40, height: 40 }, tip: { width: 120, height: 32 }, place: 'top' })
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.place).toBe('bottom')
  })

  it('양쪽 다 좁으면 정한 방향을 지킨다', () => {
    Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 90 })
    const { anchor, tooltip } = setup({ anchorBox: { left: 140, top: 25, width: 40, height: 40 }, tip: { width: 120, height: 32 }, place: 'top' })
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.place).toBe('top')
  })

  it('좌우 어느 쪽에도 자리가 없으면(좁은 화면) 위·아래로 돌린다', () => {
    const { anchor, tooltip } = setup({ anchorBox: { left: 120, top: 300, width: 80, height: 40 }, tip: { width: 180, height: 32 }, place: 'left' })
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.place).toBe('top')
  })

  it('오른쪽 끝 앵커의 말풍선은 화면 안으로 밀어 넣는다 (가장자리 여백 8px)', () => {
    const { anchor, tooltip } = setup({ anchorBox: { left: 272, top: 300, width: 40, height: 40 }, tip: { width: 120, height: 32 }, place: 'top' })
    anchor.dispatchEvent(new FocusEvent('focusin'))
    // 가운데 292 → 말풍선 232~352. 오른쪽 한계 312에 맞추려면 -40
    expect(tooltip.style.getPropertyValue('--_shift')).toBe('-40px')
  })

  it('화살표가 말풍선 밖으로 나갈 만큼은 밀지 않는다', () => {
    const { anchor, tooltip } = setup({ anchorBox: { left: 300, top: 300, width: 16, height: 16 }, tip: { width: 60, height: 32 }, place: 'top' })
    anchor.dispatchEvent(new FocusEvent('focusin'))
    // 넘친 만큼은 26px이지만 화살표가 모서리 안쪽에 남도록 폭의 절반 - 12px(18px)까지만
    expect(tooltip.style.getPropertyValue('--_shift')).toBe('-18px')
  })

  it('열 때마다 원래 방향에서 다시 잰다 — 스크롤로 자리가 생기면 돌아온다. 해제하면 원래 방향을 되돌린다', () => {
    const box = { left: 140, top: 20, width: 40, height: 40 }
    const { anchor, tooltip, cleanup } = setup({ anchorBox: box, tip: { width: 120, height: 32 }, place: 'top' })
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.place).toBe('bottom')

    anchor.dispatchEvent(new FocusEvent('focusout'))
    box.top = 300
    anchor.dispatchEvent(new FocusEvent('focusin'))
    expect(tooltip.dataset.place).toBe('top')

    anchor.dispatchEvent(new FocusEvent('focusout'))
    box.top = 20
    anchor.dispatchEvent(new FocusEvent('focusin'))
    cleanup()
    expect(tooltip.dataset.place).toBe('top')
  })
})
