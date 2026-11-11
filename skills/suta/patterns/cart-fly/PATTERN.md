---
name: cart-fly
description: 담기 버튼을 누르면 상품 이미지가 장바구니 아이콘으로 포물선을 그리며 날아가 들어가는 애니메이션(add to cart fly)을 구현한다. "장바구니 담기 애니메이션, 카트로 날아가는 효과, 담을 때 슝 가는 효과, 아이템 플라이" 요청과 커머스 담기·찜 인터랙션에 쓴다. 기존 적용분의 속도·궤적 수정에도 쓴다.
---

# cart-fly — 카트 플라이

라이브 데모: https://guksu.github.io/suta/#/cart-fly

## 언제 쓰는가

상품을 장바구니에 담는 순간, 상품의 잔상(고스트)이 장바구니 버튼으로 날아가는 피드백. "담겼다"는 결과가 화면 어디에 반영됐는지(장바구니 위치)를 시선으로 안내한다.

**기술 선택:** 포물선 궤적을 keyframes 없이 만든다 — **바깥 요소는 가로를 등속(linear)으로, 안쪽 요소는 세로를 가속(ease-in)으로** 움직이면 두 축이 합쳐져 곡선이 된다. transform·opacity만 쓰고(GPU), 고스트는 도착 시 스스로 정리된다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/flyToTarget.ts` | 코어 — 고스트 생성·2축 비행·정리 | 모든 프로젝트 |
| `assets/useCartFly.ts` | React 훅 | React 프로젝트만 |

CSS 파일은 없다 — 고스트 스타일은 코어가 인라인으로 관리한다(복사 파일 하나로 완결). TS가 아닌 프로젝트는 타입을 벗겨 .js로 저장한다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { useCartFly } from './useCartFly'
import { Icon } from './Icon' // layout-principles의 선 아이콘 한 벌 — 이모지로 대신하지 않는다

const Shop = () => {
  const [count, setCount] = useState(0)
  const { targetRef, flyFrom } = useCartFly<HTMLButtonElement>()

  const addToCart = (event: React.MouseEvent) => {
    const card = (event.currentTarget as HTMLElement).closest('.product-card') as HTMLElement
    const thumb = card.querySelector('img') as HTMLElement // 카드 전체가 아니라 사진만 날린다
    flyFrom({ source: thumb, onArrive: () => setCount((prev) => prev + 1) })
  }

  return (
    <>
      <button ref={targetRef} type="button" aria-label={`장바구니 ${count}개`}>
        <Icon name="cart" /> {count}
      </button>
      {/* 비행은 눈으로만 보인다 — 담겼다는 사실은 낭독 영역 한 줄로도 알린다. sr-only는 화면에서만 숨기는 프로젝트의 클래스다 */}
      <p role="status" className="sr-only">{count > 0 ? `장바구니에 ${count}개 담았어요` : ''}</p>
      <div className="product-card">
        <img src="/photos/janchi.webp" alt="잔치국수" width={96} height={96} />
        <button type="button" onClick={addToCart}>담기</button>
      </div>
    </>
  )
}
```

## 사용 방법 — 순수 JS (React 없음)

```js
import { flyToTarget } from './flyToTarget.js'

const cart = document.querySelector('#cart-button')
document.querySelectorAll('.product-card .add').forEach((button) => {
  button.addEventListener('click', () => {
    flyToTarget({
      source: button.closest('.product-card').querySelector('img'),
      target: cart,
      onArrive: () => bumpCartCount(),
    })
  })
})
```

