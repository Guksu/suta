---
name: screen-kit
description: 목록·예약 화면의 바탕 부품 한 벌(screen kit)을 구현한다. 쪽 머리 큰 제목·탭 줄·상자 없는 상품 칸 격자·사진 틀·날짜 띠·시간 칸·입력칸 묶음·요약 패널이다. "메뉴 목록 화면, 상품 목록 격자, 예약 폼 페이지, 날짜·시간 고르는 예약 화면 만들어줘, product grid page" 요청을 디자인 기준 없이 새로 지을 때 먼저 복사해 그 위에 짓는다.
---

# screen-kit — 화면 바탕 부품 한 벌

라이브 데모: https://guksu.github.io/suta/#/screen-kit

## 언제 쓰는가

디자인 기준(토큰·컴포넌트·브랜드 가이드·일관된 기존 화면)이 없는 프로젝트에서 목록·상세·폼·예약 화면을 **새로** 만들 때, 화면의 일에 맞는 부품을 먼저 복사하고 그 위에 짓는다. 이 부품들은 suta 우선순위의 맨 끝(suta 기본값)이다.

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

**기술 선택:** CSS가 모양을 모두 맡는다. 넓은 화면 값은 화면 폭이 아니라 **화면 틀(`.kit-screen`)의 폭**으로 바뀐다(컨테이너 쿼리). 미리보기 틀·사이드바 옆처럼 창보다 좁은 자리에서도 모바일 값이 맞게 나온다. TypeScript는 시간 칸의 구간 고르기(`slotRange.ts`, 의존성 0)만 한다. 사이에 예약된 칸이 끼면 구간이 끊기는 판정이 화면 코드에 흩어지면 겹친 예약이 생긴다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/screen-kit.css` | 바탕 — 화면 틀(컨테이너)·쪽 머리·탭 줄·버튼·사진 틀·낭독 전용 글자 | 모든 화면 |
| `assets/screen-kit-list.css` | 목록 — 목록 머리(개수·정렬)·상품 격자·상품 칸(할인·정가·품절·담기) | 목록 화면 |
| `assets/screen-kit-form.css` | 예약·입력 — 본문 + 요약 두 열·구역 머리·사진 카드·날짜 띠·시간 칸·입력칸 묶음·요약 패널 | 예약·폼 화면 |
| `assets/slotRange.ts` | 코어 — `timeSlots`·`pickSlotRange`·`inSlotRange`·`slotRangeTime` | 시간 칸이 있으면 |
| `assets/ScreenKit.tsx` | React 래퍼 — `PageHead`·`PhotoFrame`·`ProductCell`·`FieldGroup`·`Field`·`SummaryPanel`. CSS 세 개를 직접 불러온다 | React 프로젝트만 |

사진이 없을 때의 그림은 `layout-principles` 패턴의 파일이다. 경로로 가져와 함께 복사한다(import로 엮지 않는다).

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

CSS 세 개(목록이면 앞 둘, 예약이면 첫째와 셋째)와 `content-art.css`를 불러오고 마크업만 맞춘다.

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

시간 칸은 `slotRange.ts`의 `pickSlotRange`를 눌릴 때마다 불러 구간을 바꾸고, 각 칸의 `aria-pressed`를 `inSlotRange`로 다시 쓴다. 날짜 띠는 `<button class="kit-day" aria-pressed="true|false">`에 `<span class="kit-day-week">`·`<span class="kit-day-date">`를 넣는다.

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

색·글자 크기·간격은 프로젝트 토큰(`--color-*`·`--text-*`·`--space-*`·`--radius-*`)을 먼저 읽는다. 강조색은 `--color-accent` 하나다.

## 함께 쓰는 패턴

- `layout-principles` — 토큰(`layout-tokens.css`), 콘텐츠 그림(`content-art.css`·`illustrations.ts`), 선 아이콘, 화면 유형별 관례(`patterns/layout-principles/references/screen-conventions.md`).
- `tab-indicator` — 탭을 바꿀 때 밑줄이 옆으로 따라가게.
- `quantity-stepper`·`cart-fly` — 담기 뒤 수량·담기 애니메이션이 요청에 있을 때.
- `bottom-sheet` — 정렬·필터 조건을 고르는 시트, 모바일 예약의 날짜 고르기.
- `loading-button` — 예약하기를 누른 뒤 진행 중 잠금.
- `skeleton` — 목록을 불러오는 동안 같은 칸 모양의 자리.

## 주의사항

- **요청과 기존 체계가 먼저다.** 요청이 카드·그림자·색을 정했으면 그대로 따르고, 이 부품은 정하지 않은 부분에만 쓴다.
- **쪽마다 큰 제목 하나.** 쪽 머리를 구역마다 반복하면 위계가 다시 평평해진다. 구역 제목은 `.kit-section-title`(20)이다.
- **`.kit-screen`을 잊지 말 것.** 없으면 넓은 화면에서도 2열·28px 제목 그대로다. `container-type: inline-size`라 이 요소의 폭은 내용이 아니라 부모가 정한다 — 내용 폭에 맞춰 줄어드는 요소(인라인 블록·flex 항목의 `width: auto`)에 붙이지 않는다.
- **사진 틀에 모양을 직접 덮어쓰지 말 것.** `.kit-frame.art`에 `display`·`background`·`aspect-ratio`를 쓰면 그림이 깨진다. 비율·모서리는 변수로 바꾼다.
- **입력칸의 `outline: none`은 칸 전체의 포커스 링(`:focus-within`)과 한 짝이다.** 링을 지우면 키보드 포커스가 보이지 않는다.
- **선택은 색만으로 알리지 않는다.** 날짜·시간은 `aria-pressed`(또는 라디오의 `aria-checked`)와 굵기, 사진 카드는 윤곽선 + "선택됨" 글자다.
- **시간 칸에 테두리를 더하지 말 것.** 칸 수가 많아 선이 칸보다 많아진다. 고를 수 없는 칸에서 채움을 빼서 "잠김"과 "고를 수 있음"을 나눈다.
- 가격 숫자는 `tabular-nums`다. 금액 형식(쉼표·통화)은 프로젝트가 맞춘다.
