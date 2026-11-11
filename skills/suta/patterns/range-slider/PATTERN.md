---
name: range-slider
description: 두 손잡이로 최소·최대 구간을 고르는 범위 슬라이더(range slider, 가격·기간 필터) 컴포넌트를 구현한다 — 손잡이가 서로를 지나치지 않고 고른 구간이 색으로 채워지며 방향키로도 조절된다. "가격 범위 슬라이더, 최소값 최대값 손잡이 두 개, 구간 필터, 두 개짜리 슬라이더" 요청에 쓴다. 기존 적용분의 손잡이·채움 색·단계 수정에도 쓴다.
---

# range-slider — 두 손잡이 범위 슬라이더

라이브 데모: https://guksu.github.io/suta/#/range-slider

## 언제 쓰는가

가격 필터, 기간 선택, 평점 범위처럼 **연속된 값에서 구간을 고를 때**. 값 하나만 고른다면 네이티브 `<input type="range">` 하나면 충분하다 — 이 패턴은 **손잡이가 둘**일 때를 위한 것이다.

정확한 숫자가 중요한 값(정확히 12,340원)에는 슬라이더가 나쁜 선택이다. 슬라이더는 "대충 이 정도"를 고르는 도구이므로 숫자 입력을 함께 두거나 아예 입력으로 바꾼다.

**기술 선택:** 네이티브 `<input type="range">` **두 개를 겹쳐** 놓았다. div로 직접 그리면 키보드 조작·스크린 리더·터치·고대비 모드를 전부 다시 만들어야 하는데, 네이티브를 쓰면 그것들이 공짜다. 보이는 트랙과 채움은 별도 요소이고, input 자신은 투명하게 만들어 손잡이만 남긴다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/rangeValues.ts` | 값 규칙 (순수 함수, DOM 없음) — 눈금·경계·교차·겹침 | 모든 프로젝트 |
| `assets/RangeSlider.tsx` | React 컴포넌트 | React 프로젝트만 |
| `assets/range-slider.css` | 트랙·채움·손잡이 | 모든 프로젝트 |

## 값의 규칙이 진짜 내용이다

드래그는 브라우저가 해 준다. 직접 만들면 무너지는 곳은 값이다.

| 상황 | 이 패턴의 처리 |
|------|---------------|
| 최저가를 최고가 너머로 끈다 | **움직인 쪽이 멈춘다.** 상대를 밀어내지 않는다 — 밀어내면 건드리지도 않은 값이 바뀐다 |
| 두 값이 붙어야 할 최소 간격이 있다 | `minDistance`만큼 떨어져 멈춘다 |
| 눈금이 0.1처럼 소수다 | 부동소수 오차를 눈금의 자릿수로 정리한다 |
| 두 손잡이가 정확히 겹쳤다 | 몰려 있는 쪽의 **반대로 끌 수 있게** 위아래를 정한다 (오른쪽 끝이면 아래쪽 손잡이가 위로) |
| 손잡이를 정확히 못 집었다 | 트랙을 누르면 가까운 손잡이가 그 자리로 온다 |

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { RangeSlider, type RangeValue } from './RangeSlider'

const PriceFilter = () => {
  const [price, setPrice] = useState<RangeValue>({ lower: 8000, upper: 20000 })

  return (
    <>
      <p>
        {price.lower.toLocaleString('ko-KR')}원 ~ {price.upper.toLocaleString('ko-KR')}원
      </p>
      <RangeSlider
        min={0}
        max={50000}
        step={1000}
        value={price}
        onChange={setPrice}
        minDistance={1000}
        label={{ lower: '최저 가격', upper: '최고 가격' }}
        format={(value) => `${value.toLocaleString('ko-KR')}원`}
      />
    </>
  )
}
```

`onChangeEnd`는 조작이 끝났을 때 한 번 온다(손을 뗌·키 한 번·트랙 누름). 목록을 서버에서 다시 받거나 주소의 쿼리를 바꾸는 일은 `onChange`가 아니라 여기서 한다.

`format`은 스크린 리더용이다 — 없으면 "12000"으로 읽히고, 있으면 "12,000원"으로 읽힌다(`aria-valuetext`).

**값 표시는 컴포넌트 밖에 둔다.** 어디에 어떻게 보여줄지는 화면마다 다르고, 슬라이더가 정할 일이 아니다.

## 사용 방법 — 순수 JS (React 없음)

값 규칙만 가져다 쓰고 DOM은 직접 갱신한다:

```js
import { clampPair, snapValue, toPercent } from './rangeValues.js'

lowerInput.addEventListener('input', () => {
  const next = clampPair({
    lower: snapValue({ value: Number(lowerInput.value), min: 0, max: 50000, step: 1000 }),
    upper: state.upper,
    moved: 'lower',
  })
  state = next
  root.style.setProperty('--range-lower', `${toPercent({ value: next.lower, min: 0, max: 50000 })}%`)
  lowerInput.value = String(next.lower)
})
```

