/**
 * 프레임워크 무관 FLIP 코어 (의존성 0).
 *
 * FLIP(First-Last-Invert-Play): 재배치 전 위치를 기억(First)하고, DOM이 바뀐 뒤(Last)
 * 각 요소를 이전 위치로 transform으로 되돌렸다가(Invert) 제자리로 전환(Play)한다.
 * top/left를 애니메이션하는 대신 transform만 쓰므로 GPU 합성으로 처리된다 —
 * 리스트 정렬·추가·삭제가 "순간이동" 대신 미끄러지는 이동으로 보인다.
 *
 * 각 항목에는 고유한 data-flip-id가 필요하다 — 재배치 전후의 같은 항목을 잇는 열쇠다.
 */

type PlayOptions = {
  durationMs?: number
  easing?: string
}

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

type Flight = { outer: number; inner: number; timer: ReturnType<typeof setTimeout> | undefined; end: (event: Event) => void }
type Point = { left: number; top: number }

/** 지금 이동 중인 항목 — 진행 중인 transform을 읽어야 하는 것은 이 항목들뿐이다(나머지는 계산된 스타일을 읽지 않는다) */
const flights = new WeakMap<HTMLElement, Flight>()

/** 계산된 transform에서 이동량만 읽는다. 브라우저는 matrix(...)로, 인라인 값을 그대로 돌려주는 환경은 translate(...)로 준다 */
const readTranslate = (el: HTMLElement): Point => {
  if (!flights.has(el)) return { left: 0, top: 0 }
  const value = getComputedStyle(el).transform
  const numbers = (value.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number)
  if (value.startsWith('matrix3d(')) return { left: numbers[12] ?? 0, top: numbers[13] ?? 0 }
  if (value.startsWith('matrix(')) return { left: numbers[4] ?? 0, top: numbers[5] ?? 0 }
  if (value.startsWith('translate(')) return { left: numbers[0] ?? 0, top: numbers[1] ?? 0 }
  return { left: 0, top: 0 }
}

/**
 * 항목의 배치 자리 — 컨테이너 기준이고 진행 중인 transform은 뺀 값이다.
 * 화면 좌표를 그대로 쓰면 캡처와 재생 사이의 페이지 스크롤이 전부 "이동"으로 잡힌다.
 */
const measure = ({ container, box, el, shift }: { container: HTMLElement; box: DOMRect; el: HTMLElement; shift: Point }): Point => {
  const rect = el.getBoundingClientRect()
  return {
    left: rect.left - box.left + container.scrollLeft - shift.left,
    top: rect.top - box.top + container.scrollTop - shift.top,
  }
}

const land = (el: HTMLElement) => {
  const flight = flights.get(el)
  if (!flight) return
  cancelAnimationFrame(flight.outer)
  cancelAnimationFrame(flight.inner)
  clearTimeout(flight.timer)
  el.removeEventListener('transitionend', flight.end)
  flights.delete(el)
}

export const captureFlip = ({ container }: { container: HTMLElement }) => {
  const first = new Map<string, Point>()
  const firstBox = container.getBoundingClientRect()
  for (const child of Array.from(container.children)) {
    const el = child as HTMLElement
    const id = el.dataset.flipId
    if (id) first.set(id, measure({ container, box: firstBox, el, shift: readTranslate(el) }))
  }

  const play = ({ durationMs = 300, easing = 'cubic-bezier(0.22, 1, 0.36, 1)' }: PlayOptions = {}) => {
    if (prefersReducedMotion()) return // 이동 연출 생략 — 재배치 결과는 이미 화면에 있다

    const box = container.getBoundingClientRect()
    for (const child of Array.from(container.children)) {
      const el = child as HTMLElement
      const id = el.dataset.flipId
      const prev = id ? first.get(id) : undefined
      if (!prev) continue // 캡처 이후 새로 생긴 항목 — 이동 이력이 없다
      // 이동 중이던 항목은 아직 덜 온 만큼(shift) 떨어져 보인다 — 그 보이는 자리에서 이어서 움직여야 튀지 않는다
      const shift = readTranslate(el)
      const next = measure({ container, box, el, shift })
      // 배치가 그대로면 건드리지 않는다. 이동 중에 무관한 재렌더가 와도 진행 중인 이동이 끊기지 않는다
      // (0.5px 미만의 차이는 소수 좌표의 오차다 — 이동으로 세면 가만히 있는 항목에 스타일을 쓴다)
      if (Math.abs(prev.left - next.left) < 0.5 && Math.abs(prev.top - next.top) < 0.5) continue
      const dx = prev.left + shift.left - next.left
      const dy = prev.top + shift.top - next.top
      land(el)

      // Invert: 전환 없이 이전 위치로 되돌려 놓는다
      el.style.transition = 'none'
      el.style.transform = `translate(${dx}px, ${dy}px)`

      const finish = () => {
        land(el)
        el.style.transition = ''
      }
      const flight: Flight = {
        outer: 0,
        inner: 0,
        timer: undefined,
        // 안쪽 요소의 전이(버튼 hover 등)가 끝난 이벤트는 버블링되어 올라온다 — 항목 자신의 것만 받는다
        end: (event) => {
          if (event.target === el) finish()
        },
      }
      flights.set(el, flight)
      // Play: 브라우저가 invert 상태를 그린 다음 프레임에 제자리로 전환한다
      flight.outer = requestAnimationFrame(() => {
        flight.inner = requestAnimationFrame(() => {
          el.style.transition = `transform ${durationMs}ms ${easing}`
          el.style.transform = ''
          el.addEventListener('transitionend', flight.end)
          // transitionend는 가려진 탭·display: none에서 오지 않는다 — 인라인 transition이 남으면
          // 항목 자신의 CSS 전이(hover 등)를 계속 덮는다
          flight.timer = setTimeout(finish, durationMs + 100)
        })
      })
    }
  }

  return { play }
}
