# 움직임 종류 → 토큰 → 담당 패턴 대응표

`PATTERN.md`의 원칙 표를 suta 패턴들에 실제로 어떻게 연결했는지 적는다. 왼쪽 열의 요청이 오면 오른쪽 패턴을 쓴다.
패턴 CSS의 기본값이 가운데 토큰을 거치므로(`var(--sheet-duration, var(--motion-duration-slow, 350ms))`) 토큰 파일을 넣으면 따라온다.
"토큰 밖"은 토큰 단계와 다른 기본값이다 — 패턴 CSS에 이유가 주석으로 있고, 토큰을 바꿔도 따라오지 않는다. 맞추려면 그 패턴의 공개 변수에 토큰을 준다.

## 목차

- 등장·퇴장
- 화면 크기의 이동과 전환
- 제자리 이동·재배치
- 상태 피드백
- 진행·로딩
- 제스처 뒤 복귀(스프링)

## 등장·퇴장

| 요청 | 토큰(시간 / 이징) | 패턴 | 공개 변수 |
|---|---|---|---|
| 요소가 나타나고 사라짐 | 토큰 밖 300ms / out (퇴장 ×0.75) | enter-exit | `--fx-duration`, `--fx-ease` |
| 툴팁·말풍선 | fast / out | tooltip | `--tooltip-duration` |
| 토스트·상단 배너 | 토큰 밖 300ms / out | toast-stack | `--toast-duration` |
| 스크롤에 따라 차례로 등장 | page / out + stagger(10개까지) | scroll-reveal | `--reveal-duration` |
| 길게 눌러 메뉴 | base / out | long-press-menu | `--lpm-duration` |
| 축하 오버레이 | 패널 slow·닫힘 base / out, 그림 튀기 480ms·조각 900ms는 토큰 밖 | celebration | (CSS) |

## 화면 크기의 이동과 전환

| 요청 | 토큰 | 패턴 | 공개 변수 |
|---|---|---|---|
| 바텀시트 | slow / drawer | bottom-sheet | `--sheet-duration` |
| 모달 | base / out — 제자리에서 커지며 뜬다(이동 거리가 짧다) | modal-dialog | `--modal-duration` |
| 햄버거 패널 | 토큰 밖 300ms / drawer | hamburger-menu | `--drawer-duration`, `--hamburger-duration` |
| 페이지 전환 | base / out — page가 아니다. 전환 중 포인터 입력이 잠겨, 길수록 "느린 앱"이 된다 | page-transition | `--page-transition-duration` |
| 카드 → 상세 확장 | page / drawer | card-expand | `--card-expand-duration` |
| 라이트박스 확대 | slow(코어 옵션 `durationMs` 350) / out, 백드롭 토큰 밖 300ms | zoom-lightbox | (코어 옵션) |
| 테마 전환(원 확산) | page / out | theme-toggle | (패턴 내부 고정, 필요 시 CSS 덮어쓰기) |

## 제자리 이동·재배치

| 요청 | 토큰 | 패턴 | 공개 변수 |
|---|---|---|---|
| 탭 밑줄 이동 | base / out | tab-indicator | `--tab-indicator-duration` |
| 세그먼트 알약 이동 | 토큰 밖 200ms / out | segmented-control | `--segment-duration` |
| 목록 재배치(FLIP) | 거리 기준 / in-out | flip-list | (훅 옵션 `durationMs`) |
| 카드 묶음 펼침 | page / drawer + stagger(8장까지) | card-stack | `--stack-duration` |
| 아코디언 펼침 | 토큰 밖 300ms / out | accordion | `--accordion-duration` |
| 하단 탭 바·유리 머리 숨김 | base / out | bottom-nav, glass-nav | `--bottom-nav-duration`, `--gnav-duration` |
| 고정 머리 작은 제목 | base / out | sticky-header | `--header-duration` |
| 밀어서 삭제 정착·접힘 | base / out | swipe-to-delete | `--swipe-duration` |
| 캐러셀 스냅 | 브라우저 스냅(시간 없음) | carousel | — |

## 상태 피드백

| 요청 | 토큰 | 패턴 | 공개 변수 |
|---|---|---|---|
| 버튼 눌림 | press 60ms → release 220ms / out, 배율 0.96 | press-feedback | `--press-release`, `--press-scale` |
| 좋아요 팝 | 토큰 밖 400ms / overshoot | like-pop | `--like-pop-duration` |
| 체크·라디오 | 토큰 밖 200ms / out·overshoot(라디오 점) | checkbox-radio | `--check-duration` |
| 토글 스위치 | 토큰 밖 200ms / out | switch | `--switch-duration` |
| 드롭다운 메뉴·자동완성 | fast / out | dropdown-menu, search-suggest | `--menu-duration`, `--suggest-duration` |
| 셀렉트 펼침 | 토큰 밖 200ms / out | select | `--select-duration` |
| 수량 숫자 밀림 | fast / out | quantity-stepper | (CSS) |
| 폼 오류 흔들림 | 토큰 밖 400ms / (패턴 고유 shake 곡선) | form-shake-error | `--shake-duration` |
| 장바구니로 날아감 | slow / in-out | cart-fly | (패턴 옵션 `durationMs`) |

## 진행·로딩

| 요청 | 토큰 | 패턴 | 공개 변수 |
|---|---|---|---|
| 숫자 카운트업 | 600~800ms / out | count-up | (옵션 `durationMs`) |
| 진행 링 | 토큰 밖 600ms / out | progress-ring | `--ring-duration` |
| 스켈레톤 시머 | 1.4s / linear(반복) | skeleton | `--skeleton-speed` |
| 스토리 진행 | 내용 길이 / linear | story-progress | (옵션 `durationMs`) |
| 로딩 버튼 | 토큰 밖 200ms / out, 눌림은 press·release | loading-button | `--loading-button-duration` |

## 제스처 뒤 복귀(스프링)

시간·이징 대신 스프링 설정(`SPRING` 프리셋)을 쓴다. 옆에서 같이 움직이는 백드롭 페이드는 `springDuration`으로 길이를 맞춘다.

| 요청 | 프리셋 | 패턴 |
|---|---|---|
| 드래그 놓으면 제자리 | settle (170/26) | spring-physics |
| 뷰어 끌어내려 닫기 | settle | swipe-dismiss-viewer |
| 가장자리 스와이프 뒤로가기 | critical (거의 임계, 300/34) | edge-swipe-back |
| 당겨서 새로고침 복귀 | CSS `--ptr-duration` 토큰 밖 300ms / out | pull-to-refresh |
