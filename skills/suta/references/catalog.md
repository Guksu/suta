# 패턴 카탈로그

컴포넌트·상호작용을 만들 때 여기서 패턴을 고른다. 요청을 화면 요소로 쪼개 맞는 패턴을 모두 고르고, 고른 패턴의 `PATTERN.md`를 끝까지 읽는다. 맞는 패턴이 없으면 `SKILL.md`의 "늘 지키는 선"만으로 구현한다.

고르는 예:

- "국수집 주문 화면" → `quantity-stepper`(수량)·`bottom-sheet`(옵션)·`loading-button`(주문)·`toast-stack`(담김 알림)
- "쇼핑 앱 화면과 GNB" → `bottom-nav`(하단 탭)·`carousel`(배너)·`tab-indicator`(카테고리 탭)·`bottom-sheet`+`quantity-stepper`(구매 옵션)·`like-pop`(찜)
- "증권 사이트" → `search-suggest`(종목 검색)·`segmented-control`(지정가·시장가, 차트 기간)·`tab-indicator`(매수·매도·순위 탭)·`modal-dialog`(주문 확인)·`toast-stack`(체결 알림)
- "걷기·학습 리워드 앱" → `progress-ring`(오늘 진행)·`celebration`(목표 달성·배지 획득)·`count-up`(포인트)·`bottom-nav`(하단 탭)·`segmented-control`(순위 기간)

요청에 없는 기능을 패턴이 있다는 이유로 더하지 않는다(예: 요청에 없는 담기 애니메이션 `cart-fly`, 좋아요 `like-pop`). 요약은 각 `PATTERN.md`의 description 첫 문장이고, 아래 표는 `npm run catalog`가 만든다.

<!-- catalog:start -->
### 등장과 전환

| 패턴 | 무엇을 하나 |
|---|---|
| [`enter-exit`](../patterns/enter-exit/PATTERN.md) | React 요소의 진입/퇴장(enter/exit) 애니메이션을 구현한다. |
| [`scroll-reveal`](../patterns/scroll-reveal/PATTERN.md) | 스크롤로 뷰포트에 들어올 때 요소가 차례로 나타나는 스크롤 등장 애니메이션(scroll reveal, fade in on scroll)을 구현한다. |
| [`sticky-header`](../patterns/sticky-header/PATTERN.md) | 스크롤하면 큰 제목이 밀려 나가고 상단 고정 헤더에 작은 컴팩트 제목이 나타나는 스티키 헤더(sticky header)를 구현한다. |
| [`flip-list`](../patterns/flip-list/PATTERN.md) | 리스트 정렬·필터·추가·삭제로 순서를 바꿀 때 항목들이 순간이동하지 않고 미끄러져 자리를 잡는 FLIP 재배치 애니메이션(list reorder animation)을 구현한다. |
| [`zoom-lightbox`](../patterns/zoom-lightbox/PATTERN.md) | 썸네일을 누르면 그 요소가 화면 가운데로 커지는 라이트박스(lightbox) 확대 전환을 구현한다. |
| [`modal-dialog`](../patterns/modal-dialog/PATTERN.md) | 화면 가운데 창을 띄우고 뒤 배경을 어둡게 잠그는 모달 다이얼로그(modal dialog) 컴포넌트를 구현한다. |
| [`spring-physics`](../patterns/spring-physics/PATTERN.md) | 스프링 물리 모션 유틸(spring physics)을 구현한다. |
| [`theme-toggle`](../patterns/theme-toggle/PATTERN.md) | 다크모드 전환(dark mode toggle)을 구현한다 — 누른 지점에서 원이 퍼지며 테마가 바뀌고, 선택은 저장되며, 고르지 않았으면 기기 설정을 따른다. |
| [`card-expand`](../patterns/card-expand/PATTERN.md) | 카드가 제자리에서 자라나 상세 화면이 되는 공유 요소 전환(shared element transition)을 구현한다. |
| [`card-stack`](../patterns/card-stack/PATTERN.md) | Apple Wallet식 카드 묶음(card stack)을 구현한다. |
| [`stretchy-header`](../patterns/stretchy-header/PATTERN.md) | 상세·프로필·앨범 상단의 큰 커버 이미지 헤더(stretchy header)를 구현한다. |

