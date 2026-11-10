---
name: floating-label
description: 라벨이 플레이스홀더 자리에 있다가 입력창을 누르거나 글자를 치면 위로 떠올라 작아지는 플로팅 라벨 입력 필드(floating label input)를 구현한다. "인풋 라벨 위로 떠오르게, 머티리얼 인풋, placeholder가 라벨로 올라가는 입력창, 라벨 애니메이션 폼" 요청과 로그인·예약·결제 폼의 텍스트 입력에 쓴다. 기존 적용분의 라벨 색·올라가는 속도 수정에도 쓴다.
---

# floating-label — 플로팅 라벨 입력

라이브 데모: https://guksu.github.io/suta/#/floating-label

## 언제 쓰는가

플레이스홀더만 있는 입력은 타이핑을 시작하는 순간 "여기가 무슨 칸이었지"가 사라진다. 라벨을 항상 위에 두면 해결되지만 폼이 길어진다 — 플로팅 라벨은 빈 칸에서는 플레이스홀더 자리를 차지하다가 입력이 시작되면 위로 떠올라 **공간과 문맥을 둘 다 지킨다**. 로그인·예약·결제처럼 필드 몇 개짜리 폼에서 효과가 크다.

**기술 선택:** CSS 판정만 사용, JS 상태 0. "떠 있어야 하는가"는 `:focus`(입력 중) 또는 `:not(:placeholder-shown)`(값 있음) 두 의사 클래스로 CSS가 스스로 판정한다 — blur 후에도 값이 있으면 떠 있는 상태가 공짜로 유지된다. 라벨 이동은 `transform: translateY + scale`만 쓴다(`font-size`·`top` 전이는 매 프레임 레이아웃을 돌린다).

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/floating-label.css` | 필드·라벨 떠오름·포커스 링 정의 | 모든 프로젝트 |
| `assets/TextField.tsx` | React 래퍼 (id·label 연결, placeholder 고정) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { TextField } from './TextField'

const ReserveForm = () => {
  const [name, setName] = useState('')

  return (
    <form>
      <TextField label="예약자 이름" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="연락처" type="tel" name="phone" />
    </form>
  )
}
```

`TextField`는 `placeholder`를 받지 않는다 — 라벨이 그 역할이고, 내부적으로 `" "`(한 칸 공백)로 고정된다.

형식 안내는 `helperText`로, 오류는 `errorText`로 준다. 둘 다 입력 아래 같은 자리에 서고 `aria-describedby`로 입력과 이어진다. `errorText`가 있으면 도움말 대신 오류 문구가 보이고 `aria-invalid="true"`가 켜진다. `ref`는 input으로 간다.

```tsx
<TextField
  label="연락처"
  type="tel"
  helperText="예약 확인 문자를 보내 드려요"
  errorText={phoneError} // 없으면 undefined — 도움말이 다시 보인다
/>
```

## 사용 방법 — 순수 JS (React 없음)

마크업 순서(input 다음 label)와 `placeholder=" "`만 지키면 JS가 아예 필요 없다.

```html
<div class="field">
  <input class="field-input" id="name" placeholder=" " />
  <label class="field-label" for="name">예약자 이름</label>
</div>
```

도움말이나 오류 문구는 label 뒤에 `field-message`로 둔다. 오류일 때는 input에 `aria-invalid="true"`를 주고 문구의 `data-kind`를 `"error"`로 바꾼다.

