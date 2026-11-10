/**
 * 프레임워크 무관 검색 제안 코어 (의존성 0).
 *
 * 입력할 때마다 서버를 부르면 "국수"를 치는 동안 요청이 세 번 나가고, 그 셋이 순서대로
 * 돌아온다는 보장이 없다. 실제로 자주 나는 사고는 **늦게 도착한 옛 응답이 최신 결과를 덮는 것**이다
 * ("국"의 결과가 "국수"의 결과 뒤에 도착해 화면을 되돌린다).
 *
 * 이 코어가 그 둘을 막는다:
 *  - 입력이 멈춘 뒤에 부른다(디바운스) — 글자마다 부르지 않는다
 *  - 요청마다 순번을 매겨, 마지막 순번이 아닌 응답은 버린다 — 그리고 이전 요청은 AbortSignal로 끊는다
 */

export type SuggestStatus = 'idle' | 'loading' | 'ready' | 'error'

export type SuggestState<T> = {
  query: string
  items: T[]
  status: SuggestStatus
}

type CreateSuggestSearchOptions<T> = {
  /** 제안을 가져온다. signal이 끊기면 요청을 취소하도록 fetch에 그대로 넘긴다 */
  fetchSuggestions: (args: { query: string; signal: AbortSignal }) => Promise<T[]>
  /** 입력이 멈추고 이만큼 기다렸다 부른다 (ms, 기본 200) */
  debounceMs?: number
  /** 이 길이 미만이면 아예 부르지 않는다 (기본 1) */
  minLength?: number
  onStateChange: (state: SuggestState<T>) => void
}

export const createSuggestSearch = <T,>({
  fetchSuggestions,
  debounceMs = 200,
  minLength = 1,
  onStateChange,
}: CreateSuggestSearchOptions<T>) => {
  let state: SuggestState<T> = { query: '', items: [], status: 'idle' }
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  let latestSeq = 0
  let destroyed = false

  const update = (patch: Partial<SuggestState<T>>) => {
    if (destroyed) return
    state = { ...state, ...patch }
    onStateChange(state)
  }

  const stopPending = () => {
    clearTimeout(timer)
    controller?.abort()
    controller = undefined
  }

  const run = async (query: string) => {
    const seq = (latestSeq += 1)
    const { signal } = (controller = new AbortController())
    update({ status: 'loading' })

    try {
      const items = await fetchSuggestions({ query, signal })
      // 늦게 도착한 옛 응답은 버린다 — 이것이 검색창에서 가장 흔한 사고다.
      // signal.aborted도 본다: 다음 요청이 디바운스로 아직 안 나간 사이에는 순번이 그대로라서,
      // signal을 무시한 옛 요청이 그 틈에 도착하면 순번만으로는 걸러지지 않는다
      if (seq !== latestSeq || destroyed || signal.aborted) return
      update({ items, status: 'ready' })
    } catch (error) {
      // 우리가 끊은 요청은 무엇을 던지든 실패가 아니다 — fetch는 AbortError를, 다른 클라이언트는 자기 오류를 던진다
      if (seq !== latestSeq || destroyed || signal.aborted) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      update({ items: [], status: 'error' })
    }
  }

  return {
    current: () => state,
    /** 입력이 바뀔 때마다 부른다 */
    setQuery: (query: string) => {
      stopPending()
      const trimmed = query.trim()

      if (trimmed.length < minLength) {
        latestSeq += 1 // 이미 날아간 응답이 돌아와도 무시되게 순번을 올려 둔다
        update({ query, items: [], status: 'idle' })
        return
      }

      update({ query })
      timer = setTimeout(() => void run(trimmed), debounceMs)
    },
    /** 목록을 닫을 때 — 기다리는 요청도 함께 끊는다 */
    cancel: () => {
      stopPending()
      latestSeq += 1
      // 끊은 요청은 끝을 알리지 않는다 — loading에 머물면 다시 열었을 때 "찾는 중"이 끝나지 않는다
      if (state.status === 'loading') update({ status: state.items.length > 0 ? 'ready' : 'idle' })
    },
    destroy: () => {
      destroyed = true
      stopPending()
    },
  }
}
