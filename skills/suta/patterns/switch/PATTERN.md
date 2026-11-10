---
name: switch
description: iOS 스타일 토글 스위치(toggle switch)를 구현한다 — 썸이 미끄러지고 트랙 색이 바뀌는 온오프 입력, 네이티브 input 기반이라 키보드·폼 연동이 된다. "스위치, 온오프 버튼, 켜기 끄기 토글, 알림 켜고 끄기, 설정 스위치" 요청과 설정·옵션의 즉시 적용형 on/off 입력에 쓴다. 기존 적용분의 크기·색·속도 수정에도 쓴다.
---

# switch — 토글 스위치

라이브 데모: https://guksu.github.io/suta/#/switch

## 언제 쓰는가

알림 켜기, 다크 모드, 주문 옵션처럼 **누르는 즉시 적용되는 on/off**. 체크박스와의 구분이 기준이다 — 체크박스는 "제출 시 반영"(폼 제출 전 여러 개 고르기), 스위치는 "즉시 반영"(누르면 바로 켜짐). 썸이 미끄러지는 모션은 장식이 아니라 "지금 전환됐다"는 피드백이다.

**기술 선택:** 네이티브 `<input type="checkbox" role="switch">` + CSS. 체크박스를 숨기고 트랙/썸을 그리면 포커스·Space 토글·라벨 클릭·폼 제출이 전부 브라우저 몫이 된다 — 접근성을 직접 재구현하지 않는 것이 이 패턴의 핵심 결정이다. 썸 이동·스퀴시는 transform만 쓴다(레이아웃 애니메이션 없음).

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/switch.css` | 트랙·썸·스퀴시·포커스 링 정의 | 모든 프로젝트 |
| `assets/Switch.tsx` | React 래퍼 (라벨 연결 포함) | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { Switch } from './Switch'

const OrderOptions = () => {
  const [extra, setExtra] = useState(false)

  return <Switch checked={extra} onChange={setExtra} label="곱빼기 (+1,000원)" />
}
```

`checked`·`onChange`·`label`·`disabled`·`className` 밖의 props(`name`·`value`·`id`·`aria-label`·`aria-describedby` 등)는 input으로 간다. 설정 행처럼 이름이 다른 칸에 있으면 `label` 대신 `aria-label`이나 `aria-labelledby`로 이름을 준다.

```tsx
<Switch checked={alert} onChange={setAlert} aria-labelledby="order-alert-title" name="orderAlert" />
```

## 사용 방법 — 순수 JS (React 없음)

마크업만 맞추면 JS 없이도 동작한다(상태는 체크박스가 들고 있다).

```html
<label class="switch">
  <input type="checkbox" role="switch" class="switch-input" />
  <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
  <span class="switch-label">곱빼기 (+1,000원)</span>
</label>
```

