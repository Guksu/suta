import { useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { useEdgeSwipeBack } from '@skills/edge-swipe-back/assets/useEdgeSwipeBack'
import { runPageTransition } from '@skills/page-transition/assets/runPageTransition'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import '@skills/page-transition/assets/page-transition.css'
import { defineCopy, useDemoLang } from '../../demoLang'
import './edge-swipe-back-demo.css'

type Screen = { name: 'list' } | { name: 'detail'; id: MenuId } | { name: 'reviews'; id: MenuId }

// 언어와 무관한 데이터(아이디·가격·사진)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const MENUS = [
  { id: 'janchi', price: 8000, dish: 'janchi' },
  { id: 'bibim', price: 9000, dish: 'bibim' },
  { id: 'kal', price: 10000, dish: 'kalguksu' },
  { id: 'kong', price: 11000, dish: 'kong' },
  { id: 'mandu', price: 7000, dish: 'mandu' },
] as const satisfies readonly { id: string; price: number; dish: DishId }[]

type MenuId = (typeof MENUS)[number]['id']

type LogKey = 'start' | 'gesture' | 'button'

const COPY = defineCopy({
  ko: {
    menu: {
      janchi: { name: '잔치국수', desc: '멸치·다시마 육수에 애호박 고명' },
      bibim: { name: '비빔국수', desc: '직접 담근 고추장 양념, 배를 갈아 넣었어요' },
      kal: { name: '손칼국수', desc: '아침에 밀어 굵기가 조금씩 달라요' },
      kong: { name: '콩국수', desc: '여름 한정 — 국산 백태만 써요' },
      mandu: { name: '손만두', desc: '아침마다 빚는 6개들이' },
    },
    reviews: [
      '국물이 깔끔해서 끝까지 다 마셨어요.',
      '면발이 쫄깃하고 양도 넉넉해요.',
      '점심에 웨이팅 있지만 회전이 빨라요.',
      '혼밥하기 좋은 자리가 많아요.',
      '성수동에서 국수 생각나면 여기부터 가요.',
    ],
    shopTitle: '성수동 국수집',
    reviewsTitle: (name: string) => `${name} 리뷰`,
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    log: {
      start: '상세로 들어간 뒤 왼쪽 가장자리를 오른쪽으로 끌어 보세요. 마우스로도 됩니다.',
      gesture: '제스처로 돌아왔습니다 — 스프링이 끝난 뒤 즉시 pop.',
      button: '버튼으로 돌아왔습니다 — View Transition 재생.',
    } satisfies Record<LogKey, string>,
    moreReviews: (count: number) => `리뷰 ${count}개 모두 보기 →`,
    hint: '← 왼쪽 가장자리를 오른쪽으로 끌면 목록이 따라 나와요',
    controlsLabel: '제스처 옵션',
    threshold: '커밋 임계',
    edgeWidth: '가장자리 폭',
    shift: '물러남 거리',
    note: (percent: number) => (
      <>
        메뉴를 눌러 상세로 들어간 뒤, 폰 화면의 <b>왼쪽 가장자리</b>를 오른쪽으로 끌어 보세요. 현재 화면이 손가락을 따라
        밀리고 아래 목록이 따라 나오며 어둠이 걷힙니다. 폭의 {percent}%를 넘기거나 빠르게 튕기면 돌아가고,
        그 전에 놓거나 왼쪽으로 되튕기면 제자리로 스프링 복귀합니다. 상단 <b>← 뒤로</b> 버튼은 제스처를 쓸 수 없을 때의
        대안입니다(이쪽은 page-transition 전환을 재생).
      </>
    ),
    back: '← 뒤로',
    depth: (count: number) => `${count}단계`,
  },
  en: {
    menu: {
      janchi: { name: 'Anchovy-broth noodles', desc: 'Anchovy and kelp broth, topped with zucchini' },
      bibim: { name: 'Spicy mixed noodles', desc: 'House-made chili paste sauce with grated pear' },
      kal: { name: 'Knife-cut noodles', desc: 'Rolled out each morning, so the width varies a little' },
      kong: { name: 'Cold soy-milk noodles', desc: 'Summer only. Made with Korean white soybeans' },
      mandu: { name: 'Handmade dumplings', desc: 'Six per plate, folded every morning' },
    },
    reviews: [
      'The broth is so clean I finished every drop.',
      'Chewy noodles and a generous portion.',
      'There is a line at lunch, but it moves fast.',
      'Plenty of good seats for eating alone.',
      'My first stop in Seongsu-dong when I want noodles.',
    ],
    shopTitle: 'Noodle House',
    // 헤더 가운데 칸이 좁아 영어 메뉴 이름을 붙이면 두 줄로 넘친다 — 이름은 바로 앞 화면 제목이라 빼도 길을 잃지 않는다
    reviewsTitle: () => 'Reviews',
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    log: {
      start: 'Open a menu item, then drag the left edge to the right. A mouse works too.',
      gesture: 'Back by gesture: popped right after the spring settled.',
      button: 'Back by button: played the View Transition.',
    },
    moreReviews: (count: number) => `See all ${count} reviews →`,
    hint: '← Drag from the left edge and the list slides back in',
    controlsLabel: 'Gesture options',
    threshold: 'Commit threshold',
    edgeWidth: 'Edge width',
    shift: 'Underlay shift',
    note: (percent: number) => (
      <>
        Open a menu item, then drag from the <b>left edge</b> of the phone screen to the right. The current screen follows your
        finger, the list slides out from underneath, and the dim fades. Drag past {percent}% of the width or flick quickly to go
        back. Let go earlier or flick back left and it springs into place. The <b>← Back</b> button at the top is the fallback
        when the gesture is not available (it plays the page-transition animation).
      </>
    ),
    back: '← Back',
    depth: (count: number) => `Level ${count}`,
  },
})

