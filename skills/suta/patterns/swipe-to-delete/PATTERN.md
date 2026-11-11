---
name: swipe-to-delete
description: 리스트 항목을 옆으로 밀어 삭제하는 제스처(swipe to delete)를 구현한다 — 왼쪽으로 밀면 삭제 버튼이 드러나고, 끝까지 밀면 바로 삭제되며 행이 접혀 사라진다. 보관·나중에 같은 여러 액션 버튼도 나란히 둘 수 있다. "밀어서 삭제, 스와이프 삭제, 알림 지우기, 항목 밀면 삭제 버튼, 메일처럼 밀어서 지우기" 요청에 쓴다. 기존 적용분의 임계값·버튼 폭·속도·액션 추가에도 쓴다.
---

# swipe-to-delete — 밀어서 삭제

라이브 데모: https://guksu.github.io/suta/#/swipe-to-delete

## 언제 쓰는가

장바구니 항목, 알림, 최근 검색어처럼 **자주 지우는 목록**. 항목마다 삭제 버튼을 그리면 목록이 어지럽고 실수로 누르기 쉽다 — 스와이프는 버튼을 숨겼다가 의도가 분명할 때만 꺼낸다. 메일·메시지 앱의 관례라 설명 없이 통한다. 다만 **발견 가능성이 낮은 제스처**이므로 첫 사용자에게는 힌트(첫 항목 살짝 열어 보이기 등)가 필요하고, 키보드·스크린 리더 사용자를 위해 삭제 버튼이 DOM에 항상 존재한다.

**기술 선택:** 포인터 이벤트 코어(`createSwipeDelete.ts`, 의존성 0) + CSS transition. 드래그 중에만 인라인 transform으로 손가락을 따르고, 놓는 순간의 거리·속도로 **열림/닫힘/끝까지 밀어 삭제** 셋 중 하나를 판정한 뒤 정착 이동은 CSS에 맡긴다. 세로 스크롤과의 충돌은 처음 6px의 방향으로 축을 잠가 푼다(`touch-action: pan-y`와 한 쌍). 삭제 후 행이 접히는 것은 높이를 측정해 인라인으로 고정한 뒤 0으로 전이한다 — `auto→0`은 전이되지 않기 때문이다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createSwipeDelete.ts` | 제스처 판정 코어 (축 잠금·스냅·튕김·끝까지 밀기) | 모든 프로젝트 |
| `assets/swipe-to-delete.css` | 액션 영역·정착 이동·접힘 정의 | 모든 프로젝트 |
| `assets/SwipeToDelete.tsx` | React 래퍼 (접힘 2단계·키보드 포커스 열림·여러 액션) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { SwipeToDelete } from './SwipeToDelete'

const Cart = () => {
  const [items, setItems] = useState(['멸치국수', '비빔국수', '들깨칼국수'])

  return (
    <ul>
      {items.map((name) => (
        <li key={name}>
          <SwipeToDelete onDelete={() => setItems((prev) => prev.filter((item) => item !== name))}>
            <div className="cart-row">{name}</div>
          </SwipeToDelete>
        </li>
      ))}
    </ul>
  )
}
```

- `onDelete`는 **접힘 애니메이션이 끝난 뒤** 불린다 — 여기서 상태를 지우면 언마운트가 모션 뒤에 온다.
- `key`는 항목의 고유값이어야 한다 — 인덱스를 쓰면 삭제 후 다음 항목이 "삭제 중" 상태를 물려받는다.
- 되돌리기가 필요하면 `onDelete`에서 즉시 지우지 말고 토스트(`toast-stack` 패턴)로 "실행 취소"를 띄운 뒤 지운다.

### 여러 액션 — iOS 메일의 "보관 / 플래그 / 삭제"

```tsx
<SwipeToDelete
  actionWidth={80}
  actions={[
    { label: '보관', onClick: () => archive(order) },
    { label: '나중에', onClick: () => markLater(order), tone: 'accent' },
    { label: '삭제', onClick: () => remove(order), tone: 'danger' },
  ]}
>
  <div className="order-row">{order.title}</div>
</SwipeToDelete>
```