### 로딩과 진행

| 패턴 | 무엇을 하나 |
|---|---|
| [`skeleton`](../patterns/skeleton/PATTERN.md) | 로딩 중 콘텐츠 자리를 잡아주는 스켈레톤 UI(skeleton loader)와 시머(반짝임) 애니메이션을 구현한다. |
| [`count-up`](../patterns/count-up/PATTERN.md) | 숫자가 목표값까지 굴러 올라가는 카운트업(count up) 애니메이션을 구현한다 — 잔액·포인트·통계 숫자에 쓴다. |
| [`story-progress`](../patterns/story-progress/PATTERN.md) | 스토리 화면 상단의 구간별 진행 막대(story progress)를 구현한다. |
| [`loading-button`](../patterns/loading-button/PATTERN.md) | 제출(submit) 버튼의 진행 상태 표시(loading button)를 구현한다. |
| [`infinite-scroll`](../patterns/infinite-scroll/PATTERN.md) | 목록 끝에 닿으면 다음 페이지를 자동으로 불러오는 무한 스크롤(infinite scroll)을 구현한다 — 미리 로드하고, 중복 호출·연쇄 로딩·실패 폭주를 막는다. |
| [`virtual-list`](../patterns/virtual-list/PATTERN.md) | 항목이 수천·수만 개여도 화면에 보이는 구간만 그리는 가상 스크롤 목록(virtual list, virtualized/windowing)을 구현한다. |
| [`progress-ring`](../patterns/progress-ring/PATTERN.md) | 원이 채워지는 원형 진행률 표시(progress ring, 애플워치 활동 링) 컴포넌트를 구현한다. |

### 피드백

| 패턴 | 무엇을 하나 |
|---|---|
| [`press-feedback`](../patterns/press-feedback/PATTERN.md) | 버튼·카드를 탭하면 살짝 쪼그라들었다(움츠러들었다) 통 하고 튕겨 돌아오는 프레스 피드백(button press 눌림 효과)을 구현한다. |
| [`toast-stack`](../patterns/toast-stack/PATTERN.md) | 화면 하단(또는 상단 배너 위치)에 토스트(toast) 알림이 쌓이고 몇 초 뒤 스스로 사라지는 시스템을 구현한다. |
| [`like-pop`](../patterns/like-pop/PATTERN.md) | 좋아요 하트가 토글 시 튀어오르고 게시물을 더블탭(double tap like)하면 큰 하트가 팡 터지는 인스타그램식 반응 애니메이션을 구현한다. |
| [`celebration`](../patterns/celebration/PATTERN.md) | 목표 달성·레벨 업·배지 획득 순간에 지금 화면 위로 뜨는 축하 오버레이(celebration)를 구현한다. |
| [`cart-fly`](../patterns/cart-fly/PATTERN.md) | 담기 버튼을 누르면 상품 이미지가 장바구니 아이콘으로 포물선을 그리며 날아가 들어가는 애니메이션(add to cart fly)을 구현한다. |
| [`tooltip`](../patterns/tooltip/PATTERN.md) | 호버·포커스 시 잠시 뒤 떠오르는 툴팁(tooltip) 말풍선을 구현한다. |
| [`form-shake-error`](../patterns/form-shake-error/PATTERN.md) | 잘못된 입력을 좌우로 흔들고(shake) 에러 메시지가 아래에서 밀려 올라오는 폼 검증 에러 피드백(form validation error)을 구현한다. |

### 내비게이션

