# suta — 에이전트 작업 지침

이 파일은 이 저장소에서 일하는 **모든 코딩 에이전트**(Claude Code·Codex·Cursor·Gemini CLI·GitHub Copilot 등)를 위한 공통 지침이다. 도구별 파일(`CLAUDE.md` 등)은 이 파일을 가져오고 도구 전용 내용만 덧붙인다. 규칙을 고칠 때는 이 파일 한 곳에서만 고친다.

## 이 저장소는 무엇인가

suta — AI 슬롭(AI가 만든 티가 나는 UI)을 없애는 설치형 에이전트 스킬이다. 사용자는 진입 스킬 하나(`skills/suta`)를 설치하고, Claude Code·Codex 등은 UI 요청마다 그 스킬을 자동으로 읽는다. 열린 표준인 Agent Skills 형식을 따른다. Claude Code·Codex 플러그인으로 설치하면 파일을 고칠 때마다 레이아웃·모션 검사 훅도 돈다.

| 무엇 | 경로 | 내용 |
|---|---|---|
| 진입 스킬 | `skills/suta/SKILL.md` | UI 요청에 걸리는 description + 작업 절차·AI 슬롭 금지선·레이아웃·모션 값 + 패턴 카탈로그(자동 생성 — `npm run catalog`) |
| 통합 검사·훅 | `skills/suta/scripts/` | `audit.mjs`(레이아웃·모션 검사를 한 번에) + `post-edit-hook.mjs`(편집 후 검사 훅) + 순수 로직(`auditAll.ts`·`hookCore.ts`) |
| 패턴 57종 | `skills/suta/patterns/{패턴}/` | `PATTERN.md`(설명서) + `assets/`(바닐라 코어 .ts 의존성 0 + React 래퍼 .tsx + CSS) + `references/`(상세) |

패턴 문서는 `SKILL.md`가 아니라 `PATTERN.md`다. 하위 폴더에 SKILL.md가 있으면 도구가 패턴마다 별도 스킬로 등록한다. 그러면 스킬 목록 길이 예산을 넘기고 진입 스킬과 경쟁한다(검사 스크립트가 막는다).

데모 사이트(`demo/`, Vite + React, GitHub Pages)는 패턴마다 데모 페이지를 둔다.

**정본 원칙:** 패턴 문서와 `assets/` 코드가 정본이다. 데모는 `@skills/{패턴}/assets/...` alias(= `skills/suta/patterns`)로 정본을 import만 한다. 복사본을 만들지 않는다. 복사본은 한쪽만 고치는 순간 문서가 거짓말이 된다.

## 저장소 구조

```text
suta/
├─ AGENTS.md                         이 파일 — 공통 작업 지침(단일 출처)
├─ CLAUDE.md                         Claude Code 전용 — AGENTS.md를 가져오고 훅·스킬 이름만 덧붙임
├─ skills/suta/                      설치되는 진입 스킬 — SKILL.md + scripts/(통합 검사·편집 후 검사 훅) + patterns/{패턴}/(PATTERN.md + assets/)
├─ .claude-plugin/                   Claude Code 마켓플레이스·플러그인 정보. source "./" — 저장소 루트가 곧 플러그인. 편집 후 검사 훅을 인라인으로 담는다
├─ .codex-plugin/                    Codex 플러그인 정보 — skills "./skills/" + 편집 후 검사 훅(인라인)
├─ .agents/plugins/                  Codex 마켓플레이스 정보(local "./") — codex plugin marketplace add Guksu/suta
├─ .agents/skills/add-skill/         패턴 추가 파이프라인(모든 에이전트가 발견, metadata.internal로 일반 설치 목록에서는 숨김)
├─ .claude/                          Claude Code 전용 훅·설정. skills/add-skill은 .agents/로의 심볼릭 링크
├─ demo/                             데모 사이트 (src/demos/index.ts가 목록·라우팅·카탈로그 카테고리의 단일 출처)
├─ evals/                            선택 평가 — trigger.json(진입 스킬 트리거)·selection/{패턴}.json(패턴 선택), benchmark/(퍼블리싱 벤치마크 요청문·결과)
├─ scripts/                          validateSkills·evalSelection·buildCatalog(.mjs), lib/(순수 로직 — 테스트는 demo/src/tests), benchmark/(벤치마크 실행·측정·집계), install-skills.sh
└─ docs/                             상세 안내(guide.md·guide.en.md)·설계(design/)·조사(research/)·규칙(harness-rules.md)·작업 기록(worklog/)·템플릿
```

