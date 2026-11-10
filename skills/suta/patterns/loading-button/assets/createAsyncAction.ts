/**
 * 프레임워크 무관 비동기 액션 상태 기계 (의존성 0).
 *
 * 제출 버튼의 실제 문제는 스피너를 그리는 것이 아니라 시간이다:
 *  - 사용자가 loading 중에 또 누른다 → 요청이 두 번 나간다 (중복 결제·중복 가입)
 *  - 응답이 80ms만에 온다 → 스피너가 깜빡이고 지나가 "눌리긴 한 건가?"가 된다
 *  - 성공 표시를 바로 지운다 → 끝났다는 사실을 못 본다
 * 이 코어가 그 세 가지를 담당한다: 진행 중 재실행 차단, 최소 로딩 유지, 결과 표시 유지 후 복귀.
 *
 * 상태는 idle → loading → success|error → idle 한 방향으로 흐른다.
 * 예외는 하나다: 실패 표시(error) 중에 다시 실행하면 idle을 기다리지 않고 곧바로 loading으로 간다 —
 * 실패한 요청은 다시 보내도 중복이 아니고, 재시도하려는 사용자를 1.8초 세워 둘 이유가 없다.
 */

export type AsyncActionStatus = 'idle' | 'loading' | 'success' | 'error'

export type AsyncActionResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

type AsyncActionTimings = {
  /** 응답이 아무리 빨라도 이만큼은 loading을 유지한다 (ms, 기본 400) — 스피너 깜빡임 방지 */
  minLoadingMs?: number
  /** 성공 표시를 유지하는 시간 (ms, 기본 1200) */
  successHoldMs?: number
  /** 실패 표시를 유지하는 시간 (ms, 기본 1800) — 읽을 시간이 더 필요하다 */
  errorHoldMs?: number
}

type CreateAsyncActionOptions = AsyncActionTimings & {
  onChange: (status: AsyncActionStatus) => void
}

/** 남은 최소 로딩 시간만큼 기다린다 — 이미 지났으면 기다리지 않는다(불필요한 지연 없음) */
const waitRemaining = ({ minLoadingMs, startedAt }: { minLoadingMs: number; startedAt: number }) => {
  const remaining = minLoadingMs - (Date.now() - startedAt)
  if (remaining <= 0) return Promise.resolve()
  return new Promise<void>((resolve) => setTimeout(resolve, remaining))
}

export const createAsyncAction = ({ onChange, ...initialTimings }: CreateAsyncActionOptions) => {
  let minLoadingMs = initialTimings.minLoadingMs ?? 400
  let successHoldMs = initialTimings.successHoldMs ?? 1200
  let errorHoldMs = initialTimings.errorHoldMs ?? 1800
  let status: AsyncActionStatus = 'idle'
  let holdTimer: ReturnType<typeof setTimeout> | undefined
  let destroyed = false

  const setStatus = (next: AsyncActionStatus) => {
    if (destroyed || next === status) return
    status = next
    onChange(next)
  }

  const holdThenReset = (ms: number) => {
    clearTimeout(holdTimer)
    holdTimer = setTimeout(() => setStatus('idle'), ms)
  }

  /**
   * task를 실행하고 상태를 굴린다. 이미 진행 중이거나 완료 표시 중이면 실행하지 않고
   * { ok: false, error: 'busy' }를 돌려준다 — 이것이 중복 제출 차단이다.
   * 실패 표시 중에는 막지 않는다(재시도).
   */
  const run = async <T,>(task: () => Promise<T>): Promise<AsyncActionResult<T>> => {
    if (destroyed || status === 'loading' || status === 'success') return { ok: false, error: new Error('busy') }
    // 실패 표시를 유지하던 타이머가 남아 있으면 재시도 중인 상태를 idle로 되돌린다 — 먼저 끈다
    clearTimeout(holdTimer)
    setStatus('loading')
    const startedAt = Date.now()

    try {
      const value = await task()
      await waitRemaining({ minLoadingMs, startedAt })
      setStatus('success')
      holdThenReset(successHoldMs)
      return { ok: true, value }
    } catch (error) {
      await waitRemaining({ minLoadingMs, startedAt })
      setStatus('error')
      holdThenReset(errorHoldMs)
      return { ok: false, error }
    }
  }

  return {
    run,
    current: () => status,
    /** 시간 값을 바꾼다 — 빠진 값은 그대로 둔다. 진행 중인 실행에는 닿지 않고 다음 실행부터 쓰인다 */
    setOptions: (next: AsyncActionTimings) => {
      minLoadingMs = next.minLoadingMs ?? minLoadingMs
      successHoldMs = next.successHoldMs ?? successHoldMs
      errorHoldMs = next.errorHoldMs ?? errorHoldMs
    },
    /** 결과 표시를 기다리지 않고 즉시 되돌린다 (폼을 다시 열 때 등) */
    reset: () => {
      clearTimeout(holdTimer)
      setStatus('idle')
    },
    destroy: () => {
      clearTimeout(holdTimer)
      destroyed = true // 언마운트 뒤 늦게 도착한 응답이 상태를 건드리지 못한다
    },
  }
}

export type AsyncActionController = ReturnType<typeof createAsyncAction>
