---
name: bottom-sheet
description: 바텀시트(bottom sheet) 컴포넌트 — 아래에서 올라오는 시트를 구현한다. 드래그로 끌어내려 닫기·백드롭·Esc 포함. "바텀시트, 하단 시트, 밑에서 올라오는 시트/메뉴, 끌어내려서 닫기" 요청과 모바일에서 옵션을 고르는 액션 시트·필터 UI에 쓴다. 기존 적용분의 닫히는 속도·임계값·높이 수정에도 쓴다.
---

# bottom-sheet — 바텀시트

라이브 데모: https://guksu.github.io/suta/#/bottom-sheet

## 언제 쓰는가

모바일에서 화면 하단에서 올라오는 패널 — 액션 메뉴·필터·상세 정보. 토스(송금 확인)·당근(카테고리 선택)·배민(옵션 선택) 전부 이 관례다. 손가락으로 끌어내려 닫는 제스처가 핵심이다.

**기술 선택:** 포인터 이벤트 직접 구현 + CSS transition, 라이브러리 없음. 드래그 제스처는 CSS만으로 안 되는 첫 영역이지만, "드래그 중에는 transition을 끄고 손가락을 따라가고, 놓으면 CSS transition이 스냅백/닫힘을 처리"하는 분업으로 JS는 판정만 담당한다 — 복사해 쓰는 패턴에 의존성을 들이지 않기 위한 선택이다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createSheetDrag.ts` | 코어 — 드래그 추적·거리/속도 닫기 판정 | 모든 프로젝트 |
| `assets/createBackDismiss.ts` | 코어 — 뒤로 가기로 닫기(history 항목 쌓고 걷기) | 뒤로 가기로 닫을 프로젝트 |
| `assets/bottom-sheet.css` | 시트·백드롭·핸들·이동 정의, 긴 내용용 `.sheet-scroll` | 모든 프로젝트 |
| `assets/BottomSheet.tsx` | React 래퍼 (드래그+백드롭+Esc+뒤로 가기+포커스 가두기+스크롤 잠금) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { BottomSheet } from './BottomSheet'

const Menu = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>메뉴 열기</button>
      <BottomSheet open={open} onClose={() => setOpen(false)} label="가게 메뉴" closeOnBack>
        <ul>…메뉴 항목…</ul>
      </BottomSheet>
    </>
  )
}
```

- `label`은 스크린 리더가 읽는 시트 이름이다. 시트 안에 제목이 보이면 그 요소의 id를 `labelledBy`로 넘긴다.
- `closeOnBack`을 켜면 열려 있는 동안 뒤로 가기가 페이지를 떠나지 않고 시트를 닫는다(기본 꺼짐).
- 내용이 길면 스크롤할 부분을 `<div className="sheet-scroll">`로 감싼다. 그 위의 핸들·제목은 제자리에 남는다.

## 사용 방법 — 순수 JS (React 없음)

시트·백드롭 요소를 만들어두고 `data-open`만 토글하면 CSS가 여닫는다. 드래그 닫기는 코어를 붙인다:

```js
import { createSheetDrag } from './createSheetDrag.js'

const sheet = document.querySelector('.bottom-sheet')
const backdrop = document.querySelector('.sheet-backdrop')
const setOpen = (open) => {
  sheet.dataset.open = String(open)
  backdrop.dataset.open = String(open)
  document.body.style.overflow = open ? 'hidden' : ''
}

backdrop.addEventListener('click', () => setOpen(false))
createSheetDrag({ sheet, onDismiss: () => setOpen(false) })
```

뒤로 가기로 닫으려면 열 때 `createBackDismiss`를 부르고, 닫힐 때 반환값을 부른다:

```js
import { createBackDismiss } from './createBackDismiss.js'

let releaseBack
const openSheet = () => {
  setOpen(true)
  releaseBack = createBackDismiss({ onDismiss: () => setOpen(false) })
}
const closeSheet = () => {
  setOpen(false)
  releaseBack?.() // 버튼·백드롭으로 닫혔으면 쌓아 둔 history 항목을 걷는다
}
```

