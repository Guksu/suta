---
name: pinch-zoom
description: 피드 이미지를 두 손가락으로 벌려 확대하는 핀치줌(pinch to zoom)을 구현한다 — 손가락 중점 기준으로 커지고 따라 움직이며 배경이 어두워지고, 놓으면 제자리로 돌아온다(확대 유지 없음). "핀치줌, 핀치 확대, 두 손가락 확대, 사진 벌려서 키우기, 인스타처럼 피드 사진 확대, 놓으면 돌아오는 확대" 요청과 모바일 피드·갤러리 이미지의 잠깐 보기 확대에 쓴다. 기존 적용분의 최대 배율·딤·복귀 속도 수정에도 쓴다.
---

# pinch-zoom — 피드 핀치줌

라이브 데모: https://guksu.github.io/suta/#/pinch-zoom

## 언제 쓰는가

인스타그램 피드에서 사진을 두 손가락으로 벌리면 **화면 전환 없이 그 자리에서** 사진이 커진다 — 손가락 중점이 확대 원점이고, 손가락을 옮기면 사진도 따라오며, 뒤 피드는 어두워지고, 손을 떼면 원래 크기·위치로 돌아온다. 확대가 유지되지 않는 "잠깐 들여다보기"라 별도 화면·닫기 버튼이 없다. 확대를 유지하고 넘겨 보는 갤러리는 `zoom-lightbox` 패턴이 맞다.

**기술 선택:** 터치 이벤트 + 인라인 transform + CSS transition 복귀. 두 손가락 거리 비율이 배율, 중점 이동이 평행이동이며(`pinchCore.ts` 순수 계산), 시작 중점을 `transform-origin`으로 잡아 손가락 사이가 확대 중심이 되게 한다. 터치 이벤트를 쓰는 이유: 포인터 이벤트는 브라우저가 두 손가락 제스처를 가로채면 `pointercancel`로 끊기지만, `touchmove`를 `passive: false`로 등록하면 우리가 취소권을 갖고 페이지 확대를 막을 수 있다. 한 손가락은 건드리지 않아(`touch-action: pan-y`) 세로 스크롤이 그대로 된다. 라이브러리 없음.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/pinchCore.ts` | 배율·이동·딤 진행도 순수 계산 | 모든 프로젝트 |
| `assets/createPinchZoom.ts` | 터치 처리 코어 (시작/추종/복귀) | 모든 프로젝트 |
| `assets/pinch-zoom.css` | 복귀 전이·z-index 승격·배경 딤 | 모든 프로젝트 |
| `assets/PinchZoom.tsx` | React 래퍼 | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { PinchZoom } from './PinchZoom'

const FeedItem = ({ post }) => (
  <article className="post">
    <header>{post.author}</header>
    <PinchZoom maxScale={4}>
      <img src={post.image} alt={post.alt} draggable={false} />
    </PinchZoom>
    <p>{post.caption}</p>
  </article>
)
```

- 자식은 확대될 콘텐츠 하나(`<img>`)다. 캡션·버튼은 밖에 둔다 — 같이 커진다.
- 확대 중 다른 UI를 숨기거나 스크롤을 잠그고 싶으면 `onChange={({ active }) => …}`를 쓴다. 배율은 매 이동마다 오니 React state로 올리지 말 것.

## 사용 방법 — 순수 JS (React 없음)

```html
<div class="pinch">
  <div class="pinch-target"><img src="noodle.jpg" alt="들깨칼국수" draggable="false" /></div>
  <div class="pinch-backdrop" aria-hidden="true"></div>
</div>
```

