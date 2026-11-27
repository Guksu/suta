---
name: screen-kit
description: 목록·예약·상세·설정·대시보드 화면의 바탕 부품 한 벌(screen kit)을 구현한다. 쪽 머리 큰 제목·상자 없는 상품 칸·사진 틀·날짜 띠·시간 칸·입력칸 묶음·사진 머리·옵션 구역·하단 고정 바·프로필 줄·폭 가득한 설정 행·답 머리·지표 줄·상자 없는 표다. "메뉴 목록, 예약 페이지, 메뉴 상세 화면, 알림 켜고 끄는 설정 페이지, 매출 대시보드 만들어줘, product detail page" 요청을 디자인 기준 없이 새로 지을 때 먼저 복사해 그 위에 짓는다.
---

# screen-kit — 화면 바탕 부품 한 벌

라이브 데모: https://guksu.github.io/suta/#/screen-kit

## 언제 쓰는가

디자인 기준(토큰·컴포넌트·브랜드 가이드·일관된 기존 화면)이 없는 프로젝트에서 목록·예약·폼·상세·설정·대시보드 화면을 **새로** 만들 때, 화면의 일에 맞는 부품을 먼저 복사하고 그 위에 짓는다. 이 부품들은 suta 우선순위의 맨 끝(suta 기본값)이다.

- 사용자가 카드·그림자·모서리·색을 정했으면 요청을 따른다. 부품의 공개 변수로 맞추거나, 그 부분만 쓰지 않는다.
- 프로젝트에 디자인 체계가 있으면 그 컴포넌트를 쓴다. 이 패턴의 값으로 바꾸지 않는다.

왜 글이 아니라 코드인가. 상 받은 서비스 화면 46쪽(국내 18곳·해외 13곳)과 suta가 만든 화면을 같은 방법으로 쟀더니, 차이는 간격·본문 크기가 아니라 네 곳에 있었다.

| 차이 | 상 받은 화면 | 기준 없이 만든 화면 | 이 패턴의 부품 |
|---|---|---|---|
| 사진 | 첫 화면의 56~68%(중앙값)가 사진·그림, 사진 모서리 0 | 0% — 회색 칸 + 사진 아이콘 | 사진 틀, 사진이 없으면 콘텐츠 그림 |
| 위계 | 가장 큰 글자 ÷ 본문이 국내 1.73(모바일)·2.5(데스크톱) | 1.07~2.0, 목록에 쪽 제목이 없다 | 쪽 머리 28/40 |
| 상자 | 카드 테두리·그림자 중앙값 0개, 사진이 곧 칸 | 그림자 카드 격자, 예약 폼의 테두리 상자 37개 | 상자 없는 상품 칸, 채움 칩, 입력칸 묶음 |
| 글꼴 | 31곳 중 30곳이 글꼴 파일을 불러왔다 | 0곳 — 기기마다 다른 글꼴, 숫자와 한글이 섞인다 | 아래 "글꼴 불러오기" |

같은 기준을 글(관례 문서)로도 적어 두었지만 시험 실행 2번 중 0번이 그 문서를 읽었다. 그래서 값을 복사해 쓰는 CSS로 준다.

