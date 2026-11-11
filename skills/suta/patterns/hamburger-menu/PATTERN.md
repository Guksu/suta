---
name: hamburger-menu
description: 햄버거 버튼(≡, 삼선 아이콘)이 X로 모핑하며 옆에서 사이드 드로어가 밀려 나오는 모바일 내비게이션(hamburger menu)을 구현한다. "햄버거 메뉴, 사이드 메뉴, 드로어, 슬라이드 메뉴, 삼선 누르면 옆에서 메뉴 나오게, 모바일 전체 메뉴" 요청과 모바일 헤더의 내비게이션 패널에 쓴다. 기존 적용분의 방향(왼쪽/오른쪽)·속도·폭 수정에도 쓴다.
---

# hamburger-menu — 햄버거 메뉴 모핑 + 드로어

라이브 데모: https://guksu.github.io/suta/#/hamburger-menu

## 언제 쓰는가

모바일 헤더에서 전체 내비게이션을 옆에서 꺼내는 패턴. 버튼의 ≡가 X로 모핑해 "열림/닫힘" 상태를 버튼 스스로 말하고, 드로어가 옆에서 밀려 나온다. 대부분의 모바일 웹 헤더가 이 관례다 — 아이콘만 바꿔치기(≡ ↔ ✕ 두 아이콘 교체)하면 상태 전환이 보이지 않지만, 모핑은 같은 막대가 접히는 과정이 보인다.

**기술 선택:** CSS transition만 사용, JS는 상태 토글뿐. 아이콘 모핑은 `aria-expanded` 속성 하나에 반응한다 — 시각 상태와 접근성 상태가 같은 속성이라 어긋날 수 없다. 막대 이동·회전은 전부 transform/opacity(GPU 합성)이고 레이아웃 애니메이션이 없다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/hamburger-menu.css` | 아이콘 모핑·드로어 슬라이드·백드롭 정의 | 모든 프로젝트 |
| `assets/HamburgerMenu.tsx` | React 래퍼 (버튼 + 드로어: Esc·백드롭·뒤로 가기·포커스 가두기·스크롤 잠금) | React 프로젝트만 |
| `assets/createBackDismiss.ts` | 코어 — 뒤로 가기로 닫기(history 항목 쌓고 걷기). `patterns/bottom-sheet`와 같은 파일 | React 래퍼를 쓰거나 뒤로 가기로 닫을 프로젝트 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { HamburgerButton, Drawer } from './HamburgerMenu'

const Header = () => {
  const [open, setOpen] = useState(false)

  return (
    <header>
      <HamburgerButton open={open} onToggle={() => setOpen(!open)} label="메뉴 열기" />
      <Drawer open={open} onClose={() => setOpen(false)} label="전체 메뉴" closeAboveWidth={768} closeOnBack>
        <nav>
          <a href="/intro">소개</a>
          <a href="/menu">면 메뉴</a>
          <a href="/location">매장 안내</a>
        </nav>
      </Drawer>
    </header>
  )
}
```

- `label`은 스크린 리더가 읽는 드로어 이름이다. 드로어 안에 제목이 보이면 그 요소의 id를 `labelledBy`로 넘긴다.
- `side="right"`로 오른쪽에서 나오게 할 수 있다.
- `closeAboveWidth`에는 햄버거 버튼이 사라지는 중단점(px)을 적는다. 열린 채 화면이 그 폭 이상으로 넓어지면 닫는다.
- `closeOnBack`을 켜면 열려 있는 동안 뒤로 가기가 페이지를 떠나지 않고 드로어를 닫는다(기본 꺼짐).
- 드로어는 언마운트하지 않고 `data-open`으로 여닫는다 — 닫힘 애니메이션이 공짜다.

## 사용 방법 — 순수 JS (React 없음)

버튼의 `aria-expanded`와 드로어·백드롭의 `data-open`만 토글하면 CSS가 나머지를 한다.

