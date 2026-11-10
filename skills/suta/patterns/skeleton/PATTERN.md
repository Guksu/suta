---
name: skeleton
description: 로딩 중 콘텐츠 자리를 잡아주는 스켈레톤 UI(skeleton loader)와 시머(반짝임) 애니메이션을 구현한다. "스켈레톤, 로딩 뼈대, 플레이스홀더, 시머 효과, 회색 박스가 반짝거리는 로딩, 데이터 불러오는 동안 자리 표시" 요청과 fetch 대기 UI에 쓴다. 기존 적용분의 반짝임 속도·색·형태 수정에도 쓴다.
---

# skeleton — 스켈레톤 시머

라이브 데모: https://guksu.github.io/suta/#/skeleton

## 언제 쓰는가

데이터를 기다리는 동안 실제 콘텐츠와 같은 자리·크기의 뼈대를 보여줄 때. 스피너와 달리 "무엇이 어디에 나타날지"를 미리 보여줘 체감 대기 시간을 줄이고, 로드 완료 시 레이아웃 이동(CLS)이 없다. 토스·당근·배민·인스타그램 전부 목록/카드 로딩에 쓴다.

**기술 선택:** 모양은 순수 CSS다. 시머는 `::after` 오버레이의 `translateX`만 움직여 GPU 합성으로 처리된다(`background-position` 애니메이션은 페인트를 유발하므로 쓰지 않는다). 언제 띄우고 언제 내릴지는 의존성 0인 코어(`createSkeletonGate`)가 타이머 두 개로 정한다. 응답이 빠를 때 뼈대가 깜빡이는 문제는 CSS로 풀 수 없기 때문이다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/skeleton.css` | 모양 전부 — 시머·형태 변형·reduced-motion·고대비 | 모든 프로젝트 |
| `assets/createSkeletonGate.ts` | 코어 — 늦게 띄우기(200ms)·최소 유지(400ms) | 모든 프로젝트 |
| `assets/useSkeletonGate.ts` | React 훅 | React 프로젝트만 |
| `assets/Skeleton.tsx` | React 편의 래퍼(로직 없음) | React 프로젝트만(선택) |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다.

## 사용 방법

1. `assets/skeleton.css`를 복사한다(반드시 읽어라 — 모양의 전체 구현이 이 파일이다).
2. 로딩 중일 때 실제 콘텐츠와 **같은 크기**의 요소에 `skeleton` + 형태 클래스를 붙인다:
   - `skeleton-text` — 글줄. 한 줄이 그 자리의 `line-height` 한 줄만큼 자리를 차지한다. 연속으로 두면 마지막 줄이 짧아진다
   - `skeleton-circle` — 아바타 (aspect-ratio 1)
   - (기본) — 사각형 썸네일·카드
3. 스켈레톤 묶음의 컨테이너에 `aria-busy="true"`를 달고, 로드 완료 시 실제 콘텐츠로 교체한다.
4. 뼈대를 그릴지는 로딩 값 그대로가 아니라 문지기(`createSkeletonGate`)에게 묻는다. 로딩이 200ms를 넘길 때만 뼈대가 뜨고, 뜬 뼈대는 400ms를 채운 뒤 내려간다.

```html
<!-- 순수 HTML/JS -->
<article aria-busy="true">
  <div class="skeleton skeleton-circle" style="width: 48px"></div>
  <div class="skeleton skeleton-text"></div>
  <div class="skeleton skeleton-text"></div>
</article>
```

```tsx
// React — 편의 래퍼 + 문지기 훅
import { Skeleton } from './Skeleton'
import { useSkeletonGate } from './useSkeletonGate'

const ProfileCard = ({ user }: { user?: User }) => {
  const showSkeleton = useSkeletonGate({ loading: !user })

  if (showSkeleton) {
    return (
      <article className="profile-card" aria-busy="true">
        <Skeleton variant="circle" width={48} />
        <Skeleton variant="text" lines={2} />
      </article>
    )
  }
  // 뼈대가 뜨기 전 첫 200ms — 같은 크기의 빈 카드로 자리만 잡는다
  if (!user) return <article className="profile-card" aria-busy="true" />
  return <article className="profile-card">…</article>
}
```

순수 JS에서는 코어를 직접 쓴다. 그리는 함수 하나가 문지기와 데이터를 함께 본다.

```js
import { createSkeletonGate } from './createSkeletonGate.js'

let user
const render = () => {
  if (gate.isVisible()) return renderSkeleton(card)
  if (user) renderProfile(card, user) // 뼈대가 내려간 뒤에만 내용을 그린다
}
const gate = createSkeletonGate({ onChange: render })

