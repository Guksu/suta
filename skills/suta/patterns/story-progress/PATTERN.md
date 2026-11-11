---
name: story-progress
description: 스토리 화면 상단의 구간별 진행 막대(story progress)를 구현한다 — 자동 재생으로 칸이 차오르면 다음 장면으로 넘어가고, 길게 누르면 멈추고, 탭으로 이전·다음 이동. "스토리 진행바, 인스타 스토리 상단 바, 자동으로 넘어가는 온보딩, 쇼츠 진행 표시" 요청과 스토리·온보딩 화면에 쓴다. 기존 적용분의 구간 시간·구간 수 수정에도 쓴다.
---

# story-progress — 스토리 프로그레스

라이브 데모: https://guksu.github.io/suta/#/story-progress

## 언제 쓰는가

여러 장면이 자동으로 넘어가는 스토리형 UI — 상단에 구간 막대가 차오르고, 길게 누르면 멈추고, 좌우 탭으로 이전/다음 장면으로 이동하는 관례. 온보딩 슬라이드 자동 재생에도 같은 패턴이 쓰인다.

**기술 선택:** rAF로 `transform: scaleX`를 직접 구동한다(GPU 속성만). CSS animation 대신 rAF인 이유: 일시정지·재개·임의 구간 이동을 프레임 정확도로 제어해야 하기 때문이다 — CSS animation의 play-state 제어는 재개 지점·구간 이동 조합에서 금세 꼬인다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/createStoryProgress.ts` | 코어 — 진행·일시정지·이동 상태 머신 | 모든 프로젝트 |
| `assets/story-progress.css` | 막대 모양 정의 | 모든 프로젝트 |
| `assets/useStoryProgress.ts` | React 훅 | React 프로젝트만 |

TS가 아닌 프로젝트에 복사할 때는 타입 표기를 벗겨 .js로 저장한다.

## 사용 방법 — React

```tsx
import { useStoryProgress } from './useStoryProgress'

const SCENES = ['첫 장면', '두 번째 장면', '세 번째 장면']

const Story = () => {
  const story = useStoryProgress({ count: SCENES.length, durationMs: 4000 })

  return (
    <div
      onPointerDown={story.pause}
      onPointerUp={story.resume}
      onPointerLeave={story.resume}
      onPointerCancel={story.resume}
    >
      <div className="story-bars">
        {SCENES.map((scene, index) => (
          <span key={scene} className="story-bar">
            <span ref={story.registerBar(index)} className="story-bar-fill" />
          </span>
        ))}
      </div>
      <section>{SCENES[story.index]}</section>
      {/* tapPrev·tapNext — 길게 눌렀다 뗀 click은 넘기지 않는다. 짧은 탭과 키보드 Enter만 넘긴다 */}
      <button type="button" onClick={story.tapPrev} aria-label="이전 장면" />
      <button type="button" onClick={story.tapNext} aria-label="다음 장면" />
    </div>
  )
}
```

훅이 돌려주는 것: `registerBar` · `index` · `pause`·`resume` · `next`·`prev`(무조건 이동) · `tapNext`·`tapPrev`(탭 영역용) · `restart`.

## 사용 방법 — 순수 JS (React 없음)

```js
import { createStoryProgress } from './createStoryProgress.js'

