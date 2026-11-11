import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useState } from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { segmentThumbFrame, moveSegmentThumb } from '@skills/segmented-control/assets/moveSegmentThumb'
import { SegmentedControl } from '@skills/segmented-control/assets/SegmentedControl'

const NOODLES = [
  { value: 'somyeon', label: '소면' },
  { value: 'kalguksu', label: '칼국수' },
  { value: 'naengmyeon', label: '냉면' },
]

const Harness = ({ onChange = () => {} }: { onChange?: (value: string) => void }) => {
  const [noodle, setNoodle] = useState('somyeon')
  return (
    <SegmentedControl
      name="noodle"
      label="면 종류"
      options={NOODLES}
      value={noodle}
      onChange={(next) => {
        setNoodle(next)
        onChange(next)
      }}
    />
  )
}

const makeSegment = ({ left, width }: { left: number; width: number }) => {
  const el = document.createElement('label')
  Object.defineProperty(el, 'offsetLeft', { value: left })
  Object.defineProperty(el, 'offsetWidth', { value: width })
  return el
}

describe('segmentThumbFrame — 측정값 → thumb 스타일 (순수 계산)', () => {
  it('offsetLeft는 translateX로, offsetWidth는 width로 옮긴다', () => {
    expect(segmentThumbFrame({ offsetLeft: 120, offsetWidth: 80 })).toEqual({
      transform: 'translateX(120px)',
      width: '80px',
    })
  })
})

describe('moveSegmentThumb — thumb를 선택 칸 위치로 이동', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('immediate면 transition을 껐다가 다음 프레임에 복원한다 (첫 배치가 슬라이드로 보이지 않게)', () => {
    const thumb = document.createElement('span')
    moveSegmentThumb({ thumb, target: makeSegment({ left: 40, width: 60 }), immediate: true })
    expect(thumb.style.transition).toBe('none')
    expect(thumb.style.transform).toBe('translateX(40px)')
    expect(thumb.style.width).toBe('60px')
    vi.advanceTimersByTime(50)
    expect(thumb.style.transition).toBe('')
  })

  it('immediate면 transition을 끈 채로 스타일을 한 번 확정한다 (다음 프레임 복원 전에 브라우저가 none을 보게)', () => {
    // rAF 콜백은 다음 프레임의 스타일 계산보다 먼저 돈다. 그 사이에 스타일을 확정하지 않으면
    // 브라우저는 none을 보지 못하고 첫 배치가 0에서 미끄러져 온다(프로덕션 빌드에서 확인)
    // 읽기는 getBoundingClientRect 호출로 한다 — 속성 읽기(void el.offsetWidth)는 일부 압축기가 지운다
    const thumb = document.createElement('span')
    const transitionsSeenOnRead: string[] = []
    const measure = thumb.getBoundingClientRect.bind(thumb)
    thumb.getBoundingClientRect = () => {
      transitionsSeenOnRead.push(thumb.style.transition)
      return measure()
    }
    moveSegmentThumb({ thumb, target: makeSegment({ left: 40, width: 60 }), immediate: true })
    expect(transitionsSeenOnRead).toContain('none')
  })

  it('immediate가 아니면 transition을 건드리지 않는다', () => {
    const thumb = document.createElement('span')
    moveSegmentThumb({ thumb, target: makeSegment({ left: 0, width: 50 }) })
    expect(thumb.style.transition).toBe('')
    expect(thumb.style.transform).toBe('translateX(0px)')
  })

  it('이미 그 자리면 immediate여도 transition을 끄지 않는다 (진행 중인 슬라이드를 끊지 않게)', () => {
    const thumb = document.createElement('span')
    const target = makeSegment({ left: 120, width: 60 })
    moveSegmentThumb({ thumb, target })
    moveSegmentThumb({ thumb, target, immediate: true })
    expect(thumb.style.transition).toBe('')
  })

  it('자리가 바뀌었으면 immediate가 즉시 다시 맞춘다', () => {
    const thumb = document.createElement('span')
    moveSegmentThumb({ thumb, target: makeSegment({ left: 120, width: 60 }) })
    moveSegmentThumb({ thumb, target: makeSegment({ left: 140, width: 70 }), immediate: true })
    expect(thumb.style.transition).toBe('none')
    expect(thumb.style.width).toBe('70px')
  })
})

