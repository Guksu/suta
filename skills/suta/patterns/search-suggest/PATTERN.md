---
name: search-suggest
description: 검색창 자동완성 제안 목록(search autocomplete, suggest)을 구현한다 — 입력이 멈춘 뒤 한 번만 서버를 부르고, 늦게 온 옛 응답이 최신 결과를 덮지 않게 막으며, 방향키로 골라 Enter로 선택한다. "자동완성, 검색 추천, 서제스트, 추천 검색어 목록, 글자 치면 목록 뜨게" 요청에 쓴다. 기존 적용분의 호출 간격(디바운스)·항목 수 수정에도 쓴다.
---

# search-suggest — 검색어 자동완성

라이브 데모: https://guksu.github.io/suta/#/search-suggest

## 언제 쓰는가

검색창에 글자를 치면 아래로 제안이 떠오르고, 방향키로 골라 Enter로 선택하는 패턴. 검색·주소 입력·태그 고르기·사람 찾기처럼 **후보가 서버에 있고 목록이 입력에 따라 바뀔 때** 쓴다.

후보가 고정되어 있고 개수가 적으면(면 종류 4가지) select 패턴이 맞다 — 이 패턴은 "칠 때마다 목록이 달라진다"는 전제 위에 있다.

**기술 선택:** 네이티브 `<input>` + ARIA 콤보박스 패턴. 라이브러리를 쓰지 않지만, **속성 하나만 빠져도 스크린 리더에는 그냥 입력창으로 읽힌다** — 그래서 훅이 `inputProps`·`listProps`·`getOptionProps`로 묶어 내보낸다. 직접 쓰지 말고 펼치라는 뜻이다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createSuggestSearch.ts` | 코어 — 디바운스·늦은 응답 차단·요청 취소 | 모든 프로젝트 |
| `assets/useSearchSuggest.ts` | React 훅 — 키보드 조작·ARIA 속성 묶음 | React 프로젝트만 |
| `assets/search-suggest.css` | 입력창·패널 드롭·활성 항목 | 모든 프로젝트 |

## 진짜 어려운 부분은 타이밍이다

모양은 쉽고, 무너지는 곳은 요청 타이밍이다.

| 함정 | 증상 | 코어의 처리 |
|------|------|------------|
| 글자마다 요청 | "국수집"을 치면 요청 3번 | 입력이 멈추고 200ms 뒤 한 번만 |
| **늦은 응답이 최신 결과를 덮음** | "국"의 결과가 "국수"의 결과 뒤에 도착해 화면이 되돌아감 | 요청마다 순번을 매겨 마지막이 아닌 응답은 버린다 |
| 끊기지 않는 요청 | 이미 쓸모없어진 요청이 서버·네트워크를 계속 점유 | 새 검색이 시작되면 `AbortSignal`로 끊는다 |
| 한 글자에 전체 검색 | "ㄱ"에 수만 건이 걸린다 | `minLength` 미만이면 아예 부르지 않는다 |

## 사용 방법 — React

```tsx
import { useSearchSuggest } from './useSearchSuggest'

const MenuSearch = () => {
  const search = useSearchSuggest<Menu>({
    fetchSuggestions: ({ query, signal }) =>
      fetch(`/api/menus?q=${encodeURIComponent(query)}`, { signal }).then((res) => res.json()),
    toText: (menu) => menu.name,
    onSelect: (menu) => goToMenu(menu.id),
  })

  return (
    <div className="suggest-root">
      <input {...search.inputProps} className="suggest-input" placeholder="메뉴 검색" aria-label="메뉴 검색" />

      {search.isOpen && (
        <ul {...search.listProps} className="suggest-panel">
          {search.showLoading && <li className="suggest-message">찾는 중…</li>}
          {search.status === 'error' && <li className="suggest-message">불러오지 못했어요</li>}
          {search.items.map((menu, index) => (
            <li key={menu.id} {...search.getOptionProps(index)} className="suggest-option">
              {menu.name}
            </li>
          ))}
        </ul>
      )}
      {search.isEmpty && (
        <p className="suggest-panel suggest-message" role="status">맞는 메뉴가 없어요</p>
      )}
    </div>
  )
}
```

`fetch`에 **`signal`을 그대로 넘겨야** 요청 취소가 실제로 동작한다 — 넘기지 않으면 응답을 버리기만 하고 통신은 계속된다.

### 검색어 강조

일치하는 부분을 굵게 보이려면 `<mark>`로 감싼다(CSS가 노란 배경을 지우고 굵기만 남긴다). 사용자 입력이 정규식에 들어가므로 **반드시 이스케이프한다**:

```tsx
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query) return text
  return text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi')).map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : part,
  )
}
```

## 사용 방법 — 순수 JS (React 없음)

코어만 쓰고 목록은 직접 그린다:

```js
import { createSuggestSearch } from './createSuggestSearch.js'

const search = createSuggestSearch({
  fetchSuggestions: ({ query, signal }) =>
    fetch(`/api/menus?q=${encodeURIComponent(query)}`, { signal }).then((r) => r.json()),
  onStateChange: ({ items, status }) => renderPanel({ items, status }),
})

