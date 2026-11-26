# 레이아웃과 화면 단위 모션의 빈 곳

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-11-26 |
| 계기 | 사용자 목표 "고객이 원하는 UI를 만들어 주는 구독형 제품"의 한 방향 — 전문성이 느껴지는 레이아웃과 적절한 애니메이션(스크롤이나 사소한 것까지) |
| 범위 | 조사만 한다. 코드·스킬 문서는 고치지 않았다. 새 측정(claude CLI 벤치마크)은 돌리지 않고, 지난 결과 JSON과 비교 이미지만 다시 봤다 |
| 반영 | 없음. 마지막 절 "구현 후보"가 다음 작업의 후보다 |

## 1. 한눈에

- **모션 토큰이 패턴에 이어져 있지 않다.** 패턴 CSS 53개 중 `var(--motion-…)`을 참조하는 파일이 0개다. 공개 시간 변수 34개의 폴백(40곳)이 14종(140·150·160·200·220·240·250·260·280·300·350·400·420·600ms)이고, 토큰 값과 같은 것은 150·250·350·420 네 종뿐이다. 패턴 CSS 전체의 ms 숫자는 30종이 넘는다. 이징은 `cubic-bezier` 리터럴 9종과 `ease` 44곳이다. 층(그림자·순서)은 0.18에서 토큰 사슬로 묶었지만 모션은 아직이다.
- **값이 서로 어긋난다.** 토큰의 화면 전환은 420ms인데 `page-transition`의 기본값은 280ms이고, 문서는 "280ms를 넘기지 않는 편이 좋다"고 쓴다. `scroll-reveal`은 600ms이고 예시 코드가 `i * 80`(상한 없음)이라 같은 패턴의 "상태와 경계" 표와 어긋난다.
- **화면 단위 모션의 기준이 없다.** 화면 진입 순서, 진입 전체 길이 상한, 스크롤 연동(CSS scroll-driven animations), 숫자·그래프 진입, 상호작용 상태 한 벌(호버·포커스·눌림·잠김)의 토큰이 없다. 포커스 링만 해도 `outline: 2px solid …` 15가지, `outline-offset` 8가지로 패턴마다 다르다.
- **벤치마크에서 화면 단위 모션 패턴은 한 번도 쓰이지 않았다.** suta 조건 131번 중 `scroll-reveal`·`sticky-header`·`stretchy-header`·`page-transition`·`enter-exit`·`count-up`·`skeleton`·`flip-list`·`tab-indicator` 사용은 0번이다. 판정도 정지 화면만 봐서 모션의 질은 한 번도 재지 않았다.
- **레이아웃은 원칙이 있지만 렌더 결과를 재는 장치가 모자라다.** 근접(묶음 안 ≤ 묶음 사이의 1/2)·정렬선·줄 길이 원칙은 문서에 있다. 검사는 4px 척도(`spacing-off-scale`)만 본다. 지난 실행에서 suta 화면의 15px 미만 글자 비율 중앙값이 59%였다(원칙은 "가장 많은 글자는 16").
- **출처를 붙인 수치가 거의 없다.** suta의 레이아웃 값은 레퍼런스 실측이 근거이고, 모션 값과 줄 길이(한글 35~40자)에는 출처가 없다. 이번에 확인한 1차 출처(Dyson 2004, 신종현·박민용 2003, Harrison 외 2007·2010, WCAG, 공개 디자인 시스템 토큰)를 6절에 모았다.

## 2. 방법

- **읽은 파일:** `AGENTS.md`, `skills/suta/SKILL.md`, `references/defaults.md`·`design.md`·`detail.md`, `patterns/layout-principles/references/principles.md`·`screen-conventions.md`(넓은 화면·랜딩 절)·`assets/layout-tokens.css`, `patterns/motion-principles/`(PATTERN.md·`references/decision-table.md`·`assets/motion-tokens.css`), `patterns/motion-audit/PATTERN.md`, `scroll-reveal`·`sticky-header`·`stretchy-header`·`page-transition`·`enter-exit`·`press-feedback`의 PATTERN.md와 CSS.
- **세어 본 것:** 패턴 CSS 53개에서 시간 폴백·이징·`outline` 선언·미디어 쿼리 폭을 `grep`으로 셌다.
- **지난 산출물:** `evals/benchmark/*results*.json` 23개 파일의 실행 262개(조건마다 131개)를 다시 집계했다. 생성된 HTML은 저장소에도 이 환경에도 남아 있지 않다. 그래서 소스의 transition·animation·scroll 사용 빈도는 셀 수 없었다. 대신 측정 스크립트(`scripts/benchmark/measure.mjs`)가 렌더한 화면에서 센 값(`moving` 등)을 썼다.
- **웹 출처:** 원문을 직접 읽은 것과 요약·2차 출처로만 본 것을 나눠 적는다.
  - **[원문]** 논문 PDF나 공식 문서 본문을 읽었다.
  - **[공식 저장소]** 디자인 시스템의 공식 코드 저장소에 있는 토큰 파일을 읽었다.
  - **[초록]** 초록·서지 정보만 읽었다.
  - **[2차]** 다른 사람의 인용·요약으로만 확인했다.
  - 브라우저 지원은 2026-11-26에 caniuse·MDN 페이지를 요약 도구로 읽은 값이다. 버전 숫자는 그 페이지가 보인 그대로다.

## 3. 조사 1 — 지금 있는 것의 지도

### 간격·정렬

| 무엇 | 값·규칙 | 파일 |
|---|---|---|
| 간격 척도 | 4·8·12·16·24·32·48·64px(`--space-1`~`--space-16`) | `patterns/layout-principles/assets/layout-tokens.css` |
| 간격의 역할 | 묶음 안 8(`--gap-item`), 묶음 사이 24(`--gap-group`), 구역 사이 32 → 768px 이상 48(`--gap-section`), 띠 8(`--band`) | 같은 파일 |
| 근접 규칙 | 묶음 안 간격 ≤ 묶음 사이 간격의 1/2. 빈 공간은 묶음 사이에 두고, 제목과 그 내용 사이에 두지 않는다 | `references/principles.md` P4, `references/defaults.md` 4절 |
| 화면 좌우 여백 | 16 → 768px 이상 24(`--page-inline`). 화면 하나에 한 값 | `layout-tokens.css`, `defaults.md` 5절 |
| 콘텐츠 최대 폭 | 1120(`--content-max`), 넓은 화면 1120~1280 | `layout-tokens.css`, `screen-conventions.md` "넓은 화면" |
| 넓은 창의 모바일 화면 | 옅은 바탕 위 흰 열 480~560, 위아래 32~48 띄움 | `screen-conventions.md` "넓은 화면에서 모바일 화면" |
| 중단점 | 768px 하나(토큰 재정의). 패턴 CSS의 폭 미디어 쿼리도 `min-width: 768px` 1곳뿐 | `layout-tokens.css` |
| 열 | 넓은 화면은 요소를 늘이지 않고 열을 늘린다 — `repeat(auto-fill, minmax(…, 1fr))`. 열 수 기준은 없다 | `principles.md` P7·P8 |
| 밀도 | 업무 도구는 행 40~48·설명 줄 줄임. 전체 밀도는 간격 역할 토큰을 한 단계씩 옮긴다 | `references/design.md` 1절 표, `layout-principles/PATTERN.md` 커스터마이즈 |
| 정렬선 | 왼쪽 선 하나, 가운데는 짧은 한 줄만, 금액은 오른쪽 + `tabular-nums` | `principles.md` P6 |
| 하위 항목·구분선 | 상위 글자 시작선에 맞춤, 구분선은 글자 시작선부터 | `principles.md` P6, `references/detail.md` 5절 |
| 아이콘과 글자 | 한 줄이면 `align-items: center`, 간격 4~8, 아이콘 한 벌(24 격자·선 1.75) | `detail.md` 5절, `defaults.md` 4절 |
| 시각 보정(optical alignment) | 없음 | — |
| 세로 리듬 | 없음(줄 높이 배수 규칙 없음. 4px 척도만) | — |

