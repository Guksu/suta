---
name: card-stack
description: Apple Wallet식 카드 묶음(card stack)을 구현한다 — 카드들이 윗가장자리만 보이게 겹쳐 있다가 탭하면 세로로 펼쳐지고, 하나를 고르면 맨 위로 올라오고 나머지는 아래로 내려가 다시 겹친다. "지갑 카드 스택, 카드 겹쳐서 쌓기, 카드 묶음 펼치기, 멤버십/쿠폰 카드 지갑" 요청에 쓴다. 기존 적용분의 겹침 높이·펼침 간격·속도 수정에도 쓴다.
---

# card-stack — 카드 묶음 (지갑 스택)

라이브 데모: https://guksu.github.io/suta/#/card-stack

## 언제 쓰는가

멤버십·쿠폰·선불 카드처럼 "같은 종류의 카드 여러 장"을 한 화면에 둘 때. 애플 지갑(Wallet)의 관례다 — 겹친 상태(stacked)에서는 각 카드의 윗가장자리만 보여 종류를 훑고, 누르면 세로로 펼쳐지고(fanned), 하나를 고르면 그 카드가 맨 위로 올라와 크게 보이며 나머지는 아래로 내려가 겹친다(selected). 같은 카드를 다시 누르거나 Esc로 한 단계씩 되돌아간다.

카드가 2장 이하거나 카드마다 내용이 길면(스크롤이 필요한 상세) 이 패턴은 과하다 — 그때는 일반 목록 + page-transition 패턴(상세 화면 이동)이 낫다. 순서가 바뀌는 목록의 재배치는 flip-list 패턴의 영역이다.

**기술 선택:** 순수 계산 함수 + CSS transition. 카드 위치는 index·모드로 정해지는 산수(translateY·scale·zIndex)라 측정이 필요 없고, 이동은 `transform`만 전환한다. 컨테이너 높이는 `min-height`를 즉시 바꾼다 — `height`를 transition하면 매 프레임 레이아웃이 돌지만, 카드가 전부 absolute라 높이는 잘리는 범위만 정하면 된다. 라이브러리 불필요.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/stackLayout.ts` | 코어 — 카드 배치 계산(`cardTransform`·`stackHeight`)·상태 전이(`nextStackState`) | 모든 프로젝트 |
| `assets/card-stack.css` | 카드 모양·이동·스태거·reduced-motion | 모든 프로젝트 |
| `assets/CardStack.tsx` | React 래퍼 (버튼 카드·Esc·min-height·CSS 변수 주입) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { CardStack } from './CardStack'

const CARDS = [
  { id: 'points', render: () => <div className="wallet-card points">적립 카드</div> },
  { id: 'coupon', render: () => <div className="wallet-card coupon">손만두 1인분 무료</div> },
  { id: 'prepaid', render: () => <div className="wallet-card prepaid">선불 카드 32,000원</div> },
]

const Wallet = () => (
  <CardStack cards={CARDS} cardHeight={180} peekPx={56} fanGapPx={72} label="국수집 멤버십 카드" />
)
```

- 카드 하나가 `<button>`이다 — `render()`가 돌려주는 내용 안에 버튼·링크를 넣지 마라(중첩 인터랙티브 요소).
- 카드 배경색·글자색은 `render()` 안의 요소에 준다. 코어 CSS는 모서리·그림자·이동만 안다(`--stack-card-bg`로 기본 배경만 바꿀 수 있다).
- 겹친 상태에서 보이는 것은 카드 윗부분 `peekPx`뿐이다 — 제목 줄 높이를 `var(--stack-peek)`에 맞추면 접힌 상태에서도 종류가 읽힌다(컴포넌트가 컨테이너에 `--stack-peek`·`--stack-fan-gap`·`--stack-card-height`를 써 둔다).
- 현재 모드가 필요하면 `onStateChange={(state) => …}` — `{ mode: 'stacked' | 'fanned' | 'selected', selectedIndex }`를 받는다.

## 사용 방법 — 순수 JS (React 없음)

