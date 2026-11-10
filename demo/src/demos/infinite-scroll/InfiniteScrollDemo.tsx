import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useInfiniteScroll } from '@skills/infinite-scroll/assets/useInfiniteScroll'
import '@skills/infinite-scroll/assets/infinite-scroll.css'
import { defineCopy, useDemoLang } from '../../demoLang'
import './infinite-scroll-demo.css'

// 리뷰는 번호(index)만 들고 있고 닉네임·본문은 그릴 때 COPY에서 고른다 — 언어를 바꾸면 이미 불러온 리뷰도 따라 바뀐다
type Review = { id: string; index: number; stars: number; page: number }

const COPY = defineCopy({
  ko: {
    names: ['국수러버', '성수동주민', '면치기왕', '점심마다', '들깨파', '비빔러', '칼국수요정', '단골손님'],
    texts: [
      '멸치 육수가 진해서 국물까지 다 마셨어요.',
      '면발이 쫄깃하고 양이 넉넉해요.',
      '점심에 웨이팅 있는데 회전이 빨라요.',
      '들깨칼국수는 꼭 곱빼기로 드세요.',
      '만두 피가 얇아서 자꾸 손이 가요.',
      '혼밥하기 편한 자리가 많아요.',
    ],
    networkError: '네트워크 오류',
    controlsLabel: '로딩 옵션',
    rootMargin: '미리 부르는 거리',
    latency: '서버 응답 지연',
    willFail: '서버가 실패로 응답',
    note: (
      <>
        상자 안을 스크롤해 보세요. 미리 부르는 거리를 0으로 두면 바닥에 닿아야 로딩이 보이고, 400px로 올리면 로딩을
        거의 못 본 채 이어집니다. 실패로 바꾸면 멈춰 서서 <b>다시 시도</b>를 기다립니다 — 자동으로 재시도해 서버를
        때리지 않습니다.
      </>
    ),
    title: '손님 리뷰',
    count: ({ reviews, requests }: { reviews: number; requests: number }) => `${reviews}개 · 요청 ${requests}회`,
    boxLabel: '리뷰 목록',
    stars: (n: number) => `별점 ${n}점`,
    loading: '리뷰를 불러오는 중…',
    failed: '리뷰를 불러오지 못했어요',
    retry: '다시 시도',
    done: '마지막 리뷰예요',
    more: '더 보기',
    reset: '처음부터 다시',
  },
  en: {
    names: ['NoodleLover', 'SeongsuLocal', 'SlurpKing', 'EveryLunch', 'TeamPerilla', 'MixedFan', 'KnifeCutFairy', 'Regular'],
    texts: [
      'The anchovy broth is so rich I drank every drop.',
      'Chewy noodles and a generous portion.',
      'There is a line at lunch, but it moves fast.',
      'Get the perilla knife-cut noodles in a large size.',
      'Thin dumpling skins. I could not stop eating them.',
      'Plenty of seats for eating alone.',
    ],
    networkError: 'Network error',
    controlsLabel: 'Loading options',
    rootMargin: 'Prefetch distance',
    latency: 'Server latency',
    willFail: 'Server responds with an error',
    note: (
      <>
        Scroll inside the box. With the prefetch distance at 0, the loader shows only when you reach the bottom. At 400px,
        new reviews arrive before you notice. Turn on the error and the list stops and waits for <b>Try again</b>. It does
        not retry on its own and hammer the server.
      </>
    ),
    // 좁은 화면에서 제목과 개수가 한 줄에 들어가도록 짧게 쓴다
    title: 'Reviews',
    count: ({ reviews, requests }: { reviews: number; requests: number }) =>
      `${reviews} shown · ${requests} ${requests === 1 ? 'request' : 'requests'}`,
    boxLabel: 'Review list',
    stars: (n: number) => `${n} out of 5 stars`,
    loading: 'Loading reviews…',
    failed: 'Could not load reviews',
    retry: 'Try again',
    done: 'That is every review',
    more: 'Load more',
    reset: 'Start over',
  },
})

const TOTAL_PAGES = 5
const PAGE_SIZE = 6

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const makePage = (page: number): Review[] =>
  Array.from({ length: PAGE_SIZE }, (_, i) => {
    const index = page * PAGE_SIZE + i
    return { id: `review-${index}`, index, stars: 3 + (index % 3), page }
  })

