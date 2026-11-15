/**
 * 프레임워크 무관 스와이프 삭제 제스처 코어 (의존성 0).
 *
 * 행을 왼쪽으로 끌면 손가락을 따라오고, 놓는 순간 세 갈래로 판정한다:
 *  - 액션 폭의 절반을 넘겼거나 왼쪽으로 튕겼다 → 열림(삭제 버튼 노출, -actionWidth에 정착)
 *  - swipeOutThresholdPx를 넘겼거나 세게 튕겼다 → 끝까지 밀어 삭제(onSwipeOut)
 *  - 그 외 → 닫힘(0으로 스냅백)
 * 세로 스크롤과의 충돌은 축 잠금으로 푼다 — 처음 몇 px의 방향이 세로면 이 드래그는 포기한다.
 * 드래그 중에만 transition을 끄고, 놓으면 CSS transition(swipe-to-delete.css)이 정착 이동을 처리한다.
 *
 * 오른쪽에서 왼쪽으로 쓰는 화면(dir="rtl")에서는 액션이 왼쪽(글이 끝나는 쪽)에 있고 오른쪽으로 민다.
 * 판정은 모두 "여는 쪽이 음수"인 좌표로 하고, 화면에 쓸 때만 부호를 뒤집는다(flip).
 *
 * 손을 뗀 것(pointerup)과 브라우저가 포인터를 가져간 것(pointercancel)은 다르게 다룬다 —
 * 끊긴 끌기를 "놓았다"로 판정하면 사용자가 떼지도 않았는데 행이 지워진다.
 */

type CreateSwipeDeleteOptions = {
  /** 미끄러지는 내용 요소 — transform이 여기에 걸린다 */
  content: HTMLElement
  /** 열렸을 때 드러나는 액션 영역 폭(px, 기본 88) */
  actionWidth?: number
  /** 이만큼 끌면 끝까지 밀어 삭제 (px, 기본 actionWidth * 2.5) */
  swipeOutThresholdPx?: number
  /** 놓는 순간 왼쪽 속도가 이 이상이면 거리와 무관하게 삭제 (px/ms, 기본 0.8) */
  swipeOutVelocity?: number
  onOpenChange?: (open: boolean) => void
  onSwipeOut: () => void
}

/** 글이 오른쪽에서 왼쪽으로 흐르는가 — 계산된 direction이 정본이다. 스타일 계산이 상속을 주지 않는 환경(jsdom)에서는 가장 가까운 dir 속성을 본다 */
const isRtl = (el: Element) => {
  const computed = getComputedStyle(el).direction
  return computed ? computed === 'rtl' : el.closest('[dir]')?.getAttribute('dir') === 'rtl'
}

/** 축 잠금 판정 거리 — 이보다 작게 움직인 동안은 가로/세로를 정하지 않는다 */
const AXIS_LOCK_PX = 6
/** 살짝 튕김 판정 속도 (px/ms) */
const NUDGE_VELOCITY = 0.3

