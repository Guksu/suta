---
name: pull-to-refresh
description: 목록·피드를 맨 위에서 아래로 당기면 새로고침하는 pull to refresh 제스처(당김 저항·스피너·복귀)를 구현한다. "당겨서 새로고침, 위에서 당기면 새로고침, 끌어내리면 다시 불러오기, 피드 당김 갱신, 끌어내려 리로드" 요청에 쓴다. 기존 적용분의 당김 임계값·저항 수정에도 쓴다.
---

# pull-to-refresh — 당겨서 새로고침

라이브 데모: https://guksu.github.io/suta/#/pull-to-refresh

## 언제 쓰는가

피드·목록 화면에서 최상단을 아래로 당겨 콘텐츠를 갱신하는 모바일 관례. 당길수록 무거워지는 고무줄 저항과, 임계를 넘겼을 때의 스피너가 "놓으면 새로고침된다"를 몸으로 알려준다.

**기술 선택:** 포인터 이벤트 + CSS transition, 라이브러리 없음. 코어는 당김 추적·저항 계산(지수 감쇠)·임계 판정만 하고, 진행률을 `--pull-progress`(0~1)와 `data-refreshing`으로 노출한다 — 인디케이터가 어떻게 생겼는지는 전적으로 CSS 몫이라 스피너를 마음대로 갈아 끼울 수 있다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createPullToRefresh.ts` | 코어 — 당김 추적·저항·판정 | 모든 프로젝트 |
| `assets/pull-to-refresh.css` | 인디케이터·복귀 이동 정의 | 모든 프로젝트 |
| `assets/PullToRefresh.tsx` | React 래퍼 (Promise 연동) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다.

## 사용 방법 — React

```tsx
import { PullToRefresh } from './PullToRefresh'

const Feed = ({ reload }: { reload: () => Promise<void> }) => (
  <PullToRefresh onRefresh={reload} className="feed-scroll">
    <ul>…피드 항목…</ul>
  </PullToRefresh>
)
```

`onRefresh`가 반환한 Promise가 끝나면 인디케이터가 복귀한다.

## 사용 방법 — 순수 JS (React 없음)

마크업 구조(컨테이너 > 인디케이터 + 콘텐츠)를 만들고 코어를 붙인다:

```js
import { createPullToRefresh } from './createPullToRefresh.js'

