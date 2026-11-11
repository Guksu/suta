---
name: page-transition
description: 화면(라우트) 전환 애니메이션(page transition)을 구현한다 — 다음 화면이 오른쪽에서 밀려 들어오고 뒤로 가면 반대로 재생되며, 돌아오면 스크롤 위치가 복원된다. "페이지 넘어갈 때 애니메이션, 화면 전환 효과, 라우트 이동 애니메이션, 앱처럼 밀리는 화면, 뒤로가기 애니메이션" 요청과 SPA 라우팅 화면 이동에 쓴다. 기존 적용분의 화면 전환 속도(빠르게·느리게)·방향 수정에도 쓴다.
---

# page-transition — 화면 전환

라이브 데모: https://guksu.github.io/suta/#/page-transition

## 언제 쓰는가

목록 → 상세, 설정 → 하위 설정처럼 **깊이가 있는 화면 이동**에. 웹에서 화면이 툭 갈아 끼워지는 것과 앱처럼 밀려 들어오는 것의 차이는 취향이 아니라 정보다 — 방향이 "들어왔다/나왔다"를 알려 주기 때문에, 뒤로 가기를 눌렀는지 새 화면으로 갔는지가 눈으로 구분된다.

같은 층위의 이동(탭 사이 전환)에는 쓰지 않는다. 그건 깊이가 아니라 나란한 이동이라 밑줄이 미끄러지는 편이 맞다(tab-indicator 패턴).

**기술 선택:** View Transitions API(`document.startViewTransition`). 브라우저가 화면을 바꾸기 직전의 모습을 사진으로 찍고, 바뀐 뒤 새 화면과 교차 애니메이션을 대신 해 준다 — 두 화면을 동시에 띄우려고 이전 화면을 복제해 두는 재주가 필요 없다. 지원하지 않는 브라우저에서는 전환 없이 즉시 바뀐다(기능은 그대로).

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/runPageTransition.ts` | 코어 — 방향 표시 + View Transitions 호출 + 폴백 | 모든 프로젝트 |
| `assets/usePageStack.ts` | React 훅 — 화면 스택·스크롤 기억·포커스 이동·브라우저 뒤로 가기 연동 (라우터 없이 쓸 때) | React 프로젝트만 |
| `assets/page-transition.css` | 방향별 밀림 애니메이션 | 모든 프로젝트 |

## 전환 범위가 핵심이다

이 패턴은 **페이지 전체가 아니라 지정한 영역만** 전환한다. `page-transition.css`의 첫 두 규칙이 그 일을 한다:

```css
:root { view-transition-name: none; }   /* 페이지 전체는 전환 대상에서 뺀다 */
[data-page-view] { view-transition-name: page; }  /* 이 영역만 전환한다 */
```

그래서 상단 헤더·하단 탭바는 제자리를 지키고 그 안쪽 내용만 갈아 끼워진다 — 앱에서 탭바가 화면을 따라 움직이지 않는 이유가 이것이다. 페이지 전체를 전환하고 싶으면 첫 규칙을 지우고 `[data-page-view]`의 이름을 `root`로 바꾼다.

`view-transition-name`은 문서 안에서 **유일해야 한다** — `data-page-view`가 붙은 요소는 화면에 하나뿐이어야 한다.

## 사용 방법 — React (라우터 없이)

```tsx
import { usePageStack } from './usePageStack'

