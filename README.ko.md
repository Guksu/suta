# suta

Claude Code나 Codex가 UI를 만들 때 참고하는 스킬입니다. 레이아웃·색·모션 기준과 패턴 57종의 코드를 제공합니다.

AI로 UI를 만들 때마다 비슷한 카드와 과한 색상, 불필요한 장식이 반복되는 게 불편했습니다. 이런 디자인의 AI slop을 줄여보려고 suta를 만들었습니다.

[English](README.md) · [라이브 데모](https://guksu.github.io/suta/) · [설치](#설치) · [상세 안내](docs/guide.md)

![같은 쇼핑 앱 요청으로 만든 화면. 위는 suta 없이, 아래는 suta를 설치하고 만든 결과](docs/assets/as-is-to-be.jpg)

Claude Code에서 같은 요청·모델·설정을 사용했습니다. 위는 미설치 조건의 단일 실행, 아래는 suta 0.8로 네 번 실행한 결과 중 세 번째입니다. 실행마다 결과가 달라지며, suta 사용 시 생성 시간이 늘었습니다. [실험 방법·전체 결과·한계](docs/comparisons.md) · [사진 출처](docs/assets/CREDITS.md)

## 설치

**Claude Code** — 대화창에서 실행합니다.

```text
/plugin marketplace add Guksu/suta
/plugin install suta@suta
```

**Codex** — 터미널에서 실행한 뒤 `/hooks`에서 suta의 편집 후 검사를 승인합니다.

```bash
codex plugin marketplace add Guksu/suta
codex plugin add suta@suta
```

**다른 에이전트 / 스킬만 설치** — 기준과 패턴을 설치합니다. 플러그인의 편집 후 검사는 포함하지 않습니다.

```bash
npx skills add Guksu/suta --skill suta
```

[설치 방법과 이전 버전에서 옮기기](docs/guide.md#설치) · [업데이트](docs/guide.md#업데이트) · [skills.sh](https://skills.sh/guksu/suta/suta)

## 첫 요청

설치한 뒤 에이전트에 이렇게 요청해 보세요.

> suta를 사용해서 이메일, 비밀번호, 로그인 버튼, 비밀번호 찾기 링크가 있는 로그인 화면을 만들어줘. 간단하게 구성하고 키보드로도 사용할 수 있게 해줘.

에이전트가 기준을 읽고 패턴 코드를 프로젝트에 맞게 가져다 씁니다. 플러그인은 편집 후 레이아웃·모션 문제도 검사합니다. 스킬과 패턴 설명서는 한국어로 작성되어 있습니다.

패턴은 [라이브 데모](https://guksu.github.io/suta/)에서 직접 만져 볼 수 있습니다. 정적 검사로 모든 UI 문제를 찾을 수는 없으므로 브라우저에서도 확인해야 합니다.

## 앞으로

직접 사용하면서 부족한 부분을 계속 수정하고, 기준과 패턴도 꾸준히 업데이트할 예정입니다. 사용해 보시고 불편한 점을 [이슈](https://github.com/Guksu/suta/issues)로 알려주시면 개선에 반영하겠습니다.

[릴리스](https://github.com/Guksu/suta/releases) · [화면 비교](docs/comparisons.md) · [벤치마크](docs/benchmark.md) · [기여하기](docs/guide.md#기여하기)

[![Deploy demo](https://github.com/Guksu/suta/actions/workflows/deploy-demo.yml/badge.svg)](https://github.com/Guksu/suta/actions/workflows/deploy-demo.yml)
![Patterns](https://img.shields.io/badge/suta-57%20patterns-1b1e24)
![Tests](https://img.shields.io/badge/tests-659%20passing-555555)
[![License: MIT](https://img.shields.io/badge/license-MIT-555555)](LICENSE)

## 라이선스

코드는 [MIT](LICENSE)입니다(© 2026 Guksu). 비교 이미지의 사진 라이선스는 [이미지 출처](docs/assets/CREDITS.md)에 있습니다.
