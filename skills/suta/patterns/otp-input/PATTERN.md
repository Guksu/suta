---
name: otp-input
description: 인증번호(OTP) 칸 입력을 구현한다 — 한 글자를 치면 다음 칸으로 넘어가고, 빈 칸에서 지우면 앞 칸으로 돌아가며, 복사한 코드를 붙여넣으면 칸마다 하나씩 나뉜다. "인증번호 입력, OTP input, 6자리 코드 입력, 인증번호 칸, 본인확인 코드, 문자로 온 코드 붙여넣기" 요청과 SMS·이메일 인증 화면에 쓴다. 칸 수·에러 흔들림 수정에도 쓴다.
---

# otp-input — 인증번호 칸 입력

라이브 데모: https://guksu.github.io/suta/#/otp-input

## 언제 쓰는가

문자·이메일로 받은 인증번호, 결제 승인 코드, 앱 잠금 PIN처럼 **짧은 코드를 칸에 나눠 받을 때**. 칸을 나누는 이유는 장식이 아니라 "몇 자리를 입력해야 하는지"와 "지금 몇 자리를 넣었는지"를 세지 않고도 알 수 있게 하기 위해서다.

**칸을 나누지 말아야 할 때도 있다** — 자릿수가 가변이거나(비밀번호), 사용자가 중간을 자유롭게 고쳐야 하는 값이라면 그냥 입력 하나가 낫다.

**기술 선택:** 네이티브 `<input>` 여러 개 + 포커스 제어. `contenteditable`이나 가짜 커서를 쓰지 않는다 — 비밀번호 관리자·자동완성·모바일 키보드가 모두 진짜 input에만 반응한다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createOtpInput.ts` | 코어 — 포커스 이동·붙여넣기 분배·완성 판정 | 모든 프로젝트 |
| `assets/shakeCore.ts` | 흔들림 트리거 (form-shake-error 패턴의 공유 코어) | 모든 프로젝트 |
| `assets/OtpInput.tsx` | React 컴포넌트 | React 프로젝트만 |
| `assets/otp-input.css` | 칸 모양·포커스·흔들림 | 모든 프로젝트 |

## 이 패턴이 대신 처리하는 것

칸을 나누는 순간 생기는 문제는 모양이 아니라 **포커스**다.

| 상황 | 기대하는 동작 |
|------|--------------|
| 한 글자를 친다 | 그 칸에 남고 다음 칸으로 넘어간다 |
| 빈 칸에서 지우기를 누른다 | 앞 칸으로 돌아가 그 글자를 지운다 |
| 값이 있는 칸에서 지우기를 누른다 | 그 칸만 비고 포커스는 제자리에 남는다 |
| 문자에서 복사한 6자리를 아무 칸에나 붙여넣는다 | 어느 칸에서 받았든 첫 칸부터 하나씩 나뉘고 바로 완성된다 |
| 코드의 일부만 붙여넣는다 | 붙여넣은 칸부터 채우고 넘치는 글자는 버린다 |
| iOS가 문자 메시지의 인증번호를 제안한다 | 6자리가 한 칸에 들어오지만 칸마다 나뉜다 |
| 값이 있는 칸을 클릭한다 | 그 자리가 선택돼 바로 덮어쓸 수 있다. 이미 포커스된 칸을 다시 눌러도 선택이 풀리지 않는다 |
| 숫자가 아닌 글자를 친다 | 아무 일도 일어나지 않는다. 칸에 있던 글자도 그대로다 |

## 사용 방법 — React

```tsx
import { useRef, useState } from 'react'
import { OtpInput, type OtpHandle } from './OtpInput'

