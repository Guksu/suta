---
name: sticky-header
description: 스크롤하면 큰 제목이 밀려 나가고 상단 고정 헤더에 작은 컴팩트 제목이 나타나는 스티키 헤더(sticky header)를 구현한다. "스크롤하면 헤더 축소, 헤더 작아지게, 접히는/줄어드는 헤더, 내리면 큰 제목 사라지고 상단 바에 작은 제목, 고정 타이틀 전환" 요청과 상세 페이지·목록 상단에 쓴다. 기존 적용분의 축소 속도·배경 수정에도 쓴다.
---

# sticky-header — 스티키 헤더 전환

라이브 데모: https://guksu.github.io/suta/#/sticky-header

## 언제 쓰는가

상세 페이지 상단에 큰 제목을 크게 보여주다가, 스크롤을 내리면 상단 고정 바에 작은 제목이 나타나는 패턴 — 모바일 앱 상세 화면의 관례다.

**기술 선택:** 헤더 높이를 줄이는 방식은 쓰지 않는다 — 높이 애니메이션은 매 프레임 레이아웃을 돌린다. 대신 **큰 제목을 페이지 콘텐츠로 두고**(스크롤에 자연히 밀려 나감), 그것이 헤더 아래로 다 들어가는 순간을 IntersectionObserver로 감지해 고정 높이 헤더의 컴팩트 제목을 페이드 인한다. 움직이는 속성은 opacity·transform뿐이고 scroll 이벤트 리스너도 없다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/observeHeaderCollapse.ts` | 코어 — 센티널 이탈 감지 → data-collapsed | 모든 프로젝트 |
| `assets/sticky-header.css` | 헤더·제목 전환 정의 | 모든 프로젝트 |
| `assets/useStickyHeader.ts` | React 훅 | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다.

## 사용 방법 — React

```tsx
import { useStickyHeader } from './useStickyHeader'

const DetailPage = () => {
  const { headerRef, sentinelRef } = useStickyHeader()

  return (
    <>
      <header ref={headerRef} className="sticky-header">
        <span className="sticky-header-title">성수동 손칼국수</span>
      </header>
      <h1 ref={sentinelRef}>성수동 손칼국수</h1>
      <main>…본문…</main>
    </>
  )
}
```

페이지가 아니라 특정 상자 안에서 스크롤되면 그 상자의 ref를 넘긴다.

```tsx
const boxRef = useRef<HTMLDivElement>(null)
const { headerRef, sentinelRef } = useStickyHeader({ root: boxRef })
```

## 사용 방법 — 순수 JS (React 없음)

```js
import { observeHeaderCollapse } from './observeHeaderCollapse.js'

