import { act, fireEvent, render, screen } from '@testing-library/react'
import { LikeButton } from '@skills/like-pop/assets/LikeButton'
import { DoubleTapArea } from '@skills/like-pop/assets/DoubleTapArea'

describe('LikeButton — 팝은 눌렀을 때만', () => {
  it('이미 좋아요인 채로 그려지면 팝하지 않는다 — 목록을 열 때 모든 하트가 튀지 않게', () => {
    render(<LikeButton liked onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('data-pop', 'false')
  })

  it('그려진 뒤 좋아요로 바뀌면 팝한다 — 버튼을 눌렀든 밖에서(더블탭) 바꿨든', () => {
    const view = render(<LikeButton liked={false} onChange={() => {}} />)
    view.rerender(<LikeButton liked onChange={() => {}} />)
    expect(screen.getByRole('button')).not.toHaveAttribute('data-pop', 'false')
  })

  it('좋아요 수가 있으면 버튼 이름에 함께 읽힌다 — aria-label이 안쪽 글자를 덮기 때문이다', () => {
    render(<LikeButton liked={false} onChange={() => {}} count={1280} />)
    expect(screen.getByRole('button')).toHaveAccessibleName('좋아요 1,280')
  })

  it('formatCount로 수의 표시를 바꾼다', () => {
    render(<LikeButton liked={false} onChange={() => {}} count={12800} formatCount={(n) => `${n / 10000}만`} />)
    expect(screen.getByRole('button')).toHaveTextContent('1.28만')
  })
})

describe('DoubleTapArea — 버스트 하트의 정리', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const doubleTap = (el: HTMLElement) => {
    fireEvent.click(el, { clientX: 10, clientY: 10 })
    fireEvent.click(el, { clientX: 10, clientY: 10 })
  }

  it('animationend가 오지 않아도(애니메이션을 끈 화면·가려진 요소) 하트가 남지 않는다', () => {
    const { container } = render(
      <DoubleTapArea>
        <p>사진</p>
      </DoubleTapArea>,
    )
    doubleTap(screen.getByText('사진'))
    expect(container.querySelectorAll('.burst-heart')).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1500))
    expect(container.querySelectorAll('.burst-heart')).toHaveLength(0)
  })

  it('animationend가 오면 그때 바로 지운다', () => {
    const { container } = render(
      <DoubleTapArea>
        <p>사진</p>
      </DoubleTapArea>,
    )
    doubleTap(screen.getByText('사진'))
    fireEvent.animationEnd(container.querySelector('.burst-heart') as Element)
    expect(container.querySelectorAll('.burst-heart')).toHaveLength(0)
  })
})
