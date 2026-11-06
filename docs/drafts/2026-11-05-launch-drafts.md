# 초안 — 커뮤니티 소개 글

게시하지 않은 초안이다. 올리기 전에 사용자가 읽고 고친다. 숫자는 `docs/comparisons.md`의 기존 측정값이고, 0.16.0으로 새로 잰 값은 없다.

## 1. 릴리스 노트

`docs/releases/v0.16.0.md`로 옮겼다. 그 파일이 main에 들어가면 릴리스가 발행된다.

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