input.addEventListener('input', (event) => search.setQuery(event.target.value))
input.addEventListener('blur', () => search.cancel()) // 닫을 때 기다리던 요청도 끊는다
```

방향키·Enter를 직접 붙일 때는 `event.isComposing || event.keyCode === 229`인 키를 먼저 거른다. 한글 조합 중에 누른 키는 조합이 끝나며 한 번 더 온다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 응답이 200ms 안에 온다 | "찾는 중"을 띄우지 않는다. 금방 사라지는 문구는 패널을 한 번 더 깜빡이게 한다 | `assets` — `loadingDelayMs`(기본 200), `showLoading` |
| 목록이 떠 있는 채로 다음 응답이 늦다 | 앞선 목록을 그대로 두고 목록에 `aria-busy="true"`를 건다. 200ms가 지나면 항목을 0.55로 흐린다. 문구를 목록 위에 끼워 넣지 않는다(응답마다 줄이 밀렸다 돌아온다) | `assets` — `listProps`, CSS |
| 결과가 0개다 | listbox는 닫고(`aria-expanded="false"`) `isEmpty`가 참이 된다. 문구는 목록 밖 `role="status"` 요소에 그린다. 다음 응답을 기다리는 동안에도 유지된다 | `assets` — `isEmpty` / 문구는 프로젝트 |
| 요청이 실패한다 | `status`가 `'error'`가 되고 목록을 비운다. 패널에 한 줄로 알린다. 다음 글자를 치면 다시 부른다. 검색 제출(Enter)은 막지 않는다 | `assets` / 문구는 프로젝트 |
| 한글을 조합하는 중이다 | 글자가 바뀔 때마다(ㄱ → 구 → 국) 요청 후보가 되고 디바운스가 줄인다. 조합이 끝나기를 기다리지 않는다(한글은 마지막 글자가 늘 조합 중이다). 조합 중의 방향키·Enter는 무시한다 | `assets` — `isComposing`·`keyCode 229` |
| 기다리는 중에 닫거나(Esc·바깥 누름) 다음 글자를 친다 | 앞 요청을 끊는다. 끊긴 요청이 뒤늦게 끝나도 실패나 결과로 보지 않는다(`AbortError`가 아닌 오류를 던져도, `signal`을 무시해도 같다). 닫았으면 `status`를 되돌려, 다시 열었을 때 "찾는 중"이 남지 않는다 | `assets` — `signal.aborted` 확인, `cancel` |
| 제안이 수십 개다 | 패널은 `--suggest-max-height`(18rem) 안에서 스크롤한다. 방향키로 옮긴 활성 항목은 보이는 곳으로 따라온다. 항목 높이는 44px 이상이다 | `assets` |
| 모달·시트 안에서 Esc를 누른다 | 첫 Esc는 목록만 닫는다(`preventDefault`). 목록이 닫힌 뒤의 Esc가 바깥 창을 닫는다 | `assets` |
| 고르지 않고 Enter로 제출한다 | 폼 제출은 그대로 일어난다. 제출 처리에서 `search.close()`를 불러 패널과 기다리던 요청을 정리한다 | 프로젝트 |
| 모바일에서 화면 키보드가 올라온다 | 18rem 패널의 아랫부분이 키보드에 가린다. `--suggest-max-height: 40dvh`로 줄이거나 검색을 전체 화면으로 옮긴다. 입력창 글자는 16px 이상으로 둔다(작으면 iOS가 화면을 확대한다) | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 기다리는 시간 | `debounceMs` | 200ms |
| 검색 시작 길이 | `minLength` | 1글자 |
| "찾는 중"을 띄우기까지 | `loadingDelayMs` | 200ms |
| 패널 최대 높이 | `--suggest-max-height` | 18rem |
| 활성 항목 배경 | `--suggest-active-bg` | 옅은 회색(`--color-canvas`와 같은 값) |
| 드롭 속도 | `--suggest-duration` | 160ms |

`debounceMs`는 200ms 안팎이 무난하다 — 120ms 아래로 내리면 타이핑 중에도 요청이 나가고, 350ms를 넘기면 멈췄는데 반응이 없는 느낌이 든다.

## 주의사항

- **`aria-activedescendant` 방식이다** — 포커스는 입력창에 그대로 두고 "지금 선택된 항목"만 알린다. 방향키를 눌러도 포커스가 목록으로 옮겨 가지 않으므로 계속 타이핑할 수 있다.
- **항목 선택은 `mousedown`에서 한다.** `click`을 기다리면 그전에 입력창의 `blur`가 목록을 닫아 버려 클릭이 사라진다.
- **검색어 강조에 정규식을 쓸 때는 이스케이프가 필수다** — 사용자가 `(`를 치는 순간 예외로 화면이 깨진다.
- **`role="listbox"`의 자식은 `role="option"`만 허용된다.** 로딩·실패 문구를 `<li>`로 넣을 때 `role`을 주지 않는 이유이며, 엄격하게 가려면 그 문구들도 "결과 없음"처럼 목록 바깥의 `role="status"` 영역에 둔다.
- **제안이 몇 개 떴는지는 낭독되지 않는다.** 스크린 리더 사용자에게 알리려면 화면에 보이지 않는 `role="status"` 영역에 "제안 5개"를 적는다(문구는 프로젝트 몫이라 훅에 넣지 않았다).
- **패널은 입력창 기준 절대 배치다.** `overflow: hidden`인 조상 안에서는 잘리고, 화면 아래쪽 입력창에서는 위로 뒤집히지 않는다. 검색창을 화면 위쪽에 두는 관례를 전제로 한다.
- **reduced-motion 대응 내장** — 패널이 내려오는 연출만 사라지고 목록은 그대로 나타난다.
- 항목을 고른 뒤에도 앞선 목록은 남아 있어, 입력창에 다시 포커스하면 그 목록이 열린다. 고른 뒤 목록을 비우려면 `onSelect`에서 화면을 옮기거나 입력창을 비운다.
- 서버 부하가 걱정되면 코어의 디바운스 위에 **캐시**를 얹는다(같은 검색어의 결과를 Map에 기억). 이 패턴은 캐시를 넣지 않았다 — 유효기간 정책이 서비스마다 다르기 때문이다.
