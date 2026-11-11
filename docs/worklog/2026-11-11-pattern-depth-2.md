# 남은 패턴 31종의 상태와 경계

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-11-11 |
| 작성 | Claude Code |
| 관련 경로 | `skills/suta/patterns/` 31종의 `PATTERN.md`·`assets/`, `demo/src/tests/`, `demo/src/demos/` 일부, README 2벌 배지 |

## 1. 개요

0.18.0에서 화면에 자주 쓰이는 패턴 22종에 "상태와 경계"를 더했다. 그때 패턴마다 결함이 2~10개씩 나왔다. 남은 31종(제스처·전환·진행·내비·표면)을 같은 방법으로 봤다. 원칙·검사 패턴 4종(`layout-principles`·`layout-audit`·`motion-principles`·`motion-audit`)은 컴포넌트가 아니라 뺐다.

## 2. 작업내용

패턴마다 문서·코드·데모·테스트를 읽고, 붙인 뒤 생기는 상황(컴포넌트 상태, 데이터 경계, 시간 경계, 환경)을 확인했다. `PATTERN.md`에 `## 상태와 경계` 표와 `## 함께 쓰는 패턴`을 더했고, 코드의 빈 곳은 테스트와 함께 고쳤다. 서브 에이전트 넷이 병렬로 했다. 이제 컴포넌트 패턴 53종 모두에 이 절이 있다.

| 묶음 | 패턴 | 찾아서 고친 것(일부) |
|---|---|---|
| 제스처 | pull-to-refresh, swipe-to-delete, pinch-zoom, swipe-dismiss-viewer, drag-to-reorder, long-press-menu, edge-swipe-back, wheel-picker | pull-to-refresh가 터치에서 동작하지 않았다(약 22px에서 `pointercancel`). edge-swipe-back은 가장자리 24px 안의 버튼이 눌리지 않았다. swipe-to-delete와 drag-to-reorder는 `pointercancel`을 "놓았다"로 봐서 끊긴 자리에서 행을 지우거나 순서를 확정했다. long-press-menu는 Enter·Space로 열리지 않았다. 뷰어에 포커스 이동·복귀가 없었다 |
| 등장·전환 | enter-exit, scroll-reveal, flip-list, zoom-lightbox, page-transition, card-expand, card-stack, stretchy-header | enter-exit는 StrictMode에서 처음부터 보이는 요소가 투명에 멈췄다. scroll-reveal은 화면보다 긴 요소가 영영 감춰졌다. flip-list는 스크롤하면 전 항목이 미끄러졌다. page-transition은 더블 탭에 같은 화면이 두 장 쌓였다. card-stack은 50장을 넘으면 배율이 음수가 됐다. zoom-lightbox와 card-expand에 포커스 가두기와 뒤로 가기 닫기를 더했다 |
| 진행·피드백 | count-up, story-progress, virtual-list, progress-ring, like-pop, celebration, cart-fly, spring-physics | count-up은 굴러가는 중 값이 바뀌면 숫자가 튀었다. story-progress는 탭이 가려졌다 돌아오면 장면이 넘어갔다. virtual-list는 항목 수가 줄면 없는 인덱스를 그렸다. like-pop은 이미 좋아요인 버튼이 마운트 때 튀었다. celebration은 닫히는 동안 버튼이 두 번 눌렸다. cart-fly는 장바구니 버튼이 없으면 담은 결과가 사라졌다. `useSpring`은 `NaN`에서 프레임이 끝없이 돌았다 |
| 내비·컨트롤·표면 | hamburger-menu, glass-nav, range-slider, file-upload, segmented-control, theme-toggle, glass-surface | hamburger-menu에 포커스 이동·가두기·복귀가 없었다. range-slider는 `step`이 범위를 나누지 못하면 눈금 밖 값을 냈다. file-upload는 진행률이 오를 때마다 미리보기가 깜빡였고 0바이트 파일이 통과했다. theme-toggle은 연타하면 `view-transition-name`이 인라인에 남았다. glass-nav는 숨은 바의 링크에 Tab이 가면 포커스가 화면 밖에 머물렀다 |

- 테스트 1,092 → 1,297개(검사 스크립트가 세는 수 1,185). 에이전트가 보고한 추가분은 54·55·52·45개다.
- 고대비(`forced-colors`) 블록, 44px 누르는 영역, `(hover: hover)` 묶음을 여러 패턴에 더했다.
- 새 공개 옵션은 모두 기본값이 예전 동작이다: `Presence`의 `appear`, `openZoom`·`useCardExpand`·`Drawer`의 `closeOnBack`, `usePageStack`의 `syncHistory`, `CountUp`의 `initialValue`, `LikeButton`의 `formatCount`, `useSpring`의 `onRest`, `RangeSlider`의 `disabled`·`onChangeEnd`, `FileDropZone`의 `onRetry`, 세그먼트·휠·길게 눌러 메뉴 항목의 `disabled`.
- 공유 코어 `createBackDismiss.ts`(원본 bottom-sheet)의 복사본이 zoom-lightbox·card-expand·hamburger-menu에 늘었다. 검사가 바이트 비교를 통과한다.
- 남아 있던 푸른 회색 기본값(`#e5e7eb` 세 곳, drag-to-reorder 손잡이 `#9aa1af` 2.6:1)을 색 토큰 사슬로 바꿨다.
- 검증: `npm run build`·`npm run lint`·`npm test`(1,297 통과)·`npm run validate`(구조·선택 평가 476/476·통합 검사 error 0, warn 0).

