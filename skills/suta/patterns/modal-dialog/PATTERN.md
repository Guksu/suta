---
name: modal-dialog
description: 화면 가운데 창을 띄우고 뒤 배경을 어둡게 잠그는 모달 다이얼로그(modal dialog) 컴포넌트를 구현한다 — 백드롭 페이드, 패널 스케일 진입, 포커스 트랩·Esc·포커스 복귀 포함. "모달, 다이얼로그, 팝업, 확인창, 알림창, 가운데 뜨는 창, 오버레이" 요청과 확인·입력·안내를 배경 위에 띄울 때 쓴다. 기존 적용분의 모달 열리는 속도·크기·닫기 방식 수정에도 쓴다.
---

# modal-dialog — 모달 다이얼로그

라이브 데모: https://guksu.github.io/suta/#/modal-dialog

## 언제 쓰는가

주문 취소 확인, 로그인 요구, 약관 안내처럼 **사용자의 답을 받기 전엔 뒤 화면을 만질 수 없어야 하는** 순간. 배경이 어두워지며 패널이 떠오르는 모션은 "지금 이 결정에 집중하라"는 신호다. 바텀시트(모바일 목록 선택)·토스트(답 필요 없음)와 구분한다 — 모달은 반드시 답(확인/취소)이 있다.

**기술 선택:** 네이티브 `<dialog>` + `showModal()` + CSS animation. 포커스 트랩·배경 inert·Esc 닫기·닫힌 뒤 포커스 복귀를 브라우저가 전부 처리하므로 접근성을 직접 재구현하지 않는다. 유일한 JS 역할은 `dialog.close()`가 즉시 사라지는 문제를 `data-closing` 애니메이션 뒤로 미루는 것. 진입은 transition이 아니라 **animation**이다 — `display: none → block`으로 바뀌는 순간에는 transition이 걸리지 않기 때문이다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/modal-dialog.css` | 패널·백드롭 진입/퇴장 키프레임, reduced-motion | 모든 프로젝트 |
| `assets/Modal.tsx` | React 래퍼 (open 동기화, 닫힘 지연, Esc·백드롭·뒤로 가기 라우팅) | React 프로젝트만 |
| `assets/createBackDismiss.ts` | 코어 — 뒤로 가기로 닫기(`patterns/bottom-sheet`와 같은 파일) | `Modal.tsx`를 쓰는 프로젝트, 뒤로 가기로 닫을 프로젝트 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .jsx로 저장한다 — 로직은 그대로다.

## 사용 방법 — React

```tsx
import { useState } from 'react'
import { Modal } from './Modal'

const CancelOrder = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>주문 취소</button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="cancel-title">
        <h2 id="cancel-title">주문을 취소할까요?</h2>
        <p>조리가 시작되면 취소할 수 없어요.</p>
        <button type="button" onClick={() => setOpen(false)}>돌아가기</button>
        <button type="button" onClick={confirmCancel}>취소하기</button>
      </Modal>
    </>
  )
}
```

- `open`은 부모가 소유한다. Esc·백드롭 클릭은 `onClose`를 부를 뿐 스스로 닫지 않는다 — "정말 닫을까요?"처럼 닫기를 거부하는 로직을 부모가 넣을 수 있다.
- `labelledBy`에 제목 요소 id를 넘기면 스크린 리더가 모달 진입 시 제목을 읽는다.
- 파괴적 확인(삭제·결제)이면 `dismissOnBackdrop={false}`로 실수 닫힘을 막는다.
- `closeOnBack`을 켜면 열려 있는 동안 뒤로 가기가 페이지를 떠나지 않고 모달을 닫는다(기본 꺼짐).

## 사용 방법 — 순수 JS (React 없음)

```html
<dialog class="modal" id="cancel-dialog" aria-labelledby="cancel-title">
  <div class="modal-body">
    <h2 id="cancel-title">주문을 취소할까요?</h2>
    <button type="button" data-close>돌아가기</button>
  </div>
