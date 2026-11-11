---
name: zoom-lightbox
description: 썸네일을 누르면 그 요소가 화면 가운데로 커지는 라이트박스(lightbox) 확대 전환을 구현한다. "라이트박스, 이미지 크게 보기, 썸네일 클릭하면 확대, 갤러리 사진 크게 보기, 이미지 확대 보기 전환" 요청과 갤러리·상세 이미지 UI에 쓴다. 기존 적용분의 확대 크기·속도 수정에도 쓴다.
---

# zoom-lightbox — 확대 전환 라이트박스

라이브 데모: https://guksu.github.io/suta/#/zoom-lightbox

## 언제 쓰는가

갤러리 썸네일·상품 이미지를 눌러 크게 볼 때. 팝업이 "따로 뜨는" 게 아니라 **누른 썸네일 그 자체가 커지는 것처럼** 보이는 전환(공유 요소 전환의 최소형) — 출발지와 도착지가 시각적으로 이어져 맥락이 끊기지 않는다.

**기술 선택:** 썸네일 복제(고스트)를 제자리에 띄우고 화면 중앙 확대 크기로 transform 전환한다(FLIP의 확대판). transform·opacity만 사용, 닫으면 역방향으로 제자리 복귀 후 자체 정리. 라이브러리 불필요.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/openZoom.ts` | 코어 — 고스트 생성·확대/복귀·정리 | 모든 프로젝트 |
| `assets/createBackDismiss.ts` | 뒤로 가기로 닫기(`closeOnBack`) — 코어가 import한다 | 모든 프로젝트 |
| `assets/zoom-lightbox.css` | 백드롭·포커스 링·커서 정의 | 모든 프로젝트 |

React 래퍼는 없다 — 코어를 클릭 핸들러에서 직접 부르면 끝이라 래퍼가 더할 것이 없다. TS가 아닌 프로젝트는 타입을 벗겨 .js로 저장한다.

## 사용 방법 — React

```tsx
import { openZoom } from './openZoom'
import './zoom-lightbox.css'

const Gallery = ({ images }: { images: string[] }) => (
  <div className="gallery">
    {images.map((src) => (
      <img
        key={src}
        src={src}
        className="zoomable"
        alt=""
        onClick={(event) => openZoom({ source: event.currentTarget })}
      />
    ))}
  </div>
)
```

## 사용 방법 — 순수 JS (React 없음)

```js
import { openZoom } from './openZoom.js'