| 패턴 | 무엇을 하나 |
|---|---|
| [`tab-indicator`](../patterns/tab-indicator/PATTERN.md) | 탭을 바꿀 때 활성 탭 밑줄(tab indicator)이 옆으로 미끄러져 따라가는 애니메이션을 구현한다. |
| [`carousel`](../patterns/carousel/PATTERN.md) | 캐러셀(carousel) 컴포넌트 — 스와이프로 옆으로 넘기면 한 장씩 딱 걸리는 스냅 슬라이더, 아래 점(도트) 내비게이션, 자동 넘김(autoplay)을 구현한다. |
| [`hamburger-menu`](../patterns/hamburger-menu/PATTERN.md) | 햄버거 버튼(≡, 삼선 아이콘)이 X로 모핑하며 옆에서 사이드 드로어가 밀려 나오는 모바일 내비게이션(hamburger menu)을 구현한다. |
| [`page-transition`](../patterns/page-transition/PATTERN.md) | 화면(라우트) 전환 애니메이션(page transition)을 구현한다 — 다음 화면이 오른쪽에서 밀려 들어오고 뒤로 가면 반대로 재생되며, 돌아오면 스크롤 위치가 복원된다. |
| [`dropdown-menu`](../patterns/dropdown-menu/PATTERN.md) | ⋯ 버튼을 누르면 열리는 액션 드롭다운 메뉴(dropdown menu, kebab)를 구현한다. |
| [`glass-nav`](../patterns/glass-nav/PATTERN.md) | 스크롤에 반응하는 유리 GNB(상단 내비게이션 바)를 구현한다. |
| [`bottom-nav`](../patterns/bottom-nav/PATTERN.md) | 모바일 앱·웹뷰의 하단 탭 바(GNB, bottom navigation bar)를 구현한다. |

### 제스처

| 패턴 | 무엇을 하나 |
|---|---|
| [`bottom-sheet`](../patterns/bottom-sheet/PATTERN.md) | 바텀시트(bottom sheet) 컴포넌트 — 아래에서 올라오는 시트를 구현한다. |
| [`pull-to-refresh`](../patterns/pull-to-refresh/PATTERN.md) | 목록·피드를 맨 위에서 아래로 당기면 새로고침하는 pull to refresh 제스처(당김 저항·스피너·복귀)를 구현한다. |
| [`swipe-to-delete`](../patterns/swipe-to-delete/PATTERN.md) | 리스트 항목을 옆으로 밀어 삭제하는 제스처(swipe to delete)를 구현한다 — 왼쪽으로 밀면 삭제 버튼이 드러나고, 끝까지 밀면 바로 삭제되며 행이 접혀 사라진다. |
| [`pinch-zoom`](../patterns/pinch-zoom/PATTERN.md) | 피드 이미지를 두 손가락으로 벌려 확대하는 핀치줌(pinch to zoom)을 구현한다. |
| [`swipe-dismiss-viewer`](../patterns/swipe-dismiss-viewer/PATTERN.md) | 전체화면 이미지 뷰어를 끌어내려 닫는 제스처(swipe to dismiss)를 구현한다. |
| [`drag-to-reorder`](../patterns/drag-to-reorder/PATTERN.md) | 목록 항목을 잡고 끌어서 순서를 바꾸는 드래그 정렬(drag and drop reorder) 리스트를 구현한다. |
| [`long-press-menu`](../patterns/long-press-menu/PATTERN.md) | 길게 누르면(long press) 항목이 살짝 떠오르고 뒤가 흐려지며 옆에 액션 메뉴가 나타나는 iOS식 미리보기 메뉴를 구현한다 — 데스크톱은 우클릭으로 열린다. |
| [`edge-swipe-back`](../patterns/edge-swipe-back/PATTERN.md) | iOS swipe back — 화면 왼쪽 가장자리를 오른쪽으로 끌어 뒤로가기 하는 인터랙티브 제스처를 구현한다. |

### 컨트롤

