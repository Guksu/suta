---
name: bottom-nav
description: 모바일 앱·웹뷰의 하단 탭 바(GNB, bottom navigation bar)를 구현한다. 홈·카테고리·찜·마이처럼 최상위 화면 4~5개를 오가는 고정 메뉴로, 개수 배지와 새 소식 점, 상세·장바구니에서 숨기기, 키보드가 올라오면 숨기기, 아이폰 홈 바(안전 영역) 피하기를 포함한다. "하단 탭바, 하단 GNB, 하단 메뉴 고정, 탭에 빨간 점·개수 배지, 상세에서 탭 숨기기" 요청에 쓴다.
---

# bottom-nav — 하단 탭 바(GNB)

라이브 데모: https://guksu.github.io/suta/#/bottom-nav

## 언제 쓰는가

앱과 앱 안 웹뷰에서 최상위 화면 4~5개(홈·카테고리·찜·마이 등)를 오가는 메뉴다. 한국 서비스 기획에서 "GNB"라고 하면 대개 이 하단 탭 바를 가리킨다. 스크롤에 반응하는 상단 내비게이션 바는 `glass-nav`, 탭 아래 밑줄이 따라가는 것은 `tab-indicator`다.

잘 만든 앱 31곳의 화면 1,116장에서 잰 관례다.

- **어느 화면에 두는가** — 탭의 첫 화면에만 둔다.
  - 탭 바가 있는 화면의 비율: 홈 62%, 목록 34%, 격자 32%, 설정·마이 21%, 상세 5%, 장바구니·주문 6%, 검색 4%, 폼 1%.
  - 상세·장바구니·주문·검색·폼에서는 탭 바를 숨긴다. 그 화면의 머리에는 뒤로를 두고, 아래는 하단 고정 바(구매·주문 버튼) 하나만 둔다.
- **몇 칸인가** — 5칸(107화면) > 4칸(28) > 3칸(17).
  - 커머스 3곳(뷰티·패션·공동구매)은 모두 5칸이다. 홈·카테고리·찜·마이에 서비스 고유 한 칸을 더한다.
  - 세 곳 모두 장바구니를 탭이 아니라 머리 오른쪽 아이콘(개수 배지)에 둔다.
- **모양**
  - 아이콘 약 24 + 라벨 10~12px, 높이 49~66 + 홈 표시줄 34.
  - 위에 1px 옅은 선을 두고, 칸 폭은 같다.
  - 현재 탭만 강조색(또는 검정)의 채운 아이콘과 굵은 라벨이고, 나머지는 회색 선 아이콘이다.
- **배지** — 빨강 원 + 흰 숫자, 또는 빨간 점(약 6~8px). 아이콘 오른쪽 위에 둔다.
- **떠 있는 것**(토스트·맨 위로·글쓰기 버튼)은 탭 바 위에 띄운다. 탭 바를 가리지 않는다.