카드 요소를 `.card-stack` 안에 `.card-stack-card` 버튼으로 만들고, 클릭마다 상태를 바꾼 뒤 각 카드에 계산 결과를 인라인으로 쓴다:

```js
import { cardTransform, nextStackState, stackHeight } from './stackLayout.js'

const stack = document.querySelector('.card-stack')
const cards = [...stack.querySelectorAll('.card-stack-card')]
const layout = { count: cards.length, cardHeight: 180, peekPx: 56, fanGapPx: 72 }
let state = { mode: 'stacked', selectedIndex: null }

const apply = () => {
  stack.dataset.mode = state.mode
  stack.style.setProperty('--stack-count', String(cards.length))
  stack.style.minHeight = `${stackHeight({ ...layout, mode: state.mode })}px`
  cards.forEach((card, index) => {
    const { translateY, scale, zIndex } = cardTransform({ ...layout, index, mode: state.mode, selectedIndex: state.selectedIndex })
    card.style.transform = `translateY(${translateY}px) scale(${scale})`
    card.style.zIndex = String(zIndex)
    card.style.setProperty('--stack-index', String(index))
    card.setAttribute('aria-expanded', String(state.mode === 'selected' && state.selectedIndex === index))
  })
}

cards.forEach((card, index) => {
  card.addEventListener('click', () => {
    state = nextStackState({ ...state, action: { type: 'tapCard', index } })
    apply()
  })
})
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || state.mode === 'stacked') return
  state = nextStackState({ ...state, action: { type: 'dismiss' } })
  apply()
})
apply()
```

`--stack-card-height`는 `.card-stack`에 직접 선언한다(예: `style="--stack-card-height: 180px"`) — 코어 CSS가 카드 높이로 읽는다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 화면에 처음 그려진다 | 카드가 제자리(겹친 상태)에 바로 놓인다. 위치는 인라인 `transform`이고 전이는 값이 바뀔 때만 일어난다 | `assets` — `CardStack` |
| 이동 중에 또 누른다(연타) | 지금 자리에서 새 목표로 방향을 바꾼다. 상태는 누를 때마다 한 단계씩만 움직인다 | `assets` — CSS transition + `nextStackState` |
| 접히거나 선택으로 넘어가 컨테이너가 낮아진다 | 카드가 다 올라온 뒤(`--stack-duration`)에 `min-height`를 한 번에 줄인다. 바로 줄이면 내려가 있던 카드가 아래에서 잘린다. 펼칠 때는 바로 높인다 | `assets` — `card-stack.css` |
| 선택한 카드 앞의 카드가 추가·삭제된다 | 선택은 같은 카드에 남는다. 순번이 아니라 `id`로 기억한다 | `assets` — `CardStack` |
| 선택한 카드 자체가 삭제된다 | 펼침(`fanned`)으로 돌아가고 `onStateChange`가 그 상태를 알린다 | `assets` — `CardStack` |
| 카드가 0장·1장이다 | 0장은 높이 0의 빈 그룹이다. 1장은 눌러도 보이는 변화가 없다. 2장 이하면 이 패턴 대신 카드를 그대로 나열한다 | `프로젝트` |
| 카드가 수십 장이다 | 맨 뒤 카드의 배율은 0.86에서 멈추고, 순서 지연은 240ms에서 멈춘다. 높이는 장수 × 56px로 늘어나므로 10장을 넘으면 목록으로 바꾼다 | `assets`(배율·지연 한도) · `프로젝트`(장수 판단) |
| Esc를 누른다 | 한 단계 되돌린다. 포커스가 묶음 밖의 다른 요소(입력칸·위에 열린 대화상자·다른 묶음)에 있으면 받지 않는다 | `assets` — `CardStack` |
| 밝은 색 카드 | 포커스 링 기본색이 흰색이라 보이지 않는다. `--stack-focus-color`를 카드의 글자색으로 바꾼다 | `프로젝트` |
| 고대비 모드(`forced-colors: active`) | 그림자가 사라지므로 카드마다 1px 선(`ButtonText`)을 그어 겹친 경계를 보인다 | `assets` — `card-stack.css` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 이동 속도 | `--stack-duration` (기본 420ms — 드로어 커브 `cubic-bezier(0.32, 0.72, 0, 1)` 내장. 4장 기준 300~500ms) |
| 겹침 높이 | `peekPx` prop / `cardTransform({ peekPx })` (기본 56px — 제목 한 줄이 들어가는 최소) |
| 펼침 간격 | `fanGapPx` prop / `cardTransform({ fanGapPx })` (기본 72px — 카드 상단 제목+한 줄 정보가 보이는 정도) |
| 카드 높이 | `cardHeight` prop (기본 180px) → `--stack-card-height` |
| 모서리·기본 배경 | `--stack-radius`(기본 16px)·`--stack-card-bg` |
| 포커스 링 색 | `--stack-focus-color` (기본 흰색 — 진한 카드 배경 기준) |
| 스태거 간격 | `card-stack.css`의 `30ms` 상수와 상한 `240ms` — 8장을 넘으면 뒤쪽 카드는 함께 움직인다 |
| 뒤 카드 축소율 | `stackLayout.ts`의 `SCALE_STEP`(0.02) — 원근을 더 주려면 0.03, 없애려면 0. `MAX_SCALE_DEPTH`(7)장째부터는 더 줄지 않는다 |

