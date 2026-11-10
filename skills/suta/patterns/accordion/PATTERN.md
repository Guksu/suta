---
name: accordion
description: 아코디언(accordion) 컴포넌트 — 눌러서 펼치고 접는 목록을 구현한다. 질문을 누르면 답이 아래로 펼쳐지고 화살표가 돌며, 하나만 열리거나 여러 개 열리게 할 수 있다. "아코디언, FAQ 접기 펼치기, 펼쳐지는 목록, 접이식 섹션, 토글 섹션" 요청과 질문 목록·상세 스펙·설정 그룹 UI에 쓴다. 기존 적용분의 속도·단일/다중 열림 수정에도 쓴다.
---

# accordion — 아코디언 펼침

라이브 데모: https://guksu.github.io/suta/#/accordion

## 언제 쓰는가

FAQ·상세 스펙·설정 그룹처럼 **제목만 훑다가 필요한 것만 펼쳐 보는** 콘텐츠. 전부 펼쳐두면 스크롤이 길어지고, 링크로 나누면 왕복이 생긴다 — 아코디언은 그 중간이다. 펼침이 애니메이션 없이 뚝 열리면 어디서 어디까지가 새 콘텐츠인지 눈이 따라가지 못한다.

**기술 선택:** CSS `grid-template-rows: 0fr ↔ 1fr` transition. `height: auto`는 애니메이션할 수 없어 보통 JS로 `scrollHeight`를 측정하지만, **fr 단위는 transition이 된다** — 측정 코드 없이 콘텐츠 높이만큼 열린다. 아코디언은 아래 콘텐츠를 밀어내는 것이 본질이라 레이아웃 전이를 피할 수 없고, 이 방식이 그 비용을 최소(JS 0줄)로 낸다. (`interpolate-size: allow-keywords`로 `height: auto` 직접 전이가 표준화 중이지만 아직 크로스 브라우저가 아니다.)

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/accordionCore.ts` | 코어 — 단일/다중 열림 목록 판정 (순수 함수) | 모든 프로젝트 |
| `assets/accordion.css` | 펼침 전이·화살표·구분선 | 모든 프로젝트 |
| `assets/Accordion.tsx` | React 컴포넌트 (ARIA 아코디언 패턴 포함) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { Accordion } from './Accordion'

const FAQS = [
  { id: 'takeout', title: '포장 되나요?', content: '네, 모든 메뉴 포장 가능합니다.' },
  { id: 'waiting', title: '웨이팅은 어떻게 하나요?', content: '매장 앞 태블릿에 등록해 주세요.' },
]

const FaqSection = () => <Accordion items={FAQS} />
```

- `type="multiple"`로 여러 항목 동시 열림, `defaultOpenIds={['takeout']}`로 초기 열림 지정.
- 열림 상태를 밖에서 쥐려면 `openIds`와 `onOpenChange`를 함께 준다. 주소의 해시로 특정 질문을 열거나 "전부 펼치기" 버튼을 둘 때 쓴다.
- 항목 `content`에는 어떤 ReactNode든 들어간다(이미지·목록 포함).

```tsx
const [openIds, setOpenIds] = useState<string[]>([])

<button type="button" onClick={() => setOpenIds(FAQS.map((faq) => faq.id))}>전부 펼치기</button>
<Accordion items={FAQS} type="multiple" openIds={openIds} onOpenChange={setOpenIds} />
```

## 사용 방법 — 순수 JS (React 없음)

트리거의 `aria-expanded`와 패널의 `data-open`만 토글하면 CSS가 나머지를 한다.

```html
<div class="accordion">
  <div class="accordion-item">
    <h3 class="accordion-header">
      <button class="accordion-trigger" aria-expanded="false" aria-controls="faq-1">
        포장 되나요? <svg class="accordion-chevron" …>…</svg>
      </button>
    </h3>
    <div class="accordion-panel" id="faq-1" data-open="false" role="region">
      <div class="accordion-panel-inner"><div class="accordion-panel-content">네, 가능합니다.</div></div>
    </div>
  </div>
</div>
```