포커스 옮기기·가두기·되돌리기와 Esc는 React 래퍼가 맡는 부분이다. 순수 JS에서는 열 때 시트(`tabindex="-1"`)로 포커스를 옮기고, 닫을 때 열었던 버튼으로 돌려보내는 코드를 함께 쓴다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 내용이 시트 최대 높이(85dvh)를 넘는다 | 시트가 아니라 안쪽 `.sheet-scroll`이 스크롤한다. 시트 자신은 `touch-action: none`이라 손가락으로 굴릴 수 없다. 머리(핸들·제목) 높이를 `--sheet-head-height`(기본 20px)에 적는다. 스크롤 영역에서 시작한 누름은 끌기로 보지 않으므로, 닫을 때는 머리를 잡고 끈다 | `assets` |
| 닫혀 있다 | 시트는 DOM에 남지만 `visibility: hidden`이라 Tab 순서와 스크린 리더에서 빠진다. 닫힘 이동이 끝난 뒤(`--sheet-duration`)에 감춰진다 | `assets` |
| 열리고 닫힌다 | 열리면 포커스가 시트(`tabindex="-1"`)로 가고 Tab은 시트 안에서만 돈다. 닫히면 열었던 요소로 돌아간다. 그 요소가 그사이 사라졌으면(삭제된 행) 돌아갈 곳이 없으므로, 닫는 쪽에서 포커스를 정한다 | `assets`(React) / 사라진 경우는 프로젝트 |
| 시트 안에서 메뉴·자동완성·툴팁을 쓴다 | 안쪽 요소가 이미 쓴 Esc(`defaultPrevented`)로는 시트를 닫지 않는다. 다음 Esc에 닫는다 | `assets`(React) |
| 시트 위에 시트를 연다 | Esc와 Tab은 맨 위 시트만 받는다. 다만 두 시트의 백드롭·시트가 같은 층이라 아래 시트가 어두워지지 않는다. 한 번에 하나만 열고, 다음 시트는 앞 시트를 닫으며 연다 | `assets`(키) / 순서는 프로젝트 |
| 뒤로 가기를 누른다 | `closeOnBack`이면 시트만 닫히고 페이지는 그대로다. 버튼·Esc·백드롭으로 닫으면 쌓아 둔 history 항목을 걷어, 뒤로 가기를 한 번 더 누르게 하지 않는다 | `assets` — `createBackDismiss` |
| 열린 채 화면이 바뀐다 | 시트가 언마운트되며 스크롤 잠금·키 리스너를 푼다. 시트 안의 링크로 넘어갔으면 history는 건드리지 않는다(새 화면에서 뒤로 가 버리지 않는다) | `assets` |
| 뒤 화면에 스크롤바가 있다(데스크톱) | `body`를 `overflow: hidden`으로 잠그고, 스크롤바가 사라져 넓어진 만큼 `padding-right`로 채운다. `position: fixed`인 머리글은 그래도 흔들리므로 `html { scrollbar-gutter: stable }`을 둔다 | `assets`(React) / 고정 요소는 프로젝트 |
| 끄는 중에 브라우저가 포인터를 가져간다 | `pointercancel`(시스템 제스처·전화 수신)이면 닫지 않고 끌기 전 자리로 돌린다. 두 번째 손가락의 움직임은 무시한다 | `assets` |
| 시트 안 입력창에 화면 키보드가 올라온다 | 시트는 화면 아래에 고정이라 키보드에 가린다. `dvh`는 키보드에 반응하지 않는다. `visualViewport`의 높이로 `--sheet-max-height`를 다시 정하거나, 입력이 여러 칸이면 시트 대신 전체 화면으로 옮긴다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 열림/닫힘 속도 | `--sheet-duration` (기본 350ms — 드로어 커브 `cubic-bezier(0.32, 0.72, 0, 1)` 내장) |
| 배경·모서리·최대 높이 | `--sheet-bg`·`--sheet-radius`·`--sheet-max-height` |
| 닫기 임계 거리 | `dismissThresholdPx` (기본 120px) |
| 닫기 임계 속도 | `dismissVelocity` (기본 0.5px/ms — 짧게 끌어도 빠르게 던지면 닫힘) |
| 긴 내용의 머리 높이 | `--sheet-head-height` (기본 20px — 핸들만 있을 때. 제목 줄이 있으면 그 높이를 더한다) |
| 드래그 영역 | `handle` 옵션(코어) — 시트의 일부만 끌 수 있게 한다. 스크롤되는 안쪽 영역은 지정하지 않아도 끌기에서 빠진다 |
| 스냅 포인트 | `snapOffsetsPx` — 예: `[0, 260]`(전체 열림·반열림). 마지막 스냅에서 시작해 드래그로 오가고, 마지막 스냅 아래로 끌면 닫힌다. 0을 반드시 포함 |

