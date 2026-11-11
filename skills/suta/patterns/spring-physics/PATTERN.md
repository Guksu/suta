---
name: spring-physics
description: 스프링 물리 모션 유틸(spring physics)을 구현한다 — duration·easing 대신 stiffness·damping(감쇠)·mass로 정의하고, 드래그를 놓는 순간의 속도를 이어받아 튕기며 정착하며, 도중에 목표가 바뀌어도 현재 위치·속도에서 다시 출발한다. "스프링 애니메이션, 탄성 복귀, 튕기는 모션, 드래그 놓으면 제자리로, 속도 이어받기, 물리 기반 애니메이션" 요청과 제스처 뒤 복귀·팝 모션에 쓴다. 기존 적용분의 강성·감쇠(출렁임) 조절에도 쓴다.
---

# spring-physics — 스프링 물리 모션

라이브 데모: https://guksu.github.io/suta/#/spring-physics

## 언제 쓰는가

드래그하다 놓은 카드가 제자리로 돌아갈 때, 바텀시트가 스냅 위치로 정착할 때, 좋아요 하트가 팝할 때. 이런 모션에 `transition: 300ms ease-out`을 쓰면 두 가지가 안 된다 — (1) **놓는 순간의 손가락 속도를 이어받지 못한다**(빠르게 던져도 느리게 던져도 같은 300ms), (2) **도중에 목표가 바뀌면 뚝 끊긴다**(연타·재드래그). 스프링은 "얼마나 걸리게"가 아니라 "얼마나 단단하고 얼마나 감쇠하게"를 정하므로 둘 다 자연스럽다. iOS 전반·Linear·Vercel의 모션 성격이 이것이다.

**기술 선택:** 감쇠 조화진동의 **닫힌 해**(`spring.ts`) — 시간 t를 넣으면 위치가 바로 나오므로 프레임 누적 오차가 없고, 어느 순간에든 속도를 알 수 있어 재타게팅이 정확하다. 재생은 두 경로: **rAF 애니메이터**(`animateSpring.ts` — 인터럽트·속도 이어받기)와 **CSS `linear()` 생성기**(`springToLinear` — 곡선을 사전 샘플링해 transition/animation에 얹음, 메인 스레드 부담 0, 대신 인터럽트 불가). 라이브러리 없음.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/spring.ts` | 닫힌 해·정착 판정·duration 추정·`linear()` 생성 (프레임워크 무관) | 모든 프로젝트 |
| `assets/animateSpring.ts` | rAF 애니메이터 — retarget·stop·current | 모든 프로젝트 |
| `assets/useSpring.ts` | React 훅 (값을 state로 올리지 않고 onUpdate로 DOM에 직접) | React 프로젝트만 |

`spring.ts`·`animateSpring.ts`는 다른 패턴(swipe-dismiss-viewer 등)의 assets에 **같은 파일이 복사되어** 들어간다 — 설치 시 패턴 단독 완결 원칙 때문이다. 파일 첫 줄의 `@shared-core` 헤더를 지우지 말 것(저장소 검증이 원본과 해시를 비교한다). TS가 아닌 프로젝트는 타입을 벗겨 .js로 저장한다.

## 사용 방법 — React (드래그 놓으면 제자리로)

```tsx
import { useRef } from 'react'
import { useSpring } from './useSpring'