`clampPair`에 `min`·`max`를 함께 넘기면 최소 간격 때문에 값이 범위 밖으로 밀려나지 않는다.

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 눈금이 범위를 나누지 못한다(0~50에 `step` 20) | 최댓값 50은 눈금이 아니다. 최대 아래의 마지막 눈금(40)에서 멈춘다. 네이티브 input이 그렇게 하므로 상태도 같은 값을 낸다. 끝 값까지 골라야 하면 `max`를 눈금에 맞춘다 | `assets` — `snapValue` |
| `min`과 `max`가 같다(결과가 한 가지 가격뿐) | 고를 구간이 없다. 값은 그 하나로 고정되고 채움은 그려지지 않는다. `disabled`를 함께 주거나 슬라이더를 감춘다 | `assets`(값) / 감추기는 프로젝트 |
| 잠근다(`disabled`) | 두 input이 `disabled`가 되어 Tab 순서에서 빠진다. 트랙을 눌러도 움직이지 않는다. 전체가 `opacity: 0.45`로 흐려지고 `touch-action`이 풀려 그 위에서 세로 스크롤이 된다 | `assets` |
| 끄는 동안 목록을 다시 불러온다 | `onChange`는 끄는 내내 온다. 요청은 `onChangeEnd`에서 한 번 보낸다. 화면의 값 표시만 `onChange`로 따라간다 | `assets` — `onChangeEnd` |
| 상대 손잡이가 끝에 붙어 최소 간격을 낼 자리가 없다 | 움직인 쪽이 범위 끝(`min`·`max`)에서 멈춘다. 범위 밖 값은 나가지 않는다 | `assets` — `clampPair` |
| 밖에서 범위를 벗어난 값을 넣는다(저장된 필터, 바뀐 가격대) | 채움은 0~100% 안에서만 그려진다. 값 자체는 고치지 않으므로 `min`·`max`가 바뀌면 값도 `snapValue`로 다시 맞춰 넣는다 | `assets`(그리기) / 값 맞추기는 프로젝트 |
| 키보드로 조절한다 | 방향키는 한 눈금, PageUp·PageDown은 브라우저가 정한 큰 걸음, Home·End는 끝으로 간다. 아래 손잡이의 End는 위 손잡이 자리에서 멈춘다 | `assets`(네이티브 input + `clampPair`) |
| `dir="rtl"` 문서 | 네이티브 input이 뒤집혀 오른쪽 끝이 최솟값이 된다. 채움 방향(`:dir(rtl)`)과 트랙 누름 자리도 같이 뒤집는다 | `assets` |
| 고대비(`forced-colors`) | 채움은 `Highlight`, 트랙은 `GrayText`, 손잡이 테두리는 `ButtonText`로 칠한다 | `assets` |
| 폼으로 값을 보낸다 | 두 input에 `name`이 없어 제출 값에 들지 않는다. `<input type="hidden">` 두 개에 값을 적는다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 눈금 | `step` | 1 |
| 최소 간격 | `minDistance` — `step`의 배수로 적는다. 아니면 멈춘 값이 눈금에서 벗어난다 | 0 (붙어도 된다) |
| 잠금 | `disabled` | false |
| 트랙 두께·손잡이 크기 | `--range-height`·`--range-thumb-size` | 6px / 24px |
| 색 | `--range-accent`(손잡이 테두리+채움)·`--range-track`·`--range-thumb` | 거의 검정(#1c1c1c) / 회색 / 흰색 |

## 함께 쓰는 패턴

- `patterns/bottom-sheet` — 모바일 필터 시트 안에 둔다. 시트의 스크롤 영역(`.sheet-scroll`) 안에 두면 슬라이더 위에서는 세로로 굴릴 수 없으므로 위아래에 16px 이상 여백을 둔다.
- `patterns/skeleton` — `onChangeEnd`로 목록을 다시 받는 동안 목록 자리에 뼈대를 둔다. 슬라이더 자신은 잠그지 않는다. 잠그면 이어서 조절할 수 없다.

## 주의사항

- **손잡이는 44px 이상 잡히게 하라.** 기본 24px은 WCAG 2.2의 최소 누르는 영역이고, 손가락 터치 목표로는 작다. 모바일이 주 사용처면 `--range-thumb-size`를 키우거나 트랙 높이를 늘려 잡기 쉽게 만든다.
- **`touch-action: none`이 걸려 있다.** 손잡이를 끄는 동안 화면이 함께 스크롤되지 않게 하기 위한 것으로, 슬라이더 위에서는 세로 스크롤이 되지 않는다. 목록 한가운데 놓을 때는 위아래로 여백을 충분히 둔다.
- **`aria-valuetext`를 반드시 채워라**(`format`). 숫자만 읽히면 "12000"이 되어 단위를 알 수 없다.
- **트랙 클릭은 가까운 손잡이를 옮긴다.** 손잡이를 정확히 집지 않아도 조작되게 하려는 것이다. 누른 채 이어서 끌 수는 없다. 손잡이가 옮겨 온 뒤 다시 잡아 끈다.
- 스크린 리더는 두 슬라이더의 범위를 모두 전체 범위(`min`~`max`)로 읽는다. 상대 손잡이 때문에 줄어든 범위는 읽히지 않고, 넘기려 하면 값이 멈추는 것으로 알게 된다.
- **세로 슬라이더는 범위 밖이다** — 가로 배치만 계산한다.
- **reduced-motion 대응 내장** — 손잡이가 커지는 연출만 사라지고 조작은 그대로다.
- 이 패턴은 값 두 개만 다룬다. 손잡이가 셋 이상이거나 구간마다 색이 달라야 한다면 직접 그리는 편이 낫고, 그때는 키보드·스크린 리더 대응을 처음부터 만들어야 한다.
