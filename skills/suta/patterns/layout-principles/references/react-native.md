# React Native·Expo로 옮기기

suta의 패턴 코드는 웹(DOM·CSS)이다. React Native·Expo 앱에는 코드를 그대로 붙이지 않는다. 금지선·값·동작 순서를 네이티브 컴포넌트로 옮긴다. 이 문서는 그 대응표다. 앱을 웹앱이나 웹뷰로 바꿔서 패턴을 쓰려고 하지 않는다.

실사용 점검(Expo SDK 57 · React Native 0.86 · Reanimated 4 앱의 토스트·진행 막대·스켈레톤·빈 상태·시트 보강)에서 확인한 내용이다.

## 1. 그대로 가져가는 것

- AI 슬롭 금지선, 화면 유형 뼈대(`screen-conventions.md`), 톤(`tone.md`).
- 값: 글자 12·14·16·20·24(본문 16), 간격 4px 척도(묶음 안 8·묶음 사이 24·구역 사이 32), 반경 3종(조작 8·카드 12·시트 24), 누르는 영역 44, 주 버튼 48.
- 색 역할: UI 유채색은 강조색 하나 + 오류 빨강. 글자 3단계, 면 2단계(흰 면·옅은 회색).
- 모션 시간: 누름 60ms·복귀 220ms, 들어옴 240ms·나감 180ms(들어옴의 3/4), 반복(맥동·진행)은 2초 안.

## 2. 토큰

CSS 변수 대신 타입 있는 객체 하나(`theme/tokens.ts`)에 둔다. 화면의 `StyleSheet.create`에서는 숫자 대신 토큰을 쓴다.

```ts
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const
export const radius = { control: 8, card: 12, sheet: 24, full: 999 } as const
export const size = { tap: 44, control: 48, header: 56, row: 52, icon: { sm: 16, md: 18, lg: 22 } } as const
export const motion = { pressIn: 60, pressOut: 220, enter: 240, exit: 180, sheet: 300, progressLoop: 1200, pulse: 900 } as const
export const pressedOpacity = 0.6 // 누른 행·칸 — 한 값으로
```

- 제목 서체를 따로 쓰면 `expo-font`의 `useFonts`로 불러오고, 끝날 때까지 스플래시를 둔다. 실패하면 시스템 서체로 연다.
- 굵은 서체 파일(Bold 한 벌)에는 `fontWeight`를 주지 않는다. Android가 가짜 굵기를 덧입힌다.
- 서체는 라이선스를 확인하고(SIL OFL 등), 라이선스 전문을 파일 옆에 둔다.

## 3. 웹 → 네이티브 대응표

| 웹 | React Native |
|---|---|
| `prefers-reduced-motion` | Reanimated `useReducedMotion()`. 레이아웃 애니메이션은 기본으로 시스템 설정을 따른다. 이동만 빼고 페이드를 남기려면 `reduce ? FadeIn.duration(150) : FadeInDown…`처럼 직접 고른다. react-native `Animated`·`LayoutAnimation`은 따르지 않는다 → `AccessibilityInfo.isReduceMotionEnabled()` |
| `transition: transform, opacity` | `useSharedValue` + `withTiming` + `useAnimatedStyle`. transform·opacity만 움직인다 |
| 폭이 늘어나는 막대 | 고정 폭 트랙 안에서 `scaleX` + `transformOrigin: 'left'` |
| `@keyframes … infinite` | `withRepeat(…, -1)`. `useReducedMotion()`이 참이면 시작하지 않는다 |
| `aria-live`·`role=status`(화면 밖에 뜨는 알림) | `AccessibilityInfo.announceForAccessibility(문장)` |
| 화면 안 상태 줄 | `accessibilityLiveRegion="polite"`(Android). 오류는 `accessibilityRole="alert"` + `"assertive"` |
| `aria-busy` | `accessibilityState={{ busy: true }}` |
| `role=progressbar`·`aria-valuenow` | `accessibilityRole="progressbar"` + `accessibilityValue`(`{ min, max, now }` 또는 `{ text: '진행 중' }`) |
| `env(safe-area-inset-*)`·`100dvh` | `react-native-safe-area-context`의 `SafeAreaView`·`useSafeAreaInsets`, `flex: 1` |
| `:active` 누름 | `Pressable`의 `style={({ pressed }) => …}`. 주 버튼은 0.96 축소(60ms) → 복귀(220ms) |
| `<dialog>`·바텀시트 | `Modal transparent animationType="none"` + `accessibilityViewIsModal`. 어두운 막은 opacity만, 시트만 translateY |
| `word-break: keep-all` | iOS `lineBreakStrategyIOS="hangul-word"`. Android는 글자 단위로 끊긴다 → 두 줄이 될 문구는 `\n`으로 직접 나눈다 |
| `rem`·글자 확대 | OS 글자 크기를 그대로 따른다. 달력 칸 숫자처럼 칸이 정해진 글자만 `maxFontSizeMultiplier` |
| `@font-face` | `expo-font`의 `useFonts`(위 2절) |

