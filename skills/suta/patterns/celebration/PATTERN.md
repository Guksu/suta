---
name: celebration
description: 목표 달성·레벨 업·배지 획득 순간에 지금 화면 위로 뜨는 축하 오버레이(celebration)를 구현한다. 큰 보상 그림 하나, 한 줄 제목과 보상, 버튼 하나, 한 번 터지는 조각으로 이루어진다. "목표 달성 축하 화면, 레벨 업 빵빠레, 배지 획득 팝업, 포인트 받기 축하, 색종이(confetti) 효과" 요청과 게이미피케이션·리워드 앱에 쓴다.
---

# celebration — 축하 오버레이

라이브 데모: https://guksu.github.io/suta/#/celebration

## 언제 쓰는가

목표 달성, 레벨 업, 배지 획득, 연속 출석처럼 사용자가 무언가를 이룬 순간. 게이미피케이션·리워드 앱의 축하는 대부분 같은 모양이다.

- 지금 화면 위에 어두운 막을 깔고 가운데에 띄운다. 따로 된 페이지로 옮기지 않는다.
- 큰 보상 그림이 하나 있다(트로피·메달·코인). 그 아래 한 줄 제목과 보상(+100P), 필요하면 한 줄 설명. 그림은 채운 모양이다. 흰 패널에 선 아이콘만 두면 확인 창처럼 보인다(같은 요청으로 만든 앱의 블라인드 판정에서 "밋밋한 확인 모달"이라는 이유로 졌다). 이 패턴은 보상 색 원판 위에 흰 아이콘을 그린다.
- 버튼은 하나다("확인", "쿠폰 받기"). 통계 표·보조 버튼 여러 개를 넣지 않는다.
- 연출은 한 번이다. 그림이 작게 시작해 튀어 오르고, 조각이 위와 양옆으로 한 번 퍼져 그림 둘레에 남는다. 조각은 아래로 내려가지 않는다(제목·보상 글자를 가리지 않게).
- 하루 한 번인 출석은 이 오버레이로 띄워도 된다(학습 앱·공동구매 앱 모두 그림 + 버튼 하나의 팝업이다).
- 자주 생기는 작은 적립(3초 기다리기 +3원, 문제 하나 +3점)은 이 오버레이를 띄우지 않는다. 위쪽 토스트 한 줄(`toast-stack`)로 알리고, 늘어난 숫자는 머리의 포인트에 남긴다(`count-up`).

영단어 학습 앱, 공동구매 앱의 출석·게임 보상, 금융 앱의 혜택 화면이 이 관례를 따른다. AI가 만든 축하 화면은 그 반대로 간다. 축하를 별도 페이지로 만들어 통계 표를 늘어놓거나, 이모지 트로피를 계속 튀게 하고 색종이를 무한히 떨어뜨린다. 그런 화면은 동작 줄이기 설정도 무시한다.

**기술 선택:** 띄우기는 네이티브 `<dialog>.showModal()`이다. 포커스 가두기·뒤 화면 잠금·Esc를 브라우저가 맡는다(`modal-dialog`와 같은 방식). 움직임은 CSS keyframes(transform·opacity)이고 모두 한 번만 재생한다. JS 코어는 조각 궤적을 seed로 정하는 일만 맡는다. 저절로 닫히는 축하는 두지 않는다. 모달은 어두운 막이 화면 전체라 포인터가 늘 안에 있고 포커스도 안으로 들어가, "읽는 중에는 멈추는" 자동 닫힘을 만들 수 없다. 작은 보상은 모달이 아닌 토스트가 맞다. 캔버스 색종이 라이브러리를 쓰지 않는다. 조각 14개 정도는 DOM과 CSS로 충분하고, 동작 줄이기·낭독을 함께 다루기 쉽다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createCelebration.ts` | 코어 — 조각 궤적 `burstPieces`(seed 고정), `prefersReducedMotion` | 모든 프로젝트 |
| `assets/celebration.css` | 패널·어두운 막·그림 튀기·조각 퍼짐·닫힘, 동작 줄이기 | 모든 프로젝트 |
| `assets/Celebration.tsx` | React 래퍼 — `<dialog>` 열고 닫기, 버튼에 포커스, Esc·바깥 누름, 조각 그리기 | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js/.jsx로 저장한다. 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { Celebration } from './Celebration'
import { Icon } from './Icon' // layout-principles의 선 아이콘 한 벌

const GoalReached = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>보너스 받기</button>
      <Celebration
        open={open}
        onClose={() => setOpen(false)}
        title="오늘 목표 달성!"
        reward="+100P"
        description="8,000걸음을 걸었어요"
        figure={<Icon name="trophy" />}
        actionLabel="확인"
      />
    </>
  )
}

// 자주 생기는 작은 적립은 축하가 아니라 위쪽 토스트 한 줄(toast-stack) + 머리 숫자(count-up)
const { toast } = useToastStack({ position: 'top' })
toast('3초 기다리기 · +3P')
```