```html
<div class="field">
  <input class="field-input" id="phone" placeholder=" " aria-describedby="phone-message" />
  <label class="field-label" for="phone">연락처</label>
  <p class="field-message" id="phone-message" data-kind="helper">예약 확인 문자를 보내 드려요</p>
</div>
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 형식 예시를 보여야 한다 | placeholder 자리는 라벨이 쓰므로 입력 아래 한 줄(13px)에 둔다. 입력을 시작해도 사라지지 않는다 | `assets` — `helperText` |
| 제출했는데 값이 틀렸다 | `aria-invalid="true"`가 켜지고 테두리·라벨·문구가 `--field-error` 색이 된다. 오류 문구는 도움말 자리에 대신 선다. 사용자가 그 칸을 고치기 시작하면 `errorText`를 비운다 | `assets`(표시) · 프로젝트(비우는 때) |
| 필수 칸이다 | `required`만으로는 화면에 표시가 없다. 라벨 글자에 "(필수)"를 붙이거나, 대부분이 필수면 선택 칸에만 "(선택)"을 붙인다 | 프로젝트 |
| 브라우저가 저장된 값을 자동으로 채운다 | 라벨이 떠 있어야 값과 겹치지 않는다. 떠오름 조건에 `:-webkit-autofill`·`:autofill`이 들어 있다. 브라우저가 칠하는 자동완성 배경색은 그대로 둔다 | `assets` |
| 라벨이 입력칸보다 길다 | 한 줄로 말줄임된다(`max-width: calc(100% - 26px)`). 떠오른 뒤에도 잘린 채이므로 라벨은 짧은 이름만 쓰고 설명은 `helperText`로 옮긴다 | `assets` |
| 지금은 입력할 수 없다(`disabled`) | 필드 전체가 `opacity: 0.5`, 커서는 `not-allowed`다 | `assets` |
| 읽기 전용(`readOnly`)이다 | 포커스와 복사는 되고 값이 있으니 라벨은 떠 있다. 따로 정해 둔 모양은 없다. 편집할 수 있는 칸과 섞여 있으면 옅은 바탕색으로 구별한다 | 프로젝트 |
| 글자 크기를 키웠다 | 라벨 자리의 치수는 16px 글자까지 고정값(위 여백 24px, 떠오르는 거리 10px)이고, 그보다 크면 글자 크기를 따라 커진다(`1.5em`·`0.625em`). 32px 글자에서도 떠오른 라벨이 입력한 글자와 겹치지 않는다 | `assets` |
| 둘레 글자가 16px보다 작다 | 입력은 둘레의 글자 크기를 그대로 쓴다(`font: inherit`). iOS는 16px 미만인 입력에 포커스하면 화면을 확대하므로 필드 둘레의 글자를 16px 이상으로 둔다 | 프로젝트 |
| 고대비 모드(`forced-colors`) | 테두리 색이 모두 같은 시스템 색이 되고 포커스 그림자가 지워진다. 포커스한 칸에 2px `Highlight` 외곽선을 그린다 | `assets` |

오른쪽에서 왼쪽으로 쓰는 글(`dir="rtl"`)에서는 라벨이 오른쪽 13px에서 시작하고 오른쪽 위를 기준으로 줄어든다.

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 떠오름 속도 | `--field-duration` (기본 150ms — 타이핑 시작을 방해하지 않게 짧게) |
| 포커스 색 | `--field-accent` (기본 #1c1c1c — 라벨·테두리·포커스 링이 함께 물든다) |
| 테두리·라벨 색 | `--field-border`(#d4d4d4)·`--field-label-color`(색 토큰 `--color-text-tertiary`, 없으면 #686868 — 흰 면에서 4.5:1 이상이다. 도움말 글자도 이 색이다) |
| 오류 색 | `--field-error` (기본은 `--color-danger` 토큰, 없으면 #c8341f — 테두리·라벨·오류 문구·포커스 링이 함께 물든다) |

## 함께 쓰는 패턴

- `form-shake-error` — 제출 실패 때 틀린 칸을 흔든다. 흔드는 대상은 input이 아니라 `.field` 래퍼다(`shake(input.closest('.field'))`). 라벨이 input의 형제라 input만 흔들면 라벨이 제자리에 남는다. 그 패턴의 `[aria-invalid='true']` 규칙이 테두리를 `--error-color`로 칠하므로 `--field-error`와 같은 색으로 맞춘다. 오류 문구는 `errorText`와 그 패턴의 `FieldError` 중 하나만 쓴다.
- `loading-button` — 제출 버튼에 쓴다. 요청이 끝나 결과가 온 뒤에 `errorText`를 넣는다.
- `select` — 정해진 선택지 중에서 고르는 칸에는 글자 입력 대신 쓴다.
- `otp-input` — 인증번호처럼 자릿수가 정해진 짧은 코드는 칸을 나눈 입력이 맞다.

## 주의사항

- **`placeholder=" "`가 판정의 전제다** — 지우거나 문구를 넣으면 `:placeholder-shown` 판정이 무너져 라벨이 입력값과 겹친다. 플레이스홀더와 라벨을 동시에 쓰는 순간 이 패턴의 공간 이점도 사라진다.
- **마크업 순서는 input → label → 문구다** — CSS가 인접 형제 선택자(`+`)로 라벨을 찾는다. 순서를 바꾸면 떠오르지 않는다.
- `type="date"`처럼 빈 값에도 자체 UI가 보이는 입력에는 맞지 않다 — 라벨과 겹친다. 텍스트 계열(text·email·tel·password·number)에 쓴다.
- **reduced-motion 대응 내장** — 라벨 이동은 즉시 점프, 색 전환은 유지한다. 블록 제거 금지.
