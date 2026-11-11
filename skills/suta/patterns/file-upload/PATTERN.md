---
name: file-upload
description: 파일 끌어다 놓기 업로드(file upload, drop zone) 영역을 구현한다 — 파일을 끌어오면 테두리가 살아나고, 놓으면 미리보기와 진행률이 보이며, 형식·용량·개수에 안 맞는 파일은 이유와 함께 거절한다. "파일 업로드, 드래그 앤 드롭 업로드, 이미지 첨부, 사진 올리는 기능, 드롭존" 요청에 쓴다. 기존 적용분의 용량 제한·허용 형식·개수 수정에도 쓴다.
---

# file-upload — 끌어다 놓는 파일 업로드

라이브 데모: https://guksu.github.io/suta/#/file-upload

## 언제 쓰는가

리뷰 사진 첨부, 프로필 이미지, 서류 제출처럼 **사용자가 파일을 올리는 모든 곳**에. 파일이 하나뿐이고 이미지도 아니라면 그냥 `<input type="file">` 하나로 충분하다 — 이 패턴은 **여러 개를 올리거나, 미리보기·진행률을 보여줘야 할 때** 값을 한다.

**기술 선택:** 네이티브 `<input type="file">` + HTML5 드래그 앤 드롭. 라이브러리 불필요. 업로드 자체(fetch·XHR)는 이 패턴 밖이다 — 인증·재시도·저장소가 프로젝트마다 다르기 때문이다. 이 패턴은 **파일을 받아 내는 데까지**를 담당하고 진행률은 값으로 받아 그린다.

| 파일 | 층 | 복사 대상 |
|------|-----|----------|
| `assets/validateFiles.ts` | 검증 (순수 함수, DOM 없음) — 형식·용량·개수와 거절 사유 | 모든 프로젝트 |
| `assets/createDropZone.ts` | 코어 — 끌기 판정·기본 동작 차단 | 모든 프로젝트 |
| `assets/FileDropZone.tsx` | React 컴포넌트 — 미리보기·진행률·지우기 | React 프로젝트만 |
| `assets/file-upload.css` | 영역·목록·진행 막대 | 모든 프로젝트 |

## 브라우저 기본 동작이 방해가 되는 드문 경우다

| 함정 | 증상 | 처리 |
|------|------|------|
| `dragover`에서 `preventDefault`를 안 한다 | **`drop`이 아예 오지 않는다** — 가장 흔한 원인 | 코어가 막는다 |
| 영역 밖에 파일을 놓는다 | 브라우저가 그 파일을 탭에 열어 **작성 중이던 화면이 사라진다** | 창 전체의 드롭을 삼킨다(`blockWindowDrop`) |
| `dragenter`/`dragleave`를 그대로 쓴다 | 자식 위를 지날 때마다 테두리가 깜빡인다 | 들어온 횟수를 세어 0일 때만 벗어난 것으로 본다 |
| 같은 파일을 다시 고른다 | 두 번째 선택에서 `change`가 오지 않는다 | 고른 뒤 input 값을 비운다 |
| 미리보기를 objectURL로 만든다 | 되돌려 주지 않으면 메모리에 남는다 | 목록에서 빠질 때 `revokeObjectURL` |

## 사용 방법 — React

컴포넌트는 **파일 목록을 받아 그리기만 한다.** 업로드와 진행률은 화면 쪽이 소유한다.

```tsx
import { useState } from 'react'
import { FileDropZone, type UploadFile } from './FileDropZone'

const ReviewPhotos = () => {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [message, setMessage] = useState('')

  const add = (accepted: File[]) => {
    const added = accepted.map((file) => ({ id: crypto.randomUUID(), file, progress: 0 }))
    setFiles((prev) => [...prev, ...added])
    added.forEach(({ id, file }) => upload({ id, file }))
  }

  return (
    <>
      <FileDropZone
        files={files}
        onAdd={add}
        onRemove={(id) => {
          abort(id) // 올리는 중이면 요청을 끊는다 — 아래 예시
          setFiles((prev) => prev.filter((item) => item.id !== id))
        }}
        onRetry={(id) => {
          const item = files.find((entry) => entry.id === id)
          if (!item) return
          setFiles((prev) => prev.map((entry) => (entry.id === id ? { ...entry, progress: 0, error: undefined } : entry)))
          upload({ id, file: item.file })
        }}
        onReject={(rejections) => setMessage(describeRejections(rejections))}
        accept="image/*"
        maxSizeBytes={5 * 1024 * 1024}
        maxFiles={5}
      />
      <p role="alert">{message}</p>
    </>
  )
}
```

### 진행률 잇기 — `fetch`가 아니라 `XMLHttpRequest`

업로드 진행률은 `fetch`로는 알 수 없다(요청 본문의 진행 이벤트가 없다). 진행 막대가 필요하면 XHR을 쓴다:

```ts
const requests = new Map<string, XMLHttpRequest>()
const abort = (id: string) => requests.get(id)?.abort()

const upload = ({ id, file }: { id: string; file: File }) => {
  const body = new FormData()
  body.append('photo', file)

  const request = new XMLHttpRequest()
  requests.set(id, request)
  const fail = (error: string) => setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, error } : item)))
  request.upload.addEventListener('progress', (event) => {
    if (!event.lengthComputable) return
    const progress = (event.loaded / event.total) * 100
    setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, progress } : item)))
  })
  request.addEventListener('load', () => {
    if (request.status >= 400) return fail('올리지 못했어요')
    setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, progress: 100 } : item)))
  })
  // 서버가 답하지 않은 경우(연결 끊김·시간 초과)는 load가 아니라 여기로 온다
  request.addEventListener('error', () => fail('연결이 끊겼어요'))
  request.addEventListener('timeout', () => fail('시간이 너무 오래 걸려요'))
  request.addEventListener('loadend', () => requests.delete(id))
  request.timeout = 60_000
  request.open('POST', '/api/photos')
  request.send(body)
}
```

화면을 떠날 때(언마운트)는 `requests`에 남은 요청을 모두 `abort()`한다. 그러지 않으면 사라진 화면의 상태를 계속 고치려 든다.

### 거절 사유를 사람 말로

`onReject`는 이유(`type`·`size`·`count`·`empty`·`duplicate`)를 파일과 함께 준다. **"업로드 실패"만 띄우면 무엇을 고쳐야 할지 알 수 없다.**

```ts
const describeRejections = (rejections: FileRejection[]) =>
  rejections
    .map(({ file, reason }) =>
      reason === 'type' ? `${file.name}: 이미지만 올릴 수 있어요`
      : reason === 'size' ? `${file.name}: 5MB를 넘어요`
      : reason === 'empty' ? `${file.name}: 내용이 없는 파일이에요`
      : reason === 'duplicate' ? `${file.name}: 이미 올린 파일이에요`
      : `${file.name}: 최대 5장까지만 올릴 수 있어요`,
    )
    .join('\n')
```

## 사용 방법 — 순수 JS (React 없음)

```js
import { createDropZone } from './createDropZone.js'
import { validateFiles } from './validateFiles.js'

const held = [] // 이미 담긴 File들

createDropZone({
  zone: document.querySelector('.upload-zone'),
  isDisabled: () => held.length >= 5, // 다 찼으면 테두리가 살아나지 않고 놓아도 받지 않는다
  onDrop: (files) => {
    const { accepted, rejected } = validateFiles({
      files,
      accept: 'image/*',
      maxSizeBytes: 5e6,
      maxFiles: 5,
      currentCount: held.length,
      existing: held, // 주면 같은 파일을 duplicate로 거절한다
    })
    held.push(...accepted)
    accepted.forEach(upload)
    rejected.forEach(showReason)
  },
})
```

## 상태와 경계

패턴을 붙인 뒤 화면에서 생기는 상황이다. "처리"가 `assets`면 이 패턴의 코드가 하고, `프로젝트`면 옮기는 쪽에서 챙긴다.

| 상황 | 어떻게 되어야 하나 | 처리 |
|---|---|---|
| 0바이트 파일이나 폴더를 놓는다 | `empty`로 거절한다. 폴더는 브라우저와 운영체제에 따라 크기 0에 형식이 없는 파일로 들어오기도 한다. `accept`가 있으면 형식에서 먼저 걸려 `type`이 된다 | `assets` — `validateFiles` |
| 이미 담긴 파일을 다시 고른다 | 이름·크기·수정 시각이 같으면 `duplicate`로 거절한다. 한 번에 고른 묶음 안에서도 하나만 받는다. 겹친 파일은 개수 자리를 쓰지 않는다 | `assets` — `validateFiles`의 `existing` |
| 개수가 다 찼다 | 영역이 `opacity: 0.55`로 흐려지고 input이 `disabled`가 된다. 파일을 끌어와도 테두리가 살아나지 않고 커서가 "금지"가 된다. 안내 문구는 바뀌지 않으므로 `children`에서 "5장을 모두 채웠어요"로 바꾼다 | `assets`(잠금) / 문구는 프로젝트 |
| `maxFiles`가 1인데 다른 파일로 바꾸려 한다 | 한 장이 담기면 영역이 잠긴다. 먼저 지워야 새로 고를 수 있다. 고르는 즉시 바꾸게 하려면 `maxFiles`를 주지 않고 `onAdd`에서 마지막 한 장만 남긴다 | 프로젝트 |
| 거절한다 | 사유는 영역 바로 아래 `role="alert"` 문단에 파일 이름과 함께 적는다. 다음에 파일이 받아들여지면 그 문단을 비운다 | 프로젝트 — `onReject` |
| 업로드가 실패한다 | 그 행의 테두리와 크기 자리 글자가 `--upload-error` 색이 되고 `error` 문구가 크기 대신 보인다. 진행 막대는 내려간다. `onRetry`를 주면 그 행에 "다시 시도" 버튼(높이 44px)이 생긴다 | `assets`(표시·버튼) / 다시 올리기는 프로젝트 |
| 올리는 중에 지우거나 화면을 떠난다 | 행은 바로 사라진다. 요청은 스스로 끊기지 않으므로 `onRemove`와 언마운트에서 `abort()`한다 | 프로젝트 |
| 진행 이벤트가 초당 수십 번 온다 | 미리보기 주소는 `File`마다 한 번만 만든다. 진행률로 목록 배열이 바뀌어도 사진을 다시 그리지 않는다. 목록에서 빠질 때와 언마운트 때 `revokeObjectURL`한다 | `assets` |
| 키보드로 파일을 지운다 | 지운 행의 버튼이 사라지므로 포커스를 다음 행의 지우기 버튼으로 옮긴다. 마지막 행이었으면 앞 행, 다 지웠으면 파일 고르기 input으로 간다 | `assets`(React) |
| 형식 정보가 없는 파일(일부 기기의 HEIC, `.md`) | `File.type`이 빈 문자열이라 `image/*`에 맞지 않는다. 받으려면 확장자를 함께 적는다(`image/*,.heic`). 브라우저가 그리지 못하는 형식은 미리보기가 깨진 그림으로 보이므로 서버가 만든 축소판으로 바꾼다 | 프로젝트 |