- 그림은 `figure`에 넣는다. 아이콘이면 보상 색 원판 위에 흰색으로 그려진다. 이모지 트로피(🏆)를 쓰지 않는다. 기기마다 그림이 다르다.
- 제목은 대화상자의 이름으로, 보상과 설명은 설명으로 읽힌다. 따로 `aria-live`를 달지 않는다.
- 하단 탭 바는 어두운 막 아래로 가려진다. 축하를 띄우려고 탭 바를 숨기는 다른 경로를 만들지 않는다.

## 사용 방법 — 순수 JS (React 없음)

```html
<dialog class="celebration" aria-labelledby="cel-title" aria-describedby="cel-text">
  <div class="celebration-stage">
    <div class="celebration-burst" aria-hidden="true"></div>
    <div class="celebration-figure" aria-hidden="true"><!-- 트로피 SVG --></div>
  </div>
  <h2 id="cel-title" class="celebration-title">오늘 목표 달성!</h2>
  <div id="cel-text" class="celebration-text"><p class="celebration-reward">+100P</p></div>
  <button type="button" class="celebration-action">확인</button>
</dialog>
```

```js
import { burstPieces, prefersReducedMotion } from './createCelebration.js'

const dialog = document.querySelector('.celebration')
const burst = dialog.querySelector('.celebration-burst')
const open = () => {
  burst.dataset.motion = prefersReducedMotion() ? 'still' : 'burst' // still이면 조각이 날지 않고 제자리에 놓인다
  burst.replaceChildren(
    ...burstPieces({ count: 14, seed: 1 }).map((p) => {
      const el = document.createElement('span')
      el.className = `celebration-piece celebration-piece--${p.shape}`
      el.dataset.tone = String(p.tone)
      el.style.cssText = `--x:${p.x}px;--y:${p.y}px;--r:${p.rotate}deg;--delay:${p.delayMs}ms`
      return el
    }),
  )
  dialog.showModal()
  dialog.querySelector('.celebration-action').focus()
}
dialog.querySelector('.celebration-action').addEventListener('click', () => dialog.close())
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 버튼을 빠르게 두 번 누른다(Enter를 누르고 있다) | 보상 처리(`onAction`)는 한 번만 불린다. 닫히는 240ms 동안의 버튼·Esc·바깥 누름은 무시한다 | `assets` — `data-closing` 동안 막는다 |
| `onAction`이 서버 요청이다(쿠폰 발급) | 요청이 끝날 때까지 `open`을 유지하면 그 사이의 클릭은 막히지 않는다. 축하는 받은 뒤에 띄우거나, 버튼을 누르면 바로 닫고 요청은 뒤에서 보낸다. 실패는 토스트로 알린다 | `프로젝트` |
| 축하 두 개가 한꺼번에 생긴다(레벨 업 + 배지) | 두 개를 겹쳐 띄우지 않는다. 하나로 묶거나("레벨 5 · 배지 1개"), 앞의 것이 닫힌 뒤(`onClose`) 다음 것을 연다 | `프로젝트` |
| 닫히는 중에 다시 연다 | 닫힘을 취소하고 그대로 열려 있다. 조각은 새로 붙어 한 번 더 터진다 | `assets` |
| 열린 채 화면이 바뀐다(자동 이동·뒤로 가기) | 대화상자가 DOM에서 빠지며 사라진다. 닫는 절차(`close()`)를 거치지 않으므로 포커스가 연 버튼으로 돌아온다고 기대할 수 없다. 화면을 옮기기 전에 `open`을 `false`로 바꾼다. 뒤로 가기로 축하만 닫는 기능은 없다 | `프로젝트` |
| 제목·설명이 길다, 화면이 낮다(가로로 눕힌 휴대폰) | 글자는 단어 단위로 꺾이고(`keep-all`) 패널이 아래로 길어진다. 패널은 스크롤하지 않는다(조각이 패널 밖으로 날아야 해 `overflow: visible`이다). 그림과 두 줄 글, 버튼까지 약 360px가 든다. 제목은 12자 안이면 320px 화면에서도 한 줄이다. 설명은 두 줄 안으로 쓴다 | `프로젝트` |
| 화면 폭이 320px다 | 패널 폭은 `min(100% - 32px, 360px)`라 288px가 된다. 조각은 가운데에서 64~128px 날아가므로 320px 화면 안에 놓인다 | `assets` |
| 고대비 모드(`forced-colors: active`) | 흰 패널과 어두운 막, 버튼의 배경색이 시스템 색으로 바뀌어 경계가 사라진다. 패널·그림 원판·버튼에 테두리를 긋고 조각은 숨긴다 | `assets` — `celebration.css` |
| 동작 줄이기 | 조각은 날지 않고 그림 둘레 제자리에 놓인다(`data-motion="still"`). 그림과 패널은 150ms 페이드만 한다 | `assets` |
| 어두운 바탕의 앱 | 패널은 `--color-surface`를, 글자는 `--color-text`를 따른다. 토큰이 없으면 흰 패널에 검은 글자다. 어두운 막(`--celebration-dim`)은 어두운 화면에서 패널과 구별되지 않으므로 패널을 한 단계 밝은 면으로 둔다 | 토큰 사슬은 `assets`. 면의 밝기는 `프로젝트` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 그림 원판·아이콘 | `--celebration-figure-disc` (기본 보상 색 금 #b07d00)·`--celebration-figure-ink` (기본 흰색). 일러스트를 넣으면 원판을 `transparent`로 |
| 조각의 보상 색 | `--celebration-reward` (기본 `--color-reward`) |
| 버튼·조각 색 | `--celebration-accent` (기본 `--color-accent`) |
| 은색 조각 | `--celebration-silver` (기본 `--color-reward-silver`) |
| 어두운 막 | `--celebration-dim` (기본 검정 60%) — 뒤 화면이 비쳐 보이면 축하가 아니라 확인 창으로 읽힌다 |
| 조각 수 | `pieces` (기본 14. 0이면 조각 없이) |
| 조각 모양 | `seed` (같은 값이면 같은 궤적) |
| 버튼 문구 | `actionLabel` (기본 "확인". 다른 언어면 넘긴다) |

시간 값은 CSS에 있다. 패널 320ms, 그림 튀기 480ms(80ms 늦게), 조각 900ms, 닫힘 240ms(진입의 3/4). 동작 줄이기면 들어올 때 150ms·나갈 때 120ms 페이드만 한다. 조각을 1.2초보다 길게 하거나 반복하지 않는다. 축하가 길면 다음 행동을 막는다.

## 함께 쓰는 패턴

- `patterns/toast-stack` — 자주 생기는 작은 적립은 이 오버레이 대신 위쪽 토스트 한 줄이다. 축하의 요청이 실패했을 때도 토스트로 알린다.
- `patterns/count-up` — 축하를 닫은 뒤 머리의 포인트 숫자를 올린다. 축하 안의 보상 글자(+100P)는 굴리지 않는다.
- `patterns/progress-ring` — 링이 다 찬 뒤(`--ring-duration` 뒤)에 축하를 띄운다. 링이 차는 중에 막이 덮이면 달성이 보이지 않는다.
- `patterns/modal-dialog` — 고를 것이 있는 확인(버튼 둘)은 축하가 아니라 대화상자다.

## 주의사항

- **같은 성취는 한 번만 축하한다.** 화면에 들어올 때마다 다시 띄우지 않는다. 받았는지를 상태에 저장하고, 축하는 받는 순간(버튼을 누른 직후)에 띄운다.
- **이룬 순간에만 쓴다.** 목표 달성·레벨 업·배지 획득·하루 한 번 출석은 이 오버레이(버튼 하나), 자주 생기는 작은 적립은 위쪽 토스트 한 줄이다. 적립마다 오버레이를 띄우면 귀찮은 팝업이 된다.
- **여는 버튼을 닫힌 뒤에도 남겨 둔다.** 닫으면 브라우저가 포커스를 연 버튼으로 돌려준다. 연 버튼을 비활성으로 바꾸거나 없애면 포커스가 문서 처음으로 가 버린다. 받은 뒤 버튼을 바꿔야 하면 닫힐 때 상태를 바꾼다.
- **무한 반복 애니메이션을 쓰지 않는다.** 튀는 트로피, 계속 떨어지는 색종이, 깜박이는 배지는 쉬는 화면에서도 눈을 끈다.
- **낭독**: 열리면 포커스가 버튼으로 가고, 화면 낭독기는 제목(이름)과 보상·설명(설명)을 읽는다. 닫으면 포커스가 연 버튼으로 돌아온다(브라우저가 처리).
- **어두운 막 위 패널은 흰 면이다.** 그라데이션 배경·유리 효과를 깔지 않는다. 색은 보상 그림 하나에 모은다.
