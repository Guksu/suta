---
name: quantity-stepper
description: 수량 조절 스테퍼(quantity stepper, − / + 버튼) 컴포넌트를 구현한다 — 꾹 누르고 있으면 점점 빨리 올라가고, 숫자를 직접 입력할 수 있으며, 1에서 −를 누르면 삭제로 이어진다. "수량 늘리고 줄이는 버튼, 플러스 마이너스로 개수 바꾸기, 장바구니 수량, 수량 버튼" 요청에 쓴다. 기존 적용분의 최대·최소 제한과 길게 누를 때 속도 수정에도 쓴다.
---

# quantity-stepper — 수량 스테퍼

라이브 데모: https://guksu.github.io/suta/#/quantity-stepper

## 언제 쓰는가

장바구니 수량, 인원수, 옵션 개수처럼 **작은 정수를 오르내리며 고칠 때**. 값의 범위가 넓거나(1~1000) 정확한 숫자를 아는 경우에는 입력창이 낫다 — 이 패턴도 숫자를 직접 칠 수 있게 열어 둔 이유가 그것이다.

**기술 선택:** 네이티브 `<button>` + `<input>`. 반복 타이밍만 의존성 0 코어로 분리했다 — "누르고 있으면 빨라진다"는 눈으로 맞출 수 없고 테스트로 고정해야 하는 규칙이기 때문이다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createHoldRepeat.ts` | 코어 — 길게 누르면 가속 반복 (수량 말고도 쓸 수 있다) | 모든 프로젝트 |
| `assets/QuantityStepper.tsx` | React 컴포넌트 | React 프로젝트만 |
| `assets/quantity-stepper.css` | 버튼·숫자 칸·값 전환 | 모든 프로젝트 |

## 사용 방법 — React

```tsx
import { QuantityStepper } from './QuantityStepper'

const CartRow = ({ item }: { item: CartItem }) => (
  <div className="cart-row">
    <span>{item.name}</span>
    <QuantityStepper
      value={item.count}
      onChange={(count) => updateCount({ id: item.id, count })}
      min={1}
      max={20}
      label={`${item.name} 수량`}
      // 수량 1에서 −를 누르면 빼기 대신 삭제 — 배달앱에서 익숙한 동작이다
      onBelowMin={() => removeFromCart(item.id)}
    />
  </div>
)
```

`label`은 그룹과 버튼의 접근성 이름이 된다 — 목록에 스테퍼가 여러 개면 "수량 늘리기" 버튼이 전부 같은 이름으로 읽히므로 **항목 이름을 넣는다**.

### 수량 말고 다른 것에 쓰기

가속 반복만 필요하면 코어만 가져다 쓴다(볼륨, 시간 설정, 지도 확대 등):

```js
import { createHoldRepeat } from './createHoldRepeat.js'

const held = createHoldRepeat({ onRepeat: () => zoomIn(), delayMs: 300, intervalMs: 120 })