const App = () => {
  const stack = usePageStack<{ name: 'list' } | { name: 'detail'; id: string }>({ initial: { name: 'list' } })

  return (
    <div className="app">
      <header className="app-header">
        {stack.canGoBack && <button type="button" onClick={stack.back}>← 뒤로</button>}
        성수동 손칼국수
      </header>

      {/* 전환되는 영역 — 헤더는 이 바깥이라 자리를 지킨다 */}
      <main data-page-view>
        {stack.current.name === 'list' ? (
          <MenuList onSelect={(id) => stack.push({ name: 'detail', id })} />
        ) : (
          <MenuDetail id={stack.current.id} />
        )}
      </main>
    </div>
  )
}
```

`push`는 들어가는 전환(오른쪽에서 덮음), `back`은 나오는 전환(반대 방향)이다. **스크롤도 함께 처리된다** — 들어갈 때 목록의 위치를 기억해 두고, 돌아오면 그 자리로 되돌린다.

목록이 창 전체가 아니라 특정 상자 안에서 스크롤된다면 그 상자를 알려준다:

```tsx
const boxRef = useRef<HTMLDivElement>(null)
const stack = usePageStack({ initial: { name: 'list' }, scrollRef: boxRef })
```

브라우저의 뒤로 가기 버튼과 가장자리 쓸기도 화면 스택을 따라가게 하려면 `syncHistory`를 켠다. 들어갈 때마다 history에 항목을 하나 쌓고, `back()`은 `history.back()`을 부른다. 주소는 바뀌지 않는다.

```tsx
const stack = usePageStack({ initial: { name: 'list' }, syncHistory: true })
```

## 사용 방법 — 라우터가 이미 있을 때

`usePageStack` 대신 코어만 쓴다. 라우터의 이동 함수를 감싸고, 방향은 히스토리 깊이로 판단한다.

```tsx
import { flushSync } from 'react-dom'
import { runPageTransition } from './runPageTransition'

const navigate = useNavigate() // react-router 등

const go = (to: string, direction: 'forward' | 'back' = 'forward') =>
  runPageTransition({
    direction,
    // 이 안에서 DOM이 동기적으로 바뀌어야 한다 — 그래서 flushSync다
    update: () => flushSync(() => navigate(to)),
  })
