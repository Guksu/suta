import { shake } from '@skills/form-shake-error/assets/shakeCore'

describe('shake — data-shake 부착·해제·재시작', () => {
  let el: HTMLElement
  beforeEach(() => {
    el = document.createElement('input')
    document.body.appendChild(el)
  })
  afterEach(() => el.remove())

  it('부르면 data-shake가 붙고 animationend에 떨어진다', () => {
    shake(el)
    expect(el).toHaveAttribute('data-shake')
    el.dispatchEvent(new Event('animationend'))
    expect(el).not.toHaveAttribute('data-shake')
  })

  it('흔들리는 중에 다시 부르면 속성을 뗐다 다시 붙여 재시작한다', () => {
    shake(el)
    const removeSpy = vi.spyOn(el, 'removeAttribute')
    shake(el)
    expect(removeSpy).toHaveBeenCalledWith('data-shake')
    expect(el).toHaveAttribute('data-shake')
  })

  it('재시작 뒤 animationend 한 번으로 깨끗이 해제된다 (앞선 리스너는 재시작 때 걷힌다)', () => {
    shake(el)
    shake(el)
    el.dispatchEvent(new Event('animationend'))
    expect(el).not.toHaveAttribute('data-shake')
  })

  it('animationend가 오지 않아도 상한 시간이 지나면 해제된다 (모션을 줄이는 설정)', () => {
    vi.useFakeTimers()
    shake(el)
    expect(el).toHaveAttribute('data-shake')

    vi.advanceTimersByTime(600)
    expect(el).not.toHaveAttribute('data-shake')
    vi.useRealTimers()
  })

  it('다시 흔들면 앞선 상한이 새 흔들림을 지우지 못한다', () => {
    vi.useFakeTimers()
    shake(el)
    vi.advanceTimersByTime(500)
    shake(el) // 앞선 상한이 100ms 뒤에 터질 시점

    vi.advanceTimersByTime(100)
    expect(el).toHaveAttribute('data-shake')

    vi.advanceTimersByTime(500)
    expect(el).not.toHaveAttribute('data-shake')
    vi.useRealTimers()
  })

  it('자식의 animationend(버튼 스피너 등)가 올라와도 흔들림을 끊지 않는다 — 폼 전체를 흔들 때', () => {
    const form = document.createElement('form')
    const spinner = document.createElement('span')
    form.appendChild(spinner)
    document.body.appendChild(form)

    shake(form)
    spinner.dispatchEvent(new Event('animationend', { bubbles: true }))
    expect(form).toHaveAttribute('data-shake')

    form.dispatchEvent(new Event('animationend', { bubbles: true }))
    expect(form).not.toHaveAttribute('data-shake')
    form.remove()
  })

  it('끝난 뒤에는 리스너가 남지 않는다 — 다시 흔들지 않은 요소의 animationend가 속성을 건드리지 않는다', () => {
    vi.useFakeTimers()
    shake(el)
    shake(el)
    vi.advanceTimersByTime(600) // 상한으로 끝남 — animationend는 오지 않았다
    expect(el).not.toHaveAttribute('data-shake')

    el.setAttribute('data-shake', '') // 다른 코드가 붙인 속성이라고 치자
    el.dispatchEvent(new Event('animationend'))
    expect(el).toHaveAttribute('data-shake')
    vi.useRealTimers()
  })
})