const VerifyStep = () => {
  const otp = useRef<OtpHandle>(null)
  const [message, setMessage] = useState('')

  const verify = async (code: string) => {
    const ok = await confirmCode(code)
    if (ok) return goNext()
    // 틀린 번호를 남겨 두면 사용자가 지우는 일부터 해야 한다 — 흔들고 비워 첫 칸으로
    setMessage('인증번호를 다시 확인해 주세요')
    otp.current?.shake()
    otp.current?.clear()
  }

  return (
    <>
      <p>문자로 보낸 6자리를 입력해 주세요</p>
      <OtpInput
        ref={otp}
        onComplete={verify}
        invalid={message !== ''}
        // 다시 입력을 시작하면 틀린 표시를 내린다 — clear()가 보내는 빈 값에는 남긴다
        onChange={(code) => code !== '' && setMessage('')}
      />
      <p role="alert">{message}</p>
    </>
  )
}
```

`onComplete`는 마지막 칸이 채워지는 순간 불린다 — **확인 버튼을 누르게 하지 말고 여기서 바로 인증한다.** 6자리를 다 넣은 사용자에게 버튼을 한 번 더 누르게 할 이유가 없다.

`ref`로 꺼내 쓰는 것: `shake()`(흔들기) · `clear()`(비우고 첫 칸으로) · `focus()` · `value()`.

`invalid`를 주면 모든 칸에 `aria-invalid="true"`가 켜지고 테두리가 `--otp-error` 색으로 남는다. 흔들림은 0.4초면 끝나므로, 틀렸다는 표시를 화면에 남기는 것은 이 prop과 `role="alert"` 문구다.

## 사용 방법 — 순수 JS (React 없음)

```html
<div class="otp-group" role="group" aria-label="인증번호">
  <input class="otp-cell" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="인증번호 1번째 자리" />
  <!-- 나머지 다섯 칸 — autocomplete는 첫 칸에만("off"), maxlength는 모든 칸에 칸 수(6)로 -->
</div>
```

```js
import { createOtpInput } from './createOtpInput.js'