## 함께 쓰는 패턴

- `patterns/modal-dialog` — 시트에서 고른 동작의 확인창. 모달은 맨 위 층에 뜨므로 시트 위에 보인다. 반대로 모달 안에서 시트를 열면 시트가 모달 뒤에 깔려 눌리지 않는다. 모달을 닫으며 시트를 연다.
- `patterns/dropdown-menu` — 시트 안 행의 `⋯` 메뉴. 메뉴는 맨 위 층에 뜨므로 시트의 `transform`·`overflow`에 잘리지 않는다. 메뉴에서 누른 Esc는 메뉴만 닫는다.

## 주의사항

- **누른 뒤 8px 움직여야 끌기로 본다** — 누르는 순간 포인터를 잡으면(`setPointerCapture`) 브라우저가 뒤따르는 click을 시트로 넘겨 시트 안 버튼(장바구니 담기·바로 구매)이 눌리지 않는다. 코어를 고칠 때 이 순서를 지킨다.
- 시트의 `touch-action: none`은 모바일에서 페이지 스크롤과의 경합을 막는다 — 제거 금지. 안쪽 스크롤 영역(`.sheet-scroll`)은 `touch-action: pan-y`로 따로 푼다.
- 안쪽 목록이 맨 위에 닿은 채 더 끌어내려도 시트가 따라 내려오지 않는다. 목록 끌기와 시트 끌기를 잇지 않았다. 닫는 길은 머리 끌기·백드롭·Esc·뒤로 가기다.
- **reduced-motion 대응 내장** — 이동 대신 짧은 페이드로 완화. 블록 제거 금지.
- 스크롤 잠금은 `body`에 건다. `html`에 `overflow`를 직접 준 프로젝트에서는 `body`의 값이 화면에 닿지 않아 잠기지 않는다. 그때는 `html`을 잠근다. iOS 사파리의 고무줄 스크롤까지 완전히 막으려면 별도 처리가 필요하다(이 패턴 범위 밖).
- Tab을 가두는 방식은 "처음과 끝에서 반대편으로 넘기기"다. 시트 밖 요소를 `inert`로 만들지는 않으므로 스크린 리더의 읽기 커서는 시트 밖으로 나갈 수 있다(`aria-modal="true"`를 따르는 리더는 나가지 않는다).
- 사파리는 버튼을 눌러도 그 버튼에 포커스를 주지 않는다. 그래서 닫힌 뒤 포커스가 연 버튼이 아니라 그전에 포커스가 있던 곳으로 돌아간다.
- `closeOnBack`은 history에 주소가 같은 항목을 하나 쌓는다. 같은 주소의 `popstate`에 데이터를 다시 불러오는 라우터에서는 닫을 때마다 그 동작이 돈다. 그런 프로젝트는 라우터의 방식(쿼리 문자열·해시로 열림 상태 두기)으로 대신한다. 뒤로 가기로 닫은 뒤 앞으로 가기를 눌러도 시트는 다시 열리지 않는다.
- 스냅 포인트 사용 시 `--sheet-max-height`가 충분히 커야 반열림에서도 콘텐츠가 걸쳐 보인다 — 시트 높이가 스냅 오프셋보다 작으면 반열림이 의미를 잃는다.
