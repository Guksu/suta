---
name: press-feedback
description: 버튼·카드를 탭하면 살짝 쪼그라들었다(움츠러들었다) 통 하고 튕겨 돌아오는 프레스 피드백(button press 눌림 효과)을 구현한다. "버튼 눌림 효과, 버튼 눌림 애니메이션, 누를 때 반응, 탭 피드백, 클릭 감각, 눌리는 느낌" 요청과 버튼·카드형 터치 타깃에 누름 반응을 넣을 때 쓴다. 기존 적용분의 줄어드는 배율·복귀 속도 수정에도 쓴다.
---

# press-feedback — 프레스 피드백

라이브 데모: https://guksu.github.io/suta/#/press-feedback

## 언제 쓰는가

버튼·카드·리스트 셀 등 누르는 모든 것에. "눌렸다"는 물리적 반응이 0.1초 안에 오면 인터페이스 전체가 단단하게 느껴진다 — 개별 화려함이 아니라 앱 전반의 기본기다.

**기술 선택:** 순수 CSS(`:active` + transition). JS가 필요 없는 대표 영역이다. 핵심은 **비대칭 타이밍** — 누름은 60ms 즉각, 복귀는 220ms 스프링 커브. 대칭이면 굼떠 보인다. 축소는 `transform`이 아니라 개별 속성 `scale`로 한다. 요소에 이미 `transform`이 있어도 덮어쓰지 않기 때문이다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/press-feedback.css` | 전부 | 모든 프로젝트 |

## 사용 방법

1. `assets/press-feedback.css`를 복사한다(전체 구현 — 반드시 읽어라).
2. 누를 수 있는 요소에 클래스를 붙인다:
   - `pressable` — 기본: 눌리면 96%로 움츠렸다 복귀
   - `pressable pressable-dim` — 면적 큰 카드형: 축소 + 살짝 어두워짐
   - `pressable pressable-lift` — 데스크톱 호버 시 1px 리프트(정밀 포인터에서만)

```html
<button class="pressable">주문하기</button>
<a class="pressable pressable-dim card" href="/menu">오늘의 국수</a>
```

React·Vue 등 어디서든 className만 붙이면 된다 — 래퍼 없음.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 잠긴 요소를 누른다(`disabled`·`aria-disabled="true"`) | 줄지도 어두워지지도 떠오르지도 않는다. 브라우저는 `disabled` 버튼에도 `:active`를 붙이므로 따로 꺼야 한다 | `assets` |
| 키보드로 누른다 | `<button>`은 Space를 누르고 있는 동안 `:active`가 붙어 마우스와 같은 반응이 난다. Enter는 `:active` 없이 바로 실행되어 반응이 없다. 키보드에서 "닿았다"를 알리는 것은 눌림이 아니라 포커스 링이다 | 브라우저 동작. 포커스 링은 `프로젝트` |
| 포커스 링이 있는 요소에 붙인다 | 이 패턴은 `outline`을 만들지도 지우지도 않는다. 프로젝트의 `:focus-visible` 링(`outline: 2px solid` + `outline-offset: 2px`)이 요소와 함께 줄었다 돌아온다 | `프로젝트` |
| 누르는 카드 안에 누르는 버튼이 있다 | 안쪽 버튼을 누르면 안쪽만 반응한다. `:active`는 조상에도 붙어서, 막지 않으면 카드까지 함께 줄어든다 | `assets` — `.pressable:has(.pressable:active)` |
| 요소에 이미 `transform`이 있다(가운데 정렬·회전) | 그 값을 유지한 채 줄어든다 | `assets` — `scale`·`translate` 개별 속성 |
| 요소에 이미 `transition`이 있다 | `transition`은 합쳐지지 않고 나중에 선언된 쪽만 남는다. 프로젝트의 선언이 이기면 눌림이 전이 없이 뚝 끊긴다 | `프로젝트` — 그 선언에 `scale`·`translate`·`filter` 전이를 함께 적는다 |
| 면이 어둡다 | `brightness(0.92)`는 거의 검정인 면에서 보이지 않는다. `--press-dim: 1.25`처럼 1보다 큰 값을 주어 밝아지게 한다. 동작 줄이기에서는 밝기가 유일한 반응이다 | 변수는 `assets`. 값은 `프로젝트` |
| 긴 목록의 행마다 붙인다(수백 개) | `will-change: transform`이 요소마다 합성 레이어를 잡아 둔다. 긴 목록의 행에는 `.pressable { will-change: auto }`로 끈다 | `프로젝트` |
| 터치 기기에서 누른다 | 호버 리프트는 걸리지 않는다(`(hover: hover) and (pointer: fine)` 안에 있다). 이 패턴은 `-webkit-tap-highlight-color`를 건드리지 않는다. 브라우저의 탭 하이라이트와 겹치는 것이 싫으면 `transparent`로 끈다 | 리프트 게이트는 `assets`. 탭 하이라이트는 `프로젝트` |
| 동작 줄이기(`prefers-reduced-motion: reduce`) | 축소와 호버 리프트가 꺼지고, 누르는 동안 밝기만 바뀐다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 눌림 배율 | `--press-scale` (기본 0.96 — 작은 버튼 0.94, 큰 카드 0.98이 무난) |
| 복귀 속도 | `--press-release` (기본 220ms) |
| 어두워지는 정도 | `--press-dim` (기본 0.92 — `pressable-dim`과 동작 줄이기에서 쓰는 `brightness()` 값) |

## 함께 쓰는 패턴

- `patterns/loading-button`·`patterns/switch`·`patterns/checkbox-radio` — 눌림이 이미 들어 있다. `pressable`을 겹쳐 붙이면 두 번 줄어든다.
- `patterns/long-press-menu`·`patterns/swipe-to-delete` — 이 패턴들은 같은 요소에 `transition: transform …`을 선언한다. `pressable`을 같은 요소에 붙이면 위 표의 "이미 `transition`이 있다"에 해당한다. 안쪽 내용 요소에 붙이는 편이 안전하다.

## 주의사항

- **비대칭을 유지하라** — `:active`의 `transition-duration: 60ms`를 지우면 눌림도 220ms가 되어 굼떠진다.
- 호버 리프트의 `(hover: hover) and (pointer: fine)` 게이트는 터치 기기에서 호버 잔상이 남는 것을 막는 장치다. 게이트 제거 금지.
- 이 효과는 고빈도 노출이다 — scale을 0.9 이하로 과장하지 마라. 매번 크게 움직이는 버튼은 금방 피로해진다.
- 잠긴 요소와 안쪽 버튼을 다루는 두 규칙은 파일 맨 아래에 있어야 한다. 우선순위가 같은 `:active` 규칙을 선언 순서로 이기기 때문이다.
- `<a>`와 `role="button"` 요소는 Space로 `:active`가 붙지 않는다. 키보드 눌림 반응이 필요한 곳에는 `<button>`을 쓴다.