export const createSwipeDelete = ({
  content,
  actionWidth = 88,
  swipeOutThresholdPx = actionWidth * 2.5,
  swipeOutVelocity = 0.8,
  onOpenChange,
  onSwipeOut,
}: CreateSwipeDeleteOptions) => {
  let isOpen = false
  let swipedOut = false
  let dragging = false
  let axis: 'none' | 'x' | 'y' = 'none'
  let startX = 0
  let startY = 0
  let baseOffset = 0
  let offset = 0
  let lastX = 0
  let lastTime = 0
  let velocity = 0
  let pointerId: number | null = null
  let downOnAction = false // 누른 곳이 액션 버튼 영역인가 — 열린 행을 눌러 닫을 때 버튼은 뺀다
  let suppressClick = false // 끌기·닫기 누름 뒤에 따라오는 click을 한 번 막는다
  let suppressTimer: ReturnType<typeof setTimeout> | undefined
  /** 화면 좌표 → 판정 좌표의 부호. 왼쪽으로 여는 화면은 1, dir="rtl"은 -1. 누를 때와 열고 닫을 때마다 다시 읽는다 */
  let flip: 1 | -1 = 1
  const readFlip = () => {
    flip = isRtl(content) ? -1 : 1
  }

  /** 뒤따르는 click을 한 번 막는다. 터치는 끌기 뒤에 click이 오지 않으므로 표시가 남지 않게 곧 걷는다 */
  const suppressNextClick = () => {
    suppressClick = true
    clearTimeout(suppressTimer)
    suppressTimer = setTimeout(() => {
      suppressClick = false
    }, 400)
  }

  /** 지금 끄는 포인터의 이벤트인가 — 두 번째 손가락이 끼어들면 행이 그쪽으로 튄다 */
  const isOurPointer = (event: Event) => pointerId == null || !('pointerId' in event) || event.pointerId === pointerId

  const settle = (target: number) => {
    content.style.transition = ''
    content.style.transform = target === 0 ? '' : `translateX(${target * flip}px)`
  }

  const setOpen = (next: boolean) => {
    if (swipedOut) return // 이미 삭제로 빠진 행은 되돌리지 않는다
    if (!dragging) readFlip() // 코드로 여닫을 때(open·close) — 끄는 중이면 누를 때 읽은 방향을 그대로 쓴다
    settle(next ? -actionWidth : 0)
    if (next !== isOpen) {
      isOpen = next
      onOpenChange?.(next)
    }
  }

  const swipeOut = () => {
    if (swipedOut) return
    swipedOut = true
    if (!dragging) readFlip()
    content.style.transition = ''
    content.style.transform = `translateX(${-100 * flip}%)`
    isOpen = false
    onSwipeOut()
  }

  const onPointerDown = (event: PointerEvent | MouseEvent) => {
    if (swipedOut || ('button' in event && event.button !== 0)) return
    if (dragging) return // 끄는 중에 닿은 다른 손가락
    pointerId = 'pointerId' in event ? event.pointerId : null
    downOnAction = event.target instanceof Element && event.target.closest('.swipe-actions') !== null
    suppressClick = false // 지난 누름에서 남은 표시 — 터치는 끌기 뒤에 click이 오지 않아 남을 수 있다
    readFlip()
    dragging = true
    axis = 'none'
    startX = event.clientX
    startY = event.clientY
    lastX = event.clientX
    lastTime = Date.now()
    velocity = 0
    baseOffset = isOpen ? -actionWidth : 0
    offset = baseOffset
  }

  const onPointerMove = (event: PointerEvent | MouseEvent) => {
    if (!dragging || !isOurPointer(event)) return
    const dx = (event.clientX - startX) * flip
    const dy = event.clientY - startY

    if (axis === 'none') {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return
      axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
      if (axis === 'y') {
        dragging = false // 세로 스크롤이다 — 이 드래그는 포기한다
        return
      }
      content.style.transition = 'none'
    }

    const now = Date.now()
    if (now > lastTime) velocity = ((event.clientX - lastX) * flip) / (now - lastTime)
    lastX = event.clientX
    lastTime = now

    // 닫는 쪽으로는 0을 넘지 못한다 — 열림 상태에서 반대로 끌면 닫힐 뿐
    offset = Math.min(0, baseOffset + dx)
    // -0이 나오지 않게 0은 그대로 쓴다(문자열로 쓰면 "-0px"가 된다)
    content.style.transform = `translateX(${offset === 0 ? 0 : offset * flip}px)`
  }

  const onPointerUp = (event: Event) => {
    if (!dragging || !isOurPointer(event)) return
    dragging = false
    if (axis !== 'x') {
      // 움직이지 않은 누름 — 열린 행의 내용을 누른 것이면 닫는다(메일 앱의 관례). 그 click이 내용의 링크를 열지 않게 막는다
      if (axis === 'none' && isOpen && !downOnAction) {
        suppressNextClick()
        setOpen(false)
      }
      return
    }
    // 마우스는 가로로 끈 뒤에도 click을 낸다 — 행을 눌러 상세로 가는 화면에서 밀기가 이동으로 이어지지 않게
    suppressNextClick()

    const flungLeft = velocity <= -swipeOutVelocity
    const nudgedLeft = velocity <= -NUDGE_VELOCITY
    const nudgedRight = velocity >= NUDGE_VELOCITY

    if (-offset >= swipeOutThresholdPx || flungLeft) {
      swipeOut()
      return
    }
    if (nudgedRight) {
      setOpen(false)
      return
    }
    setOpen(nudgedLeft || -offset >= actionWidth / 2)
  }

  /** 브라우저가 포인터를 가져갔다 — 놓은 것이 아니므로 판정하지 않고 끌기 전 자리(열림·닫힘)로 돌린다 */
  const onPointerCancel = (event: Event) => {
    if (!dragging || !isOurPointer(event)) return
    dragging = false
    if (axis === 'x') settle(baseOffset)
  }

  const onClickCapture = (event: Event) => {
    if (!suppressClick) return
    suppressClick = false
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  content.addEventListener('pointerdown', onPointerDown)
  content.addEventListener('click', onClickCapture, true)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    swipeOut,
    destroy: () => {
      content.removeEventListener('pointerdown', onPointerDown)
      content.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      // 끄는 중에 해제되면 꺼 둔 transition과 끌던 자리를 남기지 않는다
      if (dragging && axis === 'x') settle(baseOffset)
      dragging = false
      clearTimeout(suppressTimer)
    },
  }
}
