# 릴리스와 검색 노출 관리

## GitHub 저장소

- 홈페이지: https://guksu.github.io/suta/
- 주제: `agent-skills`, `claude-code`, `codex`, `frontend`, `ui-design`, `accessibility`, `ai-slop`
- 소개는 기본 영어 README, 한국어는 `README.ko.md`에서 유지한다. 예전 `README.en.md` 링크는 이동 안내를 남긴다.

홈페이지와 주제는 GitHub 저장소 설정이라 PR과 별도로 반영된다.

## 릴리스

1. `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`의 버전이 일치하는지 확인한다.
2. `npm run build`, `npm run lint`, `npm run test`, `npm run validate`를 실행한다.
3. `docs/releases/vX.Y.Z.md`에 실제 변경, 설치·업데이트 방법, 필요한 주의사항을 기록한다. 새로운 실험 결과에는 실행 조건과 원문 링크를 함께 쓴다.
4. 변경이 main에 합쳐진 후, 검증한 커밋 SHA를 대상으로 같은 버전의 GitHub Release를 만든다. 기존 태그를 옮기거나 덮어쓰지 않는다. PR만 만드는 요청이라면 릴리스 발행을 임의로 추가하지 않는다.
5. 릴리스의 태그·본문·설치 경로를 확인한다. 문서만 바뀌었을 때는 플러그인 버전을 올리지 않는다.

첫 릴리스 `v0.10.0`은 이미 공개된 버전의 main 커밋 `3818fc6`을 대상으로 한다. 이번 README 개편을 새 기능으로 포함하지 않는다.

## skills.sh

[suta 페이지](https://skills.sh/guksu/suta/suta)에 설치 명령과 스킬 본문이 노출된다. 별도 등록 PR은 필요하지 않다. [공식 FAQ](https://skills.sh/docs/faq)에 따르면 실제 CLI 설치가 집계되어 순위에 반영된다.

배포 전 임시 프로젝트에서 `npx skills add Guksu/suta --skill suta --agent codex --yes`로 설치 경로와 패턴·검사 파일 포함 여부를 확인한다. 설치 수를 늘리기 위한 반복 설치는 하지 않는다. 이 방식에는 플러그인 훅이 포함되지 않으며, 기존 전역 설치를 검증에 사용하지 않는다.
