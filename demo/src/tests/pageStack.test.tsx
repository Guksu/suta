import { useRef } from 'react'
import { act, render, renderHook, screen } from '@testing-library/react'
import { usePageStack } from '@skills/page-transition/assets/usePageStack'

/** jsdom에는 View Transitions가 없다 — 코어의 폴백 경로(전환 없이 즉시 교체)로 동작한다 */
describe('usePageStack — 화면 스택과 스크롤 기억', () => {
  beforeEach(() => {
    // jsdom은 window.scrollTo를 구현하지 않는다 — 스크롤 컨테이너를 주지 않은 경우의 경로
    vi.stubGlobal('scrollTo', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const setup = () =>
    renderHook(() => {
      const scrollRef = useRef<HTMLElement | null>(null)
      const stack = usePageStack<string>({ initial: 'list', scrollRef })
      return { stack, scrollRef }
    })

  const attachScrollBox = (scrollRef: { current: HTMLElement | null }) => {
    const box = document.createElement('div')
    // jsdom은 실제로 스크롤하지 않으므로 scrollTop을 쓰고 읽는 것만 확인한다
    box.scrollTop = 0
    scrollRef.current = box
    return box
  }

  it('push하면 새 화면으로 들어가고 back하면 돌아온다', () => {
    const { result } = setup()

    expect(result.current.stack.current).toBe('list')
    expect(result.current.stack.canGoBack).toBe(false)

    act(() => result.current.stack.push('detail'))
    expect(result.current.stack.current).toBe('detail')
    expect(result.current.stack.depth).toBe(2)
    expect(result.current.stack.canGoBack).toBe(true)

    act(() => result.current.stack.back())
    expect(result.current.stack.current).toBe('list')
    expect(result.current.stack.depth).toBe(1)
  })

  it('첫 화면에서 back은 아무 일도 하지 않는다', () => {
    const { result } = setup()

    act(() => result.current.stack.back())
    expect(result.current.stack.current).toBe('list')
    expect(result.current.stack.depth).toBe(1)
  })

  it('들어갈 때 새 화면은 맨 위에서 시작한다', () => {
    const { result } = setup()
    const box = attachScrollBox(result.current.scrollRef)
    box.scrollTop = 420

    act(() => result.current.stack.push('detail'))

    expect(box.scrollTop).toBe(0)
  })

  it('돌아오면 목록에서 보던 위치로 복원된다', () => {
    const { result } = setup()
    const box = attachScrollBox(result.current.scrollRef)
    box.scrollTop = 420

    act(() => result.current.stack.push('detail'))
    box.scrollTop = 60 // 상세 화면에서 조금 내려 봄

    act(() => result.current.stack.back())

    expect(box.scrollTop).toBe(420)
  })

  it('여러 단계를 들어갔다 나와도 각 단계의 위치를 따로 기억한다', () => {
    const { result } = setup()
    const box = attachScrollBox(result.current.scrollRef)

    box.scrollTop = 300
    act(() => result.current.stack.push('detail'))
    box.scrollTop = 150
    act(() => result.current.stack.push('review'))

    act(() => result.current.stack.back())
    expect(box.scrollTop).toBe(150)

    act(() => result.current.stack.back())
    expect(box.scrollTop).toBe(300)
  })
})

type StartViewTransition = (callback: () => void | Promise<void>) => { finished: Promise<void> }

describe('usePageStack — 상태와 경계', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, 'startViewTransition')
    history.replaceState(null, '')
  })

  it('전환이 끝나기 전의 연타는 화면을 두 번 쌓지 않는다', async () => {
    let finish = () => {}
    const start: StartViewTransition = (callback) => {
      // 브라우저는 사진을 찍은 뒤(다음 프레임)에 콜백을 부른다 — 그 사이에 두 번째 탭이 들어온다
      const finished = new Promise<void>((resolve) => {
        finish = () => {
          void callback()
          resolve()
        }
      })
      return { finished }
    }
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true, writable: true })
    const { result } = renderHook(() => usePageStack<string>({ initial: 'list' }))

    act(() => {
      result.current.push('detail')
      result.current.push('detail')
    })
    await act(async () => {
      finish()
      await Promise.resolve()
    })
    expect(result.current.depth).toBe(2)

    // 전환이 끝나면 다시 받는다
    act(() => result.current.back())
    await act(async () => {
      finish()
      await Promise.resolve()
    })
    expect(result.current.depth).toBe(1)
  })

  const Screens = ({ syncHistory = false }: { syncHistory?: boolean }) => {
    const stack = usePageStack<string>({ initial: 'list', syncHistory })
    return (
      <div>
        <main data-page-view>
          {stack.current === 'list' ? (
            <ul>
              <li>
                <button type="button" onClick={() => stack.push('a')}>잔치국수</button>
              </li>
              <li>
                <button type="button" onClick={() => stack.push('b')}>비빔국수</button>
              </li>
            </ul>
          ) : (
            <div>
              <h2>{stack.current}</h2>
              <button type="button" onClick={stack.back}>뒤로</button>
              {stack.current !== 'c' && (
                <button type="button" onClick={() => stack.push('c')}>후기</button>
              )}
            </div>
          )}
        </main>
        <output data-testid="depth">{stack.depth}</output>
      </div>
    )
  }

  it('들어가면 누른 버튼이 사라지므로 포커스를 새 화면(data-page-view)으로 옮긴다', () => {
    render(<Screens />)
    const row = screen.getByText('비빔국수')
    row.focus()
    act(() => row.click())
    const view = document.querySelector('[data-page-view]') as HTMLElement
    expect(document.activeElement).toBe(view)
    expect(view.getAttribute('tabindex')).toBe('-1')
  })

  it('돌아오면 들어갈 때 눌렀던 그 항목으로 포커스가 돌아간다', () => {
    render(<Screens />)
    const row = screen.getByText('비빔국수')
    row.focus()
    act(() => row.click())
    const back = screen.getByText('뒤로')
    back.focus()
    act(() => back.click())
    expect(document.activeElement).toBe(screen.getByText('비빔국수'))
  })

  it('syncHistory면 들어갈 때 history에 항목을 쌓고, 브라우저 뒤로 가기(popstate)로 돌아온다', () => {
    render(<Screens syncHistory />)
    const lengthBefore = history.length
    act(() => screen.getByText('잔치국수').click())
    expect(history.length).toBe(lengthBefore + 1)
    expect(screen.getByTestId('depth').textContent).toBe('2')

    // 브라우저 뒤로 가기 — 첫 화면의 항목(순번 0)으로 돌아왔다
    act(() => {
      history.replaceState({ __pageStack: 0 }, '')
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __pageStack: 0 } }))
    })
    expect(screen.getByTestId('depth').textContent).toBe('1')
    expect(screen.getByText('잔치국수')).toBeInTheDocument()
  })

  it('syncHistory면 뒤로 간 뒤 브라우저 앞으로 가기로 그 화면에 다시 들어간다', () => {
    render(<Screens syncHistory />)
    act(() => screen.getByText('잔치국수').click())
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __pageStack: 0 } }))
    })
    expect(screen.getByTestId('depth').textContent).toBe('1')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __pageStack: 1 } }))
    })
    expect(screen.getByTestId('depth').textContent).toBe('2')
    expect(screen.getByRole('heading').textContent).toBe('a')
  })

  it('syncHistory에서 뒤로 간 뒤 다른 화면으로 들어가면 앞으로 갈 화면은 버린다', () => {
    render(<Screens syncHistory />)
    act(() => screen.getByText('잔치국수').click())
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __pageStack: 0 } }))
    })
    act(() => screen.getByText('비빔국수').click())
    expect(screen.getByTestId('depth').textContent).toBe('2')
    expect(screen.getByRole('heading').textContent).toBe('b')
  })

  it('syncHistory의 back()은 history.back()을 부른다 — 화면은 popstate가 바꾼다', () => {
    const historyBack = vi.spyOn(history, 'back').mockImplementation(() => {})
    render(<Screens syncHistory />)
    act(() => screen.getByText('잔치국수').click())
    act(() => screen.getByText('뒤로').click())
    expect(historyBack).toHaveBeenCalledTimes(1)
    historyBack.mockRestore()
  })

  it('브라우저 뒤로 가기로 돌아와도(포커스가 화면 영역에 머문 채) 눌렀던 항목으로 포커스가 돌아간다', () => {
    render(<Screens syncHistory />)
    const row = screen.getByText('비빔국수')
    row.focus()
    act(() => row.click())
    expect(document.activeElement).toBe(document.querySelector('[data-page-view]'))
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __pageStack: 0 } }))
    })
    expect(document.activeElement).toBe(screen.getByText('비빔국수'))
  })
})