### 글자

| 무엇 | 값·규칙 | 파일 |
|---|---|---|
| 글자 크기 | 12·14·16·20·24·32·40px, 한 화면 4~5종 | `layout-tokens.css` |
| 단계 비율 | 핵심 수치는 라벨의 2~3배, 화면 제목은 본문의 1.5배. 이웃 토큰 사이 비율은 1.14~1.33으로 한 비율(modular scale)이 아니다 | `principles.md` P2 |
| 넓은 화면의 가장 큰 글자 | 데스크톱 48~64, 모바일 32~40. 토큰은 40에서 멈춘다 | `screen-conventions.md` "넓은 화면", `defaults.md` 5절 |
| 줄 간격 | 본문 1.5, 제목·수치 1.3 | `layout-tokens.css` |
| 줄 길이 | `--measure: 65ch`, 주석 "한글은 한 줄 35~40자". 출처 표기 없음 | `layout-tokens.css`, `principles.md` P8 |
| 굵기 | 400·600·700 | `layout-tokens.css` |
| 업종별 | 공공·긴 글 본문 17~19, 빽빽한 도구 14, 명조·고정폭 자리 | `defaults.md` 3절, `tone.md` 5절 |
| 줄바꿈 | 제목 `text-wrap: balance`, 문단 `pretty`, `word-break: keep-all` | `defaults.md` 4절, `detail.md` 5절 |

### 모션

| 무엇 | 값·규칙 | 파일 |
|---|---|---|
| 시간 | 100(instant)·150(fast)·250(base)·350(slow)·420ms(page) | `patterns/motion-principles/assets/motion-tokens.css` |
| 퇴장 | 진입 × 0.75, 이징은 퇴장도 ease-out("퇴장에 ease-in을 쓰지 마라") | 같은 파일, `motion-principles/PATTERN.md` 규칙 1 |
| 이징 | ease-out `(0.22, 1, 0.36, 1)`, in-out `(0.65, 0, 0.35, 1)`, drawer `(0.32, 0.72, 0, 1)`, overshoot `(0.34, 1.56, 0.64, 1)`, linear | `motion-tokens.css` |
| 스태거 | 30ms, 10개까지만. 진입 전체 길이 상한은 없다 | `motion-tokens.css`, `motion-principles/PATTERN.md` 규칙 3 |
| 동작 줄이기 | 시간 1·1·80·80·120ms, 스태거 0. 각 패턴 CSS가 이동·확대를 끄고 페이드만 남긴다 | `motion-tokens.css`, 각 패턴 CSS |
| 사용 문제 선 | `transform`·`opacity`만, `transition: all` 금지, 장식용 무한 반복 금지, `setInterval` 금지, 상시 `will-change` 금지 | `SKILL.md` "모션" |
| 검사 | `layout-animation`·`transition-all`·`no-reduced-motion`(error), `duration-range`(60ms 미만·700ms 초과)·`linear-movement`·`ease-in-exit`·`infinite-loop`·`js-interval-anim`·`will-change-global`(warn) | `patterns/motion-audit/PATTERN.md` |
| 화면 전환 | View Transitions API, 깊이 이동에만 좌우 밀림, 기본 280ms, 동작 줄이기 120ms 겹침 | `patterns/page-transition/` |
| 스크롤 등장 | IntersectionObserver + CSS, 기본 600ms·24px, 첫 화면에는 쓰지 않음 | `patterns/scroll-reveal/` |
| 머리 줄임 | 큰 제목은 본문으로 두고 고정 높이 머리에 작은 제목을 페이드(IntersectionObserver), 250ms | `patterns/sticky-header/` |
| 커버 이미지 | 패럴랙스·당김 늘어남(scroll 이벤트 + rAF) | `patterns/stretchy-header/` |
| 눌림 | `scale` 0.96, 누름 60ms·복귀 220ms 비대칭, 호버 리프트는 정밀 포인터만 | `patterns/press-feedback/` |
| 진입·퇴장 | `data-state` 상태 기계, 기본 300ms, 16px·0.95 | `patterns/enter-exit/` |
| 숫자 | 카운트업 600~800ms, 진행 링 600ms | `motion-principles/references/decision-table.md` |
| 상호작용 상태 한 벌 | 없음(포커스 링·호버 토큰 없음) | — |
| 스크롤 연동 CSS | 없음(`animation-timeline` 사용 0곳) | — |

### 지도에서 보이는 어긋남

1. **토큰이 이어지지 않는다.** `SKILL.md` 절차 6은 "패턴의 공개 변수를 프로젝트 토큰에 잇는다"고 쓰고, 잇는 법은 `motion-principles/PATTERN.md`의 예시 8줄뿐이다. 패턴 CSS는 `var(--sheet-duration, 350ms)`처럼 숫자로 끝나서, 토큰 파일을 넣어도 그 8줄을 쓰지 않으면 아무것도 바뀌지 않는다.
2. **폴백 값 14종.** 공개 시간 변수의 폴백이 140·150·160·200·220·240·250·260·280·300·350·400·420·600ms다. 토큰 다섯 단계(100·150·250·350·420)와 같은 값은 네 종뿐이다. 모달은 240, 시트는 350, 햄버거 패널은 300으로 같은 "화면 크기의 이동"이 셋으로 갈린다.
3. **이징 리터럴.** `(0.22, 1, 0.36, 1)` 48곳, `(0.32, 0.72, 0, 1)` 8곳, `(0.23, 1, 0.32, 1)` 5곳 외 6종과 키워드 `ease` 44곳이다. `(0.23, 1, 0.32, 1)`처럼 토큰과 눈에 띄지 않게 다른 값이 섞여 있다(레이아웃 원칙 P10이 "#181818과 #151515"로 경계한 증상).
4. **화면 전환 시간의 모순.** 토큰 `page` 420ms ↔ `page-transition` 기본 280ms·"280ms를 넘기지 않는다". 대응표(`decision-table.md`)는 page-transition에 `page`를 넘기라고 쓴다.
5. **스태거의 모순.** 토큰은 30ms·10개까지, `scroll-reveal` 예시는 `delayMs={i * 80}`(상한 없음), 같은 문서의 "상태와 경계" 표는 열 번호 × 80을 권한다.
6. **포커스 링 15가지.** `outline: 2px solid` 뒤의 색이 `currentColor`·`Highlight`·`var(--_accent)`·`#fff`·`#1c1c1c`와 패턴별 변수(`--range-accent`·`--qty-accent`·`--lpm-focus`·`--menu-focus`·`--segment-focus-color`·`--stack-focus-color`)로 갈린다. `outline: none`도 9곳이고, `outline-offset`은 −6·−4·−2·1·2·3·4·6px 8가지다.
7. **글자 크기 토큰과 관례의 틈.** 관례는 데스크톱 가장 큰 글자 48~64를 쓰라고 하는데 토큰은 40에서 끝나고, 토큰 주석은 "글자 크기를 화면 폭에 따라 키우지 않는다"고 쓴다.