```js
import { createPinchZoom } from './createPinchZoom.js'

const element = document.querySelector('.pinch')
const destroy = createPinchZoom({ element, target: element.querySelector('.pinch-target'), maxScale: 4 })
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 한 손가락으로 스크롤하다 두 번째 손가락이 닿는다 | 그 순간부터 핀치다. 두 손가락 이동은 `preventDefault()`로 막아 페이지가 스크롤·확대되지 않는다 | `assets` |
| 핀치 중에 한 손가락을 뗀다 | 곧바로 제자리로 돌아간다. 한 손가락이 사진 밖에 있었어도 돌아간다(그 손가락의 `touchend`는 창에서 듣는다) | `assets` |
| 벌리지 않고 옮기기만 했다 | 배율이 1이어도 복귀 전이(`--pinch-duration`, 300ms)를 거친다. 전이가 끝날 때까지 `data-zooming="settling"`으로 형제 카드 위에 남는다 | `assets` |
| 전화 수신·시스템 제스처로 터치가 끊긴다 | `touchcancel`도 손을 뗀 것과 같이 제자리로 돌린다. 확대는 유지되는 상태가 아니라 잃을 것이 없다 | `assets` |
| 원본보다 작게 오므린다 | 배율은 1 아래로 내려가지 않는다. 최대는 `maxScale`(기본 4)에서 멈추고 고무줄 저항은 없다 | `assets` |
| 동작 줄이기를 켰다 | 손가락 추종은 그대로다. 복귀 전이가 없으므로 500ms 폴백을 기다리지 않고 `data-zooming`을 바로 걷는다 | `assets` |
| 확대 중에 화면이 바뀐다 | 해제 함수가 `transform`·`transform-origin`·`data-zooming`·`--pinch-progress`를 지운다 | `assets` |
| 마우스·키보드·화면 낭독기로 쓴다 | 핀치는 터치 전용이다. 트랙패드 핀치(`ctrl` + 휠)도 받지 않는다. 사진을 눌러 크게 보는 길(`patterns/zoom-lightbox`)을 함께 두고, `<img>`에 `alt`를 적는다 | 프로젝트 |
| 사진 해상도가 낮다 | 4배로 키우면 흐려진다. 화면에 그리는 폭의 2배 이상인 원본을 쓰거나 `maxScale`을 3 아래로 낮춘다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 최대 배율 | `maxScale` (4 — 사진 해상도가 낮으면 3) |
| 딤 세기·시점 | `--pinch-dim`(0.8), `dimAtScale`(2 — 이 배율에서 최대 딤) |
| 복귀 속도 | `--pinch-duration` (300ms) |
| 쌓임 순서 | `--pinch-z` (50 — 확대 중 형제 카드 위로 올라오는 z-index) |

## 함께 쓰는 패턴

- `patterns/zoom-lightbox` — 사진을 눌러 크게 보고 확대를 유지하는 길. 데스크톱과 키보드 사용자는 이쪽으로 본다. 피드에서는 핀치(잠깐 보기)와 탭(크게 보기)을 함께 둔다.
- `patterns/like-pop` — 같은 사진에 두 번 탭 좋아요를 붙여도 다투지 않는다. 핀치는 두 손가락, 두 번 탭은 한 손가락이다.
- `patterns/carousel` — 넘기는 사진 묶음 안에 넣을 때. `.pinch`의 `touch-action: pan-y`는 사진 위의 가로 넘기기를 막으므로 `pan-x pan-y`로 바꾼다.

## 주의사항

- **조상에 `overflow: hidden`이 있으면 확대된 사진이 잘린다** — 카드 둥근 모서리는 카드가 아니라 이미지에 `border-radius`를 준다. 조상에 `transform`·`filter`가 있으면 스태킹 컨텍스트가 생겨 형제 카드 위로 올라오지 못하고, 배경 딤(`position: fixed`)도 어긋난다.
- `<img draggable={false}>`를 권장한다 — 데스크톱에서 이미지 드래그 고스트가 뜨는 것을 막는다. 
- 확대 중 페이지가 스크롤되면 `getBoundingClientRect` 기준 원점이 어긋난다 — `touchmove`를 preventDefault하므로 두 손가락 중에는 스크롤이 일어나지 않는다. 이 preventDefault를 빼면 페이지 확대와 사진 확대가 동시에 일어난다.
- 확대 중에는 사진과 배경 딤이 `--pinch-z`(기본 50) 층으로 올라와 고정 머리글(`--z-sticky`)도 덮는다. 의도한 동작이다. 머리글을 위에 남기려면 머리글의 `z-index`를 그보다 높인다.
- **reduced-motion 대응 내장** — 손가락 추종은 조작이라 유지하고, 복귀·딤 페이드만 즉시로 바꾼다. 블록 제거 금지.