const Card = () => {
  const el = useRef<HTMLDivElement>(null)
  const x = useSpring({ onUpdate: (v) => { if (el.current) el.current.style.transform = `translateX(${v}px)` } })
  // 렌더 사이에도 남아야 하는 값이라 ref에 둔다
  const drag = useRef({ active: false, lastX: 0, lastT: 0, velocity: 0 })

  const release = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    // 끌다가 100ms 넘게 멈춘 뒤 놓았으면 던진 것이 아니다 — 마지막 이동의 속도를 쓰지 않는다
    x.to(0, e.timeStamp - d.lastT > 100 ? 0 : d.velocity)
  }

  return (
    <div
      ref={el}
      style={{ touchAction: 'pan-y' }} // 가로 끌기를 브라우저 스크롤에 뺏기지 않는다
      onPointerDown={(e) => {
        drag.current = { active: true, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d.active) return
        d.velocity = ((e.clientX - d.lastX) / Math.max(1, e.timeStamp - d.lastT)) * 1000 // px/s
        d.lastX = e.clientX; d.lastT = e.timeStamp
        x.set(x.get() + e.movementX) // 손가락에 붙는 동안은 스프링을 멈추고 값만 기록
      }}
      onPointerUp={release} // 놓는 순간 속도를 이어받아 0으로 정착
      onPointerCancel={release} // 브라우저가 포인터를 가져가도(시스템 제스처) 제자리로 돌린다
    >
      끌어 보세요
    </div>
  )
}
```

- `to(target, velocity)` — 목표로 출발. velocity를 생략하면 진행 중인 스프링의 현재 속도를 이어받는다(연타 안전).
- `set(value)` — 제스처가 값을 직접 쓸 때. 애니메이션을 멈추고 값만 기록한다.
- `onRest` — `to()`로 보낸 목표에 정착했을 때 한 번 불린다. 닫힌 요소를 걷는 일은 여기서 한다. `set()`으로 잡아 멈춘 경우에는 불리지 않는다.
- 동작 줄이기 설정이면 `to()`는 튕기지 않고 목표로 바로 간다. 움직임 자체가 뜻을 전하는 곳에서만 `respectReducedMotion: false`로 끈다.

## 사용 방법 — CSS transition에 스프링 곡선 얹기 (React 없음)

인터럽트가 필요 없는 단발 모션(팝·등장)은 rAF 대신 CSS로 재생한다.

```js
import { springToLinear } from './spring.js'

