import { useEffect, useRef, useState } from 'react'
import { usePageStack } from '@skills/page-transition/assets/usePageStack'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import './page-transition-demo.css'

type Screen = { name: 'list' } | { name: 'detail'; id: string } | { name: 'reviews'; id: string }

// 언어와 무관한 데이터(id·가격·사진)는 밖에, 이름·설명은 COPY에 id로 둔다
const MENUS: { id: 'myeolchi' | 'bibim' | 'deulkkae' | 'kong' | 'mandu'; price: number; dish: DishId }[] = [
  { id: 'myeolchi', price: 8000, dish: 'myeolchi' },
  { id: 'bibim', price: 9000, dish: 'bibim' },
  { id: 'deulkkae', price: 10000, dish: 'deulkkae' },
  { id: 'kong', price: 11000, dish: 'kong' },
  { id: 'mandu', price: 7000, dish: 'mandu' },
]

const COPY = defineCopy({
  ko: {
    menus: {
      myeolchi: { name: '멸치국수', desc: '남해 멸치로 3시간 우린 맑은 육수' },
      bibim: { name: '비빔국수', desc: '직접 담근 고추장 양념에 배를 갈아 넣었어요' },
      deulkkae: { name: '들깨칼국수', desc: '거피 들깨를 그날 갈아 써요' },
      kong: { name: '콩국수', desc: '여름 한정 — 국산 백태만 써요' },
      mandu: { name: '손만두', desc: '아침마다 빚는 6개들이' },
    },
    reviews: [
      '국물이 깔끔해서 끝까지 다 마셨어요.',
      '면발이 쫄깃하고 양도 넉넉해요.',
      '점심에 웨이팅 있지만 회전이 빨라요.',
      '혼밥하기 좋은 자리가 많아요.',
      '들깨 향이 진해서 계속 생각나요.',
    ],
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    shopName: '성수동 손칼국수',
    reviewsTitle: '리뷰 전체보기',
    controlsLabel: '전환 옵션',
    duration: '전환 속도',
    shift: '물러나는 거리',
    note: (
      <>
        메뉴를 눌러 들어갔다가 <b>← 뒤로</b>로 나와 보세요 — 방향이 반대로 재생됩니다. 상단 헤더와 하단 탭바는 전환 영역 바깥이라 제자리를 지킵니다. 목록을 아래까지 스크롤한 뒤 들어갔다 나오면 보던 위치로 돌아옵니다. 물러나는 거리를 100%로 올리면 두 화면이 나란히 밀립니다.
      </>
    ),
    back: '← 뒤로',
    depth: (n: number) => `${n}단계`,
    filler: '아래까지 내려온 뒤 메뉴를 눌러 보세요 — 돌아오면 이 위치예요.',
    allReviews: (n: number) => `리뷰 ${n}개 모두 보기 →`,
    tabbarLabel: '데모 하단 탭 (전환 영역 바깥)',
    tabs: ['메뉴', '주문', '내정보'],
  },
  en: {
    menus: {
      myeolchi: { name: 'Anchovy-broth noodles', desc: 'Clear broth simmered 3 hours with South Sea anchovies' },
      bibim: { name: 'Spicy mixed noodles', desc: 'House-made gochujang sauce with grated pear' },
      deulkkae: { name: 'Perilla knife-cut noodles', desc: 'Hulled perilla seeds, ground fresh each day' },
      kong: { name: 'Cold soy-milk noodles', desc: 'Summer only. Made with Korean soybeans only' },
      mandu: { name: 'Handmade dumplings', desc: 'Six per plate, made every morning' },
    },
    reviews: [
      'The broth is so clean I finished every drop.',
      'Chewy noodles and generous portions.',
      'There is a line at lunch, but it moves fast.',
      'Plenty of good seats for eating alone.',
      'The rich perilla flavor keeps me coming back.',
    ],
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    shopName: 'Seongsu-dong Knife-cut Noodles',
    reviewsTitle: 'All reviews',
    controlsLabel: 'Transition options',
    duration: 'Transition speed',
    shift: 'Exit distance',
    note: (
      <>
        Open a dish, then come back with <b>← Back</b>: the transition plays in reverse. The header and tab bar sit outside the transition area, so they stay put. Scroll the list to the bottom, open a dish and come back: you land where you left off. Set the exit distance to 100% and the two screens slide side by side.
      </>
    ),
    back: '← Back',
    depth: (n: number) => `Depth ${n}`,
    filler: 'Tap a dish from down here. When you come back, you land on this spot.',
    allReviews: (n: number) => `See all ${n} reviews →`,
    tabbarLabel: 'Demo tab bar (outside the transition area)',
    tabs: ['Menu', 'Orders', 'Profile'],
  },
})

