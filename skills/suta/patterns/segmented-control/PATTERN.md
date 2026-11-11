---
name: segmented-control
description: iOS 스타일 세그먼트 컨트롤(segmented control) 컴포넌트를 구현한다 — 선택한 칸 뒤로 알약 모양 배경(thumb)이 미끄러져 이동하며, 방향키·스크린 리더에 대응한다. "세그먼트 컨트롤, 세그먼트 버튼, 알약 탭, 매장/포장 같은 2~5지선다 옵션 토글, iOS 탭 토글" 요청과 소수 옵션 중 하나를 즉시 고르는 컨트롤에 쓴다. 기존 적용분의 thumb 색·이동 속도·모서리 수정에도 쓴다.
---

# segmented-control — 세그먼트 컨트롤

라이브 데모: https://guksu.github.io/suta/#/segmented-control

## 언제 쓰는가

"매장/포장", "소면/칼국수/냉면"처럼 **2~5개 옵션 중 하나를 즉시 고르는** 컨트롤. iOS의 세그먼트 컨트롤(지도 앱의 지도/교통/위성 전환)이 이 관례다 — 선택 칸 뒤로 흰 알약이 미끄러져 "어디서 어디로 옮겼는지"가 보인다. 밑줄만 움직이는 `tab-indicator`와 달리 선택 칸 전체를 배경판이 덮는다.

기준: 옵션이 화면(콘텐츠 영역)을 바꾸면 탭(`tab-indicator`), 값(설정·필터·주문 옵션)을 바꾸면 세그먼트 컨트롤. 옵션이 6개 이상이거나 라벨이 길면 세그먼트가 아니라 셀렉트(`select`)나 라디오 목록이 맞다.

**기술 선택:** 네이티브 `<input type="radio">` 그룹 + 측정(JS 한 줄) + CSS transition. 라디오를 시각적으로만 숨기고 라벨을 칸으로 쓰면 배타 선택·방향키 이동·포커스·폼 제출이 전부 브라우저 몫이다. thumb는 `translateX`(위치) + `width`(폭)로 옮긴다 — `tab-indicator`처럼 `scaleX`로 늘리면 알약의 둥근 모서리와 그림자가 가로로 찌그러진다. 전이는 `transform` 하나다. 칸이 같은 폭(`grid-auto-columns: 1fr`, 기본값)이면 이동할 때 폭이 바뀌지 않으므로 위치만 미끄러지면 되고, `width`를 전이하면 매 프레임 레이아웃만 돌린다. 칸 폭을 내용대로(`auto`) 바꾼 변형에서는 폭이 바로 맞고 위치만 미끄러진다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/moveSegmentThumb.ts` | 코어 — 측정→transform·width 적용, `segmentThumbFrame` 순수 계산 포함 | 모든 프로젝트 |
| `assets/segmented-control.css` | 트랙·칸·thumb·포커스 링 정의 | 모든 프로젝트 |
| `assets/useSegmentedControl.ts` | React 훅 (코어 사용, 리사이즈 재측정 포함) | React 프로젝트만 |
| `assets/SegmentedControl.tsx` | React 편의 컴포넌트 (마크업·라디오 그룹 내장) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { SegmentedControl } from './SegmentedControl'

const ORDERS = [
  { value: 'dine-in', label: '매장' },
  { value: 'takeout', label: '포장' },
]

const OrderType = () => {
  const [order, setOrder] = useState('dine-in')

  return <SegmentedControl name="order" label="주문 방식" options={ORDERS} value={order} onChange={setOrder} />
}
```

한 칸만 잠그려면 그 옵션에 `disabled: true`를 준다(`{ value: 'kalguksu', label: '칼국수', disabled: true }`). 컨트롤 전체는 `disabled` prop으로 잠근다.

마크업을 직접 짜야 하면(아이콘 칸·커스텀 라벨) `useSegmentedControl` 훅을 쓴다 — `registerSegment(index)`를 각 `<label className="segment">`의 ref로, `thumbRef`를 `<span className="segment-thumb" aria-hidden="true" />`에 단다. `assets/SegmentedControl.tsx`가 그 예시다.

## 사용 방법 — 순수 JS (React 없음)

```html
<div class="segmented" role="radiogroup" aria-label="주문 방식">
  <label class="segment">
    <input type="radio" class="segment-input" name="order" value="dine-in" checked />
    <span class="segment-label">매장</span>
  </label>
  <label class="segment">
    <input type="radio" class="segment-input" name="order" value="takeout" />
    <span class="segment-label">포장</span>
  </label>
  <span class="segment-thumb" aria-hidden="true"></span>
</div>
```