**기술 선택:** CSS가 모양을 모두 맡는다(막대 줄의 높이도 CSS 변수 하나로 넘긴다 — 차트 라이브러리가 아니다). 넓은 화면 값은 화면 폭이 아니라 **화면 틀(`.kit-screen`)의 폭**으로 바뀐다(컨테이너 쿼리). 미리보기 틀·사이드바 옆처럼 창보다 좁은 자리에서도 모바일 값이 맞게 나온다. TypeScript는 시간 칸의 구간 고르기(`slotRange.ts`, 의존성 0)와 막대 높이 비율(`barShare`)만 한다. 사이에 예약된 칸이 끼면 구간이 끊기는 판정이 화면 코드에 흩어지면 겹친 예약이 생긴다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/screen-kit.css` | 바탕 — 화면 틀(컨테이너)·쪽 머리·탭 줄·버튼·사진 틀·상단 바·구역 띠·앱 화면 열·낭독 전용 글자 | 모든 화면 |
| `assets/screen-kit-list.css` | 목록 — 목록 머리(개수·정렬)·상품 격자·상품 칸(할인·정가·품절·담기) | 목록 화면 |
| `assets/screen-kit-form.css` | 예약·입력 — 본문 + 요약 두 열·구역 머리·사진 카드·날짜 띠·시간 칸·입력칸 묶음·요약 패널 | 예약·폼 화면 |
| `assets/screen-kit-detail.css` | 상세 — 사진 머리·이름 묶음·옵션 구역·하나 고르는 칸·체크 행·수량 줄·하단 고정 바 | 상세 화면 |
| `assets/screen-kit-settings.css` | 설정 — 프로필 줄·묶음 이름·폭 가득한 행(현재 값 + 꺾쇠, 스위치 자리)·묶음 아래 안내·글자 링크 | 설정 화면 |
| `assets/screen-kit-dashboard.css` | 대시보드 — 답 머리·기간·지표 줄·두 열 판·구역 머리·막대 줄·상자 없는 표·상태 표시·순위 목록 | 대시보드 화면 |
| `assets/slotRange.ts` | 코어 — `timeSlots`·`pickSlotRange`·`inSlotRange`·`slotRangeTime` | 시간 칸이 있으면 |
| `assets/ScreenKit.tsx` | React 래퍼 — `PageHead`·`PhotoFrame`·`ProductCell`·`FieldGroup`·`Field`·`SummaryPanel`. 바탕·목록·예약 CSS를 불러온다 | React 프로젝트만 |
| `assets/ScreenKitDetail.tsx` | React 래퍼 — `OptionSection`·`PickGroup`·`CheckList`·`ActionBar`. 바탕·상세 CSS를 불러온다 | 상세 화면(React) |
| `assets/ScreenKitSettings.tsx` | React 래퍼 — `ProfileRow`·`SettingsGroup`·`SettingsRow`. 바탕·설정 CSS를 불러온다 | 설정 화면(React) |
| `assets/ScreenKitDashboard.tsx` | React 래퍼 — `AnswerHead`·`Periods`·`Metrics`·`BarChart`(+ 막대 높이 `barShare`). 바탕·대시보드 CSS를 불러온다 | 대시보드 화면(React) |

화면 유형마다 CSS 파일 하나다. 바탕(`screen-kit.css`)에 그 화면의 파일만 더해 복사한다. 상세의 사진 머리·대시보드의 순위 사진을 React로 그리면 `ScreenKit.tsx`의 `PhotoFrame`을 쓴다 — 그 파일도 복사하고, 목록·예약 CSS가 없으면 그 두 import 줄을 지운다.

스위치는 `switch`, 수량 스테퍼는 `quantity-stepper` 패턴의 파일이다 — 이 패턴은 그 둘을 놓는 자리만 정한다. 사진이 없을 때의 그림은 `layout-principles` 패턴의 파일이다. 경로로 가져와 함께 복사한다(import로 엮지 않는다).

- `patterns/layout-principles/assets/content-art.css` — 장면(`art--dish`·`art--bowl`·`art--room` 등)과 색 한 벌(`art--sand`·`art--clay`·`art--sage`·`art--sky`·`art--rose`·`art--slate`).
- `patterns/layout-principles/assets/illustrations.ts`(React는 `Illustration.tsx`) — 접시 위에 올릴 음식·물건 그림.
- 값의 토큰은 `patterns/layout-principles/assets/layout-tokens.css`다. 없어도 숫자 기본값으로 그려진다.

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js·.jsx로 저장한다 — 로직은 그대로다.

## 부품과 값

| 부품 | 클래스 | 값과 근거 |
|---|---|---|
| 화면 틀 | `.kit-screen` | 화면의 가장 바깥 요소(main)에 하나. 이름 있는 컨테이너 `kit`다. 없으면 부품이 모바일 값 그대로다 |
| 쪽 머리 | `.kit-head` · `-title` · `-sub` | 제목 모바일 28/700, 화면 틀 768px 이상 40/700. 행간 1.3, 자간 −2%, `text-wrap: balance`. 보조 한 줄 14(넓으면 16) 보조 글자색. 본문 16의 1.75배·2.5배다(국내 수상작 1.73·2.5). 쪽마다 하나 |
| 탭 줄 | `.kit-tabs` · `.kit-tab` | 글자 탭 15, 현재 칸은 600 + 2px 밑줄(주 글자색), 칸 높이 44, 가로로 넘긴다. 모양만 — 밑줄이 미끄러지는 움직임은 `tab-indicator` |
| 목록 머리 | `.kit-list-head` · `-count` · `-sort` | 왼쪽 "메뉴 6"(숫자만 주 글자색), 오른쪽 정렬 글자 버튼. 14 |
| 상품 격자 | `.kit-grid` | 모바일 2열(가로 12·세로 28), 화면 틀 600px 3열, 900px 4열(가로 24·세로 40). 세로 간격이 가로의 2배 이상이라 글이 위 사진에 붙어 읽힌다 |
| 상품 칸 | `.kit-cell` · `-media` · `-name` · `-price` · `-discount` · `-original` · `-note` · `-add` · `-flag` · `-soldout` · `-link` | 테두리·그림자·바탕 없음. 사진 → 이름 15/400 두 줄 말줄임 → 가격 16/700 주 글자색(할인율만 `--color-danger`, 정가 12 옅은 글자 취소선) → 보조 줄 12. 담기는 사진 오른쪽 아래 36 원(누르는 영역 44). 품절은 사진 흐리게 + "품절" 표시 + 옅은 글자(흰 면 5.6:1) |
| 사진 틀 | `.kit-frame` | `aspect-ratio`(기본 1) + `object-fit: cover` + 옅은 무채색 바탕 + 모서리 0. 사진이 없으면 같은 요소에 `art art--{장면} art--{색}` |
| 버튼 | `.kit-button` · `.kit-button-outline` | 높이 48, 16/600, 모서리 `--radius-control`. 채운 버튼은 주 행동 하나. 잠기면 회색 면 |
| 본문 + 요약 | `.kit-split` | 좁으면 한 열, 화면 틀 960px 이상이면 본문 \| 340 패널(간격 72), 패널은 `position: sticky` |
| 구역 | `.kit-section` · `-head` · `-title` · `-hint` | 구역 사이는 1px 선 + 위아래 32. 구역 제목 20/700, 고르는 법 한 줄 14 |
| 사진 카드 | `.kit-choices` · `.kit-choice` · `-input` · `-name` · `-mark` · `-meta` | 숨긴 라디오 + 사진 틀(모서리 8) + 이름 + 보조 줄. 고른 것은 사진 둘레 강조색 2px 윤곽선(간격 3) + "선택됨" 글자 |
| 날짜 띠 | `.kit-days` · `.kit-day` · `-week` · `-date` | 7칸 같은 폭. 요일 12 옅은 글자 + 숫자 20/600. 고른 날은 강조색 원 44(좁으면 칸에 맞춰 줄어든다). 쉬는 날은 옅은 글자 + 줄 |
| 시간 칸 | `.kit-slot-band` · `.kit-slot-label` · `.kit-slots` · `.kit-slot` | 구간 라벨(오전·오후) + 격자 4열(화면 틀 480px 이상 6열, 라벨은 왼쪽 열). 칸 높이 44, 옅은 회색 채움. 고른 칸은 강조색 채움 + 600, 고를 수 없는 칸은 채움 없이 옅은 글자 + 줄 + `disabled` |
| 입력칸 묶음 | `.kit-fields` · `.kit-field` · `-label` · `-input` · `-message` | 칸 여러 개를 한 면(둘레 1px, 모서리 8)에 쌓고 칸 사이 1px 선. 좁으면 라벨 위(칸 높이 64), 화면 틀 480px 이상 라벨 왼쪽 120 열(칸 높이 56). 입력 글자 16 |
| 요약 패널 | `.kit-summary` · `-title` · `-answer` · `-sub` · `-rows` · `-total` · `-note` | 테두리 없는 옅은 바탕 면(모서리 12). 답(날짜·시간) 24/700, 항목별 내역, 합계 32/700, 버튼 52 폭 가득 |

입력칸 묶음과 요약 패널은 근거가 약하다. 상 받은 공개 화면에서 폼은 1쪽(의사 찾기 폼 — 입력칸 셋을 한 면에 쌓고 1px 선으로 나눔, 칸 높이 64)뿐이었고, 나머지 값은 사용자가 승인한 초안에서 왔다. 프로젝트에 입력칸 모양이 있으면 그것을 쓴다.

### 상세 — `screen-kit-detail.css`

| 부품 | 클래스 | 값과 근거 |
|---|---|---|
| 사진 머리 | `.kit-hero` · `-bar` · `-actions` · `-button` · `-count` | 화면 폭 가득 `.kit-frame`(비율 1, `--kit-hero-ratio`). 위에 뜬 원 버튼 44(흰 92% + 가장 낮은 그림자 — 밝은 사진 위에서도 보인다), 위 여백에 `env(safe-area-inset-top)`. 사진 장수는 오른쪽 아래 어두운 알약 12(흰 글자 4.5:1 이상) |
| 이름 묶음 | `.kit-info` · `-name` · `-price` · `-desc` · `-meta` | 이름 26/700(화면의 큰 제목, 자간 −2%) → 가격 22/700 바로 아래(설명 뒤로 밀지 않는다) → 설명 16 보조 글자색 → 한 줄 메타 14 옅은 글자(숫자만 주 글자색 굵게) |
| 구역 띠 | `.kit-band`(바탕 파일) | 8px 옅은 바탕 — 이름 묶음과 옵션 사이 같은 큰 구역 사이 |
| 옵션 구역 | `.kit-option` · `-head` · `-title` · `-hint` | 위아래 24, 구역 사이 1px 선. 제목 17/700 + 오른쪽 "하나 선택"·"여러 개 선택" 14 옅은 글자. 상자로 감싸지 않는다 |
| 하나 고르는 칸 | `.kit-picks` · `.kit-pick` · `-input` · `-face` · `-extra` | 숨긴 네이티브 라디오(화살표 키·폼 제출은 브라우저). 칸 높이 48, 회색 채움. 고른 칸은 주 글자색 채움 + 600 — 강조색이 아니라 주 글자색이라 브랜드색과 겹치지 않는다(`--kit-pick-on`). 2열(`--kit-pick-columns`) |
| 체크 행 | `.kit-checks` · `.kit-check` · `-input` · `-box` · `-name` · `-price` | 행 전체가 라벨인 실제 `input[type=checkbox]` + 그린 상자 22(테두리 흰 면 3.45:1) + 이름 16 + 오른쪽 추가 금액 16 보조색. 행 높이 52, 행 사이 1px 선 |
| 수량 줄 | `.kit-qty` | 왼쪽 제목, 오른쪽 끝 스테퍼. 자리만 — 스테퍼는 `quantity-stepper`(터치 화면이면 `--qty-height: 2.75rem`) |
| 하단 고정 바 | `.kit-actionbar` · `-total` · `-space` | 버튼 하나(52)에 행동 이름 왼쪽 + 합계 오른쪽. 기본 `position: sticky` — 화면의 맨 끝 요소로 두면 스크롤하는 동안 아래에 붙고, 끝에서는 마지막 내용 아래 제자리로 와서 가리지 않는다. 아래 여백에 `env(safe-area-inset-bottom)`. 창에 고정하려면 `data-fixed` + 본문 끝 `.kit-actionbar-space`(바 높이 77 + 안전 영역) |

### 설정 — `screen-kit-settings.css`

| 부품 | 클래스 | 값과 근거 |
|---|---|---|
| 상단 바 | `.kit-topbar` · `.kit-icon-button`(바탕 파일) | 높이 52, 아이콘 버튼 44. 글리프가 본문 왼쪽 선에 맞게 바 여백을 10 줄인다. 바로 아래 쪽 머리는 위 여백 4 |
| 프로필 줄 | `.kit-profile` · `-avatar` · `-text` · `-name` · `-sub` · `.kit-chevron` | 이름 첫 글자 원 56(옅은 바탕, 20/700) + 이름 17/700 + 보조 14 + 꺾쇠. 행 전체가 링크. 상자를 씌우지 않는다 |
| 묶음 | `.kit-group` · `-label` · `-note` | 묶음 이름 13/600 옅은 글자(위 24), 묶음 아래 안내 13 옅은 글자. 묶음 사이 `.kit-band` 8 |
| 행 | `.kit-rows` · `.kit-row` · `-link` · `-label` · `-value` · `-desc` | 화면 폭 가득(누르는 영역도), 높이 56(`--kit-row-height`). 1px 선은 글자 시작선부터. 라벨 16, 현재 값 15 보조색 + 꺾쇠(흰 면 3.45:1). 설명 줄은 결과가 낯선 행에만 |
| 스위치 행 | `.switch.kit-row-switch` | `switch` 패턴의 `label.switch`가 행 전체가 된다 — 라벨 글자 왼쪽, 트랙 오른쪽 끝(보이는 순서만 뒤집는다). 행 어디를 눌러도 켜지고, 접근 이름은 보이는 라벨이다 |
| 글자 링크 | `.kit-text-links` · `.kit-text-link` · `-danger` | 맨 아래. 로그아웃 15 보조 글자색, 탈퇴 `--color-danger`. 누르는 높이 44 |
| 앱 화면 열 | `.kit-column`(바탕 파일) | 좁으면 아무것도 하지 않는다. 화면 틀 768px 이상이면 옅은 바탕 가운데 흰 열(560, 위아래 48 띄움, 모서리 `--radius-card`). 안쪽 부품은 열 폭을 보므로 모바일 값 그대로 — 상세에도 쓴다 |

### 대시보드 — `screen-kit-dashboard.css`

| 부품 | 클래스 | 값과 근거 |
|---|---|---|
| 답 머리 | `.kit-answer` · `-main` · `-label` · `-value` · `-compare` | 라벨 16/600 보조색(화면의 제목) → 큰 수치 56/700, 자간 −3%, 화면 틀 폭의 11%로 36~56(320 폭에서 아홉 자리 금액이 한 줄) → 비교 한 줄 16(무엇과 비교했는지 + 부호 붙은 차이만 굵게) |
| 기간 | `.kit-periods` · `.kit-period` | 알약 글자 버튼 36(누르는 영역 44), `aria-pressed`. 고른 것은 옅은 바탕 + 600 |
| 지표 줄 | `.kit-metrics` · `.kit-metric` · `-value` · `-sub` | 카드가 아니라 위아래 1px 선 + 칸 사이 세로 선(격자 바탕 + 1px 간격). 라벨 14 · 값 24/700 · 보조 12. 좁으면 2열, 600px 이상 한 줄. 첫 열은 왼쪽 여백 0 |
| 두 열 판 | `.kit-board` · `.kit-board-full` | 좁으면 한 열, 960px 이상 본문 \| 320(간격 72). 긴 구역(표)은 `.kit-board-full`로 두 열에 걸친다 |
| 구역 머리 | `.kit-block-head` · `-title` · `-aside` | 제목 20/700 + 오른쪽 보조 14(단위·전체 보기) |
| 막대 줄 | `.kit-chart` · `-col` · `-bar` · `-value` · `-label` | 무채색 막대 + 강조할 하나만 주 글자색(`data-emphasis`). 값은 막대 위 12, 축 12, 단위는 구역 머리에. `role="img"` + 값을 말하는 `aria-label`. 높이는 칸마다 `--kit-chart-value`(0~1). 값 없는 칸은 `data-empty` |
| 표 | `.kit-table` · `-name` · `-key` · `-num` · `-sub` | 상자 없음. 머리 12 옅은 글자, 행 1px 선, 숫자 오른쪽 정렬 `tabular-nums`. 화면 틀 600px 미만이면 행마다 "이름 + 핵심 값 / 나머지 한 줄" 목록(머리 행은 낭독 전용) — 열을 빼지 않는다 |
| 상태 | `.kit-status` · `[data-attention]` | 글자 12 보조색. 손봐야 할 것만 점(오류 빨강) + 600 주 글자색 — 색만으로 알리지 않는다 |
| 순위 목록 | `.kit-ranks` · `.kit-rank` · `-text` · `-name` · `-sub` · `-value` | 사진 56(`.kit-frame`) + 이름 16 · 보조 12 + 값 600 |

**근거가 약한 것.** 상세의 옵션·하단 바, 설정, 대시보드는 상 받은 화면 조사(공개 화면 46쪽)에서 보지 못했다 — 상세의 옵션 단계와 설정·대시보드는 로그인 뒤나 주문 흐름 안에 있다. 값은 목록·예약에서 통한 원칙(큰 제목 하나, 상자 대신 선과 여백, 사진이 색을 맡는다)을 옮긴 것이고, 사용자가 초안을 눈으로 승인했다. 설정은 레퍼런스 앱 30곳 161장을 잰 관례(`patterns/layout-principles/references/screen-conventions.md` "설정·마이")와 같은 모양이다. 관례와 다르게 따른 곳은 아래 "관례와 다른 곳"에 있다.

## 사용 방법 — React

목록 화면. 사진이 있으면 `src`, 없으면 `art`(+ 그림)를 준다.

```tsx
import { PageHead, PhotoFrame, ProductCell } from './ScreenKit'
import { Illustration } from './Illustration' // layout-principles — content-art.css도 함께 불러온다