export const PageTransitionDemo = () => {
  const t = COPY[useDemoLang()]
  const [durationMs, setDurationMs] = useState(280)
  const [shiftPercent, setShiftPercent] = useState(30)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stack = usePageStack<Screen>({ initial: { name: 'list' }, scrollRef })

  const screen = stack.current
  const menu = 'id' in screen ? MENUS.find((item) => item.id === screen.id) : undefined

  // ::view-transition-* 가상 요소는 문서 루트에 붙는다 — 변수도 루트에 있어야 닿는다
  useEffect(
    function applyTransitionVars() {
      const root = document.documentElement
      root.style.setProperty('--page-transition-duration', `${durationMs}ms`)
      root.style.setProperty('--page-transition-shift', `${shiftPercent}%`)
      return () => {
        root.style.removeProperty('--page-transition-duration')
        root.style.removeProperty('--page-transition-shift')
      }
    },
    [durationMs, shiftPercent],
  )

  const title = screen.name === 'list' ? t.shopName : screen.name === 'detail' ? (menu ? t.menus[menu.id].name : '') : t.reviewsTitle

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>--page-transition-duration</code>
          </span>
          <input type="range" min={120} max={700} step={20} value={durationMs} onChange={(e) => setDurationMs(Number(e.target.value))} />
          <output>{durationMs}ms</output>
        </label>
        <label>
          <span>
            {t.shift} <code>--page-transition-shift</code>
          </span>
          <input type="range" min={0} max={100} step={5} value={shiftPercent} onChange={(e) => setShiftPercent(Number(e.target.value))} />
          <output>{shiftPercent}%</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="pt-stage">
        {/* layout-audit-ignore: nested-card — 폰 틀은 기기 모형이다. 무대는 데모 바탕일 뿐 화면의 일부가 아니다 */}
        <div className="pt-phone">
          <header className="pt-header">
            {stack.canGoBack ? (
              <button type="button" className="pt-back" onClick={stack.back}>
                {t.back}
              </button>
            ) : (
              <span className="pt-back-placeholder" aria-hidden="true" />
            )}
            <strong className="pt-title">{title}</strong>
            <span className="pt-depth">{t.depth(stack.depth)}</span>
          </header>

          <div className="pt-scroll" ref={scrollRef}>
            {/* 전환되는 영역은 여기 하나뿐이다 — data-page-view는 문서에 하나만 있어야 한다 */}
            <main data-page-view className="pt-view">
              {screen.name === 'list' && (
                <ul className="pt-list">
                  {MENUS.map((item) => (
                    <li key={item.id}>
                      <button type="button" className="pt-row" onClick={() => stack.push({ name: 'detail', id: item.id })}>
                        <DishPhoto dish={item.dish} className="pt-row-thumb" />
                        <span className="pt-row-body">
                          <span className="pt-row-name">{t.menus[item.id].name}</span>
                          <span className="pt-row-desc">{t.menus[item.id].desc}</span>
                        </span>
                        <span className="pt-row-price">{t.price(item.price)}</span>
                      </button>
                    </li>
                  ))}
                  <li className="pt-filler">{t.filler}</li>
                </ul>
              )}

              {screen.name === 'detail' && menu && (
                <article className="pt-detail">
                  <DishPhoto dish={menu.dish} alt={t.menus[menu.id].name} className="pt-detail-hero" />
                  <h3 className="pt-detail-name">{t.menus[menu.id].name}</h3>
                  <p className="pt-detail-price">{t.price(menu.price)}</p>
                  <p className="pt-detail-desc">{t.menus[menu.id].desc}</p>
                  <button type="button" className="pt-more" onClick={() => stack.push({ name: 'reviews', id: menu.id })}>
                    {t.allReviews(t.reviews.length)}
                  </button>
                </article>
              )}

              {screen.name === 'reviews' && (
                <ul className="pt-reviews">
                  {t.reviews.map((review) => (
                    <li key={review}>{review}</li>
                  ))}
                </ul>
              )}
            </main>
          </div>

          <nav className="pt-tabbar" aria-label={t.tabbarLabel}>
            {t.tabs.map((tab, index) => (
              <span key={tab} className={index === 0 ? 'pt-tab pt-tab-active' : 'pt-tab'}>
                {tab}
              </span>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
