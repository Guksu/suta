import { useState, type CSSProperties } from 'react'
import { LongPressMenu } from '@skills/long-press-menu/assets/LongPressMenu'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import { defineCopy, useDemoLang } from '../../demoLang'
import './long-press-menu-demo.css'

// 언어와 무관한 데이터(아이디·사진·가격)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const MENU = [
  { id: 'janchi', dish: 'janchi', price: 7000 },
  { id: 'bibim', dish: 'bibim', price: 8000 },
  { id: 'kal', dish: 'kalguksu', price: 8500 },
  { id: 'mandu', dish: 'mandu', price: 6000 },
  { id: 'kong', dish: 'kong', price: 9000 },
  { id: 'bajirak', dish: 'bajirak', price: 9500 },
] as const satisfies readonly { id: string; dish: DishId; price: number }[]

type MenuItem = (typeof MENU)[number]
type ActionKind = 'cart' | 'favoriteOn' | 'favoriteOff' | 'reviews' | 'hide'

const COPY = defineCopy({
  ko: {
    menu: {
      janchi: { name: '잔치국수', desc: '멸치 육수에 소면' },
      bibim: { name: '비빔국수', desc: '새콤한 양념·오이·달걀' },
      kal: { name: '칼국수', desc: '새벽에 치댄 손반죽' },
      mandu: { name: '손만두', desc: '고기·김치 반반 6알' },
      kong: { name: '콩국수', desc: '여름 한정 · 고소한 콩물' },
      bajirak: { name: '바지락칼국수', desc: '바지락 듬뿍 · 시원한 국물' },
    },
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    controlsLabel: '길게 누르기 옵션',
    delay: '누르고 있는 시간',
    blur: '뒤 흐림',
    note: '카드를 길게 누르거나(터치·마우스) 우클릭하면 카드가 떠오르고 옆에 메뉴가 나옵니다. 키보드는 카드에 포커스한 뒤 Shift+F10. 바깥 클릭·Esc·스크롤로 닫힙니다.',
    menuLabel: (name: string) => `${name} 동작`,
    addToCart: '장바구니 담기',
    favorite: '즐겨찾기',
    unfavorite: '즐겨찾기 해제',
    reviews: '리뷰 보기',
    hide: '숨기기',
    // 마지막 동작은 종류만 상태에 두고 문구는 여기서 만든다 — 언어를 바꾸면 결과 줄도 함께 바뀐다
    actions: {
      cart: (name: string) => `${name} 장바구니 담기`,
      favoriteOn: (name: string) => `${name} 즐겨찾기 추가`,
      favoriteOff: (name: string) => `${name} 즐겨찾기 해제`,
      reviews: (name: string) => `${name} 리뷰 보기`,
      hide: (name: string) => `${name} 숨김`,
    },
    favoriteMark: '즐겨찾기',
    empty: '메뉴를 전부 숨겼어요.',
    lastAction: '마지막 동작:',
    noneYet: '아직 없음',
    showHidden: (count: number) => `숨긴 메뉴 ${count}개 다시 보이기`,
  },
  en: {
    menu: {
      janchi: { name: 'Anchovy-broth noodles', desc: 'Thin wheat noodles in anchovy broth' },
      bibim: { name: 'Spicy mixed noodles', desc: 'Tangy sauce, cucumber, egg' },
      kal: { name: 'Knife-cut noodles', desc: 'Hand-kneaded at dawn' },
      mandu: { name: 'Handmade dumplings', desc: '6 pieces, half pork, half kimchi' },
      kong: { name: 'Cold soy-milk noodles', desc: 'Summer only · rich soy milk' },
      bajirak: { name: 'Clam knife-cut noodles', desc: 'Plenty of clams · clean, refreshing broth' },
    },
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    controlsLabel: 'Long-press options',
    delay: 'Hold time',
    blur: 'Background blur',
    note: 'Press and hold a card (touch or mouse) or right-click it. The card lifts and a menu opens beside it. With a keyboard, focus a card and press Shift+F10. Click outside, press Esc or scroll to close.',
    menuLabel: (name: string) => `${name} actions`,
    addToCart: 'Add to cart',
    favorite: 'Favorite',
    unfavorite: 'Remove favorite',
    reviews: 'See reviews',
    hide: 'Hide',
    actions: {
      cart: (name: string) => `${name}: added to cart`,
      favoriteOn: (name: string) => `${name}: added to favorites`,
      favoriteOff: (name: string) => `${name}: removed from favorites`,
      reviews: (name: string) => `${name}: opened reviews`,
      hide: (name: string) => `${name}: hidden`,
    },
    favoriteMark: 'Favorite',
    empty: 'You hid every item.',
    lastAction: 'Last action:',
    noneYet: 'None yet',
    showHidden: (count: number) => `Show ${count} hidden ${count === 1 ? 'item' : 'items'}`,
  },
})