const MenuScreen = ({ items, onAdd }) => (
  <main className="kit-screen">
    <PageHead title="오늘의 국수" sub="성수점 · 주문하면 15분 뒤 픽업" />
    <nav className="kit-tabs" aria-label="메뉴 분류">
      <a className="kit-tab" href="#all" aria-current="page">전체</a>
      <a className="kit-tab" href="#noodle">국수</a>
      <a className="kit-tab" href="#mandu">만두</a>
    </nav>
    <div className="kit-list-head">
      <p className="kit-list-count">메뉴 <b>{items.length}</b></p>
      <button type="button" className="kit-list-sort">인기순</button>
    </div>
    <ul className="kit-grid">
      {items.map((item) => (
        <ProductCell
          key={item.id}
          name={item.name}
          price={item.priceText}
          note={item.note}
          soldOut={item.soldOut}
          onAdd={() => onAdd(item.id)}
          media={
            item.photo ? (
              <PhotoFrame src={item.photo} alt="" />
            ) : (
              <PhotoFrame art={{ scene: 'dish', tone: item.tone }} alt="">
                <Illustration name="steaming-bowl" />
              </PhotoFrame>
            )
          }
        />
      ))}
    </ul>
  </main>
)
```

예약 화면. 시간 칸은 코어로 구간을 고르고, 칸은 클래스로 그린다.

```tsx
import { useState } from 'react'
import { Field, FieldGroup, PageHead, SummaryPanel } from './ScreenKit'
import { inSlotRange, pickSlotRange, slotRangeTime, timeSlots, type SlotRange } from './slotRange'

