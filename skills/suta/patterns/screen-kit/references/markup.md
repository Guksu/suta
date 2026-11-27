# screen-kit — 표·순위·스위치 행 마크업

React 래퍼 없이 클래스로 쓰는 부품의 마크업이다. 값과 규칙은 `../PATTERN.md`의 "부품과 값"에 있다.

표는 이름 칸에 `kit-table-name`, 핵심 값(금액) 칸에 `kit-table-key`를 단다. 화면 틀이 600px보다 좁으면 행이 "이름 + 핵심 값 / 나머지 칸 한 줄"로 바뀐다. 나머지 칸은 DOM 순서대로 가운뎃점으로 이어진다.

```html
<table class="kit-table">
  <thead><tr><th scope="col">시각</th><th scope="col">메뉴</th><th scope="col">상태</th><th scope="col" class="kit-table-num">금액</th></tr></thead>
  <tbody>
    <tr>
      <td class="kit-table-sub">18:42</td>
      <td class="kit-table-name">잔치국수 2, 손만두 1</td>
      <td><span class="kit-status" data-attention>새 주문 · 확인 필요</span></td>
      <td class="kit-table-key kit-table-num">21,500원</td>
    </tr>
  </tbody>
</table>

<ol class="kit-ranks">
  <li class="kit-rank">
    <img class="kit-frame" src="/photos/janchi.webp" alt="" width="56" height="56" />
    <span class="kit-rank-text"><span class="kit-rank-name">잔치국수</span><span class="kit-rank-sub">38그릇</span></span>
    <span class="kit-rank-value">266,000원</span>
  </li>
</ol>

<!-- 스위치 행 — switch.css + 이 패턴의 설정 CSS -->
<li class="kit-row">
  <label class="switch kit-row-switch">
    <input type="checkbox" role="switch" class="switch-input" checked />
    <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
    <span class="switch-label">주문 알림</span>
  </label>
</li>
```

막대 줄을 React 없이 쓰면 칸마다 `style="--kit-chart-value: 0.42"`(가장 큰 값에 대한 비율)를 직접 적는다. 값이 없는 칸(아직 오지 않은 시간·쉬는 날)은 `data-empty`를 달고 값 글자를 뺀다.