export const LongPressMenuDemo = () => {
  const t = COPY[useDemoLang()]
  const [delayMs, setDelayMs] = useState(450)
  const [blurPx, setBlurPx] = useState(12)
  const [lastAction, setLastAction] = useState<{ kind: ActionKind; id: MenuItem['id'] } | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [hidden, setHidden] = useState<string[]>([])

  const vars = { '--lpm-blur': `${blurPx}px` } as CSSProperties

  const toggleFavorite = (item: MenuItem) => {
    const already = favorites.includes(item.id)
    setFavorites(already ? favorites.filter((id) => id !== item.id) : [...favorites, item.id])
    setLastAction({ kind: already ? 'favoriteOff' : 'favoriteOn', id: item.id })
  }

  const visible = MENU.filter((item) => !hidden.includes(item.id))

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.delay} <code>delayMs</code>
          </span>
          <input type="range" min={200} max={1000} step={50} value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} />
          <output>{delayMs}ms</output>
        </label>
        <label>
          <span>
            {t.blur} <code>--lpm-blur</code>
          </span>
          <input type="range" min={0} max={24} step={2} value={blurPx} onChange={(e) => setBlurPx(Number(e.target.value))} />
          <output>{blurPx}px</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="lpm-stage" style={vars}>
        <div className="lpm-grid">
          {visible.map((item) => (
            <LongPressMenu
              key={item.id}
              label={t.menuLabel(t.menu[item.id].name)}
              delayMs={delayMs}
              items={[
                { label: <><Icon name="cart" /> {t.addToCart}</>, onSelect: () => setLastAction({ kind: 'cart', id: item.id }) },
                {
                  // 해제는 채운 별로 지금 상태를 보인다 — 같은 모양을 채우고 비우는 것으로 켜짐·꺼짐을 구분한다
                  label: favorites.includes(item.id) ? <><Icon name="star" filled /> {t.unfavorite}</> : <><Icon name="star" /> {t.favorite}</>,
                  onSelect: () => toggleFavorite(item),
                },
                { label: <><Icon name="message" /> {t.reviews}</>, onSelect: () => setLastAction({ kind: 'reviews', id: item.id }) },
                {
                  label: <><Icon name="eye-off" /> {t.hide}</>,
                  destructive: true,
                  onSelect: () => {
                    setHidden([...hidden, item.id])
                    setLastAction({ kind: 'hide', id: item.id })
                  },
                },
              ]}
            >
              {/* layout-audit-ignore: nested-card — 무대는 흐려질 배경이고, 카드는 길게 눌러 떠오르는 주인공이다 */}
              <article className="lpm-card">
                <DishPhoto dish={item.dish} className="lpm-card-photo" />
                {/* 즐겨찾기 표시는 사진 위가 아니라 이름 옆에 — 사진마다 밝기가 달라 위에 얹으면 안 보일 때가 있다 */}
                <h3>
                  {t.menu[item.id].name}
                  {favorites.includes(item.id) && (
                    <Icon name="star" filled label={t.favoriteMark} className="lpm-card-star" />
                  )}
                </h3>
                <p>{t.menu[item.id].desc}</p>
                <strong>{t.price(item.price)}</strong>
              </article>
            </LongPressMenu>
          ))}
        </div>

        {visible.length === 0 && <p className="lpm-empty">{t.empty}</p>}
      </div>

      <div className="lpm-status">
        <p role="status" aria-live="polite">
          {t.lastAction} <strong>{lastAction ? t.actions[lastAction.kind](t.menu[lastAction.id].name) : t.noneYet}</strong>
        </p>
        {hidden.length > 0 && (
          <button type="button" onClick={() => setHidden([])}>
            {t.showHidden(hidden.length)}
          </button>
        )}
      </div>
    </div>
  )
}
