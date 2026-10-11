# README 첫 화면과 배포 경로 정리

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-10-11 |
| 관련 경로 | README.md, README.ko.md, README.en.md, docs/comparisons*, docs/guide*, docs/releases/, scripts/validateSkills.mjs |

## 1. 개요

저장소 방문자가 비교 결과를 보고 곧바로 설치해 볼 수 있도록 README를 줄였다. 기존 영어판을 기본 문서로 옮기고 한국어판을 별도로 유지했다. 이어서 GitHub와 skills.sh의 유입 경로, 릴리스와 업데이트 안내를 정리했다.

## 2. 작업내용

- README를 만든 이유 → 기존 비교 이미지 → 설치 → 첫 요청 순서로 정리했다. 지속적으로 수정·업데이트한다는 안내와 이슈 링크를 추가했다.
- 실험 표·실행 조건·시간과 비용·한계는 `docs/comparisons.md`와 `docs/comparisons.en.md`로 옮겼다. 기존 이미지와 사진 출처를 유지했다.
- `README.en.md`는 이전 링크를 위한 이동 안내로 남겼다. README 배지 검증과 관리 지침은 `README.md`·`README.ko.md`를 가리킨다.
- 양쪽 상세 안내에 Claude Code·Codex·skills CLI 업데이트 절차를 추가했다.
- GitHub 홈페이지를 데모로 설정하고 관련 주제 7개를 추가했다. 이 설정은 PR과 별도로 반영됐다.
- 공개 main `3818fc6a1ed249a14bb992bdc5558ec5845b1532`에 [v0.10.0](https://github.com/Guksu/suta/releases/tag/v0.10.0)을 발행했다. 기존 버전의 첫 GitHub Release이며 이 PR의 문서 변경은 포함하지 않는다.
- [skills.sh 상세 페이지](https://skills.sh/guksu/suta/suta)에서 설치 명령과 스킬 본문 노출을 확인했다. 별도 임시 프로젝트에 공개 CLI로 한 번 설치해 SKILL.md, 패턴 56종, assets, audit.mjs가 포함되는지 확인했다.
- 검증: build·lint 통과, 테스트 89개 파일/743건 통과, 스킬 구조 검증 통과, 선택 평가 461/461, 정적 검사 error 0·warn 22. Markdown 파일 링크와 `git diff --check` 통과.

## 3. 주의사항

- 빌드에는 기존 500kB 초과 번들 경고가 남아 있다. 정적 검사 경고 22건도 기존 상태다.
- Codex 마켓플레이스 갱신과 설치된 플러그인의 갱신은 구분한다. 실제 사용자의 설치 버전 변경은 이번 확인에 포함하지 않았다.
- skills.sh 검색 결과 목록의 갱신 시점과 순위는 외부 서비스가 정한다. 상세 페이지 노출과 실제 설치 경로를 확인했다.
- GitHub 설정과 릴리스는 이미 반영됐다. 이 PR을 닫거나 되돌려도 자동으로 취소되지 않는다.
