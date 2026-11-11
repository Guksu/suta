---
name: glass-surface
description: 뒤 배경이 흐릿하게 비치는 반투명 유리판 글라스모피즘(glassmorphism) 카드·헤더·내비게이션 바를 구현한다. "글라스 UI, 유리 효과, 유리처럼 반투명한 헤더, 블러 카드, 뒤가 비치는 배경, backdrop-filter" 요청과 사진·그라데이션 위에 얹는 카드·상단 바에 쓴다. 기존 적용분의 흐림 정도·투명도·테두리·폴백 수정에도 쓴다.
---

# glass-surface — 유리판(글라스모피즘)

라이브 데모: https://guksu.github.io/suta/#/glass-surface

## 언제 쓰는가

알록달록한 배경(사진·그라디언트) 위에 카드나 바를 띄우면서 **뒤가 무엇인지 계속 보이게** 하고 싶을 때. 불투명 판은 배경을 가리고, 그냥 반투명 판은 글자가 안 읽힌다. 유리판은 뒤를 뭉개서(blur) 글자와 분리하고 색만 남긴다. iOS 컨트롤 센터·macOS 사이드바·최근 웹의 히어로 카드와 상단 바가 이 관례를 쓴다.

세 자리에 쓴다:

| 자리 | 클래스 | 이유 |
|------|--------|------|
| 카드 | `glass glass-card` | 사진·그라디언트 위의 정보 카드. 배경이 카드 뒤로 이어져 보인다 |
| GNB(상단 바) | `glass glass-nav` | 콘텐츠가 바 밑으로 스크롤되어 지나가는 것이 보인다 — 바가 "위에 떠 있다"는 신호 |
| 모달 | `glass glass-modal` | 뒤 화면이 흐리게 남아 "잠깐 위에 얹힌 것"임을 알린다 |

**기술 선택:** 순수 CSS. `backdrop-filter: blur()`가 유리의 핵심이고, 나머지(반투명 tint·밝은 테두리·위쪽 1px 하이라이트)는 배경·테두리·안쪽 그림자다. JS 로직이 없어 코어 파일도 없다 — CSS가 곧 정본이다. 흐림을 못 쓰는 환경(미지원 브라우저·투명도 줄이기·대비 높이기 설정)에서는 `@supports`와 미디어 쿼리로 **불투명 판으로 자동 전환**한다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/glass.css` | 전부 — 유리 4겹·변형 3종·폴백 4종·reduced-motion | 모든 프로젝트 |
| `assets/Glass.tsx` | React 편의 래퍼(로직 없음) | React 프로젝트만(선택) |

## 사용 방법

1. `assets/glass.css`를 복사한다(반드시 읽어라 — 전체 구현이 이 파일이다).
2. 유리를 놓을 요소에 `glass` + 자리 클래스를 붙인다. **뒤에 무언가 있어야 한다** — 단색 배경 위의 유리는 그냥 회색 판이다.
3. 배경 밝기에 맞춰 톤을 고른다: 어둡거나 알록달록한 배경 → 기본(흰 유리, 밝은 글자). 밝은 배경 → `data-tone="dark"`(검은 유리, 밝은 글자).
4. 글자색은 직접 정한다(`color`). 유리는 `color: inherit`다 — 기본 폴백 판이 어두운 색이므로 밝은 글자를 전제한다.

```html
<!-- 순수 HTML — 카드 -->
<section class="glass glass-card">
  <h3>오늘의 국수</h3>
  <p>멸치 육수 잔치국수 · 7,000원</p>
</section>

<!-- GNB — 스크롤 컨테이너의 첫 자식으로 두면 sticky로 위에 붙는다 -->
<header class="glass glass-nav" data-tone="dark">
  <strong>국수집</strong>
  <nav>…</nav>
</header>

<!-- 모달 — 열기·닫기·포커스는 modal-dialog 패턴, 겉모습만 여기서 -->
<dialog class="glass glass-modal">…</dialog>
```

```tsx
// React — 편의 래퍼 사용
import { Glass } from './Glass'

const MenuCard = () => (
  <Glass as="section" variant="card" tone="light">
    <h3>오늘의 국수</h3>
    <p>멸치 육수 잔치국수 · 7,000원</p>
  </Glass>
)

// 누를 수 있는 유리는 a나 button으로 그린다 — interactive는 겉모습만 바꾼다
const MenuLink = () => (
  <Glass as="a" href="/menu" variant="card" interactive>
    전체 메뉴 보기
  </Glass>
)

