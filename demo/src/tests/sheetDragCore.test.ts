import { createSheetDrag } from '@skills/bottom-sheet/assets/createSheetDrag'

const pointer = ({ el, type, y }: { el: HTMLElement; type: string; y: number }) => {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientY: y, button: 0 }))
}

describe('createSheetDrag — 바텀시트 드래그 닫기 판정', () => {
  let sheet: HTMLElement
  let dismissed: number
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    sheet = document.createElement('div')
    document.body.appendChild(sheet)
    dismissed = 0
  })
  afterEach(() => {
    // window 리스너를 반드시 해제한다 — 남으면 다음 테스트의 이벤트를 함께 받는다
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
    sheet.remove()
  })

  const register = (options: { dismissThresholdPx?: number } = {}) => {
    const cleanup = createSheetDrag({ sheet, onDismiss: () => (dismissed += 1), ...options })
    cleanups.push(cleanup)
    return cleanup
  }

  it('드래그 중에는 transition을 끄고 손가락을 따라 translateY가 붙는다', () => {
    register()
    pointer({ el: sheet, type: 'pointerdown', y: 100 })
    pointer({ el: sheet, type: 'pointermove', y: 180 })
    expect(sheet.style.transition).toBe('none')
    expect(sheet.style.transform).toBe('translateY(80px)')
  })

  it('누르기만 하면(움직임 8px 미만) 드래그도 포인터 잡기도 하지 않는다 — 시트 안 버튼의 클릭을 빼앗지 않는다', () => {
    register()
    const capture = vi.fn()
    sheet.setPointerCapture = capture
    const press = (type: string, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientY: y, button: 0 })
      Object.defineProperty(event, 'pointerId', { value: 1 })
      sheet.dispatchEvent(event)
    }
    press('pointerdown', 100)
    press('pointermove', 104)
    expect(capture).not.toHaveBeenCalled()
    expect(sheet.style.transition).toBe('')
    expect(sheet.style.transform).toBe('')
    press('pointerup', 104)
    expect(dismissed).toBe(0)
    // 실제로 끌기 시작하면 그때 포인터를 잡는다
    press('pointerdown', 100)
    press('pointermove', 140)
    expect(capture).toHaveBeenCalledTimes(1)
    expect(sheet.style.transform).toBe('translateY(40px)')
  })

  it('위로 끌면 0으로 클램프된다 (시트가 위로 딸려 올라가지 않음)', () => {
    register()
    pointer({ el: sheet, type: 'pointerdown', y: 100 })
    pointer({ el: sheet, type: 'pointermove', y: 40 })
    expect(sheet.style.transform).toBe('translateY(0px)')
  })

  it('임계 거리를 넘겨 놓으면 onDismiss가 불리고 다음 프레임에 인라인 transform이 정리된다', () => {
    register({ dismissThresholdPx: 120 })
    pointer({ el: sheet, type: 'pointerdown', y: 100 })
    pointer({ el: sheet, type: 'pointermove', y: 300 })
    pointer({ el: sheet, type: 'pointerup', y: 300 })
    expect(dismissed).toBe(1)
    expect(sheet.style.transition).toBe('')
    vi.advanceTimersByTime(50)
    expect(sheet.style.transform).toBe('')
  })

  it('임계 미달이면 스냅백 — onDismiss 없이 transform이 즉시 정리된다', () => {
    register({ dismissThresholdPx: 120 })
    pointer({ el: sheet, type: 'pointerdown', y: 100 })
    pointer({ el: sheet, type: 'pointermove', y: 150 })
    pointer({ el: sheet, type: 'pointerup', y: 150 })
    expect(dismissed).toBe(0)
    expect(sheet.style.transform).toBe('')
    expect(sheet.style.transition).toBe('')
  })

  it('거리가 짧아도 빠르게 던지면(velocity) 닫힌다', () => {
    register({ dismissThresholdPx: 500 })
    pointer({ el: sheet, type: 'pointerdown', y: 100 })
    vi.advanceTimersByTime(16)
    pointer({ el: sheet, type: 'pointermove', y: 140 })
    vi.advanceTimersByTime(16)
    pointer({ el: sheet, type: 'pointermove', y: 190 })
    pointer({ el: sheet, type: 'pointerup', y: 190 })
    expect(dismissed).toBe(1)
  })

  it('드래그 중에는 텍스트 선택(selectstart)이 막히고, 놓으면 풀린다', () => {
    register()
    pointer({ el: sheet, type: 'pointerdown', y: 100 })
    const during = new Event('selectstart', { cancelable: true })
    document.dispatchEvent(during)
    expect(during.defaultPrevented).toBe(true)
    pointer({ el: sheet, type: 'pointerup', y: 100 })
    const after = new Event('selectstart', { cancelable: true })
    document.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })

  it('끌던 포인터를 브라우저가 가져가면(pointercancel) 닫지 않고 제자리로 돌린다 — 끌던 자리에 멈춰 있지 않는다', () => {
    register({ dismissThresholdPx: 120 })
    pointer({ el: sheet, type: 'pointerdown', y: 100 })
    pointer({ el: sheet, type: 'pointermove', y: 400 })
    window.dispatchEvent(new Event('pointercancel'))
    expect(dismissed).toBe(0)
    expect(sheet.style.transform).toBe('')
    expect(sheet.style.transition).toBe('')
    // 그 뒤의 move는 끌기로 이어지지 않는다
    pointer({ el: sheet, type: 'pointermove', y: 500 })
    expect(sheet.style.transform).toBe('')
  })

  it('끌기를 시작한 포인터가 아닌 다른 손가락의 움직임은 무시한다', () => {
    register()
    const fire = ({ type, y, id }: { type: string; y: number; id: number }) => {
      const event = new MouseEvent(type, { bubbles: true, clientY: y, button: 0 })
      Object.defineProperty(event, 'pointerId', { value: id })
      sheet.dispatchEvent(event)
    }
    fire({ type: 'pointerdown', y: 100, id: 1 })
    fire({ type: 'pointermove', y: 160, id: 1 })
    fire({ type: 'pointermove', y: 400, id: 2 })
    expect(sheet.style.transform).toBe('translateY(60px)')
    fire({ type: 'pointerup', y: 400, id: 2 })
    expect(sheet.style.transition).toBe('none') // 첫 손가락은 아직 끌고 있다
  })

  it('시트 안의 스크롤되는 영역에서 시작한 누름은 끌기로 보지 않는다 — 목록을 굴리는 손가락이다', () => {
    register()
    const list = document.createElement('div')
    list.style.overflowY = 'auto'
    Object.defineProperty(list, 'scrollHeight', { value: 900 })
    Object.defineProperty(list, 'clientHeight', { value: 300 })
    const row = document.createElement('p')
    list.append(row)
    sheet.append(list)

    pointer({ el: row, type: 'pointerdown', y: 100 })
    pointer({ el: row, type: 'pointermove', y: 300 })
    expect(sheet.style.transform).toBe('')

    // 내용이 넘치지 않아 스크롤할 것이 없는 영역은 그대로 끌린다
    const short = document.createElement('div')
    short.style.overflowY = 'auto'
    sheet.append(short)
    pointer({ el: short, type: 'pointerup', y: 300 })
    pointer({ el: short, type: 'pointerdown', y: 100 })
    pointer({ el: short, type: 'pointermove', y: 150 })
    expect(sheet.style.transform).toBe('translateY(50px)')
  })

  it('cleanup 후에는 드래그가 무시된다', () => {
    const cleanup = register()
    cleanup()
    pointer({ el: sheet, type: 'pointerdown', y: 100 })
    pointer({ el: sheet, type: 'pointermove', y: 400 })
    pointer({ el: sheet, type: 'pointerup', y: 400 })
    expect(dismissed).toBe(0)
    expect(sheet.style.transform).toBe('')
  })
})

