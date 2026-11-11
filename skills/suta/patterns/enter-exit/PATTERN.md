---
name: enter-exit
description: React 요소의 진입/퇴장(enter/exit) 애니메이션을 구현한다 — 나타날 때 페이드·슬라이드·스케일로 들어오고, 사라질 때 그냥 없어지지 않고 스르륵 퇴장한 뒤 언마운트된다. "페이드 인/아웃, 등장/퇴장 효과, 사라질 때 애니메이션, 나타날 때 부드럽게" 요청과 알림·팝오버·목록 항목 등 나타나고 사라지는 컴포넌트 전환에 쓴다. 기존 적용분의 타이밍·방향 수정에도 쓴다.
---

# enter-exit — 진입/퇴장 애니메이션

라이브 데모: https://guksu.github.io/suta/#/enter-exit

## 언제 쓰는가

조건부로 나타나고 사라지는 요소(모달·토스트·드롭다운·배너)에 CSS 전환을 붙일 때. 핵심 문제는 **퇴장**이다: React는 조건이 false가 되는 즉시 언마운트하므로, CSS만으로는 사라지는 애니메이션이 보일 틈이 없다. 이 패턴의 `Presence` 컴포넌트가 언마운트를 애니메이션 종료까지 지연시킨다.

**기술 선택:** CSS transition + 프레임워크 무관 상태 머신 코어(의존성 0). 진입/퇴장은 CSS가 가장 싸고 빠른 영역이고, 코어는 상태 전이 타이밍만 푼다. 2층 구조다:

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createPresence.ts` | 코어 — DOM API로 `data-state` 구동 | 모든 프로젝트 |
| `assets/enter-exit.css` | 애니메이션 정의 | 모든 프로젝트 |
| `assets/Presence.tsx` | React 래퍼 (코어 사용) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기(`type`·제네릭·`as`)를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

1. 위 표의 세 파일을 복사한다(전체 구현이 이 파일들에 있다 — 반드시 읽어라).
2. 조건부 렌더링 `{open && <Modal />}`을 `Presence`로 감싼다.
3. 자식 요소에 `fx` + 변형 클래스(`fx-fade`·`fx-slide-up`·`fx-scale`)를 붙인다. 순수 페이드(`fx-fade`)는 딤 배경·오버레이용이다 — 콘텐츠(카드·토스트·모달)는 약간의 이동·스케일이 있는 `fx-slide-up`/`fx-scale`이 덜 평평하게 느껴진다.

`Presence`는 자식에 `data-state`(entering→entered→exiting)를 주입하고, CSS는 그 속성에만 반응한다. 상태 흐름과 스타일이 분리되어 있어 변형 추가는 CSS만으로 된다.

```tsx
import { Presence } from './Presence'
import './enter-exit.css'

const Toast = ({ open, message }: { open: boolean; message: string }) => (
  <Presence show={open} timeoutMs={400}>
    <div className="fx fx-slide-up" role="status">
      {message}
    </div>
  </Presence>
)
```

## 사용 방법 — 순수 JS (React 없음)

코어(`createPresence`)와 CSS만 복사한다. 요소를 직접 만들고 `show()`/`hide()`로 구동하며, `onChange(null)`이 "퇴장이 끝나 제거해도 안전한 시점"이다.

```js
import { createPresence } from './createPresence.js'

const toast = document.createElement('div')
toast.className = 'fx fx-slide-up'
toast.textContent = '저장했어요'
document.body.appendChild(toast)