const otp = createOtpInput({
  inputs: [...document.querySelectorAll('.otp-cell')],
  onComplete: (code) => verify(code),
})
```

돌려받는 것: `value()` · `clear()` · `focusFirstEmpty()` · `destroy()`. 흔들기는 `shakeCore.js`의 `shake(그룹 요소)`를 부른다. 채워진 칸 표시(`data-filled`)는 코어가 칸마다 붙인다. 틀린 표시는 칸에 `aria-invalid="true"`를 직접 준다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 자동 입력이 여러 글자를 한 칸에 밀어 넣는다(문자 제안·키보드의 붙여넣기 제안·비밀번호 관리자) | 칸의 `maxlength`가 1이면 브라우저가 첫 글자만 남기고 잘라 나눌 것이 없다. `maxlength`는 칸 수로 두고, 한 칸에 한 글자만 남기는 일은 코어가 한다 | `assets` — `OtpInput`은 `maxLength={length}` |
| 코드가 틀렸다 | 흔들고(`shake()`), 비워 첫 칸으로 돌리고(`clear()`), `invalid`로 오류 테두리를 남기고, `role="alert"` 문구를 띄운다. 다시 입력을 시작하면 `invalid`와 문구를 내린다 | `assets`(흔들기·비우기·테두리) · 프로젝트(문구·내리는 때) |
| 확인 요청이 진행 중이다 | 칸을 `disabled`로 잠그지 않는다. 잠그면 포커스가 빠지고 모바일 키보드가 내려가며, 잠긴 동안 부른 `clear()`는 첫 칸에 포커스하지 못한다. 진행 중에 다시 불린 `onComplete`만 무시한다 | 프로젝트 |
| 답이 오기 전에 사용자가 칸을 고쳤다 | 답을 받았을 때 보낸 코드와 `value()`가 다르면 그 답으로 흔들거나 비우지 않는다. 사용자가 새로 넣는 중인 코드를 지우게 된다 | 프로젝트 |
| 칸을 건너뛰어 채웠다(첫 칸 다음에 넷째 칸) | 채워진 칸 표시(`data-filled`)는 개수가 아니라 칸마다 붙는다. 완성(`onComplete`)은 모든 칸이 찼을 때만 불린다 | `assets` |
| 유효 시간이 끝났거나 코드를 다시 받는다 | `clear()`로 비우고 문구로 알린다. 남은 시간은 칸 아래 글자로 보이고, 다시 받기 버튼은 누른 뒤 몇 초 동안 잠근다 | 프로젝트 |
| 화면에 들어온다 | `autoFocus`(기본 켜짐)가 첫 칸에 포커스해 모바일 키보드가 바로 올라온다. 시트나 대화상자의 등장 모션과 겹치면 `autoFocus={false}`로 두고 모션이 끝난 뒤 `focus()`를 부른다 | `assets`(포커스) · 프로젝트(때) |
| 칸 수가 바뀐다 | `key={length}`로 입력을 새로 만든다. 그대로 두면 칸에 남은 값이 새 칸 수와 어긋난다 | 프로젝트 |
| 고대비 모드(`forced-colors`) | 테두리 색이 모두 같은 시스템 색이 되고 포커스 그림자가 지워진다. 포커스한 칸에 2px `Highlight` 외곽선을 그린다 | `assets` |
| 오른쪽에서 왼쪽으로 쓰는 글(`dir="rtl"`) | 코드는 왼쪽부터 읽는다. 칸 순서와 방향키가 뒤집히지 않게 그룹이 `direction: ltr`로 고정돼 있다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 칸 수 | `length` | 6 |
| 허용 문자 | `isAllowed` (코어 옵션) — 영문 코드면 `(c) => /[0-9A-Za-z]/.test(c)` | 숫자만 |
| 칸 크기·간격 | `--otp-cell-size`·`--otp-gap` | 3rem / 0.5rem |
| 색 | `--otp-accent`·`--otp-border`·`--otp-error`·`--otp-bg` | 거의 검정(#1c1c1c) / 회색 / 빨강 / 흰색 |
| 칸 이름 | `digitLabel({ label, position })` — position은 1부터 | "{label} {position}번째 자리" |

## 함께 쓰는 패턴

- `loading-button` — 자동 제출이라 붙여넣기 한 번에 `onComplete`가 불리고, 실패 뒤 다시 채우면 또 불린다. 인증 요청은 그 패턴의 `useAsyncAction`처럼 진행 중 재실행을 막는 장치로 감싼다.
- `form-shake-error` — `assets/shakeCore.ts`는 그 패턴과 같은 파일이다. 두 패턴을 함께 복사하면 하나만 두고 import 경로를 맞춘다. 그 패턴의 CSS를 함께 넣으면 `[aria-invalid='true']` 규칙이 칸에도 걸리므로 `--error-color`와 `--otp-error`를 같은 색으로 맞춘다.
- `bottom-sheet` · `modal-dialog` — 시트나 대화상자 안에 둘 때는 `autoFocus={false}`로 두고 등장 모션이 끝난 뒤 `focus()`를 부른다.
- `toast-stack` — "인증번호를 다시 보냈어요"처럼 칸의 오류가 아닌 알림에 쓴다.

## 주의사항

- **`type="number"`를 쓰지 않는 것은 의도다.** 스피너가 붙고 휠 스크롤로 값이 바뀐다. `type="text"` + `inputMode="numeric"`이면 모바일 숫자 키보드는 그대로 뜨면서 그 문제들이 없다.
- **`autoComplete="one-time-code"`는 첫 칸에만 준다.** 여섯 칸 모두에 주면 iOS가 칸마다 제안을 띄운다.
- **칸마다 `aria-label`이 필요하다**("인증번호 3번째 자리"). 라벨 없는 입력 여섯 개는 스크린 리더에 "편집 텍스트" 여섯 줄로만 읽힌다.
- **실패 안내는 흔들림만으로 끝내지 않는다.** 흔들림은 눈에만 보인다 — `role="alert"` 문구를 함께 띄운다. 이 패턴은 흔들기와 오류 테두리(`invalid`)만 제공하고 문구는 호출하는 쪽 몫이다.
- **좁은 화면에서는 칸이 줄어든다.** 기본 크기(3rem × 6칸 + 간격)는 328px라 320px 화면의 본문 폭보다 넓다. 그룹은 부모 폭을 넘지 않고(`max-width: 100%`), 칸이 그만큼 좁아진다(`min-width: 0`). 글자 크기는 `--otp-cell-size` 기준이라 그대로다.
- **reduced-motion 대응 내장** — 좌우 흔들림은 사라지고 붉은 테두리만 잠깐 뜬다. 실패했다는 사실이 사라지지 않도록 `role="alert"` 문구를 반드시 함께 띄운다.