type Copy = (typeof COPY)['ko']

const titleOf = ({ screen, t }: { screen: Screen; t: Copy }) => {
  if (screen.name === 'list') return t.shopTitle
  const name = t.menu[screen.id].name
  return screen.name === 'detail' ? name : t.reviewsTitle(name)
}

export const EdgeSwipeBackDemo = () => {
  const t = COPY[useDemoLang()]
  const [stack, setStack] = useState<Screen[]>([{ name: 'list' }])
  const [threshold, setThreshold] = useState(0.4)
  const [edgeWidth, setEdgeWidth] = useState(24)
  const [shiftPercent, setShiftPercent] = useState(30)
  // 문장 대신 키를 담는다 — 언어를 바꿔도 지금 안내가 새 언어로 다시 읽힌다
  const [log, setLog] = useState<LogKey>('start')

  const current = stack[stack.length - 1]
  const previous = stack.length > 1 ? stack[stack.length - 2] : null

  /** 들어갈 때는 page-transition 코어로 오른쪽에서 덮으며 들어온다 */
  const push = (screen: Screen) => {
    void runPageTransition({ direction: 'forward', update: () => flushSync(() => setStack((prev) => [...prev, screen])) })
  }

  /** 제스처 커밋: 화면은 이미 오른쪽 끝에 밀려 있으므로 전환 없이 즉시 pop한다 — 훅이 flushSync로 감싼다 */
  const popNow = () => {
    setStack((prev) => prev.slice(0, -1))
    setLog('gesture')
  }

  /** 버튼으로 돌아갈 때는 손가락이 움직인 적이 없으니 page-transition의 뒤로 전환을 재생한다 */
  const popWithTransition = () => {
    void runPageTransition({ direction: 'back', update: () => flushSync(() => setStack((prev) => prev.slice(0, -1))) })
    setLog('button')
  }

  const { containerRef, screenRef, underlayRef, dimRef } = useEdgeSwipeBack({
    canGoBack: stack.length > 1,
    onBack: popNow,
    threshold,
    edgeWidth,
  })

  const render = (screen: Screen) => {
    const menu = 'id' in screen ? MENUS.find((item) => item.id === screen.id) : undefined
    if (screen.name === 'list') {
      return (
        <ul className="esb-list">
          {MENUS.map((item) => (
            <li key={item.id}>
              <button type="button" className="esb-row" onClick={() => push({ name: 'detail', id: item.id })}>
                <DishPhoto dish={item.dish} className="esb-row-thumb" />
                <span className="esb-row-body">
                  <span className="esb-row-name">{t.menu[item.id].name}</span>
                  <span className="esb-row-desc">{t.menu[item.id].desc}</span>
                </span>
                <span className="esb-row-price">{t.price(item.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )
    }
    if (screen.name === 'detail' && menu) {
      return (
        <article className="esb-detail">
          <DishPhoto dish={menu.dish} alt={t.menu[menu.id].name} className="esb-detail-hero" />
          <h3 className="esb-detail-name">{t.menu[menu.id].name}</h3>
          <p className="esb-detail-price">{t.price(menu.price)}</p>
          <p className="esb-detail-desc">{t.menu[menu.id].desc}</p>
          <button type="button" className="esb-more" onClick={() => push({ name: 'reviews', id: menu.id })}>
            {t.moreReviews(t.reviews.length)}
          </button>
          <p className="esb-hint">{t.hint}</p>
        </article>
      )
    }
    return (
      <ul className="esb-reviews">
        {t.reviews.map((review) => (
          <li key={review}>{review}</li>
        ))}
      </ul>
    )
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.threshold} <code>threshold</code>
          </span>
          <input type="range" min={0.2} max={0.8} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          <output>{Math.round(threshold * 100)}%</output>
        </label>
        <label>
          <span>
            {t.edgeWidth} <code>edgeWidth</code>
          </span>
          <input type="range" min={12} max={64} step={4} value={edgeWidth} onChange={(e) => setEdgeWidth(Number(e.target.value))} />
          <output>{edgeWidth}px</output>
        </label>
        <label>
          <span>
            {t.shift} <code>--edge-shift</code>
          </span>
          <input type="range" min={0} max={100} step={5} value={shiftPercent} onChange={(e) => setShiftPercent(Number(e.target.value))} />
          <output>{shiftPercent}%</output>
        </label>
        <p className="controls-note">{t.note(Math.round(threshold * 100))}</p>
      </section>

      <div className="esb-stage">
        {/* layout-audit-ignore: nested-card — 폰 틀은 기기 모형이다. 무대는 데모 바탕일 뿐 화면의 일부가 아니다 */}
        <div className="esb-phone">
          <header className="esb-header">
            {stack.length > 1 ? (
              <button type="button" className="esb-back" onClick={popWithTransition}>
                {t.back}
              </button>
            ) : (
              <span className="esb-back-placeholder" aria-hidden="true" />
            )}
            <strong className="esb-title">{titleOf({ screen: current, t })}</strong>
            <span className="esb-depth">{t.depth(stack.length)}</span>
          </header>

          {/* 네 요소는 한 번 마운트되면 그대로 두고 안의 내용만 바꾼다 — 코어가 요소를 붙잡고 있다 */}
          <div ref={containerRef} data-page-view className="edge-swipe esb-view" style={{ '--edge-shift': `${shiftPercent}%` } as CSSProperties}>
            <div ref={underlayRef} className="edge-swipe-underlay esb-screen" aria-hidden="true">
              {previous && render(previous)}
            </div>
            <div ref={dimRef} className="edge-swipe-dim" aria-hidden="true" />
            <div ref={screenRef} className="edge-swipe-screen esb-screen">
              {render(current)}
            </div>
          </div>
        </div>
        <p className="esb-log" aria-live="polite">
          {t.log[log]}
        </p>
      </div>
    </div>
  )
}
