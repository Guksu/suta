---
name: infinite-scroll
description: 목록 끝에 닿으면 다음 페이지를 자동으로 불러오는 무한 스크롤(infinite scroll)을 구현한다 — 미리 로드하고, 중복 호출·연쇄 로딩·실패 폭주를 막는다. "무한 스크롤, 스크롤 내리면 더 불러오기, 끝까지 내리면 다음 페이지 자동 로딩, 피드 자동 페이지네이션, 끝에서 더보기" 요청과 피드·검색 결과·상품 목록에 쓴다. 미리 로드 거리·로딩 표시 수정에도 쓴다.
---

# infinite-scroll — 무한 스크롤

라이브 데모: https://guksu.github.io/suta/#/infinite-scroll

## 언제 쓰는가

피드·검색 결과·상품 목록처럼 **끝을 정하지 않고 계속 이어지는 목록**에. 사용자가 "다음 페이지" 버튼을 찾지 않아도 스크롤만으로 이어진다.

반대로 **쓰지 말아야 할 곳**이 분명하다: 푸터에 중요한 링크가 있는 페이지, 사용자가 "3페이지 3번째" 같은 위치를 기억해야 하는 목록, 인쇄·검색이 필요한 문서. 목록이 무한히 자라면 그 아래에 있는 것들에는 영원히 닿지 못한다.

**기술 선택:** IntersectionObserver. 스크롤 이벤트를 듣지 않는다 — 스크롤 핸들러는 프레임마다 깨어나 위치를 계산하고 스로틀이 필요하지만, 옵저버는 "감시 요소가 보이기 시작함"만 알려준다. 라이브러리 불필요.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createInfiniteScroll.ts` | 코어 — 감시·중복 차단·연쇄 로딩·실패 처리 | 모든 프로젝트 |
| `assets/useInfiniteScroll.ts` | React 훅 | React 프로젝트만 |
| `assets/infinite-scroll.css` | 감시 요소·로딩 스피너·새 항목 등장 | 모든 프로젝트 |

## 무엇을 대신 막아 주는가

직접 만들면 대개 이 셋에서 무너진다.

| 함정 | 증상 | 코어의 처리 |
|------|------|------------|
| 중복 호출 | 같은 페이지가 두 번 붙는다 | 로딩 중에는 다시 부르지 않는다 |
| 연쇄 로딩 끊김 | 한 페이지로 화면이 안 차면 거기서 멈춘다 | 페이지를 붙인 뒤 관찰을 새로 걸어 이어서 부른다 |
| 실패 폭주 | 요청이 실패할 때마다 다시 부르며 서버를 때린다 | 실패하면 멈춘다 — `retry()`를 부를 때까지 |

## 사용 방법 — React

1. 세 파일을 프로젝트로 복사한다(TS가 아니면 타입을 벗겨 `.js`로).
2. 목록 **끝에** 빈 감시 요소를 두고 `sentinelRef`를 단다. 마지막 항목에 달면 안 된다 — 항목이 지워지면 감시가 함께 사라진다.

```tsx
import { useInfiniteScroll } from './useInfiniteScroll'
import './infinite-scroll.css'

const PAGE_SIZE = 20 // 서버가 한 번에 주는 개수 — 등장 순서를 매기는 데만 쓴다