const TopBar = () => (
  <Glass as="header" variant="nav" tone="dark">
    <strong>국수집</strong>
  </Glass>
)
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| `backdrop-filter`가 없는 브라우저 | `@supports not`으로 배경을 `--glass-fallback-bg`(기본 `#262a35`, 어두운 톤은 `#171a21`)로 채운다 | `assets` |
| 투명도 줄이기·대비 높이기 설정 | 같은 단색 판으로 바꾸고 흐림을 끈다. 대비 높이기에서는 테두리가 글자색이 된다 | `assets` |
| 고대비(`forced-colors`) | 배경색은 시스템 색으로 바뀌어도 투명도는 남는다. 그대로 두면 옅은 바탕색 뒤로 사진이 비친다. `Canvas`로 채우고 흐림을 끄고 `CanvasText` 테두리를 긋는다 | `assets` |
| 폴백 판 위의 글자 | 기본 폴백 판은 어둡다. 어두운 글자를 쓰는 화면은 평소에는 읽히다가 위 세 환경에서만 어두운 판 위의 어두운 글자가 된다. `--glass-fallback-bg`를 밝게 하거나 `--glass-fallback-color`로 글자색을 맞추고, `data-opaque="true"`를 붙여 눈으로 확인한다 | 프로젝트 |
| 뒤의 사진이 늦게 뜬다 | 사진이 오기 전에는 유리 뒤가 페이지 바탕색이다. 흰 유리와 밝은 글자가 흰 바탕 위에 놓인다. 사진 칸에 그 사진의 평균색을 `background-color`로 깐다 | 프로젝트 |
| 뒤가 스크롤되며 밝기가 바뀐다(GNB) | 글자 대비가 자리마다 달라진다. 가장 밝은 구간에서 4.5:1이 안 나오면 tint의 알파를 올리거나(0.5 이상) `data-tone="dark"`로 바꾼다 | 프로젝트 |
| 누를 수 있는 유리 | hover는 가리킬 수 있는 기기에서만 tint가 12% 밝아진다. 누르는 동안은 20%, 포커스는 글자색 2px 링이다. `disabled`·`aria-disabled="true"`면 반응하지 않고 글자색이 반으로 옅어진다 | `assets` |
| 모달 내용이 화면보다 길다 | `glass-modal`이 세로로 스크롤한다(`overflow: hidden auto`). 끝에서 더 굴려도 뒤 화면은 움직이지 않는다 | `assets` |
| `glass-nav` 아래로 내용이 지나간다 | 바가 내용을 덮는다. 앵커 이동과 Tab 포커스가 바 밑에 가리지 않게 스크롤 컨테이너에 `scroll-padding-top`을 바 높이로 준다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 흐림 정도 | `--glass-blur` (기본 16px — 8px 아래는 뒤가 그대로 보여 글자와 겹치고, 32px 위는 흐림이 배경을 다 지워 불투명 판과 다를 게 없다) |
| 유리 색·투명도 | `--glass-tint` (rgba — 알파 0.1~0.2가 유리, 0.5를 넘으면 반투명 판) |
| 테두리·위쪽 빛줄기 | `--glass-border`·`--glass-highlight` (둘 다 흰색 알파 — 지우면 유리 두께감이 사라진다) |
| 모서리 | `--glass-radius` (기본 16px, GNB는 0으로 고정) |
| 폴백 판 색 | `--glass-fallback-bg` (흐림을 못 쓸 때 대신 칠하는 단색 — 글자색과 대비 4.5:1 이상으로) |
| 폴백 판 위 글자색 | `--glass-fallback-color` (기본 상속 — 폴백에서만 글자색을 바꿔야 할 때) |
| 특정 자리만 불투명 | `data-opaque="true"` (배경이 너무 밝거나 복잡해 글자가 안 읽히는 자리) |

## 함께 쓰는 패턴

- `patterns/modal-dialog` — `glass-modal`은 겉모습만이다. 열기·닫기·포커스는 그 패턴의 코드가 맡고, `<dialog>`에 `glass glass-modal` 클래스를 더한다.
- `patterns/glass-nav` — 스크롤에 따라 투명에서 유리로 바뀌거나 숨는 상단 바. 늘 유리인 바는 이 패턴의 `glass-nav` 클래스로 충분하다.
- `patterns/theme-toggle` — 테마마다 유리 색이 다르다. `:root[data-theme='dark']`에서 `--glass-tint`·`--glass-fallback-bg`를 함께 바꾼다.

## 주의사항

- **글자 대비를 보장할 수 없다.** 유리는 뒤에 오는 색에 따라 밝기가 바뀐다. 뒤가 밝은 자리에 흰 유리 + 흰 글자를 두면 안 읽힌다 → 톤을 바꾸거나(`data-tone="dark"`) tint 알파를 올리거나 `data-opaque`로 그 자리만 판을 채운다. 글자에 그림자를 얹어 버티지 마라 — 흐림 위의 그림자는 번져 보인다.
- **폴백 블록은 지우지 않는다.** `backdrop-filter` 미지원, OS "투명도 줄이기", OS "대비 높이기", 고대비, 수동 `data-opaque`다. `prefers-reduced-transparency`는 아직 지원 브라우저가 적어(Chromium 계열 위주) 혼자 믿지 말고 `@supports`·`prefers-contrast`와 함께 둔다.
- **흐림은 비싸다.** `backdrop-filter`는 뒤 화면이 바뀔 때마다(스크롤·애니메이션) 유리 영역을 다시 계산한다. 한 화면에 유리 몇 장은 괜찮지만, 목록 항목 수십 개를 전부 유리로 만들면 스크롤이 끊긴다 — 목록에서는 컨테이너 하나만 유리로 하고 항목은 일반 판으로.
- **흐림 반경을 애니메이션하지 마라.** `--glass-blur` 전이는 매 프레임 필터를 다시 돌린다. 등장 애니메이션이 필요하면 opacity·transform만 움직인다(enter-exit 패턴).
- **유리 안의 유리는 뒤를 못 본다.** `backdrop-filter`는 새 배경 기준(backdrop root)을 만들므로, 유리 안에 유리를 넣으면 안쪽은 바깥 유리의 내용만 흐리고 페이지 배경은 보지 못한다. 겹치지 말고 나란히 두라.
- **reduced-motion 대응 내장** — 유리 자체는 움직이지 않고, 유일한 모션인 `glass-interactive`의 hover 전이를 끈다.
- 모달의 `::backdrop`은 흐리지 않는다. `<dialog>`가 최상위 레이어에 있어 유리 판(`glass-modal`) 자체의 `backdrop-filter`가 뒤 화면 전체를 흐리며, 백드롭은 어둡게만 한다.
