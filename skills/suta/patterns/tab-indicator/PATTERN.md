---
name: tab-indicator
description: 탭을 바꿀 때 활성 탭 밑줄(tab indicator)이 옆으로 미끄러져 따라가는 애니메이션을 구현한다. "탭 밑줄 애니메이션, 탭 인디케이터, 슬라이딩 탭, 탭 누르면 밑줄이 옆으로 따라가는, 탭 바 밑줄" 요청과 상단 탭 바·카테고리 탭 UI에 쓴다. 기존 적용분의 속도·색·밑줄 두께 수정에도 쓴다.
---

# tab-indicator — 탭 인디케이터 슬라이드

라이브 데모: https://guksu.github.io/suta/#/tab-indicator

## 언제 쓰는가

탭·세그먼트 전환에서 활성 표시(밑줄)가 이전 탭에서 새 탭으로 미끄러져 이동할 때. 당근·토스·인스타그램의 상단 탭이 이 관례다 — 각 탭에 밑줄을 껐다 켜는 방식과 달리 "어디서 어디로 이동했는지"가 보인다.

**기술 선택:** 측정(JS 한 줄) + CSS transition. 인디케이터를 폭 1px로 두고 `translateX + scaleX`로 옮긴다 — `left`/`width`를 직접 애니메이션하면 매 프레임 레이아웃이 돌지만 transform은 GPU 합성만 쓴다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/moveTabIndicator.ts` | 코어 — `moveTabIndicator`(측정 → transform)·`revealTab`(넘친 줄에서 선택한 탭 보이기)·`nextTabIndex`(방향키 이동) | 모든 프로젝트 |
| `assets/tab-indicator.css` | 인디케이터·슬라이드·가로 스크롤 줄(`data-scroll`)·고대비 | 모든 프로젝트 |
| `assets/useTabIndicator.ts` | React 훅 (코어 사용, 크기 감시·늦게 오는 탭·줄 스크롤 포함) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { nextTabIndex } from './moveTabIndicator'
import { useTabIndicator } from './useTabIndicator'

const TABS = ['홈', '동네생활', '내 근처', '채팅']

const TabBar = () => {
  const [active, setActive] = useState(0)
  const { registerTab, indicatorRef, focusTab } = useTabIndicator({ activeIndex: active })

  return (
    <nav className="tab-bar" role="tablist">
      {TABS.map((label, index) => (
        <button
          key={label}
          ref={registerTab(index)}
          role="tab"
          aria-selected={index === active}
          tabIndex={index === active ? 0 : -1}
          onClick={() => setActive(index)}
          onKeyDown={(event) => {
            const next = nextTabIndex({ key: event.key, index, count: TABS.length })
            if (next === null) return
            event.preventDefault()
            setActive(next)
            focusTab(next)
          }}
        >
          {label}
        </button>
      ))}
      <span ref={indicatorRef} className="tab-indicator" aria-hidden="true" />
    </nav>
  )
}
```

탭이 많아 한 줄에 들어가지 않으면 `<nav className="tab-bar" data-scroll="true">`로 둔다. 줄이 옆으로 스크롤되고, 훅이 선택한 탭을 줄 가운데로 옮긴다.

## 사용 방법 — 순수 JS (React 없음)

