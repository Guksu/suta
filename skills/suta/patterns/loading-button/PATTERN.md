---
name: loading-button
description: 제출(submit) 버튼의 진행 상태 표시(loading button)를 구현한다 — 누르면 라벨이 스피너(spinner)로 바뀌고 완료되면 체크가 그려지며, 진행 중 재클릭은 무시돼 요청이 한 번만 나간다. "로딩 버튼, 버튼에 로딩 돌게, 저장/결제 버튼 스피너, 중복 제출 막기, 두 번 눌러도 요청 한 번만, 저장 중 표시" 요청에 쓴다. 문구·완료 체크 유지 시간 수정에도 쓴다.
---

# loading-button — 제출 버튼 진행 표시

라이브 데모: https://guksu.github.io/suta/#/loading-button

## 언제 쓰는가

주문·결제·저장·로그인처럼 **누른 뒤 서버 응답을 기다리는 버튼**에. 응답이 오기 전까지 버튼이 그대로면 사용자는 눌린 줄 모르고 한 번 더 누른다 — 그 결과가 중복 주문·중복 결제다.

이 패턴이 다루는 것은 스피너 그림이 아니라 **시간**이다. 세 가지 문제를 함께 푼다:

| 문제 | 이 패턴의 처리 |
|------|----------------|
| 기다리는 동안 또 누른다 | 진행 중 클릭을 무시한다 (`disabled` 대신 `aria-disabled` + `aria-busy` — 포커스를 뺏지 않아 완료 안내를 들을 수 있다) |
| 응답이 80ms만에 와서 스피너가 깜빡인다 | 최소 로딩 시간(기본 400ms)을 지켜 "지나간 깜빡임"을 없앤다 |
| 완료를 못 보고 지나간다 | 완료 표시를 1.2초 유지한 뒤 원래 버튼으로 돌아온다 |

**기술 선택:** 상태 판정은 의존성 0인 코어(`createAsyncAction`), 모습 전환은 CSS. 애니메이션 라이브러리를 쓰지 않는다 — 필요한 것은 opacity/transform 전환과 SVG 획 그리기뿐이다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createAsyncAction.ts` | 코어 — 상태 기계(중복 차단·최소 로딩·표시 유지) | 모든 프로젝트 |
| `assets/useAsyncAction.ts` | React 훅 | React 프로젝트만 |
| `assets/LoadingButton.tsx` | 버튼 컴포넌트 | React 프로젝트만 |
| `assets/loading-button.css` | 상태 레이어·스피너·체크·흔들림 | 모든 프로젝트 |

## 사용 방법 — React

1. 위 4개 파일을 프로젝트로 복사한다(TS가 아니면 타입을 벗겨 `.js`/`.jsx`로).
2. 버튼을 `LoadingButton`으로 바꾸고, `onClick` 대신 `onAction`에 **비동기 함수**를 준다.

```tsx
import { LoadingButton } from './LoadingButton'

const OrderForm = () => (
  <LoadingButton
    onAction={() => placeOrder({ menu: 'myeolchi', count: 2 })}
    loadingLabel="주문 중"
    successLabel="주문 완료"
  >
    주문하기
  </LoadingButton>
)
```

`onAction`이 던지는 예외가 곧 실패다 — `fetch`를 쓴다면 `res.ok`를 확인해 직접 던져야 한다(fetch는 404·500에서도 예외를 던지지 않는다).

```tsx
const placeOrder = async () => {
  const res = await fetch('/api/orders', { method: 'POST' })
  if (!res.ok) throw new Error('주문 실패')
  return res.json()
}
```

### 버튼이 아닌 곳에 쓰기

폼 `submit`이나 아이콘 액션처럼 이 버튼 UI가 맞지 않으면 훅만 쓴다:

```tsx
const action = useAsyncAction()

<form onSubmit={(e) => { e.preventDefault(); void action.run(save) }}>
  <input aria-busy={action.isBusy} />
  <button type="submit" aria-disabled={action.isBusy}>
    {action.isBusy ? '저장 중…' : '저장'}
  </button>
</form>
```

## 사용 방법 — 순수 JS (React 없음)

코어와 CSS만 쓰고 DOM은 직접 갱신한다:

```js
import { createAsyncAction } from './createAsyncAction.js'

const button = document.querySelector('.loading-button')
const action = createAsyncAction({
  onChange: (status) => {
    button.dataset.status = status
    // 진행 중과 완료 표시 중에는 눌러도 실행되지 않는다. 실패 표시 중에는 다시 누를 수 있다
    button.setAttribute('aria-disabled', String(status === 'loading' || status === 'success'))
    button.setAttribute('aria-busy', String(status === 'loading'))
  },
})

