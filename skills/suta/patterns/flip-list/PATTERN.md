---
name: flip-list
description: 리스트 정렬·필터·추가·삭제로 순서를 바꿀 때 항목들이 순간이동하지 않고 미끄러져 자리를 잡는 FLIP 재배치 애니메이션(list reorder animation)을 구현한다. "목록 정렬 바꿀 때 항목 이동 애니메이션, 순서 바뀔 때 부드럽게, 필터 전환 효과, 리스트 재정렬 애니메이션" 요청과 정렬·필터 토글이 있는 목록·카드 그리드에 쓴다. 기존 적용분의 속도·이징 수정에도 쓴다.
---

# flip-list — 리스트 재배치 (FLIP)

라이브 데모: https://guksu.github.io/suta/#/flip-list

## 언제 쓰는가

정렬 버튼·필터·항목 추가/삭제로 리스트 순서가 바뀔 때. 재배치가 순간이동이면 사용자는 "어떤 항목이 어디로 갔는지"를 놓친다 — FLIP은 각 항목이 이전 자리에서 새 자리로 미끄러지게 해 이동을 추적 가능하게 만든다.

**기술 선택:** FLIP(First-Last-Invert-Play) 기법. 재배치 전 위치를 기억했다가, DOM이 바뀐 뒤 각 항목을 transform으로 이전 자리에 되돌려 놓고 제자리로 전환한다. top/left 애니메이션(레이아웃)이 아니라 transform(GPU)만 쓴다. 라이브러리 불필요.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/captureFlip.ts` | 코어 — 캡처·되감기·재생 | 모든 프로젝트 |
| `assets/useFlipList.ts` | React 훅 (매 렌더 자동 캡처·재생) | React 프로젝트만 |

CSS 파일은 없다 — transform은 코어가 인라인으로 걸고 끝나면 정리한다. TS가 아닌 프로젝트는 타입을 벗겨 .js로 저장한다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { useFlipList } from './useFlipList'

const Menu = () => {
  const [items, setItems] = useState(['칼국수', '수제비', '냉모밀', '만두'])
  const { containerRef } = useFlipList<HTMLUListElement>()

  return (
    <>
      <button type="button" onClick={() => setItems((prev) => [...prev].reverse())}>
        순서 뒤집기
      </button>
      <ul ref={containerRef}>
        {items.map((item) => (
          <li key={item} data-flip-id={item}>
            {item}
          </li>
        ))}
      </ul>
    </>
  )
}
```

`data-flip-id`는 재배치 전후의 같은 항목을 잇는 열쇠다 — React의 key와 같은 값을 쓰면 된다.

## 사용 방법 — 순수 JS (React 없음)

DOM을 바꾸기 **직전에** 캡처하고, 바꾼 **직후에** 재생한다:

```js
import { captureFlip } from './captureFlip.js'

const list = document.querySelector('ul')
const flip = captureFlip({ container: list })
list.prepend(list.lastElementChild) // 재배치
flip.play({ durationMs: 300 })
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 이동이 끝나기 전에 정렬을 또 누른다(연타) | 항목이 지금 보이는 자리에서 새 자리로 이어서 움직인다. 처음 자리로 튀었다가 다시 출발하지 않는다 | `assets` — `captureFlip`이 진행 중인 transform을 읽어 더한다 |
| 이동 중에 정렬과 무관한 재렌더가 온다(React) | 배치가 그대로면 진행 중인 이동을 건드리지 않는다 | `assets` — `captureFlip` |
| 캡처와 재생 사이에 페이지나 목록이 스크롤된다 | 스크롤한 만큼을 이동으로 세지 않는다. 자리는 화면이 아니라 컨테이너 기준으로 잰다(`scrollTop`·`scrollLeft` 포함) | `assets` — `captureFlip` |
| 탭이 가려져 있거나 목록이 `display: none`이다 | `transitionend`가 오지 않아도 재생 시간 + 100ms 뒤에 인라인 `transition`을 걷는다. 남으면 항목의 hover 전이를 계속 덮는다 | `assets` — `captureFlip` |
| 항목 안의 버튼·링크에 자체 transition이 있다 | 안쪽의 `transitionend`로는 이동이 끝난 것으로 치지 않는다 | `assets` — `captureFlip` |
| 항목이 0개·1개다 | 아무것도 하지 않는다. 움직인 항목이 없으면 스타일을 쓰지 않는다 | `assets` — `captureFlip` |
| 항목이 수백 개다 | React 훅은 렌더마다 모든 항목의 자리를 잰다. 정렬·필터를 누르는 그 시점에만 `captureFlip`을 직접 부른다(순수 JS 방식). | `프로젝트` |
| 항목이 새로 생기거나 사라진다 | 남은 항목만 빈자리로 미끄러진다. 새 항목은 이동 없이 나타나고, 사라지는 항목은 바로 없어진다 | `프로젝트` — `patterns/enter-exit` |
| 정렬 결과를 화면을 보지 않는 사용자에게 알린다 | 이동은 눈에만 보인다. 목록 밖에 `aria-live="polite"` 한 줄("가격 낮은 순으로 정렬했어요")을 둔다 | `프로젝트` |
| 동작 줄이기(`prefers-reduced-motion: reduce`) | 이동을 재생하지 않는다. 새 순서가 바로 보인다 | `assets` — `captureFlip` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 속도·이징 | `play({ durationMs, easing })` — 기본 300ms, ease-out 커스텀 커브 |
| 애니메이션 대상 | `data-flip-id`가 있는 직계 자식만 — 없는 항목은 제외된다 |

## 함께 쓰는 패턴

- `patterns/enter-exit` — 항목이 추가·삭제될 때 그 항목의 등장·퇴장. 두 패턴의 파일을 함께 복사한다. 퇴장이 끝나 항목이 DOM에서 빠지는 순간에 남은 항목이 미끄러진다.
- `patterns/drag-to-reorder` — 사용자가 항목을 직접 끌어 순서를 바꾸는 목록. 이 패턴은 버튼으로 바뀐 순서를 보여 줄 뿐 끌기를 다루지 않는다.
- `patterns/virtual-list` — 수천 개 목록. 화면 밖 항목은 DOM에 없어 자리를 이을 수 없으므로 이동 애니메이션을 쓰지 않는다.

## 주의사항

- **항목의 크기가 함께 변하는 경우(확장 카드 등)는 범위 밖이다** — 이 코어는 위치 이동만 재생한다. 요소가 커지는 전환은 `patterns/zoom-lightbox`·`patterns/card-expand`가 맡는다.
- 재생하는 동안 항목의 인라인 `transform`·`transition`을 쓴다. 항목 자체에 CSS `transform`(hover 확대 등)이 있으면 그동안 덮인다. 그런 장식은 항목 안쪽 요소에 준다.
- 자리는 `data-flip-id`가 있는 직계 자식끼리만 잇는다. 같은 id가 두 번 나오면 뒤의 것이 앞의 자리를 덮어쓴다.
- 창 크기가 바뀌어 줄바꿈이 달라진 뒤의 첫 재렌더는 그 차이를 이동으로 재생한다(React 훅은 렌더 때만 자리를 잰다).
