---
name: scroll-reveal
description: 스크롤로 뷰포트에 들어올 때 요소가 차례로 나타나는 스크롤 등장 애니메이션(scroll reveal, fade in on scroll)을 구현한다. "스크롤 내리면 섹션이 차례로 나타나게, 스크롤하면 나타나는 효과, 화면에 들어올 때 떠오르며 등장, 순서대로 등장" 요청과 랜딩 페이지·긴 콘텐츠에 쓴다. 기존 적용분의 등장 간격·타이밍·순서 수정에도 쓴다.
---

# scroll-reveal — 스크롤 리빌

라이브 데모: https://guksu.github.io/suta/#/scroll-reveal

## 언제 쓰는가

랜딩 페이지·소개 섹션처럼 스크롤을 내리며 콘텐츠가 순차적으로 드러나야 할 때. 섹션·카드·리스트가 뷰포트에 들어오는 순간 페이드+슬라이드로 공개된다.

**기술 선택:** IntersectionObserver + CSS transition. scroll 이벤트 리스너는 스크롤마다 메인 스레드를 깨워 성능을 깎지만, IntersectionObserver는 브라우저가 교차 판정을 대신 해줘 비용이 없다. 라이브러리 불필요. 2층 구조다:

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/revealOnScroll.ts` | 코어 — DOM API로 `data-revealed` 구동 | 모든 프로젝트 |
| `assets/scroll-reveal.css` | 애니메이션 정의 | 모든 프로젝트 |
| `assets/useScrollReveal.ts` + `assets/ScrollReveal.tsx` | React 래퍼 (코어 사용) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

1. 위 표의 파일들을 복사한다(전체 구현이 이 파일들 — 반드시 읽어라).
2. 공개할 블록을 `<ScrollReveal>`로 감싼다. 래퍼 div에 `data-revealed`가 걸리고 CSS가 반응한다.
3. 연쇄(stagger) 공개는 항목마다 `delayMs`를 증가시켜 준다.
4. 래퍼 div가 레이아웃을 깨는 경우(테이블·플렉스 자식 등)는 컴포넌트 대신 `useScrollReveal` 훅을 직접 써서 기존 요소에 ref와 data 속성을 단다.

```tsx
import { ScrollReveal } from './ScrollReveal'
import './scroll-reveal.css'

const Features = ({ items }: { items: string[] }) => (
  <section>
    {items.map((text, i) => (
      <ScrollReveal key={text} delayMs={i * 80}>
        <article className="card">{text}</article>
      </ScrollReveal>
    ))}
  </section>
)
```

## 사용 방법 — 순수 JS (React 없음)

코어(`revealOnScroll`)와 CSS만 복사한다. 공개할 요소에 `reveal` 클래스를 붙이고 코어에 등록하면 끝이다. 연쇄 공개는 인라인 CSS 변수로 준다.

```js
import { revealOnScroll } from './revealOnScroll.js'

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.setProperty('--reveal-delay', `${(i % 3) * 80}ms`)
  revealOnScroll({ element: el })
})
// SPA에서 요소를 제거할 때는 반환된 cleanup()을 호출해 옵저버를 해제한다
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 스크롤 위치가 복원돼 페이지 중간에서 시작한다(뒤로 가기, `#앵커` 이동) | 이미 위로 지나간 요소는 화면 밖에서 조용히 `data-revealed="true"`가 된다. 위로 되돌아갈 때 지나온 내용이 다시 등장하지 않는다 | `assets` — `revealOnScroll`(`once`일 때) |
| 요소가 화면보다 훨씬 길다(긴 글 한 덩어리, 낮은 가로 화면) | 보이는 비율이 `threshold`에 닿을 수 없는 길이면 화면에 걸치는 순간 공개한다. 기본 0.15에서는 화면 높이의 6.7배보다 긴 요소가 그렇다 | `assets` — `revealOnScroll` |
| `once: false`인 요소가 경계에서 오르내린다 | `threshold`를 넘을 때 공개하고, 화면에서 완전히 벗어났을 때만 다시 감춘다. 경계에서 깜빡이지 않는다 | `assets` — `revealOnScroll` |
| 첫 화면(스크롤 전)에 보이는 요소 | 쓰지 않는다. 첫 페인트에 `opacity: 0`으로 시작해 가장 큰 콘텐츠가 그려지는 시점(LCP)이 늦어진다 | `프로젝트` |
| 항목이 많은 격자·목록에 연쇄 지연을 준다 | 지연을 줄 번호가 아니라 열 번호로 준다(`(i % 3) * 80`). `i * 80`은 20번째 항목이 1.6초 뒤에 나온다 | `프로젝트` — `delayMs` |
| 항목이 수백 개다 | 항목마다 옵저버가 하나씩 생긴다. 항목 하나하나가 아니라 구역(섹션·묶음) 단위로 감싼다 | `프로젝트` |
| 인쇄하거나 스크립트가 꺼져 있다 | 감춘 요소가 그대로 보인다. `@media print, (scripting: none)`이 `opacity: 1`로 되돌린다 | `assets` — `scroll-reveal.css` |
| `IntersectionObserver`가 없다(구형 환경) | 감추지 않고 바로 `data-revealed="true"`로 둔다 | `assets` — `revealOnScroll` |
| 키보드 Tab으로 아직 공개되지 않은 구역의 링크에 간다 | 브라우저가 그 요소를 화면으로 스크롤하므로 그때 공개된다. 감춘 요소도 `opacity`만 0이라 포커스와 낭독 순서에 그대로 있다 | `assets` — `visibility`·`display`로 감추지 않는다 |
| 동작 줄이기(`prefers-reduced-motion: reduce`) | 이동 없이 페이드만 한다 | `assets` — `scroll-reveal.css` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 지속 시간·이동 거리 | CSS 변수 `--reveal-duration`·`--reveal-distance` |
| 공개 시점 | `threshold`(요소의 몇 %가 보일 때, 기본 0.15), `rootMargin`(경계 보정 — 미리 공개하려면 `'0px 0px -10% 0px'`) |
| 반복 여부 | `once`(기본 true — 한 번 공개 후 유지). false면 벗어날 때 다시 감춤 |
| 연쇄 간격 | `delayMs` — 한 줄 안의 순서 × 30~80ms가 무난(초과하면 굼뜨게 느껴진다) |

## 함께 쓰는 패턴

- `patterns/skeleton` — 데이터를 기다리는 자리. 스크롤 등장은 이미 있는 콘텐츠의 연출이고, 불러오는 중을 대신하지 않는다.
- `patterns/infinite-scroll` — 끝없이 이어 붙는 목록. 새로 붙은 항목에는 스크롤 등장을 걸지 않는다. 스크롤할 때마다 수십 개가 떠오르면 읽기를 방해한다.
- `patterns/count-up` — 숫자가 화면에 들어올 때 세어 올라가게 할 때. `useScrollReveal`의 `revealed`가 true가 된 뒤에 숫자를 세기 시작한다.

## 주의사항

- `prefers-reduced-motion` 블록은 지우지 않는다.
- `once={false}`는 스크롤을 오르내릴 때마다 재생된다 — 본문 콘텐츠에는 산만하므로 장식 요소에만.
- 이미 공개된 요소를 `once`로 다시 등록하면 아무것도 하지 않는다. 다시 재생하려면 `data-revealed` 속성을 지우고 등록한다.
