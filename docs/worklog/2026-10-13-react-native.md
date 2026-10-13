# 실사용 점검 5 — React Native 앱에 suta 적용, RN 검사·옮기기 안내

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-10-13 |
| 작성 | 에이전트 (Claude Code) |
| 관련 경로 | `skills/suta/patterns/layout-audit/assets/auditLayout.ts`, `skills/suta/patterns/motion-audit/assets/auditMotion.ts`, `auditCore.ts`(두 벌), `skills/suta/patterns/layout-principles/references/react-native.md`, `skills/suta/SKILL.md`, 패턴 문서 3개, `demo/src/tests/auditLayout.test.ts`·`auditMotion.test.ts`, `evals/trigger.json`, guide 2벌, 매니페스트 3개, README 2벌 배지 |

## 1. 개요

사용자가 진행 중인 Expo·React Native 앱(데일리디저트, 비공개 저장소)의 부족한 디자인 시스템과 화면(오류 토스트·로딩 막대·알맞은 애니메이션 등)을 suta로 구현하고, 그 과정에서 suta도 고치자고 했다. 사용자 결정은 세 가지다.

- suta 개선은 RN 검사와 옮기기 안내까지만 한다. RN 코드 패턴은 넣지 않는다.
- 앱의 제목 서체는 무료 서체로 정한다. 브랜드 가이드의 옵션 1인 G마켓 산스 Bold를 쓴다. 공식 파일 안에 SIL OFL 1.1이 있다.
- 앱 화면 비교는 앱 저장소 안에만 둔다. 이 저장소에는 화면을 싣지 않는다(규칙 12의 예외, 사용자 결정).

## 2. 작업내용

- **진단.** suta 검사가 데일리디저트의 RN 파일 39개를 error 0·warn 0으로 통과시켰다. 그런데 검사는 JSX 인라인 `style`만 읽었다. RN 스타일 대부분이 들어 있는 `StyleSheet.create`는 보지 않았다.
- **layout-audit**(TDD, 테스트 4개). `.ts·.tsx·.js·.jsx`의 `StyleSheet.create` 안 숫자·문자열 값을 같은 줄의 CSS로 옮겨 기존 규칙으로 본다.
  - 읽는 값: `fontSize`, `padding*`·`margin*`·`gap`, `border*Radius`, 색 속성, `shadowRadius`.
  - 토큰 참조·스프레드·조건식은 세지 않는다.
- **motion-audit**(TDD, 테스트 4개).
  - Reanimated `useAnimatedStyle`이 레이아웃 속성을 움직이면 `layout-animation` error.
  - `withRepeat(…, -1)`·`Animated.loop`가 동작 줄이기 처리 없이 있으면 `infinite-loop` warn.
  - RN `Animated`·`LayoutAnimation`에 동작 줄이기 확인 코드가 없으면 `no-reduced-motion` warn.
  - `withTiming`·`Animated.timing`의 duration이 범위를 벗어나면 `duration-range` warn.
- **공통 코어**(`auditCore.ts`, 두 벌 같은 바이트): 문자열을 남기고 주석만 지우기, 짝 괄호 찾기, 깊이 0 쉼표 나누기, 호출 구간 찾기를 더했다.
- **안내 문서** `layout-principles/references/react-native.md`
  - 그대로 가져가는 것과 토큰 객체를 적었다.
  - 웹 → 네이티브 대응표: 동작 줄이기, 낭독, 진행 표시, 안전 영역, 누름, 시트, 한국어 줄바꿈, 서체.
  - 패턴별 옮기기: 토스트, 로딩 버튼, 진행 막대, 스켈레톤, 시트, 들어옴·나감, 축하, 빈 상태.
  - 검사가 읽는 것과 기기에서 확인할 것을 나눴다.
- **SKILL.md**: description을 "웹·React Native 앱의 UI"로 바꿨다(1,015바이트). 절차 1단계에 RN이면 안내 문서부터 읽는다고 적고, 한계 절에 검사 범위를 적었다.
- **평가·버전**: 트리거 평가 2개(Expo 토스트·RN 스켈레톤), 474/474. 버전 0.12.0, tests 배지 659.
- **앱 쪽 결과**(같은 검사): AS-IS error 0·warn 5 → TO-BE error 0·warn 0(46파일).
  - 달력 칸 여백 3px(1건, 두 곳)과 S1 실험실 달력 여백(1건)은 4px 척도로 고쳤다.
  - 개발용 스위치(1건)와 S1 실험실 메모지(2건)는 이유를 적은 예외 주석으로 남겼다.

## 3. 주의사항

- **화면 비교**: 앱 화면(AS-IS/TO-BE)은 데일리디저트 저장소 `docs/design/compare/2026-10-13-design-system.jpg`에만 있다. 비공개 저장소라 이 저장소에는 싣지 않았다(사용자 결정).
- **검사의 한계**: RN 검사는 리터럴 값만 본다. 토큰 파일의 값, 누르는 영역, 대비, 낭독 순서, 키보드 가림은 기기에서 확인해야 한다. 안내 문서 5절에 적었다.
- **웹 미리보기**: react-native-web으로 앱 화면을 캡처하려면 복사본에서 손을 대야 했다. 바꾼 것은 세 가지다.
  - 정적 출력을 SPA로 바꿨다.
  - crypto 폴리필이 읽기 전용 `crypto`를 덮어쓰지 않게 했다.
  - 네이티브 전용 모듈을 빈 모듈로 바꿨다.

  OS 아이콘(SF Symbols)이 웹에서 그려지지 않는 것은 여전하다. 앱 저장소의 코드는 바꾸지 않았다.
- 같은 날 작업 브랜치에 걷기 리워드 화면 비교(PR #47, 병합됨) 뒤의 변경만 있다.
