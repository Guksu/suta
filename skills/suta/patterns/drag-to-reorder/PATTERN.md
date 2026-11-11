---
name: drag-to-reorder
description: 목록 항목을 잡고 끌어서 순서를 바꾸는 드래그 정렬(drag and drop reorder) 리스트를 구현한다 — 끌면 항목이 떠오르고 지나친 항목들이 자리를 비켜 주며, 방향키로도 순서를 바꿀 수 있다. "순서 바꾸기, 드래그로 정렬, 끌어서 이동, 목록 순서 변경, 할 일 순서 바꾸기" 요청에 쓴다. 기존 적용분의 손잡이·길게 누르기·속도 수정에도 쓴다.
---

# drag-to-reorder — 끌어서 순서 바꾸기

라이브 데모: https://guksu.github.io/suta/#/drag-to-reorder

## 언제 쓰는가

할 일 목록·재생 목록·설정 항목·이미지 순서처럼 **사용자가 직접 정한 순서가 데이터인 목록**에. 정렬 기준이 서버에 있는 목록(최신순·인기순)에는 쓰지 않는다.

flip-list 패턴과 헷갈리기 쉬운데 다루는 것이 다르다:

| 패턴 | 순서를 바꾸는 주체 | 하는 일 |
|------|-------------------|---------|
| flip-list | 코드 (정렬 버튼·필터) | 바뀐 결과를 미끄러지게 보여준다 |
| **drag-to-reorder** | 사용자 (손가락·방향키) | 끄는 동안 자리를 비켜 주고, 놓은 자리를 새 순서로 확정한다 |

**기술 선택:** Pointer Events + transform. 드래그 중에는 DOM 순서를 건드리지 않고 `transform`으로 자리만 비켜 둔다 — 끄는 도중 목록을 다시 그리면 손가락 아래의 요소가 바뀌어 제스처가 끊긴다. 놓고 정착이 끝난 뒤에 한 번만 실제 순서를 바꾼다. 라이브러리 불필요.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createDragReorder.ts` | 코어 — 드래그·자리 비키기·정착·방향키 이동 | 모든 프로젝트 |
| `assets/useDragReorder.ts` | React 훅 | React 프로젝트만 |
| `assets/drag-to-reorder.css` | 비켜 주는 이동·들어올린 모습·손잡이 | 모든 프로젝트 |

## 사용 방법 — React

1. 세 파일을 프로젝트로 복사한다(TS가 아니면 타입을 벗겨 `.js`로).
2. 목록에 `containerRef`, 각 항목에 **고유한 `data-reorder-id`**, 손잡이 버튼에 `getHandleProps()`를 준다.

```tsx
import { useDragReorder } from './useDragReorder'