</dialog>
```

```js
const dialog = document.getElementById('cancel-dialog')
const closeAnimated = () => {
  dialog.setAttribute('data-closing', '')
  dialog.addEventListener('animationend', () => {
    dialog.removeAttribute('data-closing')
    dialog.close()
  }, { once: true })
}
dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeAnimated() }) // Esc
dialog.addEventListener('click', (e) => { if (e.target === dialog) closeAnimated() }) // 백드롭
dialog.querySelector('[data-close]').addEventListener('click', closeAnimated)
document.getElementById('open').addEventListener('click', () => dialog.showModal())
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 내용이 화면보다 길다 | 패널은 `min(80vh, 640px)`에서 멈추고 `.modal-body`가 스크롤한다. 끝에서 더 굴려도 뒤 페이지는 움직이지 않는다(`overscroll-behavior: contain`). 버튼은 내용 끝에 있어 끝까지 내려야 보이므로, 약관처럼 긴 글은 모달 대신 화면으로 옮긴다 | `assets` / 내용 길이는 프로젝트 |
| 모달 위에 모달을 연다 | 나중에 연 것이 위에 뜬다. Esc는 위의 것만 닫고, 포커스는 아래 모달에서 그것을 연 버튼으로 돌아간다. 백드롭이 두 겹이라 뒤가 더 어두워진다. 크롬은 사용자 조작 없이 코드로 연 둘째 창을 첫 창과 한 묶음으로 보아 Esc 한 번에 둘 다 닫는다 | `assets`(네이티브 `<dialog>`) |
| 모달 안에서 메뉴·툴팁·자동완성을 쓴다 | 안쪽 것이 열려 있으면 첫 Esc는 그것만 닫는다. 툴팁과 제안 목록은 패널 밖으로 나간 부분이 패널의 `overflow: hidden`에 잘린다. 패널 가장자리의 툴팁은 안쪽 방향으로 정한다 | `assets` / 방향은 프로젝트 |
| 닫기를 거부한다(저장 중·한 번 더 확인) | `onClose`에서 `open`을 내리지 않으면 열린 채 남는다. 크롬은 사용자 조작 없이 이어진 두 번째 Esc를 막지 못하게 하고 바로 닫는데, 그때도 `onClose`를 부르고 `open`이 그대로면 다시 연다 | `assets` |
| 확인을 누른 뒤 요청이 진행 중이다 | 모달을 닫지 않는다. 확인 버튼에 `aria-busy="true"`를 걸어 다시 눌리지 않게 하고 `onClose`는 무시한다. 실패하면 모달 안에 `role="alert"` 한 줄로 알리고 버튼을 되살린다 | 프로젝트 |
| 모달을 연 버튼이 닫는 사이 사라진다(행 삭제) | 브라우저가 포커스를 돌려보낼 곳이 없어 문서 맨 앞으로 떨어진다. 닫은 뒤 목록 제목이나 다음 행으로 `focus()`를 옮긴다 | 프로젝트 |
| 뒤 화면이 스크롤된다 | 배경은 눌리지 않지만(inert) 휠로는 굴러간다. 막으려면 `html:has(dialog.modal[open]) { overflow: hidden }`을 더한다. 스크롤바가 사라지며 화면이 옆으로 흔들리는 것은 `html { scrollbar-gutter: stable }`로 막는다 | 프로젝트 |
| 뒤로 가기를 누른다 | `closeOnBack`이면 모달만 닫히고 페이지는 그대로다. 버튼·Esc·백드롭으로 닫으면 쌓아 둔 history 항목을 걷는다 | `assets` — `createBackDismiss` |
| 열린 채 화면이 바뀐다 | `<dialog>`가 문서에서 빠지며 배경의 inert와 `:has()` 스크롤 잠금이 함께 풀린다. 모달 안의 링크로 넘어갔으면 history는 건드리지 않는다 | `assets` |
| 모달 안 입력창에 화면 키보드가 올라온다 | 패널은 화면 가운데에 있어 아래쪽이 키보드에 가린다. 입력이 있는 창은 좁은 화면에서 `patterns/bottom-sheet`나 전체 화면으로 낸다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 속도 | `--modal-duration` (기본 240ms — 닫힘은 자동으로 0.75배, 퇴장은 진입보다 짧게) |
| 크기 | `--modal-width`(min(420px, 100vw-32px)), 높이는 내용 기준·최대 80vh |
| 배경·모서리 | `--modal-bg`, `--modal-radius`(16px), `--modal-backdrop`(rgba 0.55) |
| 진입 방향 | `modal-in` 키프레임의 `translateY(12px)` — 아래에서 떠오름. 위에서 내려오게 하려면 음수로 |

## 함께 쓰는 패턴

- `patterns/dropdown-menu` — 메뉴의 "삭제"가 여는 확인창. 메뉴가 먼저 닫히며 포커스를 `⋯`로 돌려 두므로, 모달을 닫으면 포커스가 `⋯`로 돌아온다.
- `patterns/bottom-sheet` — 좁은 화면에서 목록 고르기·입력은 시트로 낸다. 모달 안에서 시트를 열면 시트가 모달 뒤에 깔려 눌리지 않는다. 모달을 닫으며 시트를 연다.
- `patterns/loading-button` — 확인 버튼의 진행 표시. 요청이 끝날 때까지 모달을 열어 두고 버튼만 바꾼다.
- `patterns/toast-stack` — 모달을 닫은 뒤의 결과 알림. 모달이 열린 동안 띄운 토스트는 백드롭 뒤에 깔리므로 닫은 다음에 띄운다.

## 주의사항

- **`showModal()`이지 `show()`가 아니다** — `show()`는 배경 잠금·포커스 트랩·`::backdrop`이 없다.
- 백드롭 클릭 판정은 `event.target === dialog`다. `.modal-body`가 dialog를 꽉 채우고 있어야 패널 안쪽 클릭이 백드롭으로 오인되지 않는다 — padding을 dialog가 아니라 `.modal-body`에 둔 이유다.
- 모달 안 첫 포커스는 브라우저가 첫 포커스 가능 요소에 준다. 파괴적 버튼이 첫 번째면 실수 Enter로 실행될 수 있으니 안전한 버튼(돌아가기)을 앞에 둔다.
- 스크롤은 `.modal-body`가 담당한다 — dialog 자체에 `overflow: hidden`을 둔 것은 둥근 모서리 안으로 내용을 자르기 위해서다.
- 모달은 맨 위 층(top layer)에 뜬다. `z-index`가 아무리 커도 모달 밖의 요소는 그 위로 올라오지 못한다. 모달 위에 보여야 하는 것은 `<dialog>` 안에 그린다.
- `closeOnBack`은 history에 주소가 같은 항목을 하나 쌓는다. 같은 주소의 `popstate`에 데이터를 다시 불러오는 라우터에서는 닫을 때마다 그 동작이 돈다. 그런 프로젝트는 라우터의 방식으로 대신한다.
- **reduced-motion 대응 내장** — 이동·스케일 없이 100ms 페이드로 대체한다. 애니메이션을 완전히 없애면 닫힘이 `animationend`에 걸리므로(폴백 500ms 뒤 닫힘) 페이드를 남긴 것이다. 블록 제거 금지.