```html
<button class="hamburger" aria-expanded="false" aria-label="메뉴 열기">
  <span class="hamburger-bar"></span><span class="hamburger-bar"></span><span class="hamburger-bar"></span>
</button>
<div class="drawer-backdrop" data-open="false"></div>
<aside class="drawer" data-open="false" role="dialog" aria-modal="true" aria-label="전체 메뉴" tabindex="-1"><!-- 링크들 --></aside>
```

```js
const button = document.querySelector('.hamburger')
const drawer = document.querySelector('.drawer')
const backdrop = document.querySelector('.drawer-backdrop')

const setOpen = (open) => {
  button.setAttribute('aria-expanded', String(open))
  drawer.dataset.open = String(open)
  backdrop.dataset.open = String(open)
  document.body.style.overflow = open ? 'hidden' : ''
  // 열리면 포커스를 드로어로, 닫히면 버튼으로 — 닫힌 드로어는 visibility: hidden이라 포커스를 받지 못한다
  if (open) drawer.focus({ preventScroll: true })
  else button.focus({ preventScroll: true })
}
const isOpen = () => button.getAttribute('aria-expanded') === 'true'
button.addEventListener('click', () => setOpen(!isOpen()))
backdrop.addEventListener('click', () => setOpen(false))
window.addEventListener('keydown', (e) => e.key === 'Escape' && isOpen() && !e.defaultPrevented && setOpen(false))
// 햄버거 버튼이 사라지는 폭에서 열린 채 남지 않게
window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => e.matches && isOpen() && setOpen(false))
```