const MenuFeed = () => {
  const [items, setItems] = useState<Menu[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const feed = useInfiniteScroll({
    hasMore,
    loadMore: async () => {
      const page = await fetchMenus({ cursor })
      setItems((prev) => [...prev, ...page.items])
      setCursor(page.nextCursor)
      setHasMore(Boolean(page.nextCursor))
    },
  })

  return (
    <>
      <ul>
        {items.map((item, index) => (
          <li
            key={item.id}
            /* 첫 페이지는 이미 있던 것이므로 연출하지 않는다 */
            className={index >= PAGE_SIZE ? 'infinite-item-new' : undefined}
            style={{ '--infinite-item-order': index % PAGE_SIZE } as CSSProperties}
          >
            {item.name}
          </li>
        ))}
      </ul>

      {/* 감시 요소는 조건 없이 늘 그린다 — 훅은 마운트 때 이 요소가 있어야 감시를 건다 */}
      <div ref={feed.sentinelRef} className="infinite-sentinel" aria-hidden="true" />

      <div className="infinite-footer">
        {/* 낭독 영역에는 문구만 둔다. 버튼을 넣으면 상태가 바뀔 때마다 버튼 이름까지 읽힌다 */}
        <div className="infinite-status" role="status">
          {feed.status === 'loading' && (
            <>
              <span className="infinite-spinner" aria-hidden="true" />
              불러오는 중…
            </>
          )}
          {feed.status === 'error' && '불러오지 못했어요'}
          {feed.status === 'done' && items.length > 0 && '마지막이에요'}
        </div>
        {feed.status === 'error' && <button type="button" onClick={feed.retry}>다시 시도</button>}
        {feed.status === 'idle' && <button type="button" onClick={feed.loadNow}>더 보기</button>}
      </div>
    </>
  )
}
```

**"더 보기" 버튼을 함께 두는 것은 장식이 아니다** — 아래의 접근성 항목을 보라.

### 목록을 새로 채울 때 (필터·정렬·검색어 변경)

끝남(`done`)과 실패(`error`)는 감시를 끊어 둔 상태다. 목록을 처음부터 다시 채울 때는 `reset()`으로 되살린다. 기다리던 요청의 응답이 새 목록에 붙지 않게 하는 일은 `loadMore` 안에서 한다.

```tsx
const queryRef = useRef(0) // 목록을 새로 채울 때마다 올린다

const feed = useInfiniteScroll({
  hasMore,
  loadMore: async () => {
    const query = queryRef.current
    const page = await fetchMenus({ cursor, sort })
    if (query !== queryRef.current) return // 기다리는 사이 정렬이 바뀌었다 — 지난 목록의 응답은 버린다
    setItems((prev) => [...prev, ...page.items])
    setCursor(page.nextCursor)
    setHasMore(Boolean(page.nextCursor))
  },
})

const changeSort = (next: Sort) => {
  queryRef.current += 1
  setSort(next)
  setItems([])
  setCursor(null)
  setHasMore(true)
  feed.reset()
}
```

### 버튼으로 불러온 뒤의 포커스

"더 보기"는 누르는 순간 스피너로 바뀌며 사라진다. 그대로 두면 키보드 포커스가 문서 맨 위로 돌아가 목록을 처음부터 다시 지나야 한다. 누를 때 포커스를 낭독 영역에 맡겨 두고, 새 항목이 붙으면 첫 새 항목으로 옮긴다.

```tsx
const listRef = useRef<HTMLUListElement>(null)
const statusRef = useRef<HTMLDivElement>(null) // <div className="infinite-status" role="status" tabIndex={-1}>
const focusFromRef = useRef<number | null>(null)

const loadByButton = (start: () => void) => {
  focusFromRef.current = items.length // 새로 붙을 첫 항목의 순번
  statusRef.current?.focus()
  start() // feed.loadNow 또는 feed.retry
}

useEffect(
  function focusFirstNewItem() {
    const from = focusFromRef.current
    if (from === null || items.length <= from) return
    focusFromRef.current = null
    const firstNew = listRef.current?.children[from] // <li tabIndex={-1}>
    if (firstNew instanceof HTMLElement) firstNew.focus()
  },
  [items.length],
)
```

### 스크롤 컨테이너가 따로 있을 때

목록이 `overflow: auto`인 상자 안에서 스크롤된다면 그 상자를 알려줘야 한다. 기본값은 뷰포트다.

```tsx
const boxRef = useRef<HTMLDivElement>(null)
const feed = useInfiniteScroll({ hasMore, loadMore, rootRef: boxRef })
```

## 사용 방법 — 순수 JS (React 없음)

```js
import { createInfiniteScroll } from './createInfiniteScroll.js'

const feed = createInfiniteScroll({
  sentinel: document.querySelector('.infinite-sentinel'),
  hasMore: () => Boolean(nextCursor),
  loadMore: async () => {
    const page = await fetchMenus({ cursor: nextCursor })
    list.append(...page.items.map(renderItem))
    nextCursor = page.nextCursor
  },
  onStatusChange: (status) => {
    footer.dataset.status = status
  },
})

// 필터·정렬을 바꿔 목록을 새로 채울 때: list.replaceChildren(); nextCursor = firstCursor; feed.reset()
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 결과가 0개다 | "마지막이에요"가 아니라 빈 상태(상황 + 할 일)를 그린다. 코어의 `done`은 0개와 끝을 구분하지 않는다 | `프로젝트` — `status === 'done' && items.length === 0` |
| 끝에 닿았다 | `done`이 되고 감시를 끊는다. 끝 문구 한 줄만 남기고 "더 보기" 버튼은 치운다 | 상태는 `assets`. 문구는 `프로젝트` |
| 요청이 실패한다 | 멈춘다. 스크롤해도 저절로 다시 보내지 않는다. "다시 시도"를 누르면 감시 요소가 화면 밖에 있어도 바로 다시 보낸다 | `assets` — `retry()` |
| 필터·정렬·검색어를 바꿔 목록을 새로 채운다 | 끝남·실패를 걷고 다시 감시한다. 기다리던 요청의 응답은 상태를 바꾸지 못한다. React 훅은 끝났던 목록의 `hasMore`가 다시 `true`가 되면 스스로 되살린다 | `assets` — `reset()`. 지난 응답이 새 목록에 항목을 붙이지 않게 하는 일은 `프로젝트`(위 예시) |
| 뒤로 가기로 목록에 돌아온다 | 훅은 새로 마운트되어 `idle`에서 시작한다. 같은 자리로 돌아가려면 목록·커서·스크롤 위치를 캐시에 남겼다가 되돌려야 한다. 남기지 않으면 첫 페이지부터 다시 불러온다 | `프로젝트` |
| 한 페이지로 화면이 차지 않는다(큰 화면·짧은 항목) | 감시 요소가 보이는 동안 다음 페이지를 이어서 부른다. 서버가 빈 페이지와 함께 "더 있다"를 주면 끝없이 부르게 된다 | 이어 부르기는 `assets`. 빈 페이지를 받으면 `hasMore`를 `false`로 두는 일은 `프로젝트` |
| 키보드로 "더 보기"를 누른다 | 버튼이 사라져도 포커스가 문서 맨 위로 돌아가지 않는다. 낭독 영역(`tabindex="-1"`)에 두었다가 새로 붙은 첫 항목으로 옮긴다 | `프로젝트`(위 예시) |
| 감시 요소를 조건부로 그린다(데이터가 온 뒤에만) | 훅은 마운트 때 `sentinelRef`가 비어 있으면 감시를 걸지 않고, 나중에 요소가 생겨도 모른다. 감시 요소는 조건 없이 늘 그린다 | `프로젝트` |
| 한 페이지가 20개·50개다 | 새 항목은 40ms씩 차례로 들어오되 순번 6(240ms)에서 멈춘다. 일곱 번째부터는 함께 들어온다 | `assets` — `infinite-scroll.css` |
| 고대비 모드(`forced-colors: active`) | 스피너의 빈 한 칸이 글자색으로 메워져 도는 것이 보이지 않는다. 고리는 `CanvasText`, 빈 칸은 `Canvas`로 다시 나눈다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 미리 부르는 거리 | `rootMarginPx` | 400px (화면 밖 400px에 다가오면 부른다) |
| 스크롤 컨테이너 | `rootRef` / `root` | 뷰포트 |
| 새 항목 등장 연출 | 새로 붙은 항목에 `.infinite-item-new` 클래스 | 8px 위로 떠오르며 260ms 페이드 인 |
| 등장 순서 간격 | 항목마다 `--infinite-item-order`에 그 페이지 안에서의 순번 | 40ms씩 차례로, 최대 240ms (순번을 안 주면 동시에) |
| 로딩·끝 문구 | 푸터를 직접 그린다 — 코어는 상태만 준다 | - |

`rootMarginPx`를 키우면 로딩을 거의 못 보게 되지만, 사용자가 안 볼 페이지까지 미리 받아 데이터를 쓴다. 목록 한 화면 높이 정도(300~600px)가 무난하다.

## 함께 쓰는 패턴

- `patterns/skeleton` — 첫 페이지를 기다리는 동안. 목록이 비어 있고 아직 끝나지 않았으면 목록 자리에 뼈대 행을 두고, 푸터의 스피너는 두 번째 페이지부터 쓴다.
- `patterns/virtual-list` — 항목이 수천 개로 자랄 때. 이 패턴이 "언제 더 불러올까"를, 가상 목록이 "불러온 것을 어떻게 감당할까"를 맡는다.
- `patterns/pull-to-refresh` — 맨 위에서 당겨 새로 고칠 때. 목록을 첫 페이지로 바꾼 뒤 `reset()`을 부른다.
- `patterns/toast-stack` — 실패 안내에는 쓰지 않는다. 실패 문구와 "다시 시도"는 목록 끝의 그 자리에 남아 있어야 한다.

## 주의사항

- **"더 보기" 버튼을 함께 두라.** 무한 스크롤만 있으면 키보드 사용자는 목록을 다 지나야 푸터에 닿고, 스크린 리더 사용자는 "내려서 보이게 하는" 조작 자체가 어렵다. 자동 로딩은 편의로 얹고, 명시적 버튼을 진짜 경로로 남겨 두는 편이 안전하다. `loadNow()`가 그 버튼용이다.
- **로딩·완료는 `role="status"`로 알린다.** 화면에 스피너만 도는 것은 보이는 사람에게만 정보다. 낭독 영역은 비어 있을 때도 DOM에 남겨 둔다. 문구와 함께 새로 그리면 읽히지 않을 수 있다.
- **스크롤 위치 복원은 이 패턴의 범위 밖이다.** 목록·커서·스크롤 위치를 캐시에 남기는 일은 UI가 아니라 데이터 설계 문제다.
- **감시 요소의 높이를 0으로 두지 말라.** `infinite-scroll.css`가 1px을 주는 이유다 — 높이 0인 요소는 교차 판정이 불안정하다.
- **reduced-motion 대응 내장** — 새 항목 등장 연출은 사라지고 스피너 회전만 느리게 남는다(진행 중이라는 유일한 신호).
- IntersectionObserver가 없는 환경(아주 오래된 브라우저·SSR)에서는 자동 로딩이 꺼지고 `loadNow()` 버튼만 동작한다 — 목록이 사라지지는 않는다.
- React 훅은 `rootMarginPx`·`rootRef`가 바뀌면 코어를 새로 만든다. 그때 돌고 있던 요청은 이어받으므로 같은 페이지를 두 번 부르지 않는다.
