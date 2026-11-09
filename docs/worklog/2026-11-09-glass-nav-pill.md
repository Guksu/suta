# glass-nav — 활성 알약을 clip-path로, 마운트 때 자라나던 움직임

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-11-09 |
| 작성 | Claude Code |
| 관련 경로 | `skills/suta/patterns/glass-nav/assets/glass-nav.css`·`navSpyCore.ts`·`createGlassNav.ts`·`PATTERN.md`, `demo/src/tests/glassNavSpy.test.ts` |

## 1. 개요

segmented-control은 thumb의 `width` 전이를 뺐다(PR #62). glass-nav의 활성 알약은 그대로 `transform`과 `width`를 전이했다. 벤치마크 측정은 이것을 레이아웃 애니메이션으로 센다. 알약은 "segmented-control의 thumb과 같은 기법"이라는 이유로 무시 주석을 달고 있었는데, 그 근거가 바뀌었다.

같은 방법(`transform`만)은 쓸 수 없다. 링크마다 폭이 달라(데모에서 62·68·70px) 이동하는 동안 폭이 어긋난다. `scaleX`로 늘리면 둥근 끝이 찌그러진다.

고치기 전 동작을 찍다가 결함을 하나 더 찾았다. 마운트할 때 알약이 왼쪽 끝에서 폭 0으로 시작해 자라났다(5 → 48 → 59 → 62px). segmented-control에서 고친 것과 같은 종류의 가짜 움직임이다.

## 2. 작업내용

- `glass-nav.css`의 `.gnav-pill`을 바꿨다.
  - 링크 줄 전체에 깐다(`inset: 0`).
  - 기본값은 `clip-path: inset(0 100% 0 0 round 999px)`(안 보임)이다.
  - `transition`은 `clip-path` 하나다.
  - 무시 주석을 지웠다. reduced-motion 블록은 그대로 `transition: none`이다.
- `navSpyCore.ts`의 `pillFrame`은 활성 링크의 좌우 끝을 `inset(0 calc(100% - 끝) 0 왼쪽 round 999px)`으로 돌려준다.
  - 오른쪽을 `calc(100% - 끝)`으로 둬서 링크 줄의 폭을 따로 재지 않는다.
  - `clip-path`는 그리기만 다시 하고 레이아웃을 돌리지 않는다. 어느 폭에서도 알약 모양이다.
- `createGlassNav.ts`의 첫 배치는 전이 없이 놓는다.
  - `transition: none`을 건 채로 `getBoundingClientRect()`로 스타일을 확정하고, 다음 프레임에 되돌린다.
  - 확정하지 않으면 rAF의 복원이 먼저 돌아 전이가 그대로 일어난다. segmented-control에서 프로덕션 번들로 확인한 것과 같은 이유다.
- `PATTERN.md`: 활성 표시 행, `pillFrame` 설명, 왜 `clip-path`인가를 적었다.
- 테스트(TDD):
  - 새로 3개, 기존 3개를 새 동작으로 고쳤다. 고치기 전에 6개가 Red였다.
  - 같은 실행에서 시간 초과로 실패한 2개는 연쇄 실패였다. 실패한 테스트가 가짜 타이머를 되돌리지 못해 생겼으므로, `afterEach`에서 실제 타이머로 되돌린다.
  - 내용: `pillFrame`의 clip-path, 첫 배치가 전이 없이 스타일을 확정, 두 번째부터는 전이를 건드리지 않음, CSS 전이가 `clip-path` 하나이고 무시 주석이 없음.
- README 2벌 배지 tests 748 → 751.

### 화면 비교

전이를 20배 늦춰 0·60·120·180·300ms를 찍었다. 위 두 줄은 마운트 직후, 아래 두 줄은 첫 링크에서 마지막 링크(Orders)로 옮길 때다. AS-IS는 main(`49e5d27`)을 따로 띄운 개발 서버 데모다.

![glass-nav 알약 전후 — 마운트(위)와 링크 이동(아래)](assets/2026-11-09-glass-nav-pill.jpg)

| 장면 | AS-IS | TO-BE |
|---|---|---|
| 마운트 0·60·120ms | 폭 5 → 48 → 59px로 자라남 | 처음부터 62px 제자리 |
| 링크 이동 0·60·120·180·300ms | `transform`·`width` 전이, 폭 62 → 68 → 70 | `clip-path` 전이, 보이는 폭 62 → 68 → 70, 같은 모양 |

- 프로덕션 빌드(`vite preview`)에서도 마운트 직후 장면이 처음부터 제자리였다.
- compact 모드에서 접혔다 펼칠 때 알약이 활성 링크 위에 놓였다. 접혔을 때는 현재 메뉴 알약만 보인다.
- reduced-motion에서는 전이가 꺼진다.
- 게이트: build·lint·test(863)·validate(구조, 선택 평가 476/476, 통합 검사 error 0·warn 0).

## 3. 주의사항

- 이 패턴을 복사한 화면은 이제 벤치마크의 "레이아웃 속성을 움직인 화면"에 잡히지 않는다. `clip-path`는 측정의 레이아웃 속성 목록에 없다.
- `clip-path` 전이는 브라우저에 따라 합성(compositor)되지 않고 매 프레임 다시 그릴 수 있다. 알약 하나 크기라 비용이 작고, 레이아웃은 돌리지 않는다.
- `control.refresh()`(글꼴 로드 뒤 다시 맞추기)는 두 번째 배치라 전이로 맞춘다. 전과 같다.
- 지난 작업 기록(`2026-09-21-glass-nav-spy.md`)의 "segmented-control과 같은 결정" 문장은 그때의 기록이라 고치지 않았다.
