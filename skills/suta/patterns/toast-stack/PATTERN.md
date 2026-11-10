---
name: toast-stack
description: 화면 하단(또는 상단 배너 위치)에 토스트(toast) 알림이 쌓이고 몇 초 뒤 스스로 사라지는 시스템을 구현한다. "토스트 알림 띄워줘/추가해줘, 스낵바, 저장됨 메시지 잠깐 띄우기, 알림 쌓기, 상단 배너 알림, 밑에서 올라왔다 사라지는 메시지" 요청과 일시적 알림 UI에 쓴다. 기존 적용분의 표시 시간·개수·위치 수정에도 쓴다.
---

# toast-stack — 토스트 스택

라이브 데모: https://guksu.github.io/suta/#/toast-stack

## 언제 쓰는가

"저장했어요" 같은 일시적 알림. 연속으로 발생하면 서로 덮어쓰는 대신 쌓였다가 각자 소멸해야 유실이 없다 — 이 스택 관리(밀어 올리기·최대 개수·자동 소멸)가 이 패턴의 본체다.

**기술 선택:** 코어가 스택 위치를 transform으로 직접 구동(레이아웃 애니메이션 없음)하고, 등장/퇴장은 enter-exit 패턴과 같은 data-state 규약으로 CSS가 그린다. 라이브 영역(role="status", aria-live="polite")에 쌓여 스크린 리더에도 알림이 전달된다. 위치는 하단(기본, 최신이 아래·위로 쌓임)과 상단(iOS 푸시 배너처럼 위에서 내려옴·최신이 위·아래로 쌓임) 둘 — 코어는 쌓이는 방향의 부호만 바꾸고, 등장 방향은 코어의 transform과 겹치지 않도록 CSS `translate` 속성으로 그린다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createToastStack.ts` | 코어 — 스택·자동 소멸·재배치 | 모든 프로젝트 |
| `assets/toast-stack.css` | 토스트 모양·등장/퇴장 정의 | 모든 프로젝트 |
| `assets/useToastStack.ts` | React 훅 (수명 관리) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다.

## 사용 방법 — React

```tsx
import { useToastStack } from './useToastStack'

// 훅은 앱에서 한 곳(최상위 레이아웃)에서만 부르고, toast를 context나 prop으로 내려 준다
const SavePanel = () => {
  const { toast } = useToastStack()

  return (
    <button type="button" onClick={() => toast('저장했어요')}>
      저장
    </button>
  )
}
```

## 사용 방법 — 순수 JS (React 없음)

```js
import { createToastStack } from './createToastStack.js'