## 함께 쓰는 패턴

- `patterns/page-transition` — 카드의 상세가 스크롤이 필요한 화면일 때. 묶음에서는 고르기만 하고 상세는 화면을 넘겨 보여 준다.
- `patterns/flip-list` — 겹치지 않고 나열한 카드 목록의 순서가 바뀔 때. 이 패턴 안에서는 순번이 바뀐 카드가 CSS 전이로 새 자리에 미끄러지므로 따로 붙이지 않는다.
- `patterns/bottom-sheet` — 고른 카드의 바코드·사용 버튼처럼 누를 것이 있을 때. 카드 안에는 버튼을 넣을 수 없으므로 선택 뒤 시트를 올린다.

## 주의사항

- **zIndex는 index 순(아래 카드가 앞)** — 애플 지갑과 같은 방향이다. 겹친 상태에서 맨 위 카드가 가장 뒤에 있고 뒤 카드들이 아래로 삐져나오며 앞을 덮는다. 반대로(위 카드가 앞) 하려면 `cardTransform`의 zIndex를 `count - 1 - index`로 바꾸고 peek 방향도 뒤집어야 하므로 이 패턴 범위 밖이다.
- **컨테이너의 `overflow: hidden`은 selected 모드의 핵심이다** — 나머지 카드가 컨테이너 아래로 내려가 윗가장자리만 보이는 모양이 이 잘림에서 나온다. 제거하면 카드가 다음 콘텐츠 위로 넘친다. 포커스 링은 그래서 안쪽(`outline-offset: -4px`)으로 그린다.
- 카드 높이는 고정이다(`cardHeight`). 카드마다 높이가 다르면 겹침 계산이 틀어진다 — 내용이 넘치는 카드는 안쪽에서 잘라라.
- 동작 줄이기에서는 이동과 스태거, 높이 지연을 끄고 즉시 재배치한다. 겹침·펼침 상태 자체는 그대로 전달되므로 CSS 블록을 지우지 않는다.
- 접힐 때 `min-height`를 늦게 줄이는 규칙은 `fanGapPx`가 `peekPx`보다 크다는 전제다. 반대로 두면 선택 모드로 갈 때 컨테이너가 오히려 높아지는데 그 변화가 `--stack-duration`만큼 늦는다.
- 순수 JS에서는 선택을 순번으로 들고 있다. 카드를 추가·삭제하기 전에 `dismiss`로 펼침까지 물러난다(React 래퍼는 `id`로 기억하므로 필요 없다).
- Tab 순서는 DOM 순서(순번)다. 선택 모드에서 맨 위로 올라온 카드도 Tab 순서는 제자리다.
