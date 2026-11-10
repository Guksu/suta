import { createOtpInput } from '@skills/otp-input/assets/createOtpInput'

describe('createOtpInput — 포커스 이동과 붙여넣기 분배', () => {
  let group: HTMLElement
  let inputs: HTMLInputElement[]
  let changes: string[]
  let completed: string[]
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    group = document.createElement('div')
    document.body.appendChild(group)
    inputs = Array.from({ length: 6 }, () => {
      const input = document.createElement('input')
      group.appendChild(input)
      return input
    })
    changes = []
    completed = []
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    group.remove()
  })

  const register = () => {
    const controller = createOtpInput({
      inputs,
      onChange: (code) => changes.push(code),
      onComplete: (code) => completed.push(code),
    })
    cleanups.push(controller.destroy)
    return controller
  }

  /** 사용자가 한 칸에 글자를 치는 것 — 브라우저가 값을 넣은 뒤 input 이벤트가 온다 */
  const type = ({ index, text }: { index: number; text: string }) => {
    inputs[index].value = text
    inputs[index].dispatchEvent(new Event('input', { bubbles: true }))
  }

  const press = ({ index, key }: { index: number; key: string }) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    inputs[index].dispatchEvent(event)
    return event
  }

  const codeOf = () => inputs.map((input) => input.value).join('')

  it('한 글자를 치면 그 칸에 남고 다음 칸으로 넘어간다', () => {
    register()
    type({ index: 0, text: '4' })

    expect(inputs[0].value).toBe('4')
    expect(document.activeElement).toBe(inputs[1])
    expect(changes).toEqual(['4'])
  })

  it('숫자가 아닌 글자는 들어가지 않는다', () => {
    register()
    type({ index: 0, text: 'ㄱ' })

    expect(codeOf()).toBe('')
    expect(document.activeElement).not.toBe(inputs[1])
  })

  it('한 칸에 여러 글자가 밀려 들어와도 칸마다 나눠 담는다 (자동완성·모바일 키보드)', () => {
    register()
    type({ index: 0, text: '482913' })

    expect(codeOf()).toBe('482913')
    expect(completed).toEqual(['482913'])
  })

  const paste = ({ index, text }: { index: number; text: string }) => {
    const event = new Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown }
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })
    inputs[index].dispatchEvent(event)
    return event
  }

  it('코드 일부를 중간 칸에 붙여넣으면 그 칸부터 채우고 남는 글자는 버린다', () => {
    register()
    const event = paste({ index: 4, text: '1-23' })

    expect(codeOf()).toBe('12') // 앞 네 칸은 비어 있다
    expect(inputs[4].value).toBe('1')
    expect(inputs[5].value).toBe('2')
    expect(event.defaultPrevented).toBe(true)
    expect(completed).toEqual([])
  })

  it('코드 전체를 아무 칸에나 붙여넣으면 첫 칸부터 채워 완성한다 — 중간 칸을 눌렀다고 뒷자리를 버리지 않는다', () => {
    register()
    type({ index: 0, text: '9' }) // 틀린 글자가 남아 있어도 덮어쓴다
    paste({ index: 3, text: '482 913' })

    expect(codeOf()).toBe('482913')
    expect(completed).toEqual(['482913'])
  })

  it('중간 칸에 코드 전체가 밀려 들어와도 첫 칸부터 채운다 (포커스가 있던 칸으로 들어오는 자동 입력)', () => {
    register()
    type({ index: 2, text: '482913' })

    expect(codeOf()).toBe('482913')
    expect(completed).toEqual(['482913'])
  })

  it('글자가 있는 칸에 선택 없이 한 글자를 더 치면 그 칸을 덮어쓰고 다음 칸으로 간다 — 뒤 칸으로 밀려 나가지 않는다', () => {
    register()
    type({ index: 0, text: '4' })
    inputs[0].value = '45' // 브라우저가 커서 자리에 끼워 넣은 뒤의 값
    inputs[0].dispatchEvent(new InputEvent('input', { bubbles: true, data: '5', inputType: 'insertText' }))

    expect(inputs[0].value).toBe('5')
    expect(inputs[1].value).toBe('')
    expect(document.activeElement).toBe(inputs[1])
  })

  it('글자가 있는 칸에 허용하지 않는 글자를 쳐도 원래 글자가 남는다', () => {
    register()
    type({ index: 0, text: '4' })
    inputs[0].value = '4ㄱ'
    inputs[0].dispatchEvent(new InputEvent('input', { bubbles: true, data: 'ㄱ', inputType: 'insertText' }))

    expect(inputs[0].value).toBe('4')
    expect(changes).toEqual(['4'])
  })

  it('자기 칸의 글자를 지우면 바뀐 값을 알린다', () => {
    register()
    type({ index: 0, text: '48' })
    inputs[1].value = '' // 값이 있는 칸의 지우기는 브라우저가 한다
    inputs[1].dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))

    expect(changes.at(-1)).toBe('4')
  })

  it('칸마다 data-filled를 직접 붙인다 — 건너뛰어 채운 칸도 제자리에 표시된다', () => {
    register()
    expect(inputs.map((input) => input.dataset.filled)).toEqual(Array(6).fill('false'))

    type({ index: 0, text: '4' })
    type({ index: 3, text: '8' })
    expect(inputs.map((input) => input.dataset.filled)).toEqual(['true', 'false', 'false', 'true', 'false', 'false'])
  })

  it('이미 포커스된 칸을 다시 눌러도 글자가 선택된 채로 남는다 — 커서가 글자 앞에 놓이면 지우기가 먹지 않는다', () => {
    register()
    type({ index: 0, text: '4' })
    inputs[0].focus()
    inputs[0].setSelectionRange(0, 0)
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })
    inputs[0].dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true) // 브라우저가 커서를 옮기지 못하게 막는다
    expect(inputs[0].selectionStart).toBe(0)
    expect(inputs[0].selectionEnd).toBe(1)
  })

  it('포커스가 없는 칸을 누르는 것은 막지 않는다 — 포커스가 옮겨 가야 한다', () => {
    register()
    type({ index: 0, text: '4' }) // 포커스는 둘째 칸으로 갔다
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })
    inputs[0].dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('마지막 칸까지 차면 완성으로 알린다 — 한 번만', () => {
    register()
    '482913'.split('').forEach((digit, index) => type({ index, text: digit }))

    expect(completed).toEqual(['482913'])
  })

  it('빈 칸에서 지우면 앞 칸을 지우고 앞으로 돌아간다', () => {
    register()
    type({ index: 0, text: '4' })
    const event = press({ index: 1, key: 'Backspace' })

    expect(event.defaultPrevented).toBe(true)
    expect(inputs[0].value).toBe('')
    expect(document.activeElement).toBe(inputs[0])
  })

  it('값이 있는 칸에서의 지우기는 브라우저에 맡긴다', () => {
    register()
    type({ index: 0, text: '4' })
    const event = press({ index: 0, key: 'Backspace' })

    expect(event.defaultPrevented).toBe(false)
  })

  it('첫 칸에서 지워도 앞으로 넘어가지 않는다', () => {
    register()
    press({ index: 0, key: 'Backspace' })

    expect(changes).toEqual([])
  })

  it('방향키·Home·End로 칸 사이를 옮긴다', () => {
    register()
    press({ index: 2, key: 'ArrowLeft' })
    expect(document.activeElement).toBe(inputs[1])

    press({ index: 1, key: 'ArrowRight' })
    expect(document.activeElement).toBe(inputs[2])

    press({ index: 2, key: 'Home' })
    expect(document.activeElement).toBe(inputs[0])

    press({ index: 0, key: 'End' })
    expect(document.activeElement).toBe(inputs[5])
  })

  it('clear는 전부 지우고 첫 칸으로 되돌린다', () => {
    const controller = register()
    type({ index: 0, text: '482913' })

    controller.clear()
    expect(codeOf()).toBe('')
    expect(document.activeElement).toBe(inputs[0])
    expect(changes.at(-1)).toBe('')
  })

  it('focusFirstEmpty는 아직 비어 있는 첫 칸으로 간다', () => {
    const controller = register()
    type({ index: 0, text: '48' })

    controller.focusFirstEmpty()
    expect(document.activeElement).toBe(inputs[2])
  })

  it('destroy 뒤에는 반응하지 않는다', () => {
    const controller = register()
    controller.destroy()
    type({ index: 0, text: '4' })

    expect(changes).toEqual([])
  })
})