const presence = createPresence({
  element: toast,
  timeoutMs: 400,
  onChange: (state) => {
    if (state === null) toast.remove() // 퇴장 완료 후에만 제거
  },
})
presence.show()
// 닫을 때: presence.hide()
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 화면에 처음 그려질 때 이미 열려 있다(새로고침, 뒤로 와서 복원된 화면) | 진입 애니메이션 없이 처음부터 `data-state="entered"`로 그려진다. 사용자가 방금 연 것이 아니면 움직일 이유가 없다 | `assets` — `<Presence appear={false}>`, 순수 JS는 `show({ immediate: true })`. 기본값은 예전처럼 진입한다 |
| 퇴장 중에 다시 연다(연타·되돌리기) | 언마운트 없이 그 자리에서 `entered`로 되돌아간다. 프레임을 기다리지 않으므로 사라지던 값에서 바로 뒤집힌다. 입력 포커스와 스크롤 위치가 남는다 | `assets` — `createPresence` |
| 열자마자 닫는다(아직 한 번도 그려지지 않은 `entering`) | 폴백 시간을 기다리지 않고 바로 제거된다. 보이지 않는 요소가 `timeoutMs` 동안 DOM에 남지 않는다 | `assets` — `createPresence` |
| 탭이 가려져 있거나 조상이 `display: none`이다 | `transitionend`가 오지 않는다. `timeoutMs`(기본 500ms) 뒤에 제거된다. 가려진 탭에서 연 요소는 탭이 다시 보일 때 진입한다 | `assets` — 폴백 타이머. 지우지 않는다 |
| 안쪽 버튼·링크에 자체 transition이 있다 | 안쪽의 `transitionend`가 버블링돼도 퇴장이 중간에 끝나지 않는다. 요소 자신의 이벤트만 받는다 | `assets` — `createPresence` |
| 퇴장 중인 요소를 누른다 | 눌리지 않는다. 사라지는 버튼이 두 번 실행되거나 아래 요소의 클릭을 가로채지 않는다(`pointer-events: none`) | `assets` — `enter-exit.css`. 키보드 포커스는 남으므로 아래 행을 본다 |
| 포커스가 안에 있는 채로 닫힌다 | 언마운트되면 포커스가 `body`로 떨어진다. 닫기 전에 연 버튼으로 포커스를 돌려보낸다 | `프로젝트` |
| 동작 줄이기(`prefers-reduced-motion: reduce`) | 이동·확대 없이 페이드만 한다. 전이가 남아 있어 `transitionend`가 그대로 온다 | `assets` — `enter-exit.css` |
| 퇴장 중에 `Presence`를 품은 화면이 통째로 사라진다 | 타이머와 리스너를 걷는다. 사라진 컴포넌트에 상태를 쓰지 않는다 | `assets` — `Presence`가 `destroy()`를 부른다. 순수 JS는 `프로젝트`가 부른다 |
| 목록 항목 여러 개가 한꺼번에 들어오고 나간다 | 남은 항목이 빈자리로 뚝 끊겨 옮겨진다. 이 패턴은 요소 하나의 등장·퇴장만 다룬다 | `프로젝트` — `patterns/flip-list` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 지속 시간·이징 | CSS 변수 `--fx-duration`·`--fx-ease` 덮어쓰기 |
| 이동 거리(슬라이드) | `--fx-distance` |
| 시작 배율(스케일) | `--fx-from-scale` |
| 새 변형 추가 | `.fx-{이름}[data-state='entering'], [data-state='exiting']`에 시작 상태 CSS만 추가 |
| 언마운트 폴백 | `timeoutMs` prop — CSS duration보다 길게 (기본 500ms) |
| 첫 화면의 진입 | `appear` prop — `false`면 처음부터 열려 있는 요소가 움직이지 않는다 (기본 true) |

## 함께 쓰는 패턴

- `patterns/flip-list` — 항목이 빠지거나 들어올 때 나머지 항목의 자리 이동까지 보여야 하는 목록. 두 패턴의 파일을 함께 복사하고, 항목의 등장·퇴장은 이 패턴이, 남은 항목의 이동은 flip-list가 맡는다.
- `patterns/toast-stack` — 토스트가 여러 장 쌓이고 저절로 사라져야 할 때. 낱장 토스트 하나면 이 패턴으로 충분하다.
- `patterns/modal-dialog` — 화면을 덮는 대화상자. 포커스 가두기와 Esc는 그 패턴이 갖고 있다. 이 패턴의 `fx-scale`만으로 모달을 만들지 않는다.

## 주의사항

- `prefers-reduced-motion` 블록은 지우지 않는다. 지우면 동작 줄이기에서도 이동·확대가 남는다.
- `timeoutMs`가 CSS duration보다 짧으면 애니메이션이 잘린 채 언마운트된다.
- (React) 자식은 단일 엘리먼트여야 하며, `Presence`가 ref와 `data-state`를 주입하므로 자식의 기존 ref는 덮어써진다. 자식의 ref가 필요하면 한 겹 감싼 요소에 `fx`를 준다.
- (순수 JS) `hide()` 후 `onChange(null)`을 기다리지 않고 즉시 `remove()`하면 퇴장 애니메이션이 잘린다 — 제거는 반드시 null 알림에서.
- 요소 자신에 `opacity`·`transform`이 아닌 전이(예: `background-color`)를 더 짧게 걸면 그 `transitionend`가 먼저 와서 퇴장이 일찍 끝난다 — 상세는 `references/edge-cases.md`.