const { easing, duration } = springToLinear({ config: { stiffness: 300, damping: 20 } })
el.style.transition = `transform ${duration}ms ${easing}`
el.style.transform = 'scale(1)' // 이전 값이 scale(0.8)이면 스프링 곡선으로 커진다
```

`linear()` easing은 Safari 17.2+·Chrome 113+·Firefox 112+. 그 이하는 rAF 경로를 쓴다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 움직이는 도중에 목표가 바뀐다(연타·다시 끌기) | 지금 위치와 속도에서 새 목표로 이어 간다. 값이 튀지 않는다. 도중에 손가락으로 다시 잡으면 `set()`이 스프링을 멈춘다 | `assets` — `to()`(속도를 생략하면 `retarget`)·`set()` |
| 끌다가 멈춘 뒤 놓는다 | 마지막 이동 때 잰 속도가 남아 있어 요소가 던져진다. 놓기 전 100ms 넘게 움직임이 없었으면 속도를 0으로 넘긴다 | `프로젝트`(위 예시의 `release`) |
| 속도·목표가 숫자가 아니다(`NaN` — 시간 차 0으로 나눔) | 속도는 0으로 본다. 목표가 숫자가 아니면 움직이지 않는다. `NaN`이 한 번 들어가면 정착 판정을 통과하지 못해 프레임이 끝없이 돈다 | `assets` — `useSpring`. `animateSpring`을 직접 쓰면 `프로젝트` |
| 탭이 가려졌다 돌아온다 | 프레임은 멈추지만 값은 시각에서 바로 구한다(닫힌 해). 돌아온 첫 프레임에 지난 시간만큼 건너뛴 자리에 놓인다. 정착 시간이 지났으면 목표에 놓이고, 뒤늦게 튕기지 않는다 | `assets` |
| 움직이는 중에 언마운트된다 | 훅이 프레임을 멈춘다. `onUpdate` 안에서는 요소가 있는지 확인한 뒤 쓴다(`if (el.current)`) | 멈춤은 `assets`. 확인은 `프로젝트` |
| 동작 줄이기 | `useSpring`의 `to()`는 목표로 바로 가고 `onRest`를 부른다. 손가락을 따라가는 `set()`은 그대로 둔다. `springToLinear`로 CSS에 얹은 곡선과 `animateSpring`을 직접 쓴 곳은 스스로 끄지 않는다 | `useSpring`은 `assets`. CSS는 `@media (prefers-reduced-motion: reduce)`에서 `transition: none`으로 `프로젝트` |
| 정착한 뒤 `config`가 바뀐다 | 다음 `to()`부터 새 값으로 움직인다. 움직이는 도중에 속도 없이 부른 `to(target)`은 처음의 `config`를 그대로 쓴다 | `assets` |
| 감쇠가 0이거나 음수다, 강성·질량이 0이다 | 감쇠 0은 멈추지 않고 계속 흔들린다(프레임이 끝없이 돈다). 강성·질량 0은 값이 `NaN`이 된다. 사용자가 조절하는 값이면 강성 50 이상, 감쇠비 0.3 이상으로 가둔다 | `프로젝트` — 코어는 값을 가두지 않는다 |
| 값이 px가 아니다(0~1 불투명도·배율) | 기본 정착 기준(0.1·1/s)이 너무 거칠다. 목표의 10% 앞에서 끝난 것으로 보고 값이 툭 붙는다. `restDelta: 0.001`, `restVelocity: 0.01`을 넘긴다 | `프로젝트`. `springToLinear`는 `assets`가 이 기준으로 고정한다 |
| 목표를 넘친 값이 화면에 그대로 보인다 | 감쇠비가 1보다 작으면 목표를 지나친다. 불투명도는 1을 넘고, 시트는 화면 아래로 삐져나와 뒤가 비친다. 넘치면 안 되는 값은 `onUpdate`에서 가두거나(`Math.min`) 임계 감쇠(`2·√k`)를 쓴다 | `프로젝트` |

## 커스터마이즈 포인트 — 어떤 스프링이 어떤 느낌인가

| 느낌 | stiffness | damping | 용도 |
|---|---|---|---|
| 크리스프(기본) | 170 | 26 | 제자리 복귀, 스냅 — 살짝 넘쳤다 돌아옴 |
| 통통 | 300 | 15 | 좋아요 팝, 버튼 눌림 해제 |
| 묵직 | 120 | 30 | 시트·카드처럼 큰 요소 |
| 튀지 않음(임계) | k | 2·√k | 튐이 어색한 곳(텍스트·레이아웃). `dampingRatio` = 1 |

- `mass`는 보통 1로 두고 stiffness·damping만 만진다.
- `restDelta`·`restVelocity`는 정착 판정이다. px 단위면 기본값(0.1px·1px/s)이 눈에 띄지 않는다.

## 함께 쓰는 패턴

- `patterns/swipe-dismiss-viewer`·`patterns/edge-swipe-back` — 이 패턴의 `spring.ts`·`animateSpring.ts`를 복사해 쓴다. 두 패턴을 함께 옮겨도 파일은 패턴마다 따로 둔다.
- `patterns/like-pop`·`patterns/celebration` — 단발 팝의 곡선을 바꾸고 싶을 때. rAF 대신 `springToLinear`로 만든 easing을 그 패턴의 CSS 변수나 `animation-timing-function`에 넣는다. 도중에 끊길 일이 없는 연출이라 CSS로 충분하다.
- `patterns/bottom-sheet` — 시트의 열고 닫는 전이는 그 패턴의 CSS가 맡는다. 이 패턴을 얹지 않는다. 놓는 속도까지 이어받는 시트가 필요하면 그 패턴의 전이를 끄고 `useSpring`으로 `translateY`를 직접 쓴다.

## 주의사항

- **값은 React state로 올리지 않는다** — 매 프레임 렌더가 되어 손가락에 늦게 붙는다. `onUpdate`에서 ref로 잡은 요소의 `transform`에 직접 쓴다.
- 속도 단위는 **단위/초**다. 포인터 이벤트에서 px/ms로 계산했다면 ×1000.
- `springToLinear`는 사전 샘플링이라 **도중 재타게팅을 못 한다** — 제스처가 끼어드는 모션은 `animateSpring` 경로. 시작 속도가 큰 곡선은 `samples`를 60 이상으로 올린다(초반 급변 구간이 뭉개진다).
- 감쇠비(`dampingRatio`)가 0.3 아래면 여러 번 튄다 — UI에서는 0.6~1.0 범위가 안전하다.
- 여러 값을 함께 움직일 때(x·y·scale)는 값마다 `useSpring`을 하나씩 둔다. 한 스프링의 0~1 진행도로 여러 속성을 섞으면 속도 이어받기가 한 축에만 맞는다.