```js
import { moveTabIndicator, revealTab } from './moveTabIndicator.js'

const bar = document.querySelector('.tab-bar')
const indicator = bar.querySelector('.tab-indicator')
const tabs = [...bar.querySelectorAll('[role=tab]')]
let active = tabs[0]

moveTabIndicator({ indicator, target: active, immediate: true }) // 첫 배치는 슬라이드 없이
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    active = tab
    moveTabIndicator({ indicator, target: tab })
    revealTab({ bar, target: tab }) // data-scroll 줄에서만 움직인다. 넘치지 않으면 아무것도 하지 않는다
  })
})

// 글꼴이 늦게 오거나 창 크기가 바뀌면 탭 폭이 달라진다 — 제자리로 다시 잰다
const remeasure = () => moveTabIndicator({ indicator, target: active, immediate: true })
document.fonts?.ready.then(remeasure)
window.addEventListener('resize', remeasure)
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 화면에 처음 그려진다(선택된 탭이 첫 탭이 아닐 수도 있다) | 밑줄이 왼쪽 끝에서 미끄러져 오지 않고 처음부터 제자리에 있다. 자리를 받기 전에는 `scaleX(0)`이라 보이지 않는다 | `assets` — 훅이 첫 배치를 `immediate`로 한다. 순수 JS는 첫 호출에 `immediate: true`를 준다 |
| 탭 목록을 서버에서 늦게 받는다 | 탭이 그려진 그때 밑줄이 슬라이드 없이 놓인다 | `assets` — React 훅. 순수 JS는 탭을 그린 뒤 `immediate: true`로 부른다 |
| 글꼴이 늦게 로드되거나, 창 크기·라벨 글자가 바뀐다 | 밑줄이 전이 없이 새 폭·자리로 맞는다. 앞 탭의 글자만 바뀌어 선택된 탭이 밀린 경우도 같다 | `assets` — React 훅이 탭 줄과 모든 탭을 ResizeObserver(요소 크기 변화를 알려 주는 브라우저 기능)로 본다. 순수 JS는 `프로젝트`(위 예시의 `remeasure`) |
| 탭을 누른 직후 크기 알림이 온다 | 진행 중인 슬라이드가 끊기지 않는다. `immediate: true`는 밑줄이 이미 그 자리면 아무것도 하지 않는다 | `assets` — `moveTabIndicator` |
| 탭이 많거나 라벨이 길어 한 줄에 들어가지 않는다 | 탭을 좁히거나 글자를 두 줄로 꺾지 않는다. 줄을 옆으로 스크롤하고, 선택한 탭을 줄 가운데로 옮긴다 | `assets` — `data-scroll="true"` + `revealTab`(훅은 내장) |
| 탭 줄이 숨겨진 채 그려진다(닫힌 시트·`display: none`) | 폭 0으로 재어 밑줄이 보이지 않다가, 줄이 보이는 순간 전이 없이 제자리에 놓인다 | `assets` — React 훅. 순수 JS는 보이게 한 뒤 `immediate: true`로 부른다 |
| 키보드만 쓴다 | 탭 줄은 Tab 한 번에 지나간다. 안에서는 좌우 방향키로 옆 탭, Home·End로 처음·끝 탭에 간다. 선택된 탭만 `tabIndex={0}`, 나머지는 `-1`이다 | `assets` — `nextTabIndex`·`focusTab`. 탭에 `tabIndex`와 `onKeyDown`을 다는 일은 `프로젝트`(위 예시) |
| `dir="rtl"`(오른쪽에서 왼쪽으로 쓰는 화면) | 밑줄은 그대로 선택된 탭 아래에 놓인다. 넘친 줄의 스크롤 좌표는 0에서 음수로 간다 | `assets` — `revealTab`. 방향키를 뒤집는 `nextTabIndex({ rtl: true })`는 `프로젝트`가 넘긴다 |
| 고대비 모드(`forced-colors: active`) | 배경색이 바탕색으로 강제돼 밑줄이 사라지므로 시스템 색 `Highlight`로 그린다 | `assets` — `tab-indicator.css` |
| 선택된 탭이 없다(`activeIndex`가 범위 밖) | 밑줄이 마지막 자리에 남는다. 숨기려면 인디케이터에 `opacity: 0`을 준다 | `프로젝트` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 색 | `--tab-indicator-color` (기본 currentColor — 활성 탭 글자색과 맞추기 쉽다) |
| 두께 | `--tab-indicator-height` (기본 2px) |
| 속도 | `--tab-indicator-duration` (기본 250ms — 인접 탭은 짧게, 멀리 이동해도 300ms 안쪽) |
| 넘치는 탭 줄 | `.tab-bar`에 `data-scroll="true"` — 가로 스크롤, 탭은 줄바꿈 없이 제 폭 |

## 함께 쓰는 패턴

- `patterns/sticky-header` — 탭 줄을 스크롤 중에도 위에 붙여 둘 때. 탭 줄을 고정 헤더 안이나 바로 아래에 `position: sticky`로 둔다. 밑줄 좌표는 탭 줄 안에서 재므로 고정 여부와 무관하다.
- `patterns/segmented-control` — 선택지가 2~4개이고 화면 안의 보기 방식(목록·지도)을 바꾸는 경우. 밑줄 탭이 아니라 알약 thumb가 맞다.
- `patterns/bottom-nav` — 최상위 화면을 오가는 메뉴. 밑줄 인디케이터를 쓰지 않는다.
- `patterns/skeleton` — 탭을 바꾼 뒤 내용을 불러오는 동안. 밑줄은 누른 즉시 옮기고 뼈대는 내용 자리에만 둔다.

## 주의사항

- **인디케이터와 탭은 같은 offsetParent 안에 있어야 한다** — `.tab-bar`의 `position: relative`가 그 좌표계다. 제거하면 위치가 틀어진다.
- 첫 배치의 `immediate`는 `transition: none`을 건 채로 배치를 한 번 읽어 스타일을 확정한다. 이 읽기(`getBoundingClientRect()`)를 지우면 페이지 진입 때 밑줄이 0에서 미끄러져 오는 가짜 이동이 보인다.
- 스크롤 줄(`data-scroll`)은 밖으로 나간 포커스 링을 자른다. CSS가 링을 탭 안쪽(`outline-offset: -2px`)에 그린다 — 프로젝트의 포커스 스타일이 `box-shadow` 링이면 안쪽 그림자(`inset`)로 바꾼다.
- 화면이 떠 있는 채로 `dir`만 바꾸면 탭 크기가 그대로라 다시 재지 않는다. 방향을 바꾼 뒤 `immediate: true`로 한 번 부른다(React는 탭 줄에 `key`를 준다).
- **reduced-motion 대응 내장** — 슬라이드를 끄고 즉시 점프로 위치 표시만 유지한다. 줄 스크롤도 바로 옮긴다. 블록 제거 금지.
- scaleX 방식은 인디케이터에 둥근 모서리·그라데이션을 주면 늘어나 보인다 — 그런 장식이 필요하면 이 패턴 범위 밖(FLIP 계열)이다.