## 4. 패턴별 옮기기

- **`toast-stack` → 위쪽 한 줄**
  - 한 번에 하나만 띄우고, 보이는 동안 온 알림은 2개까지 기다린다. 같은 문장을 연타하면 쌓지 않고 시간만 다시 잰다.
  - 정보·완료는 3초, 오류와 행동이 있는 알림은 5초 머문다. 화면 낭독기가 켜져 있으면 두 배다.
  - 뜰 때 `announceForAccessibility`로 한 번 읽는다. 누르거나 위로 밀면(`Gesture.Fling`) 닫힌다.
  - 대기열은 React 없는 순수 함수로 두고 `node --test`로 검사한다.
  - 고칠 자리가 있는 문제(입력·권한·체리 부족)는 토스트가 아니라 그 자리의 오류 줄로 알린다.
- **`loading-button`**: 글자 자리에 `ActivityIndicator`를 두고 `busy` 상태로 알린다. 비활성은 강조색을 흐리게 하지 않고 회색 면으로 바꾼다.
- **진행 막대**: 정해지지 않은 진행은 짧은 조각이 트랙을 지나간다(1200ms 반복). 임의 퍼센트를 지어내지 않는다. 동작 줄이기에서는 조각을 멈추고 옆 글자로 알린다.
- **`skeleton`**: 올 내용과 같은 크기의 회색 면이 opacity로 맥동한다(900ms 왕복). 동작 줄이기에서는 멈춘다. 각 면은 낭독에서 감추고, 묶음 하나가 ‘불러오는 중’을 읽는다.
- **`bottom-sheet`**: 닫힘 애니메이션이 끝난 뒤에 `Modal`을 내린다. 열 때마다 상태를 초기화하려고 `key`로 다시 마운트하면 닫힘 애니메이션이 돌지 않는다. 열림 변화는 렌더 중에 따라간다.
- **`enter-exit`**: Reanimated `entering`·`exiting`(위에서 8pt 내려오며 240ms, 위로 180ms). 위 요소가 생기면 아래 요소에 `layout`을 줘 튀지 않게 한다.
- **`celebration`**: 완성 그림이 처음 보일 때 한 번 안착한다(조금 작고 더 기운 채 → 제자리, 끝에서 살짝 넘침). 동작 줄이기에서는 페이드만 한다.
- **빈 상태·불러오기 실패**: 무엇이 비었는지 한 줄 → 이유나 방법 한 줄 → 행동 하나. 막다른 화면을 만들지 않는다.

## 5. 검사 범위

`scripts/audit.mjs`는 `.ts·.tsx·.js·.jsx`에서 아래를 읽는다.

- `StyleSheet.create` 안의 숫자·문자열 값: 글자 크기, 간격, 반경, 색, `shadowRadius`.
- JSX 인라인 `style`.
- Reanimated `useAnimatedStyle`이 레이아웃 속성을 움직이는 곳.
- `withRepeat(…, -1)`·`Animated.loop`의 동작 줄이기 처리.
- `withTiming`·`Animated.timing`의 duration.
- react-native `Animated`·`LayoutAnimation`의 동작 줄이기 처리.

토큰 참조(`space.lg`·`colors.accent`)는 값을 모르니 세지 않는다. 토큰 파일의 값은 사람이 확인한다.

검사로 알 수 없는 것은 iOS·Android 기기(시뮬레이터·에뮬레이터)에서 확인한다.

- 실제로 누르는 영역, 글자 대비, 화면 낭독 순서.
- 제스처 충돌, 키보드에 가리는 하단 버튼, 큰 글자와 320pt 폭.

웹 미리보기(react-native-web)는 배치를 빨리 보는 용도다. OS 아이콘(SF Symbols)과 탭 바 모양이 달라서 기기 확인을 대신하지 못한다.
