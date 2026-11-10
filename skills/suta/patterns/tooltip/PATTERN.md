---
name: tooltip
description: 호버·포커스 시 잠시 뒤 떠오르는 툴팁(tooltip) 말풍선을 구현한다 — 페이드+슬라이드 등장, 4방향 배치, Esc 닫기. "툴팁 컴포넌트, 말풍선 설명, 마우스 올리면 설명, 아이콘에 갖다 대면 도움말, 물음표 도움말 아이콘" 요청과 버튼·아이콘·용어에 짧은 보조 설명을 붙일 때 쓴다. 기존 적용분의 위치·지연 시간·색 수정에도 쓴다.
---

# tooltip — 툴팁 말풍선

라이브 데모: https://guksu.github.io/suta/#/tooltip

## 언제 쓰는가

아이콘 버튼의 이름, 용어의 짧은 풀이, 축약된 정보의 원문처럼 **없어도 동작하지만 있으면 이해가 빨라지는** 한 줄 보조 설명. 호버하면 잠깐 뒤에 떠오르고, 벗어나면 즉시 사라진다. 필수 정보(에러 메시지·필수 입력 안내)는 툴팁에 넣지 않는다 — 터치 기기에서는 호버가 없어 아예 못 보는 사용자가 생긴다.

**기술 선택:** 이벤트 와이어링(JS 소량) + CSS transition. 열림 지연은 JS 타이머가 담당한다 — CSS `transition-delay`로도 흉내낼 수 있지만 "지연 중 이탈하면 취소" 판정과 포커스 즉시 열림을 함께 다루려면 타이머가 명확하다. 배치는 앵커 기준 절대 배치(CSS)다. 코어는 열 때 한 번 재서 방향(`data-place`)과 옆으로 미는 양(`--_shift`)만 고른다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createTooltipTrigger.ts` | 코어 — 호버 지연·포커스 즉시·Esc 닫기 판정, 가장자리에서 뒤집기·밀어 넣기 | 모든 프로젝트 |
| `assets/tooltip.css` | 말풍선·화살표·4방향 배치·등장 모션 | 모든 프로젝트 |
| `assets/Tooltip.tsx` | React 래퍼 (aria-describedby 연결 포함) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { Tooltip } from './Tooltip'
import { Icon } from './Icon' // layout-principles의 선 아이콘 한 벌

const Toolbar = () => (
  <Tooltip label="장바구니에 담기" place="bottom">
    <button type="button" aria-label="담기"><Icon name="cart" /></button>
  </Tooltip>
)
```

- `children`은 포커스 가능한 단일 요소(버튼·링크)여야 한다 — 키보드 사용자도 포커스로 툴팁을 볼 수 있다.
- `place`: `top`(기본)·`bottom`·`left`·`right`. 그쪽에 자리가 없으면 열 때 반대쪽으로 뒤집힌다. `showDelayMs`로 호버 지연 조절(기본 400ms).

## 사용 방법 — 순수 JS (React 없음)

```html
<span class="tooltip-anchor">
  <button type="button" aria-label="담기" aria-describedby="tip-cart"><!-- layout-principles icons.ts의 iconSvg({ name: 'cart' }) --></button>
  <span class="tooltip" id="tip-cart" role="tooltip" data-place="top">장바구니에 담기</span>
</span>
```

```js
import { createTooltipTrigger } from './createTooltipTrigger.js'

const anchor = document.querySelector('.tooltip-anchor')
const tooltip = anchor.querySelector('.tooltip')
const cleanup = createTooltipTrigger({ anchor, tooltip }) // 해제 시 cleanup() 호출
```

