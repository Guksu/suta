---
name: like-pop
description: 좋아요 하트가 토글 시 튀어오르고 게시물을 더블탭(double tap like)하면 큰 하트가 팡 터지는 인스타그램식 반응 애니메이션을 구현한다. "좋아요 애니메이션, 하트 튀게, 하트 효과, 두 번 두드리면 하트, 더블탭 좋아요, 하트 팡 터지는 효과" 요청과 피드·게시물·상품 카드의 좋아요 버튼에 쓴다. 기존 적용분의 하트 색·크기·더블탭 판정 시간 수정에도 쓴다.
---

# like-pop — 좋아요 팝 + 더블탭 버스트

라이브 데모: https://guksu.github.io/suta/#/like-pop

## 언제 쓰는가

좋아요·찜·하트 토글에 반응 피드백을 줄 때. 두 가지를 담는다: ① 버튼 하트가 움츠렸다 튀어오르는 **팝**, ② 콘텐츠를 더블탭하면 탭 지점에 큰 하트가 떠올랐다 사라지는 **버스트**(인스타그램 피드·당근 찜의 관례).

**기술 선택:** 팝·버스트는 CSS keyframes(원샷 연출이므로 transition이 아니라 keyframes가 맞다 — transform/opacity만 사용). 더블탭 판정만 JS 코어다 — `dblclick` 이벤트는 모바일 지원이 일관되지 않고 판정 시간을 조절할 수 없어 click 두 번을 직접 판정한다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createDoubleTap.ts` | 코어 — 더블탭 판정(시간·이동 허용치) | 모든 프로젝트 |
| `assets/like-pop.css` | 팝·버스트 애니메이션 정의 | 모든 프로젝트 |
| `assets/LikeButton.tsx` + `assets/DoubleTapArea.tsx` | React 래퍼 | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { LikeButton } from './LikeButton'
import { DoubleTapArea } from './DoubleTapArea'

const Post = ({ image }: { image: string }) => {
  const [liked, setLiked] = useState(false)

  return (
    <article>
      <DoubleTapArea onDoubleTap={() => setLiked(true)}>
        <img src={image} alt="" draggable={false} />
      </DoubleTapArea>
      <LikeButton liked={liked} onChange={setLiked} count={128} />
    </article>
  )
}
```

## 사용 방법 — 순수 JS (React 없음)

버튼 팝은 `aria-pressed`만 갈아 끼우면 CSS가 반응한다. 이미 좋아요인 채로 그리는 버튼에는 `data-pop="false"`를 달아 두고, 누를 때 그 속성을 뗀다(`button.removeAttribute('data-pop')`). 달지 않으면 화면이 열릴 때 좋아요인 하트가 모두 튄다. 버스트는 더블탭 지점에 하트 요소를 만들고 애니메이션 종료 시 제거한다:

```js
import { createDoubleTap } from './createDoubleTap.js'

const area = document.querySelector('.double-tap-area')
createDoubleTap({
  element: area,
  onDoubleTap: ({ x, y }) => {
    const rect = area.getBoundingClientRect()
    const heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    heart.setAttribute('class', 'burst-heart')
    heart.setAttribute('viewBox', '0 0 24 24')
    heart.innerHTML = '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>'
    heart.style.left = `${x - rect.left}px`
    heart.style.top = `${y - rect.top}px`
    heart.addEventListener('animationend', () => heart.remove())
    area.appendChild(heart)
  },
})
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 이미 좋아요인 채로 그려진다(목록을 열 때, 스크롤로 행이 다시 그려질 때) | 하트가 튀지 않는다. 팝은 그려진 뒤에 좋아요로 바뀐 순간에만 재생된다. 버튼을 눌렀든 더블탭으로 바뀌었든 같다 | `assets` — `LikeButton`이 `data-pop="false"`를 달았다 뗀다. 순수 JS는 `프로젝트` |
| 빠르게 여러 번 누른다 | 누를 때마다 `onChange`가 불리고, 좋아요가 될 때마다 팝이 처음부터 다시 재생된다. 서버에는 마지막 상태만 보낸다(300~500ms 모아서 한 번). 수는 누른 즉시 바꾸고, 실패하면 되돌린 뒤 토스트로 알린다 | 팝은 `assets`. 요청 묶기·되돌리기는 `프로젝트` |
| 이미 좋아요인 사진을 더블탭한다 | 큰 하트는 다시 뜨고 상태는 그대로다. `onDoubleTap`에서 `setLiked(true)`만 하면 값이 같아 요청이 다시 나가지 않는다. 더블탭으로 취소하지 않는다 | 하트는 `assets`. 요청은 `프로젝트` |
| 더블탭 영역 안에 한 번 탭의 동작이 있다(상세로 이동·영상 재생) | 첫 탭에 그 동작이 먼저 실행된다. 한 번 탭의 동작을 `thresholdMs`(300ms)만큼 늦추고, 그 안에 두 번째 탭이 오면 취소한다. 영역 안의 글자는 선택되지 않는다(`user-select: none`) | `프로젝트` |
| 좋아요 수가 0이다, 크다, 자릿수가 바뀐다 | `count={0}`이면 "0"을 그린다. 숨기려면 `count`를 넘기지 않는다. 큰 수는 `formatCount`로 줄인다(1.2만). 숫자는 고정폭(`tabular-nums`)이다 | `assets`. 줄이는 규칙은 `프로젝트` |
| 화면 낭독기·키보드로 쓴다 | 버튼 이름은 "좋아요 1,280"처럼 수까지 읽힌다(`aria-label`이 안쪽 글자를 덮으므로 이름에 넣는다). 상태는 `aria-pressed`가 알린다. 더블탭은 키보드로 할 수 없으므로 좋아요 버튼을 늘 함께 둔다 | `assets`. 버튼을 두는 일은 `프로젝트` |
| 로그인하지 않았다, 요청이 진행 중이다 | 버튼을 `disabled`로 끄지 않는다(이유를 알 수 없다). 로그인이 필요하면 누를 때 로그인으로 보내고 `liked`는 바꾸지 않는다. `LikeButton`에는 `disabled` prop이 없다 | `프로젝트` |
| 큰 하트가 끝나기 전에 또 더블탭한다, 애니메이션이 꺼져 있다 | 하트가 탭마다 하나씩 뜨고 각자 900ms 뒤에 지워진다. `animationend`가 오지 않는 화면(`animation: none` 초기화 CSS, 가려진 영역)에서도 1,200ms 뒤에는 지워져 사진 위에 남지 않는다 | `assets` — `DoubleTapArea`. 순수 JS는 `프로젝트` |
| 사진 가장자리를 더블탭한다 | 하트는 탭한 자리가 가운데라 절반이 영역 밖으로 나간다. 카드 모서리가 둥글면 `.double-tap-area`에 `overflow: hidden`을 준다 | `프로젝트` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 하트 색 | `--like-color` (기본 #ff3040 — 인스타그램 계열) |
| 팝 시간 | `--like-pop-duration` (기본 400ms) |
| 버스트 크기 | `--burst-size` (기본 96px) |
| 더블탭 판정 시간 | `thresholdMs` (기본 300ms — 시스템 더블클릭 관례) |
| 이동 허용치 | `maxDistancePx` (기본 24px — 넘으면 스와이프로 보고 무시) |
| 화면 낭독 문구 | `labels` — `{ like, unlike }` (기본 "좋아요"·"좋아요 취소". 다른 언어면 넘긴다) |
| 수의 표시 | `formatCount` — `(count) => string` (기본 천 단위 구분) |

## 함께 쓰는 패턴

- `patterns/toast-stack` — 좋아요 요청이 실패해 되돌릴 때 한 줄로 알린다. 성공에는 토스트를 띄우지 않는다(하트가 이미 알렸다).
- `patterns/carousel` — 사진 여러 장을 넘기는 게시물. 더블탭 영역을 캐러셀 바깥에 씌운다. 두 탭이 24px(`maxDistancePx`) 넘게 떨어지면 더블탭으로 치지 않는다.
- `patterns/count-up` — 좋아요 수에는 쓰지 않는다. 1씩 바뀌는 수는 굴리지 않고 바로 바꾼다.

## 주의사항

- **reduced-motion 대응 내장** — 확대·이동을 끄고 불투명도 페이드만 남긴다. 블록 제거 금지.
- `double-tap-area`에는 `touch-action: manipulation`이 걸려 있다 — 없으면 모바일에서 더블탭이 브라우저 확대로 먹힌다. 제거 금지.
- 더블탭은 항상 "좋아요 설정"이다(토글 아님) — 인스타그램 관례. 취소는 버튼으로만.
- 이미지 위에서 쓸 때는 `draggable={false}`로 드래그를 막아야 두 번째 탭이 유실되지 않는다.
- 좋아요 버튼의 누르는 영역은 44px 아래로 내려가지 않는다(`min-width`·`min-height`). 하트를 키우려면 버튼의 `font-size`를 바꾼다(하트는 1.6em).
- 고대비 모드에서 하트의 윤곽선은 글자색을 따라가고, 좋아요 상태는 채워진 모양으로 구별된다. 색만으로 상태를 알리지 않는다.