| 패턴 | 무엇을 하나 |
|---|---|
| [`select`](../patterns/select/PATTERN.md) | 네이티브 select를 대체하는 커스텀 셀렉트 박스(custom select, 콤보박스)를 구현한다. |
| [`accordion`](../patterns/accordion/PATTERN.md) | 아코디언(accordion) 컴포넌트 — 눌러서 펼치고 접는 목록을 구현한다. |
| [`switch`](../patterns/switch/PATTERN.md) | iOS 스타일 토글 스위치(toggle switch)를 구현한다 — 썸이 미끄러지고 트랙 색이 바뀌는 온오프 입력, 네이티브 input 기반이라 키보드·폼 연동이 된다. |
| [`floating-label`](../patterns/floating-label/PATTERN.md) | 라벨이 플레이스홀더 자리에 있다가 입력창을 누르거나 글자를 치면 위로 떠올라 작아지는 플로팅 라벨 입력 필드(floating label input)를 구현한다. |
| [`checkbox-radio`](../patterns/checkbox-radio/PATTERN.md) | 체크박스(checkbox)·라디오(radio) 버튼 컴포넌트 구현 |
| [`otp-input`](../patterns/otp-input/PATTERN.md) | 인증번호(OTP) 칸 입력을 구현한다 — 한 글자를 치면 다음 칸으로 넘어가고, 빈 칸에서 지우면 앞 칸으로 돌아가며, 복사한 코드를 붙여넣으면 칸마다 하나씩 나뉜다. |
| [`search-suggest`](../patterns/search-suggest/PATTERN.md) | 검색창 자동완성 제안 목록(search autocomplete, suggest)을 구현한다. |
| [`range-slider`](../patterns/range-slider/PATTERN.md) | 두 손잡이로 최소·최대 구간을 고르는 범위 슬라이더(range slider, 가격·기간 필터) 컴포넌트를 구현한다. |
| [`quantity-stepper`](../patterns/quantity-stepper/PATTERN.md) | 수량 조절 스테퍼(quantity stepper, − / + 버튼) 컴포넌트를 구현한다. |
| [`file-upload`](../patterns/file-upload/PATTERN.md) | 파일 끌어다 놓기 업로드(file upload, drop zone) 영역을 구현한다. |
| [`segmented-control`](../patterns/segmented-control/PATTERN.md) | iOS 스타일 세그먼트 컨트롤(segmented control) 컴포넌트를 구현한다. |
| [`wheel-picker`](../patterns/wheel-picker/PATTERN.md) | iOS 드럼 휠 피커(wheel picker)를 구현한다. |

### 표면과 스타일

| 패턴 | 무엇을 하나 |
|---|---|
| [`glass-surface`](../patterns/glass-surface/PATTERN.md) | 뒤 배경이 흐릿하게 비치는 반투명 유리판 글라스모피즘(glassmorphism) 카드·헤더·내비게이션 바를 구현한다. |

### 원칙과 검토

| 패턴 | 무엇을 하나 |
|---|---|
| [`motion-principles`](../patterns/motion-principles/PATTERN.md) | 앱 전체의 애니메이션 시간·이징·스태거·reduced-motion 기준을 한 벌의 토큰(motion tokens)으로 정하고, 어떤 움직임에 어느 값을 쓰는지 고르는 원칙을 제공한다. |
| [`motion-audit`](../patterns/motion-audit/PATTERN.md) | 프로젝트의 CSS·JS를 훑어 애니메이션 문제(크기·위치 속성 transition, transition: all, reduced-motion 누락, 시간 범위 밖, 이동에 linear, 퇴장에 ease-in, 무한 반복, setInterval 애니메이션)를 file:line으로 찾아 고치는 방법까지 알려주는 검사 도구(motion audit)다. |
| [`layout-principles`](../patterns/layout-principles/PATTERN.md) | 화면의 순서·위계·묶음·정렬·강조를 정하는 레이아웃 원칙 12개, 화면 유형별 관례 23종(홈·목록·필터·채팅·알림·프로필·폼·글쓰기·설정·대시보드·쇼핑·은행·증권), 간격·글자·색·반경 토큰(layout tokens)·선 아이콘·사진 대역 그림을 제공한다. |
| [`layout-audit`](../patterns/layout-audit/PATTERN.md) | CSS·JSX·HTML에서 AI가 흔히 만드는 레이아웃 문제를 file:line으로 찾는 정적 검사 도구(layout audit)다. |
<!-- catalog:end -->