document.querySelectorAll('.gallery img').forEach((img) => {
  img.classList.add('zoomable')
  img.addEventListener('click', () => openZoom({ source: img }))
})
```

백드롭 클릭·Esc로 닫히고, `openZoom`이 돌려준 함수로 프로그램적으로도 닫을 수 있다. 썸네일이 `<img>`면 키보드로 열 수 없다. 누를 수 있는 썸네일은 `<button>`으로 감싸고 그 버튼을 `source`로 넘긴다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 썸네일을 더블 클릭하거나, 열려 있는데 코드에서 또 부른다 | 확대본은 한 장만 열린다. 더블 클릭의 두 번째 클릭(`event.detail` 2)은 방금 깔린 백드롭에 떨어져도 닫지 않는다. 두 번째 호출은 열려 있는 확대본의 닫기 함수를 돌려준다 | `assets` — `openZoom` |
| 열리는 도중에 닫는다 | 다음 프레임에 정리된다. 백드롭과 스크롤 잠금이 남지 않는다 | `assets` — `openZoom` |
| 키보드·스크린 리더로 쓴다 | 열리면 포커스가 백드롭으로 간다. 백드롭은 화면 전체를 덮는 `<button aria-label="닫기">`다. Esc·Enter·Space로 닫히고 Tab은 뒤 화면으로 나가지 않는다. 닫히면 포커스가 누른 썸네일로 돌아온다 | `assets` — `openZoom`. 낭독 이름은 `closeLabel` |
| 복제본(고스트)에 버튼·id가 들어 있다 | 고스트는 `aria-hidden="true"`·`inert`이고 루트의 `id`를 뗀다. Tab 순서와 낭독에 두 번 나오지 않는다 | `assets` — `openZoom`. 안쪽 요소의 `id`는 그대로 복제되므로 썸네일 안에는 `id`를 두지 않는다 |
| 열린 채 화면을 돌리거나 창 크기를 바꾼다 | 전이 없이 새 화면의 가운데·새 배율로 다시 놓인다. 닫으면 썸네일의 새 자리로 돌아간다 | `assets` — `openZoom` |
| 뒤로 가기를 누른다 | `closeOnBack: true`면 페이지를 떠나지 않고 확대본만 닫힌다. 기본은 꺼져 있다 | `assets` — `createBackDismiss` |
| 스크롤바가 자리를 차지하는 화면(데스크톱) | 스크롤을 잠그며 사라진 스크롤바 폭만큼 `body`의 `padding-right`를 채운다. 뒤 화면이 옆으로 밀리지 않는다 | `assets` — `openZoom` |
| 열린 채 화면이 바뀐다(라우트 이동·컴포넌트 언마운트) | 백드롭은 `body`에 붙어 있어 저절로 사라지지 않는다. 정리 함수에서 돌려받은 닫기 함수를 부른다 | `프로젝트` |
| 썸네일이 숨겨져 크기가 0이다 | 열지 않는다. 아무것도 하지 않는 함수를 돌려준다 | `assets` — `openZoom` |
| 탭이 가려져 `transitionend`가 오지 않는다 | `durationMs` + 200ms 뒤에 정리된다 | `assets` — `openZoom` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 전환 속도 | `durationMs` (기본 350ms) |
| 최대 크기 | `maxViewportRatio` (기본 0.9 — 뷰포트의 90%까지) |
| 배경 | `--zoom-backdrop` (기본 검정 80%) |
| 닫기 버튼 낭독 이름 | `closeLabel` (기본 '닫기' — 영어 화면이면 'Close') |
| 뒤로 가기로 닫기 | `closeOnBack` (기본 false) |
| 겹치는 순서 | `--z-viewer` (기본 90) — 고스트는 그 값 + 1에 놓인다 |
| 닫힌 뒤 처리 | `onClose` 콜백 |

## 함께 쓰는 패턴

- `patterns/pinch-zoom` — 확대본을 두 손가락으로 더 키우고 끌어 봐야 할 때. 이 패턴의 고스트는 조작을 받지 않으므로 확대·이동이 필요한 사진에는 그 패턴을 쓴다.
- `patterns/swipe-dismiss-viewer` — 사진을 아래로 끌어 닫거나 옆으로 넘겨 다음 사진을 보는 전체 화면 뷰어. 이 패턴은 사진 한 장을 잠깐 크게 보는 데까지다.
- `patterns/card-expand` — 커진 뒤에 글·버튼이 있는 상세 화면이 되어야 할 때.

## 주의사항

- **고스트는 복제본이다** — 원본이 저해상도 썸네일이면 확대본도 흐리다. 고해상도가 필요하면 원본 `src`를 큰 이미지로 두고 썸네일은 CSS 크기로 줄여라(또는 srcset).
- 텍스트·버튼이 든 카드도 확대할 수 있지만 고스트는 `inert`라 내부 조작은 안 된다 — 조작이 필요한 상세라면 `patterns/card-expand`를 쓴다.
- 스크롤 잠금은 `body`의 `overflow: hidden`이다. iOS Safari는 이 잠금을 무시하고 뒤 화면을 스크롤할 수 있다. 그때 닫으면 고스트가 열 때의 자리로 돌아간다.
- `closeOnBack`은 history에 항목을 하나 쌓는다. 주소는 바뀌지 않는다.
- 동작 줄이기에서는 이동 전환 없이 즉시 확대본이 뜬다. CSS의 `prefers-reduced-motion` 블록을 지우지 않는다.