## 4. 조사 2 — 빠진 것

표의 "suta"는 있다 / 부분 / 없다이다.

### 레이아웃

| 주제 | suta | 지금 상태 | 외부 근거 (확인 수준) |
|---|---|---|---|
| 글자 크기 비율(modular scale — 하나의 비율을 곱하고 나눠 크기를 만드는 방법) | 부분 | 역할별 7단계, 이웃 비율 1.14~1.33. 비율 하나로 만든 척도는 아니다. 데스크톱 큰 글자(48~64) 토큰이 없다 | Tim Brown, "More Meaningful Typography", A List Apart, 2011-05-03 [원문]. 본문 크기에서 비율(예: 1:1.618)을 곱하고 나눠 크기를 만든다. 저자 스스로 "Modular scales are tools—not dogma"라고 쓰고, 척도 밖 값(15px 캡션)도 쓴다. 규칙이 아니라 출발점이라 suta의 역할 척도를 바꿀 근거는 아니다 |
| 줄 길이 45~75자 | 부분 | `--measure: 65ch`, "한글은 35~40자". 출처 없음. 렌더 결과의 줄 길이는 재지 않는다 | **Bringhurst**: 단일 칼럼 인쇄면에서 45~75자가 만족스러운 길이, 66자가 이상 — webtypography.net 2.1.2의 인용 [2차]. **Dyson 2004**, *Behaviour & Information Technology* 23(6) [원문]: 화면 읽기에서 한 줄 글자 수가 결정 변수다. 100자 줄이 25자보다 빨리 읽혔다(Dyson & Kipping 1998). 이해도는 55자가 100자보다 높았다(Dyson & Haselgrove 2001). 인쇄 기준은 Spencer의 70자 이하, Tinker 자료에서 52자. 즉 "45~75"는 속도의 최적이 아니라 이해·선호·인쇄 관례의 절충이다. **한글**: 신종현·박민용 2003, 대한산업공학회지 29(3) [초록]: 한글 웹 문서에서 한 줄 50자·줄 간격 100%가 읽기 속도를 높였다. 참가자 18명, 비교한 세 길이는 초록에 없다. suta의 35~40자는 이 연구의 50자보다 좁다. 한글 근거는 이 한 편뿐이고 표본이 작다 |
| 세로 리듬(vertical rhythm — 세로 간격을 기준 줄 높이의 배수로 맞추기) | 없음 | 4px 척도만 있다 | Bringhurst의 "precisely on beat and in phase", 세로 간격을 줄 높이의 정수배로 — webtypography.net 2.2.2 [2차]. CSS `rlh` 단위(루트 줄 높이) 지원: Chrome·Edge 111, Safari 16.4, Firefox 120, 94.84% [caniuse]. UI 화면 전체를 기준선 격자에 맞추는 근거는 찾지 못했다. 긴 글(기사·약관) 본문에 한정하는 편이 맞다 |
| 시각 보정(optical alignment — 기하학적으로 맞췄는데 어긋나 보이는 것을 눈대중으로 고침) | 없음 | 아이콘·글자는 `align-items: center`까지 | 공식 표준은 찾지 못했다. 재생 삼각형을 원 안에서 꼭짓점 쪽으로 조금 옮기라는 실무 글만 있다 [2차, 블로그]. 이 글들도 "고정 픽셀 값은 없다, 크기마다 눈으로 본다"고 쓴다. 기계화할 수 있는 부분은 글자 상자 다듬기다: CSS `text-box: trim-both cap alphabetic`이 글자 위아래의 빈 줄 높이를 잘라 버튼·배지 안 글자를 시각적으로 가운데에 둔다. 지원: Chrome 133, Edge 132, Safari 18.2, Firefox 154, 87.94% [caniuse] |
| 그리드 열 수와 중단점 | 부분 | 768 하나, 열 수 기준 없음 | **Android window size classes** [원문]: 폭 600·840·1200·1600dp에서 compact·medium·expanded·large·extra-large. **IBM Carbon 2x Grid** [원문]: 320(4열)·672(8열)·1056(16열)·1312(16열)·1584(16열), 여백 0·16·16·16·24, 칸 패딩 16. CSS 변수는 미디어 쿼리 조건에 쓸 수 없어 중단점은 숫자로 박아야 한다 |
| 정보 밀도 단계(compact/comfortable) | 부분 | 업무 도구 행 40~48 문장, 간격 토큰을 옮기라는 커스터마이즈 한 줄 | Material의 밀도 단계는 기본·comfortable·compact이고 4px 간격으로 높이를 줄이며 안쪽 여백은 유지한다 — Material 블로그·MDC 패키지 설명 [2차]. M3 공식 페이지 값은 확인하지 못했다 |
| 넓은 화면의 여백 | 부분 | 최대 폭 1120, 여백 24, 모바일 화면은 가운데 열 | 공개 체계의 값(위 Carbon 여백)은 있다. suta에 없는 것은 "머리와 본문이 같은 컨테이너 폭·같은 왼쪽 선" 규칙과 그 측정이다. 비교 문서의 여섯 번째 묶음 판정이 "머리보다 좁은 본문이 왼쪽에 붙었다", "입력 열과 패널 사이가 크게 벌어졌다"를 짚었다(`docs/comparisons.md`) |
| 게슈탈트 근접·정렬 → 간격 규칙 | 있음(검사 없음) | P4 "묶음 안 ≤ 묶음 사이의 1/2", 역할 토큰 3개. 검사는 척도 밖 값만 본다 | Aurora Harley, "Proximity Principle in Visual Design", NN/g, 2020-08-02 [원문]: 가까운 것은 한 묶음으로 읽힌다, 라벨과 칸은 붙이고 쌍 사이는 띄운다. 규칙은 이미 suta에 있다. 빈 곳은 렌더 결과에서 "제목 위 간격 > 제목 아래 간격"을 재는 장치다 |

### 모션