- 액션은 왼쪽부터 순서대로 놓이고 열림 폭은 `actionWidth × 액션 수`다(위 예시 240px). 코어에는 이 값만 "열림 정착 거리"로 넘어간다 — 코어는 액션 개수를 모른다.
- **마지막(가장 오른쪽) 액션이 기본 액션이다.** 끝까지 밀거나 그 버튼을 누르면 행이 빠지고 접힌 뒤 `onClick`이 불린다(그리고 `onDelete`도 있으면 같은 시점에). 나머지 액션은 즉시 `onClick`을 부르고 행을 닫는다.
- 따라서 마지막 액션은 행을 목록에서 제거하는 동작(삭제·보관·완료)이어야 한다 — 플래그처럼 행이 남는 동작을 마지막에 두면 접힌 행이 사라지지 않는다.
- `actions`를 쓰면 `onDelete`는 생략할 수 있다. `actions`가 없으면 `actionLabel` 하나짜리 삭제 버튼(기존 동작)이다.
- `tone`은 `'default'`(회색) · `'accent'`(강조색, 기본 거의 검정) · `'danger'`(빨강). 끝까지 밀리면 마지막 버튼이 늘어나 앞의 버튼들을 덮는다(`flex-grow` 전이).

## 사용 방법 — 순수 JS (React 없음)

```html
<div class="swipe-item" data-open="false">
  <div class="swipe-content">
    멸치국수
    <div class="swipe-actions"><button type="button" class="swipe-action">삭제</button></div>
  </div>
</div>
```