Tab을 드로어 안에 가두기와 뒤로 가기로 닫기는 React 래퍼가 맡는 부분이다. 순수 JS에서 뒤로 가기는 열 때 `createBackDismiss({ onDismiss })`를 부르고 닫힐 때 그 반환값을 부른다. Tab 가두기는 래퍼의 `holdFocusWhileOpen`을 옮긴다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 닫혀 있다 | 드로어는 DOM에 남지만 `visibility: hidden`이라 안의 링크가 Tab 순서와 스크린 리더에서 빠진다. 닫힘 이동이 끝난 뒤(`--drawer-duration`)에 감춰진다 | `assets` |
| 열리고 닫힌다 | 열리면 포커스가 드로어 자신(`tabindex="-1"`)으로 가고 Tab은 드로어 안에서만 돈다. 첫 링크에 주지 않는 것은 열자마자 누른 Enter가 그 링크를 실행하지 않게 하려는 것이다. 닫히면 열었던 버튼으로 돌아간다 | `assets`(React) |
| 드로어 안에 검색창·펼침 메뉴가 있다 | 안쪽 요소가 이미 쓴 Esc(`defaultPrevented`)로는 드로어를 닫지 않는다. 다음 Esc에 닫는다 | `assets`(React) |
| 열린 채 화면이 넓어진다(창 넓히기·태블릿 회전) | 햄버거 버튼이 사라지는 폭에서는 드로어가 닫을 버튼 없이 남고 뒤 화면은 잠긴 채다. `closeAboveWidth`에 그 중단점을 적으면 그 폭이 되는 순간 닫는다 | `assets`(React) — `closeAboveWidth` |
| 뒤로 가기를 누른다 | `closeOnBack`이면 드로어만 닫히고 페이지는 그대로다. 버튼·Esc·백드롭으로 닫으면 쌓아 둔 history 항목을 걷는다 | `assets` — `createBackDismiss` |
| 드로어 안 링크를 누른다 | 페이지를 새로 부르는 사이트는 드로어가 함께 사라진다. 주소만 바꾸는 사이트(SPA)는 드로어가 열린 채 남으므로 링크의 `onClick`이나 경로 변화에서 `onClose`를 부른다. 이때 `closeOnBack`은 새 화면의 history를 건드리지 않는다 | 프로젝트 |
| 링크가 화면 높이보다 많다 | 드로어가 세로로 스크롤한다(`overflow-y: auto`). 끝에서 더 굴려도 뒤 페이지는 움직이지 않는다(`overscroll-behavior: contain`). 노치·홈 표시줄만큼 위아래 안쪽 여백이 붙는다 | `assets` |
| 뒤 화면에 스크롤바가 있다(데스크톱) | `body`를 `overflow: hidden`으로 잠그고, 스크롤바가 사라져 넓어진 만큼 `padding-right`로 채운다. `position: fixed`인 머리글은 그래도 흔들리므로 `html { scrollbar-gutter: stable }`을 둔다 | `assets`(React) / 고정 요소는 프로젝트 |
| 고대비(`forced-colors`) | 막대는 배경색으로 그리므로 그대로 두면 사라진다. `ButtonText`로 다시 칠한다. 드로어는 열리는 쪽 가장자리에 1px 선을 긋는다 | `assets` |
| 키보드도 Esc도 없는 보조 기기(스위치·음성 조작)로 쓴다 | 포커스가 드로어 안에 갇혀 햄버거 버튼에 닿지 못한다. 드로어 맨 위에 "메뉴 닫기" 버튼을 하나 둔다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 아이콘 색 | `--hamburger-color` (기본 currentColor) |
| 아이콘 모핑 속도 | `--hamburger-duration` (기본 300ms) |
| 막대 폭·두께·간격 | `--hamburger-bar-width`(22px)·`--hamburger-bar-height`(2px)·`--hamburger-gap`(7px) |
| 드로어 폭 | `--drawer-width` (기본 min(300px, 80vw)) |
| 드로어 속도 | `--drawer-duration` (기본 300ms — 열림 거리가 길어 아이콘과 같은 값이 자연스럽다) |
| 드로어 배경 | `--drawer-bg` (기본 #fff). 글자색은 정하지 않으므로 어두운 테마에서는 배경과 함께 바꾼다 |

## 주의사항

- **버튼 상태는 `aria-expanded`가 유일한 스위치다** — 클래스 토글로 바꾸지 말 것. CSS가 이 속성을 보고 모핑하므로 접근성 상태가 시각과 함께 움직인다.
- 버튼의 `label`은 열려 있어도 바꾸지 않는다. 열림 여부는 `aria-expanded`가 읽어 준다. 라벨까지 "메뉴 닫기"로 바꾸면 "메뉴 닫기, 펼쳐짐"처럼 두 번 말한다.
- 드로어가 열려 있는 동안 body 스크롤을 잠근다(React 래퍼 내장, 순수 JS는 위 예시처럼 직접). 잠그지 않으면 드로어 뒤 페이지가 스크롤되어 사용자가 위치를 잃는다. `html`에 `overflow`를 직접 준 프로젝트에서는 `body`의 값이 화면에 닿지 않으므로 `html`을 잠근다.
- 위·아래 막대의 X 교차는 `--hamburger-gap`만큼 이동한 위치에서 시작하므로, 간격을 크게 키우면 회전 전 이동이 길어진다 — 그 경우 duration도 함께 늘린다.
- **reduced-motion 대응 내장** — 아이콘은 즉시 전환, 드로어는 슬라이드 대신 페이드. 블록 제거 금지.
- Tab을 가두는 방식은 "처음과 끝에서 반대편으로 넘기기"다. 드로어 밖 요소를 `inert`로 만들지는 않으므로 스크린 리더의 읽기 커서는 드로어 밖으로 나갈 수 있다(`aria-modal="true"`를 따르는 리더는 나가지 않는다).
- `side`는 물리 방향이다. `dir="rtl"` 문서에서도 `left`는 왼쪽에서 나온다. 오른쪽에서 읽는 언어에서는 `side="right"`를 직접 넘긴다.
- `closeOnBack`은 history에 주소가 같은 항목을 하나 쌓는다. 같은 주소의 `popstate`에 데이터를 다시 불러오는 라우터에서는 닫을 때마다 그 동작이 돈다. 그런 프로젝트는 라우터의 방식(쿼리 문자열·해시로 열림 상태 두기)으로 대신한다.
- 드로어 안에서 `patterns/modal-dialog`를 열면 모달이 맨 위 층에 뜬다. 그동안 드로어는 그대로 열려 있고, 모달이 쓴 Esc는 드로어를 닫지 않는다.