describe('useSegmentedControl — 크기 감시가 진행 중인 슬라이드를 끊지 않는다', () => {
  // ResizeObserver는 observe() 직후 한 번 콜백을 부른다. 그 콜백이 transition: none으로 즉시 배치하면
  // 칸을 눌러도 thumb가 미끄러지지 않고 건너뛴다(브라우저에서 transitioncancel로 확인)
  let callbacks: ResizeObserverCallback[] = []
  let segmentWidth = 100

  beforeEach(() => {
    callbacks = []
    segmentWidth = 100
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          callbacks.push(callback)
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    // jsdom은 배치를 계산하지 않으므로 칸 위치를 순서 × 폭으로 준다
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function offsetLeft(this: HTMLElement) {
      return this.classList.contains('segment') ? [...(this.parentElement?.children ?? [])].indexOf(this) * segmentWidth : 0
    })
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => segmentWidth)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const notifyLatest = () => act(() => callbacks.at(-1)?.([], {} as ResizeObserver))

  it('칸을 누른 뒤 첫 크기 알림이 와도 thumb의 transition을 끄지 않는다', () => {
    const { container } = render(<Harness />)
    const thumb = container.querySelector<HTMLElement>('.segment-thumb')!
    notifyLatest()
    vi.advanceTimersByTime(50)
    fireEvent.click(screen.getByRole('radio', { name: '냉면' }))
    expect(thumb.style.transform).toBe('translateX(200px)')
    notifyLatest()
    expect(thumb.style.transition).toBe('')
  })

  it('칸 폭이 바뀌면 크기 알림이 thumb를 즉시 다시 맞춘다', () => {
    const { container } = render(<Harness />)
    const thumb = container.querySelector<HTMLElement>('.segment-thumb')!
    vi.advanceTimersByTime(50)
    fireEvent.click(screen.getByRole('radio', { name: '냉면' }))
    segmentWidth = 120
    notifyLatest()
    expect(thumb.style.transition).toBe('none')
    expect(thumb.style.transform).toBe('translateX(240px)')
    expect(thumb.style.width).toBe('120px')
  })
})

describe('SegmentedControl — 잠긴 칸과 고른 값이 없을 때', () => {
  const SOLD_OUT = [
    { value: 'somyeon', label: '소면' },
    { value: 'kalguksu', label: '칼국수', disabled: true },
    { value: 'naengmyeon', label: '냉면' },
  ]

  it('옵션의 disabled는 그 칸의 라디오만 잠근다', () => {
    render(<SegmentedControl name="noodle" options={SOLD_OUT} value="somyeon" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: '칼국수' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '냉면' })).toBeEnabled()
  })

  it('컨트롤 전체 disabled는 모든 칸을 잠근다', () => {
    render(<SegmentedControl name="noodle" options={SOLD_OUT} value="somyeon" onChange={() => {}} disabled />)
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled())
  })

  it('고른 값이 옵션에 없어지면 thumb를 거둔다 — 아무 라디오도 선택되지 않았는데 알약이 남지 않게', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => 100)
    const { container, rerender } = render(<SegmentedControl name="noodle" options={NOODLES} value="kalguksu" onChange={() => {}} />)
    const thumb = container.querySelector<HTMLElement>('.segment-thumb')!
    expect(thumb.style.width).toBe('100px')

    rerender(<SegmentedControl name="noodle" options={NOODLES} value="udon" onChange={() => {}} />)
    expect(thumb.style.width).toBe('0px')

    // 다시 고르면 빈 자리에서 미끄러져 오지 않고 바로 놓인다
    rerender(<SegmentedControl name="noodle" options={NOODLES} value="naengmyeon" onChange={() => {}} />)
    expect(thumb.style.width).toBe('100px')
    expect(thumb.style.transition).toBe('none')
    vi.restoreAllMocks()
  })
})

describe('SegmentedControl — 네이티브 라디오 그룹 기반 세그먼트', () => {
  it('radiogroup으로 노출되고 옵션마다 라디오가 라벨과 연결된다', () => {
    render(<Harness />)
    expect(screen.getByRole('radiogroup', { name: '면 종류' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: '소면' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '칼국수' })).not.toBeChecked()
  })

  it('칸을 클릭하면 onChange가 값을 받고 선택 상태가 옮겨간다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: '냉면' }))
    expect(onChange).toHaveBeenCalledWith('naengmyeon')
    expect(screen.getByRole('radio', { name: '냉면' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '소면' })).not.toBeChecked()
  })

  it('name이 모든 라디오에 전달되고 thumb는 보조기기에서 숨겨진다', () => {
    const { container } = render(<Harness />)
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toHaveAttribute('name', 'noodle'))
    expect(container.querySelector('.segment-thumb')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('segmented-control.css — thumb는 transform만 전이한다', () => {
  // 레이아웃 속성(width) 전이는 매 프레임 레이아웃을 돌린다. 칸이 같은 폭(grid-auto-columns: 1fr)이면
  // 이동할 때 폭이 바뀌지 않으므로 위치(translateX)만 미끄러지면 된다 — 벤치마크가 이 전이를 레이아웃 애니메이션으로 셌다
  const css = readFileSync(resolve(process.cwd(), '../skills/suta/patterns/segmented-control/assets/segmented-control.css'), 'utf8')
  const thumbBlock = css.match(/\.segment-thumb\s*\{([^}]*)\}/)?.[1] ?? ''
  const transition = thumbBlock.match(/transition:\s*([^;]+);/)?.[1] ?? ''

  it('thumb의 transition에 transform이 있고 width는 없다', () => {
    expect(transition).toMatch(/transform/)
    expect(transition).not.toMatch(/width/)
  })

  it('레이아웃 애니메이션 무시 주석이 남아 있지 않다', () => {
    expect(css).not.toMatch(/motion-audit-ignore:\s*layout-animation/)
  })
})