createPullToRefresh({
  container: document.querySelector('.ptr-container'),
  content: document.querySelector('.ptr-content'),
  onRefresh: async (done) => {
    await reloadFeed()
    done() // 반드시 호출 — 잊으면 스피너가 영원히 돈다
  },
})
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 터치로 당긴다 | 컨테이너가 스크롤 상자라 브라우저는 손가락이 움직이면 스크롤로 보고 포인터를 가져간다. 코어는 `touchmove`를 `passive: false`로 듣고, 맨 위(`scrollTop` 0)에서 아래로 가는 움직임만 `preventDefault()`로 막는다. 위로 굴리는 손가락은 막지 않는다 | `assets` |
| 목록 안에 가로로 넘기는 줄이 있다 | 처음 6px에서 가로가 더 크면 당김으로 보지 않는다. 가로 줄은 평소대로 넘어간다 | `assets` |
| 당기는 중에 브라우저가 포인터를 가져간다 | `pointercancel`(시스템 제스처·전화 수신)이면 임계를 넘겼어도 새로고침하지 않고 제자리로 돌린다. 두 번째 손가락의 움직임은 무시한다 | `assets` |
| 새로고침이 도는 중이다 | 컨테이너에 `data-refreshing="true"`와 `aria-busy="true"`가 붙는다. 그동안 새 당김은 받지 않는다. 목록은 그대로 스크롤된다 | `assets` |
| 새로고침이 실패한다 | 스피너는 내려간다(React 래퍼는 `finally`로 끝낸다). 목록은 옛 내용 그대로 두고, 실패는 토스트 한 줄로 알린다. 목록을 비우지 않는다 | `assets`(복귀) / 알림은 프로젝트 |
| 응답이 아주 빨리 온다 | 스피너가 한 번 깜빡이고 올라간다. 눈에 거슬리면 `onRefresh`에서 최소 400ms를 기다린 뒤 끝낸다 | 프로젝트 |
| 새 글이 없다 | 화면이 그대로면 당김이 먹었는지 알 수 없다. "새 글이 없어요" 토스트나 마지막 갱신 시각을 둔다 | 프로젝트 |
| 목록이 0개다 | 컨테이너에 높이가 있어야 당길 곳이 생긴다. 빈 상태 안내를 `.ptr-content` 안에 두고 컨테이너 높이를 정한다(`min-height`나 고정 높이) | 프로젝트 |
| 키보드·화면 낭독기만 쓴다 | 당김은 포인터로만 된다. 스크롤 상자는 `tabIndex=0`이라 방향키로 굴릴 수 있을 뿐이다. 같은 `onRefresh`를 부르는 "새로고침" 버튼을 화면 머리에 함께 둔다 | 프로젝트 |
| 당기는 중이나 도는 중에 화면이 바뀐다 | 해제 함수가 리스너를 걷고 끌던 자리(`transform`·`transition`)를 지운다. 뒤늦게 온 `done()`은 아무 일도 하지 않는다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 판정 거리 | `thresholdPx` (기본 70px) |
| 최대 당김 | `maxPx` (기본 threshold×2 — 고무줄이 점근하는 한계) |
| 인디케이터 모양 | `.ptr-indicator` 내용물 교체 — 진행률은 `--pull-progress`로 온다 |
| 복귀 속도 | `--ptr-duration` (기본 300ms) |
| 영역 이름 | `label` — 주면 스크롤 상자가 이름 있는 영역(region)이 된다. 상자는 늘 키보드 초점을 받는다(`tabIndex=0`) |

## 함께 쓰는 패턴

- `patterns/infinite-scroll` — 위로는 당겨서 새로고침, 아래로는 이어 불러오기. 새로고침이 끝나면 이어 불러온 쪽의 페이지 번호도 처음으로 되돌린다.
- `patterns/toast-stack` — 새로고침 실패와 "새 글이 없어요"를 알린다. 목록 자리를 오류 화면으로 바꾸지 않는다.
- `patterns/skeleton` — 첫 불러오기에 쓴다. 당겨서 새로고침하는 동안에는 뼈대로 바꾸지 않고 옛 목록을 그대로 둔다.

## 주의사항

- **`done()`(또는 Promise 종료)을 잊으면 스피너가 영원히 돈다** — 실패 경로에서도 반드시 끝낸다. React 래퍼는 `onRefresh`가 던지거나 거절돼도 `finally`로 끝낸다.
- `overscroll-behavior: contain`은 브라우저 자체 당김 새로고침과의 충돌을 막는다 — 제거 금지.
- 모바일 브라우저 자체의 pull-to-refresh(크롬 안드로이드)와 이중이 될 수 있다 — 페이지 전체에 쓸 때는 브라우저 쪽을 끄는 정책(`overscroll-behavior-y: contain`을 body에)과 함께 검토한다.
- 당김은 손가락을 댈 때 `scrollTop`이 0이어야 시작한다. 내려가 있던 목록을 한 번에 끌어올려 맨 위에 닿아도 그 손가락으로는 당겨지지 않는다. 손을 떼고 다시 당긴다.
- 스피너 회전은 상태 표시이므로 reduced-motion에서도 유지한다(복귀 이동만 즉시로 완화).
- 데스크톱에서는 마우스 드래그로 동작한다. 끄는 동안 글자가 선택되므로 컨테이너에 `user-select: none`을 주거나, 데스크톱에서는 당김을 붙이지 않고 새로고침 버튼만 둔다.