const toasts = createToastStack({ durationMs: 3500, maxVisible: 3 })
document.querySelector('#save').addEventListener('click', () => {
  toasts.show('저장했어요')
})
// 되돌리기 버튼 등에서 조기 종료가 필요하면: const dismiss = toasts.show('...'); dismiss()
// 긴 문장 하나만 오래 두려면: toasts.show('...', { durationMs: 6000 }) — React는 toast('...', { durationMs: 6000 })
// 상단 배너(위에서 내려옴): createToastStack({ position: 'top' }) — React는 useToastStack({ position: 'top' })
```


## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 문구가 길거나 화면이 320px이다 | 화면 양옆 16px를 남기고 줄이 꺾인다. 넓은 화면에서도 28rem을 넘지 않는다. 한 줄이면 알약, 여러 줄이면 반경 24px의 둥근 사각형이다. 화면 폭이 바뀌면 쌓인 간격을 다시 잰다 | `assets` — `toast-stack.css`, 코어의 `resize` 처리 |
| 문장이 길어 3.5초에 다 읽기 어렵다 | 그 토스트 하나만 오래 둔다. 토스트는 한 문장(15자 안팎)이 기준이고, 두 문장이면 6초쯤 준다 | `assets` — `show(message, { durationMs })`. 시간을 정하는 일은 `프로젝트` |
| 연달아 여러 개가 온다 | 최대 3개가 쌓이고 넘치면 가장 오래된 것부터 나간다. 줄 수가 달라도 각자의 높이 + 10px 간격으로 쌓인다. 밀려 올라가는 중에 나가는 토스트도 끝까지 흐려진 뒤 지워진다 | `assets` — `maxVisible`·`gapPx` |
| 같은 문구가 연타로 온다("담았어요" 세 번) | 코어는 같은 문구도 따로 쌓는다. 한 장만 남기려면 앞의 것을 닫고 새로 띄운다 | `프로젝트` — `dismissLast?.(); dismissLast = toast('담았어요')` |
| 마우스를 올리거나 키보드로 지나간다 | 토스트는 포인터도 포커스도 받지 않는다(`pointer-events: none`). 아래에 있는 버튼을 가리지 않는 대신, 올려 두어도 사라지는 시간이 멈추지 않는다. 읽을 시간은 `durationMs`로만 정한다 | `assets` |
| 화면이 바뀐다 | 앞 화면의 "담았어요"가 다음 화면(장바구니)까지 따라오지 않는다. 경로가 바뀔 때 `clearToasts()`(코어는 `clear()`)를 부른다. 이동한 뒤에도 보여야 하는 알림은 이동한 화면에서 띄운다 | 비우는 함수는 `assets`. 부르는 일은 `프로젝트` |
| 훅을 화면마다 부른다 | 스택마다 라이브 영역이 하나씩 생겨 같은 자리에 겹친다. 그 화면이 사라질 때 떠 있던 토스트도 퇴장 없이 함께 사라진다. 훅은 최상위 레이아웃에서 한 번만 부른다 | `프로젝트` |
| 모달이 열려 있다 | `<dialog>`를 `showModal()`로 연 모달은 페이지의 모든 것 위에 그려진다. 토스트는 그 백드롭 아래에 깔린다. 모달 안에서 생긴 결과는 모달 안의 문구로 알리거나, 모달을 닫은 뒤에 토스트를 띄운다 | `프로젝트` |
| 화면 낭독기로 듣는다 | 하던 낭독을 끊지 않고 새로 온 토스트만 읽게 한다(`role="status"`, `aria-live="polite"`, `aria-atomic="false"`). `aria-atomic`을 빼면 쌓일 때마다 떠 있는 토스트 전부를 다시 읽는다 | `assets` |
| 고대비 모드(`forced-colors: active`) | 배경색과 그림자가 사라지므로 테두리 1px(`CanvasText`)로 경계를 그린다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 소멸 시간 | `durationMs` (기본 3500ms). 토스트 하나만 바꾸려면 `show(message, { durationMs })` |
| 최대 개수 | `maxVisible` (기본 3 — 넘치면 가장 오래된 것부터 밀려난다) |
| 토스트 사이 간격 | `gapPx` (기본 10) |
| 색·모양 | `--toast-bg`·`--toast-color`, `.toast-item` 스타일 덮어쓰기 |
| 등장·퇴장 속도 | `--toast-duration` (기본 300ms). 600ms를 넘기면 퇴장이 끝나기 전에 지워진다 |
| 최대 폭 | `.toast-region`의 `max-width` (기본 화면 폭 − 32px, 최대 28rem) |
| 위치 | `position` 옵션 — `'bottom'`(기본, 위로 쌓임) · `'top'`(상단 배너, `data-position="top"`이 붙고 아래로 쌓이며 위에서 내려온다). 좌우 정렬은 `.toast-region`의 left/translate를 바꾼다 — 코어는 무관하다 |

## 함께 쓰는 패턴

- `patterns/bottom-nav` — 하단 탭 바나 하단 고정 바가 있는 화면. 토스트를 그 위에 띄운다: `.toast-region { bottom: calc(24px + var(--bottom-nav-height, 56px) + env(safe-area-inset-bottom)) }`.
- `patterns/loading-button` — 제출이 끝난 뒤 화면이 바뀌는 흐름. 버튼의 완료 표시는 화면과 함께 사라지므로 이동한 화면에서 토스트 한 줄로 알린다.
- `patterns/celebration` — 자주 생기는 작은 적립은 축하 오버레이 대신 상단 토스트 한 줄로 알린다(`position: 'top'`).
- `patterns/form-shake-error` — 고칠 자리가 있는 오류. 토스트가 아니라 그 칸 아래의 오류 줄로 알린다.

## 주의사항

- **토스트는 조작 수단이 아니다** — 버튼·링크를 토스트 안에 넣으면 사라지기 전에 눌러야 하는 시간 압박 UI가 된다(접근성 문제). 행동이 필요하면 토스트가 아니라 배너·다이얼로그를 써라.
- 같은 이유로 중요한 오류를 토스트로만 알리지 마라 — 사라지고 나면 복구 경로가 없다.
- **reduced-motion 대응 내장** — 이동·확대 없이 페이드만 남는다. 라이브 영역이라 스크린 리더 전달은 모션과 무관하게 동작한다.
- 스택 이동(transform) 값은 코어가 관리한다 — CSS에서 `.toast-item`에 transform을 덮어쓰지 마라. 등장 방향을 바꾸고 싶으면 `translate` 속성을 쓴다(상단 모드가 그렇게 한다).
- 위아래 24px에는 안전 영역(`env(safe-area-inset-*)`)이 이미 더해져 있다. 상단 모드에서 고정된 상단 바가 있으면 그 높이만큼 더 내린다 — `.toast-region[data-position="top"] { top: calc(24px + 56px + env(safe-area-inset-top)) }`.
- 훅의 옵션(`durationMs`·`maxVisible`·`position`)이 바뀌면 스택을 새로 만든다. 그 순간 떠 있던 토스트는 사라진다.
