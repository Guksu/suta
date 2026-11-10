---
name: form-shake-error
description: 잘못된 입력을 좌우로 흔들고(shake) 에러 메시지가 아래에서 밀려 올라오는 폼 검증 에러 피드백(form validation error)을 구현한다. "비번/비밀번호 틀리면 입력창 흔들리게, 로그인 실패 시 입력창 떨림, 잘못된 입력 표시, 에러 문구 애니메이션, 폼 검증 피드백" 요청과 제출·검증 실패를 알릴 때 쓴다. 기존 적용분의 흔들림 세기·속도·색 수정에도 쓴다.
---

# form-shake-error — 폼 에러 흔들림 + 메시지

라이브 데모: https://guksu.github.io/suta/#/form-shake-error

## 언제 쓰는가

비밀번호 불일치, 필수 항목 비움, 전화번호 형식 오류처럼 **제출을 눌렀는데 통과하지 못한** 순간. 좌우로 짧게 튕기는 흔들림은 "아니오"라는 고개 저음의 관례라 문구를 읽기 전에 실패를 알린다. 흔들림만으로는 이유를 모르니 메시지가 반드시 뒤따르고, 모션을 끈 사용자를 위해 테두리 색도 함께 바뀐다(이중 신호).

**기술 선택:** CSS keyframe + `data-shake` 속성 토글. 흔들림은 `translateX`만 쓰고, 진폭이 줄어드는 감쇠 곡선으로 "튕기고 멈춘다". 유일한 JS 로직은 **재시작** — 이미 흔들리는 중에 다시 틀리면 속성을 뗐다 붙이는데, 그 사이 강제 리플로우가 없으면 브라우저가 두 변경을 합쳐 애니메이션이 다시 돌지 않는다(`shakeCore.ts`가 이를 보장). 메시지 접힘/펼침은 `grid-template-rows 0fr↔1fr`라 높이 측정이 없다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/shakeCore.ts` | 흔들림 트리거·재시작 코어 (프레임워크 무관) | 모든 프로젝트 |
| `assets/form-shake-error.css` | 감쇠 shake 키프레임, 에러 테두리, 메시지 슬라이드 | 모든 프로젝트 |
| `assets/ShakeField.tsx` | React 래퍼 (`useShake` 훅 + `FieldError` 메시지) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { useShake, FieldError } from './ShakeField'

const PhoneForm = () => {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string>()
  const field = useShake<HTMLInputElement>()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!/^01\d-\d{3,4}-\d{4}$/.test(phone)) {
      setError('010-1234-5678 형식으로 입력해 주세요')
      field.shake()
      field.ref.current?.focus()
      return
    }
    setError(undefined)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input
        ref={field.ref}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby="phone-error"
      />
      <FieldError id="phone-error" message={error} />
      <button type="submit">예약</button>
    </form>
  )
}
```

- `shake()`는 제출 시점에 명시적으로 부른다 — 타이핑 중 실시간 검증마다 흔들면 사용자를 괴롭힌다.
- 실패 시 `focus()`를 함께 주면 키보드·스크린 리더 사용자가 곧바로 고칠 수 있다.
- 입력 하나가 아니라 폼 전체(카드)를 흔들려면 그 컨테이너에 `ref`를 준다.

## 사용 방법 — 순수 JS (React 없음)

```html
<input id="phone" aria-describedby="phone-error" />
<div class="field-error" id="phone-error-wrap" data-visible="false">
  <div class="field-error-inner"><span class="field-error-text" id="phone-error" role="alert"></span></div>
</div>
```

