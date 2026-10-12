# suta 상세 안내

짧은 소개와 설치는 [README](../README.ko.md)에 있습니다. 이 문서는 설치 방법 전체, 동작 방식, 편집 후 검사, 패턴 57종, 저장소 구조, 개발과 기여 방법을 담습니다.

English: [guide.en.md](guide.en.md)

목차: [소개](#소개) · [무엇을 없애나](#무엇을-없애나) · [설치](#설치) · [업데이트](#업데이트) · [동작 방식](#동작-방식) · [편집 후 검사](#편집-후-검사) · [패턴 57종](#패턴-57종) · [구성](#구성) · [저장소 구조](#저장소-구조) · [개발](#개발) · [기여하기](#기여하기)

## 소개

AI로 UI를 만들 때 반복되는 카드, 과한 색상, 불필요한 장식을 줄이려고 만든 스킬입니다. 에이전트가 레이아웃·색·모션 기준을 참고하고, 패턴 57종의 코드를 프로젝트에 맞게 가져다 씁니다.

패턴에는 키보드 조작, 스크린 리더, 동작 줄이기 설정 대응이 포함됩니다. 플러그인은 편집 도구로 바꾼 파일의 레이아웃·모션 문제를 검사합니다. 셸로 파일을 썼다면 통합 검사를 직접 실행해야 합니다. 실제 화면과 조작은 브라우저에서 별도로 확인합니다.

이름은 손으로 면을 만드는 수타(手打)에서 따왔습니다.

## 무엇을 없애나

| AI가 흔히 만드는 UI | suta를 쓰면 |
|---|---|
| 어떤 화면이든 히어로 → 카드 3장 → 버튼 틀, 버튼은 전부 채운 색 | 국내 레퍼런스 앱 31곳의 화면에서 뽑은 화면 유형별 뼈대(표 아래 설명 참고). 상세 화면은 하단 고정 바에 채운 버튼 하나만 둠 |
| 모든 섹션을 카드로 감싸고, 카드 안에 상자를 또 넣음 | 간격과 얇은 선으로 묶음. 카드는 독립 단위에 한 겹만 |
| 숫자와 라벨이 같은 크기, 간격·반경 값이 제각각 | 크기·굵기로 위계를 세움. 간격·글자·반경은 토큰(척도)에서만 고름 |
| 그라데이션 글자·글로우·색 배지를 곳곳에, 9px 글자 | 강조는 화면마다 한두 곳. 글자는 12px 이상으로 두고 레이아웃 검사로 확인 |
| 아무 데나 `transition: all 0.3s ease` | 움직일 속성만, 크기에 맞는 시간과 감속 곡선(모션 토큰) |
| `height`·`top`을 움직여 화면이 버벅임 | `transform`·`opacity`만 움직임. 높이는 grid 기법, 자리 이동은 FLIP 기법으로 처리 |
| 동작 줄이기(reduced motion) 설정 무시 | 모든 CSS에 동작 줄이기 대응 |
| `div`로 만든 버튼, 키보드로 못 씀 | 기본 HTML 요소로 키보드·스크린 리더 지원 |
| 모달을 열어도 포커스·Esc·배경 스크롤이 그대로 | 포커스 이동과 복귀, Esc로 닫기, 배경 잠금 |
| 끌어서 닫기가 손가락을 따라오지 않음 | 손가락을 따라가고, 놓는 순간의 속도로 닫을지 판정 |
| 로딩은 스피너 하나, 연타하면 두 번 제출 | 스켈레톤으로 자리 잡기, 진행 중 버튼 잠금 |
| 매번 처음부터 새로 짠 코드 | 패턴 57종의 코드를 복사해 프로젝트에 맞춤 |

화면 유형별 뼈대는 국내 레퍼런스 앱 31곳에서 모은 화면 1,116장에서 뽑았습니다. 이 중 12장은 앱 화면이 아니었습니다(다른 앱의 화면, 전환 중에 찍힌 캡처 등). 그래서 집계는 나머지 1,104장으로 했습니다. 이 저장소의 문서에 두 숫자가 함께 나오는 것은 이 때문입니다.

## 설치

한 번만 설치하면 됩니다. 이후에는 평소처럼 UI를 요청하세요.

### Claude Code

```text
/plugin marketplace add Guksu/suta
/plugin install suta@suta
```

플러그인에는 스킬과 [편집 후 검사](#편집-후-검사)가 함께 들어 있습니다. 설치하면 바로 켜집니다.

### Codex

```bash
codex plugin marketplace add Guksu/suta
codex plugin add suta@suta
```

Codex는 플러그인의 훅을 사용자가 승인해야 실행합니다. Codex에서 `/hooks`를 열어 suta의 편집 후 검사를 승인하세요. 훅 없이 스킬만 쓰려면 아래 방법으로 설치해도 됩니다.

### Cursor·Gemini CLI·GitHub Copilot 등 (스킬만)

프로젝트 루트에서 한 줄로 설치합니다. 두 방법 중 하나를 고르세요. 이 방법은 스킬만 설치하므로 편집 후 검사는 돌지 않습니다. 검사는 에이전트가 작업 절차에 따라 직접 돌립니다.

```bash
# 방법 1: skills CLI (설치된 에이전트를 찾아 각 스킬 폴더에 넣음)
npx skills add Guksu/suta --skill suta

# 방법 2: 이 저장소의 설치 스크립트 (.agents/skills/suta에 복사, git만 필요)
curl -fsSL https://raw.githubusercontent.com/Guksu/suta/main/scripts/install-skills.sh | sh
```

| 원하는 것 | 명령 |
|---|---|
| 다른 폴더에 설치 | `… \| sh -s -- --dest .cursor/skills` |
| 내 컴퓨터 전체에서 쓰기 | `… \| sh -s -- --dest ~/.agents/skills` |
| 업데이트 | 같은 명령을 다시 실행 (`suta` 폴더만 교체) |

스크립트 없이 직접 복사해도 됩니다.

```bash
git clone --depth 1 https://github.com/Guksu/suta.git
mkdir -p .agents/skills
cp -R suta/skills/suta .agents/skills/
```

| 도구 | 프로젝트 스킬 폴더 | 개인 전역 폴더 |
|---|---|---|
| Codex | `.agents/skills/` | `~/.agents/skills/` |
| Cursor | `.agents/skills/` 또는 `.cursor/skills/` | `~/.agents/skills/` 또는 `~/.cursor/skills/` |
| Gemini CLI | `.agents/skills/` 또는 `.gemini/skills/` | `~/.agents/skills/` 또는 `~/.gemini/skills/` |
| GitHub Copilot | `.agents/skills/`, `.github/skills/` 또는 `.claude/skills/` | `~/.agents/skills/` 또는 `~/.copilot/skills/` |
| Claude Code | `.claude/skills/` (또는 위 마켓플레이스) | `~/.claude/skills/` |

경로는 2026년 9월 기준 각 도구의 문서를 따랐습니다. 도구가 바뀌면 그 도구의 문서를 확인하세요.

예전 버전(fe-skills)을 쓰고 있었다면 먼저 지웁니다. Claude Code에서는 `/plugin marketplace remove fe-skills`로 옛 마켓플레이스를 지운 뒤 위 명령으로 설치합니다. 설계 문답 플러그인 `fe-system`도 설치했다면 `/plugin uninstall fe-system@fe-skills`로 지웁니다. 예전 설치 스크립트와 skills CLI는 패턴마다 스킬 폴더(`bottom-sheet/` 등)를 따로 설치했습니다. 이 폴더들은 suta와 같은 요청에 겹쳐 걸리므로 지웁니다. 설계 문답의 `design` 폴더도 지웁니다. 설치 스크립트가 남은 폴더를 알려 줍니다.

## 업데이트

업데이트 전에 [릴리스 노트](https://github.com/Guksu/suta/releases)를 확인하세요.

**Claude Code**는 터미널에서 아래 명령을 실행하고 새 세션을 시작합니다.

```bash
claude plugin marketplace update suta
claude plugin update suta@suta
```

**Codex**는 `codex plugin marketplace upgrade suta`로 마켓플레이스를 갱신한 뒤, 앱의 플러그인 설정에서 suta의 설치 버전을 확인하고 업데이트합니다. 마켓플레이스 갱신만으로 설치된 플러그인까지 바뀌었다고 판단하지 마세요. 변경된 훅의 승인을 요청하면 `/hooks`에서 확인합니다.

**skills CLI**로 설치했다면 설치한 프로젝트에서 `npx skills update suta`를 실행합니다. 범위를 선택하면 해당 범위의 suta를 업데이트합니다. 저장소의 설치 스크립트를 사용했다면 같은 대상 경로로 설치 명령을 다시 실행합니다.

명령 참고: [Claude Code](https://code.claude.com/docs/en/discover-plugins#update-plugins-now) · [Codex 마켓플레이스](https://developers.openai.com/plugins/build/plugins) · [skills CLI](https://skills.sh/docs/cli).

## 동작 방식

1. suta를 한 번 설치합니다. suta는 스킬 하나이고, 에이전트는 시작할 때 suta의 설명문만 읽어 둡니다.
2. 평소처럼 요청합니다. "로그인 화면 만들어줘", "이 버튼 애니메이션 좀 다듬어줘"처럼 말하면 에이전트가 UI 작업임을 알아보고 suta를 엽니다. 스킬 이름을 말할 필요는 없습니다.
3. 에이전트가 suta의 패턴 카탈로그에서 맞는 패턴을 고르고, 그 패턴의 설명서(`PATTERN.md`)를 읽습니다.
4. 패턴 코드를 프로젝트의 프레임워크와 스타일 방식에 맞게 복사합니다.
5. 통합 검사 스크립트(`scripts/audit.mjs`)를 돌려 찾은 문제를 고칩니다. 이 스크립트는 레이아웃 결함(카드 안 카드·12px 미만 글자·효과 남발·척도 밖 간격)과 모션 결함(레이아웃 애니메이션·`transition: all`·동작 줄이기 누락)을 한 번에 찾습니다.

| 요청 | suta가 고르는 패턴 |
|---|---|
| "국수집 주문 화면 만들어줘" | `quantity-stepper` · `bottom-sheet` · `loading-button` · `toast-stack` |
| "바텀시트로 메뉴 옵션을 고르게 해줘" | `bottom-sheet` |
| "피드 사진을 핀치줌할 수 있게 해줘" | `pinch-zoom` |
| "애니메이션이 화면마다 제각각이야" | `motion-principles` · `motion-audit` |
| "카드가 너무 많아 답답해, 레이아웃 다듬어줘" | `layout-principles` · `layout-audit` |
| "국수집 메뉴 상세 화면 만들어줘" | `layout-principles`(상세 화면 뼈대) · `stretchy-header` · `quantity-stepper` · `loading-button` |

직접 부르고 싶다면 Claude Code에서는 `/suta:suta`, Codex에서는 `$suta`를 씁니다. 모든 UI 작업에 꼭 쓰게 하려면, 프로젝트의 `AGENTS.md`나 `CLAUDE.md`에 "UI 작업에는 suta 스킬을 따른다" 한 줄을 넣습니다.

> **스킬**은 AI 에이전트가 읽는 설명서입니다. suta는 스킬 하나 안에 패턴 57종을 담고, 필요한 패턴만 그때그때 읽습니다. 그래서 다른 스킬과 함께 설치해도 에이전트의 스킬 목록을 차지하지 않습니다.

### 편집 후 검사

Claude Code·Codex 플러그인으로 설치하면, 에이전트가 파일을 고칠 때마다 그 파일에 레이아웃·모션 검사가 돕니다. 이 검사는 훅으로 돕니다. 훅은 도구가 특정 시점에 자동으로 실행하는 명령입니다.

| 결과 | 에이전트에게 가는 것 |
|---|---|
| error: 11px 미만 글자, 레이아웃 속성 애니메이션, `transition: all`, 동작 줄이기 누락 | 목록과 고치는 법을 돌려보냅니다. 에이전트는 그 자리에서 고칩니다 |
| warn: 카드 안 카드, 효과 남발, 척도 밖 간격 등 | 최대 5줄로 알리기만 합니다. 고칠지는 원칙을 보고 판단합니다 |
| 문제 없음, 검사 대상이 아닌 파일 | 아무것도 출력하지 않습니다 |

- 이번 편집이 바꾼 줄만 봅니다. 원래 있던 문제로는 에이전트를 멈추지 않습니다. 다른 알림이 나갈 때만 "이번 편집과 무관한 기존 error N건"을 한 줄 덧붙입니다. 새로 만든 파일은 전체를 봅니다.
- 검사 대상은 CSS·SCSS·Less·TSX·JSX·Vue·Svelte·HTML(레이아웃·모션)과 TS·JS(모션)입니다. `node_modules`·빌드 폴더와 테스트 파일은 건너뜁니다.
- 의도한 예외는 그 줄 위에 이유를 적은 주석으로 남깁니다(`/* layout-audit-ignore: tiny-text — 차트 축 눈금 */`).
- 끄려면 환경 변수 `SUTA_HOOK=off`를 둡니다. Node 22.18 이상이 필요하고, 그보다 낮으면 검사 없이 지나갑니다. 편집을 막지는 않습니다.

## 패턴 57종

이름을 누르면 그 패턴의 설명서가 열립니다. 오른쪽 데모를 누르면 실제로 움직이는 화면을 볼 수 있습니다.

### 나타나고 사라지기

| 패턴 | 주요 동작 | 데모 |
|---|---|---|
| [진입/퇴장 애니메이션](../skills/suta/patterns/enter-exit/PATTERN.md) | 요소가 나타나고 사라질 때 CSS 애니메이션 적용 | [데모](https://guksu.github.io/suta/#/enter-exit) |
| [스크롤 리빌](../skills/suta/patterns/scroll-reveal/PATTERN.md) | 스크롤 위치에 따라 콘텐츠가 차례로 등장 | [데모](https://guksu.github.io/suta/#/scroll-reveal) |
| [스티키 헤더 전환](../skills/suta/patterns/sticky-header/PATTERN.md) | 큰 제목이 사라지면 고정 헤더에 작은 제목 표시 | [데모](https://guksu.github.io/suta/#/sticky-header) |
| [리스트 재배치](../skills/suta/patterns/flip-list/PATTERN.md) | 목록 순서가 바뀔 때 항목이 부드럽게 이동 | [데모](https://guksu.github.io/suta/#/flip-list) |
| [확대 전환 라이트박스](../skills/suta/patterns/zoom-lightbox/PATTERN.md) | 썸네일 위치에서 화면 중앙으로 확대하며 열기 | [데모](https://guksu.github.io/suta/#/zoom-lightbox) |
| [모달 다이얼로그](../skills/suta/patterns/modal-dialog/PATTERN.md) | 기본 `<dialog>` 기반으로 열기·닫기, Esc 키와 포커스 처리 | [데모](https://guksu.github.io/suta/#/modal-dialog) |
| [스프링 물리 모션](../skills/suta/patterns/spring-physics/PATTERN.md) | 드래그 속도를 이어받아 용수철처럼 움직이는 모션 | [데모](https://guksu.github.io/suta/#/spring-physics) |
| [다크모드 전환](../skills/suta/patterns/theme-toggle/PATTERN.md) | 누른 위치에서 원형으로 테마 전환, 선택 저장 및 기기 설정 반영 | [데모](https://guksu.github.io/suta/#/theme-toggle) |
| [늘어나는 이미지 헤더](../skills/suta/patterns/stretchy-header/PATTERN.md) | 큰 이미지 헤더가 스크롤엔 느리게 밀리며 어두워지고, 맨 위에서 당기면 늘어났다 돌아옴 | [데모](https://guksu.github.io/suta/#/stretchy-header) |
| [카드 확장](../skills/suta/patterns/card-expand/PATTERN.md) | 누른 카드가 제자리에서 자라나 상세 화면이 되고 닫으면 그 자리로 줄어드는 공유 요소 전환 | [데모](https://guksu.github.io/suta/#/card-expand) |
| [카드 묶음](../skills/suta/patterns/card-stack/PATTERN.md) | 겹친 카드가 누르면 세로로 펼쳐지고, 고른 카드가 맨 위로 올라오며 나머지는 아래로 겹침 | [데모](https://guksu.github.io/suta/#/card-stack) |

### 기다리는 동안

| 패턴 | 주요 동작 | 데모 |
|---|---|---|
| [스켈레톤 시머](../skills/suta/patterns/skeleton/PATTERN.md) | 로딩 중 콘텐츠 자리를 채우는 뼈대와 반짝임 효과 | [데모](https://guksu.github.io/suta/#/skeleton) |
| [숫자 카운트업](../skills/suta/patterns/count-up/PATTERN.md) | 잔액·포인트 등의 숫자를 목표값까지 점진적으로 변경 | [데모](https://guksu.github.io/suta/#/count-up) |
| [스토리 프로그레스](../skills/suta/patterns/story-progress/PATTERN.md) | 스토리 진행 표시, 길게 눌러 일시 정지, 탭으로 이동 | [데모](https://guksu.github.io/suta/#/story-progress) |
| [로딩 버튼](../skills/suta/patterns/loading-button/PATTERN.md) | 전송 중·완료 상태를 표시하고 중복 제출 방지 | [데모](https://guksu.github.io/suta/#/loading-button) |
| [무한 스크롤](../skills/suta/patterns/infinite-scroll/PATTERN.md) | 목록 끝에 도달하기 전에 다음 페이지를 불러오고 중복 추가 방지 | [데모](https://guksu.github.io/suta/#/infinite-scroll) |
| [가상 스크롤](../skills/suta/patterns/virtual-list/PATTERN.md) | 화면에 보이는 항목 중심으로 렌더링해 긴 목록 처리 | [데모](https://guksu.github.io/suta/#/virtual-list) |
| [원형 진행 링](../skills/suta/patterns/progress-ring/PATTERN.md) | SVG 원이 값에 따라 채워지는 진행 표시, 3중 링 겹치기·목표 초과 표시·무한 로딩 | [데모](https://guksu.github.io/suta/#/progress-ring) |

### 누르면 반응하기

| 패턴 | 주요 동작 | 데모 |
|---|---|---|
| [프레스 피드백](../skills/suta/patterns/press-feedback/PATTERN.md) | 누르는 순간 축소되고 손을 떼면 복원되는 효과 | [데모](https://guksu.github.io/suta/#/press-feedback) |
| [토스트 스택](../skills/suta/patterns/toast-stack/PATTERN.md) | 하단 또는 상단 배너 위치에 여러 알림을 쌓고 각각의 표시 시간이 지나면 닫기 | [데모](https://guksu.github.io/suta/#/toast-stack) |
| [좋아요 팝](../skills/suta/patterns/like-pop/PATTERN.md) | 하트 클릭·사진 더블 탭에 반응하는 팝 효과 | [데모](https://guksu.github.io/suta/#/like-pop) |
| [축하 오버레이](../skills/suta/patterns/celebration/PATTERN.md) | 목표 달성·배지 획득 순간에 지금 화면 위로 한 번 뜨는 축하 | [데모](https://guksu.github.io/suta/#/celebration) |
| [카트 플라이](../skills/suta/patterns/cart-fly/PATTERN.md) | 상품이 장바구니 아이콘으로 날아가는 효과 | [데모](https://guksu.github.io/suta/#/cart-fly) |
| [툴팁](../skills/suta/patterns/tooltip/PATTERN.md) | 마우스·키보드 입력에 맞춰 표시하고 여유 공간에 따라 배치 | [데모](https://guksu.github.io/suta/#/tooltip) |
| [폼 에러 흔들림](../skills/suta/patterns/form-shake-error/PATTERN.md) | 입력 오류가 있는 필드를 흔들고 오류 메시지 표시 | [데모](https://guksu.github.io/suta/#/form-shake-error) |

### 화면 이동

| 패턴 | 주요 동작 | 데모 |
|---|---|---|
| [탭 인디케이터 슬라이드](../skills/suta/patterns/tab-indicator/PATTERN.md) | 선택한 탭으로 밑줄이 부드럽게 이동 | [데모](https://guksu.github.io/suta/#/tab-indicator) |
| [스냅 캐러셀](../skills/suta/patterns/carousel/PATTERN.md) | 옆으로 밀면 카드 단위로 정렬되는 슬라이더 | [데모](https://guksu.github.io/suta/#/carousel) |
| [햄버거 메뉴](../skills/suta/patterns/hamburger-menu/PATTERN.md) | 메뉴 아이콘을 닫기 아이콘으로 바꾸고 패널 표시 | [데모](https://guksu.github.io/suta/#/hamburger-menu) |
| [화면 전환](../skills/suta/patterns/page-transition/PATTERN.md) | 헤더·탭바를 유지하며 이동 방향에 맞춰 화면 전환 | [데모](https://guksu.github.io/suta/#/page-transition) |
| [드롭다운 메뉴](../skills/suta/patterns/dropdown-menu/PATTERN.md) | 공간에 맞춰 위치를 바꾸고 방향키·첫 글자로 이동하는 액션 메뉴 | [데모](https://guksu.github.io/suta/#/dropdown-menu) |
| [스크롤 반응 유리 GNB](../skills/suta/patterns/glass-nav/PATTERN.md) | 맨 위에서는 투명, 내려가면 유리로 전환. 아래로 스크롤하면 숨고 올리면 나타나거나 알약 하나로 축소. 링크를 누르면 그 섹션으로 이동하고 활성 알약이 따라옴 | [데모](https://guksu.github.io/suta/#/glass-nav) |
| [하단 탭 바(GNB)](../skills/suta/patterns/bottom-nav/PATTERN.md) | 최상위 화면 4~5개를 오가는 하단 고정 메뉴. 개수 배지·새 소식 점, 상세·장바구니에서 숨기기, 키보드가 올라오면 숨기기, 홈 표시줄(안전 영역) 피하기 | [데모](https://guksu.github.io/suta/#/bottom-nav) |

### 손가락 제스처 (모바일)

| 패턴 | 주요 동작 | 데모 |
|---|---|---|
| [바텀시트](../skills/suta/patterns/bottom-sheet/PATTERN.md) | 아래에서 시트를 열고 드래그로 높이 조절·닫기 | [데모](https://guksu.github.io/suta/#/bottom-sheet) |
| [당겨서 새로고침](../skills/suta/patterns/pull-to-refresh/PATTERN.md) | 목록 상단을 당기면 저항감과 함께 새로고침 | [데모](https://guksu.github.io/suta/#/pull-to-refresh) |
| [밀어서 삭제](../skills/suta/patterns/swipe-to-delete/PATTERN.md) | 옆으로 밀어 액션 버튼(단일 삭제 또는 보관·나중에·삭제 여러 개) 표시, 끝까지 밀면 마지막 액션 실행 | [데모](https://guksu.github.io/suta/#/swipe-to-delete) |
| [피드 핀치줌](../skills/suta/patterns/pinch-zoom/PATTERN.md) | 두 손가락으로 사진을 확대하고 놓으면 복원 | [데모](https://guksu.github.io/suta/#/pinch-zoom) |
| [끌어내려 닫는 뷰어](../skills/suta/patterns/swipe-dismiss-viewer/PATTERN.md) | 사진을 아래로 끌어 축소하며 닫고 원래 위치로 복귀 | [데모](https://guksu.github.io/suta/#/swipe-dismiss-viewer) |
| [끌어서 순서 바꾸기](../skills/suta/patterns/drag-to-reorder/PATTERN.md) | 드래그 또는 방향키로 목록 순서 변경 | [데모](https://guksu.github.io/suta/#/drag-to-reorder) |
| [길게 눌러 메뉴](../skills/suta/patterns/long-press-menu/PATTERN.md) | 길게 누르거나 우클릭하면 항목이 떠오르고 뒤가 흐려지며 옆에 액션 메뉴 표시 | [데모](https://guksu.github.io/suta/#/long-press-menu) |
| [가장자리 스와이프 뒤로가기](../skills/suta/patterns/edge-swipe-back/PATTERN.md) | 왼쪽 가장자리를 끌면 이전 화면이 따라 나오고, 놓으면 거리·속도로 돌아갈지 판정 | [데모](https://guksu.github.io/suta/#/edge-swipe-back) |

### 입력 요소

| 패턴 | 주요 동작 | 데모 |
|---|---|---|
| [커스텀 셀렉트](../skills/suta/patterns/select/PATTERN.md) | 키보드 조작과 스크린 리더를 지원하는 드롭다운 | [데모](https://guksu.github.io/suta/#/select) |
| [아코디언](../skills/suta/patterns/accordion/PATTERN.md) | CSS로 높이를 전환하며 콘텐츠 펼치기·접기 | [데모](https://guksu.github.io/suta/#/accordion) |
| [토글 스위치](../skills/suta/patterns/switch/PATTERN.md) | 기본 체크박스를 활용한 켜기·끄기 스위치 | [데모](https://guksu.github.io/suta/#/switch) |
| [플로팅 라벨 입력](../skills/suta/patterns/floating-label/PATTERN.md) | 입력 상태에 따라 안내 문구를 상단 라벨로 전환 | [데모](https://guksu.github.io/suta/#/floating-label) |
| [체크박스 · 라디오](../skills/suta/patterns/checkbox-radio/PATTERN.md) | 선택 상태에 맞춰 체크 표시와 라디오 점에 모션 적용 | [데모](https://guksu.github.io/suta/#/checkbox-radio) |
| [인증번호 입력](../skills/suta/patterns/otp-input/PATTERN.md) | 입력·삭제 시 칸 이동, 인증번호 붙여넣기 지원 | [데모](https://guksu.github.io/suta/#/otp-input) |
| [세그먼트 컨트롤](../skills/suta/patterns/segmented-control/PATTERN.md) | 선택 칸 뒤로 알약 배경이 미끄러져 이동, 네이티브 라디오 그룹 기반 | [데모](https://guksu.github.io/suta/#/segmented-control) |
| [휠 피커](../skills/suta/patterns/wheel-picker/PATTERN.md) | 위아래로 굴려 가운데 칸에 스냅되는 드럼 피커, 3D 기울기·클릭·키보드 병행 | [데모](https://guksu.github.io/suta/#/wheel-picker) |
| [검색어 자동완성](../skills/suta/patterns/search-suggest/PATTERN.md) | 입력이 멈추면 검색하고 이전 응답이 최신 결과를 덮지 않도록 처리 | [데모](https://guksu.github.io/suta/#/search-suggest) |
| [범위 슬라이더](../skills/suta/patterns/range-slider/PATTERN.md) | 두 손잡이로 최솟값·최댓값을 조절하는 범위 입력 | [데모](https://guksu.github.io/suta/#/range-slider) |
| [수량 스테퍼](../skills/suta/patterns/quantity-stepper/PATTERN.md) | 버튼으로 수량 조절, 길게 눌러 가속, 최솟값에서 삭제 전환 | [데모](https://guksu.github.io/suta/#/quantity-stepper) |
| [파일 업로드](../skills/suta/patterns/file-upload/PATTERN.md) | 파일 드롭, 미리보기·진행률 표시, 거절 사유 안내 | [데모](https://guksu.github.io/suta/#/file-upload) |

### 표면과 스타일

| 패턴 | 주요 동작 | 데모 |
|---|---|---|
| [유리판 (글라스모피즘)](../skills/suta/patterns/glass-surface/PATTERN.md) | 뒤 배경이 흐릿하게 비치는 반투명 카드·GNB·모달, 흐림 미지원 시 불투명 판으로 전환 | [데모](https://guksu.github.io/suta/#/glass-surface) |

### 원칙과 검토

| 패턴 | 주요 동작 | 데모 |
|---|---|---|
| [모션 원칙과 토큰](../skills/suta/patterns/motion-principles/PATTERN.md) | 시간 5단계·이징 5종·스태거·reduced-motion을 토큰 한 벌로 정하고, 움직임 종류별로 어느 값을 쓸지 정한 원칙 | [데모](https://guksu.github.io/suta/#/motion-principles) |
| [모션 검사](../skills/suta/patterns/motion-audit/PATTERN.md) | CSS·JS를 훑어 레이아웃 속성 애니메이션·reduced-motion 누락·시간 범위 밖 등을 `file:line`으로 찾고 고치는 패턴을 안내 | [데모](https://guksu.github.io/suta/#/motion-audit) |
| [레이아웃 원칙과 토큰](../skills/suta/patterns/layout-principles/PATTERN.md) | 레이아웃 원칙, 화면 유형별 관례, 간격·글자·굵기·반경·색 토큰 한 벌(구성은 표 아래에) | [데모](https://guksu.github.io/suta/#/layout-principles) |
| [레이아웃 검사](../skills/suta/patterns/layout-audit/PATTERN.md) | CSS·JSX·HTML을 훑어 카드 안 카드·11px 미만 글자·효과 남발·척도 밖 간격·문단 가운데 정렬·옅은 색 면·색 계열 과다·이모지 아이콘·모바일 웹뷰의 100vh와 입력칸 확대 등을 `file:line`으로 찾고 고칠 원칙을 안내 | [데모](https://guksu.github.io/suta/#/layout-audit) |

레이아웃 원칙 패턴에는 다음이 들어 있습니다.

- 순서·위계·묶음·정렬·강조 원칙 12개
- 화면 유형 17종의 관례(AI 채팅·쇼핑 앱·증권·게이미피케이션 포함)와 하단 탭 바·모바일 웹뷰의 관례
- 선 아이콘 한 벌
- 글자·색·면 기준(무채색 + 강조색 하나 + 오류 빨강, 시세 화면은 상승·하락 색 짝을, 게이미피케이션은 보상 그림의 금·은·동을 따로)
- 간격·글자·굵기·반경·색 토큰 한 벌
- AI가 흔히 만드는 화면 9개와 고친 화면 비교

## 구성

```text
skills/suta/                         설치되는 스킬
├─ SKILL.md                         작업 절차 · AI 슬롭 금지선 · 레이아웃·모션 값 · 패턴 카탈로그
├─ scripts/
│  ├─ audit.mjs                     통합 검사: 레이아웃·모션 규칙을 한 번에
│  └─ post-edit-hook.mjs            편집 후 검사 훅 (Claude Code·Codex 플러그인)
└─ patterns/bottom-sheet/
   ├─ PATTERN.md                    사용 시점 · 구현 이유 · 사용법 · 옵션 · 주의사항
   └─ assets/
      ├─ createSheetDrag.ts         프레임워크에 독립적인 드래그 로직
      ├─ bottom-sheet.css           움직임과 상태 정의
      └─ BottomSheet.tsx            React 컴포넌트
```

패턴 코드는 패턴 단위로 복사해 쓸 수 있습니다. 여러 패턴이 함께 쓰는 로직은 각 패턴에 같은 파일로 들어 있고, 저장소 검사 스크립트가 원본과 같은지 확인합니다.

## 저장소 구조

```text
suta/
├─ skills/suta/                     설치되는 스킬: SKILL.md + 통합 검사(scripts/) + 패턴 57종(patterns/)
├─ .claude-plugin/                  Claude Code 마켓플레이스·플러그인 정보 (저장소 루트가 곧 플러그인, 편집 후 검사 훅 포함)
├─ .codex-plugin/                   Codex 플러그인 정보 (스킬 + 편집 후 검사 훅)
├─ .agents/plugins/                 Codex 마켓플레이스 정보
├─ AGENTS.md                        모든 코딩 에이전트를 위한 작업 지침 (단일 출처)
├─ CLAUDE.md                        Claude Code 전용 보충 (AGENTS.md를 가져옴)
├─ .agents/skills/add-skill/        패턴 추가 절차 (저장소 관리용, 일반 설치 목록에서는 숨김)
├─ demo/                            Vite + React 데모 사이트
├─ evals/                           선택 평가: 트리거(trigger.json)와 패턴(selection/), 퍼블리싱 벤치마크(benchmark/)
├─ scripts/                         검사 · 선택 평가 · 카탈로그 생성 · 벤치마크(benchmark/) · 설치 스크립트
└─ docs/                            설계 · 계획 · 작업 기록 · 규칙
```

## 개발

### 데모 실행

```bash
npm install
npm run dev
```

브라우저에서 [로컬 데모](http://localhost:5173/suta/)를 엽니다. 같은 네트워크의 휴대폰에서 확인하려면 `npm run dev -- -- --host`로 실행합니다.

### 검증

| 명령어 | 확인 항목 |
|---|---|
| `npm test` | Vitest + jsdom 테스트 |
| `npm run lint` | 코드 린트 |
| `npm run build` | 배포용 빌드 |
| `npm run catalog` | 진입 스킬의 패턴 카탈로그를 각 `PATTERN.md`와 데모 목록에서 다시 만듦 |
| `node scripts/validateSkills.mjs` | 진입 스킬·패턴 구조, 카탈로그 동기, 공유 코드 일치, README 배지 숫자 |
| `node scripts/evalSelection.mjs` | 선택 평가: UI 요청에 suta가 걸리는지(`evals/trigger.json`), 요청에 맞는 패턴이 골라지는지(`evals/selection/`) |
| `npm run validate` | 위 두 검사 + 레이아웃·모션 통합 검사(error만 출력)를 한 번에 |

`main`에 변경이 올라가면 GitHub Pages로 데모가 자동 배포됩니다.

## 기여하기

패턴 문서와 코드가 원본입니다. 데모는 `assets/`를 직접 불러오며, 코드를 복사하지 않습니다.

코딩 에이전트로 작업한다면 [`AGENTS.md`](../AGENTS.md)가 공통 지침입니다. Claude Code·Codex·Cursor·Gemini CLI·Copilot 모두 같은 규칙과 같은 패턴 추가 절차(`.agents/skills/add-skill/`)를 읽습니다.

### 패턴 추가

1. 선택 평가를 먼저 씁니다. `evals/selection/{이름}.json`에 이 패턴이 골라져야 하는 요청 3개와 골라지면 안 되는 이웃 요청 3개를 적습니다.
2. 설명서 `skills/suta/patterns/{이름}/PATTERN.md`를 만듭니다. `name`은 폴더명과 맞춥니다. `description`은 3인칭으로 무엇을 하고 언제 쓰는지만 적습니다(80~300자). 첫 문장이 카탈로그의 한 줄 요약이 됩니다. 본문은 사용 시점 → 구현 이유 → 사용법(React / 순수 JS) → 옵션 → 주의사항 순서로 작성합니다.
3. `assets/`에 구현 코드를 넣습니다. CSS와 프레임워크에 독립적인 로직입니다. 로직은 테스트부터 작성하고, 동작 줄이기 설정을 반영합니다.
4. 데모를 등록합니다. `demo/src/demos/{이름}/`에서 `@skills/{이름}/assets/...`를 불러오고, `demo/src/demos/index.ts`에 등록합니다.
5. `npm run catalog`로 진입 스킬의 패턴 카탈로그를 다시 만듭니다.
6. 빌드·린트·테스트·구조 검사·선택 평가(`npm run validate`)를 실행합니다. 그다음 브라우저에서 동작을 확인하고, 모션의 속도·감속·접근성 설정을 검토합니다.

패턴 표는 이 문서와 영어판(`guide.en.md`)에 한 행씩 더합니다. 패턴이나 테스트 수가 바뀌면 README 배지도 갱신해야 구조 검사를 통과합니다.

### 관련 문서

- [퍼블리싱 벤치마크](benchmark.md): 일반 Claude Code와 suta를 설치한 Claude Code 비교
- [에이전트 작업 지침](../AGENTS.md)
- [작업 규칙](harness-rules.md)
- [저장소 설계](design/2026-08-19-fe-skills.md)
- [추가 예정 패턴과 작업 계획](plans/)