gate.setLoading(true)
user = await fetchUser()
gate.setLoading(false)
render() // 뼈대가 한 번도 안 떴으면 onChange가 불리지 않으므로 직접 한 번 그린다
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 응답이 200ms 안에 온다 | 뼈대를 띄우지 않는다. 깜빡이고 사라지는 뼈대는 스피너보다 산만하다. 그동안은 내용과 같은 크기의 빈 자리(`min-height`)다 | `assets` — `createSkeletonGate`의 `delayMs`. 빈 자리의 크기는 `프로젝트` |
| 뼈대를 띄운 직후에 응답이 온다 | 띄운 뼈대는 400ms를 채우고 내용으로 바뀐다 | `assets` — `minVisibleMs` |
| 유지하는 동안 다시 불러오기 시작한다 | 뼈대가 내려갔다 다시 뜨지 않고 그대로 이어진다 | `assets` — `setLoading(true)`가 내리기를 취소한다 |
| 이미 내용이 있는 화면을 다시 불러온다(새로 고침·탭 복귀) | 내용을 뼈대로 덮지 않는다. 뼈대는 보여 줄 내용이 없는 첫 로딩에만 쓴다 | `프로젝트` — `loading`에 "데이터가 없다"를 넘긴다(`!user`). "요청 중이다"를 넘기지 않는다 |
| 요청이 실패한다 | 뼈대를 내리고 그 자리에 오류 한 줄과 "다시 시도" 글자 버튼을 둔다. `aria-busy`를 뗀다 | `프로젝트` |
| 결과가 0개다 | 뼈대를 내리고 빈 상태(상황 + 할 일)를 그린다. 뼈대 개수는 화면 한 장을 채우는 만큼(3~6개)만 둔다 | `프로젝트` |
| 글줄 수·글자 크기가 실제 글과 다르다 | 글줄 뼈대 한 줄은 그 자리의 `line-height` 한 줄(`1lh`)이다. 실제 글과 같은 `font-size`·`line-height`를 물려받는 요소 안에 두면 줄 수만 맞춰도 높이가 같다. 사용자가 글자를 키우면 함께 커진다 | `assets` — `.skeleton-text`. 같은 자리에 두는 일은 `프로젝트` |
| `dir="rtl"`(오른쪽에서 왼쪽으로 쓰는 화면) | 반짝임이 오른쪽에서 왼쪽으로 지나간다 | `assets` — `:dir(rtl)` |
| 고대비 모드(`forced-colors: active`) | 반투명 바탕이 시스템 바탕색으로 바뀌어 사라지므로 `GrayText`로 칠한다. 반짝임은 뺀다 | `assets` — `skeleton.css` |
| 화면 낭독기로 듣는다 | 뼈대는 읽히지 않는다(`Skeleton`이 `aria-hidden`을 단다). 로딩을 말로 알리려면 컨테이너 밖에 `role="status"` 한 줄("불러오는 중")을 둔다 | `aria-hidden`은 `assets`. 알림 문구는 `프로젝트` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 바탕색·반짝임 색 | `--skeleton-base`·`--skeleton-sheen` (라이트 테마면 밝은 회색 계열로) |
| 시머 속도 | `--skeleton-speed` (기본 1.4s — 1~2s 밖은 산만하거나 멈춰 보인다) |
| 글줄 막대 두께 | `--skeleton-line` (기본 1em). `Skeleton`의 text 변형은 `height`를 이 값으로 넘긴다. 줄이 차지하는 높이는 바뀌지 않는다 |
| 모서리 | `border-radius` 덮어쓰기 — 실제 콘텐츠와 맞춘다. 글줄(`skeleton-text`)은 4px 고정이다 |
| 띄우기까지의 지연 | `delayMs` (기본 200ms). 서버에서 뼈대를 그려 보내는 첫 화면은 0으로 둔다 |
| 최소 유지 시간 | `minVisibleMs` (기본 400ms) |

## 함께 쓰는 패턴

- `patterns/infinite-scroll` — 첫 페이지를 기다리는 동안 목록 자리에 뼈대 행을 둔다. 다음 페이지부터는 뼈대가 아니라 목록 끝의 스피너가 맡는다.
- `patterns/loading-button` — 버튼을 눌러 생긴 대기는 버튼이 진행을 보인다. 화면을 뼈대로 바꾸지 않는다.
- `patterns/enter-exit` — 뼈대에서 내용으로 바뀌는 순간을 부드럽게 하고 싶을 때. 내용 쪽에 짧은 페이드만 준다. 자리는 이미 같으므로 이동은 넣지 않는다.

## 주의사항

- **크기를 실제 콘텐츠와 맞춰라** — 스켈레톤의 목적은 레이아웃 예고다. 크기가 다르면 교체 순간 CLS가 생겨 목적을 잃는다. 글줄은 줄 수를, 사진·아바타는 가로세로를 맞춘다.
- **글줄 뼈대에 `height`를 직접 주지 않는다.** 상자 높이는 `1lh`가 정하고, 보이는 막대는 그 가운데의 `--skeleton-line` 두께로 잘린다. 큰 제목 줄은 제목과 같은 `font-size`의 요소 안에 둔다.
- **reduced-motion 대응 내장** — 시머(이동)를 끄고 느린 불투명도 맥동으로 완화한다. 블록 제거 금지.
- 시머는 장식이다 — 스켈레톤 개수가 많은 화면(수십 개)에서는 `--skeleton-speed`를 늦추거나 시머 없이 정적 뼈대만 써도 된다.
- `lh` 단위가 없는 브라우저에서는 글줄 뼈대가 막대 두께 + 줄 사이 0.5em으로 그려진다. 이때는 실제 글보다 반 줄쯤 낮다(행간 1.5에서 0.5em).
