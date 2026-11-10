import { act, render, screen } from '@testing-library/react'
import { useSkeletonGate } from '@skills/skeleton/assets/useSkeletonGate'

const Card = ({ name, delayMs }: { name?: string; delayMs?: number }) => {
  const showSkeleton = useSkeletonGate({ loading: !name, delayMs, minVisibleMs: 400 })
  if (showSkeleton) return <p>뼈대</p>
  if (!name) return <p>빈 자리</p>
  return <p>{name}</p>
}

describe('useSkeletonGate — 로딩 값을 뼈대 표시 여부로 바꾼다', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const advance = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('빠른 응답이면 뼈대 없이 빈 자리에서 곧바로 내용으로 간다', () => {
    const { rerender } = render(<Card />)
    expect(screen.getByText('빈 자리')).toBeInTheDocument()

    advance(150)
    rerender(<Card name="잔치국수" />)

    expect(screen.getByText('잔치국수')).toBeInTheDocument()
    advance(1000)
    expect(screen.queryByText('뼈대')).not.toBeInTheDocument()
  })

  it('느린 응답이면 200ms 뒤 뼈대를 띄우고, 응답이 와도 최소 시간은 유지한다', () => {
    const { rerender } = render(<Card />)

    advance(200)
    expect(screen.getByText('뼈대')).toBeInTheDocument()

    advance(100)
    rerender(<Card name="잔치국수" />)
    expect(screen.getByText('뼈대')).toBeInTheDocument() // 뜬 지 100ms — 아직 내리지 않는다

    advance(300)
    expect(screen.getByText('잔치국수')).toBeInTheDocument()
  })

  it('옵션이 바뀌어 다시 만들어져도 지금의 로딩 값을 이어받는다', () => {
    const { rerender } = render(<Card delayMs={5000} />)

    rerender(<Card delayMs={100} />)
    advance(100)

    expect(screen.getByText('뼈대')).toBeInTheDocument()
  })
})