```js
import { moveSegmentThumb } from './moveSegmentThumb.js'

const group = document.querySelector('.segmented')
const thumb = group.querySelector('.segment-thumb')
const inputs = [...group.querySelectorAll('.segment-input')]

const checked = inputs.find((input) => input.checked)
moveSegmentThumb({ thumb, target: checked.parentElement, immediate: true }) // 첫 배치는 슬라이드 없이
inputs.forEach((input) => {
  input.addEventListener('change', () => moveSegmentThumb({ thumb, target: input.parentElement }))
})
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 한 칸만 고를 수 없다(품절·권한 없음) | 그 칸의 라디오만 `disabled`가 된다. 글자가 `opacity: 0.4`로 흐려지고 방향키가 그 칸을 건너뛴다. 왜 잠겼는지는 컨트롤 아래 한 줄로 적는다 | `assets` / 이유 문구는 프로젝트 |
| 컨트롤 전체를 잠근다 | 모든 라디오가 `disabled`가 되고 컨트롤이 `opacity: 0.5`로 흐려진다. 알약은 고른 칸에 그대로 남아 지금 값을 보인다 | `assets` |
| 고른 값이 옵션에 없다(옵션이 서버에서 바뀜) | 어떤 라디오도 선택되지 않고 알약을 거둔다(`width: 0`). 다시 값이 맞으면 미끄러지지 않고 바로 놓인다. 이 상태는 비활성처럼 읽히므로 옵션이 바뀌면 값도 첫 칸으로 맞춘다 | `assets`(React) / 값 맞추기는 프로젝트 |
| 라벨이 칸보다 길다 | 컨트롤은 부모 폭을 넘지 않는다(`max-width: 100%`). 칸이 균등하게 줄고 넘치는 글자는 줄임표가 된다. 칸의 좌우 여백 12px 중 8px까지는 글자가 먼저 쓴다. 320px 화면(좌우 여백 16px)의 3칸이면 14px 한글 6자까지 온전히 들어간다. 줄임표가 보이면 라벨을 줄이거나 `patterns/select`로 바꾼다 | `assets` / 라벨 길이는 프로젝트 |
| 글자 크기를 키우거나 글꼴이 늦게 실린다 | 칸 폭이 바뀌면 알약을 전이 없이 다시 맞춘다(React 훅의 ResizeObserver). 순수 JS는 `resize`와 `document.fonts.ready`에서 `immediate: true`로 다시 부른다 | `assets`(React) / 순수 JS는 프로젝트 |
| 감춘 채 마운트한다(닫힌 시트·다른 탭 안) | 폭을 0으로 재어 알약이 보이지 않다가, 보이는 순간 칸 크기가 생기며 전이 없이 놓인다 | `assets`(React) |
| 고대비(`forced-colors`) | 트랙과 알약의 배경이 같은 바탕색이 된다. 트랙에 1px 테두리를 긋고 알약을 `Highlight`, 고른 글자를 `HighlightText`로 칠한다 | `assets` |
| 같은 화면에 세그먼트가 둘 이상 있다 | `name`이 같으면 브라우저가 한 그룹으로 묶어 한쪽을 고르면 다른 쪽이 풀린다. 컨트롤마다 `name`을 다르게 준다. 목록의 행마다 두면 행 id를 붙인다 | 프로젝트 |
| 고르면 서버에 저장한다 | 알약은 바로 옮긴다. 실패하면 값을 되돌리고(알약이 미끄러져 돌아간다) 이유를 토스트로 알린다. 저장하는 동안 컨트롤을 잠그지 않는다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 속도 | `--segment-duration` (기본 200ms — 하루 여러 번 누르는 컨트롤이라 짧게, 300ms 안쪽) |
| thumb 색 | `--segment-thumb-bg` (기본 #fff — 다크 배경이면 밝은 회색이나 `var(--surface)`로) |
| 트랙 색 | `--segment-track-bg` (기본 반투명 회색 rgba(120,120,128,0.16)) |
| 모서리 | `--segment-radius` (기본 999px 알약 — 8px 정도면 각진 iOS 최신형) |
| 칸 높이 | `--segment-padding-block` (기본 8px — 칸 높이 약 34px. 손가락이 주 입력이면 12px로 높이 44px쯤을 채운다) |
| 글자색 | `--segment-color`(비선택)·`--segment-active-color`(선택)·`--segment-focus-color`(포커스 링) |
| 칸 폭 | 기본 균등(`grid-auto-columns: 1fr`). 내용 폭대로 두려면 `.segmented`에 `grid-auto-columns: auto`. 이때 thumb 폭은 즉시 바뀌고 위치만 미끄러져, 이동하는 동안(약 200ms) 옆 칸 글자에 겹칠 수 있다. 폭도 부드럽게 바꾸려면 `.segment-thumb`의 `transition`에 `width`를 더하고 그 줄에 `/* motion-audit-ignore: layout-animation */` 주석으로 이유를 적는다(레이아웃 전이라 검사가 error로 막는다) |

## 함께 쓰는 패턴

- `patterns/tab-indicator` — 옵션이 아래 콘텐츠 영역을 통째로 바꾸면 세그먼트가 아니라 탭이다. 탭은 `tablist` 역할이고 패널과 `aria-controls`로 이어진다.
- `patterns/select` — 옵션이 6개 이상이거나 라벨이 줄임표로 잘릴 때 바꾼다.
- `patterns/toast-stack` — 고른 값의 저장이 실패해 되돌릴 때 이유를 알린다.

## 주의사항

- **thumb와 칸은 같은 offsetParent 안에 있어야 한다** — `.segmented`의 `position: relative`가 그 좌표계다. 트랙 패딩(2px)은 `offsetLeft`에 이미 포함되므로 thumb의 `left`는 0으로 둔다.
- 라디오를 `display: none`으로 숨기면 안 된다 — 포커스·방향키를 받을 수 없게 된다. 제공된 클립 방식(시각만 숨김)을 유지한다.
- 첫 배치는 `immediate: true`로 — 없으면 페이지 진입 시 thumb가 0에서 미끄러져 오는 가짜 이동이 보인다(React 훅은 내장 처리). 코어는 `transition: none`을 건 뒤 `getBoundingClientRect()`로 스타일을 한 번 확정한다(`void el.offsetWidth`는 일부 압축기가 지운다). 확정하지 않으면 다음 프레임의 복원이 먼저 돌아, 선택값이 첫 칸이 아닌 컨트롤을 시트·탭 안에서 늦게 띄울 때 thumb가 미끄러져 들어온다.
- 칸 폭이 바뀌면 다시 재야 한다. React 훅은 고른 칸의 크기만 지켜본다. 칸 폭을 내용대로(`auto`) 바꾼 변형에서 앞 칸의 라벨만 바뀌면 고른 칸은 크기 그대로 자리만 밀리므로, 그때는 라벨을 바꾼 쪽에서 `moveSegmentThumb`을 `immediate: true`로 부른다. `immediate: true`는 thumb가 이미 그 자리면 아무것도 하지 않는다. ResizeObserver는 `observe()` 직후 한 번 콜백을 부르는데, 그때 transition을 끄면 방금 시작한 슬라이드가 취소되고 thumb가 건너뛰기 때문이다.
- 늘 한 칸이 골라져 있게 기본값을 준다. 아무것도 고르지 않은 세그먼트는 thumb가 없어 회색 막대 하나로 보이고 비활성처럼 읽힌다. 흔한 기본값을 정할 수 없는 필수 선택(고용 형태처럼)은 세그먼트가 아니라 테두리 칩이나 라디오가 맞다.
- 선택 칸의 글자는 진하게 유지한다(`.segment-input:checked + .segment-label`) — thumb 색만으로는 저대비·색약 환경에서 어느 칸이 선택됐는지 약하다.
- **드래그로 thumb를 끌어 선택하는 동작은 범위 밖이다** — 클릭·탭·방향키만 지원한다. 드래그가 필요하면 포인터 이벤트로 가장 가까운 칸을 고르는 로직을 따로 얹어야 한다.
- 즉시 적용이 원칙이다 — 필터·설정에서는 세그먼트를 고른 뒤 "적용" 버튼을 또 요구하지 않는다. 작성 폼 안에서는 다른 칸과 함께 제출되는 값으로 써도 된다(네이티브 라디오 그룹이라 폼 제출에 그대로 실린다). 선택지마다 설명이 붙거나 라벨이 길면 일반 라디오(`checkbox-radio`)가 맞다.
- **reduced-motion 대응 내장** — 슬라이드를 끄고 즉시 점프로 위치 표시만 유지한다. 블록 제거 금지.