```

브라우저 뒤로 가기 버튼까지 방향을 맞추려면 히스토리 상태에 순번을 심고 비교한다:

```js
// 이동할 때: navigate(to, { state: { index: currentIndex + 1 } })
window.addEventListener('popstate', (event) => {
  const next = event.state?.index ?? 0
  runPageTransition({ direction: next < currentIndex ? 'back' : 'forward', update: applyRoute })
  currentIndex = next
})
```

> **Next.js App Router**는 `useRouter().push()`가 비동기라 `flushSync`로 감쌀 수 없다. 이 경우 라우트가 바뀐 뒤 실행되는 전환(`next-view-transitions` 같은 어댑터)이 필요하며, CSS 부분(`page-transition.css`)은 그대로 쓸 수 있다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 목록 항목을 연달아 두 번 누른다(더블 탭·Enter 연타) | 화면은 한 장만 쌓인다. 전환이 끝날 때까지 `push`·`back`을 받지 않는다 | `assets` — `usePageStack`. 코어만 쓰면 `프로젝트`가 막는다 |
| 전환 중에 다른 전환이 시작된다(뒤로 가기 연타, 코어 직접 호출) | 브라우저가 앞선 전환을 건너뛴다. 늦게 끝난 앞선 전환이 새 전환의 `data-nav-direction`을 지우지 않는다 | `assets` — `runPageTransition` |
| 들어가면 누른 항목이 화면에서 사라진다 | 포커스가 `body`로 떨어지지 않고 `[data-page-view]`(`tabindex="-1"`)로 간다. 스크린 리더는 새 화면의 처음부터 읽는다 | `assets` — `usePageStack`. 코어만 쓰면 `프로젝트` |
| 뒤로 돌아온다 | 스크롤은 보던 자리로, 포커스는 들어갈 때 눌렀던 항목으로 돌아간다. 항목은 `id`가 있으면 `id`로, 없으면 영역 안의 순서로 다시 찾는다 | `assets` — `usePageStack`. 돌아온 사이 목록이 바뀌어 순서가 달라졌다면 항목에 `id`를 준다 |
| 브라우저 뒤로 가기·앞으로 가기를 누른다 | `syncHistory: true`면 한 화면씩 나오고 다시 들어간다. 기본(false)은 페이지를 통째로 떠난다 | `assets` — `usePageStack` |
| iOS에서 가장자리를 쓸어 돌아온다 | 브라우저가 넘기는 장면을 이미 보여 줬으므로 전환을 한 번 더 재생하지 않는다(`popstate`의 `hasUAVisualTransition`) | `assets` — `usePageStack`(`syncHistory`) |
| 새 화면의 데이터가 아직 오지 않았다 | 전환은 바로 시작하고 새 화면은 뼈대로 그린다. 데이터를 기다렸다가 전환하면 누른 뒤 아무 일도 없는 시간이 생긴다 | `프로젝트` — `patterns/skeleton` |
| 탭이 가려져 있다 | 브라우저가 전환을 건너뛴다. 화면·스크롤·포커스는 그대로 바뀐다 | `assets` — 브라우저 규칙 |
| `<html dir="rtl">` | 방향이 뒤집힌다. 새 화면이 왼쪽에서 들어오고 돌아갈 때 왼쪽으로 나간다 | `assets` — `page-transition.css` |
| 동작 줄이기(`prefers-reduced-motion: reduce`) | 좌우 밀림 대신 120ms 겹침으로 바뀐다. 전환을 아예 없애면 같은 화면인지 다른 화면인지 알기 어렵다 | `assets` — `page-transition.css` |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 전환 속도 | `--page-transition-duration` (`:root`에 선언) | 280ms |
| 뒤로 물러나는 거리 | `--page-transition-shift` (`:root`에 선언) | 30% (100%로 두면 두 화면이 나란히 밀린다) |
| 밀림 대신 다른 연출 | `@keyframes page-in-from-right` 등 4개를 갈아 끼운다 | 좌우 밀림 |
| 전환 범위 | `[data-page-view]`를 어디에 붙이느냐 | 헤더·탭바 제외한 본문 |

```css
/* 변수는 :root에 선언한다 — 전환되는 요소에 걸면 적용되지 않는다 */
:root {
  --page-transition-duration: 220ms;
}
```

## 함께 쓰는 패턴

- `patterns/edge-swipe-back` — 화면 왼쪽 가장자리를 쓸어 돌아가는 제스처. 쓸기가 끝나 화면을 바꿀 때는 전환을 다시 재생하지 않고 `update`만 부른다.
- `patterns/skeleton` — 새 화면의 데이터를 기다리는 자리. 전환은 누른 즉시 시작한다.
- `patterns/tab-indicator`·`patterns/bottom-nav` — 같은 층위의 화면 사이 이동. 이 패턴의 밀림을 쓰지 않는다.
- `patterns/card-expand` — 누른 카드 자체가 커져 상세가 되는 전환. 한 화면 이동에 두 전환을 겹치지 않는다.

## 주의사항

- **커스터마이즈 변수는 `:root`에 선언해야 한다.** `::view-transition-old/new` 가상 요소는 전환되는 요소가 아니라 문서 루트에 붙는다 — 컨테이너나 `[data-page-view]`에 변수를 선언하면 조용히 무시되고 기본값이 쓰인다.
- **`update`는 동기적으로 DOM을 바꿔야 한다.** React라면 `flushSync`가 필수다. 그냥 `setState`하면 브라우저가 사진을 찍고 콜백이 끝난 뒤에야 화면이 바뀌어, 전환이 "안 바뀐 화면 → 안 바뀐 화면"이 된다.
- **미지원 브라우저에서는 전환이 없다.** 화면은 정상적으로 바뀐다 — 기능이 아니라 연출만 빠진다. 폴백 애니메이션을 따로 만들지 않은 것은 의도다(두 벌의 전환 코드는 반드시 어긋난다).
- **스크롤 복원은 DOM을 바꾸는 그 순간에 한다.** 전환이 끝난 뒤 되돌리면 애니메이션이 끝나고 화면이 한 번 튄다. `usePageStack`이 그 순서를 지킨다.
- **`usePageStack`은 라우터가 아니다.** URL을 바꾸지 않으므로 새로고침하면 첫 화면으로 돌아가고, 특정 화면을 링크로 공유할 수 없다. `syncHistory`로 쌓은 항목도 새로고침 뒤에는 화면을 되살리지 못해, 그만큼 뒤로 가기를 더 눌러야 페이지를 떠난다. 화면 상태가 URL에 있어야 하는 서비스라면 라우터를 쓰고 코어만 가져다 쓴다.
- **전환 중 포인터 입력은 잠긴다**(View Transitions API의 동작). 그래서 280ms를 넘기지 않는 편이 좋다 — 길수록 "느린 앱"이 된다.
- 포커스 이동은 `[data-page-view]`에 `tabindex="-1"`을 붙이고 CSS가 그 영역의 포커스 링을 끈다. 영역 안 버튼·링크의 포커스 링은 그대로다.