```js
document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const open = trigger.getAttribute('aria-expanded') !== 'true'
    trigger.setAttribute('aria-expanded', String(open))
    document.getElementById(trigger.getAttribute('aria-controls')).dataset.open = String(open)
  })
})
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 닫힌 패널 안에 링크·버튼·입력칸이 있다 | Tab 순서와 화면 낭독에서 빠진다. 패널은 닫힘 전이가 끝난 뒤 `visibility: hidden`이 되고 `aria-hidden="true"`다 | `assets` — `accordion.css`·`Accordion.tsx`. 순수 JS는 `data-open`만 바꿔도 CSS가 숨긴다 |
| 여닫는 중에 다시 누른다(연타) | 전이가 그 자리에서 되돌아간다. 끝까지 기다리게 하지 않고, 다시 열리는 쪽이면 `visibility`가 바로 `visible`로 돌아온다 | `assets` — CSS transition |
| 처음부터 열어 둔다 | `defaultOpenIds`에 적은 항목이 열린 채 그려진다. `single`이면 여러 개를 적어도 첫 항목만 연다 | `assets` — `Accordion.tsx` |
| 주소의 해시로 특정 질문을 열거나, 전부 펼치기 버튼을 둔다 | 열림 목록을 밖에서 쥔다. `openIds`가 정본이고 누를 때마다 `onOpenChange`가 바뀐 목록을 준다 | `assets` — `openIds`·`onOpenChange`. 해시를 읽어 목록을 만드는 일은 `프로젝트` |
| 제목이 길다 | 두 줄로 꺾이고 화살표는 줄어들지 않는다(`flex: none`). 한글은 단어 단위로 꺾이고(`word-break: keep-all`), 끊을 곳 없는 긴 주소는 칸 안에서 꺾인다(`overflow-wrap: anywhere`). `dir="rtl"`이면 글이 오른쪽에 붙는다(`text-align: start`) | `assets` — `accordion.css` |
| 열린 뒤에 내용 높이가 바뀐다(이미지 로드, 안에서 더 보기) | 높이를 재지 않으므로 패널이 새 높이를 그대로 따른다. 이때는 전이 없이 바로 맞는다 | `assets` — `grid-template-rows: 1fr` |
| 여러 개가 함께 열리는 목록(`multiple`)에 항목이 7개 이상이다 | 패널에 `role="region"`을 달지 않는다. 영역(랜드마크)이 많으면 화면 낭독기로 건너뛰며 길을 찾기가 어렵다 | `assets` — `Accordion.tsx`. 순수 JS는 `프로젝트`가 `role`과 `aria-labelledby`를 뺀다 |
| 페이지 안 찾기(Ctrl+F)로 답의 낱말을 찾는다 | 닫힌 패널의 글은 찾아지지 않는다. 찾기가 중요한 문서는 `multiple`에 전부 펼치기 버튼을 두거나 목록 위에 검색칸을 둔다 | `프로젝트` |
| 인쇄한다 | 접힌 답도 펼쳐서 찍는다. 종이에서는 펼칠 수 없다 | `assets` — `@media print` |
| 어두운 바탕에 둔다 | 제목 글자는 부모의 글자색을 따른다(`color: inherit`). 구분선 기본값은 밝은 바탕용이라 `--accordion-border`를 프로젝트의 선 색 토큰에 잇는다 | `assets`(글자색) · `프로젝트`(구분선) |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 펼침 속도 | `--accordion-duration` (기본 300ms — 내용이 길수록 체감이 느려지므로 400ms를 넘기지 않는다) |
| 구분선 색 | `--accordion-border` (색 토큰 `--color-line`, 없으면 #e6e6e6) |
| 열림 모드 | `Accordion`의 `type` — `single`(기본)·`multiple` |
| 제목 단계 | `Accordion`의 `headingLevel` — 2~6, 기본 3(h3). 아코디언 위 제목보다 한 단계 아래로 맞춘다 |

## 함께 쓰는 패턴

- `patterns/skeleton` — 답을 펼칠 때 서버에서 불러오는 경우. 패널 안에 뼈대를 먼저 두면 패널이 뼈대 높이로 열리고, 답이 오면 그 높이로 바로 맞는다.
- `patterns/switch` — 설정 그룹을 접어 둘 때. 닫힌 그룹 안의 스위치는 Tab 순서에서 빠지므로, 자주 바꾸는 설정은 접지 않는다.
- `patterns/tab-indicator` — 질문이 20개를 넘어 분류가 필요할 때. 분류는 탭으로 나누고 탭마다 아코디언을 하나씩 둔다.

## 주의사항

- **3층 구조(.accordion-panel > .accordion-panel-inner > .accordion-panel-content)를 유지하라** — grid 래퍼·`overflow: hidden`+`min-height: 0` 층·패딩 층이 각각 필요하다. 특히 패딩을 inner에 직접 주면 0fr로 줄어도 패딩 높이가 남아 완전히 닫히지 않는다.
- `min-height: 0`이 핵심이다 — grid 항목의 기본 `min-height: auto`가 0fr로 줄어드는 것을 막기 때문. 삭제하면 닫히지 않는다.
- 트리거는 헤딩 안의 버튼이다(WAI-ARIA 아코디언 패턴). 헤딩을 빼고 버튼만 두면 화면 낭독기의 제목 목록에 질문이 잡히지 않는다.
- single 모드에서 열린 항목을 바꾸면 닫힘과 열림이 동시에 진행된다 — 자연스러운 동작이며, 순차 진행이 필요하면 이 패턴 범위 밖이다.
- single 모드에서 위쪽의 긴 답이 닫히면 방금 누른 제목이 그만큼 위로 올라간다. 크롬 계열은 스크롤 위치를 맞춰 제목이 화면에 남는 것을 확인했다. 스크롤 위치 보정(scroll anchoring)이 없는 브라우저에서는 제목이 화면 밖으로 밀릴 수 있다. 답이 화면 높이를 넘는 목록은 `multiple`로 둔다.
- 패널 안쪽 층은 `overflow: hidden`이다. 내용의 포커스 링이 좌우로 4px(내용 층의 좌우 패딩)을 넘으면 잘린다.
- **reduced-motion 대응 내장** — 펼침·화살표를 즉시 전환한다. 블록 제거 금지.
