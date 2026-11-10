---
name: checkbox-radio
description: 체크박스(checkbox)·라디오(radio) 버튼 컴포넌트 구현 — 체크할 때 체크 표시가 획으로 그려지듯 나타나고 라디오 도트가 튀어 맺히며, 키보드·그룹 배타·폼 연동이 된다. "체크박스, 라디오 버튼, 동의 체크, 약관 동의, 단일 선택, 다중 선택" 요청과 폼의 선택 입력에 쓴다. 기존 적용분의 크기·색·속도 수정에도 쓴다.
---

# checkbox-radio — 체크박스 · 라디오

라이브 데모: https://guksu.github.io/suta/#/checkbox-radio

## 언제 쓰는가

약관 동의, 토핑 여러 개 고르기(체크박스), 면 종류 하나 고르기(라디오)처럼 **제출 시 반영되는 선택 입력**. 즉시 적용되는 on/off는 `switch` 패턴이 맞다. 체크마크가 획 순서대로 그려지는 모션은 "지금 선택됐다"를 눈에 남기는 최소한의 피드백이다 — 브라우저 기본 체크박스는 프레임 하나로 바뀌어 눈이 놓친다.

**기술 선택:** 네이티브 `<input type="checkbox|radio">` + CSS. 입력을 시각적으로만 숨기고 박스·마크를 그리면 포커스·Space 토글·라디오 화살표 이동·같은 name 배타 선택·폼 제출이 전부 브라우저 몫이 된다. 체크마크는 SVG path의 `stroke-dasharray/dashoffset`으로 그려지고, 라디오 도트는 `transform: scale`로 맺힌다 — 레이아웃 애니메이션 없음.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/checkbox-radio.css` | 박스·마크·도트·누름·포커스 링 정의 | 모든 프로젝트 |
| `assets/Checkbox.tsx` | React 래퍼 (체크박스) | React 프로젝트만 |
| `assets/Radio.tsx` | React 래퍼 (라디오) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { Checkbox } from './Checkbox'
import { Radio } from './Radio'

const NoodleForm = () => {
  const [noodle, setNoodle] = useState('somyeon')
  const [agree, setAgree] = useState(false)

  return (
    <form>
      <fieldset>
        <legend>면 종류</legend>
        <Radio name="noodle" value="somyeon" checked={noodle === 'somyeon'} onChange={() => setNoodle('somyeon')} label="소면" />
        <Radio name="noodle" value="kalguksu" checked={noodle === 'kalguksu'} onChange={() => setNoodle('kalguksu')} label="칼국수" />
      </fieldset>
      <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} label="주문 안내에 동의합니다" />
    </form>
  )
}
```

두 컴포넌트 모두 나머지 props(`name`·`value`·`disabled`·`required`·`aria-invalid`·`aria-describedby` 등)를 input에 그대로 넘긴다.

"전체 동의"처럼 아래 항목을 묶는 체크박스에는 `indeterminate`(부분 선택)를 준다. 일부만 골랐을 때 체크 표시 대신 가로줄이 보이고, 낭독기는 "일부 선택됨"으로 읽는다.

```tsx
const TERMS = ['service', 'privacy', 'marketing']
const [agreed, setAgreed] = useState<string[]>([])

<Checkbox
  label="전체 동의"
  checked={agreed.length === TERMS.length}
  indeterminate={agreed.length > 0 && agreed.length < TERMS.length}
  onChange={(e) => setAgreed(e.target.checked ? TERMS : [])}
/>
```

## 사용 방법 — 순수 JS (React 없음)

마크업만 맞추면 JS 없이 동작한다(상태는 input이 들고 있다).

```html
<label class="check" data-kind="checkbox">
  <input type="checkbox" class="check-input" name="agree" />
  <span class="check-box" aria-hidden="true">
    <svg class="check-mark" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 7" /></svg>
  </span>
  <span class="check-label">주문 안내에 동의합니다</span>
</label>

<label class="check" data-kind="radio">
  <input type="radio" class="check-input" name="noodle" value="somyeon" />
  <span class="check-box" aria-hidden="true"><span class="check-dot"></span></span>
  <span class="check-label">소면</span>
</label>
```