describe('createSheetDrag — 스냅 포인트 (snapOffsetsPx)', () => {
  let sheet: HTMLElement
  let dismissed: number
  let snapped: number[]
  const cleanups: Array<() => void> = []

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    sheet = document.createElement('div')
    document.body.appendChild(sheet)
    dismissed = 0
    snapped = []
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
    sheet.remove()
  })

  const drag = ({ from, to, slow = true }: { from: number; to: number; slow?: boolean }) => {
    sheet.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: from, button: 0 }))
    if (slow) {
      // 느린 이동 — 중간 지점을 거치며 시간을 충분히 흘려 velocity를 낮춘다
      const mid = (from + to) / 2
      vi.advanceTimersByTime(300)
      sheet.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientY: mid }))
      vi.advanceTimersByTime(300)
    } else {
      // 빠른 던짐 — 한 프레임(16ms) 만에 이동해 velocity를 높인다
      vi.advanceTimersByTime(16)
    }
    sheet.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientY: to }))
    sheet.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientY: to }))
  }

  const register = () => {
    const cleanup = createSheetDrag({
      sheet,
      onDismiss: () => (dismissed += 1),
      dismissThresholdPx: 120,
      snapOffsetsPx: [0, 200],
      onSnap: (offset) => snapped.push(offset),
    })
    cleanups.push(cleanup)
  }

  it('반열림(200)에서 위로 끌어 놓으면 가까운 전체 열림(0)으로 스냅한다', () => {
    register()
    sheet.style.transform = 'translateY(200px)'
    drag({ from: 400, to: 250 })
    expect(sheet.style.transform).toBe('translateY(0px)')
    expect(snapped).toEqual([0])
  })

  it('전체 열림(0)에서 조금 끌어내려 놓으면 제자리(0)로 돌아온다', () => {
    register()
    sheet.style.transform = 'translateY(0px)'
    drag({ from: 100, to: 180 })
    expect(sheet.style.transform).toBe('translateY(0px)')
    expect(dismissed).toBe(0)
  })

  it('전체 열림에서 빠르게 던지면 다음 스냅(200)으로 내려간다', () => {
    register()
    sheet.style.transform = 'translateY(0px)'
    drag({ from: 100, to: 160, slow: false })
    expect(sheet.style.transform).toBe('translateY(200px)')
    expect(snapped).toEqual([200])
  })

  it('마지막 스냅(200)에서 빠르게 던지면 닫힌다', () => {
    register()
    sheet.style.transform = 'translateY(200px)'
    drag({ from: 100, to: 170, slow: false })
    expect(dismissed).toBe(1)
  })

  it('마지막 스냅에서 임계 이상 끌어내려 놓아도 닫힌다', () => {
    register()
    sheet.style.transform = 'translateY(200px)'
    drag({ from: 100, to: 260 })
    expect(dismissed).toBe(1)
  })
})
