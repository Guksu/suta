import { assignTransitionNames, clearTransitionNames, runCardExpand } from '@skills/card-expand/assets/runCardExpand'

type StartViewTransition = (callback: () => void | Promise<void>) => { finished: Promise<void> }

const root = () => document.documentElement

const withViewTransitions = (impl: StartViewTransition) => {
  Object.defineProperty(document, 'startViewTransition', { value: impl, configurable: true, writable: true })
}

const withoutViewTransitions = () => Reflect.deleteProperty(document, 'startViewTransition')

/** 카드 하나 — 그림·제목 부위가 data-card-expand-part로 표시돼 있다 */
const makeCard = () => {
  const card = document.createElement('div')
  card.innerHTML = '<span data-card-expand-part="media"><img alt="" src="janchi.webp"></span><span data-card-expand-part="title">잔치국수</span>'
  document.body.appendChild(card)
  const part = (name: string) => card.querySelector<HTMLElement>(`[data-card-expand-part="${name}"]`)!
  return { card, media: part('media'), title: part('title') }
}

describe('assignTransitionNames / clearTransitionNames — 공유 요소 이름 붙이고 떼기', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('요소와 그림·제목 부위에 기본 이름을 붙인다', () => {
    const { card, media, title } = makeCard()

    assignTransitionNames({ element: card })

    expect(card.style.viewTransitionName).toBe('card-expand')
    expect(media.style.viewTransitionName).toBe('card-expand-media')
    expect(title.style.viewTransitionName).toBe('card-expand-title')
  })

  it('이름을 바꿔 줄 수 있고(여러 목록 공존), clear하면 전부 지워진다', () => {
    const { card, media, title } = makeCard()

    assignTransitionNames({ element: card, names: { root: 'today' } })
    expect(card.style.viewTransitionName).toBe('today')
    expect(media.style.viewTransitionName).toBe('today-media')
    expect(title.style.viewTransitionName).toBe('today-title')

    clearTransitionNames({ element: card })
    expect(card.style.viewTransitionName).toBe('')
    expect(media.style.viewTransitionName).toBe('')
    expect(title.style.viewTransitionName).toBe('')
  })
})

describe('runCardExpand — 이름 부여 순서와 미지원 폴백', () => {
  afterEach(() => {
    withoutViewTransitions()
    delete root().dataset.cardExpand
    root().style.viewTransitionName = ''
    document.body.innerHTML = ''
  })

  it('View Transitions를 모르는 브라우저에서는 전환 없이 그냥 바꾸고 이름도 남기지 않는다', async () => {
    withoutViewTransitions()
    const { card, media } = makeCard()
    const update = vi.fn()

    await runCardExpand({ direction: 'open', from: card, update })

    expect(update).toHaveBeenCalledTimes(1)
    expect(card.style.viewTransitionName).toBe('')
    expect(media.style.viewTransitionName).toBe('')
    expect(root().dataset.cardExpand).toBeUndefined()
  })

  it('폴백 경로에서 화면 갱신이 실패해도 방향 표시가 남지 않는다', async () => {
    withoutViewTransitions()
    const { card } = makeCard()

    await expect(
      runCardExpand({
        direction: 'open',
        from: card,
        update: () => {
          throw new Error('렌더 실패')
        },
      }),
    ).rejects.toThrow('렌더 실패')
    expect(root().dataset.cardExpand).toBeUndefined()
    expect(card.style.viewTransitionName).toBe('')
  })

  it('사진 찍는 순간엔 출발 요소에, 갱신 뒤엔 도착 요소에만 이름이 있고, 끝나면 전부 지워진다', async () => {
    const { card, media } = makeCard()
    const detail = document.createElement('article')
    detail.innerHTML = '<div data-card-expand-part="media"><img alt="잔치국수" src="janchi.webp"></div>'
    const seen: Record<string, unknown> = {}

    withViewTransitions((callback) => {
      // old 스냅샷 시점: 클릭한 카드만 이름을 가진다. 페이지 전체(root)는 전환에서 빠진다
      seen.beforeCard = card.style.viewTransitionName
      seen.beforeRoot = root().style.viewTransitionName
      seen.direction = root().dataset.cardExpand
      void callback()
      // new 스냅샷 시점: 같은 이름이 두 요소에 있으면 브라우저가 전환을 통째로 건너뛴다 — 카드는 비워지고 상세만 가진다
      seen.afterCard = card.style.viewTransitionName
      seen.afterCardMedia = media.style.viewTransitionName
      seen.afterDetail = detail.style.viewTransitionName
      seen.afterDetailMedia = detail.querySelector<HTMLElement>('[data-card-expand-part="media"]')!.style.viewTransitionName
      return { finished: Promise.resolve() }
    })

    await runCardExpand({
      direction: 'open',
      from: card,
      update: () => document.body.appendChild(detail),
      to: () => detail,
    })

    expect(seen).toEqual({
      beforeCard: 'card-expand',
      beforeRoot: 'none',
      direction: 'open',
      afterCard: '',
      afterCardMedia: '',
      afterDetail: 'card-expand',
      afterDetailMedia: 'card-expand-media',
    })
    expect(card.style.viewTransitionName).toBe('')
    expect(detail.style.viewTransitionName).toBe('')
    expect(root().style.viewTransitionName).toBe('')
    expect(root().dataset.cardExpand).toBeUndefined()
  })

  it('닫을 때(close) 도착 요소가 없어도(to가 null) 전환은 진행되고, page-transition이 꺼 둔 root 이름은 원래대로 복원된다', async () => {
    root().style.viewTransitionName = 'none'
    const detail = document.createElement('article')
    document.body.appendChild(detail)
    const order: string[] = []

    withViewTransitions((callback) => {
      order.push(`snapshot:${root().dataset.cardExpand}`)
      void callback()
      return { finished: Promise.resolve() }
    })

    await runCardExpand({
      direction: 'close',
      from: detail,
      update: () => order.push('update'),
      to: () => null,
    })

    expect(order).toEqual(['snapshot:close', 'update'])
    expect(detail.style.viewTransitionName).toBe('')
    expect(root().style.viewTransitionName).toBe('none')
    expect(root().dataset.cardExpand).toBeUndefined()
  })
})

describe('runCardExpand — 겹친 전환', () => {
  afterEach(() => {
    withoutViewTransitions()
    document.body.innerHTML = ''
    root().style.viewTransitionName = ''
    delete root().dataset.cardExpand
  })

  it('전환이 겹쳐도 끝난 뒤 root의 이름이 none으로 남지 않고, 늦게 끝난 앞선 전환이 방향 표시를 지우지 않는다', async () => {
    const { card } = makeCard()
    const finishers: Array<() => void> = []
    withViewTransitions((callback) => {
      void callback()
      return { finished: new Promise<void>((resolve) => finishers.push(resolve)) }
    })

    const first = runCardExpand({ direction: 'open', from: card, update: () => {} })
    const second = runCardExpand({ direction: 'close', from: card, update: () => {} })
    finishers[0]()
    await first
    // 두 번째 전환이 아직 돈다 — 방향과 root 제외가 그대로여야 한다
    expect(root().dataset.cardExpand).toBe('close')
    expect(root().style.viewTransitionName).toBe('none')
    finishers[1]()
    await second
    expect(root().style.viewTransitionName).toBe('')
    expect(root().dataset.cardExpand).toBeUndefined()
  })
})
