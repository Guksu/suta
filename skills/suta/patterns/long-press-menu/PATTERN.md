---
name: long-press-menu
description: 길게 누르면(long press) 항목이 살짝 떠오르고 뒤가 흐려지며 옆에 액션 메뉴가 나타나는 iOS식 미리보기 메뉴를 구현한다 — 데스크톱은 우클릭으로 열린다. "꾹 누르면 메뉴, 롱프레스 메뉴, 사진 길게 눌러 옵션, 아이폰 홈 화면 아이콘처럼 떠오르는 메뉴, 우클릭 context menu" 요청에 쓴다. 기존 적용분의 누르는 시간·흐림 강도·메뉴 위치·항목 수정에도 쓴다.
---

# long-press-menu — 길게 눌러 메뉴

라이브 데모: https://guksu.github.io/suta/#/long-press-menu

## 언제 쓰는가

목록·격자의 항목(메뉴 카드·사진·앱 아이콘)에 **부가 동작**(담기·즐겨찾기·숨기기)을 붙이고 싶은데, 항목마다 ⋯ 버튼을 그리면 화면이 지저분해질 때. iOS 홈 화면 아이콘·사진 앱·메시지 말풍선이 이 관례다 — 길게 누르면 항목이 살짝 떠오르고(scale 1.04 + 그림자) 뒤가 흐려지며 항목 옆에 메뉴가 자라 나온다. 데스크톱에서는 우클릭이 같은 메뉴를 연다(macOS의 "길게 누르기 = 우클릭" 관례).

반대 의견: 길게 누르기는 **보이지 않는 제스처**라 처음 온 사용자는 존재를 모른다. 필수 동작(삭제·결제)은 이 메뉴에만 두지 말고 상세 화면·⋯ 버튼(dropdown-menu 패턴)에도 두라. 이 메뉴는 "아는 사람이 빨리 가는 길"이다.

**기술 선택:** 포인터 이벤트 타이머 + CSS transition/animation, 라이브러리 없음. 길게 누르기는 "누르고 N ms 동안 움직이지 않음"이라는 판정 문제라 JS가 필요하지만, 떠오름·흐림·메뉴 등장은 전부 CSS다(`transform`·`opacity`·`backdrop-filter`). 메뉴 위치는 DOM 없는 순수 함수로 분리해 테스트가 명세를 대신한다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createLongPress.ts` | 코어 — 타이머·이동 허용치·우클릭·발화 후 click 억제 | 모든 프로젝트 |
| `assets/placeContextMenu.ts` | 코어 — 메뉴 위치(아래 왼쪽 정렬 → 위로 뒤집기 → 좌우 클램프) | 모든 프로젝트 |
| `assets/long-press-menu.css` | 떠오름·백드롭 흐림·메뉴 등장·reduced-motion | 모든 프로젝트 |
| `assets/LongPressMenu.tsx` | React 래퍼 (열기·백드롭·키보드·포커스 복귀) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

항목을 `LongPressMenu`로 감싼다. 복제본을 만들지 않고 **감싼 원본 자체가 떠오른다**.

```tsx
import { LongPressMenu } from './LongPressMenu'

const MenuCard = ({ item }) => (
  <LongPressMenu
    label={`${item.name} 동작`}
    items={[
      { label: '장바구니 담기', onSelect: () => addToCart(item) },
      { label: '즐겨찾기', onSelect: () => favorite(item) },
      { label: '숨기기', onSelect: () => hide(item), destructive: true },
    ]}
  >
    <article className="menu-card">
      <h3>{item.name}</h3>
      <p>{item.price}</p>
    </article>
  </LongPressMenu>
)
```

- 열림: 길게 누르기(기본 450ms, `delayMs`) 또는 우클릭. 키보드는 카드에 포커스한 뒤 Enter·Space·ArrowDown, 또는 Shift+F10(메뉴 키).
- 열리면 첫 항목에 포커스, ArrowUp/Down 순환, Home/End, Esc 닫기. 항목을 고르면 `onSelect` 뒤 닫히고 포커스가 카드로 돌아온다.
- 닫힘: 백드롭 클릭·Esc·페이지 스크롤·창 크기 변경·항목 선택.
- `destructive: true` 항목은 붉은 글자로 표시된다(맨 아래에 둔다). `disabled: true` 항목은 흐리게 보이고 눌러도 실행되지 않는다.

## 사용 방법 — 순수 JS (React 없음)

카드·백드롭·메뉴를 **같은 부모 아래 형제**로 두고, 코어 두 개를 붙인다. 열림 상태는 `data-open`과 요소 표시로만 바꾸면 CSS가 연출한다:

```js
import { createLongPress } from './createLongPress.js'
import { placeContextMenu } from './placeContextMenu.js'

