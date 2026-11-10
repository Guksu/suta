---
name: select
description: 네이티브 select를 대체하는 커스텀 셀렉트 박스(custom select, 콤보박스)를 구현한다 — 누르면 옵션 목록 패널이 펼쳐지고 하나 고르면 닫히며, 화살표 회전·키보드 내비게이션·ARIA를 갖춘다. "셀렉트 박스, 드롭다운 선택, 옵션 선택 UI, 폼 셀렉트 디자인 커스텀" 요청과 폼의 선택 입력을 디자인에 맞게 만들 때 쓴다. 기존 적용분의 패널 속도·높이·색 수정에도 쓴다.
---

# select — 커스텀 셀렉트

라이브 데모: https://guksu.github.io/suta/#/select

## 언제 쓰는가

네이티브 `<select>`의 옵션 패널은 OS가 그려서 디자인·애니메이션을 입힐 수 없다. 옵션에 아이콘·설명을 넣거나 패널 모션을 브랜드에 맞추려면 커스텀이 필요하다. 단, **커스텀은 키보드·스크린 리더 동작을 전부 직접 책임진다는 뜻이다** — 그 비용을 낼 이유(디자인 요구)가 없으면 네이티브 `<select>`가 항상 낫다. 이 패턴은 그 비용을 selectCore + Select 래퍼로 대신 지불한다.

**기술 선택:** WAI-ARIA "select-only combobox" 패턴 + CSS transition. 포커스는 항상 트리거 버튼에 있고 활성 옵션은 `aria-activedescendant`로만 가리킨다(옵션으로 포커스를 옮기면 스크롤·블러 관리가 복잡해진다). 키보드 판정은 DOM 무관 순수 함수로 분리해 테스트를 붙였다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/selectCore.ts` | 코어 — 하이라이트 이동·타이핑으로 찾기·처음 가리킬 옵션 판정 (순수 함수) | 모든 프로젝트 |
| `assets/select.css` | 트리거·패널 드롭 모션·하이라이트/선택 표시·disabled·오류 | 모든 프로젝트 |
| `assets/Select.tsx` | React 컴포넌트 (ARIA·키보드·바깥 클릭 닫기 포함) | React 프로젝트만 |
| `assets/createSelect.ts` | 순수 JS 배선 — 그려 둔 마크업에 ARIA·키보드·포인터를 잇는다 | React가 아닌 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { Select } from './Select'

const NOODLES = [
  { value: 'somyeon', label: '소면' },
  { value: 'jungmyeon', label: '중면' },
  { value: 'kalguksu', label: '칼국수면' },
]

const OrderForm = () => {
  const [noodle, setNoodle] = useState<string | null>(null)

  return <Select options={NOODLES} value={noodle} onChange={setNoodle} placeholder="면 종류 선택" />
}
```

키보드: `↓`/`↑`/`Enter`/`Space` 열기 → `↓ ↑ Home End PageUp PageDown` 하이라이트 이동 → `Enter`/`Space` 선택 → `Esc` 취소. 글자를 치면 그 글자로 시작하는 옵션으로 간다. 바깥 클릭·Tab 이탈 시 닫힌다.

| prop | 하는 일 |
|------|---------|
| `options[].disabled` | 고를 수 없는 옵션(품절 등). 보이지만 키보드가 건너뛰고 눌러도 고르지 않는다 |
| `disabled` | 셀렉트 전체를 끈다 |
| `invalid` · `required` | 트리거에 `aria-invalid` · `aria-required`를 싣는다. `invalid`면 테두리가 오류 색이 된다 |
| `name` | 숨은 input이 값을 들고 있어 `<form>`과 함께 제출된다 |

## 사용 방법 — 순수 JS (React 없음)

마크업을 그려 두고 `createSelect`에 루트를 넘긴다. 역할(`role`)·`aria-*`·옵션 id는 `createSelect`가 붙이므로 마크업에는 클래스와 `data-value`만 있으면 된다. 고를 수 없는 옵션에는 `aria-disabled="true"`를, 폼과 함께 제출하려면 숨은 input을 둔다.

