# 요구 충족률 검사기 1단계 — 핵심 문법만

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-11-26 |
| 작성 | Claude Code |
| 관련 경로 | `scripts/lib/fidelity.ts`·`demo/src/tests/fidelity.test.ts`·`scripts/benchmark/fidelity.mjs`·`evals/benchmark/fidelity/fixtures/`·`docs/benchmark(.en).md` |

## 1. 개요

벤치마크에는 "요청한 디테일을 지켰는가"를 재는 지표가 없다. 설계(`docs/research/2026-11-26-fidelity.md` 4절)와 요구 목록 초안(`evals/benchmark/fidelity/requirements.json`, 요청 6개·요구 114개)은 있었다. 이번에 그 검사기의 1단계를 만들었다.

초안의 문법은 설계보다 훨씬 넓다. expect 키가 약 130종, target 키가 약 50종이고 대부분 한 번만 쓰였다. 그래서 자주 쓰는 핵심 문법만 구현하고, 나머지 요구는 "미지원"으로 따로 세며 이유(키 이름)를 남긴다. 요구 목록은 고치지 않았다. claude CLI는 부르지 않았고, 손으로 만든 견본 화면 두 개로 검사기를 맞췄다.

## 2. 작업내용

- `scripts/lib/fidelity.ts` — 순수 로직(DOM·파일·프로세스 없음). 테스트를 먼저 썼다(`demo/src/tests/fidelity.test.ts`, 70개).
  - `parseSpec`: 구조 오류(id 없음·중복, check.type 없음, 수정 요청이 없는 요구를 가리킴)와 경고(설계 표에 없는 type — 초안의 `style+spacing` 하나)
  - `classifyRequirement`: 지원·미지원·판정 필요. 미지원이면 이유를 남긴다. 설계 표의 나머지 type(order·motion 등)은 type 하나만 이유로 적는다. 그 type의 키까지 세면 이유 순위가 흐려진다
  - `parsePx`·`parseColor`(#hex·rgb()·rgba()·oklch()·color(srgb)·transparent)·`colorDistance`. 최근 Chromium은 oklch로 준 색을 계산된 값에서도 oklch로 돌려주므로 oklch 변환을 넣었다
  - `compareExpect`: px(허용 오차 1px, 모서리 넷이면 모두)·color(거리 2)·equals·matches·min·max, 경계 포함
  - `columnsOf`·`gapsOf`: 위쪽 또는 가운데가 2px 안이면 같은 줄. 열 수는 가장 많이 찬 줄의 상자 수
  - `findRepeatUnits`·`companionAnchors`: 앵커 글자로 되풀이 단위 찾기(설계 4.3절의 2). 앵커가 하나뿐인 단위(`["앙버터"]`)는 같은 요청의 다른 목록을 짝으로 붙인다
  - `verdict`·`summarizeFidelity`: 다섯 결과와 엄격·너그러운 충족률, kind별, 부딪침 유무별, 요구 순서 3분위별, 찾지 못함 비율, 미지원 이유별 개수(요구 하나에 한 번)
- `scripts/benchmark/fidelity.mjs` — 브라우저 쪽. 요구마다 새 브라우저 문맥(context)에서 열고, 관찰값만 모아 순수 로직에 넘긴다. 요구 하나가 예외를 던지면 그 요구만 찾지 못함(오류 사유)이 된다. 요구 하나에 30초 제한, 실행 4개 동시(`--concurrency`). `--coverage`는 브라우저 없이 분류표만 낸다.
  - 휴대폰 폭(600px 미만)은 `isMobile`·`hasTouch`로 열고, 길게 누르기·끌기는 CDP 터치 이벤트로 한다. 마우스 이벤트로는 터치·pointer(touch) 처리 코드가 돌지 않는다.
  - 스크롤은 창이 넘어가면 창을, 아니면 가장 큰 세로 스크롤 칸을 넘긴다. 본문을 `overflow: auto` 칸 안에서 넘기는 앱 화면이 많다.
- 견본 화면 — `evals/benchmark/fidelity/fixtures/runs/{faithful,violating}/bakery-pickup-1/work/index.html`. 지킨 판과 일부러 8곳을 어긴 판이다. 어긴 곳 목록은 파일 위 주석에 있다. 두 판은 구조를 다르게 썼다(sticky 머리 + 칸 스크롤 / fixed 머리 + 창 스크롤, `li` 카드 / `div` 감싼 카드).
- `docs/benchmark.md`·`benchmark.en.md` — "다시 돌리기"에 한 줄, "요구 충족률" 절.
- `README.md`·`README.ko.md` — tests 배지 1253 → 1323.

### 지원 범위(`--coverage`)

| 요청 | 요구 | 지원 | 미지원 | 판정 필요 |
|---|---|---|---|---|
| bakery-pickup | 20 | 9 | 11 | 0 |
| ev-charging | 20 | 2 | 18 | 0 |
| plant-care | 18 | 5 | 13 | 0 |
| invoice-list | 18 | 1 | 16 | 1 |
| flower-landing | 20 | 0 | 20 | 0 |
| meeting-room | 18 | 0 | 18 | 0 |
| 합계 | 114 | 17 | 96 | 1 |

- 미지원 96개 중 25개는 핵심 밖 검사 종류다. order 5, motion 5, timing 3, focus 3, interaction 3, copyTone 2, size·reducedMotion·covered·style+spacing 1씩.
- 나머지 71개는 핵심 검사 종류에 핵심 밖 키를 썼다. 서로 다른 이유는 118가지다. expect 키가 103번, target 키가 34번, check 키가 26번 나온다.
- 이유 상위: `expect.alsoVisible` 8, `check.type:order` 5, `check.type:motion` 5, `target.slot` 5, `expect.containsEach` 4, `property:a|b` 4, `target.containsText` 4, `expect.matchesEach` 3, `expect.anyOf` 3, `check.type:timing` 3.
- 이유가 하나뿐인 미지원 요구가 53개다. 그 키 하나만 지원하면 잴 수 있다. `alsoVisible` 7, order 5, motion 5, `containsEach` 3이 크다.

### 견본 화면 결과

| 판 | 지킴 | 어김 | 찾지 못함 | 판정 필요 | 미지원 |
|---|---|---|---|---|---|
| 지킨 판(faithful) | 9 | 0 | 0 | 0 | 11 |
| 어긴 판(violating) | 2 | 7 | 0 | 0 | 11 |

- 일부러 어긴 8곳 중 지원 요구 7곳(R02·R08·R09·R13·R14·R19·R20)이 모두 어김으로 잡혔다. 차이도 적힌다(예: "조작 뒤 height 48px(기대 44px±1)", "color #FFF7ED(기대 #FFFFFF, 거리 26)").
- 미지원 요구인 R05(칩 이모지 빠짐)는 잡히지 않는다. 의도대로다.

### 오판을 찾아 고친 찾기 규칙

견본 두 개 말고, 지킨 판을 여섯 가지로 바꾼 판과 plant-care 견본 두 개를 스크래치에서 만들어 돌렸다(저장소에 넣지 않았다).

| 사례 | 처음 결과 | 고친 규칙 |
|---|---|---|
| 빈 상태 문구를 다르게 씀(R19) | 찾지 못함 | 글자로만 찾는 `exists`는 글자가 없으면 어김이다. 보이는 글자를 다 훑으므로 찾는 규칙이 모자랄 수 없다. 역할로 찾는 대상은 그대로 찾지 못함 |
| 머리와 칩 줄을 한 sticky 묶음에 넣음(R02) | 어김(116px) — 지켰는데 어김 | 화면에 붙은 묶음 맨 위에 `header`·`role=banner`가 따로 있으면 그것을 머리로 본다 |
| '담기' 버튼에 `aria-label="소금빵 담기"`(R14 exact) | 찾지 못함 | exact로 못 찾으면 보이는 글자가 정확히 같은 버튼을 다시 찾는다 |
| 밀어서 드러나는 버튼이 카드 앞면에 덮여 있음(P13) | 밀지 않아도 지킴 — 어겼는데 지킴 | "보임"에 덮였는지(중심점의 `elementFromPoint`)를 더했다. 화면에 붙은 막대·알림이 덮은 것은 스크롤하면 드러나므로 덮인 것으로 보지 않는다 |
| 같은 버튼이 다섯 개이고 하나만 드러남(P15 조작) | 덮인 첫 버튼을 눌러 시간 초과 | 조작 대상은 덮이지 않은 것을 먼저 고른다 |
| 바깥 `li`는 투명, 안쪽 앞면에 바탕색(P07) | 어김(투명) — 지켰는데 어김 | 바탕색은 자기 바탕이 투명하면 상자를 90% 넘게 덮은 자식의 바탕을 본다 |

- `li > article` 카드, 창 스크롤 + IntersectionObserver 머리, flex-wrap + margin 간격은 처음부터 맞게 잡혔다. `li > article`은 같은 상자의 사슬에서 칠해진 가장 바깥 요소를 카드로 보는 규칙 덕이다.

## 3. 주의사항

- 지원 범위가 좁다. 114개 중 17개(15%)만 잰다. flower-landing·meeting-room은 하나도 재지 않는다. 본 측정 전에 미지원 요구를 핵심 문법으로 다시 쓸지, 문법을 넓힐지 정해야 한다. 이유가 하나뿐인 53개가 먼저 볼 후보다.
- 요구의 정규식이 좁은 곳이 있다. 가격을 "3,500 원"으로 띄어 쓰면 R13의 `^[0-9,]+원$`에 걸리지 않아 찾지 못함이 된다. 요구 목록을 고칠 때 `\s*`를 넣을지 본다.
- R02·R03(스크롤하면 줄어드는 머리)은 페이지가 300px 넘게 스크롤되지 않으면 줄어들 수 없다. 짧은 화면은 어김이 된다.
- `hover`·`focus`·`type`·`press`·`longPress` 조작은 지원 요구 중 쓰는 것이 없어 실제 화면에서 돌려 보지 못했다. `drag`(터치)와 `click`·`scroll`·`wait`만 견본으로 확인했다.
- 지원하는 17개 중 견본으로 확인한 것은 bakery 9개와 plant-care 5개(스크래치 견본)다. ev-charging의 E04·E08, invoice-list의 I02는 화면에 돌려 보지 않았다.
- 덮였는지는 중심점 하나만 본다. 중심만 덮이고 나머지가 보이는 요소는 안 보인다고 판정한다. 화면 밖 요소는 보지 않는다.
- 요구 하나에 새 페이지를 연다. 견본 실행 하나(지원 요구 9개)에 약 24초 걸렸다. 요구 하나에 약 2.7초다. 실행은 `--concurrency`(기본 4)만큼 동시에 돈다.
- 화면 결과를 바꾸는 작업이 아니라(측정 도구) 화면 비교 이미지는 만들지 않았다.
