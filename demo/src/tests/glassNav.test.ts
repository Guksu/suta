import { INITIAL_NAV_STATE, reduceNavState, type NavState } from '@skills/glass-nav/assets/navScrollCore'
import { createGlassNav } from '@skills/glass-nav/assets/createGlassNav'

/** 스크롤 위치를 차례로 넣어 마지막 상태를 얻는다 */
const run = (positions: number[], options?: Parameters<typeof reduceNavState>[0]['options']) =>
  positions.reduce<NavState>((prev, scrollTop) => reduceNavState({ prev, scrollTop, options }), INITIAL_NAV_STATE)

describe('navScrollCore — 투명→유리, 숨김, 축소 판정', () => {
  it('맨 위에서는 투명, threshold를 넘으면 유리(elevated)', () => {
    expect(run([0]).elevated).toBe(false)
    expect(run([8]).elevated).toBe(false)
    expect(run([9]).elevated).toBe(true)
    expect(run([9, 0]).elevated).toBe(false)
  })

  it('elevate 모드에서는 아무리 내려도 숨기거나 줄이지 않는다', () => {
    const s = run([0, 100, 300, 600], { mode: 'elevate' })
    expect(s).toMatchObject({ elevated: true, hidden: false, compact: false })
  })

  it('hide 모드 — hideAfter를 넘겨 내려가면 숨고, 위로 올리면 바로 나타난다', () => {
    expect(run([0, 50], { mode: 'hide' }).hidden).toBe(false) // 아직 hideAfter(80) 안
    expect(run([0, 50, 120], { mode: 'hide' }).hidden).toBe(true)
    expect(run([0, 50, 120, 110], { mode: 'hide' }).hidden).toBe(false)
    expect(run([0, 50, 120, 110, 200], { mode: 'hide' }).hidden).toBe(true)
  })

  it('compact 모드 — 같은 신호로 축소·펼침, hidden은 건드리지 않는다', () => {
    const down = run([0, 200], { mode: 'compact' })
    expect(down).toMatchObject({ compact: true, hidden: false })
    const up = run([0, 200, 190], { mode: 'compact' })
    expect(up).toMatchObject({ compact: false, hidden: false })
  })

  it('최소 이동량(minDelta) 안의 튐은 상태를 바꾸지 않는다', () => {
    const base = run([0, 200], { mode: 'hide' })
    expect(base.hidden).toBe(true)
    const jitter = reduceNavState({ prev: base, scrollTop: 197, options: { mode: 'hide' } }) // 3px 위로 — 무시
    expect(jitter.hidden).toBe(true)
    expect(jitter.anchorY).toBe(200)
    const real = reduceNavState({ prev: base, scrollTop: 190, options: { mode: 'hide' } }) // 10px 위로 — 펼침
    expect(real.hidden).toBe(false)
  })

  it('맨 위(0)와 음수(iOS 고무줄)는 항상 펼친 투명 상태', () => {
    const s = run([0, 300, -20], { mode: 'hide' })
    expect(s).toMatchObject({ elevated: false, hidden: false, anchorY: 0 })
  })
})

describe('createGlassNav — 스크롤 이벤트로 data 속성을 붙인다', () => {
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  it('스크롤 위치에 따라 data-elevated·data-hidden이 바뀌고, destroy로 걷힌다', async () => {
    const container = document.createElement('div')
    const nav = document.createElement('header')
    const onChange = vi.fn()
    const ctl = createGlassNav({ container, nav, mode: 'hide', onChange })
    expect(nav.dataset.elevated).toBe('false')

    container.scrollTop = 150
    container.dispatchEvent(new Event('scroll'))
    await nextFrame()
    expect(nav.dataset.elevated).toBe('true')
    expect(nav.dataset.hidden).toBe('true')
    expect(onChange).toHaveBeenCalledTimes(1)

    container.scrollTop = 140
    container.dispatchEvent(new Event('scroll'))
    await nextFrame()
    expect(nav.dataset.hidden).toBe('false')

    ctl.destroy()
    expect(nav.dataset.elevated).toBeUndefined()
  })

  it('한 프레임 안의 여러 scroll 이벤트는 한 번만 판정한다', async () => {
    const container = document.createElement('div')
    const nav = document.createElement('header')
    const spy = vi.spyOn(window, 'requestAnimationFrame')
    createGlassNav({ container, nav })
    const before = spy.mock.calls.length
    container.dispatchEvent(new Event('scroll'))
    container.dispatchEvent(new Event('scroll'))
    container.dispatchEvent(new Event('scroll'))
    expect(spy.mock.calls.length - before).toBe(1)
    spy.mockRestore()
  })

  it('setOptions로 모드를 바꾸면 숨김·축소가 풀린다', async () => {
    const container = document.createElement('div')
    const nav = document.createElement('header')
    const ctl = createGlassNav({ container, nav, mode: 'compact' })
    container.scrollTop = 200
    container.dispatchEvent(new Event('scroll'))
    await nextFrame()
    expect(nav.dataset.compact).toBe('true')
    ctl.setOptions({ mode: 'elevate' })
    expect(nav.dataset.compact).toBe('false')
    expect(ctl.getState().elevated).toBe(true)
  })

  it('숨거나 접힌 바 안으로 포커스가 들어오면 다시 펼친다 — 화면 밖 링크에 포커스가 가지 않게', async () => {
    for (const mode of ['hide', 'compact'] as const) {
      const container = document.createElement('div')
      const nav = document.createElement('header')
      nav.innerHTML = '<a href="/menu">메뉴</a>'
      document.body.append(container, nav)
      const ctl = createGlassNav({ container, nav, mode })

      container.scrollTop = 300
      container.dispatchEvent(new Event('scroll'))
      await nextFrame()
      expect(mode === 'hide' ? nav.dataset.hidden : nav.dataset.compact).toBe('true')

      nav.querySelector('a')!.focus()
      expect(nav.dataset.hidden).toBe('false')
      expect(nav.dataset.compact).toBe('false')

      // 펼친 자리가 새 기준점이다 — 같은 자리의 스크롤 이벤트로 다시 숨지 않는다
      container.dispatchEvent(new Event('scroll'))
      await nextFrame()
      expect(nav.dataset.hidden).toBe('false')
      expect(nav.dataset.compact).toBe('false')

      ctl.destroy()
      nav.remove()
      container.remove()
    }
  })
})