export const InfiniteScrollDemo = () => {
  const t = COPY[useDemoLang()]
  const [reviews, setReviews] = useState<Review[]>(() => makePage(0))
  const [nextPage, setNextPage] = useState(1)
  const [latencyMs, setLatencyMs] = useState(600)
  const [rootMarginPx, setRootMarginPx] = useState(200)
  const [willFail, setWillFail] = useState(false)
  const [requests, setRequests] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  // 목록을 처음부터 다시 채울 때마다 올린다 — 그 전에 떠난 요청의 응답을 가려낸다
  const runRef = useRef(0)
  // 버튼으로 불러왔을 때, 새로 붙을 첫 항목의 순번 — 붙으면 그 항목으로 포커스를 옮긴다
  const focusFromRef = useRef<number | null>(null)

  const feed = useInfiniteScroll({
    hasMore: nextPage < TOTAL_PAGES,
    rootMarginPx,
    rootRef: boxRef,
    loadMore: async () => {
      const run = runRef.current
      setRequests((prev) => prev + 1)
      await delay(latencyMs)
      // 기다리는 사이 "처음부터 다시"를 눌렀다 — 지난 목록의 응답을 새 목록에 붙이지 않는다
      if (run !== runRef.current) return
      if (willFail) throw new Error(t.networkError)
      setReviews((prev) => [...prev, ...makePage(nextPage)])
      setNextPage((prev) => prev + 1)
    },
  })

  useEffect(
    function focusFirstNewItem() {
      const from = focusFromRef.current
      if (from === null || reviews.length <= from) return
      focusFromRef.current = null
      const firstNew = listRef.current?.children[from]
      if (firstNew instanceof HTMLElement) firstNew.focus()
    },
    [reviews.length],
  )

  /** 버튼으로 불러올 때 — 버튼은 곧 사라지므로 포커스를 낭독 영역에 맡겨 두었다가, 새 항목이 붙으면 그리로 옮긴다 */
  const loadByButton = (start: () => void) => {
    focusFromRef.current = reviews.length
    statusRef.current?.focus()
    start()
  }

  const reset = () => {
    runRef.current += 1
    focusFromRef.current = null
    setReviews(makePage(0))
    setNextPage(1)
    setRequests(0)
    // 끝남·실패 상태를 걷고 다시 감시한다 — 진행 중이던 요청의 응답은 상태를 바꾸지 못한다
    feed.reset()
    boxRef.current?.scrollTo({ top: 0 })
  }

  const vars = { '--infinite-scroll-dim': 'var(--text-dim)' } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.rootMargin} <code>rootMarginPx</code>
          </span>
          <input type="range" min={0} max={600} step={50} value={rootMarginPx} onChange={(e) => setRootMarginPx(Number(e.target.value))} />
          <output>{rootMarginPx}px</output>
        </label>
        <label>
          <span>
            {t.latency} <code>latency</code>
          </span>
          <input type="range" min={0} max={2000} step={100} value={latencyMs} onChange={(e) => setLatencyMs(Number(e.target.value))} />
          <output>{latencyMs}ms</output>
        </label>
        <label className="controls-inline">
          <input type="checkbox" checked={willFail} onChange={(e) => setWillFail(e.target.checked)} />
          <span>{t.willFail}</span>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="is-stage" style={vars}>
        <div className="is-stage-head">
          <h2 className="is-stage-title">{t.title}</h2>
          <span className="is-stage-count">{t.count({ reviews: reviews.length, requests })}</span>
        </div>

        {/* 스크롤 상자는 키보드로도 닿아야 한다 — 초점을 받으면 방향키·Page Down으로 내려 볼 수 있다 */}
        <div className="is-box" ref={boxRef} tabIndex={0} role="region" aria-label={t.boxLabel}>
          <ul className="is-list" ref={listRef}>
            {reviews.map((review, index) => (
              <li
                key={review.id}
                className={review.page > 0 ? 'is-review infinite-item-new' : 'is-review'}
                style={{ '--infinite-item-order': index % PAGE_SIZE } as CSSProperties}
                tabIndex={-1}
              >
                <div className="is-review-head">
                  <strong>
                    {t.names[review.index % t.names.length]}
                    {review.index}
                  </strong>
                  <span className="is-stars" aria-label={t.stars(review.stars)}>
                    {'★'.repeat(review.stars)}
                    <span className="is-stars-off">{'★'.repeat(5 - review.stars)}</span>
                  </span>
                </div>
                <p className="is-review-text">{t.texts[review.index % t.texts.length]}</p>
              </li>
            ))}
          </ul>

          <div ref={feed.sentinelRef} className="infinite-sentinel" aria-hidden="true" />

          <div className="infinite-footer">
            {/* 낭독 영역에는 문구만 둔다 — 버튼을 넣으면 상태가 바뀔 때마다 버튼 이름까지 읽힌다 */}
            <div ref={statusRef} className="infinite-status" role="status" tabIndex={-1}>
              {feed.status === 'loading' && (
                <>
                  <span className="infinite-spinner" aria-hidden="true" />
                  {t.loading}
                </>
              )}
              {feed.status === 'error' && t.failed}
              {feed.status === 'done' && t.done}
            </div>
            {feed.status === 'error' && (
              <button type="button" onClick={() => loadByButton(feed.retry)}>
                {t.retry}
              </button>
            )}
            {feed.status === 'idle' && (
              <button type="button" onClick={() => loadByButton(feed.loadNow)}>
                {t.more}
              </button>
            )}
          </div>
        </div>

        <button type="button" className="is-reset" onClick={reset}>
          {t.reset}
        </button>
      </div>
    </div>
  )
}