저장소 루트가 플러그인이므로 루트에 `commands/`·`agents/`·`hooks/`·`.mcp.json` 같은 플러그인 구성 폴더를 만들지 않는다. 만들면 설치한 사용자 환경에 그대로 로드된다(검사 스크립트가 막는다). 사용자 환경에 실리는 훅은 편집 후 검사 하나뿐이다. 매니페스트(`.claude-plugin/plugin.json`·`.codex-plugin/plugin.json`)에 인라인으로만 두고, `skills/suta/scripts/post-edit-hook.mjs`만 가리킨다(검사 스크립트가 확인한다). 버전을 올릴 때는 `.claude-plugin/plugin.json`·`.claude-plugin/marketplace.json`·`.codex-plugin/plugin.json`의 version을 함께 바꾼다(검사 스크립트가 비교한다).

## 개발 명령

모두 저장소 루트에서 실행한다(npm workspaces로 `demo/`에 위임된다).

```bash
npm ci                            # 의존성 설치
npm run dev                       # 데모 개발 서버 → http://localhost:5173/suta/
npm run build                     # tsc -b && vite build
npm run lint                      # eslint (demo/ 기준)
npm test                          # vitest run (jsdom)
npm run catalog                   # 진입 스킬의 패턴 카탈로그를 PATTERN.md·데모 레지스트리에서 다시 만든다
node scripts/validateSkills.mjs   # 진입 스킬·패턴 구조 검사 — 실패하면 exit 1
node scripts/evalSelection.mjs    # 선택 평가 — UI 요청에 suta가 걸리는지, 요청에 맞는 패턴이 골라지는지
node skills/suta/scripts/audit.mjs <경로>   # 레이아웃·모션 통합 검사 — error가 있으면 exit 1
npm run validate                  # 위 두 검사 + 통합 검사(skills/suta 전체, error만 출력)를 한 번에
node scripts/benchmark/run.mjs --out <폴더>   # 퍼블리싱 벤치마크(일반 vs suta) — claude CLI를 수십 번 부르므로 비용이 든다. 측정·집계는 measure.mjs·report.mjs, 방법은 docs/benchmark.md
```

알려진 제약: `npm run lint`는 `skills/**/assets`를 실제로 검사하지 않는다(ESLint flat config가 `demo/` 밖 파일을 무시). assets 코드는 `npm run build`의 타입 검사와 테스트로 검증된다. `scripts/lib/*.ts`는 Node 22.18 이상이 그대로 실행한다(타입 표기만 벗겨 실행).

## 작업 규칙 (요약 — 전문은 `docs/harness-rules.md`)

작업 전에 `docs/harness-rules.md`를 읽는다. 설계 단일 출처는 `docs/design/2026-08-19-fe-skills.md`다.

