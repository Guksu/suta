---
name: carousel
description: 캐러셀(carousel) 컴포넌트 — 스와이프로 옆으로 넘기면 한 장씩 딱 걸리는 스냅 슬라이더, 아래 점(도트) 내비게이션, 자동 넘김(autoplay)을 구현한다. "캐러셀, 슬라이더, 배너 슬라이드, 배너 자동으로 넘어가게, 이미지 넘겨보기, 카드 슬라이더" 요청과 가로 스크롤 배너·카드 목록 UI에 쓴다. 기존 적용분의 폭·간격·스냅 위치·자동 넘김 간격 수정에도 쓴다.
---

# carousel — 스냅 캐러셀

라이브 데모: https://guksu.github.io/suta/#/carousel

## 언제 쓰는가

배너·추천 카드·이미지 묶음을 가로로 넘겨 볼 때. 스와이프하면 슬라이드 경계에 자석처럼 정렬(스냅)되는 관례다.

**기술 선택:** CSS `scroll-snap`이 스크롤·스냅·감속·터치 물리를 전부 브라우저 네이티브로 처리한다 — JS 슬라이더 라이브러리가 흉내 내는 것을 공짜로, 더 자연스럽게 얻는다. JS는 두 가지만 한다: 활성 슬라이드 추적(IntersectionObserver)과 도트 클릭 이동(scrollTo). scroll 이벤트 리스너 없음.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/carouselCore.ts` | 코어 — 활성 추적(`observeActiveSlide`)·이동(`scrollToSlide`) | 모든 프로젝트 |
| `assets/createCarouselAutoplay.ts` | 자동재생 확장(선택 — 정지 조건 내장, `toggle`·`isPaused`·`reset`) | 자동재생 쓸 때만 |
| `assets/carousel.css` | 트랙·스냅·도트 정의 | 모든 프로젝트 |
| `assets/useCarousel.ts` | React 훅 (autoplayMs 옵션 포함) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다.

## 사용 방법 — React

```tsx
import { useCarousel } from './useCarousel'

