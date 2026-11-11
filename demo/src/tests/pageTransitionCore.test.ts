import { runPageTransition } from '@skills/page-transition/assets/runPageTransition'

type StartViewTransition = (callback: () => void | Promise<void>) => { finished: Promise<void> }

const withViewTransitions = (impl: StartViewTransition) => {
  Object.defineProperty(document, 'startViewTransition', { value: impl, configurable: true, writable: true })
}

const withoutViewTransitions = () => {
  Reflect.deleteProperty(document, 'startViewTransition')
}

describe('runPageTransition — 방향 표시와 미지원 폴백', () => {
  afterEach(() => {
    withoutViewTransitions()
    delete document.documentElement.dataset.navDirection
  })

  it('전환 중에는 <html>에 방향이 붙고, 끝나면 지워진다', async () => {
    const seen: Array<string | undefined> = []
    withViewTransitions((callback) => {
      seen.push(document.documentElement.dataset.navDirection)
      void callback()
      return { finished: Promise.resolve() }
    })

    await runPageTransition({ direction: 'forward', update: () => {} })

    expect(seen).toEqual(['forward'])
    expect(document.documentElement.dataset.navDirection).toBeUndefined()
  })

  it('화면을 바꾸는 함수는 브라우저 콜백 안에서 불린다 (사진을 찍은 뒤)', async () => {
    const order: string[] = []
    withViewTransitions((callback) => {
      order.push('snapshot')
      void callback()
      return { finished: Promise.resolve() }
    })

    await runPageTransition({
      direction: 'back',
      update: () => order.push('update'),
    })

    expect(order).toEqual(['snapshot', 'update'])
  })

  it('View Transitions를 모르는 브라우저에서는 전환 없이 그냥 바꾼다', async () => {
    withoutViewTransitions()
    const update = vi.fn()

    await runPageTransition({ direction: 'forward', update })

    expect(update).toHaveBeenCalledTimes(1)
    expect(document.documentElement.dataset.navDirection).toBeUndefined()
  })

  it('화면 갱신이 실패해도 방향 표시가 남지 않는다', async () => {
    withoutViewTransitions()

    await expect(
      runPageTransition({
        direction: 'forward',
        update: () => {
          throw new Error('렌더 실패')
        },
      }),
    ).rejects.toThrow('렌더 실패')
    expect(document.documentElement.dataset.navDirection).toBeUndefined()
  })

  it('root를 주면 그 요소에 방향을 붙인다 (스코프 전환)', async () => {
    const host = document.createElement('div')
    withViewTransitions((callback) => {
      expect(host.dataset.navDirection).toBe('forward')
      void callback()
      return { finished: Promise.resolve() }
    })

    await runPageTransition({ direction: 'forward', update: () => {}, root: host })
    expect(host.dataset.navDirection).toBeUndefined()
  })

  it('앞선 전환이 뒤늦게 끝나도 진행 중인 새 전환의 방향 표시를 지우지 않는다', async () => {
    const finishers: Array<() => void> = []
    withViewTransitions((callback) => {
      void callback()
      return { finished: new Promise<void>((resolve) => finishers.push(resolve)) }
    })

    const first = runPageTransition({ direction: 'forward', update: () => {} })
    const second = runPageTransition({ direction: 'back', update: () => {} })
    // 브라우저는 새 전환이 시작되면 앞선 전환을 건너뛰고 곧바로 끝낸다
    finishers[0]()
    await first
    expect(document.documentElement.dataset.navDirection).toBe('back')
    finishers[1]()
    await second
    expect(document.documentElement.dataset.navDirection).toBeUndefined()
  })
})