1. **git은 사용자 전담.** commit·push·merge·rebase·branch 삭제를 에이전트가 먼저 하지 않는다. 작업이 끝나면 검증 결과와 확인 방법(`npm run dev`)을 보고하고 멈춘다. 사용자가 "커밋해줘/PR 올려줘"라고 명시했을 때만 commit·push·PR을 한다. 그때도 merge·rebase·force push는 하지 않는다. 커밋 메시지·PR 본문에 AI 작성 표기(Co-Authored-By 등)를 넣지 않는다.
2. **보호 브랜치 `main`에서는 파일을 편집하지 않는다.** 작업 브랜치(`feat/{패턴명}` 등)에서 한다.
3. **코드를 만들면 TDD가 기본.** 로직(상태 전이·판정·제스처·타이머)은 테스트를 먼저 쓴다(Red→Green). 순수 시각 효과에 빈 테스트를 만들지 않는다.
4. **CSS 우선.** transition/animation으로 되는 것은 CSS로. JS는 측정·판정·상태만. 애니메이션은 `transform`·`opacity`만(레이아웃 속성 금지). 공개 CSS 변수 `--{패턴}-xxx` + 내부 변수 `--_xxx` 폴백 패턴.
5. **접근성은 선택이 아니다.** 모든 패턴 CSS에 `@media (prefers-reduced-motion: reduce)` 블록. 키보드 조작·ARIA 역할 포함.
6. **코드 컨벤션.** 화살표 함수, `useCallback`/`useMemo` 지양, 인자 2개 이상이면 named-object `({ a, b })`, `useEffect(function 명명된함수() {}, [deps])`, TypeScript strict, 한글 주석으로 "왜"를 적는다, 한글 조판 `word-break: keep-all`.
7. **데모 콘텐츠는 국수집 테마.** 잔치국수·비빔국수·칼국수·손만두·성수동 등. 토스·당근·인스타그램·애플 앱의 실제 문구·탭 이름·구성을 복제하지 않는다. 레퍼런스 앱 언급은 PATTERN.md의 "언제 쓰는가"(관례 설명)까지만. 데모 안 문구는 한국어·영어 두 벌이다: 파일 위에 `const COPY = defineCopy({ ko, en })`(`demo/src/demoLang.ts`)를 두고 `COPY[useDemoLang()]`로 읽는다. 영어 메뉴 이름은 뜻을 옮긴다(Anchovy-broth noodles·Knife-cut noodles 등, 기준은 `demo/src/demos/bottom-nav/`). `demoCopy.test.tsx`가 영어 화면에 한글이 남으면 막는다.
8. **진입 스킬과 패턴은 설치된 프로젝트에서 단독으로 완결되어야 한다.** SKILL.md·PATTERN.md는 저장소 루트의 `demo/`·`scripts/` 경로를 언급하지 않는다(설치하면 없다). 스킬 안의 `skills/suta/scripts/`는 함께 설치되므로 SKILL.md가 `scripts/audit.mjs`로 가리킨다. 다른 패턴 코드가 필요하면 import하지 않고 파일을 복사하되 첫 줄의 `@shared-core {파일} origin: {패턴}` 헤더를 유지한다(검사 스크립트가 원본과 바이트 단위로 비교).
9. **시크릿은 읽지도 기록하지도 않는다.** `.env`·credential·키 파일을 열지 않는다.
10. **산출물은 파일로.** 작업 기록은 `docs/worklog/YYYY-MM-DD-{주제}.md`에 `docs/templates/worklog.md` 형식(1. 개요 / 2. 작업내용 / 3. 주의사항)으로 남긴다.
11. **출력은 읽는 사람이 이해할 수 있게.** 전문용어는 처음 나올 때 한 줄로 풀이하고, 한 문장에 하나의 내용만 담는다.
12. **요청마다 화면 비교를 남긴다.** 사용자가 요청한 작업이 화면 결과를 바꾸면 AS-IS/TO-BE 이미지를 만든다. 둘 곳은 작업 크기로 나눈다.
    - 실사용 점검·벤치마크: `docs/comparisons.md`·`comparisons.en.md`에 절을 더한다. 요청문, 이미지 `docs/assets/{주제}-as-is-to-be.jpg`, 실행 수, 표, 판정, 연구 문서 링크를 넣는다.
    - 패턴·관례·검사 규칙 같은 작은 변경: 데모나 산출물의 전후 캡처 한 장을 `docs/worklog/assets/{날짜}-{주제}.jpg`로 두고 작업 기록과 PR 본문에 싣는다. PR 본문의 이미지는 커밋 해시가 든 raw 주소로 건다.
    - 이미지는 각 조건의 첫 실행이나 같은 화면의 전후로 만든다. 잘 나온 실행을 골라 넣지 않는다. 그림 안 글자는 줄 머리 AS-IS·TO-BE만 쓴다.
    - 화면이 없는 요청(커밋·PR, 문장 손질)은 빼고, 뺀 이유를 보고에 한 줄로 적는다.

## 패턴 추가·수정 절차

패턴 추가·수정·재검증 요청은 `.agents/skills/add-skill/SKILL.md`의 파이프라인을 따른다(평가 → 문서 → 데모 → 카탈로그 → 게이트). 요약:

1. `evals/selection/{패턴}.json` — **문서보다 먼저** 쓴다(Red). 이 패턴이 골라져야 하는 요청 3개 이상(`should`: 구어체·영어 표현 포함)과 골라지면 안 되는 이웃 요청 3개 이상(`shouldNot`: 비슷한 다른 패턴의 요청). `node scripts/evalSelection.mjs {패턴}`으로 확인한다.
2. `skills/suta/patterns/{패턴}/PATTERN.md` — frontmatter `name`(= 폴더명)·`description`. **description 규칙:** 3인칭으로 "무엇을 하는가 + 언제 쓰는가"만 적는다. 80~300자, 150~250자 권장. 첫 문장이 진입 스킬 카탈로그의 한 줄 요약이 되므로 "무엇을 구현한다."로 짧게 끝낸다. 사용자가 실제로 쓸 표현을 따옴표로 나열하고 핵심 영어 용어를 한 번 넣는다. 구현 방식 요약과 에이전트 명령문은 넣지 않는다. 본문: 언제 쓰는가 → 기술 선택(왜 이 기술인가) → 파일 표 → 사용 방법(React / 순수 JS) → 커스터마이즈 → 주의사항.
3. `assets/` — 코어 + React 래퍼 + CSS. 접근성 포함.
4. `demo/src/demos/{패턴}/` 데모 페이지 + `demo/src/demos/index.ts` 등록(`title`·`description`과 영어 `titleEn`·`descriptionEn` 모두, `category`는 카탈로그 묶음이 된다). 데모 안 문구는 `defineCopy({ ko, en })` 두 벌(규칙 7). 테스트는 `demo/src/tests/`.
5. `npm run catalog` — 진입 스킬의 패턴 카탈로그를 다시 만든다. 손으로 고치지 않는다.
6. 상세 안내 `docs/guide.md`와 `docs/guide.en.md`의 패턴 표에 한 행씩 더하고, `README.md`·`README.ko.md`의 배지 숫자(패턴 수, tests 수)를 갱신한다 — 검사 스크립트가 두 README의 배지를 실제 수와 비교한다.
7. 워크로그. 데모 전후 캡처를 함께 둔다(규칙 12).

진입 스킬(`skills/suta/SKILL.md`)의 description을 고칠 때는 `evals/trigger.json`도 같이 본다. 일반 UI 요청(should)에는 suta가 걸리고, UI가 아닌 요청(shouldNot)에는 걸리지 않아야 한다. description은 1,024바이트 이하이고 `": "`를 쓰지 않는다(YAML).

### 완료 게이트 — 전부 통과해야 완료

| # | 게이트 | 방법 |
|---|---|---|
| 1 | 빌드·린트·테스트 | `npm run build && npm run lint && npm test` |
| 2 | 구조·선택 평가 | `npm run validate` (`validateSkills.mjs` — 카탈로그·매니페스트 동기 포함 + `evalSelection.mjs` — 트리거·패턴 + 레이아웃·모션 통합 검사) |
| 3 | 브라우저 실동작 | 데모 페이지를 실제 브라우저로 열어 동작·계산된 스타일·스크린샷으로 확인 |
| 4 | 모션 리뷰 | 이징·타이밍·reduced-motion 검토. 지적 사항 반영 |

게이트가 실패하면 고친 뒤 그 게이트부터 다시 돌린다.

선택 평가는 LLM을 부르지 않는다. description과 요청 문장의 단어 겹침(IDF 가중)으로 순위를 매기는 대리 지표라, 실제 모델의 선택과 다를 수 있다. 잡아내는 것은 두 가지다: 트리거 표현이 description에 없는 경우, 두 description이 구별되지 않는 경우.

## 도구별 차이

- **Claude Code**는 `.claude/hooks/`로 규칙 1·2·9를 기계적으로 강제하고, 턴이 끝날 때 게이트 1·2를 자동 실행한다. `CLAUDE.md`가 이 파일을 가져온다. 이 훅들은 저장소 작업용이고, 사용자에게 배포되는 훅(편집 후 검사)과 다르다.
- **다른 에이전트**에는 훅이 없다. 위 규칙을 스스로 지키고, 끝내기 전에 게이트 1·2를 직접 실행한다. 패턴 추가 절차는 `.agents/skills/add-skill/`에서 자동으로 발견된다(Codex·Cursor·Gemini CLI·Copilot이 `.agents/skills/`를 읽는다).
