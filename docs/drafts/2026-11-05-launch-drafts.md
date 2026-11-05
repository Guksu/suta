# 초안 — 0.16.0 릴리스 노트·커뮤니티 소개 글

게시하지 않은 초안이다. 올리기 전에 사용자가 읽고 고친다. 숫자는 `docs/comparisons.md`의 기존 측정값이고, 0.16.0으로 새로 잰 값은 없다.

## 1. 릴리스 노트 초안 (`docs/releases/v0.16.0.md`로 옮기면 릴리스가 발행된다)

```markdown
# suta 0.16.0

## 바뀐 것

- 판단 순서를 정했습니다: 사용자가 명시한 요구 → 프로젝트의 기존 디자인 체계 → 실제 사용 문제 → suta 기본값. 디자인 체계가 있는 프로젝트에서는 색·카드·화면 구성을 suta 기본값으로 바꾸지 않습니다. 키보드·포커스·대비·넘침·동작 줄이기 같은 사용 문제만 고치고, 바꾼 범위를 알립니다.
- 요청하지 않은 기능·구역(설정의 고객센터·약관, 랜딩의 후기·로고 띠 등)을 더하지 않고 제안으로 보고합니다.
- 랜딩의 고객사 로고·사용자 수·후기·성과 수치는 실제 서비스라면 받은 자료로만 만듭니다. 시안·데모처럼 가상 목업이라고 밝힌 작업에서만 지어낸 값을 쓰고, 화면에 예시 표시를 둡니다.
- 진입 문서(SKILL.md)를 늘 필요한 내용만 남기고, 기본값·화면 유형별 확인·패턴 카탈로그를 `references/`로 나눴습니다. 요청마다 읽을 문서를 표로 정했습니다.
- 편집 후 검사가 사용 문제 경고를 `[사용 문제]`로 표시하고, 취향 경고는 프로젝트 체계의 값이면 그대로 두라고 안내합니다. 검사 규칙과 심각도는 바뀌지 않았습니다.

## 업데이트

- Claude Code: 터미널에서 `claude plugin marketplace update suta`, `claude plugin update suta@suta`를 실행하고 새 세션을 시작합니다.
- Codex: `codex plugin marketplace upgrade suta` 뒤 앱의 플러그인 설정에서 설치 버전을 확인하고 업데이트합니다.
- skills CLI: `npx skills update suta`

## 아직 재지 않은 것

이번 변경으로 생성 결과가 어떻게 달라지는지는 다시 재지 않았습니다. 진입 문서가 짧아졌지만, 요청당 읽는 양·시간·비용이 줄었는지는 모릅니다.
```

## 2. GeekNews (Show GN) 초안

```markdown
제목: Show GN: suta – Claude Code·Codex용 React UI 스킬 (패턴 57종 + 편집 후 검사)

Claude Code나 Codex로 UI를 만들면 키보드로 못 쓰는 버튼, 닫아도 돌아오지 않는 포커스, 좁은 화면에서 넘치는 레이아웃이 자주 나와서 만든 스킬입니다.

- 기준: 키보드 조작, 대화상자의 포커스 이동·복귀, 320~390px 넘침, 글자 대비, 동작 줄이기를 먼저 봅니다. 프로젝트에 디자인 체계가 있으면 그 체계를 그대로 쓰고, 색·카드 같은 기본값은 기준이 없는 프로젝트에서만 씁니다.
- 패턴 57종: 모달·바텀시트·토스트·드롭다운·폼·제스처. 의존성 없는 TypeScript 코어 + React 래퍼 + CSS를 복사해 씁니다.
- 편집 후 검사: 플러그인으로 설치하면 파일을 고칠 때마다 11px 미만 글자, 화면보다 넓어지는 grid 틀, 레이아웃 애니메이션 같은 문제를 file:line으로 에이전트에게 돌려줍니다.

같은 요청 4개를 조건마다 2번씩 만든 비교(suta 0.14)에서 axe 접근성 위반은 16 → 1, 12px 미만 글자는 24 → 0이었습니다. 320px 넘침은 1 → 1로 같았고, 가린 화면 비교의 선호는 갈렸습니다(설정·로그인은 suta 없이 쪽이 더 많이 골라짐). 생성 시간·비용은 약 세 배 늘었습니다. 실행 수가 적고 판정 모델 하나가 생성 모델과 같습니다.

데모: https://guksu.github.io/suta/
저장소: https://github.com/Guksu/suta

스킬 문서가 한국어라 영어권 사용자에게는 불편할 수 있습니다. 디자인 체계가 있는 프로젝트에 써 보시고, 원치 않게 바뀐 부분이 있으면 이슈로 알려 주세요.
```

## 3. Show HN 초안

```markdown
Title: Show HN: suta – a Claude Code/Codex skill for keyboard-safe React UI, with 57 patterns

I kept getting AI-built UI where buttons weren't reachable by keyboard, focus didn't come back after closing a dialog, and layouts scrolled sideways on a 320px screen. suta is a skill for Claude Code and Codex that tries to prevent that.

- Rules: keyboard access, focus moving into and out of dialogs, overflow at 320–390px, contrast, reduced motion. If your project has a design system, suta keeps it; its own visual defaults only apply when there is none.
- 57 patterns (modal, bottom sheet, toast, dropdown, form inputs, gestures): a dependency-free TypeScript core, a React wrapper and CSS that the agent copies into your project.
- A post-edit check: installed as a plugin, it scans each edited file and sends errors (text under 11px, a grid shell wider than the screen, layout-property animation, missing reduced-motion) back to the agent as file:line.

On four requests run twice per condition (suta 0.14), axe violations went from 16 to 1 and text under 12px from 24 to 0. Overflow at 320px stayed at 1 vs 1, blind design preference was split (the version without suta won settings and most login comparisons), and generation took about 3x longer and cost about 3x more. Sample sizes are small, and one judge model was also the generating model.

Caveat: the skill and pattern docs are written in Korean; the agent reads them fine, but they're harder for you to read.

Demo: https://guksu.github.io/suta/
Repo: https://github.com/Guksu/suta

I'd like to hear from people who try it on a project that already has a design system: did it change anything you didn't want changed?
```