**기술 선택:** 모양·고정·숨김은 CSS가 맡는다. `position: fixed` + `env(safe-area-inset-bottom)`, 숨김은 `transform`이다. TypeScript는 판정만 한다.
- 지금 탭: 홈 `/`이 모든 경로의 앞부분이라 직접 짜면 홈이 늘 켜진다.
- 이 화면에 보이는가.
- 키보드가 올라왔는가: 안드로이드 웹뷰는 키보드가 올라오면 화면 높이를 줄인다. 그러면 고정된 탭 바가 키보드 위로 따라 올라와 입력칸을 가린다. 화면 크기 변화는 기기마다 달라서 입력칸의 초점으로 판정한다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/bottomNavCore.ts` | 코어 — `isCurrentTab`·`shouldShowBottomNav`·`formatBadge`·`badgeLabel`·`isEditable`·`watchKeyboard` | 모든 프로젝트 |
| `assets/bottom-nav.css` | 고정·안전 영역·현재 탭·배지·숨김·누름 피드백·reduced-motion | 모든 프로젝트 |
| `assets/BottomNav.tsx` | React 래퍼 — 링크 목록·배지 낭독·다시 누르면 맨 위로·키보드 숨김. `bottom-nav.css`를 직접 불러온다 | React 프로젝트만 |

아이콘은 `patterns/layout-principles/assets/icons.ts`(선 아이콘 한 벌)에서 가져온다. React면 같은 폴더의 `Icon.tsx`를 함께 복사한다. 이모지나 손으로 그린 아이콘은 쓰지 않는다.

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js·.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { BottomNav } from './BottomNav'
import { shouldShowBottomNav } from './bottomNavCore'
import { Icon } from './Icon' // bottom-nav.css는 BottomNav.tsx가 불러온다 — 함께 복사한다

const TABS = [
  { href: '/', label: '홈', icon: <Icon name="home" />, currentIcon: <Icon name="home" filled /> },
  { href: '/category', label: '카테고리', icon: <Icon name="category" /> },
  { href: '/search', label: '검색', icon: <Icon name="search" /> },
  { href: '/wish', label: '찜', icon: <Icon name="heart" />, currentIcon: <Icon name="heart" filled /> },
  { href: '/my', label: '마이', icon: <Icon name="user" />, currentIcon: <Icon name="user" filled /> },
]

const AppShell = ({ path, navigate, wishCount }: { path: string; navigate: (to: string) => void; wishCount: number }) => {
  // 탭의 첫 화면과 카테고리 아래 상품 목록에서만 보인다 — 상세·장바구니·주문에서는 숨는다
  const showTabs = shouldShowBottomNav({ path, tabs: TABS.map((tab) => tab.href), alsoOn: ['/category'] })
  const items = TABS.map((tab) => (tab.href === '/wish' ? { ...tab, badge: wishCount } : tab))

  return (
    <div className="app" data-tabs={showTabs ? 'true' : undefined}>
      {/* …화면… */}
      <BottomNav
        items={items}
        path={path}
        hidden={!showTabs}
        onNavigate={({ href, event }) => {
          event.preventDefault()
          navigate(href)
        }}
      />
    </div>
  )
}
```

본문은 탭 바에 가리지 않게 아래를 비운다. 탭 바가 있는 화면에만 비운다.

```css
.app[data-tabs='true'] {
  padding-bottom: calc(var(--bottom-nav-height, 56px) + env(safe-area-inset-bottom));
}
```

`env(safe-area-inset-bottom)`이 0이 아니려면 `index.html`의 viewport 메타에 `viewport-fit=cover`가 있어야 한다.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

## 사용 방법 — 순수 JS (React 없음)

마크업은 링크 목록이다. 현재 탭에는 `aria-current="page"`를 단다.

```html
<nav class="bottom-nav" aria-label="주요 메뉴">
  <ul class="bottom-nav-list">
    <li class="bottom-nav-item">
      <a class="bottom-nav-link" href="/" aria-current="page">
        <span class="bottom-nav-icon" aria-hidden="true"><!-- iconSvg({ name: 'home', filled: true }) --></span>
        <span class="bottom-nav-label">홈</span>
      </a>
    </li>
    <li class="bottom-nav-item">
      <a class="bottom-nav-link" href="/wish">
        <span class="bottom-nav-icon" aria-hidden="true"><!-- iconSvg({ name: 'heart' }) --><span class="bottom-nav-badge" aria-hidden="true">3</span></span>
        <span class="bottom-nav-label">찜</span><span class="bottom-nav-sr"> 새 항목 3개</span>
      </a>
    </li>
  </ul>
</nav>
```