```js
import { createSwipeDelete } from './createSwipeDelete.js'

const item = document.querySelector('.swipe-item')
const swipe = createSwipeDelete({
  content: item.querySelector('.swipe-content'),
  onOpenChange: (open) => (item.dataset.open = String(open)),
  onSwipeOut: () => {
    item.dataset.state = 'deleting' // CSS가 grid-template-rows 1fr→0fr로 접는다
    item.addEventListener('transitionend', (e) => e.propertyName === 'grid-template-rows' && item.remove())
  },
})
item.querySelector('.swipe-action').addEventListener('click', swipe.swipeOut)
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 미는 중에 브라우저가 포인터를 가져간다 | `pointercancel`(세로 스크롤 시작·시스템 제스처·전화 수신)은 손을 뗀 것이 아니다. 거리·속도가 삭제 임계를 넘었어도 지우지 않고 끌기 전 자리(열림 또는 닫힘)로 돌린다. 두 번째 손가락의 움직임은 무시한다 | `assets` |
| 행 전체가 상세로 가는 링크·버튼이다 | 가로로 끈 뒤에 따라오는 `click`을 한 번 막는다. 마우스로 밀어도 상세로 넘어가지 않는다 | `assets` |
| 열린 행의 내용을 누른다 | 행이 닫히고 그 누름은 내용에 닿지 않는다. 액션 버튼을 누른 경우는 닫지 않는다 | `assets` |
| 다른 행을 민다 | 먼저 열린 행은 그대로 열려 있다. 한 번에 한 행만 열려면 부모가 `onOpenChange`로 열린 행을 기억하고 나머지를 `close()`한다(코어 반환값) | 프로젝트 |
| 키보드·화면 낭독기만 쓴다 | 액션 버튼은 늘 DOM에 있고 Tab으로 닿는다. 포커스가 오면 행이 열려 버튼이 보이고, 포커스가 떠나면 닫힌다. 행마다 액션 수만큼 Tab이 멈추므로 수십 행이 넘는 목록은 행 메뉴(`⋯`) 하나로 묶는다 | `assets`(React) / 묶기는 프로젝트 |
| 삭제한 뒤 포커스 | 지운 버튼과 함께 포커스가 사라진다. `onDelete`에서 다음 행(없으면 앞 행, 목록이 비면 목록 제목)으로 포커스를 옮긴다 | 프로젝트 |
| 서버 삭제가 실패한다 | `onDelete`는 행이 접힌 뒤에 불리므로 실패하면 행을 목록에 다시 넣는다. 다시 넣은 행은 `key`가 같아도 새로 마운트되어 닫힌 상태로 나온다. 실패는 토스트 한 줄로 알린다 | 프로젝트 |
| 마지막 한 행을 지운다 | 목록이 비면 빈 상태 안내로 바꾼다. 접힘이 끝난 뒤(`onDelete`)에 바꿔야 행이 접히는 도중에 화면이 튀지 않는다 | 프로젝트 |
| 동작 줄이기를 켰다 | 손가락 추적은 그대로 두고 정착·접힘 전이를 끈다. 전이가 없으면 `transitionend`를 기다리지 않고 `onDelete`를 바로 부른다 | `assets` |
| 접히는 중에 화면이 바뀐다 | 접힘 전이가 끊겨도 600ms 폴백 타이머가 `onDelete`를 한 번 부른다. 삭제는 취소되지 않는다 | `assets`(React) |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 액션 폭 | `actionWidth` prop (버튼 하나 88px — CSS 변수 `--swipe-action-width`와 함께 바뀐다). 열림 폭은 `actionWidth × 액션 수` |
| 여러 액션 | `actions` prop — `{ label, onClick, tone? }[]`, 왼쪽부터 순서대로. 마지막이 끝까지 밀기 액션 |
| 끝까지 밀기 임계 | `swipeOutThresholdPx` prop (기본: 단일 액션은 폭×2.5, 여러 액션은 열림 폭 + 폭×0.75) · 코어 `swipeOutVelocity`(0.8px/ms) |
| 속도 | `--swipe-duration` (260ms — 정착·접힘·마지막 버튼 늘어남 공통) |
| 색 | tone별 `--swipe-action-bg`(danger, 색 토큰 `--color-danger`, 없으면 #c8341f) · `--swipe-action-accent-bg`(#1c1c1c) · `--swipe-action-default-bg`(색 토큰 `--color-text-tertiary`, 없으면 #686868), `--swipe-bg`(내용 배경 — 반드시 불투명해야 액션이 가려진다) |
| 액션 문구 | 단일이면 `actionLabel` prop, 여러 개면 각 `actions[].label` |

## 함께 쓰는 패턴

- `patterns/toast-stack` — 삭제 뒤 "실행 취소"를 띄운다. 되돌릴 수 있으면 확인창을 묻지 않아도 된다.
- `patterns/modal-dialog` — 되돌릴 수 없는 삭제의 확인. 끝까지 밀기를 끄고(`swipeOutThresholdPx={Infinity}`) 버튼을 눌렀을 때만 확인창을 연다.
- `patterns/dropdown-menu` — 데스크톱과 긴 목록에서 같은 액션을 행의 `⋯` 메뉴로도 낸다.
- `patterns/drag-to-reorder` — 한 목록에 함께 쓰면 순서 바꾸기는 손잡이에서만 시작하게 둔다. 손잡이는 `touch-action: none`이라 밀기와 다투지 않는다.

## 주의사항

- **액션 영역은 `.swipe-content` 안, 오른쪽 바깥(`left: 100%`)에 붙어 내용과 함께 움직인다** — 행 아래에 색을 깔지 않는 이유는 행 높이가 소수 px일 때 경계 틈으로 색이 비치기 때문이다. 액션을 밖으로 빼지 말 것.
- 액션 버튼의 `tabIndex`를 건드리지 않는다. 포커스로 행이 열리는 경로가 키보드 사용자의 삭제 수단이다.
- 방향은 왼쪽으로 밀기 하나다. `dir="rtl"` 화면에서도 액션은 오른쪽에 있고 왼쪽으로 민다(뒤집지 않는다). 오른쪽에서 왼쪽으로 읽는 언어를 지원한다면 방향을 뒤집은 코어가 따로 필요하다.
- 액션 문구는 버튼 폭(88px)에 한 줄로 들어가는 2~4자로 쓴다. 긴 문구는 두 줄로 꺾인다.
- 복구 불가능한 삭제(주문 취소 등)에는 끝까지 밀어 삭제를 끄고 버튼 확인만 남긴다 — React는 `swipeOutThresholdPx={Infinity}`, 코어는 `swipeOutThresholdPx: Infinity, swipeOutVelocity: Infinity`.
- 여러 액션은 3개까지만 — 폭 88px 기준 열림 폭이 264px이라 좁은 화면에서는 내용이 거의 다 가려진다. 4개 이상이면 `actionWidth`를 줄이거나 "더보기" 시트로 묶는다.
- 앱 전역 `button:hover` 등이 배경을 덮으면 tone 색이 사라진다 — 패턴 CSS는 배경을 `--_bg` 변수에 모아 두므로 `.swipe-action:hover { background: var(--_bg) }`로 되돌린다.
- 마우스로도 동작하지만 데스크톱에서는 발견되기 어렵다 — 데스크톱은 호버 시 삭제 버튼을 노출하는 등 다른 경로를 함께 둔다.
- 순수 JS에서는 포커스로 열기(`focus` → `open()`, `blur` → `close()`)와 접힘 뒤 제거를 직접 잇는다. React 래퍼가 하는 일이다.
- **reduced-motion 대응 내장** — 손가락 추적은 유지하고(조작이지 장식 모션이 아니다) 정착·접힘 전이만 즉시로 바꾼다. 블록 제거 금지.