const card = document.querySelector('.lpm-item')
const backdrop = document.querySelector('.lpm-backdrop')
const menu = document.querySelector('.lpm-menu')

const setOpen = (open) => {
  card.dataset.open = String(open)
  backdrop.hidden = !open
  menu.hidden = !open
  if (!open) {
    card.focus()
    return
  }
  const rect = card.getBoundingClientRect()
  const { top, left, side } = placeContextMenu({
    anchor: rect,
    menu: { width: menu.offsetWidth, height: menu.offsetHeight },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  })
  menu.style.top = `${top}px`
  menu.style.left = `${left}px`
  menu.dataset.side = side
  menu.querySelector('[role="menuitem"]').focus()
}

createLongPress({ target: card, onLongPress: () => setOpen(true) })
backdrop.addEventListener('click', () => setOpen(false))
window.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false))
window.addEventListener('scroll', () => setOpen(false), true)
```

메뉴 마크업은 `role="menu"` 안에 `role="menuitem"` 버튼(`class="lpm-menu-item"`, 붉은 항목은 `data-destructive="true"`)이다. 방향키 순환은 React 래퍼의 `onMenuKeyDown`을 그대로 옮기면 된다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 키보드만 쓴다 | 트리거(`role="button"`, `aria-haspopup="menu"`)에 포커스한 채 Enter·Space·ArrowDown으로 연다. Shift+F10과 메뉴 키도 된다(맥 키보드에는 둘 다 없다). 카드 안의 버튼·링크에서 누른 키는 그 요소의 것이라 메뉴를 열지 않는다 | `assets`(React) |
| 두 손가락이 닿는다 | 누르는 중에 두 번째 손가락이 닿으면 타이머를 취소한다. 두 손가락은 확대·넘기기다 | `assets` |
| 스크롤하려던 손가락이다 | 450ms 안에 10px 넘게 움직이면 취소한다. 브라우저가 스크롤을 시작해 보내는 `pointercancel`에도 취소한다 | `assets` |
| 항목이 0개다(권한이 없어 모두 빠짐) | 메뉴를 열지 않는다. `aria-haspopup`·`aria-expanded`도 붙이지 않는다 | `assets`(React) |
| 쓸 수 없는 항목이 있다 | `disabled: true`를 준다. `aria-disabled="true"`로 읽히고 방향키 포커스는 받는다. 눌러도 실행되지 않고 메뉴는 열려 있다. 왜 못 쓰는지는 항목 문구에 적는다("품절 — 담을 수 없어요") | `assets`(React) |
| 항목이 많거나 이름이 길다 | 메뉴는 화면에서 사방 8px을 띄운 크기까지만 커진다(`max-width: calc(100vw - 16px)`, `max-height: calc(100dvh - 16px)`). 긴 이름은 줄을 바꾸고, 넘치는 항목은 메뉴 안에서 스크롤한다. 메뉴 안쪽 스크롤로는 닫히지 않는다. 그래도 항목은 5개 안쪽으로 둔다 | `assets` |
| 열린 채 페이지가 스크롤되거나 창 크기가 바뀐다 | 재 둔 위치가 틀리므로 닫는다. 포커스는 트리거로 돌아간다 | `assets`(React) |
| 고른 동작이 카드를 없앤다(숨기기·삭제) | 메뉴는 닫으며 포커스를 트리거로 돌려보내는데, 그 트리거가 곧 사라진다. `onSelect`에서 다음 카드나 목록 제목으로 포커스를 옮긴다 | 프로젝트 |
| 메뉴 안에서 Esc를 쓰는 요소가 있다 | 안쪽 요소가 이미 쓴 Esc(`defaultPrevented`)로는 닫지 않는다 | `assets`(React) |
| 고대비 모드(`forced-colors`) | 옅은 배경이 사라지므로 가리키는 항목에 `outline: 2px solid Highlight`를 그린다. 뒤 흐림과 그림자는 없어지고 메뉴 테두리 1px이 경계가 된다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 누르고 있어야 하는 시간 | `delayMs` (기본 450ms — 300 아래면 스크롤하려던 손가락이 메뉴를 열고, 700 위면 고장 난 줄 안다) |
| 이동 허용치 | `moveTolerancePx` (기본 10px — 손가락 떨림은 통과, 스크롤 시작은 취소) |
| 떠오름·등장 속도 | `--lpm-duration` (기본 220ms, 이징 `cubic-bezier(0.22, 1, 0.36, 1)` 내장) |
| 뒤 흐림 강도 | `--lpm-blur` (기본 12px — 0이면 어둡게만 됨) |
| 백드롭 색 | `--lpm-tint` (기본 검정 35%) |
| 메뉴 배경·모서리·글자색 | `--lpm-menu-bg`·`--lpm-radius`·`--lpm-menu-color` |
| 떠오른 항목 그림자 | `--lpm-lift-shadow` |
| 붉은 항목 색 | `--lpm-destructive` |
| 메뉴 간격·여백 | `placeContextMenu`의 `gap`·`padding` (기본 8px) |

## 함께 쓰는 패턴

- `patterns/dropdown-menu` — 같은 동작을 보이는 `⋯` 버튼으로도 낸다. 길게 누르기는 발견하기 어려우므로 필수 동작은 두 길을 다 둔다.
- `patterns/bottom-sheet` — 항목이 5개를 넘거나 설명이 붙으면 메뉴 대신 시트를 연다. `onLongPress`에서 시트를 여는 식으로 코어(`createLongPress.ts`)만 가져다 쓴다.
- `patterns/modal-dialog` — 붉은 항목(삭제)을 고른 뒤의 확인창. 메뉴가 닫힌 뒤에 열리므로 층이 겹치지 않는다.
- `patterns/drag-to-reorder` — 같은 항목에 길게 눌러 끌기(`longPressMs`)와 함께 쓰지 않는다. 둘 다 "누르고 기다림"을 쓴다. 순서 바꾸기는 손잡이로 둔다.

## 주의사항

- **트리거에는 `role="button"`을 준다.** 역할이 없는 `div`에는 `aria-expanded`·`aria-haspopup`이 허용되지 않아 화면 낭독기가 메뉴가 있다는 것을 알리지 못한다. React 래퍼는 이미 그렇게 그린다.
- **트리거·백드롭·메뉴는 같은 부모 아래 형제여야 한다.** 원본 카드를 백드롭 위로 띄우는 방법이 z-index(카드 41 > 백드롭 40)인데, 이 비교는 같은 stacking context 안에서만 성립한다. 메뉴를 포털로 `body`에 보내면 카드 조상에 `transform`·`opacity`·`filter` 하나만 있어도 카드가 백드롭 밑으로 가라앉는다. React 래퍼는 이미 그렇게 그린다.
- **백드롭은 `position: fixed`** — 조상에 `transform`·`filter`·`will-change`가 있으면 fixed 기준이 그 조상으로 바뀌어 화면 전체를 못 덮는다. 격자 컨테이너에 그런 속성을 두지 마라.
- 카드의 `touch-action: manipulation`·`-webkit-touch-callout: none`·`user-select: none`은 터치 브라우저의 기본 길게누르기(링크 미리보기·이미지 저장·텍스트 선택)를 막는다 — 제거 금지. 카드 안 텍스트를 사용자가 복사해야 한다면 이 패턴이 맞지 않는다.
- 발화 뒤의 `click`은 **한 번** 억제된다. 카드 안에 링크·버튼이 있으면 길게 눌러도 그것이 눌리지 않는 이유다. 카드 클릭 이동(상세 화면)은 그대로 살아 있다 — 짧게 누르면 이동, 길게 누르면 메뉴.
- 안드로이드는 터치 길게누르기에도 `contextmenu`를 만든다. 코어가 타이머 발화 직후의 contextmenu를 무시해 두 번 열리지 않는다 — `delayMs`를 브라우저 기본(약 500ms)보다 길게 잡으면 우리 타이머 대신 contextmenu 경로로 먼저 열리는데, 결과는 같다.
- `backdrop-filter`는 비싸다. 열린 동안 한 장뿐이라 괜찮지만, `--lpm-blur`를 애니메이션하지 마라(등장은 opacity만 움직인다).
- 열린 채 스크롤되면 메뉴가 항목을 따라가지 않고 닫힌다(iOS도 그렇다). 따라다니게 하려면 `scroll` 리스너에서 닫는 대신 `placeContextMenu`를 다시 부른다.
- 메뉴는 항목의 왼쪽 선에 맞춘다. `dir="rtl"`에서도 왼쪽 선이다. 글자 정렬만 `text-align: start`로 따라간다.
- 글자로 항목 찾기(첫 글자를 눌러 이동)는 들어 있지 않다. 항목이 몇 개뿐인 메뉴를 전제한다.
- **reduced-motion 대응 내장** — 떠오르는 스케일과 메뉴의 커지는 이동을 끄고 페이드만 남긴다. 블록 제거 금지.
- 포커스 트랩은 없다. 메뉴는 Tab으로 빠져나가면 닫힌다 — 메뉴 항목이 몇 개뿐인 액션 메뉴에는 그것이 관례다.
