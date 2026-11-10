import { createBackDismiss } from '@skills/bottom-sheet/assets/createBackDismiss'

/** jsdom의 history.back()은 다음 작업에서 popstate를 낸다 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('createBackDismiss — 뒤로 가기로 오버레이 닫기', () => {
  afterEach(async () => {
    await settle()
  })

  it('열 때 history에 항목을 하나 쌓고, 뒤로 가기가 오면 onDismiss를 부른다', async () => {
    const onDismiss = vi.fn()
    const before = history.length
    createBackDismiss({ onDismiss })
    expect(history.length).toBe(before + 1)

    history.back()
    await settle()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('다른 길(버튼·Esc)로 닫으면 쌓아 둔 항목을 걷는다 — 뒤로 가기를 한 번 더 누르게 하지 않는다. 이때는 onDismiss를 부르지 않는다', async () => {
    const onDismiss = vi.fn()
    const back = vi.spyOn(history, 'back')
    const release = createBackDismiss({ onDismiss })

    release()
    await settle()
    expect(back).toHaveBeenCalledTimes(1)
    expect(onDismiss).not.toHaveBeenCalled()
    back.mockRestore()
  })

  it('오버레이 안의 링크로 화면이 넘어간 뒤에는 history를 건드리지 않는다', async () => {
    const back = vi.spyOn(history, 'back')
    const release = createBackDismiss({ onDismiss: () => {} })
    history.pushState({ page: 'next' }, '') // 라우터가 다음 화면을 쌓았다

    release()
    await settle()
    expect(back).not.toHaveBeenCalled()
    back.mockRestore()
  })

  it('닫자마자 다시 열면(React StrictMode의 이중 실행 포함) 항목을 걷지 않고 물려받는다', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const back = vi.spyOn(history, 'back')
    const before = history.length

    const release = createBackDismiss({ onDismiss: first })
    release()
    createBackDismiss({ onDismiss: second })
    await settle()

    expect(back).not.toHaveBeenCalled()
    expect(history.length).toBe(before + 1)
    expect(second).not.toHaveBeenCalled()
    back.mockRestore()

    history.back()
    await settle()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it('겹쳐 열린 둘 중 위의 것만 닫는다', async () => {
    const lower = vi.fn()
    const upper = vi.fn()
    createBackDismiss({ onDismiss: lower })
    createBackDismiss({ onDismiss: upper })

    history.back()
    await settle()
    expect(upper).toHaveBeenCalledTimes(1)
    expect(lower).not.toHaveBeenCalled()

    history.back()
    await settle()
    expect(lower).toHaveBeenCalledTimes(1)
  })

  it('라우터가 history.state에 둔 값을 지우지 않는다', () => {
    history.replaceState({ key: 'router-key' }, '')
    const release = createBackDismiss({ onDismiss: () => {} })
    expect(history.state.key).toBe('router-key')
    release()
  })
})