| 주제 | suta | 지금 상태 | 외부 근거 (확인 수준) |
|---|---|---|---|
| 화면 진입 순서(stagger)와 총 길이 | 부분 | 30ms·10개까지. 무엇이 먼저 나오는지, 진입 전체가 몇 ms 안에 끝나야 하는지는 없다 | **Material 1 choreography** [원문, 더는 관리하지 않는 판]: 한 방향의 초점 경로, 격자는 왼쪽→오른쪽·위→아래, 각 항목의 시작 간격은 20ms 이하, 앞 항목이 끝나기를 기다리지 않는다. **Chrome 개발자 문서 "Creating a stagger animation"** [원문]: `animation-delay: calc(sibling-index() * var(--stagger-time))`, 지원하지 않으면 JS로 `--sibling-index`를 넣는 폴백, 동작 줄이기에서는 `animation: none`. `sibling-index()` 지원: Chrome·Edge 138, Safari 26.2, Firefox 154, 86.34% [caniuse]. 총 길이의 근거: Nielsen의 0.1초·1초·10초 [원문, Miller 1968·Card 외 1991 인용], Doherty·Thadani 1982의 400ms [2차 — Laws of UX·IBM 사본 소개글, 보고서 본문은 읽지 못함] |
| 스크롤 연동(CSS scroll-driven animations) | 없음 | 스크롤 효과는 IntersectionObserver(등장·머리)와 scroll 이벤트 + rAF(커버 이미지)다 | MDN: `animation-timeline`은 "Baseline 2026, Newly available — Since October 2026" [원문]. caniuse: Chrome·Edge 115, Safari 26.0, Firefox 159, 89.12% [caniuse]. Firefox 159가 2026년 10월 정식판에서 기본 켬 — web.dev "New to the web platform in October" [검색 요약]. Chrome 문서 [원문]: `scroll()`은 스크롤 상자의 진행(0~100%), `view()`는 요소가 화면을 지나는 진행, `animation-range`로 구간을 자른다(`entry 25% cover 50%`). 메인 스레드 밖에서 돌 수 있고 `transform`·`opacity`를 쓰라고 한다. 새로 Baseline이 된 기능이라 이전 판 Safari·Firefox 사용자는 폴백(정지 상태)을 본다 |
| View Transitions API | 있음(문서 안 전환) | `page-transition`·`card-expand`·`theme-toggle`이 `document.startViewTransition`을 쓴다. 문서 사이(MPA) 전환은 없다 | 같은 문서 전환: Chrome·Edge 111, Safari 18.0, Firefox 144, 93.17% [caniuse]. 문서 사이 전환(`@view-transition { navigation: auto }`): Chrome·Edge 126, Safari 18.2, Firefox는 144부터 부분 지원, 89.6% [caniuse]. CSS 두 줄이면 여러 페이지 사이트에 붙는다 |
| 스크롤에 따른 머리 줄임 | 있음(쓰이지 않음) | `sticky-header`(작은 제목 페이드), `glass-nav`(방향 따라 숨김). 높이 줄임은 범위 밖 | scroll-driven의 `scroll()` + `animation-range: 0 64px`이면 JS 없이 머리 그림자·배경을 스크롤 거리에 비례해 바꿀 수 있다(위 Chrome 문서의 원리). 벤치마크 suta 131번 중 사용 0번 |
| 숫자·그래프 진입 | 부분 | `count-up`(최종값만 낭독), `progress-ring`(`stroke-dashoffset`). 막대·선 차트의 진입 기준은 없다 | 공개 디자인 시스템에서 차트 진입 수치는 찾지 못했다. 근거로 쓸 수 있는 것은 Harrison 외의 진행 막대 연구(아래)와 "한 번만, 짧게"라는 HIG 원칙뿐이다 |
| 호버·포커스·눌림 미세 반응 한 벌 | 부분 | `press-feedback`(눌림·리프트), 토큰 `instant` 100ms. 포커스 링·호버 색·잠김의 토큰이 없다 | **Apple HIG Motion** [원문]: "Aim for brevity and precision in feedback animations", "In apps, generally avoid adding motion to UI interactions that occur frequently", "Let people cancel motion". **Carbon** [원문]: `fast-01` 70ms(버튼·토글), `fast-02` 110ms(페이드). 포커스 링 굵기·간격의 공개 값은 이번에 확인하지 않았다 |
| 지각 시간 연구 | 부분 | 토큰 주석 "100ms 아래는 안 보이고 500ms 위는 기다리는 느낌" — 출처 없음 | **Nielsen, "Response Times: The 3 Important Limits"** [원문]: 0.1초 즉시 반응으로 느낌, 1초 생각의 흐름 유지, 10초 주의 유지(넘으면 진행률 표시). **Harrison·Amento·Kuznetsov·Bell 2007, "Rethinking the Progress Bar", UIST** [원문 PDF]: 참가자 22명, 멈춤이 있는 막대는 더 길게 느껴졌고 가속하는 막대가 선호됐다, 두 효과는 끝 무렵에 클수록 컸다(peak-and-end). **Harrison·Yeo·Hudson 2010, "Faster Progress Bars", CHI** [원문 PDF]: 참가자 20명, 뒤로 감속하며 움직이는 줄무늬가 지각 시간을 11% 줄였다. **Doherty 400ms** [2차] |
| 이징·시간의 공개 값 | 부분 | suta 토큰 한 벌 | 아래 비교표 |
| 전정 장애와 동작 줄이기 | 있음 | 모든 패턴 CSS의 reduced-motion 블록, 검사 error | **WCAG 2.2 SC 2.3.3 Animation from Interactions (AAA)** [원문]: 상호작용이 일으킨 모션은 꺼질 수 있어야 한다. 의도 설명이 패럴랙스 스크롤을 대표적인 비필수 모션으로 들고, 기법 C39가 `prefers-reduced-motion`이다. **SC 2.2.2 Pause, Stop, Hide (A)** [원문]: 자동으로 시작해 5초를 넘게 움직이는 것은 멈출 수 있어야 한다. **Apple HIG** [원문]: "Make motion optional". **Agrawal 외 2009, Arch Intern Med 169(10)** [초록·보도 2차]: 미국 40세 이상 성인의 35.4%에게 전정 기능 이상, 80세 이상 85%. scroll-driven 효과를 더하면 2.3.3의 "스크롤이 일으킨 추가 움직임"에 해당하므로 동작 줄이기에서 끈다 |

### 공개 디자인 시스템의 시간·이징 (공식 값만)

| 체계 | 시간 | 들어옴 | 나감 | 기본 | 확인 |
|---|---|---|---|---|---|
| Material 3 | 16단계: short1~4 = 50·100·150·200, medium1~4 = 250·300·350·400, long1~4 = 450·500·550·600, extra-long1~4 = 700·800·900·1000ms | standard-decelerate `(0, 0, 0, 1)`, emphasized-decelerate `(0.05, 0.7, 0.1, 1)` | standard-accelerate `(0.3, 0, 1, 1)`, emphasized-accelerate `(0.3, 0, 0.8, 0.15)` | standard `(0.2, 0, 0, 1)`, emphasized `(0.2, 0, 0, 1)`(토큰 파일의 근사값) | [공식 저장소] material-web `tokens/versions/v0_192/_md-sys-motion.scss`. m3.material.io 본문은 읽지 못했다 |
| Material 1 (참고, 관리 중단) | 모바일 약 300, 큰 전환 375, 들어옴 225, 나감 195, 데스크톱 150~200, "400ms를 넘으면 느리게 느껴질 수 있다", 태블릿 +30%·웨어러블 −30% | deceleration `(0, 0, 0.2, 1)` | acceleration `(0.4, 0, 1, 1)`, sharp `(0.4, 0, 0.6, 1)` | standard `(0.4, 0, 0.2, 1)` | [원문] m1.material.io |
| IBM Carbon | 70·110·150·240·400·700ms(`fast-01`~`slow-02`) | productive `(0, 0, 0.38, 0.9)`, expressive `(0, 0, 0.3, 1)` | productive `(0.2, 0, 1, 0.9)`, expressive `(0.4, 0.14, 1, 1)` | productive `(0.2, 0, 0.38, 0.9)`, expressive `(0.4, 0.14, 0.3, 1)` | [원문] carbondesignsystem.com |
| Fluent 2 | 50·100·150·200·250·300·400·500ms(ultraFast~ultraSlow) | decelerateMid `(0, 0, 0, 1)`, decelerateMax `(0.1, 0.9, 0.2, 1)`, decelerateMin `(0.33, 0, 0.1, 1)` | accelerateMid `(1, 0, 1, 1)`, accelerateMax `(0.9, 0.1, 1, 0.2)`, accelerateMin `(0.8, 0, 0.78, 1)` | easyEase `(0.33, 0, 0.67, 1)` | [공식 저장소] microsoft/fluentui `packages/tokens/src/global/durations.ts`·`curves.ts`. fluent2.microsoft.design 페이지에는 숫자가 없었다 |
| Apple HIG | 숫자 없음 | — | — | — | [원문] HIG Motion. 원칙만 있다(위 표) |
| suta | 100·150·250·350·420ms, 퇴장 ×0.75 | ease-out `(0.22, 1, 0.36, 1)`, drawer `(0.32, 0.72, 0, 1)` | ease-out(같은 곡선), ease-in 금지 | 같은 ease-out | `motion-tokens.css` |