부분 선택은 HTML 속성이 없다. 순수 JS에서는 `input.indeterminate = true`로 켠다. 브라우저는 사용자가 누를 때 이 값을 끄므로, `change`에서 아래 항목의 상태를 보고 다시 맞춘다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| "전체 동의" 아래 항목을 일부만 골랐다 | 전체 체크박스는 비움도 채움도 아닌 가로줄이다. 누르면 전부 고르거나 전부 푼다 | `assets` — `Checkbox`의 `indeterminate` |
| 필수 동의를 빼고 제출했다 | 그 input에 `aria-invalid="true"`를 주면 고르지 않은 박스의 테두리가 `--check-error` 색이 된다. 테두리 색만으로는 약하므로 묶음 아래에 오류 문구 한 줄을 두고 `aria-describedby`로 잇는다. 고르면 `aria-invalid`를 내린다 | `assets`(테두리) · 프로젝트(문구·내리기) |
| 라벨이 길어 두 줄 이상으로 꺾인다 | 박스는 문단 가운데가 아니라 첫 줄의 가운데에 선다(`1lh` 기준). 긴 약관 문구에서도 박스와 첫 글자가 한 줄에 있다 | `assets` |
| 라벨 문구 안에 "약관 보기" 링크가 있다 | 링크를 누르면 링크만 열리고 체크는 바뀌지 않는다(label 안의 링크는 브라우저가 따로 처리한다). 링크 글자는 누르는 영역이 작으므로 라벨 끝에 두고 밑줄을 긋는다 | 프로젝트 |
| 손가락으로 누른다 | 누르는 영역의 높이가 44px 이상이다. 박스는 22px이고, label의 위아래 안쪽 여백 11px이 나머지를 채운다. 같은 크기의 음수 바깥 여백이 있어 자리는 그대로다. 세로 간격이 22px보다 좁으면 영역이 겹치고, 겹친 곳은 아래 항목이 받는다 | `assets` |
| 지금은 고를 수 없다(`disabled`) | 전체가 `opacity: 0.5`, 커서는 `not-allowed`, 눌림 움츠림이 없다. 고른 채로 꺼진 항목도 같다 | `assets` |
| 박스만 두고 라벨이 없다(표의 행 선택 등) | `aria-label`로 이름을 준다. 누르는 영역은 박스 폭 22px뿐이므로 칸 전체를 `<label>`로 감싸는 편이 낫다 | 프로젝트 |
| 라디오 묶음이 아무것도 고르지 않은 채 시작한다 | Tab은 묶음의 첫 라디오로 들어가고, 화살표는 옮기는 동시에 고른다(브라우저 동작). 흔한 답이 있으면 하나를 `checked`로 두고 시작한다 | 프로젝트 |
| 고대비 모드(`forced-colors`) | 배경색이 지워져 고른 박스와 고르지 않은 박스가 같아 보이고 라디오 도트는 사라진다. 고른 박스를 시스템 색 `Highlight`로 채우고 표시는 `HighlightText`로 그린다 | `assets` |
| 어두운 바탕이거나 강조색이 밝다 | `--check-accent`를 밝은 색으로 바꾸면 흰 체크 표시가 묻힌다. `--check-mark`를 강조색과 4.5:1 이상 차이 나는 색으로 함께 바꾼다 | 프로젝트 — 변수는 `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 크기 | `--check-size` (22px — 마크·도트는 비율로 따라온다) |
| 색 | `--check-accent`(선택 색), `--check-border`(미선택 테두리), `--check-mark`(체크 표시·도트·가로줄, 기본 흰색), `--check-error`(오류 테두리, 기본은 `--color-danger` 토큰, 없으면 #c8341f) |
| 속도 | `--check-duration` (200ms — 마크 그리기는 박스 채움보다 30% 늦게 시작한다) |
| 체크마크 모양 | `Checkbox.tsx`의 `path d` — 바꾸면 `stroke-dasharray` 값도 path 길이(`getTotalLength()`)에 맞춘다 |

## 함께 쓰는 패턴

- `form-shake-error` — 필수 동의 없이 제출했을 때 동의 묶음을 흔들고 아래에 오류 문구를 밀어 올린다. `shakeCore.ts`·`ShakeField.tsx`·CSS를 함께 복사하고, 흔드는 대상은 체크박스 하나가 아니라 묶음(`fieldset`)이다.
- `switch` — 누르는 즉시 적용되는 켜짐·꺼짐에는 체크박스 대신 스위치를 쓴다.
- `segmented-control` — 선택지가 2~4개이고 이름이 짧으면 라디오를 세로로 쌓는 대신 한 줄로 놓는다.

## 주의사항

- **입력을 `display: none`으로 숨기면 안 된다** — 포커스를 받을 수 없게 된다. 제공된 클립 방식(시각만 숨김)을 유지한다.
- 라디오는 반드시 같은 `name`으로 묶고 `fieldset/legend`로 그룹 이름을 준다 — 배타 선택과 "면 종류, 소면, 1/2" 안내가 여기서 나온다.
- 체크마크 `stroke-dasharray: 24`는 제공된 path 길이 기준이다. path를 바꾸면 dash 값이 짧아 끝이 잘리거나 길어 지연이 생긴다.
- 라디오 도트의 오버슈트 커브(1.56)는 도트에만 쓴다 — 박스 채움에 오버슈트를 주면 색이 넘쳤다 돌아오는 것처럼 보인다.
- 부분 선택 스타일은 체크박스(`data-kind="checkbox"`)에만 건다. 라디오는 아무것도 고르지 않은 묶음 전체가 `:indeterminate`에 걸리므로, 선택자에서 `data-kind`를 빼면 빈 라디오가 모두 채워진다.
- **reduced-motion 대응 내장** — 그리기·튀어오름을 즉시 표시로 바꾸고 색 전환(상태 표시)은 유지한다. 블록 제거 금지.