`flyToTarget`은 취소 함수를 돌려준다. 화면을 떠날 때 부르면 고스트를 걷고 `onArrive`를 부르지 않는다. React 훅은 언마운트 때 스스로 걷는다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 담기를 연타한다 | 고스트가 누른 수만큼 각자 날고, `onArrive`도 그 수만큼 불린다. 수량이 늘어나는 담기는 그대로 둔다. 한 번만 담기는 상품(찜)은 날고 있는 동안 버튼을 막는다 | `assets`. 막는 것은 `프로젝트` |
| 장바구니 버튼이 지금 화면에 없다(좁은 화면에서 숨긴 머리글, `display: none`) | 날리지 않고 `onArrive`를 바로 부른다. 담은 결과는 잃지 않는다. 좌표 (0, 0)으로 날아가지 않는다 | `assets` — 크기가 0인 출발지·목적지, 비어 있는 `targetRef` |
| 나는 도중에 화면을 떠난다 | 고스트는 `body`에 붙어 있어 컴포넌트가 사라져도 남는다. 훅이 언마운트 때 걷고 `onArrive`는 부르지 않는다. 장바구니 데이터는 누른 순간에 이미 바꿔 두었어야 한다 | `assets` — `useCartFly`. 순수 JS는 돌려받은 취소 함수를 `프로젝트`가 부른다 |
| 탭이 가려졌다 돌아온다, `transitionend`가 오지 않는다 | `durationMs + 200ms` 뒤에 고스트를 걷고 `onArrive`를 부른다. 뱃지 숫자가 빠지지 않는다 | `assets` |
| 서버가 담기를 거절한다(품절·수량 초과) | 비행은 이미 끝났다. 뱃지 숫자를 되돌리고 토스트로 이유를 알린다. 요청을 기다렸다 날리지 않는다(누른 뒤 600ms 넘게 반응이 없으면 고장으로 읽힌다) | `프로젝트` |
| 화면 낭독기로 쓴다, 동작 줄이기 | 고스트는 `aria-hidden`이고 복제된 `id`는 지워진다. 사진의 대체 글이 두 번 읽히지 않는다. 담겼다는 사실은 `role="status"` 한 줄과 장바구니 버튼의 이름("장바구니 3개")으로 알린다. 동작 줄이기면 비행 없이 `onArrive`만 바로 불린다 | 고스트·동작 줄이기는 `assets`. 알림 문구는 `프로젝트` |
| 출발지가 크거나 무겁다(카드 전체, 영상, 캔버스) | 복제는 DOM을 통째로 베낀다. 영상과 캔버스는 빈 상자로 복제된다. 사진 요소 하나만 `source`로 준다 | `프로젝트` |
| 시트·모달 안에서 담는다 | 고스트는 알림과 같은 층(`--z-toast`, 기본 100)이라 `z-index`로 띄운 시트와 스크림 위를 난다. 네이티브 `<dialog>`(`showModal()`)는 `z-index`와 무관한 최상위 층이라 고스트가 그 아래에 그려진다. 대화상자 안에서 담을 때는 대화상자를 닫은 뒤에 날린다 | 층은 `assets`. 대화상자는 `프로젝트` |
| 목적지가 화면 아래에 있다(하단 탭 바의 장바구니) | 기본 궤적(`horizontal-first`)은 끝에서 세로로 빨라진다. 위에서 아래로 떨어질 때도 같은 곡선이다. 거리가 200px 아래면 `durationMs`를 400ms로 줄인다 | `프로젝트` |


## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 비행 시간 | `durationMs` (기본 600ms — 화면 대각선 거리 기준. 짧은 거리는 400ms대가 무난) |
| 궤적 방향 | `arc` — `'horizontal-first'`(기본): 옆으로 갔다가 끝에서 상승(j자) / `'vertical-first'`: 먼저 떠올랐다가 옆으로(r자). 축 이징을 서로 바꿔 만든다 |
| 카운트 증가 시점 | `onArrive` — 도착 순간에 증가시켜야 인과가 보인다(누르자마자 증가시키면 비행이 무의미해진다) |
| 고스트 모양 | `source`에 무엇을 주느냐가 곧 모양 — 카드 전체 대신 썸네일 요소를 주면 가볍다 |
| 고스트의 층 | `--z-toast` (기본 100). 토큰이 없는 프로젝트에서 다른 요소에 가리면 `:root`에 이 변수를 정한다 |

## 함께 쓰는 패턴

- `patterns/quantity-stepper` — 담은 뒤 담기 버튼을 수량 조절로 바꾸는 카드. 비행은 처음 담을 때만 쓰고, 수량을 늘릴 때는 숫자만 바꾼다.
- `patterns/bottom-nav` — 목적지가 하단 탭 바의 장바구니 탭일 때 그 탭 아이콘에 `targetRef`를 단다. 뱃지 숫자는 `onArrive`에서 올린다.
- `patterns/toast-stack` — 담기가 거절됐을 때의 알림. 성공에는 토스트를 겹치지 않는다(비행이 이미 알렸다).
- `patterns/bottom-sheet` — 옵션을 고르는 시트에서 담을 때. 시트를 닫으며 날리면 출발지가 사라지므로, 날린 뒤에 닫는다.

## 주의사항

- **카운트는 onArrive에서 올려라** — 상태(진짜 장바구니 데이터)는 클릭 즉시 갱신하되, 화면의 뱃지 숫자만 도착에 맞추는 분리가 정석이다. 네트워크 요청을 비행에 묶지 마라.
- 고스트는 `position: fixed`다 — 스크롤 컨테이너 안이 아니라 뷰포트 좌표로 난다. 비행 중 스크롤되면 목적지가 이미 이동해 있을 수 있다(600ms 안에서는 체감 미미).
- 도착한 순간 장바구니 뱃지를 한 번 튀게 하면(`transform: scale` 200ms) 어디에 담겼는지가 더 잘 읽힌다. 뱃지 연출은 이 패턴에 들어 있지 않다.