이 표에서 보이는 것:

- **시간의 범위는 suta와 비슷하다.** 네 체계 모두 짧은 반응을 50~110ms, 화면 크기 이동을 300~400ms에 둔다. suta의 가장 짧은 값 100ms는 다른 체계(50·70ms)보다 길다. 배경 어둡게 하기 같은 느린 단계(Carbon 700ms)는 suta에 없다.
- **퇴장 곡선은 suta만 다르다.** Material 1·3, Carbon, Fluent는 모두 화면을 떠나는 요소에 가속 곡선(ease-in 계열)을 따로 둔다. suta는 퇴장에 ease-in을 쓰지 말라고 하고 검사(`ease-in-exit`)로 경고한다. suta의 이유("첫 순간이 늦어 굼뜨다")는 제자리에서 사라지는 것(툴팁·메뉴)에는 맞다. 화면 밖으로 완전히 나가는 것(시트·패널)에는 공개 체계와 반대다. 어느 쪽이 맞는지 재 본 자료는 없다. 문서에 이 차이와 이유를 적어 두는 것이 최소한이다.
- **퇴장 비율.** Material 1은 225 → 195ms(0.87)다. suta의 0.75보다 덜 짧다.

### 브라우저 지원 요약 (2026-11-26 조회)

| 기능 | Chrome | Edge | Safari | Firefox | 전체 사용률 | 폴백 |
|---|---|---|---|---|---|---|
| `animation-timeline: scroll()`·`view()` | 115 | 115 | 26.0 | 159 | 89.12% | `@supports (animation-timeline: scroll())` 밖에서는 정지 상태(효과 없음). 등장 효과만 기존 IntersectionObserver 코어로 |
| View Transitions(같은 문서) | 111 | 111 | 18.0 | 144 | 93.17% | 즉시 바뀜(이미 `page-transition`이 그렇게 한다) |
| View Transitions(문서 사이) | 126 | 126 | 18.2 | 144부터 부분 | 89.6% | 일반 페이지 이동 |
| `@starting-style`(처음 그릴 때의 시작 스타일) | 117 | 117 | 17.5 | 129 | 93.42% | 진입 효과 없이 바로 보임 |
| `sibling-index()` | 138 | 138 | 26.2 | 154 | 86.34% | 인라인 `--i`(또는 `--sibling-index`) 변수를 먼저 선언 |
| `text-box`(글자 상자 다듬기) | 133 | 132 | 18.2 | 154 | 87.94% | 다듬지 않은 상자(지금과 같음) |
| `rlh` 단위 | 111 | 111 | 16.4 | 120 | 94.84% | `calc(1rem * 1.5)` |

## 5. 조사 3 — 실물 확인

### 고른 기준

- 비교 이미지(`docs/assets/*-as-is-to-be.jpg`)의 suta 줄에서 **가장 최근 판의 첫 실행**을 골랐다. 잘 나온 실행을 고르지 않았다.
- 0.19 본측정(`depth-final-as-is-to-be.jpg` 아래 줄) 6개, 0.17 여섯 번째 묶음(`gap-sixth-requests-as-is-to-be.jpg`) 3개, 0.17 일곱 번째 묶음의 숙소 등록 1개다. 앱 390px 5개, 웹 1280px 5개가 되도록 맞췄다.
- 생성된 HTML이 남아 있지 않아 화면은 정지 이미지로만 봤다. 움직임은 볼 수 없었다. 움직임 칸은 측정값(`moving` — 렌더한 화면에서 transition이나 animation이 걸린 요소 수)과 패턴 사용 기록으로 적고, "있어야 하는 곳"은 추정이다.

### 화면 10개

| # | 화면(판, 폭) | 레이아웃이 아마추어처럼 보이는 곳 | 움직임 — 측정과 추정 |
|---|---|---|---|
| 1 | 배송 조회 (0.19, 390) | 단계 표시는 좋다. 아래 세 구역(배송 기사·받는 주소·요청 사항)이 "띠 + 작은 라벨 + 값 한 줄"로 같은 모양을 되풀이해 평평하다 | `moving` 6, 패턴 0개. 지금 단계 표시는 첫 진입 때 진행선이 한 번 채워지는 자리(무슨 일이 있었는지 알리는 모션)다 — 추정 |
| 2 | 웨이팅 등록 (0.19, 390) | "인원" 제목과 첫 행 사이가 행과 행 사이보다 넓어 보인다(근접이 거꾸로). 좌석 카드 안 설명 글자가 작다. 폭 가득 회색 비활성 버튼이 첫 화면 아래를 차지한다 | `moving` 12. 스테퍼 숫자 변화·버튼이 활성으로 바뀌는 순간은 정지 화면이라 확인 못 함 |
| 3 | 그룹 수업 (0.19, 390) | 행마다 채운 주황 "예약" 버튼이 5개다. 채운 버튼 하나 원칙과 부딪힌다(본측정 뒤 윤곽선으로 고쳤다가 판정이 나빠져 되돌린 항목) | `moving` 15. 날짜를 바꾸면 목록이 갈아 끼워진다. 전환 패턴을 쓴 기록이 없다 |
| 4 | 정산 현황 (0.19, 390) | 금액 위계·안 보낸 사람 묶음은 좋다. 진행 막대가 초록(완료 색)이라 강조색(검정) 밖 유채색이 하나 더 있다 | `moving` 4 — 10개 중 가장 적다. 진행 막대·총액은 진입 때 한 번 채우는 자리다 — 추정 |
| 5 | 휴가 신청 (0.19, 1280) | 화면 제목이 20px 안팎이라 데스크톱 첫 화면의 위계가 약하다. 날짜 칸에 브라우저 기본 자리표시 "mm/dd/yyyy"가 영어로 남았다. 15px 미만 글자가 76%다 | `moving` 11 |
| 6 | 재고 관리 (0.19, 1280) | 맨 위 문장 "품목 12개 중 5개가 부족해요"는 좋다. 부족한 행마다 빨강이 네 번(경고 아이콘·글자·수량·막대)이라 강조가 넘친다. 행 끝 "입고" 글자 버튼이 표 가장자리에 붙었다 | `moving` 24 |
| 7 | 반려견 미용 예약 (0.17, 390) | 반려견 카드 3장이 고정 폭이라 오른쪽이 빈다. 테두리 + 둥근 상자 안의 그림 아이콘이 "아이콘 타일"처럼 읽힌다 | `moving` 33 |
| 8 | 채용 공고 등록 (0.17, 1280) | 본문 열이 머리 메뉴보다 좁고 왼쪽으로 치우쳤다. 폼과 오른쪽 "필수 항목" 패널 사이가 크게 벌어졌다. 제출 버튼이 폼 끝에서 먼 패널 안에 있다(비교 문서의 판정도 같은 점을 짚었다) | `moving` 44 |
| 9 | 집 소개 기사 (0.17, 1280) | 가운데 큰 제목 아래 히어로가 평면 도형 콘텐츠 그림이라 클립아트처럼 보인다. 로고·메뉴의 머리 폭과 본문 폭이 다르다 | `moving` 5. 긴 기사인데 읽기 진행 표시·머리 줄임이 없다. 스크롤 연출이 가장 어울리는 화면이다 — 추정 |
| 10 | 숙소 등록 (0.17, 1280) | 대표 사진·공개 스위치·등록 버튼이 오른쪽 열의 상자 셋으로 나뉘었다. 두 열의 위 끝은 맞다 | `moving` 37 |

