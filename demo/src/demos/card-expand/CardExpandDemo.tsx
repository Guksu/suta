import { useEffect, useRef, useState } from 'react'
import { useCardExpand } from '@skills/card-expand/assets/useCardExpand'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import './card-expand-demo.css'

// 언어와 무관한 데이터(id·사진·가격)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const PICKS = [
  { id: 'janchi', dish: 'janchi', price: 8000 },
  { id: 'bibim', dish: 'bibim', price: 9000 },
  { id: 'kal', dish: 'bajirak', price: 10000 },
  { id: 'mandu', dish: 'mandu', price: 7000 },
] as const satisfies readonly { id: string; dish: DishId; price: number }[]

const COPY = defineCopy({
  ko: {
    picks: {
      janchi: {
        title: '잔치국수',
        subtitle: '멸치 육수를 새벽부터 끓였습니다',
        story:
          '남해 멸치와 다시마를 새벽 다섯 시부터 세 시간 우려낸 맑은 육수에 가는 소면을 말았습니다. 애호박·당근·달걀지단을 곱게 채 썰어 올리고, 양념장은 취향대로 풀어 드세요.',
      },
      bibim: {
        title: '비빔국수',
        subtitle: '배를 갈아 넣은 고추장 양념',
        story:
          '직접 담근 고추장에 배와 사과를 갈아 넣어 단맛을 냈습니다. 삶은 면을 찬물에 여러 번 헹궈 쫄깃하게 하고, 오이·상추·삶은 달걀 반쪽을 올립니다. 매운 정도는 주문 시 조절할 수 있습니다.',
      },
      kal: {
        title: '손칼국수',
        subtitle: '오늘 아침 반죽한 면',
        story:
          '아침마다 밀가루를 치대 홍두깨로 밀어 썰어 냅니다. 면에서 나온 전분이 국물을 걸쭉하게 만들어 숟가락이 계속 갑니다. 바지락을 넉넉히 넣어 시원한 맛을 더했습니다.',
      },
      mandu: {
        title: '손만두 한 접시',
        subtitle: '국수 옆에 6개, 든든하게',
        story:
          '돼지고기·두부·부추·당면을 넣어 매일 빚습니다. 찐만두 6개 한 접시. 국수와 함께 주문하면 1,000원을 빼 드립니다.',
      },
    },
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    controlsLabel: '전환 옵션',
    duration: '자라나는 시간',
    note: (
      <>
        카드를 눌러 보세요 — <b>그 카드가 제자리에서 자라나</b> 상세 화면이 되고, × 또는 <kbd>Esc</kbd>로 닫으면 원래 자리로
        줄어듭니다. 그림과 제목은 따로 움직입니다. 목록을 조금 내린 뒤 아래쪽 카드를 열어 보면 돌아가는 자리도 그대로입니다.
        상세는 창 전체가 아니라 <b>폰 프레임 안</b>을 채웁니다.
      </>
    ),
    unsupported:
      '이 브라우저는 View Transitions API를 지원하지 않아 전환 없이 즉시 바뀝니다. 최신 Chrome·Edge·Safari 18에서 확인해 보세요.',
    eyebrow: '9월 17일 수요일',
    heading: '오늘의 추천',
    listLabel: '오늘의 추천 메뉴',
    close: '닫기',
    order: '주문하기',
  },
  en: {
    picks: {
      janchi: {
        title: 'Anchovy-broth noodles',
        subtitle: 'Anchovy broth simmered since dawn',
        story:
          'Southern-coast anchovies and kelp simmer for three hours from 5 a.m. into a clear broth, poured over thin wheat noodles. Finely shredded zucchini, carrot and egg go on top. Stir in the sauce to taste.',
      },
      bibim: {
        title: 'Spicy mixed noodles',
        subtitle: 'Gochujang sauce with grated pear',
        story:
          'Our own gochujang, sweetened with grated pear and apple. The noodles are rinsed in cold water several times for a chewy bite, then topped with cucumber, lettuce and half a boiled egg. Choose your spice level when you order.',
      },
      kal: {
        title: 'Knife-cut noodles',
        subtitle: "Cut from this morning's dough",
        story:
          'Every morning we knead the dough, roll it out with a wooden pin and cut it by hand. Starch from the noodles thickens the broth, so you keep reaching for the spoon. Plenty of clams give it a clean, bright taste.',
      },
      mandu: {
        title: 'Handmade dumplings',
        subtitle: 'Six on the side, for a fuller meal',
        story:
          'Made fresh every day with pork, tofu, garlic chives and glass noodles. A plate of six steamed dumplings. Order them with noodles and get ₩1,000 off.',
      },
    },
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    controlsLabel: 'Transition options',
    duration: 'Grow duration',
    note: (
      <>
        Tap a card. <b>The card grows in place</b> into the detail view. Close it with × or <kbd>Esc</kbd> and it shrinks back
        to where it was. The picture and the title move separately. Scroll the list a little and open a lower card: it still
        returns to the right spot. The detail fills <b>the phone frame</b>, not the whole window.
      </>
    ),
    unsupported:
      'This browser does not support the View Transitions API, so the view switches instantly. Try the latest Chrome, Edge or Safari 18.',
    eyebrow: 'Wednesday, September 17',
    heading: "Today's picks",
    listLabel: "Today's picks",
    close: 'Close',
    order: 'Order',
  },
})

