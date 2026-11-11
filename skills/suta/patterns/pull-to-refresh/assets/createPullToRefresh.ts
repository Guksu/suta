/**
 * 프레임워크 무관 당겨서 새로고침 코어 (의존성 0).
 *
 * 스크롤 최상단에서 아래로 당기면 콘텐츠가 저항(고무줄)과 함께 따라 내려오고,
 * 임계를 넘겨 놓으면 onRefresh를 부른다. 스냅백·복귀 이동은 CSS transition이
 * 담당한다(드래그 중에만 transition을 끈다 — bottom-sheet와 같은 분업).
 *
 * 진행률은 컨테이너의 --pull-progress(0~1)와 data-refreshing으로 노출된다 —
 * 인디케이터(스피너·화살표)는 CSS가 그린다(pull-to-refresh.css).
 *
 * 터치에서는 touchmove도 함께 듣는다: 컨테이너가 스크롤 상자라 브라우저는 손가락이 움직이는 순간
 * 스크롤로 보고 포인터를 가져간다(pointercancel). 맨 위에서 아래로 당기는 움직임만 preventDefault로 막아
 * 당김을 지키고, 그 밖의 움직임(위로 굴리기·가로 넘기기)은 브라우저에 그대로 둔다.
 */

type CreatePullToRefreshOptions = {
  /** 스크롤 컨테이너 — scrollTop 0에서만 당김이 시작된다 */
  container: HTMLElement
  /** 당김에 따라 내려올 콘텐츠 요소 */
  content: HTMLElement
  /** 임계를 넘겨 놓았을 때 — 작업이 끝나면 반드시 done()을 호출한다 */
  onRefresh: (done: () => void) => void
  /** 새로고침 판정 당김 거리 (기본 70px) */
  thresholdPx?: number
  /** 최대 당김 거리 (기본 threshold의 2배) */
  maxPx?: number
}

/** 이만큼 움직인 뒤 방향을 정한다 — 가로가 더 크면 안쪽 가로 스크롤(캐러셀)이지 당김이 아니다 */
const DIRECTION_SLOP_PX = 6

export const createPullToRefresh = ({
  container,
  content,
  onRefresh,
  thresholdPx = 70,
  maxPx = thresholdPx * 2,
}: CreatePullToRefreshOptions) => {
  let startX = 0
  let startY = 0
  let pulling = false
  let directionDecided = false
  let refreshing = false
  let pulled = 0
  let pointerId: number | null = null
  let refreshRun = 0 // 몇 번째 새로고침인가 — 지난 새로고침의 done()이 지금 것을 끝내지 않게
  // touchmove 판정용 — 포인터 이벤트와 따로 잰다(브라우저는 첫 touchmove에서 스크롤 여부를 정한다)
  let touchStartX = 0
  let touchStartY = 0
  let touchAtTop = false

  const setProgress = (value: number) => {
    container.style.setProperty('--pull-progress', String(Math.min(value / thresholdPx, 1)))
  }

  // 고무줄 저항 — 당길수록 무거워지고 maxPx에 점근한다
  const resist = (raw: number) => maxPx * (1 - Math.exp(-raw / maxPx))

  /** 지금 당기는 포인터의 이벤트인가 — 두 번째 손가락이 끼어들면 콘텐츠가 그쪽으로 튄다 */
  const isOurPointer = (event: Event) => pointerId == null || !('pointerId' in event) || event.pointerId === pointerId

  const onPointerDown = (event: PointerEvent | MouseEvent) => {
    if (refreshing || pulling || container.scrollTop > 0) return
    if ('button' in event && event.button !== 0) return
    pulling = true
    directionDecided = false
    pulled = 0
    startX = event.clientX
    startY = event.clientY
    pointerId = 'pointerId' in event ? event.pointerId : null
    content.style.transition = 'none'
  }

  /** 당김을 새로고침 없이 끝내고 제자리로 돌린다 */
  const resetPull = () => {
    pulling = false
    pulled = 0
    content.style.transition = '' // 이후 이동은 CSS transition 몫
    content.style.transform = ''
    setProgress(0)
  }

  const onPointerMove = (event: PointerEvent | MouseEvent) => {
    if (!pulling || refreshing || !isOurPointer(event)) return
    const raw = event.clientY - startY
    if (!directionDecided) {
      const dx = Math.abs(event.clientX - startX)
      if (Math.max(dx, Math.abs(raw)) >= DIRECTION_SLOP_PX) {
        if (dx > Math.abs(raw)) {
          resetPull()
          return
        }
        directionDecided = true
      }
    }
    if (raw <= 0) {
      pulled = 0
      content.style.transform = ''
      setProgress(0)
      return
    }
    pulled = resist(raw)
    content.style.transform = `translateY(${pulled}px)`
    setProgress(pulled)
  }

  const onPointerUp = (event: Event) => {
    if (!pulling || !isOurPointer(event)) return
    if (pulled < thresholdPx) {
      resetPull()
      return
    }
    pulling = false
    content.style.transition = ''
    refreshing = true
    const run = ++refreshRun
    container.dataset.refreshing = 'true'
    container.setAttribute('aria-busy', 'true') // 화면 낭독기에 "갱신 중"을 알린다
    content.style.transform = `translateY(${thresholdPx}px)` // 스피너 자리만큼 걸쳐 둔다
    onRefresh(() => {
      if (run !== refreshRun || !refreshing) return
      refreshing = false
      container.dataset.refreshing = 'false'
      container.removeAttribute('aria-busy')
      content.style.transform = ''
      setProgress(0)
    })
  }

  /**
   * 브라우저가 포인터를 가져갔다(pointercancel — 스크롤 시작·시스템 제스처·전화 수신).
   * 손을 뗀 것이 아니므로 새로고침하지 않고 제자리로 돌린다
   */
  const onPointerCancel = (event: Event) => {
    if (!pulling || !isOurPointer(event)) return
    resetPull()
  }

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchAtTop = event.touches.length === 1 && container.scrollTop <= 0
  }

  const onTouchMove = (event: TouchEvent) => {
    if (!touchAtTop || refreshing || !event.cancelable) return
    const touch = event.touches[0]
    if (!touch) return
    const dy = touch.clientY - touchStartY
    const dx = Math.abs(touch.clientX - touchStartX)
    // 맨 위에서 아래로, 세로가 더 큰 움직임만 우리 것이다
    if (dy > 0 && dy >= dx && container.scrollTop <= 0) event.preventDefault()
  }

  container.addEventListener('pointerdown', onPointerDown)
  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  return () => {
    container.removeEventListener('pointerdown', onPointerDown)
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    // 당기는 중에 해제되면(언마운트) 끌던 자리와 꺼 둔 transition을 남기지 않는다
    if (pulling) resetPull()
  }
}