button.addEventListener('pointerdown', () => {
  zoomIn() // 첫 실행은 즉시
  held.start()
})
button.addEventListener('pointerup', held.stop)
button.addEventListener('pointerleave', held.stop)
button.addEventListener('pointercancel', held.stop)
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 20까지 올려야 한다 | 누르고 있으면 0.4초 뒤부터 반복되고, 간격이 160ms에서 45ms까지 줄어든다. 짧게 한 번 누르면 한 칸만 오른다 | `assets` — `createHoldRepeat` |
| 누른 채 손가락이 버튼 밖으로 나가거나, 창이 포커스를 잃거나, 누르는 동안 `disabled`가 된다 | 반복이 멈춘다(`pointerleave`·`pointercancel`·창의 `blur`). 마우스 오른쪽·가운데 버튼은 받지 않는다. 메뉴가 뜨면 `pointerup`이 오지 않아 끝까지 올라간다 | `assets` — `QuantityStepper.tsx` |
| 최솟값·최댓값에 닿는다 | 그 버튼이 흐려지고(`opacity: 0.35`) `aria-disabled="true"`가 된다. `disabled`가 아니라서 포커스는 받는다. 왜 못 누르는지 알 수 있다 | `assets` |
| 수량 1에서 −를 누른다(`onBelowMin`을 준 경우) | −가 휴지통 아이콘이 되고 이름이 "{label} 삭제"로 읽힌다. 삭제는 새로 누른 한 번에만 일어난다. 길게 눌러 1까지 내려온 누름이나 Enter 반복 입력은 삭제로 넘어가지 않는다 | `assets`. 지운 뒤의 "되돌리기"는 `프로젝트` |
| 키보드나 화면 낭독기로 버튼을 누른다 | Enter·Space로 한 칸 바뀐다. 숫자 칸에서는 ↑·↓로 바뀐다. 바뀐 값은 숨긴 `role="status"` 요소로 낭독된다. 누르고 있는 동안에는 낭독하지 않고 뗐을 때 멎은 값만 읽는다 | `assets` — 버튼이 `pointerdown`과 `click`을 모두 받는다 |
| 숫자를 직접 친다 | 다 치면(blur·Enter) 범위로 가둔 뒤 눈금에 맞춘다. 999를 치면 최댓값이 되고 그 값을 낭독한다. 비웠거나 글자만 쳤으면 원래 값으로 돌아간다. Escape는 치던 것을 버린다 | `assets` |
| 서버가 재고를 줄여 `max`가 지금 값보다 작아졌다 | 값은 그대로 보이고 +만 잠긴다. −를 누르면 새 최댓값으로 내려온다. 값을 바로 맞추고 이유("재고가 3개 남았어요")를 알리는 일은 `프로젝트`가 한다 | `assets`(잠금) · `프로젝트`(값 맞추기·안내) |
| 좁은 행(320px)에 사진·이름·스테퍼·금액을 한 줄로 둔다 | 스테퍼는 줄어들지 않는다(`flex: none`, 기본 폭 130px). 줄어들면 `overflow: hidden`에 + 버튼이 잘린다. 이름을 두 줄로 꺾거나 스테퍼를 둘째 줄로 내린다 | `assets`(줄지 않음) · `프로젝트`(행 배치) |
| 네 자리를 넘는 수를 다룬다 | 숫자 칸 기본 폭(3rem)은 16px 글자로 네 자리까지다. `--qty-value-width`를 넓힌다. 범위가 그만큼 넓으면 스테퍼보다 입력창이 맞다 | `프로젝트` |
| 터치 화면에서 쓴다 | hover 배경은 올려 둘 수 있는 포인터에서만 준다(`@media (hover: hover)`). 누른 뒤 배경이 남지 않는다. 기본 높이는 2.5rem(40px)이라 터치가 주인 화면은 `--qty-height: 2.75rem`(44px)으로 키운다. 숫자 칸 글자가 16px보다 작으면 iOS가 초점을 줄 때 화면을 확대한다 | `assets`(hover) · `프로젝트`(높이·글자 크기) |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 범위·눈금 | `min`·`max`·`step` | 1 / 99 / 1 |
| 반복 시작까지 | `delayMs` (코어) | 400ms |
| 반복 간격·가속 | `intervalMs`·`acceleration`·`minIntervalMs` (코어) | 160ms / 0.82배 / 45ms |
| 높이·색 | `--qty-height`·`--qty-bg`·`--qty-border`·`--qty-accent` | 2.5rem / 흰색 / 회색 / 거의 검정(#1c1c1c) |
| 누름·호버 배경 | `--qty-hover`·`--qty-active` | 검정 5% / 10% (어두운 바탕에서는 밝은 색으로 바꾼다) |
| 숫자 칸 너비 | `--qty-value-width` | 3rem |
| 버튼 이름 | `buttonLabels` — `{ decrease, remove, increase }`, 각각 그룹 이름(label)을 받는다 | "{label} 줄이기·삭제·늘리기" |

## 함께 쓰는 패턴

- `patterns/toast-stack` — 수량 1에서 −로 항목을 지운 뒤. "장바구니에서 뺐어요" 토스트를 띄운다. 실수로 지운 경우를 위해 되돌리는 길(토스트 옆 버튼이나 목록의 "다시 담기")을 프로젝트가 둔다.
- `patterns/count-up` — 수량에 따라 합계 금액이 바뀔 때. 금액이 굴러가며 바뀌면 무엇이 달라졌는지 보인다.
- `patterns/swipe-to-delete` — 장바구니 행을 밀어서 지우는 길을 함께 둘 때. 스테퍼의 삭제(`onBelowMin`)와 같은 삭제 함수를 부른다.
- `patterns/loading-button` — 수량을 서버에 저장하는 동안 주문 버튼을 잠글 때. 스테퍼는 `disabled`로 잠그면 누르고 있던 반복도 멈춘다.

## 주의사항

- **값의 정리 순서가 중요하다.** 범위로 먼저 가둔 뒤 눈금에 맞춘다 — 반대로 하면 999가 눈금에 맞춰진 뒤 최댓값으로 잘려, 눈금에 없는 값이 남는다(`step=2`인데 20이 되는 식).
- **반복 중에는 다시 그려지기를 기다리지 않는다.** React가 여러 변경을 묶어 처리하면 그동안의 반복이 모두 같은 값에서 출발해 한 번만 오른다. 그래서 다음 값을 즉시 기록한 뒤 알린다.
- **빈 입력은 0이 아니다.** `Number('')`는 0이라, 사용자가 지우거나 글자만 친 경우를 걸러내지 않으면 수량이 최솟값으로 튄다.
- **버튼에 `disabled`를 쓰지 않는다.** 포커스가 닿지 않으면 "왜 더 못 줄이는지"를 알 수 없다. `aria-disabled`로 알리고 동작만 막는다.
- **버튼의 `click` 처리를 지우지 않는다.** 길게 누르기는 `pointerdown`으로 시작하지만, 키보드와 화면 낭독기는 `click`만 보낸다. 포인터로 누른 뒤 따라오는 `click`은 시각(0.7초 안)으로 걸러 두 번 세지 않는다.
- **`touch-action: manipulation`이 걸려 있다** — 빠르게 두 번 누를 때 모바일 브라우저가 화면을 확대하지 않게 한다.
- **서버 반영은 이 패턴 밖이다.** 누르고 있으면 값이 초당 스무 번 바뀌므로, 그대로 요청을 보내면 서버를 때린다. 값이 멎은 뒤에 보내거나(디바운스), 화면만 먼저 바꾸고 나중에 맞추는 방식으로 감싼다. 요청이 실패하면 프로젝트가 값을 되돌리고 이유를 알린다.
- 숫자 칸은 글상자(textbox) 역할이다. 화면 낭독기는 버튼에 초점이 있는 동안 글상자 값의 변화를 읽지 않으므로, 바뀐 값을 `role="status"` 요소로 따로 알린다. `spinbutton` 역할로 바꾸는 것은 화면 낭독기별 동작을 확인하지 못해 하지 않았다.
- 전각 숫자(１２)는 읽지 못해 원래 값으로 돌아간다.
- **reduced-motion 대응 내장** — 숫자가 밀려 들어오는 연출만 사라지고 값은 그대로 바뀐다.