앵커는 래퍼 요소여도 된다 — 코어가 `focusin`/`focusout`(버블링되는 포커스 이벤트)을 쓰므로 안의 버튼 포커스도 잡는다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 터치로 누른다 | 말풍선을 띄우지 않는다. `pointerType`이 `touch`인 진입은 호버로 보지 않는다(띄우면 손을 뗀 뒤에도 남는다). 터치에서도 알아야 하는 내용은 화면에 글자로 둔다 | `assets` / 내용 배치는 프로젝트 |
| 마우스로 앵커를 누른다 | 말풍선을 닫는다. 누른 결과(메뉴·모달)를 가리지 않는다. 그 누름이 가져온 포커스로는 다시 열지 않고, 키보드로 옮겨 온 포커스만 연다 | `assets` |
| 포인터를 말풍선 위로 옮긴다 | 닫지 않는다. 앵커와 말풍선 사이 틈(`--tooltip-offset`)은 보이지 않는 다리(`::after`)가 메운다. 말풍선에서도 벗어나면 닫는다 | `assets` |
| 모달·시트 안에서 Esc를 누른다 | 열린 말풍선만 닫고 그 키의 기본 동작을 막는다(`preventDefault`). 바깥 창은 다음 Esc에 닫힌다 | `assets` |
| 한 말풍선이 열린 채 다른 앵커로 간다 | 먼저 열린 것을 닫는다. 화면에 말풍선은 하나만 있다 | `assets` |
| 앵커가 화면 가장자리에 있다 | 정한 방향에 자리가 없으면 반대쪽으로 뒤집는다. `left`·`right`가 둘 다 좁으면 위·아래로 돌린다. 옆으로 넘친 만큼 화면 안으로 밀고(여백 8px), 화살표는 앵커를 계속 가리킨다 | `assets` |
| 문구가 길다 | 20rem(좁은 화면에서는 화면 폭 - 16px)에서 꺾인다. 한국어는 낱말 단위로 꺾인다(`word-break: keep-all`). 두 줄을 넘으면 툴팁이 아니라 다른 UI를 쓸 신호다 | `assets` — `--tooltip-max-width` |
| 조상이 `overflow: hidden`이다(모달·스크롤 영역·카드) | 말풍선은 절대 배치라 조상 밖으로 나간 부분이 잘린다. 뒤집기는 화면 가장자리만 본다. 조상의 위쪽 끝에 붙은 버튼에는 `place="bottom"`처럼 안쪽 방향을 정해 준다 | 프로젝트 |
| 앵커가 비활성 버튼이다 | `disabled` 버튼은 포커스를 받지 않아 키보드로는 말풍선을 볼 수 없다. 못 누르는 이유를 알려야 하면 `aria-disabled="true"`로 두고 누름만 막는다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 배경·글자색 | `--tooltip-bg`(기본 #2b2b2b)·`--tooltip-color`(#fff) |
| 앵커와의 간격 | `--tooltip-offset` (기본 10px — 화살표 높이 포함) |
| 최대 폭 | `--tooltip-max-width` (기본 20rem과 화면 폭 - 16px 중 작은 값) |
| 등장 속도 | `--tooltip-duration` (기본 150ms — 툴팁은 빠르게 뜨고 빠르게 진다) |
| 호버 지연 | `createTooltipTrigger`/`Tooltip`의 `showDelayMs` (기본 400ms) |

## 주의사항

- **호버는 지연, 포커스는 즉시** — 지연은 커서가 스쳐 지나갈 때 화면이 번쩍이는 것을 막기 위한 것이고, 키보드 포커스는 의도가 분명하므로 기다리게 할 이유가 없다. 코어에 내장된 규칙이니 바꾸지 말 것.
- **Escape 닫기는 WAI-ARIA 툴팁 패턴의 요구사항이다** — 제거하지 않는다. 호버로 뜨는 내용은 닫을 수 있고, 가리킬 수 있고, 스스로 사라지지 않아야 한다(WCAG 1.4.13). 그래서 시간이 지났다고 닫는 타이머를 넣지 않았다.
- 열린 말풍선은 포인터를 받는다(`pointer-events: auto`). 가리킬 수 있게 하려는 것이지 누를 것을 넣으라는 뜻이 아니다. 툴팁 안에 링크·버튼을 넣지 않는다(그건 popover/드롭다운 영역).
- 열린 말풍선은 그 밑의 요소를 가린다. 가로로 나란한 버튼에는 `left`·`right`보다 `top`·`bottom`을 쓴다. 옆 버튼을 덮으면 그 버튼으로 가는 길에 말풍선이 닫히지 않는다.
- 닫힌 말풍선도 자리를 차지한다(`visibility: hidden`). 코어가 붙을 때 화면 밖으로 넘친 말풍선을 한 번 맞추지만, 그 뒤 레이아웃이 바뀌면 다음에 열릴 때까지 페이지가 옆으로 넓어질 수 있다. 가장자리에 앵커가 모인 영역에는 `overflow-x: clip`을 둔다.
- 터치 기기의 길게 눌러 보기는 넣지 않았다. 길게 누르기는 브라우저의 글자 선택·컨텍스트 메뉴와 겹친다.
- **reduced-motion 대응 내장** — 슬라이드를 0으로 줄여 페이드만 남긴다. 블록 제거 금지.