## 3. 주의사항

- **동작이 바뀐 것.** 패턴을 다시 복사하면 달라진다.
  - swipe-to-delete: 열린 행의 내용을 누르면 닫힌다.
  - zoom-lightbox: 백드롭이 `<div>`에서 화면 전체 `<button>`이 됐다(클래스는 그대로).
  - scroll-reveal: 옵저버의 `threshold`가 `[0, threshold]` 배열이 됐다.
  - story-progress: 시작 전의 `next()`는 마지막 장이어도 `onComplete`를 부르지 않는다.
  - useSpring: 동작 줄이기 설정에서 `to()`가 목표로 바로 간다(`respectReducedMotion: false`로 끈다).
  - file-upload: 0바이트 파일과 같은 파일 다시 고르기를 거절한다(`RejectionReason`에 `empty`·`duplicate`).
  - `flyToTarget`이 취소 함수를 돌려준다(예전에는 반환값이 없었다).
- **TDD 순서를 지키지 못한 곳.** pull-to-refresh, long-press-menu, flip-list, scroll-reveal, page-transition의 일부는 테스트와 구현을 한 번에 써서 실패를 먼저 확인하지 않았다.
- **확인하지 못한 것.** 헤드리스 Chromium에서만 봤다. iOS의 바운스·가장자리 쓸기, 실제 화면 낭독기, Safari, 실제 터치 기기의 다중 터치는 jsdom 테스트나 코드로만 확인했다. `(scripting: none)`, `lh` 미지원, `@supports not` 분기도 같다.
- **고치지 않고 넘긴 것.**
  - `@shared-core`인 `spring.ts`·`animateSpring.ts`는 `NaN`이나 감쇠 0을 가두지 않는다. 직접 쓰는 swipe-dismiss-viewer·edge-swipe-back에서 프레임이 끝없이 돌 수 있다.
  - long-press-menu와 dropdown-menu의 메뉴 배경은 흰색 고정이고 글자색은 `--color-text` 사슬이다. 어두운 테마 토큰을 쓰는 프로젝트에서는 글자가 안 보일 수 있다.
  - card-stack의 접힘은 `min-height`를 시간 0·지연으로 늦추고 `motion-audit-ignore` 주석을 달았다. 움직이는 것이 아니라 계단이라 그대로 뒀다.
  - glass-nav는 좁은 화면에서 넘친 링크를 손가락으로 넘길 수 없다. 제스처 패턴들은 `dir="rtl"`에서 방향을 뒤집지 않는다.
- **화면 비교.** 이 변경은 동작과 접근성 쪽이라 겉모습이 거의 같다. 전후 이미지는 만들지 않았다.
- **안내 문서.** `docs/guide`의 패턴 표에 새 옵션을 반영하지 않았다.
- **후속 5(남긴 한계).** 이 기록 뒤에 두 가지를 고쳤다.
  - 시트 위 시트: 시트의 `z-index`를 백드롭과 같은 값으로 뒀다. 같은 값이면 문서 순서대로 쌓여 둘째 시트의 백드롭이 첫 시트를 덮는다. 브라우저에서 첫 시트 자리의 맨 위 요소가 고치기 전 첫 시트, 고친 뒤 둘째 백드롭인 것을 확인했다. 탭 바(30)보다 위인 것은 그대로다.
  - sticky-header: 기본 배경이 어두운 바탕용이고 글자색이 없었다. 기본을 밝은 면(`--color-surface` 88%)과 `--header-color`(기본 `--color-text`)로 바꾸고, 접혔을 때의 그림자를 `--header-shadow`(기본 검정 10%)로 뺐다. 데모는 어두운 값을 변수로 준다.
  - 버전 0.19.0, 릴리스 노트 `docs/releases/v0.19.0.md`.
- **본측정(요청 6개 × 3번, 0.17 ↔ 0.19).** 블라인드 판정 19 : 17·20 : 16으로 사실상 비겼다. 설계 순서·디테일 기준이 생성 화면을 낫게 한다는 근거는 없다. 접근성 위반은 0.19가 0이었다. 진 이유(옅은 색 채움 예약 버튼, 같은 정보를 두 곳에, 회색 채움 입력칸)는 고치지 않았다(`docs/research/2026-11-10-depth.md` 9절).
- **진 이유를 고쳐 본 결과.** 세 가지 기준을 `defaults.md`에 넣고 다시 쟀으나 나아지지 않아(수업 시간표 0 : 6·0 : 6, 재고 관리 3 : 3·1 : 5) 되돌렸다. 수업 시간표의 진 판정은 모두 0.17의 요청에 없는 하단 탭 바를 들었다(`docs/research/2026-11-10-depth.md` 10절).