const story = createStoryProgress({
  bars: [...document.querySelectorAll('.story-bar-fill')],
  durationMs: 4000,
  onIndexChange: (index) => showScene(index),
  onComplete: () => closeStory(),
})
story.start()
viewer.addEventListener('pointerdown', story.pause)
viewer.addEventListener('pointerup', story.resume)
viewer.addEventListener('pointercancel', story.resume)
// 길게 눌렀다 뗀 손가락도 click을 낸다 — 200ms 넘게 누른 뒤의 click은 넘기지 않는다
nextArea.addEventListener('click', () => { if (story.takeHoldMs() < 200) story.next() })
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 길게 눌러 멈췄다 손을 뗀다 | 그 자리에서 이어 재생한다. 뗄 때 나는 click으로 다음 장면에 넘어가지 않는다. 200ms 안에 뗀 짧은 탭과 키보드 Enter만 넘긴다 | `assets` — 훅의 `tapNext`·`tapPrev`(`holdThresholdMs`), 코어의 `takeHoldMs` |
| 탭이 가려졌다 돌아온다(앱 전환·화면 잠금) | 가려진 동안의 시간은 세지 않는다. 돌아오면 보던 장면이 멈췄던 자리에서 이어진다. 프레임 사이가 250ms를 넘으면 가려졌던 것으로 본다 | `assets` |
| 마지막 장면까지 끝났다 | `onComplete`가 한 번 불린다. 그 뒤 화면을 눌렀다 떼도(`pause`·`resume`) 다시 불리지 않는다. 마지막 장에서 "다음"을 누르면 닫으려는 것이므로 `onComplete`를 부른다. "이전"을 누르면 앞 장면에서 다시 재생된다 | `assets` |
| 첫 장면에서 "이전"을 누른다 | 첫 장면을 처음부터 다시 채운다. 앞 스토리로 넘기려면 `index === 0`일 때의 탭을 따로 처리한다 | `assets` / 앞 스토리는 `프로젝트` |
| 장면마다 길이가 다르다(글이 긴 장면, 영상) | `durationMs`에 함수를 넘긴다(`(index) => SCENES[index].ms`). 훅은 `durationMs`가 바뀌어도 첫 장면으로 돌아가지 않고 지금 구간부터 새 시간을 쓴다 | `assets` |
| 장면의 사진·영상이 아직 오지 않았다 | 막대만 먼저 차면 빈 화면을 보다 넘어간다. 장면이 바뀔 때 `pause()`하고 `onLoad`에서 `resume()`한다. 다음 장면의 사진을 미리 받아 둔다 | `프로젝트` |
| 장면이 0개·1개다 | 1개면 막대 하나가 차고 `onComplete`가 불린다. 0개면 `durationMs` 뒤에 `onComplete`만 불리므로, 장면이 없을 때는 스토리를 열지 않는다 | `assets` / 0개는 `프로젝트` |
| 장면이 많다 | 막대는 폭을 똑같이 나눈다(`flex: 1`, 사이 4px). 320px 화면에서 25개를 넘으면 막대 하나가 8px 아래로 내려가 진행이 읽히지 않는다. 묶음을 나누거나 "3 / 40" 숫자로 바꾼다 | `프로젝트` |
| 키보드·화면 낭독기로 본다 | 길게 누르기를 쓸 수 없다. 보이는 일시정지 버튼(`aria-pressed`)을 두고 `pause`·`resume`에 잇는다. 이전·다음 영역은 `button`이라 Tab과 Enter로 닿는다. 장면 글을 `aria-live`에 넣지 않는다(몇 초마다 읽힌다) | 이동은 `assets`. 일시정지 버튼은 `프로젝트` |
| 밝은 사진 위, 고대비 모드, `dir="rtl"` | 흰 막대는 밝은 사진에서 묻힌다. 위쪽에 어두운 그라데이션 띠(64px, 검정 40% → 0%)를 깐다. 고대비 모드에서는 트랙을 `GrayText`, 채움을 `CanvasText`로 칠한다. `rtl`에서는 막대가 오른쪽부터 놓이고 오른쪽에서 차오른다 | 고대비·`rtl`은 `assets`. 띠와 좌우 탭 영역 뒤집기는 `프로젝트` |

## 커스터마이즈 포인트

| 대상 | 방법 |
|------|------|
| 구간 시간 | `durationMs` (기본 5000ms — 텍스트 장면은 길게, 이미지 장면은 짧게). 숫자나 `(index) => ms` 함수 |
| 길게 누름 판정 | `holdThresholdMs` (기본 200ms — 이보다 오래 눌렀다 떼면 장면을 넘기지 않는다) |
| 막대 두께·색 | `--story-bar-height`·`--story-bar-color` |
| 장면 전환 | `onIndexChange(index)`에서 배경 콘텐츠를 갈아 끼운다 |
| 끝났을 때 | `onComplete` — 닫기·다음 스토리로 |

## 함께 쓰는 패턴

- `patterns/swipe-dismiss-viewer` — 스토리를 아래로 끌어 닫을 때. 끄는 동안 `pause()`하고, 닫지 않고 돌아오면 `resume()`한다.
- `patterns/carousel` — 사용자가 직접 넘기는 슬라이드는 캐러셀이다. 시간이 넘기는 화면에만 이 패턴을 쓴다. 한 화면에 둘을 겹치지 않는다.
- `patterns/zoom-lightbox` — 목록의 썸네일에서 스토리로 들어가는 전환. 열림 전환이 끝난 뒤에 `start()`한다.

## 주의사항

- **길게 눌러 일시정지는 필수 관례다** — 사용자가 읽는 속도를 통제할 수단이 없으면 접근성 문제다(WCAG 2.2.2). 예시처럼 pointerdown/up에 pause/resume을 연결하라.
- 길게 누르면 모바일 브라우저가 사진 저장 메뉴나 글자 선택을 띄운다. 뷰어에 `user-select: none`과 `-webkit-touch-callout: none`을 주고, 사진에는 `draggable={false}`를 준다.
- `pause()`는 재생 중일 때만, `resume()`은 `pause()`로 멈춘 상태일 때만 동작한다. 시작 전·끝난 뒤·`stop()` 뒤의 `resume()`은 아무것도 하지 않는다. 그래서 `onPointerLeave`에 `resume`을 그냥 달아도 된다.
- 진행 막대는 상태 표시이므로 reduced-motion에서도 유지한다 — 끄면 "언제 넘어가는지"를 알 수 없게 되어 오히려 해롭다. 대신 장면 전환 효과를 넣는다면 그쪽을 완화하라.
- `.story-bar-fill`에 transition을 추가하지 마라 — rAF가 매 프레임 값을 쓰므로 뒤처져 보인다.
- 배경 콘텐츠(이미지 프리로드 등)는 이 패턴 범위 밖이다 — 진행 상태 머신만 담당한다.