```js
import { shake } from './shakeCore.js'

const input = document.getElementById('phone')
const showError = (message) => {
  input.setAttribute('aria-invalid', 'true')
  document.getElementById('phone-error').textContent = message
  document.getElementById('phone-error-wrap').dataset.visible = 'true'
  shake(input)
  input.focus()
}
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 흔들리는 도중에 다시 제출한다(연타) | 누를 때마다 처음부터 다시 흔들린다. 앞선 흔들림의 뒷정리가 새 흔들림을 끊지 않는다 | `assets` — `shake()` |
| 폼 전체를 흔드는데 안에 다른 애니메이션이 있다(버튼 스피너 등) | 자식의 애니메이션이 먼저 끝나도 흔들림이 끊기지 않는다. `animationend`는 흔드는 요소 자신의 것만 듣는다 | `assets` |
| `animationend`가 오지 않는다(동작 줄이기, 요소가 `display: none`) | 600ms 뒤에 `data-shake`를 뗀다. 속성이 남아 다음 흔들림이 막히는 일이 없다 | `assets` |
| 흔들리는 중에 화면을 떠난다 | 남은 타이머는 600ms 안에 끝나고, 화면에서 빠진 요소의 속성만 건드린다. 따로 정리할 것이 없다 | `assets` |
| 여러 칸이 한꺼번에 틀렸다 | 틀린 칸을 모두 흔들고 칸마다 문구를 띄운다. 포커스는 첫 번째 틀린 칸으로 옮긴다. `role="alert"` 문구가 여럿이면 낭독기가 차례로 읽으므로 문구는 한 줄로 짧게 쓴다 | 프로젝트 |
| 같은 문구로 다시 틀렸다 | 글자가 바뀌지 않으면 `role="alert"`는 다시 읽히지 않는다. 포커스를 그 입력으로 옮기면 `aria-describedby`로 문구가 다시 읽힌다 | 프로젝트 |
| 사용자가 틀린 칸을 고치기 시작한다 | 그 칸의 `aria-invalid`를 내리고 `message`를 비운다. 타이핑 중에는 다시 흔들지 않고, 다음 제출 때 다시 판정한다 | 프로젝트 |
| 서버가 답한 뒤에야 틀린 줄 안다(비밀번호 불일치) | 기다리는 동안은 제출 버튼을 로딩 상태로 두고, 답이 온 때에 흔들고 문구를 띄운다. 네트워크 오류나 서버 장애는 입력이 틀린 것이 아니므로 흔들지 않고 폼 위 한 줄이나 토스트로 알린다 | 프로젝트 |
| 흔드는 칸이 화면 가장자리에 붙어 있다 | 가장 멀리 가는 거리는 `--shake-distance`의 1.3배다(기본 7.8px). 좌우 여백이 그보다 좁으면 가로 스크롤이 잠깐 생긴다. 여백을 8px 이상 두거나 조상에 `overflow-x: clip`을 준다 | 프로젝트 |
| 어두운 바탕이다 | 기본 오류 색(색 토큰 `--color-danger`, 없으면 #c8341f)은 어두운 면 위에서 글자 대비 4.5:1에 못 미친다. `--error-color`를 밝은 빨강으로 바꾼다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 세기 | `--shake-distance` (6px — 카드 전체를 흔들 땐 4px 정도로 줄인다, 큰 요소는 작은 이동도 크게 보인다) |
| 흔들림 길이 | `--shake-duration` (400ms — 500ms를 넘기면 장난처럼 보인다) |
| 에러 색 | `--error-color` (색 토큰 `--color-danger`, 없으면 #c8341f — 테두리·메시지·포커스 링에 함께 쓰인다) |
| 메시지 속도 | `--error-duration` (200ms) |

## 함께 쓰는 패턴

- `floating-label` — 흔드는 대상은 input이 아니라 `.field` 래퍼다(`shake(input.closest('.field'))`). 라벨이 input의 형제라 input만 흔들면 라벨이 제자리에 남는다. 오류 문구는 그 패턴의 `errorText`와 이 패턴의 `FieldError` 중 하나만 쓴다.
- `loading-button` — 서버 검증을 기다리는 동안 제출 버튼에 쓴다. 답이 실패로 온 뒤에 흔든다.
- `otp-input` — 같은 `shakeCore.ts`를 이미 갖고 있다. 두 패턴을 함께 복사하면 파일을 하나만 두고 import 경로를 맞춘다.
- `checkbox-radio` · `select` — 필수 동의나 선택을 빼고 제출했을 때는 묶음(`fieldset`)이나 셀렉트를 흔들고 `aria-invalid`를 켠다.
- `toast-stack` — 네트워크 오류처럼 입력이 틀린 것이 아닌 실패를 알릴 때 쓴다.

## 주의사항

- **`aria-invalid`와 메시지를 빼먹지 말 것** — 흔들림은 시각 신호일 뿐이다. 스크린 리더는 `aria-invalid="true"`로 "잘못됨"을, `role="alert"`로 문구를 듣는다.
- `[aria-invalid='true']` 규칙은 클래스 없이 속성만 본다 — 이 CSS를 넣으면 페이지에서 `aria-invalid="true"`인 모든 요소(입력·셀렉트 트리거·인증번호 칸)에 오류 테두리와 링이 걸린다. `!important`를 둔 것은 입력 컴포넌트의 포커스 스타일보다 에러 표시가 이겨야 하기 때문이다. 프로젝트 입력 스타일이 이미 에러 상태를 다루면 그 블록을 지운다.
- 흔들 요소에 이미 `transform`이 있으면(중앙 정렬용 translate 등) 키프레임이 덮어쓴다 — 그 경우 한 겹 감싼 래퍼를 흔든다. `display: inline`인 요소(`span`·`a`)는 transform이 먹지 않아 흔들리지 않는다.
- 성공 시에도 흔들지 않는다 — 흔들림은 오직 "아니오"다.
- **reduced-motion 대응 내장** — 흔들림·슬라이드를 없애고 테두리 색·메시지는 즉시 표시한다. 블록 제거 금지.