const TodoList = () => {
  const [todos, setTodos] = useState([
    { id: 'broth', text: '육수 내리기' },
    { id: 'noodle', text: '면 삶기' },
    { id: 'garnish', text: '고명 올리기' },
  ])

  const reorder = useDragReorder<HTMLUListElement>({
    describe: (id) => todos.find((todo) => todo.id === id)?.text ?? '',
    onReorder: ({ from, to }) => {
      setTodos((prev) => {
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
    },
  })

  return (
    <>
      <ul ref={reorder.containerRef} className="reorder-list">
        {todos.map((todo) => (
          <li key={todo.id} data-reorder-id={todo.id} className="reorder-item">
            <button {...reorder.getHandleProps({ label: todo.text })}>⠿</button>
            <span>{todo.text}</span>
          </li>
        ))}
      </ul>

      {/* 방향키로 순서를 바꾸는 사람에게는 이 안내가 유일한 피드백이다 */}
      <p role="status" aria-live="polite" className="reorder-announcement">
        {reorder.announcement}
      </p>
    </>
  )
}
```

**항목은 컨테이너의 직계 자식이어야 한다.** `<li>` 안에 다시 감싸면 코어가 항목을 찾지 못한다.

### 손잡이 없이 항목 전체를 끌게 하려면

```tsx
const reorder = useDragReorder({ onReorder, longPressMs: 250 })
```

0.25초 누르고 있으면 드래그가 시작된다. 손가락이 그 전에 움직이면 스크롤로 보고 물러난다 — 그렇지 않으면 목록을 스크롤할 수 없게 된다. 마우스는 기다리지 않고 곧바로 시작한다.

이 방식을 쓰더라도 **손잡이 버튼은 남겨 두라.** 방향키 이동의 진입점이 손잡이이기 때문이다.

## 사용 방법 — 순수 JS (React 없음)

```js
import { createDragReorder } from './createDragReorder.js'

createDragReorder({
  container: document.querySelector('.reorder-list'),
  onReorder: ({ from, to }) => {
    const rows = [...list.children]
    list.insertBefore(rows[from], to > from ? rows[to].nextSibling : rows[to])
  },
})
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 끄는 중에 끊긴다 | `pointercancel`(시스템 제스처·전화 수신), Esc, 창이 포커스를 잃는 경우는 손을 뗀 것이 아니다. 끊긴 자리를 확정하지 않고 원래 자리로 돌린다. `onReorder`는 불리지 않는다. Esc는 여기서 멈춰 뒤의 대화상자를 닫지 않는다 | `assets` |
| 두 번째 손가락이 닿는다 | 처음 잡은 손가락만 따라간다. 두 번째 손가락의 움직임과 뗌은 무시한다 | `assets` |
| 놓은 항목이 정착하는 중(200ms)에 다른 항목을 잡는다 | 정착이 끝날 때까지 새 끌기를 받지 않는다. 정착 중에 위치를 재면 비켜 둔 `transform`이 섞여 자리가 어긋난다 | `assets` |
| 끄는 중에 화면이 바뀐다 | 해제 함수가 `transform`·`data-dragging`·`data-reordering`을 지운다. 순서는 바뀌지 않는다 | `assets` |
| 동작 줄이기를 켰다 | 손가락 추적은 그대로다. 비켜 주기·정착 전환이 없으므로 놓는 즉시 `onReorder`가 온다 | `assets` |
| 항목이 1개다 | 끌면 들렸다가 제자리에 놓이고 `onReorder`는 오지 않는다. 방향키도 무시한다. 손잡이를 숨기는 편이 정직하다 | `assets`(무시) / 숨기기는 프로젝트 |
| 서버 저장이 실패한다 | `onReorder`에서 배열을 먼저 옮기고 저장한다. 실패하면 `from`·`to`를 뒤집어 되돌리고 토스트로 알린다. 저장을 기다린 뒤 옮기면 놓은 항목이 원래 자리로 튀었다가 다시 간다 | 프로젝트 |
| 끄는 중에 목록이 바뀐다(실시간 갱신) | 코어는 잡는 순간의 항목과 위치를 기억한다. 그사이 항목이 더해지거나 빠지면 놓은 자리가 어긋난다. `draggingId`가 있는 동안에는 갱신을 미뤘다가 `null`이 된 뒤에 넣는다 | 프로젝트 |
| 고대비 모드(`forced-colors`) | 그림자가 사라지므로 들어올린 항목에 `outline: 2px solid Highlight`를 준다 | `assets` |
| 항목 전체를 길게 눌러 끈다(`longPressMs`) | 안드로이드 크롬은 길게 누르면 글자 선택·메뉴를 띄운다. 항목에 `user-select: none`과 `-webkit-touch-callout: none`을 준다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 끌기 시작 방식 | `longPressMs` (0이면 손잡이로만) | 0 |
| 들어올린 크기 | `liftScale` | 1.02 |
| 비켜 주기·정착 속도 | `settleMs` + CSS `--reorder-duration` (같이 맞춘다) | 200ms |
| 들어올린 그림자 | `--reorder-lift-shadow` | 층 토큰 `--shadow-overlay`(없으면 `0 2px 6px rgb(0 0 0 / 0.1), 0 24px 64px rgb(0 0 0 / 0.24)`) |
| 손잡이 색 | `--reorder-handle-color` | 색 토큰 `--color-text-tertiary`(없으면 #686868) |
| 화면 낭독 문구 | `messages` — `{ moved({ name, to, total }), handle(label) }`. `to`는 1부터 | 한국어 |

## 함께 쓰는 패턴

- `patterns/flip-list` — 정렬 버튼으로 순서가 바뀌는 목록. 한 목록에 둘 다 쓰면 끄는 동안(`draggingId`가 있는 동안)에는 FLIP 측정을 건너뛴다. 두 코드가 같은 항목의 `transform`을 쓴다.
- `patterns/swipe-to-delete` — 순서 바꾸기는 손잡이에서, 삭제는 행을 밀어서. 손잡이를 쓰고 `longPressMs`는 켜지 않는다.
- `patterns/toast-stack` — 저장 실패를 알리고 되돌린다.
- `patterns/virtual-list` — 함께 쓰지 않는다. 코어는 모든 항목이 DOM에 있다고 보고 위치를 잰다.

## 주의사항

- 손잡이의 누르는 영역은 최소 44×44px이다(`min-width`·`min-height`). 행이 그보다 낮으면 행이 44px로 늘어난다.
- **손잡이는 반드시 `<button>`이어야 한다.** 마우스가 없는 사람에게 드래그는 존재하지 않는 기능이다 — 손잡이에 포커스한 뒤 위/아래 방향키로 옮기는 경로가 유일한 대안이고, 그 경로는 버튼일 때만 열린다. `getHandleProps()`가 `aria-label`에 조작 방법까지 넣어 주는 이유다.
- **방향키 이동은 애니메이션 없이 즉시 확정된다.** 방향키는 연타·길게 누르기로 들어오는데, 이동마다 0.2초를 기다리면 입력이 밀려 어디까지 옮겼는지 알 수 없게 된다. 대신 `announcement`가 "면 삶기 — 3개 중 1번째로 이동"처럼 결과를 읽어 준다.
- **항목 간 간격은 균일하다고 가정한다.** 비켜 주는 거리를 첫 두 항목 사이로 재기 때문이다. 항목의 높이는 서로 달라도 되지만(비켜 주는 거리는 끌리는 항목 기준), 간격이 들쭉날쭉하면 정착 위치가 어긋난다.
- **목록 밖으로 끌 때 자동 스크롤은 없다.** 화면에 보이는 범위 안에서 옮기는 것을 전제한다 — 항목이 수십 개라면 방향키 이동이나 "맨 위로 보내기" 메뉴를 함께 두는 편이 실용적이다.
- **가로 목록은 범위 밖이다** — 세로 이동만 계산한다.
- **reduced-motion 대응 내장** — 손가락 추적은 그대로 두고(조작이지 연출이 아니다) 비켜 주기·정착만 즉시 처리한다.
- 드래그 중 `user-select`를 잠근다 — 그렇지 않으면 드래그가 글자 선택으로 바뀐다.