const SLOTS = timeSlots({ from: '09:00', to: '12:00' })
const BOOKED = new Set([2, 3]) // 10:00·10:30

const BookingScreen = () => {
  const [range, setRange] = useState<SlotRange>(null)
  const time = slotRangeTime({ slots: SLOTS, range })
  return (
    <main className="kit-screen">
      <PageHead title="회의실 예약" sub="오늘부터 7일 안에서 30분 단위로 예약할 수 있어요." />
      <div className="kit-split">
        <div>
          <section className="kit-section" aria-labelledby="time-title">
            <div className="kit-section-head">
              <h2 id="time-title" className="kit-section-title">시간</h2>
              <p className="kit-section-hint">시작 칸과 끝 칸을 차례로 눌러 주세요</p>
            </div>
            <div className="kit-slot-band">
              <p className="kit-slot-label">오전</p>
              <ul className="kit-slots">
                {SLOTS.map((slot, index) => (
                  <li key={slot}>
                    <button
                      type="button"
                      className="kit-slot"
                      disabled={BOOKED.has(index)}
                      aria-label={BOOKED.has(index) ? `${slot} 예약됨` : undefined}
                      aria-pressed={BOOKED.has(index) ? undefined : inSlotRange({ range, index })}
                      onClick={() => setRange(pickSlotRange({ range, index, blocked: BOOKED }))}
                    >
                      {slot}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="kit-section" aria-labelledby="who-title">
            <div className="kit-section-head">
              <h2 id="who-title" className="kit-section-title">예약자</h2>
            </div>
            <FieldGroup labelledBy="who-title">
              <Field label="이름" autoComplete="name" />
              <Field label="연락처" inputMode="tel" autoComplete="tel" placeholder="010-0000-0000" />
            </FieldGroup>
          </section>
        </div>
        <SummaryPanel
          title="예약 요약"
          answer={time && `${time.from} – ${time.to}`}
          placeholder="시간을 골라 주세요"
          totalLabel="합계"
          total={time ? `${(time.minutes / 60) * 15000}원` : '0원'}
          action={<button type="submit" className="kit-button" disabled={!time}>예약하기</button>}
        />
      </div>
    </main>
  )
}
```

## 사용 방법 — 순수 HTML·JS (React 없음)

바탕 `screen-kit.css`에 그 화면의 CSS 하나(목록 `-list`, 예약 `-form`, 상세 `-detail`, 설정 `-settings`, 대시보드 `-dashboard`)와 `content-art.css`를 불러오고 마크업만 맞춘다.

```html
<main class="kit-screen">
  <div class="kit-head">
    <h1 class="kit-head-title">오늘 구운 빵</h1>
    <p class="kit-head-sub">성수점 · 주문하면 10분 뒤 픽업</p>
  </div>
  <ul class="kit-grid">
    <li class="kit-cell">
      <div class="kit-cell-media">
        <div class="kit-frame art art--dish art--sand" aria-hidden="true"><!-- illustrations.ts의 bread SVG --></div>
        <button type="button" class="kit-cell-add" aria-label="소금빵 담기"><!-- 더하기 아이콘 --></button>
      </div>
      <p class="kit-cell-name">소금빵</p>
      <p class="kit-cell-price"><span>3,500원</span></p>
      <p class="kit-cell-note">오전 11시에 나와요</p>
    </li>
  </ul>
</main>
```

사진 카드(장소·상품을 사진으로 고르기) — 라디오를 숨겨 두어 화살표 키와 폼 제출은 브라우저가 한다.

```html
<fieldset class="kit-choices">
  <legend class="kit-sr">회의실</legend>
  <label class="kit-choice">
    <input class="kit-choice-input" type="radio" name="room" value="small" checked />
    <span class="kit-frame art art--room art--sand" style="--kit-frame-ratio: 4 / 3" aria-hidden="true"></span>
    <span class="kit-choice-name">작은방 <span class="kit-choice-mark" aria-hidden="true">선택됨</span></span>
    <span class="kit-choice-meta">4인 · 시간당 15,000원</span>
  </label>
</fieldset>
```

시간 칸은 `slotRange.ts`의 `pickSlotRange`를 눌릴 때마다 불러 구간을 바꾸고, 각 칸의 `aria-pressed`를 `inSlotRange`로 다시 쓴다. 날짜 띠는 `<button class="kit-day" aria-pressed="true|false">`에 `<span class="kit-day-week">`·`<span class="kit-day-date">`를 넣는다. 월·요일 전체 이름이 필요하면 `aria-label`로 보이는 글자를 덮지 말고 `<span class="kit-sr">11월</span>`처럼 낭독 전용 글자를 덧붙인다 — 보이는 "토 28"과 다른 접근 이름("11월 28일 토요일")은 음성 명령으로 누를 수 없다(axe `label-content-name-mismatch`, 0.21 시험 실행에서 7곳).

## 사용 방법 — 상세·설정·대시보드 (React)

메뉴 상세. 합계는 늘 (기본가 + 고른 옵션) × 수량 한 곳에서 계산하고, 하단 바를 화면의 맨 끝에 둔다.

```tsx
import { PhotoFrame } from './ScreenKit'
import { ActionBar, CheckList, OptionSection, PickGroup } from './ScreenKitDetail'
import { QuantityStepper } from './QuantityStepper' // quantity-stepper 패턴

<main className="kit-screen">
  <div className="kit-column">
    <div className="kit-hero">
      <PhotoFrame src="/photos/janchi.webp" alt="잔치국수" loading="eager" />
      <div className="kit-hero-bar">
        <a className="kit-hero-button" href="/menu" aria-label="뒤로"><ChevronLeft /></a>
        <button type="button" className="kit-hero-button" aria-label="공유"><Share /></button>
      </div>
      <span className="kit-hero-count"><span className="kit-sr">사진 </span>1 / 3</span>
    </div>
    <div className="kit-info">
      <h1 className="kit-info-name">잔치국수</h1>
      <p className="kit-info-price">7,000원</p>
      <p className="kit-info-desc">멸치와 다시마로 우린 맑은 육수에 소면을 말았어요.</p>
      <ul className="kit-info-meta"><li><b>15분</b> 뒤 픽업</li><li>오늘 <b>42그릇</b> 남음</li></ul>
    </div>
    <div className="kit-band" />
    <OptionSection title="면 양" hint="하나 선택" titleId="size">
      <PickGroup name="size" labelledBy="size" value={size} onChange={setSize}
        options={[{ value: 'regular', label: '보통' }, { value: 'large', label: '곱빼기', extra: '+1,500원' }]} />
    </OptionSection>
    <OptionSection title="추가" hint="여러 개 선택" titleId="addon">
      <CheckList labelledBy="addon" values={addons} onChange={setAddons}
        options={[{ value: 'egg', label: '달걀지단 더', price: '+1,000원' }]} />
    </OptionSection>
    <section className="kit-option kit-qty" aria-labelledby="qty">
      <h2 id="qty" className="kit-option-title">수량</h2>
      <QuantityStepper value={count} onChange={setCount} min={1} max={20} label="잔치국수 수량" />
    </section>
    <ActionBar label="담기" total={won(totalOf({ size, addons, count }))} onClick={add} />
  </div>
</main>
```

설정. 스위치는 `switch` 패턴의 `Switch`를 행 안에 넣는다 — `className="kit-row-switch"`와 보이는 `label`만 주면 행 전체가 누르는 영역이 된다.

```tsx
import { PageHead } from './ScreenKit'
import { ProfileRow, SettingsGroup, SettingsRow } from './ScreenKitSettings'
import { Switch } from './Switch' // switch 패턴

<main className="kit-screen">
  <div className="kit-column">
    <div className="kit-topbar"><a className="kit-icon-button" href="/my" aria-label="뒤로"><ChevronLeft /></a></div>
    <PageHead title="설정" />
    <ProfileRow name="김국수" sub="noodle@example.com" href="/my/profile" />
    <div className="kit-band" />
    <SettingsGroup label="알림" note="혜택 알림은 밤 9시부터 아침 8시까지 보내지 않아요.">
      <li className="kit-row"><Switch className="kit-row-switch" label="주문 알림" checked={order} onChange={setOrder} /></li>
      <li className="kit-row"><Switch className="kit-row-switch" label="이벤트·혜택 알림" checked={promo} onChange={setPromo} /></li>
    </SettingsGroup>
    <div className="kit-band" />
    <SettingsGroup label="화면">
      <SettingsRow label="언어" value="한국어" href="/settings/language" />
      <SettingsRow label="테마" value="기기 설정 따름" onClick={openThemeSheet} />
    </SettingsGroup>
    <div className="kit-text-links">
      <button type="button" className="kit-text-link" onClick={logout}>로그아웃</button>
      <a className="kit-text-link kit-text-link-danger" href="/settings/leave">탈퇴하기</a>
    </div>
  </div>
</main>
```

대시보드. 견본 숫자는 한곳에 모으고 지표·막대·표를 같은 데이터에서 계산한다.

```tsx
import { AnswerHead, BarChart, Metrics, Periods } from './ScreenKitDashboard'

<main className="kit-screen">
  <AnswerHead
    label="오늘 매출 · 11월 27일 금요일"
    value="1,284,000원"
    compare={<>지난주 금요일 같은 시각보다 <b>+96,000원</b> (8.1%)</>}
    aside={<Periods label="기간" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />}
  />
  <Metrics items={[{ label: '주문', value: '148건', sub: '지난주 139건' }, { label: '주문당 금액', value: '8,676원' }]} />
  <div className="kit-board">
    <section aria-labelledby="chart">
      <div className="kit-block-head"><h2 id="chart" className="kit-block-title">시간대별 매출</h2><p className="kit-block-aside">단위 천 원</p></div>
      <BarChart label="시간대별 매출 막대 그래프, 단위 천 원. 11시 98, 12시 236, … 18시 350(지금)" data={HOURS} emphasis={7} />
    </section>
    <section aria-labelledby="rank">…순위 목록(ol.kit-ranks)…</section>
    <section className="kit-board-full" aria-labelledby="orders">…표…</section>
  </div>
</main>
```

## 사용 방법 — 표·순위·스위치 행 (마크업)

표는 이름 칸에 `kit-table-name`, 핵심 값(금액) 칸에 `kit-table-key`, 숫자 칸에 `kit-table-num`을 단다. 화면 틀이 600px보다 좁으면 행이 "이름 + 핵심 값 / 나머지 칸 한 줄"로 바뀐다. 순위 목록(`ol.kit-ranks`)·스위치 행(`label.switch.kit-row-switch`)·막대 줄의 순수 HTML은 `references/markup.md`에 있다.

## 관례와 다른 곳

`layout-principles`의 화면 관례와 다르게 정한 곳이다. 사용자가 승인한 초안을 따랐다.

| 관례 | 이 부품 | 이유 |
|---|---|---|
| 상세: 옵션은 굵은 제목 + 라디오 행, 고른 것은 강조색 링 + 점 | 하나 고르는 칸은 회색 채움 칸, 고른 것은 주 글자색 채움 | 선택지가 2~3개면 칸이 한눈에 비교된다. 선택지가 4개 이상이거나 설명이 붙으면 라디오 행(`checkbox-radio`)이 맞다 |
| 상세: 음식 메뉴의 수량은 가격과 한 줄 | 옵션이 있으면 수량 줄을 옵션 아래에 따로 둔다 | 옵션이 단가를 바꾸므로 단가 → 수량 → 합계(하단 바) 순서가 맞다. 옵션이 없으면 `.kit-qty`를 가격 줄에 써도 된다 |
| 대시보드: 옅은 바탕 + 흰 패널, 지표는 고른 지표의 큰 그래프로 바뀌는 탭 | 흰 면 + 선과 여백, 지표 줄은 고정 | 가게 하나의 오늘 화면처럼 볼 것이 적은 대시보드. 메뉴가 많은 관리 도구는 관례의 패널 방식이 맞을 수 있다. 지표를 탭으로 쓰면 칸을 `button`으로 감싸고 `tab-indicator`를 쓴다 |
| 대시보드: 기간은 프리셋 + 직접 선택(+ 비교) | 프리셋 알약만 | 직접 선택이 요청에 있으면 알약 끝에 "직접 선택"을 더해 달력 시트를 연다(프로젝트) |
| 기본값 표: 상자를 걷어 낸 뒤 흰 바탕 하나에 선만 두지 않는다(면 두 단계) | 대시보드는 흰 면 하나 + 선(옅은 바탕은 고른 기간뿐) | 사진(순위)과 56 수치가 위계를 맡는다. 화면이 밋밋하면 지표 줄이나 그래프 구역에 옅은 바탕(`--color-canvas`)을 깔아 면을 한 단계 더한다 |
| 대시보드: 지표 숫자는 이름의 2~3배 | 값 24 ÷ 라벨 14 = 1.7배 | 화면의 답은 56의 답 머리가 맡고, 지표 줄은 그 아래 근거라 한 단계 낮췄다 |

## 글꼴 불러오기

글꼴 파일은 이 스킬에 넣지 않는다(Pretendard의 글자 묶음 파일은 모두 3.1MB). `--font-sans`의 첫 이름이 `"Pretendard Variable"`이라, 아래 중 하나로 파일을 불러오면 부품 전체가 그 글꼴로 그려진다. Pretendard는 SIL Open Font License 1.1이다 — 상업적으로 쓰고 프로그램에 넣어 배포할 수 있다. 글꼴만 따로 팔 수 없고, 고친 판에는 "Pretendard" 이름을 쓸 수 없다.

| 길 | 방법 | 쓸 때 |
|---|---|---|
| 꾸러미 | `npm i pretendard` + `import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'` | 번들러가 있는 프로젝트. 화면에 쓰인 글자 묶음만 받는다(빵집 목록·회의실 예약 화면 하나가 10~11개, 263~291KB) |
| 파일 복사 | 꾸러미의 `dist/web/variable/woff2-dynamic-subset/` 폴더와 CSS를 정적 폴더에 복사하고, 라이선스 전문(OFL)을 함께 둔다 | 번들러 없는 정적 사이트. 외부 의존 0 |
| CDN | `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">` — 버전을 고정한다 | 한 줄로 끝낼 때. 외부 파일을 막은 환경에서는 쓸 수 없다 |

외부 파일이 금지된 한 파일 산출물이면 파일 없이 `--font-sans` 목록만 쓴다. 기기마다 다르게 그려진다. 맥은 Apple SD Gothic Neo, 윈도는 맑은 고딕이 한글을 그린다. 한국어 글꼴이 하나뿐인 리눅스 환경에서는 한글과 숫자가 다른 글꼴로 섞여 그려졌다. 목록에서 한국어 글꼴을 라틴 시스템 글꼴보다 앞에 두면 섞이지 않을 수 있지만 맥·윈도·안드로이드에서 확인하지 못해 토큰 순서는 바꾸지 않았다. 글꼴 파일을 base64로 넣는 것은 굵기 하나가 259~273KB(base64로 약 1.33배)라 권하지 않는다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 사진이 아직 없다 | 회색 칸 + 사진 아이콘이 아니라 내용에 맞는 콘텐츠 그림(`art--dish` + 메뉴 그림, `art--room` 등). 목록에서는 색 한 벌을 3~4개 돌린다 | `assets`(틀) · 프로젝트(장면 고르기) |
| 사진을 불러오는 중이다 | 틀이 비율대로 자리를 잡고 옅은 무채색 바탕이 보인다. 글이 밀리지 않는다. `width`·`height`도 주면 더 일찍 자리를 잡는다 | `assets` |
| 사진 틀과 `.art`를 같은 요소에 쓴다 | 그림이 깨지지 않는다 — 틀은 `.art`에 비율·모서리를 변수로만 넘기고, 모양 속성은 사진(`:not(.art)`)에만 준다. 불러오는 순서와 상관없다 | `assets` |
| 이름이 길다 | 두 줄에서 말줄임. 가격 줄은 칸 폭에서 줄을 바꾸고 칸 밖으로 나가지 않는다 | `assets` |
| 품절 | 담기 버튼이 없고 사진 위 "품절", 글자는 옅은 글자색(대비 4.5:1 이상). 칸의 자리·규격은 같다 | `assets` |
| 칸 전체를 눌러 상세로 간다 | `href`를 주면 이름 링크가 칸을 덮고, 담기 버튼은 그 위에서 따로 눌린다. 칸을 통째로 `a`로 감싸지 않는다 | `assets` |
| 시간 칸 사이에 예약된 칸이 낀다 | 이어서 고를 수 없으니 누른 칸에서 새로 시작한다. 예약된 칸은 눌러도 그대로다 | `assets`(`pickSlotRange`) |
| 고를 수 없는 칸·쉬는 날 | 채움 없이 옅은 글자 + 줄, `disabled`, 이유가 든 이름(`10:00 예약됨`). 색만으로 알리지 않는다 | `assets`(모양) · 프로젝트(이름) |
| 입력 오류 | 칸 안쪽 빨강 선, 라벨 빨강, 칸 아래 한 줄(무엇을 어떻게 고칠지), `aria-invalid` + `aria-describedby` | `assets`(`Field`) · 프로젝트(문장·검사 시점) |
| 아직 아무것도 고르지 않았다 | 요약 패널의 답 자리에 할 일("시간을 골라 주세요"), 주 버튼은 같은 자리에서 잠김(회색 면) | `assets`(모양) · 프로젝트(조건) |
| 320px 폭 | 날짜 원이 칸(41)에 맞춰 줄고, 시간 칸은 4열, 입력칸은 라벨 위. 가로로 넘치지 않는다 | `assets` |
| 모바일 앱 화면의 예약 폼 | 요약 패널은 본문 아래로 내려간다. 앱 관례는 합계와 주 버튼이 든 하단 고정 바다 — 그때는 패널 대신 하단 바를 둔다(`env(safe-area-inset-bottom)`) | 프로젝트 |
| 탭을 바꿀 때 밑줄이 움직여야 한다 | 이 패턴은 정지 모양만이다. `tab-indicator`를 함께 쓴다 | 프로젝트 |
| 동작 줄이기 | 버튼·담기의 누름 축소를 끈다 | `assets` |
| 오른쪽에서 왼쪽으로 쓰는 글(`dir="rtl"`) | 논리 속성(`inline-start`·`inline-end`)이라 담기·품절 표시·패널 열이 거울처럼 놓인다 | `assets` |
| 상세: 하단 바가 마지막 옵션을 가린다 | 바를 화면의 맨 끝 요소로 두면(sticky) 끝까지 내렸을 때 바가 마지막 내용 아래 제자리로 온다. 창에 고정(`data-fixed`)했으면 본문 끝에 `.kit-actionbar-space` | `assets` · 프로젝트(고정을 고를 때) |
| 상세: 하단 바가 하단 탭 바와 겹친다 | 상세에는 하단 탭 바를 두지 않는다(관례 "하단 탭 바") | 프로젝트 |
| 상세: 고를 수 없는 옵션(품절) | 칸·행이 `disabled` + 옅은 글자 + 줄. 이유("품절")는 이름에 글자로 붙인다 | `assets`(모양) · 프로젝트(이유) |
| 상세: 필수 옵션을 아직 고르지 않았다 | 하단 바 버튼을 잠그지 말고 누르면 그 구역으로 옮겨 안내 한 줄을 보인다 — 잠긴 버튼은 이유를 말하지 않는다 | 프로젝트 |
| 설정: 행이 링크·버튼 | 행 전체가 누르는 영역(높이 56, 화면 폭 가득), 포커스 링은 행 안쪽. 접근 이름은 라벨 + 현재 값(보이는 글자) | `assets` |
| 설정: 스위치 행을 누른다 | 행 어디를 눌러도 켜지고 꺼진다(`label`). 켜짐은 강조색, 꺼짐은 옅은 트랙 + 1px 테두리 — 손잡이 위치로도 갈린다. 저장 실패 시 되돌리기·알림은 `switch` 패턴 | `assets` · `switch` |
| 설정: 행이 적어 아래가 빈다 | 화면 바탕이 흰 면이라 회색으로 끝나지 않는다. 요청에 없는 행(고객센터·약관·버전)을 더하지 말고 보고에 제안한다 | `assets` · 프로젝트 |
| 상세·설정을 넓은 창에서 연다 | `.kit-column` — 옅은 바탕 가운데 흰 열(560). 하단 바도 열 폭이다 | `assets` |
| 대시보드: 320px에서 큰 금액 | 큰 수치가 화면 틀 폭의 11%(최소 36)로 줄어 아홉 자리가 한 줄에 든다. 지표 값은 칸 안에서 줄을 바꾼다(잘리지 않는다) | `assets` |
| 대시보드: 좁은 화면의 표 | 행마다 "이름 + 핵심 값 / 나머지 한 줄" 목록. 열을 빼지 않고, 머리 행은 낭독 전용으로 남는다. 표의 `display`를 바꾸면 일부 브라우저(사파리)가 표 의미를 버린다 — 낭독이 중요하면 `role="table"`·`row`·`cell`을 함께 단다 | `assets` · 프로젝트(역할) |
| 대시보드: 값이 없는 막대 칸 | 아직 오지 않은 시간·쉬는 날은 0이 아니라 `null` — 막대와 값 글자가 없고, 그림 이름에 "없음"을 적는다 | `assets`(`barShare`) · 프로젝트(문장) |
| 대시보드: 두 열의 길이가 다르다 | 짧은 쪽 아래가 빈다고 요청에 없는 구역을 더하지 않는다. 짧은 목록을 비슷한 길이의 구역(그래프) 옆에 두고 긴 구역(표)은 `.kit-board-full`로 두 열에 걸치거나, 한 열로 푼다 | 프로젝트 |
| 대시보드: 막대·축·값이 많다 | 막대 줄은 값 몇 개(7~12칸)까지다. 계열이 여럿이거나 축 눈금·툴팁·확대가 필요하면 차트 라이브러리를 쓰고 색 기준(무채색 + 강조 하나)만 가져간다 | 프로젝트 |

## 커스터마이즈 포인트

모두 공개 변수다. 화면 틀이나 조상에 선언한다(부품 요소 자신에 선언해도 된다).

| 대상 | 변수 |
|---|---|
| 좌우 여백 | `--kit-inline`(기본 `--page-inline`, 16) — 넓은 틀 안에서 여백을 틀이 가지면 `0` |
| 쪽 제목 크기 | `--kit-title-size`(28)·`--kit-title-size-wide`(`--text-hero`, 40). 본문의 1.7배 아래로 줄이지 않는다 |
| 탭 | `--kit-tab-gap`(24)·`--kit-tab-current`(주 글자색 — 강조색으로 바꿀 수 있다) |
| 격자 | `--kit-grid-columns`(2)·`--kit-grid-columns-mid`(3)·`--kit-grid-columns-wide`(4)·`--kit-grid-row-gap`(28)·`--kit-grid-column-gap`(12)·`--kit-grid-row-gap-wide`(40)·`--kit-grid-column-gap-wide`(24) |
| 사진 틀 | `--kit-frame-ratio`(1 — 메뉴·장소 `4 / 3`, 옷 `4 / 5`)·`--kit-frame-radius`(0 — 브랜드가 둥글면 8px까지) |
| 버튼 | `--kit-button-height`(`--control-height`, 48)·`--kit-button-radius`(`--radius-control`)·`--kit-button-outline`(윤곽선 색) |
| 사진 카드 | `--kit-choice-columns`(2)·`--kit-choice-columns-wide`(3)·`--kit-choice-radius`(8) |
| 날짜·시간 | `--kit-day-count`(7)·`--kit-slot-columns`(4)·`--kit-slot-columns-wide`(6)·`--kit-accent-text`(강조 글자색 — 기본은 `--color-accent-text`, 없으면 강조색. `scripts/palette.mjs`가 흰 면 4.5:1을 지킨 값을 낸다) |
| 입력칸 묶음 | `--kit-fields-line`·`--kit-fields-radius` |
| 요약·두 열 | `--kit-aside-width`(340)·`--kit-split-gap`(72)·`--kit-sticky-top`(24)·`--kit-summary-padding`(24)·`--kit-summary-padding-wide`(32)·`--kit-summary-radius`(12)·`--kit-summary-line`·`--kit-summary-button-height`(52) |
| 상세 | `--kit-hero-ratio`(1)·`--kit-info-name-size`(26)·`--kit-info-price-size`(22)·`--kit-pick-columns`(2)·`--kit-pick-on`(고른 칸 채움, 주 글자색)·`--kit-pick-on-text`·`--kit-pick-radius`·`--kit-check-line`(체크 상자 테두리)·`--kit-actionbar-button-height`(52)·`--kit-actionbar-height`(77, 고정 바 자리) |
| 설정 | `--kit-row-height`(56)·`--kit-chevron`(꺾쇠 색)·`--kit-row-hover`·`--kit-band`(띠 높이 8)·`--kit-column-width`(넓을 때 열 폭 560) |
| 대시보드 | `--kit-answer-size`(clamp 36~56)·`--kit-chart-height`(240)·`--kit-chart-bar`(무채색 막대)·`--kit-chart-emphasis`(강조 막대, 주 글자색)·`--kit-attention`(손봐야 할 점, 오류 빨강)·`--kit-board-aside`(320)·`--kit-board-gap`(72)·`--kit-period-hover` |

색·글자 크기·간격은 프로젝트 토큰(`--color-*`·`--text-*`·`--space-*`·`--radius-*`)을 먼저 읽는다. 강조색은 `--color-accent` 하나다.

## 함께 쓰는 패턴

- `layout-principles` — 토큰(`layout-tokens.css`), 콘텐츠 그림(`content-art.css`·`illustrations.ts`), 선 아이콘, 화면 유형별 관례(`patterns/layout-principles/references/screen-conventions.md`).
- `tab-indicator` — 탭을 바꿀 때 밑줄이 옆으로 따라가게.
- `quantity-stepper`·`cart-fly` — 담기 뒤 수량·담기 애니메이션이 요청에 있을 때.
- `bottom-sheet` — 정렬·필터 조건을 고르는 시트, 모바일 예약의 날짜 고르기.
- `loading-button` — 예약하기를 누른 뒤 진행 중 잠금.
- `skeleton` — 목록을 불러오는 동안 같은 칸 모양의 자리.
- `switch` — 설정의 켜고 끄는 행. 이 패턴은 행 안에 놓는 자리(`.kit-row-switch`)만 정한다.
- `quantity-stepper` — 상세의 수량 줄. 이 패턴은 줄의 자리(`.kit-qty`)만 정한다.
- `carousel`·`zoom-lightbox` — 상세 사진을 넘기거나 키울 때. 사진 장수 표시(`.kit-hero-count`)는 모양만이다.
- `bottom-sheet` — 설정의 테마·언어 행을 누르면 그 자리에서 고르는 시트.
- `count-up` — 대시보드 큰 수치가 바뀔 때 숫자를 올리는 움직임이 요청에 있으면.

## 주의사항

- **요청과 기존 체계가 먼저다.** 요청이 카드·그림자·색을 정했으면 그대로 따르고, 이 부품은 정하지 않은 부분에만 쓴다.
- **쪽마다 큰 제목 하나.** 쪽 머리를 구역마다 반복하면 위계가 다시 평평해진다. 구역 제목은 `.kit-section-title`(20)이다.
- **`.kit-screen`을 잊지 말 것.** 없으면 넓은 화면에서도 2열·28px 제목 그대로다. `container-type: inline-size`라 이 요소의 폭은 내용이 아니라 부모가 정한다 — 내용 폭에 맞춰 줄어드는 요소(인라인 블록·flex 항목의 `width: auto`)에 붙이지 않는다.
- **사진 틀에 모양을 직접 덮어쓰지 말 것.** `.kit-frame.art`에 `display`·`background`·`aspect-ratio`를 쓰면 그림이 깨진다. 비율·모서리는 변수로 바꾼다.
- **입력칸의 `outline: none`은 칸 전체의 포커스 링(`:focus-within`)과 한 짝이다.** 링을 지우면 키보드 포커스가 보이지 않는다.
- **선택은 색만으로 알리지 않는다.** 날짜·시간은 `aria-pressed`(또는 라디오의 `aria-checked`)와 굵기, 사진 카드는 윤곽선 + "선택됨" 글자다.
- **시간 칸에 테두리를 더하지 말 것.** 칸 수가 많아 선이 칸보다 많아진다. 고를 수 없는 칸에서 채움을 빼서 "잠김"과 "고를 수 있음"을 나눈다.
- 가격 숫자는 `tabular-nums`다. 금액 형식(쉼표·통화)은 프로젝트가 맞춘다.
- **켜진 스위치는 강조색 그대로다.** 받은 브랜드색이 있으면 그 색, 없으면 거의 검정이다. 스위치 때문에 색을 새로 정하지 않는다 — 꺼짐과는 손잡이 위치와 트랙 테두리로도 갈린다.
- **견본 숫자는 한곳에서 계산한다.** 상세의 합계 = (기본가 + 옵션) × 수량, 대시보드의 합계 = 막대 값의 합, 주문당 금액 = 합계 ÷ 주문 수, 지표의 대기 수 = 표에서 센 수.
- **보이는 글자와 다른 `aria-label`로 덮지 않는다.** 행·버튼의 이름은 보이는 글자(라벨 + 값, 행동 + 합계)다. 보충이 필요하면 `.kit-sr` 글자를 덧붙인다.
- **하단 바는 화면의 맨 끝 요소로 둔다.** 뒤에 다른 내용이 오면 sticky가 그 내용 위에 붙는다.
