import { act, fireEvent, render, screen } from '@testing-library/react'
import { useStoryProgress } from '@skills/story-progress/assets/useStoryProgress'

const Story = ({ count = 3, durationMs = 1000 }: { count?: number; durationMs?: number }) => {
  const story = useStoryProgress({ count, durationMs })
  return (
    <div onPointerDown={story.pause} onPointerUp={story.resume}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} ref={story.registerBar(i)} data-testid={`bar-${i}`} />
      ))}
      <output>{story.index}</output>
      <button type="button" onClick={story.tapNext}>
        next
      </button>
      <button type="button" onClick={story.restart}>
        restart
      </button>
    </div>
  )
}

describe('useStoryProgress — React 훅', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const index = () => screen.getByRole('status').textContent

  it('durationMs가 바뀌어도 첫 장면으로 돌아가지 않는다', () => {
    const view = render(<Story durationMs={1000} />)
    act(() => vi.advanceTimersByTime(1100))
    expect(index()).toBe('1')
    view.rerender(<Story durationMs={2000} />)
    expect(index()).toBe('1')
    // 새 시간(2000ms)이 지금 구간부터 적용된다
    act(() => vi.advanceTimersByTime(1200))
    expect(index()).toBe('1')
    act(() => vi.advanceTimersByTime(1000))
    expect(index()).toBe('2')
  })

  it('restart하면 index도 0으로 돌아간다', () => {
    render(<Story />)
    act(() => vi.advanceTimersByTime(2100))
    expect(index()).toBe('2')
    fireEvent.click(screen.getByText('restart'))
    expect(index()).toBe('0')
  })

  it('길게 눌렀다 뗀 뒤의 click은 장면을 넘기지 않고, 짧은 탭과 누름 없는 click(키보드)은 넘긴다', () => {
    render(<Story />)
    const next = screen.getByText('next')
    fireEvent.pointerDown(next)
    act(() => vi.advanceTimersByTime(600))
    fireEvent.pointerUp(next)
    fireEvent.click(next)
    expect(index()).toBe('0')
    // 누름 없이 온 click — 지난 긴 누름이 남아 무시되면 안 된다
    fireEvent.click(next)
    expect(index()).toBe('1')
    fireEvent.pointerDown(next)
    act(() => vi.advanceTimersByTime(80))
    fireEvent.pointerUp(next)
    fireEvent.click(next)
    expect(index()).toBe('2')
  })
})
