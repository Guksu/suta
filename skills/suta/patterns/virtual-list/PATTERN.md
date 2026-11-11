---
name: virtual-list
description: 항목이 수천·수만 개여도 화면에 보이는 구간만 그리는 가상 스크롤 목록(virtual list, virtualized/windowing)을 구현한다. "가상 스크롤, 리스트 성능, 목록이 느려요·버벅여요, 항목 많을 때 렌더링, 보이는 것만 렌더링" 요청과 긴 목록의 스크롤 성능 개선에 쓴다. 기존 적용분의 항목 높이·여유분(overscan) 수정에도 쓴다.
---

# virtual-list — 가상 스크롤

라이브 데모: https://guksu.github.io/suta/#/virtual-list

## 언제 쓰는가

**항목이 많아 스크롤이 끊길 때.** 목록 1만 개를 전부 그리면 DOM 노드가 1만 개 생기고, 브라우저는 보이지도 않는 것들의 레이아웃·스타일을 계속 계산한다.

숫자로 기준을 잡자면 — 항목이 **수백 개까지는 그냥 그리는 편이 낫다**. 가상 스크롤은 공짜가 아니다: 항목 높이가 고정돼야 하고, Ctrl+F로 페이지 내 검색이 안 되고, 스크린 리더가 목록 전체를 훑지 못한다. 그 비용을 치를 만큼 느려졌을 때 쓴다.

infinite-scroll 패턴과는 **짝**이다: 무한 스크롤이 "언제 더 불러올까"를 다루고, 이 패턴이 "불러온 것을 어떻게 감당할까"를 다룬다. 둘을 같이 쓰면 목록이 끝없이 자라도 DOM은 일정하게 유지된다.

**기술 선택:** 순수 계산 + `transform`. 라이브러리 없이, 스크롤 위치에서 보이는 구간을 구하고 그 묶음만 그린다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/virtualRange.ts` | 코어 — 보이는 구간 계산 (순수 함수, DOM 없음) | 모든 프로젝트 |
| `assets/useVirtualList.ts` | React 훅 — 스크롤·크기 변화 추적 | React 프로젝트만 |
| `assets/virtual-list.css` | 뷰포트·전체 높이 상자·그린 묶음 | 모든 프로젝트 |

## 어떻게 동작하나 — 세 겹

```
.virtual-viewport   스크롤되는 상자 (높이 고정)
└ .virtual-sizer    전체 높이(개수 × 항목 높이)만큼 자리만 차지하는 빈 상자
  └ .virtual-window 실제로 그린 20여 개 — transform으로 제자리에 밀어 놓는다
```

빈 상자가 **스크롤바에 진짜 길이**를 주고, 그린 묶음이 스크롤을 따라 이동한다. 사용자에게는 1만 개가 다 있는 것처럼 보이지만 DOM에는 20여 개만 있다.

## 사용 방법 — React

```tsx
import { useVirtualList } from './useVirtualList'

const ITEM_HEIGHT = 56