정리:

- **레이아웃:** 반복되는 결함은 세 가지다. (1) 데스크톱에서 머리와 본문의 폭·왼쪽 선이 다르거나 열 사이가 크게 벌어진다(#8·#9). (2) 제목과 내용의 간격이 묶음 사이 간격보다 넓어 근접이 뒤집힌다(#2). (3) 같은 강조를 행마다 되풀이한다(#3·#6). 셋 다 원칙 문서(P4·P6·P3)에 이미 있지만 검사·측정이 없다.
- **움직임:** 열 화면 모두 화면 단위 모션 패턴(등장·머리·전환·숫자)을 쓰지 않았다. 움직이는 요소는 호버·눌림 같은 상태 전이가 대부분일 것으로 보인다(측정이 속성별로 나누지 않아 추정).

### 지난 실행 전체의 측정값

`depth*` 파일은 두 조건이 모두 suta(0.17 ↔ 0.18·0.19)라 따로 셌다. 나머지는 "suta 없이 ↔ suta"다. 몇 파일은 같은 suta 없이 실행을 다시 썼으므로 개수는 대략이다.

| 잰 것 | suta 없이 (107) | suta (107) | 0.17 ↔ 0.19 (24 ↔ 24) |
|---|---|---|---|
| 움직이는 요소 수(`moving`) 중앙값 | 10 | 19 | 11.5 ↔ 11.5 |
| 동작 줄이기 규칙이 있는 실행 | 93 | 106 | 24 ↔ 24 |
| `transition: all`이 있는 실행 | 27 | 0 | — |
| 크기·위치 속성 애니메이션이 있는 실행 | 11 | 4 | 0 ↔ 0 |
| 격자 트랙(`grid-template-rows`) 애니메이션이 있는 실행 | 0 | 10 | — |
| 15px 미만 글자 비율 중앙값 | 69% | 59% | 50% ↔ 57.5% |
| 가장 많은 글자의 크기 중앙값 | 13px | 14px | 16 ↔ 14px |

suta 조건 131번의 패턴 사용(실행마다 한 번 셈): `layout-principles` 61, `motion-principles` 23, `bottom-sheet` 17, `quantity-stepper` 12, `segmented-control` 11, `file-upload` 10, `loading-button` 10, `checkbox-radio` 7, `toast-stack` 7, `press-feedback` 6, `switch` 5, `modal-dialog` 4, `form-shake-error` 4, 나머지 1~3. 화면 단위 모션 패턴은 0이다.

읽는 법:

- suta는 모션의 **사고**(전부 전이·레이아웃 애니메이션·동작 줄이기 누락)를 줄였다. 모션의 **설계**(무엇이 어떤 순서로 얼마 동안 움직이는가)는 재지도 않았고 쓰이지도 않았다.
- 판정 모델은 정지 화면만 본다(`docs/comparisons.md`의 각 절 "한계"). 모션을 개선해도 지금의 측정으로는 나아졌다고 말할 수 없다. 모션 후보 앞에 측정 장치가 먼저 와야 한다.
- 15px 미만 글자가 suta 화면에서도 절반을 넘는다. "가장 많은 글자는 본문 16" 원칙이 결과에 닿지 않는다(앱 목록·폼은 14가 흔해 일부는 정당할 수 있다).

## 6. 구현 후보

제약: 애니메이션은 `transform`·`opacity`만(AGENTS.md 규칙 4), 모든 CSS에 동작 줄이기 블록(규칙 5), CSS 우선. 문서만으로 풀리는 후보에는 대안 형태를 함께 적었다. 지난 측정에서 참조 문서는 18번 중 1번만 읽혔으므로, 토큰·코드·검사·측정이 앞선다. 작업량은 S(반나절)·M(1~2일)·L(3일 이상)이다.

| 순위 | 후보 | 형태 | 근거 | 측정 방법(무엇을 세면 나아졌다고 하는가) | 작업량 |
|---|---|---|---|---|---|
| 1 | **동적 모션 측정** — 벤치마크 측정에 네 가지를 더한다. ① 불러온 뒤 `document.getAnimations()`와 전이의 수·가장 늦게 끝나는 시각(진입 총 길이) ② 페이지를 몇 단계로 스크롤하며 새로 시작한 애니메이션 수와 레이아웃 이동(CLS) ③ 주 버튼에 포인터를 눌렀을 때 100ms 안에 계산된 `scale`·배경이 바뀌는지 ④ Tab으로 첫 컨트롤 5개에 갔을 때 보이는 포커스 표시가 있는지 | 측정 스크립트(`scripts/lib/` 순수 판정 + TDD, `measure.mjs`) | 지금 판정·측정은 정지 화면뿐이다. 다른 모션 후보가 나아졌는지 말할 수단이 없다 | 지난 실행이 없어 새 실행에서 suta 없이 ↔ suta를 잰다. 지표: 진입 총 길이 중앙값(목표 ≤ 500ms, Doherty 400ms·Nielsen 1초 사이), 눌림 반응 있는 주 버튼 비율, 포커스 표시 비율, 스크롤 중 CLS 0 | M |
| 2 | **모션 토큰 사슬** — 패턴 CSS 폴백을 `var(--sheet-duration, var(--motion-duration-slow, 350ms))`처럼 토큰을 거치게 하고, 이징 리터럴을 `var(--motion-ease-out, …)`로 바꾼다. 화면 전환 420 ↔ 280, `scroll-reveal` 600·`i * 80`, `enter-exit` 300의 어긋남을 하나로 정한다 | 패턴 코드 + 검사(validateSkills가 패턴 CSS의 시간·이징 폴백이 토큰 값 중 하나인지 비교) | 폴백 14종·`var(--motion-` 0곳·이징 9종(3절). 0.18에서 층 토큰을 사슬로 묶은 선례 | 공개 시간 변수 폴백의 서로 다른 값 수(14 → 토큰 수 + 의도한 예외), `var(--motion-` 참조 수(0 → 패턴 수), `(0.23, 1, 0.32, 1)` 같은 근사 이징 0개. 테스트로 계산된 값이 바뀌지 않음을 확인 | M |
| 3 | **상호작용 상태 한 벌** — 토큰 `--focus-ring-width`·`--focus-ring-offset`·`--focus-ring-color`(기본 강조색), `--hover-tint`(색 섞기 비율), `--press-scale`, `--disabled-opacity`와 기본 규칙 파일(`:focus-visible` 링, 정밀 포인터에서만 호버, 눌림, 잠김). 패턴 CSS의 `outline` 15가지·`outline-offset` 8가지를 이 토큰으로 | 토큰 + 패턴 코드(`press-feedback` 확장 또는 `layout-principles/assets/`의 새 CSS) | 포커스 링 15가지·간격 8가지(3절). Apple HIG "brevity and precision", "자주 쓰는 조작에는 모션을 더하지 않는다". Carbon `fast-01` 70ms. 0.19 `detail.md`가 상태 한 벌을 요구하지만 코드가 없다 | 패턴 CSS의 서로 다른 `outline` 선언 수, 후보 1의 ③·④ 비율. 검사 규칙 후보 `focus-ring-variety`(한 파일에 링 정의 2종 이상, warn·취향) | M |
| 4 | **화면 진입 한 벌** — 첫 화면은 1순위 요소(가장 큰 제목·사진, LCP 후보)를 움직이지 않고, 그 아래 구역만 `@starting-style`로 짧게(8px·`base`) 한 번 들어온다. 순서는 위→아래·왼쪽→오른쪽, 항목 간격은 `--motion-stagger`, 상한 토큰 `--motion-stagger-max`(개수)와 `--motion-enter-budget`(전체 ms). 화면 유형 → 모션 한 벌 표(목록: 없음, 상세: 머리 줄임, 기사: 읽기 진행 + 머리 줄임, 랜딩: 구역 등장 한 번, 대시보드: 숫자·막대 한 번)는 늘 읽히는 `SKILL.md`에 5~6줄로 | 토큰 + 패턴 코드(`enter-exit`·`scroll-reveal` 확장) + SKILL.md 몇 줄 | 진입 총 길이 기준 없음(4절). Material 1 "20ms 이하, 기다리지 않는다", Chrome의 `sibling-index()` 방법, 동작 줄이기에서 `animation: none`. 화면 단위 패턴 사용 0/131(5절) | 후보 1의 진입 총 길이, 화면 유형별로 그 한 벌 패턴이 쓰인 실행 비율(지금 0%), 첫 화면 LCP 요소에 진입 애니메이션 0. 블라인드 판정은 정지 화면이라 쓰지 않는다 | M |
| 5 | **레이아웃 렌더 측정 셋** — ① 제목 근접: `h1~h3`·`legend`·구역 라벨마다 위 간격 > 아래 간격인지 ② 정렬선: 1280px에서 머리·본문·바닥 컨테이너의 왼쪽 끝 x좌표 종류 수 ③ 줄 길이: 1280px에서 본문 문단의 한 줄 글자 수(한글 기준) ④ 15px 미만 글자 비율(이미 있음)을 화면 유형별로 | 측정 스크립트 + `checklist.md` 한 줄. 이후 잡히는 것만 검사 규칙으로 | 5절의 결함 (1)·(2), 원칙 P4·P6·P8이 "브라우저 검사"로 적어 두고 구현하지 않은 것. NN/g 근접 원리, Dyson·신종현·박민용의 줄 길이 | 근접이 거꾸로인 제목 수, 왼쪽 끝 종류 수(목표 1~2), 문단 한 줄 글자 수 중앙값. 지난 실행이 없으므로 새 실행에서 | M |
| 6 | **스크롤 연동 CSS 한 벌** — `@supports (animation-timeline: scroll())` 안에서만: 읽기 진행 막대(`scaleX`, `scroll(root)`), 머리 그림자·배경 불투명도(`animation-range: 0 64px`), `view()`로 그림이 들어올 때 `opacity`만. 지원하지 않으면 정지 상태. 동작 줄이기에서는 막대만 남기고(진행 정보) 나머지는 끈다 | 패턴 코드(CSS만, 새 패턴 `scroll-progress` 또는 `sticky-header` 확장) | Baseline 2026-10 새로 지원, 89.12%. 메인 스레드 밖에서 돈다(Chrome 문서). WCAG 2.3.3이 스크롤의 추가 움직임을 끌 수 있게 하라고 한다 | 후보 1의 스크롤 중 CLS·scroll 리스너 수(0), 기사·랜딩 실행에서 이 패턴 사용 비율 | M |
| 7 | **넓은 화면 글자·컨테이너 토큰** — `--text-display-wide`(48~64 범위의 한 값, 데스크톱 한 곳)와 "머리·본문·바닥은 같은 `--content-max`·`--page-inline`" 규칙 | 토큰 + 검사 후보(`container-mismatch`: 같은 파일 안 컨테이너 최대 폭 값 2종 이상, warn) | 관례 48~64 ↔ 토큰 40(3절 어긋남 7). 판정이 짚은 머리·본문 폭 차이 | 후보 5의 ②, 데스크톱 실행의 가장 큰 글자 분포 | S |
| 8 | **중단점 고정 셋** — 폭 600·840·1200(Android window size classes) 또는 672·1056(Carbon) 중 하나를 정해 `layout-tokens.css` 주석과 패턴 CSS에 쓰고, 검사 후보 `breakpoint-variety`(한 프로젝트의 폭 미디어 쿼리 값 4종 이상, warn·취향) | 문서 몇 줄 → 대안: 검사 규칙 | 지금 768 하나. CSS 변수는 미디어 쿼리에 못 쓰므로 숫자를 정해 두는 수밖에 없다 | 산출물의 서로 다른 미디어 쿼리 폭 수 | S |
| 9 | **밀도 단계** — `[data-density="compact"]`에서 행 높이 40·글자 14·간격 역할 한 단계 아래, `comfortable`은 기본. 누르는 영역 하한(24px, 모바일 44px)은 유지 | 토큰 | `design.md`의 "업무 도구 행 40~48"이 문장뿐. Material의 밀도 단계(4px 간격, 안쪽 여백 유지) [2차] | 대시보드·표 실행의 행 높이·`smallTargets` | S |
| 10 | **숫자·그래프 진입** — 막대는 `transform: scaleY`(아래 기준), 선은 `stroke-dashoffset`(그리기 속성이라 레이아웃이 돌지 않음), 처음 화면에 들어올 때 한 번, 값이 바뀌면 이전 값에서 이어서. 동작 줄이기에서는 바로 최종값 | 패턴 코드(`count-up` 확장 또는 새 패턴) | 리포트·대시보드 요청이 벤치마크에 반복된다(SaaS 리포트·매출 리포트·민원 현황·도서관 통계). Harrison 외: 끝 무렵 멈춤은 길게, 가속은 짧게 느껴진다 | 리포트 실행의 차트 진입 시간(≤ 600ms), 필터 변경 때 처음부터 다시 그리는 차트 수 0 | M |
| 11 | **글자 상자 다듬기** — 버튼·배지·칩 글자에 `text-box: trim-both cap alphabetic`(지원하지 않으면 지금과 같음), 아이콘 + 글자 줄은 아이콘 높이 `1lh` 안팎 | 토큰 파일의 기본 규칙 몇 줄 | 시각 보정의 표준은 없다. 기계화 가능한 부분은 글자 상자다. 87.94% | 사람 판정(측정 어려움). 버튼 안 글자 잉크의 위아래 여백 차이를 스크린숏으로 재는 실험은 가능 | S |
| 12 | **퇴장 곡선 정리** — 제자리에서 사라지는 것은 ease-out(지금), 화면 밖으로 나가는 것(시트·패널)은 가속 곡선 하나(`--motion-ease-exit`) 허용. 검사 `ease-in-exit`의 대상을 좁힌다 | 토큰 + 검사 규칙 조정 | 공개 체계 넷이 모두 나가는 곡선을 따로 둔다(4절 비교표) | 이 차이를 판정할 측정은 없다. 바꾸기 전에 사용자 결정이 필요하다 | S |
| 13 | **문서 사이 전환** — 여러 페이지 사이트에 `@view-transition { navigation: auto; }` + 동작 줄이기에서 끔 | 패턴 코드(`page-transition`에 CSS 몇 줄) | 89.6%, 미지원은 일반 이동 | 다중 페이지 실행에서 사용 여부 | S |
| 14 | **줄 길이 근거 정리** — `--measure` 주석의 "한글 35~40자"에 근거(신종현·박민용 2003의 50자, Dyson의 55자 이해도)를 달고 값은 후보 5의 측정 뒤 정한다 | 문서 몇 줄 → 대안: 측정(후보 5 ③)과 토큰 값 변경 | 출처 없는 수치(3절), 한글 근거 1편 | 후보 5 ③ | S |

### 상위 5개를 고른 이유

1. **동적 모션 측정**이 맨 앞이다. 정지 화면 판정만으로는 모션 후보 어느 것도 효과를 보일 수 없다. 지난 측정이 "참조 문서가 읽히지 않는다"를 숫자로 찾아냈듯, 측정이 생겨야 무엇이 통하는지 가를 수 있다.
2. **모션 토큰 사슬**은 화면을 바꾸지 않고 기반을 고친다. 지금은 토큰 파일을 넣어도 패턴에 닿지 않는다. 층 토큰에서 같은 일을 이미 해 봐서 위험이 작다.
3. **상호작용 상태 한 벌**은 "사소한 것까지"에 가장 직접 닿는다. 사용자는 화면마다 수십 번 누르고 Tab을 친다. 코드 형태라 문서를 읽지 않아도 복사하면 따라온다.
4. **화면 진입 한 벌**은 "전문가가 만든 것 같은" 인상의 핵심인 순서·길이를 토큰으로 묶는다. SKILL.md의 짧은 표는 늘 읽히는 자리라 패턴 사용 0/131을 바꿀 가능성이 있다.
5. **레이아웃 렌더 측정**은 조사 3에서 되풀이된 결함(근접 뒤집힘·정렬선 어긋남)을 숫자로 잡는다. 원칙은 이미 있고, 빠진 것은 측정이다.

## 7. 확인하지 못한 것

- **생성된 HTML.** 지난 벤치마크 산출물은 저장소와 이 환경에 남아 있지 않다. 소스의 transition·animation·scroll 사용 빈도를 조건별로 세지 못했고, 화면을 브라우저로 다시 열어 움직임을 보지도 못했다.
- **Material 3 공식 페이지 본문**(m3.material.io)은 읽히지 않았다. 값은 Google의 공식 저장소 material-web 토큰 파일로 확인했다. emphasized 곡선은 원래 경로(path) 곡선이고 `(0.2, 0, 0, 1)`은 토큰 파일의 근사값이다.
- **Material 밀도 값**은 Material 블로그·MDC 패키지 설명(2차)으로만 봤다.
- **Bringhurst 45~75자·66자**는 책이 아니라 webtypography.net의 인용으로 봤다.
- **Doherty·Thadani 1982의 400ms**는 Laws of UX와 소개글(2차)로만 봤다. 보고서 본문(IBM 사본, 컴퓨터 역사 박물관 스캔)은 읽지 않았다. 보고서의 핵심은 응답 시간이 1초 아래로 내려가면 생산성이 크게 오른다는 것이고, 400ms를 보편 상수로 보는 근거는 없다는 비판도 있다(Kent Beck 소개글, 2차).
- **신종현·박민용 2003**은 초록만 읽었다. 비교한 세 줄 길이와 효과 크기는 모른다.
- **Agrawal 외 2009**는 초록·보도(2차)로 봤다.
- **Apple App Store의 동작 줄이기 평가 기준**은 검색 요약으로만 봤다.
- **시각 보정**의 1차 출처(연구·공식 가이드)는 찾지 못했다.
- **브라우저 지원 수치**는 caniuse·MDN을 요약 도구로 읽은 값이다. Firefox 159의 scroll-driven 기본 켬은 MDN 릴리스 노트 제목과 web.dev 글의 검색 요약으로 확인했다.
- **`--measure: 65ch`가 Pretendard에서 실제로 몇 글자인지**는 재지 않았다(`ch`는 숫자 0의 폭이라 한글 글자 수와 다르다).
- 조사 3의 "움직임이 있어야 하는 곳"은 정지 이미지와 측정값에서 추정한 것이다.

## 8. 출처

레이아웃

- Tim Brown, "More Meaningful Typography", A List Apart, 2011-05-03 — https://alistapart.com/article/more-meaningful-typography/
- Mary C. Dyson, "How physical text layout affects reading from screen", *Behaviour & Information Technology* 23(6), 377–393, 2004 — https://stu.westga.edu/~ssynan1/literacy/Dyson.pdf (저장소 https://centaur.reading.ac.uk/23344/)
- 신종현·박민용, 「읽기 형태, 줄 길이, 줄 간격이 한글 웹 문서의 가독성에 미치는 영향」, 대한산업공학회지 29(3), 197–205, 2003 — https://koreascience.or.kr/article/JAKO200310103403108.pub?orgId=kiie
- Bringhurst 인용(줄 길이·세로 리듬) — https://webtypography.net/2.1.2 · https://webtypography.net/2.2.2
- Android, "Use window size classes" — https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes
- IBM Carbon, 2x Grid — https://carbondesignsystem.com/elements/2x-grid/overview/
- Material density(2차) — https://m2.material.io/blog/material-density-web
- Aurora Harley, "Proximity Principle in Visual Design", NN/g, 2020 — https://www.nngroup.com/articles/gestalt-proximity/
- 재생 아이콘 시각 보정(실무 글, 2차) — https://medium.com/tab-design/alignment-of-a-play-icon-6ac66b907290

모션

- MDN, `animation-timeline` — https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline
- caniuse, `animation-timeline: scroll()` — https://caniuse.com/mdn-css_properties_animation-timeline_scroll
- Chrome for Developers, "Animate elements on scroll with Scroll-driven animations" — https://developer.chrome.com/docs/css-ui/scroll-driven-animations
- web.dev, "New to the web platform in October" (2026) — https://web.dev/blog/web-platform-10-2026
- caniuse, View Transitions — https://caniuse.com/view-transitions · https://caniuse.com/cross-document-view-transitions
- caniuse, `@starting-style` — https://caniuse.com/mdn-css_at-rules_starting-style
- caniuse, `sibling-index()` — https://caniuse.com/mdn-css_types_sibling-index
- caniuse, `text-box` — https://caniuse.com/css-text-box-trim · `rlh` — https://caniuse.com/mdn-css_types_length_rlh
- Chrome for Developers, "Creating a stagger animation" — https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/dynamic-sibling-animations
- Material 1, Choreography — https://m1.material.io/motion/choreography.html · Duration & easing — https://m1.material.io/motion/duration-easing.html
- Material 3 motion 토큰(material-web) — https://github.com/material-components/material-web/blob/main/tokens/versions/v0_192/_md-sys-motion.scss
- IBM Carbon, Motion — https://carbondesignsystem.com/elements/motion/overview/
- Fluent UI 토큰 — https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/durations.ts · https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/curves.ts
- Apple HIG, Motion — https://developer.apple.com/design/human-interface-guidelines/motion
- Jakob Nielsen, "Response Times: The 3 Important Limits", NN/g — https://www.nngroup.com/articles/response-times-3-important-limits/
- Doherty threshold(2차) — https://lawsofux.com/doherty-threshold/ · IBM 사본 https://www.vm.ibm.com/devpages/jelliott/evrrt1.html
- Harrison·Amento·Kuznetsov·Bell, "Rethinking the Progress Bar", UIST 2007 — https://www.chrisharrison.net/projects/progressbars/ProgBarHarrison.pdf
- Harrison·Yeo·Hudson, "Faster Progress Bars", CHI 2010 — https://www.chrisharrison.net/projects/progressbars2/ProgressBarsHarrison.pdf
- W3C, Understanding SC 2.3.3 — https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- W3C, Understanding SC 2.2.2 — https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- Agrawal 외, Arch Intern Med 2009;169(10):938–944(초록) — https://pubmed.ncbi.nlm.nih.gov/19468085