const Banner = ({ items }: { items: string[] }) => {
  const { trackRef, activeIndex, goTo } = useCarousel()

  return (
    <div>
      {/* 스크롤 트랙은 키보드로도 닿아야 한다 — 초점을 받으면 좌우 방향키로 넘긴다 */}
      <div ref={trackRef} className="carousel-track" tabIndex={0} role="region" aria-label="가게 소식">
        {items.map((item) => (
          <div key={item} className="carousel-slide">
            {item}
          </div>
        ))}
      </div>
      {/* 점은 탭이 아니라 이동 버튼 묶음이다 — tablist가 아니라 group, 지금 장은 aria-current로 알린다 */}
      <div className="carousel-dots" role="group" aria-label="슬라이드 선택">
        {items.map((item, index) => (
          <button
            key={item}
            type="button"
            className="carousel-dot"
            data-active={index === activeIndex ? 'true' : 'false'}
            aria-current={index === activeIndex ? 'true' : undefined}
            aria-label={`${index + 1}번째 슬라이드`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  )
}
```

자동 넘김은 `useCarousel({ autoplayMs: 4000 })`으로 켠다. 이때 일시정지 버튼을 반드시 함께 둔다.

```tsx
const { trackRef, activeIndex, goTo, autoplayOn, toggleAutoplay } = useCarousel({ autoplayMs: 4000 })

<button type="button" onClick={toggleAutoplay}>{autoplayOn ? '일시정지' : '재생'}</button>
```

`autoplayOn`은 사용자가 켜 두었는가를 말한다. 포인터가 올라와 잠깐 선 동안에도 `true`라 버튼 글자가 뒤집히지 않는다.

## 사용 방법 — 순수 JS (React 없음)

```js
import { observeActiveSlide, scrollToSlide } from './carouselCore.js'

const track = document.querySelector('.carousel-track')
const dots = [...document.querySelectorAll('.carousel-dot')]

observeActiveSlide({
  track,
  onChange: (index) => dots.forEach((dot, i) => (dot.dataset.active = String(i === index))),
})
dots.forEach((dot, index) => dot.addEventListener('click', () => scrollToSlide({ track, index })))
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 슬라이드를 서버에서 늦게 받는다(처음에는 0장이거나 트랙이 아직 없다) | 슬라이드가 그려진 뒤부터 지금 장을 따라간다. 슬라이드가 더해지거나 빠져도 순서를 다시 센다 | `assets` — `observeActiveSlide`가 트랙의 자식 변화를 본다. React 훅은 트랙이 나중에 그려져도 붙는다 |
| 슬라이드가 1장이다 | 넘길 곳이 없다. 자동 넘김은 아무것도 하지 않는다. 점과 일시정지 버튼은 그리지 않는다 | `assets`(자동 넘김) · `프로젝트`(점·버튼을 `items.length > 1`일 때만 그린다) |
| 슬라이드가 수십 장이다 | 점은 칸마다 24px이라 320px 화면에 13개까지 들어간다. 8장을 넘으면 점 대신 "3 / 24" 같은 숫자 표시로 바꾼다 | `프로젝트` — `activeIndex + 1`과 장수로 그린다 |
| 자동 넘김 중에 포인터를 올리거나, 키보드 포커스가 트랙 안에 있거나, 탭이 가려진다(다른 탭·최소화) | 멈춘다. 다시 돌 때는 간격을 처음부터 센다. 동작 줄이기 설정이면 처음부터 멈춘 채 시작하고, 재생 버튼으로만 켜진다 | `assets` — `createCarouselAutoplay` |
| 점·화살표로 직접 옮긴 직후 | 자동 넘김의 간격을 처음부터 다시 센다. 누른 지 0.1초 만에 또 넘어가지 않는다 | `assets` — 훅의 `goTo`. 순수 JS는 이동 뒤 `autoplay.reset()`을 부른다 |
| 자동 넘김이 마지막 장에 닿는다 | 다음은 첫 장이다. 320ms에 처음으로 되감긴다. 손으로 넘길 때는 끝에서 멈춘다(끝과 처음이 이어지지 않는다) | `assets` — 훅의 `autoplayMs` |
| 점을 눌러 이동하는 중에 사용자가 트랙을 잡거나 휠을 굴린다 | 이동을 그 자리에서 멈추고 스냅을 되돌린다. 손가락과 다투지 않는다 | `assets` — `scrollToSlide` |
| `scroll-snap-align: start`로 바꿨거나 `dir="rtl"`이다 | 점 이동이 스냅이 맞추는 자리와 같은 곳으로 간다. 가운데로 갔다가 되끌려 가지 않고, rtl에서는 음수 스크롤 좌표로 간다 | `assets` — `scrollToSlide`가 계산된 `scroll-snap-align`·`direction`·`scroll-padding`을 읽는다 |
| 한 화면에 두 장 이상이 60% 넘게 보인다(`--slide-width` 50% 이하의 카드 줄) | 지금 장이 하나로 정해지지 않는다. 점을 달지 않고 스와이프만 둔다 | `프로젝트` |
| 고대비 모드(`forced-colors: active`) | 투명 테두리가 색을 얻어 점이 24px 원으로 번지지 않게, 테두리는 `Canvas`·점은 `GrayText`·지금 장은 `Highlight`로 그린다 | `assets` — `carousel.css` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 슬라이드 폭 | `--slide-width` (기본 80% — 다음 슬라이드가 살짝 보여 "더 있다"는 힌트가 된다) |
| 간격 | `--carousel-gap` (기본 12px) |
| 스냅 위치 | `.carousel-slide`의 `scroll-snap-align` — center(기본)/start |
| 풀폭 배너 | `--slide-width: 100%` + `scroll-snap-align: start` |
| 지금 장의 점 색 | `.carousel-dots`의 `color` (점이 물려받는다) |

## 함께 쓰는 패턴

- `patterns/skeleton` — 슬라이드를 불러오는 동안. 트랙과 같은 높이의 뼈대 한 장을 두어 슬라이드가 올 때 아래 내용이 밀리지 않게 한다.
- `patterns/zoom-lightbox` — 이미지 슬라이드를 눌러 크게 볼 때. 라이트박스가 열린 동안에는 자동 넘김을 멈춘다(`toggleAutoplay`).
- `patterns/story-progress` — 장마다 정해진 시간 뒤 넘어가고 남은 시간을 막대로 보여야 할 때. 그 경우 캐러셀의 자동 넘김과 점은 쓰지 않는다.

## 주의사항

- **자동 넘김에는 일시정지 버튼을 둔다** — 정지 조건(호버·포커스·가려진 탭·동작 줄이기)은 코어가 갖고 있지만 버튼은 호출부 책임이다. `toggleAutoplay`/`autoplayOn`으로 노출한다(WCAG 2.2.2).
- **reduced-motion 대응 내장** — 도트 클릭 이동이 부드러운 스크롤 대신 즉시 점프한다(코어의 matchMedia 판정). 스와이프 자체는 사용자가 만든 모션이라 제한하지 않는다.
- **트랙에 CSS `scroll-behavior: smooth`를 걸지 마라** — 크롬에서 프로그램적 scrollTo가 무시되는 문제가 있다. 부드러운 이동은 코어가 scrollTo 옵션으로 처리한다.
- `.carousel-track`의 `position: relative`는 슬라이드 offsetLeft의 좌표 기준이다 — 제거하면 도트 이동이 엉뚱한 위치로 간다.
- 활성 판정은 "트랙 안에서 60% 이상 보임"이다 — 슬라이드 폭이 트랙보다 크면(100% 초과) 어느 장도 60%에 닿지 못해 판정이 멈춘다.
- 슬라이드 안에 세로 스크롤 콘텐츠를 넣지 마라 — 가로 스냅과 세로 스크롤 제스처가 경합한다.
- **도트의 누르는 칸은 24px이다** — 보이는 점은 8px 원 그대로 두고 투명한 테두리로 칸을 넓힌다(WCAG 2.5.8 최소 24px, 중심 간격 24). 44px 칸으로 넓히지 마라. 점 사이가 36px로 벌어져 흩어져 보인다. 지금 장은 같은 크기 원의 색으로 알리고, 폭이 늘어나는 알약형(`width` 전이)은 쓰지 않는다 — 레퍼런스 7장에 없었고, 레이아웃 속성을 움직인다.
- 점의 색은 `background-color`로만 바꾼다. `background` 단축 속성을 쓰면 `background-clip`이 되돌아가 점이 누르는 칸 전체(24px)로 번진다.
- 시작 안내처럼 점을 누를 필요가 없으면 버튼이 아닌 표시로 둔다 — `aria-hidden` 점 + "3장 중 1장" 숨김 글자, 중심 간격 16. 넘기기는 스와이프와 "다음" 버튼이 맡는다.