## 커스터마이즈 포인트

| 대상 | 방법 | 기본값 |
|------|------|--------|
| 받을 형식 | `accept` — `"image/*"`·`".pdf"`·`"image/png,.heic"` | 제한 없음 |
| 용량·개수 | `maxSizeBytes`·`maxFiles` | 제한 없음 |
| 안내 문구 | `children`으로 직접 그린다 | 기본 문구 + 제한 요약 |
| 색 | `--upload-accent`·`--upload-border`·`--upload-error` | 거의 검정(#1c1c1c) / 회색 / 빨강 |
| 창 전체 드롭 차단 | `blockWindowDrop` (코어) | 켜짐 |
| 받지 않는 상태 | `disabled`(React) · `isDisabled`(코어 — 함수로 넘겨 그때그때 묻는다) | 꺼짐 |
| 안내·낭독 문구 | 안내는 `children`, 버튼·진행 막대 이름은 `labels` — `{ uploading(name), remove(name), retry(name), retryText }`. 일부만 넘기면 나머지는 기본 문구다 | 한국어 |

## 함께 쓰는 패턴

- `patterns/toast-stack` — 모두 올라간 뒤의 "사진 3장을 올렸어요" 한 줄. 거절 사유는 토스트로 띄우지 않는다. 사라지면 무엇을 고칠지 다시 볼 수 없다.
- `patterns/modal-dialog` — 올리는 중인 파일이 있는데 화면을 닫으려 할 때의 확인창. 확인하면 남은 요청을 `abort()`한다.
- `patterns/loading-button` — 폼의 제출 버튼. 올리는 중인 파일이 있으면 제출을 잠그고 "사진 올리는 중"으로 이유를 보인다.

## 주의사항

- **끌어다 놓기만으로는 부족하다.** 키보드만 쓰는 사람에게 드래그는 존재하지 않는 기능이다 — 영역 전체가 파일 선택 버튼을 겸하도록 라벨로 감쌌고, Tab → Enter로 열린다. 숨긴 input에 `display: none`을 쓰면 포커스가 닿지 않으니 그렇게 감추지 말라.
- **클라이언트 검증은 UX이지 보안이 아니다.** `accept`도 용량 제한도 사용자가 우회할 수 있다 — **서버에서 다시 검사한다.**
- **이미지 미리보기는 원본을 그대로 그린다.** 10MB짜리 사진 다섯 장이면 브라우저가 무거워지므로, 목록이 길어질 수 있는 화면에서는 캔버스로 축소한 뒤 보여주는 편이 낫다.
- **모바일 카메라로 바로 찍게 하려면** `<input>`에 `capture` 속성이 따로 필요하다(이 컴포넌트는 넘기지 않는다).
- **폴더 끌어다 놓기는 범위 밖이다** — 폴더는 `dataTransfer.items`의 별도 API로 훑어야 하고, 그 안에서 다시 재귀 탐색이 필요하다.
- **진행률은 `fetch`로 알 수 없다** — 위의 XHR 예시를 쓴다.
- 붙여넣기(Ctrl+V로 캡처 붙이기)는 받지 않는다. 필요하면 `paste` 이벤트의 `clipboardData.files`를 `validateFiles`에 넘긴다.
- 겹침은 내용이 아니라 이름·크기·수정 시각으로 가린다. 내용이 같아도 이름을 바꾼 파일은 다른 파일로 받는다.
- 실패 문구(`error`)는 행 안에 조용히 바뀐다. 스크린 리더에 알리려면 화면의 `role="alert"` 문단에 "사진 1장을 올리지 못했어요"처럼 한 번 적는다. 행마다 알리면 여러 장이 실패할 때 낭독이 겹친다.
- **reduced-motion 대응 내장** — 목록 등장 연출은 사라지지만 진행 막대의 전이는 남는다. 그것은 연출이 아니라 "얼마나 왔는지"를 잇는 정보다.
