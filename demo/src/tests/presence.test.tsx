import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { Presence } from '@skills/enter-exit/assets/Presence'

const advanceFrames = () => {
  act(() => {
    vi.advanceTimersByTime(50)
  })
}

describe('Presence — 진입/퇴장 상태 머신', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('show=false면 아무것도 렌더링하지 않는다', () => {
    render(
      <Presence show={false}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    expect(screen.queryByTestId('box')).not.toBeInTheDocument()
  })

  it('show=true면 entering 상태로 마운트되고 프레임 뒤 entered가 된다', () => {
    render(
      <Presence show>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    expect(screen.getByTestId('box')).toHaveAttribute('data-state', 'entering')
    advanceFrames()
    expect(screen.getByTestId('box')).toHaveAttribute('data-state', 'entered')
  })

  it('show가 false로 바뀌면 exiting 상태를 거쳐 transitionend 후 언마운트된다', () => {
    const { rerender } = render(
      <Presence show>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    advanceFrames()
    rerender(
      <Presence show={false}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    const box = screen.getByTestId('box')
    expect(box).toHaveAttribute('data-state', 'exiting')
    act(() => {
      box.dispatchEvent(new Event('transitionend', { bubbles: true }))
    })
    expect(screen.queryByTestId('box')).not.toBeInTheDocument()
  })

  it('transitionend가 오지 않아도 timeoutMs 후 언마운트된다 (폴백)', () => {
    const { rerender } = render(
      <Presence show timeoutMs={300}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    advanceFrames()
    rerender(
      <Presence show={false} timeoutMs={300}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    expect(screen.getByTestId('box')).toHaveAttribute('data-state', 'exiting')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByTestId('box')).not.toBeInTheDocument()
  })

  it('exiting 중 show가 다시 true가 되면 언마운트 없이 재진입한다', () => {
    const { rerender } = render(
      <Presence show timeoutMs={300}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    advanceFrames()
    rerender(
      <Presence show={false} timeoutMs={300}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    rerender(
      <Presence show timeoutMs={300}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    advanceFrames()
    expect(screen.getByTestId('box')).toHaveAttribute('data-state', 'entered')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByTestId('box')).toBeInTheDocument()
  })

  it('StrictMode에서 처음부터 show=true로 마운트해도 entering에 멈추지 않는다', () => {
    // 개발 모드는 effect를 정리했다가 다시 돌린다 — 정리된 컨트롤러를 다시 쓰면 프레임 예약이 사라진 채 entering에 남는다
    render(
      <StrictMode>
        <Presence show>
          <div data-testid="box">내용</div>
        </Presence>
      </StrictMode>,
    )
    advanceFrames()
    expect(screen.getByTestId('box')).toHaveAttribute('data-state', 'entered')
  })

  it('appear={false}면 처음부터 열려 있는 요소가 진입 애니메이션 없이 entered로 그려진다', () => {
    render(
      <Presence show appear={false}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    expect(screen.getByTestId('box')).toHaveAttribute('data-state', 'entered')
  })

  it('appear={false}여도 닫았다가 다시 열 때는 entering을 거친다', () => {
    const { rerender } = render(
      <Presence show appear={false} timeoutMs={300}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    rerender(
      <Presence show={false} appear={false} timeoutMs={300}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByTestId('box')).not.toBeInTheDocument()
    rerender(
      <Presence show appear={false} timeoutMs={300}>
        <div data-testid="box">내용</div>
      </Presence>,
    )
    expect(screen.getByTestId('box')).toHaveAttribute('data-state', 'entering')
    advanceFrames()
    expect(screen.getByTestId('box')).toHaveAttribute('data-state', 'entered')
  })
})