```js
import { shouldShowBottomNav, watchKeyboard } from './bottomNavCore.js'

const bar = document.querySelector('.bottom-nav')
// 숨기는 이유는 둘이다(탭 바가 없는 화면, 키보드). 따로 쥐어야 키보드가 내려갈 때 상세 화면에서 탭 바가 되살아나지 않는다
let offScreen = false
let typing = false
const apply = () => {
  const hidden = offScreen || typing
  if (hidden) bar.dataset.hidden = 'true'
  else delete bar.dataset.hidden
  bar.inert = hidden // 숨긴 동안 키보드 이동에서도 뺀다
}

let stopWatching = () => {}
const onRouteChange = () => {
  offScreen = !shouldShowBottomNav({ path: location.pathname, tabs: ['/', '/category', '/wish', '/my'] })
  // 화면이 바뀔 때마다 다시 건다 — 초점이 있던 입력칸이 화면과 함께 사라져도 지금 초점으로 판정을 새로 맞춘다
  stopWatching()
  typing = false
  stopWatching = watchKeyboard({ onChange: (open) => { typing = open; apply() } })
  apply()
}
onRouteChange() // 라우터의 화면 전환 때마다 부른다
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 배지 숫자가 99를 넘거나, 0이거나, 서버 값이 비어 숫자가 아니다 | 100 이상은 `99+`로 줄인다. 0·음수·`NaN`은 배지를 그리지 않는다. 소수는 내림한다. 낭독 문구도 같은 값을 쓴다("새 항목 99개 이상") | `assets` — `formatBadge`·`badgeLabel` |
| 라벨이 길다 | 한 줄에서 말줄임한다. 두 줄로 꺾지 않는다. 5칸·320px 화면에서 칸 폭은 64px이고 좌우 2px씩을 빼면 60px이라 12px 한글 5자까지 들어간다 | `assets`(말줄임) · `프로젝트`(라벨을 2~4자로 짓는다) |
| 입력칸에 초점이 가서 키보드가 올라온다 | 탭 바를 숨기고 `inert`로 Tab 순서에서도 뺀다. 화면이 열릴 때 이미 초점이 있으면(`autofocus`) 숨긴 채 그린다. 읽기 전용·비활성 칸과 `inputmode="none"`은 키보드가 올라오지 않으므로 숨기지 않는다 | `assets` — `watchKeyboard`·`isEditable` |
| 초점이 있던 입력칸이 화면 전환과 함께 사라진다 | 브라우저에 따라 `focusout`이 오지 않는다. 화면(`path`)이 바뀔 때 지금 초점으로 판정을 다시 맞춰 탭 바가 숨은 채 남지 않는다 | `assets` — `BottomNav`. 순수 JS는 `프로젝트`(위 예시의 `onRouteChange`) |
| 홈 표시줄이 있는 기기, 가로로 눕힌 화면 | 아래는 `env(safe-area-inset-bottom)`, 좌우는 `env(safe-area-inset-left)`·`right`만큼 안쪽으로 들인다. 탭 바 배경은 화면 끝까지 칠한다 | `assets` — `bottom-nav.css`. viewport 메타의 `viewport-fit=cover`는 `프로젝트` |
| 해시 라우터를 쓴다(`#/category`) | `href`와 `path`에 `#/…`를 그대로 넘겨도 지금 탭과 보일 화면을 맞게 판정한다 | `assets` — `isCurrentTab`·`shouldShowBottomNav` |
| Ctrl·Cmd·Shift를 누른 채 탭을 누른다 | 새 탭·새 창으로 연다. `onNavigate`·`onReselect`를 부르지 않고 링크의 기본 동작에 맡긴다 | `assets` — `BottomNav` |
| 화면이 창 전체가 아니라 안쪽 상자에서 스크롤된다 | 지금 탭을 다시 눌러도 기본 동작(`window.scrollTo`)으로는 맨 위로 가지 않는다. `onReselect`에서 그 상자를 스크롤한다 | `프로젝트` |
| `dir="rtl"` | 칸 순서가 오른쪽부터로 뒤집히고, 배지는 아이콘의 왼쪽 위로 간다(`inset-inline-start`) | `assets` — `bottom-nav.css` |
| 고대비 모드(`forced-colors: active`) | 색이 시스템 색으로 강제돼 현재 탭은 굵은 라벨과 채운 아이콘으로만 구별된다. 점 배지는 `Highlight`로 그리고, 숫자 배지는 원 없이 숫자만 남는다 | `assets`(굵기·점 배지) · `프로젝트`(`currentIcon`에 채운 아이콘을 준다) |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 높이 | `--bottom-nav-height` | 56px (+ 안전 영역) |
| 색 | `--bottom-nav-color`(나머지 탭)·`--bottom-nav-current`(현재 탭)·`--bottom-nav-bg`·`--bottom-nav-line` | 옅은 글자 #686868 / 거의 검정 #1c1c1c / 흰색 / #e3e5e9 |
| 배지 | `--bottom-nav-badge-bg` | 오류 빨강 #c8341f |
| 넓은 화면 | `--bottom-nav-max-width` — 모바일 화면을 넓은 창에서 열 때 본문 열 폭에 맞춘다 | 없음(폭 가득) |
| 숨김 속도 | `--bottom-nav-duration` — 나타남 250ms, 숨김은 그 3/4 | 250ms |
| 겹침 순서 | `--bottom-nav-z` | 층 토큰 `--z-sticky`, 없으면 30. 시트와 스크림(40) 아래다 — 예전 기본값 50은 열린 시트 위에 탭 바가 그려졌다 |
| 낭독 문구 | `label`(내비게이션 이름), `badgeLabels` — `{ count(n), overflow, dot }` | "주요 메뉴" / "새 항목 3개" |