```js
document.querySelector('.switch-input').addEventListener('change', (e) => {
  console.log('켜짐:', e.target.checked)
})
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 켠 값을 서버에 저장하다 실패한다 | `checked`를 누르기 전 값으로 되돌리고 이유를 한 줄로 알린다. 켜진 모습을 그대로 두면 화면과 서버가 어긋난다 | 프로젝트 |
| 저장 응답을 기다린다 | 스위치를 `disabled`로 잠그지 않는다. 누를 때마다 흐려졌다 돌아오면 깜빡임으로 보인다. 누른 즉시 바뀐 모습을 보이고, 실패했을 때만 되돌린다 | 프로젝트 |
| 빠르게 여러 번 누른다 | 누를 때마다 `onChange`가 다음 값으로 불린다. 요청은 마지막 값만 보내거나 앞 요청이 끝난 뒤에 보낸다. 응답 순서가 바뀌면 옛 값이 새 값을 덮는다 | 프로젝트 |
| 스위치만 두고 이름은 다른 칸에 있다 | `aria-label`이나 `aria-labelledby`로 이름을 준다. 이름이 없으면 낭독기가 "스위치, 꺼짐"만 읽는다 | `assets` — 나머지 props가 input으로 간다 |
| 손가락으로 누른다 | 누르는 영역의 높이가 44px다. 트랙은 26px이고, label의 위아래 안쪽 여백 9px이 나머지를 채운다. 같은 크기의 음수 바깥 여백이 있어 자리는 26px 그대로다 | `assets` |
| 스위치를 세로로 촘촘히 쌓는다 | 간격이 18px보다 좁으면 넓힌 영역이 서로 겹치고, 겹친 곳은 아래 스위치가 받는다. 설정 목록은 행 높이 48px 이상으로 둔다 | 프로젝트 |
| 지금은 바꿀 수 없다(`disabled`) | 전체가 `opacity: 0.5`, 커서는 `not-allowed`, 눌림 스퀴시가 없다. 왜 꺼져 있는지는 라벨이나 아래 한 줄에 적는다 | `assets`(모양) · 프로젝트(이유) |
| 라벨이 길어 두 줄로 꺾인다 | 트랙은 줄지 않고(`flex: none`) 라벨만 꺾인다. 트랙은 라벨의 세로 가운데에 선다 | `assets` |
| 고대비 모드(`forced-colors`) | 배경색과 그림자가 지워져 트랙과 썸이 사라진다. 시스템 색으로 다시 그린다. 꺼짐은 테두리만 있는 트랙과 채운 썸, 켜짐은 `Highlight`로 채운 트랙이다 | `assets` |
| 오른쪽에서 왼쪽으로 쓰는 글(`dir="rtl"`) | 꺼짐이 오른쪽, 켜짐이 왼쪽으로 뒤집힌다 | `assets` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 크기 | `--switch-width`(44px)·`--switch-height`(26px) — 썸 크기·이동 거리가 함께 계산된다 |
| 켜짐/꺼짐 색 | `--switch-on-bg`(기본은 강조색 토큰 `--color-accent`, 토큰이 없으면 #1c1c1c)·`--switch-off-bg`(#e5e5e5 옅은 트랙)·`--switch-off-border`(#8a8a8a 1px — 흰 바탕 대비 3.45:1, 비텍스트 기준 3:1 이상). 국내 앱 설정 화면에서 켜진 스위치는 18곳 중 16곳이 서비스 강조색, 꺼진 트랙은 89%가 옅은 회색이었다. 켜짐을 검정으로 두면 미완성처럼 보인다 |
| 속도 | `--switch-duration` (기본 200ms — 하루 수십 번 누르는 컨트롤이라 짧게) |

어두운 바탕에서는 `--switch-off-bg`·`--switch-off-border`를 바탕에 맞춰 바꾼다. 포커스 링은 켜짐 색(`--switch-on-bg`)을 따르므로, 켜짐 색이 바탕과 3:1 이상 차이 나야 링이 보인다.

## 함께 쓰는 패턴

- `toast-stack` — 저장이 실패해 스위치를 되돌릴 때 이유를 알린다. 스위치 옆에 오류 문구 자리를 따로 두지 않아도 된다.
- `checkbox-radio` — "저장" 버튼을 눌러야 반영되는 폼에서는 스위치 대신 체크박스를 쓴다.
- `segmented-control` — 켜짐·꺼짐이 아니라 이름이 있는 두세 가지 중 하나를 고를 때 쓴다(예: 매장·포장).

## 주의사항

- **`role="switch"`를 지우지 말 것** — 스크린 리더가 "켜짐/꺼짐"으로 읽는 근거다(체크박스는 "선택됨"으로 읽는다).
- 입력을 `display: none`으로 숨기면 안 된다 — 포커스를 받을 수 없게 된다. 제공된 클립 방식(시각만 숨김)을 유지한다.
- 누름 스퀴시는 `width`가 아니라 `scaleX`다 — width 전이는 매 프레임 레이아웃을 돌린다. 배율(1.12)을 크게 키우면 썸이 타원으로 보이니 1.2 이하를 유지한다.
- 즉시 적용이 원칙이므로 스위치를 켠 뒤 "저장" 버튼을 또 요구하지 않는다 — 제출형 폼이면 체크박스가 맞다.
- **reduced-motion 대응 내장** — 썸 이동은 즉시 점프, 트랙 색 전환(상태 표시)은 유지한다. 블록 제거 금지.