const OrderList = ({ orders }: { orders: Order[] }) => {
  const list = useVirtualList({ itemCount: orders.length, itemHeight: ITEM_HEIGHT })

  return (
    {/* tabIndex — 스크롤 상자가 포커스를 받아야 방향키·PageDown으로 굴릴 수 있다 */}
    <div ref={list.containerRef} className="virtual-viewport" role="list" aria-label={`주문 ${orders.length}건`} tabIndex={0}>
      <div className="virtual-sizer" style={{ height: list.range.totalHeight }}>
        <div className="virtual-window" style={{ transform: `translateY(${list.range.offsetY}px)` }}>
          {list.indexes.map((index) => (
            <div
              key={orders[index].id}
              className="virtual-item"
              style={{ '--virtual-item-height': `${ITEM_HEIGHT}px` } as CSSProperties}
              role="listitem"
              aria-posinset={index + 1}
              aria-setsize={orders.length}
            >
              {orders[index].name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

`scrollToIndex(index)`로 특정 항목으로 보낼 수 있다(예: "맨 위로", 검색 결과로 이동).

## 사용 방법 — 순수 JS (React 없음)

계산만 가져다 쓰고 DOM은 직접 갱신한다:

```js
import { virtualRange } from './virtualRange.js'

const render = () => {
  const { startIndex, endIndex, offsetY, totalHeight } = virtualRange({
    scrollTop: viewport.scrollTop,
    viewportHeight: viewport.clientHeight,
    itemHeight: 56,
    itemCount: orders.length,
  })
  sizer.style.height = `${totalHeight}px`
  window.style.transform = `translateY(${offsetY}px)`
  window.replaceChildren(...orders.slice(startIndex, endIndex + 1).map(renderRow))
}

viewport.addEventListener('scroll', render, { passive: true })
render()
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 항목이 0개다 | 그릴 행이 없고 전체 높이가 0이다. 빈 400px 상자만 남으므로 목록 대신 빈 상태(상황 + 할 일)를 그린다 | 계산은 `assets`. 빈 상태는 `프로젝트` |
| 항목이 상자보다 적다(1~7개) | 전부 그린다. 스크롤바가 생기지 않는다. 상자 높이는 그대로라 아래가 빈다. 수가 적을 때는 `--virtual-height`를 `개수 × 항목 높이`로 낮춘다 | 계산은 `assets`. 높이는 `프로젝트` |
| 깊이 스크롤한 채로 항목이 줄어든다(필터·검색·삭제) | 없는 인덱스를 그리지 않는다. 훅이 돌려주는 `indexes`와 `range`는 바뀐 그 렌더에서 이미 새 개수 안이다. 브라우저가 스크롤을 새 끝으로 당기고, 목록은 마지막 행들을 보인다. 필터를 바꿀 때 맨 위로 보내려면 `scrollToIndex(0)`을 부른다 | `assets` — `useVirtualList`. 맨 위로 보내기는 `프로젝트` |
| 항목이 앞에 끼어든다(새 주문이 위에 추가) | 스크롤 위치는 px로 남아 보던 행이 아래로 밀린다. 보던 자리를 지키려면 추가한 뒤 `scrollTop`에 `추가한 개수 × 항목 높이`를 더한다 | `프로젝트` |
| 항목이 수십만 개다 | 브라우저는 요소 높이에 상한이 있다(Firefox 약 1,789만 px, Chrome·Safari 약 3,355만 px). 56px 행이면 약 31만 개에서 넘는다. 넘으면 끝쪽 행에 닿지 못한다. 그 전에 페이지를 나누거나 검색으로 좁힌다 | `프로젝트` |
| 행 높이가 서로 다르다, 글이 길다 | 지원하지 않는다. `.virtual-item`은 높이가 고정이고 넘친 내용은 잘린다(`overflow: hidden`). 행 안의 글은 한 줄 말줄임(`white-space: nowrap; text-overflow: ellipsis`)으로 둔다 | 고정 높이는 `assets`. 말줄임은 `프로젝트` |
| 사용자가 글자를 키웠다 | px로 고정한 행에서 글자가 잘린다. 항목 높이를 글자 크기에서 구한다: `parseFloat(getComputedStyle(document.documentElement).fontSize) * 3.5`를 `itemHeight`와 `--virtual-item-height`에 함께 넘긴다 | `프로젝트` |
| 키보드로 굴린다 | 스크롤 상자에 `tabIndex={0}`이 있어야 방향키·PageDown·Home·End가 듣는다. 포커스 링을 지우지 않는다 | `프로젝트`(위 예시) |
| 포커스가 있는 행이 화면 밖으로 나간다 | 그 행이 DOM에서 사라지며 포커스가 `body`로 떨어진다. 행 안에 버튼·입력이 있는 목록은 `overscan`을 넉넉히(10 이상) 주거나, 가상 스크롤 대신 페이지 나누기를 쓴다 | `프로젝트` — 이 패턴의 한계다 |
| 화면에서 찾기(Ctrl+F), 화면 낭독기로 훑기 | 그려지지 않은 행은 찾아지지 않는다. 목록 위에 검색 입력을 둔다. 낭독기에는 행마다 `aria-posinset`·`aria-setsize`로 "10,000개 중 30번째"를 알린다 | `프로젝트`(위 예시) — 이 패턴의 한계다 |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 항목 높이 | `itemHeight` (CSS `--virtual-item-height`와 **같은 값**이어야 한다) | - |
| 여유분 | `overscan` — 화면 밖으로 더 그려 둘 개수 | 3 |
| 빠른 스크롤 보정 | `maxLead` — 진행 방향으로 미리 그릴 최대 개수 (0이면 끔) | 24 |
| 상자 높이 | `--virtual-height` | 400px |

`overscan`은 **항상** 더 그리는 양이라 키우면 평소 비용이 늘어난다. 3~5가 무난하고, 항목이 무거우면(이미지·차트) 오히려 줄이는 편이 낫다.

`maxLead`는 다르다 — **빠르게 스크롤할 때만, 가는 방향으로만** 늘어난다. 훅이 스크롤 속도를 재서 "다음 120ms 동안 지나갈 만큼"을 미리 그리고, 멈추면 0으로 돌아온다. 지나온 방향은 늘리지 않으므로 평소 비용이 거의 없다.

## 빈 칸이 스치는 문제

빠르게 밀어 넘기면 목록 아래쪽이 잠깐 비어 보일 수 있다. 이건 구현의 버그가 아니라 **웹의 구조적 한계**다: 브라우저는 스크롤을 별도 스레드에서 즉시 처리하는 반면, 무엇을 그릴지 정하는 것은 자바스크립트라 한 박자 늦는다. 네이티브 목록이 이 문제가 덜한 이유는 스크롤과 셀 재사용이 같은 곳에서 함께 일어나기 때문이다.

DOM에서 할 수 있는 것은 **틈을 줄이는 것**까지다:

| 방법 | 효과 |
|------|------|
| `maxLead`(기본 24) | 손가락으로 밀어 넘기는 정도의 속도에서는 대부분 사라진다 |
| `overscan`을 3~5로 | 느린 스크롤의 경계 깜빡임을 없앤다 |
| 항목을 가볍게 (이미지 지연 로딩, 그림자·필터 줄이기) | 렌더가 빨라져 따라잡는 시간이 준다 |
| **먼 거리는 `behavior: 'smooth'`를 쓰지 않는다** | 아래 항목 참고 |

`scrollToIndex(0, 'smooth')`로 5만 개짜리 목록의 맨 위로 보내면 브라우저가 초당 수천 픽셀로 화면을 옮기는데, 어떤 자바스크립트도 그 속도를 따라갈 수 없어 이동 내내 빈 칸이 보인다. **먼 거리는 즉시 이동(기본값 `'auto'`)이 맞다** — 부드러운 스크롤은 한두 화면 이내에서만 쓴다.

## 함께 쓰는 패턴

- `patterns/infinite-scroll` — 끝에 닿으면 다음 쪽을 불러와 `itemCount`를 늘린다. 감시 요소(sentinel)는 `.virtual-sizer` 밖, 스크롤 상자의 맨 끝에 둔다.
- `patterns/skeleton` — 첫 쪽을 기다리는 동안은 가상 목록을 그리지 않고 같은 높이의 뼈대 행 5~7개를 둔다.
- `patterns/search-suggest` — 화면에서 찾기가 안 되는 것을 메운다. 고른 결과로 `scrollToIndex`를 부른다.
- `patterns/swipe-to-delete` — 행을 지우면 `itemCount`가 줄어든다. 줄어든 렌더에서 없는 행을 읽지 않는 것은 훅이 맡는다.

## 주의사항

- **항목 높이가 모두 같아야 한다.** 이 계산의 전제다. 높이가 제각각인 목록(글 길이에 따라 달라지는 카드)은 각 항목을 측정해 누적 높이를 관리해야 하며, 그건 이 패턴의 범위 밖이다 — 그럴 땐 `@tanstack/react-virtual` 같은 라이브러리가 맞다.
- **CSS의 `--virtual-item-height`와 훅의 `itemHeight`가 어긋나면 목록이 서서히 밀린다.** 상수 하나를 두 곳에 전달하라(위 예시처럼).
- **스크롤 상자가 따로 있어야 한다.** 페이지 전체 스크롤(`window`)에 얹는 방식은 지원하지 않는다. 화면을 채우는 목록은 `--virtual-height`를 `calc(100dvh - 머리 높이)`로 둔다.
- **첫 그리기에는 행이 없다.** 훅은 상자 높이를 잰 뒤에 구간을 정한다. 서버에서 그린 HTML과 첫 프레임에는 전체 높이만 잡힌 빈 상자가 나온다.
- 전체 개수는 `role="list"`인 상자의 `aria-label`("주문 10,000건")에 적는다. `aria-rowcount`는 표(`grid`·`table`)의 속성이라 목록에는 쓰지 않는다.
- **스크롤할 때마다 리렌더하지 않는다** — 구간이 실제로 바뀔 때만 상태를 갱신한다. 이 규칙을 깨면(스크롤 위치를 state에 넣는 등) 가상 스크롤을 쓰는 이유가 사라진다.
- **애니메이션이 없는 패턴이다** — 스크롤을 따라 항목이 나타나는 것은 연출이 아니라 위치 계산이라, `prefers-reduced-motion`으로 뺄 모션 자체가 없다.
- `scrollToIndex`는 그 항목을 상자 맨 위에 맞춘다. 범위를 넘는 인덱스는 브라우저가 끝에서 멈춘다. 동작 줄이기 설정에서는 `'smooth'`를 넘기지 않는다.