현재 탭 색은 프로젝트 강조색(`--color-accent`)에 연결한다. 탭 바에 배경색을 채우거나 칸마다 다른 색을 주지 않는다. 어두운 바탕에서는 색 변수 네 개(`--bottom-nav-bg`·`line`·`color`·`current`)를 프로젝트 토큰에 잇는다. 기본값은 밝은 바탕용이다.

## 함께 쓰는 패턴

- `patterns/page-transition` — 탭마다 스크롤 위치를 기억할 때. 홈에서 내려 본 뒤 마이에 갔다가 돌아오면 같은 자리여야 한다(`usePageStack`의 스크롤 복원). 상세로 들어가는 전환 동안 탭 바는 `hidden`으로 함께 내려간다.
- `patterns/toast-stack` — 토스트는 탭 바 위에 띄운다. 탭 바가 보이는 화면에서는 토스트의 아래 여백에 `var(--bottom-nav-height, 56px)`를 더한다.
- `patterns/glass-nav`·`patterns/sticky-header` — 위쪽 머리. 탭 바와 함께 쓰면 본문은 위아래를 모두 비운다. 상세 화면에서는 탭 바를 숨기고 머리에 뒤로를 둔다.
- `patterns/layout-principles` — 탭 아이콘. `patterns/layout-principles/assets/icons.ts`의 선 아이콘과 채운 모양(`filled`)을 한 벌로 쓴다.

## 주의사항

- **탭 바와 하단 고정 바를 함께 쌓지 않는다.** 상세의 구매 바, 장바구니의 주문 바가 있는 화면에서는 탭 바를 숨긴다(`shouldShowBottomNav`). 두 줄이 쌓이면 화면 아래 20%가 고정 영역이 된다.
- **장바구니는 머리 오른쪽 아이콘에 개수 배지로 둔다.** 탭에 넣으면 장바구니 화면에서도 탭 바가 보여 주문 바와 겹친다.
- **라벨을 지우지 않는다.** 아이콘만 있는 탭은 뜻을 짐작해야 한다.
- **현재 탭은 색과 굵기를 함께 바꾼다.** 색만 바꾸면 색을 구별하기 어려운 사람이 알아보지 못한다. 채운 아이콘(`currentIcon`)을 함께 쓰면 더 분명하다.
- **배지 숫자는 화면 낭독기에 말로 읽힌다**(`badgeLabel` — "새 항목 3개"). 숫자 글자는 `aria-hidden`이다.
- **지금 탭을 다시 누르면 맨 위로 간다.** 앱의 관례다. 탭 안에 화면이 쌓여 있으면 `onReselect`에서 그 탭의 첫 화면으로 돌아가게 한다.
- **`position: fixed`의 부모에 `transform`·`filter`가 있으면 안 된다.** 그 부모가 기준이 되어 탭 바가 화면 아래가 아니라 부모 아래에 붙는다.
- 키보드 판정은 초점으로 한다. 블루투스 키보드를 쓰는 태블릿·데스크톱에서도 입력칸에 초점이 있는 동안 탭 바가 숨는다. 화면 키보드가 실제로 올라왔는지는 보지 않는다.
- 칸은 3~5개로 둔다. 6칸이면 320px에서 칸 폭이 53px이 되어 라벨이 4자를 넘으면 잘린다.
- **reduced-motion 대응 내장** — 숨김·나타남은 이동 없이 즉시 바뀌고, 누름 축소도 끈다. 블록을 지우지 않는다.