button.addEventListener('click', () => action.run(placeOrder))
```

버튼 안의 상태 레이어 4개와 `role="status"` 영역의 마크업은 `assets/LoadingButton.tsx`를 그대로 옮긴다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 요청이 실패한다 | 실패 표시(흔들림 420ms + 문구)를 1.8초 보이고 원래 버튼으로 돌아온다. 그 사이에 다시 누르면 기다리지 않고 곧바로 다시 보낸다. `aria-disabled`는 `false`다 | `assets` — `createAsyncAction`. 실패한 이유는 `프로젝트`가 버튼 근처에 적는다 |
| 완료 표시 중에 또 누른다 | 1.2초 동안은 실행하지 않는다. 같은 주문이 두 번 나가지 않는다. `aria-disabled="true"`, 커서는 기본 화살표다 | `assets` |
| 응답이 끝내 오지 않는다 | 코어에는 시간 제한이 없어 스피너가 계속 돈다. `onAction` 안에서 제한 시간(예: 10초)을 두고 예외를 던지면 실패 표시로 간다 | `프로젝트` — `fetch(url, { signal: AbortSignal.timeout(10000) })` |
| 진행 중에 화면을 떠난다(언마운트) | 늦게 온 응답은 상태를 바꾸지 않는다. 요청 자체는 취소되지 않는다 | 상태 보호는 `assets` — `destroy`. 요청 취소는 `프로젝트`(`AbortController`) |
| 아직 누를 수 없다(폼이 덜 채워짐·품절) | `disabled`를 준다. 같은 자리·같은 크기에 불투명도 0.45, 커서 `not-allowed`, 눌림·호버 반응 없음. 왜 잠겼는지는 버튼 위 한 줄로 적는다 | 모습은 `assets`. 이유 문구는 `프로젝트` |
| 폼 안에 둔다 | 기본은 `type="button"`이라 폼을 제출하지 않는다. `type="submit"`을 주면 버튼 클릭과 입력칸의 Enter가 모두 `onAction`을 부르고, 잠긴 동안에는 폼 제출도 막는다(`preventDefault`). 폼의 `onSubmit`에서 기본 동작을 막는 일은 따로 해야 한다 | 잠금은 `assets`. 폼 제출 흐름이 중심이면 `프로젝트`가 훅을 `onSubmit`에 건다 |
| 문구가 길거나 화면이 320px이다 | 버튼 폭은 네 상태 문구 중 가장 긴 것이 정하고, 상태가 바뀌어도 변하지 않는다. 부모보다 길면 줄이 꺾인다. 높이는 최소 44px이다. 상태 문구는 원래 라벨과 비슷한 길이로 쓴다 | 폭 고정·44px는 `assets`. 문구 길이는 `프로젝트` |
| 마우스를 올린다 | 정밀 포인터에서만, 누를 수 있을 때만 면이 한 단계 밝아진다(흰색 14% 섞음). 밝은 버튼은 `--loading-button-hover`로 색을 준다 | `assets` |
| 키보드로 닿는다 | 포커스 링 2px이 버튼 밖 3px에 그려진다. 색은 글자색이 아니라 버튼 면의 색이다. 진행 중에도 포커스는 버튼에 남는다 | `assets` — `--loading-button-focus` |
| 고대비 모드(`forced-colors: active`) | 배경색이 사라지므로 테두리 1px(`ButtonText`)로 경계를 그린다. 스피너는 `GrayText` 고리에 `ButtonText` 한 칸이다. 완료와 실패는 색이 아니라 문구로 구분된다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 상태별 문구 | `loadingLabel`·`successLabel`·`errorLabel` | 전송 중 / 완료 / 실패 |
| 최소 로딩 시간 | `minLoadingMs` | 400ms |
| 완료·실패 표시 유지 | `successHoldMs`·`errorHoldMs` | 1200ms / 1800ms |
| 색 | `--loading-button-bg`·`--loading-button-success`·`--loading-button-error` | 거의 검정 / 짙은 초록 / 빨강 — 강조색 토큰(`--color-accent`)에 연결한다 |
| 호버·포커스 링 색 | `--loading-button-hover`·`--loading-button-focus` | 면 색에 흰색 14% / 면 색 |
| 전환 속도 | `--loading-button-duration` | 200ms |

시간 값은 실행할 때마다 다시 읽는다. 한 번 누른 뒤에 prop을 바꿔도 다음 실행부터 반영된다(순수 JS는 `action.setOptions({ minLoadingMs })`).

## 함께 쓰는 패턴

- `patterns/form-shake-error` — 실패한 이유를 보여 줄 때. 버튼은 "실패"만 말하고, 무엇이 틀렸는지는 그 칸 아래의 오류 줄이 말한다.
- `patterns/toast-stack` — 완료한 뒤 화면이 바뀌는 흐름. 버튼의 완료 표시는 화면과 함께 사라지므로 이동한 화면에서 토스트 한 줄로 알린다.
- `patterns/skeleton` — 버튼이 아니라 화면 내용을 기다릴 때. 버튼을 눌러 생긴 대기는 이 패턴이 맡는다.
- `patterns/press-feedback` — 이 버튼에는 붙이지 않는다. 눌림(97% 축소)이 이미 들어 있다.

## 주의사항

- **버튼 이름은 상태와 무관하게 고정된다.** 진행·완료·실패 레이어는 눈에만 보이고 `aria-hidden`이라 스크린 리더에는 언제나 "주문하기"로 읽힌다 — 대신 `role="status"` 영역이 상태 변화를 따로 알린다. 버튼 이름 자체가 "전송 중"으로 바뀌면 무슨 버튼이었는지 알 수 없게 되기 때문이다.
- **진행 중 잠금에 `disabled`를 쓰지 않는 것은 의도다.** 진행 중 버튼을 `disabled`로 잠그면 포커스가 body로 튕겨 나가 스크린 리더 사용자가 완료 안내를 놓친다. 대신 `aria-disabled`로 알리고 클릭은 코어가 무시한다. `disabled` prop은 누르기 전부터 잠겨 있어야 하는 경우에만 쓴다.
- **자동 재시도는 넣지 않았다.** 실패 뒤의 재시도는 사용자가 다시 누르는 것이다.
- **reduced-motion 대응 내장** — 흔들림·체크 그려짐·레이어 전환은 사라지지만 스피너 회전은 남는다(느리게). 회전은 연출이 아니라 "아직 진행 중"이라는 유일한 신호다.
- 상태 레이어 4개를 grid 한 칸에 겹쳐 두어 가장 넓은 레이어가 폭을 정한다. 아주 긴 문구를 한 상태에만 넣으면 평소 버튼도 그만큼 넓어진다.
