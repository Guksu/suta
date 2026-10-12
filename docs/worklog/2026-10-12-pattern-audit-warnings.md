# 패턴 CSS의 suta 검사 경고 22건 정리

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-10-12 |
| 작성 | 에이전트 (Claude Code) |
| 관련 경로 | `skills/suta/patterns/*/assets/*.css`(패턴 20개), `skills/suta/patterns/layout-audit/assets/auditLayout.ts`·`PATTERN.md`, `demo/src/tests/auditLayout.test.ts`, README 2벌 배지 |

## 1. 개요

`node skills/suta/scripts/audit.mjs skills/suta/patterns`가 error 0, warn 22건을 냈다. 사용자가 패턴 CSS를 프로젝트에 그대로 복사하면 suta의 편집 후 검사 훅이 그 파일에 경고를 낸다. 걷기 리워드 벤치마크에서 suta 설치 실행의 경고가 모두 복사된 패턴 CSS(segmented-control·toast-stack)에서 나왔다. 걷기 리워드 작업에서 별도 작업으로 제안했고, 사용자가 이 세션에서 진행하라고 했다.

## 2. 작업내용

- **`spacing-off-scale` 20건(패턴 20개)**: 4px 격자 밖 간격을 척도(4·8·12·16·24·32·48)로 옮겼다. 대부분 1~2px 차이다.
  - 누르는 영역이 줄어드는 곳은 위로 올렸다. 세그먼트 `6px 14px` → `8px 12px`(높이 30 → 34), 유리 GNB 링크 `6px 10px` → `8px 12px`(막대 52 → 56), 툴팁 `6px 10px` → `8px 12px`(31 → 35).
  - 줄어든 곳: 아코디언 머리 `14px` → `12px`(52 → 48, 누르는 영역 44 이상 유지).
  - 셀렉트는 높이를 직접 정했다. 트리거 `min-height: 48px`(입력칸·주 버튼과 같은 높이, 46 → 48), 선택지 `min-height: 40px`.
  - 플로팅 라벨은 위치까지 함께 옮겼다. 입력 `22px 13px 8px` → `24px 12px 8px`(56 → 58), 라벨 `top: 15px` → `17px`, `left: 14px` → `13px`. 떠오른 라벨(위 7~25px)이 입력 글자(25px부터)와 겹치지 않고, 왼쪽 선이 입력 글자와 맞는 것을 브라우저로 쟀다.
  - 바텀시트 손잡이 `margin: 10px auto 6px` → `8px auto`(위아래 합은 16으로 같다).
- **`radius-variety` 1건(file-upload)**: 반경 12·6·10·8을 12(카드)·8(컨트롤) 두 종으로. 파일 행 10 → 12, 포커스 테두리 6 → 8.
- **`effect-overuse` 1건(glass-nav)**: 검사 규칙의 오탐이었다. 스크롤 전 시작 상태의 `blur(0)`와 완전히 투명한 그림자(`rgba(0, 0, 0, 0)`)까지 "강한 효과"로 세어 4곳이 됐다. 실제 효과는 스크롤 뒤 유리 상태 한 곳이다.
  - `layout-audit`가 `blur(0)`과 투명 그림자 층(`transparent`, 알파 0인 rgba·hsla)을 세지 않게 고쳤다(TDD, 테스트 2개 — 시작 상태는 세지 않음, 0이 아닌 같은 모양은 그대로 셈).
  - `layout-audit/PATTERN.md`의 `effect-overuse` 행에 적었다.
- **확인**
  - 고치기 전·후로 데모 20개를 390·1280에서 캡처해 나란히 봤다. 깨진 곳 없이 위 크기만 바뀌었다. 페이지 오류 0.
  - 셀렉트 선택지 높이는 닫힌 패널이 0.98배로 줄어 39로 재졌다. 열면 40이다.

## 3. 주의사항

- **결과**: `node skills/suta/scripts/audit.mjs skills/suta/patterns` error 0 · warn 0. `npm run validate`의 스킬 전체 검사도 warn 22 → 0.
- **게이트**: 빌드·린트 통과, 테스트 763개 통과(정적 개수 651, README 배지 갱신), 구조·선택 평가 472/472, 데모 검사 0/0.
- **보이는 차이**: 세그먼트·툴팁·유리 GNB가 4px 커졌고, 아코디언 머리가 4px 작아졌다. 패턴을 이미 복사해 쓰는 프로젝트에는 영향이 없다(복사본은 그대로다).
- 같은 작업 트리에 걷기 리워드 점검(0.11.0)의 커밋 전 변경이 함께 있다. 버전은 따로 올리지 않았다(0.11.0에 함께 들어간다).