const supportsViewTransitions = () => typeof document !== 'undefined' && 'startViewTransition' in document

export const CardExpandDemo = () => {
  const t = COPY[useDemoLang()]
  const [durationMs, setDurationMs] = useState(420)
  const containerRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const { expandedId, expand, collapse } = useCardExpand({ containerRef, detailRef, closeOnBack: true })
  const current = PICKS.find((pick) => pick.id === expandedId)

  // ::view-transition-* 가상 요소는 문서 루트에 붙는다 — 변수도 루트에 있어야 닿는다
  useEffect(
    function applyTransitionVars() {
      const root = document.documentElement
      root.style.setProperty('--card-expand-duration', `${durationMs}ms`)
      root.style.setProperty('--card-expand-radius', '18px')
      return () => {
        root.style.removeProperty('--card-expand-duration')
        root.style.removeProperty('--card-expand-radius')
      }
    },
    [durationMs],
  )

  // 상세가 열리면 첫 초점은 닫기 버튼 — 키보드 사용자가 갇히지 않는다
  useEffect(
    function focusCloseOnOpen() {
      if (expandedId !== null) closeRef.current?.focus({ preventScroll: true })
    },
    [expandedId],
  )

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>--card-expand-duration</code>
          </span>
          <input type="range" min={200} max={900} step={20} value={durationMs} onChange={(e) => setDurationMs(Number(e.target.value))} />
          <output>{durationMs}ms</output>
        </label>
        <p className="controls-note">{t.note}</p>
        {!supportsViewTransitions() && (
          <p className="controls-note ce-unsupported" role="note">
            {t.unsupported}
          </p>
        )}
      </section>

      <div className="ce-stage">
        {/* layout-audit-ignore: nested-card — 폰 틀은 기기 모형이다. 무대는 데모 바탕일 뿐 화면의 일부가 아니다 */}
        <div className="ce-phone">
          <header className="ce-header">
            <span className="ce-eyebrow">{t.eyebrow}</span>
            <strong className="ce-heading">{t.heading}</strong>
          </header>

          <div ref={containerRef} className="card-expand-container ce-container">
            <ul className="ce-list" inert={expandedId !== null} aria-label={t.listLabel}>
              {PICKS.map((pick) => (
                <li key={pick.id}>
                  <button
                    type="button"
                    className="ce-card"
                    data-card-id={pick.id}
                    aria-expanded={expandedId === pick.id}
                    onClick={(event) => void expand({ id: pick.id, card: event.currentTarget })}
                  >
                    <span className="ce-card-media" data-card-expand-part="media">
                      <DishPhoto dish={pick.dish} />
                    </span>
                    <span className="ce-card-text">
                      <span className="ce-card-title" data-card-expand-part="title">
                        {t.picks[pick.id].title}
                      </span>
                      <span className="ce-card-subtitle">{t.picks[pick.id].subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {current && (
              <article
                ref={detailRef}
                className="card-expand-detail ce-detail"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ce-detail-title"
              >
                <button ref={closeRef} type="button" className="card-expand-close" aria-label={t.close} onClick={() => void collapse()}>
                  ×
                </button>
                <div className="card-expand-detail-scroll">
                  <div className="ce-detail-media" data-card-expand-part="media">
                    <DishPhoto dish={current.dish} alt={t.picks[current.id].title} />
                  </div>
                  <div className="ce-detail-content">
                    <h3 id="ce-detail-title" className="ce-detail-title" data-card-expand-part="title">
                      {t.picks[current.id].title}
                    </h3>
                    <div className="card-expand-detail-body">
                      <p className="ce-detail-subtitle">{t.picks[current.id].subtitle}</p>
                      <p className="ce-detail-story">{t.picks[current.id].story}</p>
                      <div className="ce-detail-foot">
                        <span className="ce-detail-price">{t.price(current.price)}</span>
                        <button type="button" className="ce-order">
                          {t.order}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
