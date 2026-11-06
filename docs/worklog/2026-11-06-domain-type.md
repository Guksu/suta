# 업종에 따른 글꼴·글자 크기

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-11-06 |
| 작성 | Claude Code |
| 관련 경로 | `skills/suta/patterns/layout-principles/references/tone.md`, `skills/suta/patterns/layout-principles/assets/layout-tokens.css`·`layoutTokens.ts`(+ `layout-audit` 공유 코어), `skills/suta/references/defaults.md`·`checklist.md`, `demo/src/tests/layoutTokens.test.ts`, `docs/research/2026-11-06-domain-type.md` |

## 1. 개요

사용자가 글꼴과 글자 크기도 업종(도메인)에 따라 고르게 해 달라고 했다. 지금까지 suta는 업종과 상관없이 고딕 한 벌·본문 16px을 기본으로 깔았다. 업종 9개의 웹사이트 첫 페이지 48곳을 재서 업종마다 달라지는 값을 지침과 토큰에 넣었다.

## 2. 작업내용

- 측정: 93곳 중 robots.txt가 막은 15곳은 열지 않았고, 봇 차단·빈 페이지 30곳은 뺐다. 48곳(한국어 페이지 31·영어 17)을 1440·390에서 계산된 스타일과 실제로 그려진 글꼴로 쟀다. 결과와 방법은 `docs/research/2026-11-06-domain-type.md`.
- `tone.md` 5절에 "업종과 읽는 조건에 따라" — 업종별 표(본문 크기·큰 글자·명조·고정폭)와 고르는 법. 공공·고령층·긴 글 17~19, 일반 15~16, 빽빽한 도구·커머스 목록 14, 브랜드·패션 메뉴 12~13. 큰 글자는 도구·SaaS는 크고 가늘게 + 자간 좁게, 공공은 굵게, 교육·아동은 가장 굵게. 명조는 매체·출판의 제목·인용과 브랜드·공공의 큰 제목 한 곳, 고정폭은 코드만. 앱 화면은 업종과 상관없이 고딕 한 벌. "자간은 건드리지 않는다"를 본문으로 좁혔다.
- 토큰 `--font-serif`·`--font-mono`(CSS와 TS 두 벌, `layout-audit`의 공유 코어 사본까지). 테스트를 먼저 써서 실패를 확인한 뒤 넣었다.
- `defaults.md`: 글꼴 문단, AI 틀 표에 "어느 업종에나 같은 16px 고딕" 행, 값 표의 글자 크기·줄 간격·글꼴. `checklist.md`에 확인 한 줄. `layout-principles/PATTERN.md` 파일 표.
- README 배지 tests 726.

## 3. 주의사항

- 이 지침으로 화면을 다시 만들어 재지 않았다. 생성 결과의 차이와 블라인드 선호는 모른다. 그래서 화면 비교 이미지도 없다(규칙 12 — 아직 화면 결과가 없다).
- 첫 페이지만 쟀다. 매체의 기사 페이지, 도구의 로그인 뒤 화면은 재지 않았다. 업종마다 4~9곳이다.
- 명조·고정폭 글꼴 파일은 넣지 않았다. 토큰은 파일이 없으면 운영체제 글꼴로 내려간다.
