# enter-exit 엣지 케이스

## transitionend는 요소 자신의 것만 받는다

`createPresence`는 퇴장 중인 요소에서 `transitionend`/`animationend`를 듣는다. 안쪽 요소(버튼의 hover 전이 등)의 이벤트는 버블링되어 올라오지만 `event.target`이 요소 자신이 아니면 무시한다.

남는 경우는 요소 자신에 걸린 다른 전이다. `.fx` 요소에 `background-color 100ms` 같은 더 짧은 전이를 더하고 퇴장 때 그 값도 바뀌면, 그 이벤트가 먼저 와서 퇴장이 100ms에 끝난다. 퇴장 때 바뀌는 속성의 시간을 `--fx-duration`과 같게 맞춘다.

## 이벤트가 유실되는 환경

`display: none` 전환, 백그라운드 탭, 전이 없이 그려지는 경우(`transition: none`)에는 `transitionend`가 아예 오지 않는다. `timeoutMs` 폴백이 이를 위한 안전망이므로 지우지 않는다.

## 재진입 (빠른 토글)

exiting 중 `show`가 다시 true가 되면 언마운트 없이 곧바로 entered로 되돌아간다. CSS transition이 현재 값에서 이어서 뒤집으므로 끊김이 없다. 토글을 연타해도 요소가 사라졌다 다시 마운트되지 않는다 — 입력 포커스·스크롤 위치가 보존된다.

반대로 entering 중(아직 한 번도 그려지지 않은 두 프레임)에 `hide`가 오면 기다리지 않고 바로 끝낸다. entering과 exiting은 스타일이 같아 전이가 일어나지 않기 때문이다.

## React StrictMode

개발 모드의 StrictMode는 마운트 때 effect를 정리했다가 다시 돌린다. `Presence`는 정리할 때 컨트롤러를 버리고 다시 돌 때 새로 만든다. 이 처리를 지우면 처음부터 `show`인 요소가 `entering`(투명)에 멈춘다.

## 리스트 아이템에는 부적합

여러 항목이 동시에 나가고 들어오는 리스트(추가/삭제/정렬)는 항목별 Presence로는 재배치 애니메이션이 안 된다 — `patterns/flip-list`가 맡는 영역이다.