```html
<div class="select" id="noodle">
  <button type="button" class="select-trigger" aria-label="면 종류">
    <span class="select-value"></span>
    <svg class="select-chevron" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
  <input type="hidden" name="noodle" />
  <ul class="select-panel">
    <li class="select-option" data-value="somyeon">소면</li>
    <li class="select-option" data-value="jungmyeon">중면</li>
    <li class="select-option" data-value="kalguksu" aria-disabled="true">칼국수면 (품절)</li>
  </ul>
</div>
```

```js
import { createSelect } from './createSelect.js'

const noodle = createSelect({
  root: document.getElementById('noodle'),
  value: null,
  placeholder: '면 종류 선택',
  onChange: (value) => console.log('고른 면:', value),
})
```

돌려받는 것: `value()` · `setValue(값)`(밖에서 바꾼다 — `onChange`는 불리지 않는다) · `open()` · `close()` · `refresh()`(옵션 마크업을 갈아 끼운 뒤 다시 잇는다) · `destroy()`(화면을 떠날 때 리스너를 걷는다). 셀렉트 전체를 끄려면 트리거 버튼에 `disabled`를 준다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 옵션이 0개이거나 아직 받아 오는 중이다 | 열어도 가리킬 옵션이 없고(`aria-activedescendant` 없음) Enter는 닫기만 한다. 빈 패널은 이유를 전하지 못하므로 `disabled`로 두고 `placeholder`에 이유를 적는다("불러오는 중", "고를 수 있는 면이 없어요") | `assets`(안전) · 프로젝트(안내) |
| 고를 수 없는 옵션이 있다(품절) | `aria-disabled="true"`, `opacity: 0.45`. 화살표와 타이핑이 건너뛰고, 눌러도 패널이 닫히지 않는다. 이유는 옵션 글자에 적는다("칼국수면 (품절)") | `assets` · 프로젝트(이유 글자) |
| 옵션이 수십 개가 넘는다 | 패널은 240px에서 멈추고 안에서 스크롤된다. 하이라이트가 늘 보이게 따라 스크롤된다. `PageUp`·`PageDown`은 10칸씩 가고, 글자를 치면 그 글자로 시작하는 옵션으로 간다(500ms 안에 이어 친 글자는 한 낱말, 같은 글자를 거듭 치면 차례로 돈다) | `assets` |
| 옵션이나 고른 값의 글자가 길다 | 트리거와 옵션 안에서 줄이 꺾이고 트리거가 그만큼 높아진다. `.select`의 폭은 고른 값의 길이를 따르므로, 폼에서는 `.select { width: 100% }`로 폭을 고정해 고를 때마다 폭이 바뀌지 않게 한다 | `assets`(꺾임) · 프로젝트(폭) |
| 마우스로 고른 뒤 키보드로 이어 쓴다 | 옵션을 누르면 포커스가 트리거로 돌아온다. 바로 `↓`로 다시 열 수 있다 | `assets` |
| 키보드로 목록을 넘기는데 포인터가 패널 위에 있다 | 하이라이트는 키보드를 따른다. 목록이 스크롤돼 포인터 밑의 옵션이 바뀐 것은 무시하고, 포인터가 실제로 움직였을 때만 따라간다 | `assets` |
| 대화상자나 시트 안에서 열린 채 Esc를 누른다 | 패널만 닫힌다(기본 동작과 전파를 막는다). 한 번 더 눌러야 대화상자가 닫힌다 | `assets` |
| 고르지 않고 제출했다 | `invalid`를 주면 `aria-invalid="true"`가 켜지고 테두리가 `--select-error` 색이 된다. 문구는 트리거 아래 한 줄에 따로 둔다. 고르면 `invalid`를 내린다 | `assets`(표시) · 프로젝트(문구·내리기) |
| 열린 채 다른 화면으로 넘어간다 | 바깥 누름 리스너와 타이핑 타이머가 걷힌다. 순수 JS에서는 `destroy()`를 부른다 | `assets` |
| 고대비 모드(`forced-colors`) | 배경색이 지워져 하이라이트가 보이지 않는다. 가리키는 옵션을 시스템 색 `Highlight`로 칠한다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 패널 드롭 속도 | `--select-duration` (기본 200ms) |
| 배경·테두리 | `--select-bg`(#fff)·`--select-border`(#d4d4d4) |
| 하이라이트·선택 색 | `--select-highlight`(색 토큰 `--color-canvas`, 없으면 #f3f3f3)·`--select-accent`(#1c1c1c) |
| 오류 색 | `--select-error` (기본은 `--color-danger` 토큰, 없으면 #c8341f) |
| 패널 최대 높이 | `--select-panel-max-height` (기본 240px — 넘으면 패널 안 스크롤) |
| 최소 폭 | `--select-min-width` (기본 200px) |
| 이름 | `label` 또는 화면 라벨의 id `labelledBy` (없으면 `placeholder`가 이름이 된다 — 콤보박스는 안의 글자를 이름으로 쓰지 않는다) |

트리거의 글자색은 둘레의 글자색을 따른다(`color: inherit`). 어두운 바탕에서는 `--select-bg`·`--select-border`·`--select-highlight`를 바탕에 맞춘다.

## 함께 쓰는 패턴

- `checkbox-radio` · `segmented-control` — 선택지가 2~4개면 셀렉트로 접지 않고 펼쳐 둔다. 눌러야 보이는 선택지는 한 번에 비교할 수 없다.
- `bottom-sheet` — 좁은 화면에서 옵션이 많거나 옵션마다 설명이 붙으면 트리거 아래 패널 대신 시트에 목록을 띄운다.
- `search-suggest` — 옵션이 수백 개이거나 한글 이름을 쳐서 찾아야 하면 검색 입력이 있는 목록을 쓴다.
- `form-shake-error` — 고르지 않고 제출했을 때 셀렉트를 흔들고 아래에 오류 문구를 밀어 올린다. `invalid`와 함께 쓴다.

## 주의사항

- **값은 `name`을 줘야 폼에 실린다** — 네이티브 `<select name>`이 아니므로 `name`이 없으면 제출에 값이 없다. `name`을 주면 숨은 input이 값을 들고 있다(순수 JS는 마크업에 `<input type="hidden">`을 둔다). 브라우저의 `required` 검증은 걸리지 않으므로 제출 때 직접 확인한다.
- **타이핑으로 찾기는 영문·숫자에서만 된다** — 한글 입력기가 글자를 조합하는 동안에는 키 이벤트가 글자를 알려 주지 않는다.
- **하이라이트와 선택은 다른 상태다** — 하이라이트(`data-highlighted`)는 키보드/호버가 가리키는 곳, 선택(`aria-selected`)은 확정된 값. 스타일을 합치면 키보드 사용자가 "지금 어디를 보고 있는지"를 잃는다.
- 패널은 언마운트하지 않고 `data-open`으로 여닫는다 — 닫힘 애니메이션이 공짜다. 조건부 렌더링으로 바꾸면 퇴장 모션이 사라진다.
- 패널은 트리거 아래 고정 배치다 — 화면 하단 요소에서 위로 펼쳐야 하면 `.select-panel`의 `top`을 `bottom: calc(100% + 6px)`로 바꾸고 `transform-origin: bottom`으로 뒤집는다. 자동 플립이 필요하면 위치 라이브러리 영역이다.
- 패널은 `.select` 안에 `position: absolute`로 놓인다 — `overflow: hidden`이나 스크롤이 걸린 조상(카드·시트·표) 안에서는 패널이 잘린다. 그 조상의 `overflow`를 풀거나 패널이 펼쳐질 자리를 남긴다.
- 옵션은 한 번에 모두 그린다 — 수백 개까지는 스크롤과 키보드로 쓸 수 있지만, 그보다 많으면 검색 입력이 있는 콤보박스나 가상 스크롤 영역이다(이 패턴 범위 밖).
- **reduced-motion 대응 내장** — 이동·확대를 끄고 페이드만 남긴다. 블록 제거 금지.