const stop = observeHeaderCollapse({
  header: document.querySelector('.sticky-header'),
  sentinel: document.querySelector('h1'),
  // root: document.querySelector('.scroll-box'), // 상자 안에서 스크롤될 때만
})
// 화면을 떠날 때 stop()
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 스크롤 위치가 복원돼 페이지 중간에서 시작한다(뒤로 가기, 새로 고침) | 작은 제목이 처음부터 떠 있다. 떠오르는 연출(250ms)을 다시 보이지 않는다 | `assets` — 코어가 첫 판정에만 `data-instant`를 걸어 전이 없이 적용한다 |
| 큰 제목이 헤더 뒤로 들어간다 | 큰 제목의 아래 끝이 헤더 아래 끝을 지나는 순간에 바뀐다. 화면 위 끝을 기준으로 하면 헤더 높이만큼의 스크롤 동안 두 제목이 모두 보이지 않는다 | `assets` — 관찰 영역의 위를 `header.offsetHeight`만큼 줄인다(`rootMargin`) |
| 페이지가 짧아 큰 제목이 헤더 아래로 다 들어가지 못한다 | 접히지 않는다. 작은 제목은 `opacity: 0`으로 남고 헤더는 빈 바다 | `assets` |
| 첫 화면이 낮아 큰 제목이 처음부터 화면 아래에 있다(가로로 눕힌 폰, 큰 커버 이미지) | 접힘이 아니다. 큰 제목이 위로 지나갔을 때만 접힌다 | `assets` — 센티널의 위치(`boundingClientRect.top`)를 함께 본다 |
| 데이터를 받은 뒤에야 헤더와 큰 제목을 그린다 | 그려진 그때부터 본다. 요소가 바뀌면 이전 감시를 풀고 새로 건다 | `assets` — React 훅. 순수 JS는 요소를 그린 뒤 `observeHeaderCollapse`를 부른다 |
| 페이지가 아니라 안쪽 상자에서 스크롤된다(모달, 앱 셸의 본문 칸) | 그 상자를 기준으로 본다 | `assets` — `root` 옵션 |
| 제목이 길다 | 작은 제목은 한 줄에서 말줄임한다. 두 줄로 꺾이면 고정 높이를 넘친다. 온전한 제목은 본문의 큰 제목에 있다 | `assets` — `sticky-header.css` |
| 키보드 포커스나 `#앵커` 이동으로 스크롤된다 | 대상이 헤더 뒤에 가려지지 않게, 스크롤되는 요소(`html`이나 상자)에 `scroll-padding-top`을 헤더 높이로 준다 | `프로젝트` |
| 노치가 있는 기기에서 `viewport-fit=cover`를 쓴다 | 헤더 내용이 상태 표시줄 아래로 들어간다. 헤더에 `padding-top: env(safe-area-inset-top)`을 준다 | `프로젝트` |
| 어두운 바탕에 둔다 | 기본은 밝은 면이다(색 토큰 `--color-surface`의 88%, 글자는 `--color-text`). 어두운 화면은 `--header-bg`와 `--header-color`를 함께 주고, 접혔을 때의 그림자 `--header-shadow`를 진하게 한다(예: `rgb(0 0 0 / 0.25)`) | `assets`(변수) / 값은 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 전환 속도 | `--header-duration` (기본 250ms) |
| 헤더 배경·글자 | `--header-bg`(기본 밝은 면 88% + blur — 콘텐츠가 비친다)·`--header-color`(기본 `--color-text`) |
| 접혔을 때의 그림자 | `--header-shadow` (기본 `rgb(0 0 0 / 0.1)`) |
| 전환 시점 | 센티널을 큰 제목이 아닌 다른 요소(히어로 이미지 등)로 지정 |
| 스크롤 기준 | 코어의 `root`, 훅의 `useStickyHeader({ root })` — 기본은 화면 |

## 함께 쓰는 패턴

- `patterns/stretchy-header` — 큰 커버 이미지가 있는 상세. 센티널을 커버 아래의 큰 제목으로 두면 커버가 지나간 뒤 작은 제목이 나온다.
- `patterns/tab-indicator` — 헤더 아래에 탭 줄을 붙여 둘 때. 탭 줄에 `position: sticky; top: {헤더 높이}`를 준다.
- `patterns/page-transition` — 목록으로 돌아오며 스크롤 위치를 복원할 때. 복원이 먼저 일어나므로 헤더는 접힌 상태로 바로 그려진다.
- `patterns/glass-nav` — 스크롤 방향에 따라 숨고 나타나는 GNB가 필요하면 이 패턴 대신 그쪽을 쓴다. 한 화면에 둘을 함께 두지 않는다.

## 주의사항

- **헤더는 고정 높이다** — 높이가 변하는 축소 헤더가 필요하면 이 패턴 범위 밖(레이아웃 애니메이션 트레이드오프를 별도 검토).
- 전환 시점은 감시를 걸 때의 헤더 높이로 정해진다. 화면 폭에 따라 헤더 높이가 달라지는 화면은 높이가 바뀔 때 감시를 다시 건다(코어가 돌려준 정리 함수를 부르고 다시 호출한다).
- 센티널과 헤더가 같은 스크롤 컨테이너에 있어야 한다.
- **reduced-motion 대응 내장** — 이동을 끄고 페이드만 남긴다. 블록 제거 금지.
- 컴팩트 제목은 `aria-hidden`을 달지 마라 — 접힌 상태에서 그것이 유일한 제목 표시다.
