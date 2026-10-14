import { useRef, useState, type CSSProperties } from 'react'
import { useGlassNav } from '@skills/glass-nav/assets/useGlassNav'
import type { NavMode } from '@skills/glass-nav/assets/navScrollCore'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import { defineCopy, useDemoLang } from '../../demoLang'
import './glass-nav-demo.css'

const MODE_VALUES: NavMode[] = ['elevate', 'hide', 'compact']

// 언어와 무관한 데이터(아이디·사진·가격·영업시간)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const MENU = [
  { id: 'janchi', dish: 'janchi', price: 7000 },
  { id: 'bibim', dish: 'bibim', price: 8000 },
  { id: 'kalMandu', dish: 'kalguksu', price: 9500 },
  { id: 'mulnaeng', dish: 'naengmyeon', price: 10000 },
  { id: 'kong', dish: 'kong', price: 11000 },
  { id: 'deulkkae', dish: 'deulkkae', price: 10000 },
  { id: 'manduguk', dish: 'manduguk', price: 9000 },
  { id: 'rice', dish: 'rice', price: 1000 },
] as const satisfies readonly { id: string; dish: DishId; price: number }[]

const STORES = [
  { id: 'seongsu', hours: '11:00–21:00' },
  { id: 'yeonnam', hours: '11:30–21:30' },
  { id: 'pangyo', hours: '11:00–20:30' },
] as const

const ORDERS = [
  { id: 'o1', month: 9, day: 20, total: 17000 },
  { id: 'o2', month: 9, day: 14, total: 8000 },
  { id: 'o3', month: 9, day: 8, total: 19000 },
  { id: 'o4', month: 9, day: 1, total: 12000 },
  { id: 'o5', month: 8, day: 27, total: 18000 },
  { id: 'o6', month: 8, day: 20, total: 10000 },
] as const

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const COPY = defineCopy({
  ko: {
    modes: {
      elevate: { label: '투명 → 유리', hint: '사진 위에 뜨는 홈·지도 상단 바' },
      hide: { label: '내리면 숨김', hint: '긴 목록 화면 — 내릴 때 비켜 준다' },
      compact: { label: '알약 축소', hint: '탭 바를 알약 하나로 줄인다' },
    },
    menu: {
      janchi: { name: '잔치국수', desc: '멸치 육수에 소면. 고명은 애호박·계란·김.' },
      bibim: { name: '비빔국수', desc: '새콤한 양념에 오이·삶은 달걀.' },
      kalMandu: { name: '칼국수 + 만두', desc: '새벽에 치댄 반죽. 손만두 4알.' },
      mulnaeng: { name: '물냉면', desc: '살얼음 육수. 여름 한정.' },
      kong: { name: '콩국수', desc: '국산 백태만 써요.' },
      deulkkae: { name: '들깨칼국수', desc: '거피 들깨를 그날 갈아 써요.' },
      manduguk: { name: '만두국', desc: '손만두 6알, 사골 육수.' },
      rice: { name: '공기밥', desc: '국물에 말아 드세요.' },
    },
    stores: {
      seongsu: { name: '성수점', desc: '성수동 2가 · 도보 3분' },
      yeonnam: { name: '연남점', desc: '연남동 · 주차 2대' },
      pangyo: { name: '판교점', desc: '판교역 1번 출구' },
    },
    orderItems: {
      o1: '잔치국수 2 · 손만두 1',
      o2: '비빔국수 1',
      o3: '칼국수 + 만두 2',
      o4: '콩국수 1 · 공기밥 1',
      o5: '만두국 2',
      o6: '들깨칼국수 1',
    },
    date: ({ month, day }: { month: number; day: number }) => `${month}월 ${day}일`,
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    sections: { menu: '메뉴', stores: '매장', orders: '주문 내역' } as Record<string, string>,
    status: { hidden: '숨김', compact: '축소', glass: '유리', clear: '투명' },
    controlsLabel: 'GNB 옵션',
    mode: '모드',
    threshold: '유리 시작점',
    hideAfter: '숨김·축소 시작점',
    duration: '속도',
    note: '폰 화면을 아래로 스크롤해 보세요. 맨 위에서는 바가 투명하고, 내려가면 유리가 됩니다. "내리면 숨김"은 아래로 가면 바가 위로 사라지고 조금만 올리면 돌아옵니다. "알약 축소"는 링크가 접혀 현재 메뉴만 남습니다. GNB의 메뉴·매장·주문 내역을 누르면 그 섹션으로 내려가고, 스크롤하면 활성 알약이 따라옵니다.',
    currentStatus: '지금 상태:',
    currentSection: '현재 섹션:',
    brand: '국수집',
    navLabel: '주메뉴',
    heroBadge: '오늘의 추천',
    heroTitle: '성수동 손칼국수',
    heroDesc: '매일 새벽 반죽 · 11:00–21:00',
    menuList: '메뉴 목록',
    storeList: '매장 목록',
    orderList: '주문 목록',
    end: '끝까지 내려왔어요. 위로 올려 보세요.',
  },
  en: {
    modes: {
      elevate: { label: 'Clear → glass', hint: 'Top bar over a photo, as on home or map screens' },
      hide: { label: 'Hide on scroll', hint: 'Long lists. Gets out of the way as you scroll down.' },
      compact: { label: 'Shrink to pill', hint: 'Folds the tab bar into a single pill.' },
    },
    menu: {
      janchi: { name: 'Anchovy-broth noodles', desc: 'Thin wheat noodles in anchovy broth, topped with zucchini, egg and laver.' },
      bibim: { name: 'Spicy mixed noodles', desc: 'Tangy sauce, cucumber and a boiled egg.' },
      kalMandu: { name: 'Knife-cut noodles + dumplings', desc: 'Dough kneaded at dawn. 4 handmade dumplings.' },
      mulnaeng: { name: 'Cold buckwheat noodles', desc: 'Slushy iced broth. Summer only.' },
      kong: { name: 'Cold soy-milk noodles', desc: 'Made only with Korean white soybeans.' },
      deulkkae: { name: 'Perilla knife-cut noodles', desc: 'Hulled perilla seeds, ground fresh each day.' },
      manduguk: { name: 'Dumpling soup', desc: '6 handmade dumplings in beef bone broth.' },
      rice: { name: 'Bowl of rice', desc: 'Stir it into the leftover broth.' },
    },
    stores: {
      seongsu: { name: 'Seongsu', desc: 'Seongsu-dong 2-ga · 3 min walk' },
      yeonnam: { name: 'Yeonnam', desc: 'Yeonnam-dong · Parking for 2' },
      pangyo: { name: 'Pangyo', desc: 'Pangyo Station, Exit 1' },
    },
    orderItems: {
      o1: 'Anchovy-broth noodles ×2 · Handmade dumplings ×1',
      o2: 'Spicy mixed noodles ×1',
      o3: 'Knife-cut noodles + dumplings ×2',
      o4: 'Cold soy-milk noodles ×1 · Bowl of rice ×1',
      o5: 'Dumpling soup ×2',
      o6: 'Perilla knife-cut noodles ×1',
    },
    date: ({ month, day }: { month: number; day: number }) => `${MONTHS_EN[month - 1]} ${day}`,
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    sections: { menu: 'Menu', stores: 'Stores', orders: 'Orders' },
    status: { hidden: 'Hidden', compact: 'Compact', glass: 'Glass', clear: 'Clear' },
    controlsLabel: 'Nav bar options',
    mode: 'Mode',
    threshold: 'Glass starts at',
    hideAfter: 'Hide or shrink starts at',
    duration: 'Speed',
    note: 'Scroll the phone screen down. At the top the bar is clear, and it turns to glass as you scroll. "Hide on scroll" slides the bar up and away as you go down, and brings it back as soon as you scroll up a little. "Shrink to pill" folds the links so only the current one stays. Tap Menu, Stores or Orders in the bar to jump to that section. As you scroll, the active pill follows.',
    currentStatus: 'Current state:',
    currentSection: 'Current section:',
    brand: 'Noodle House',
    navLabel: 'Main menu',
    heroBadge: "Today's pick",
    heroTitle: 'Seongsu-dong Knife-cut Noodles',
    heroDesc: 'Dough made fresh every dawn · 11:00–21:00',
    menuList: 'Menu list',
    storeList: 'Store list',
    orderList: 'Order list',
    end: "You've reached the end. Scroll back up.",
  },
})

export const GlassNavDemo = () => {
  const t = COPY[useDemoLang()]
  const [mode, setMode] = useState<NavMode>('hide')
  const [thresholdPx, setThresholdPx] = useState(8)
  const [hideAfterPx, setHideAfterPx] = useState(80)
  const [durationMs, setDurationMs] = useState(250)
  const containerRef = useRef<HTMLDivElement>(null)
  const { navRef, state, activeId } = useGlassNav({ containerRef, mode, thresholdPx, hideAfterPx, spy: true })

  const vars = { '--gnav-duration': `${durationMs}ms` } as CSSProperties
  const status = state.hidden ? t.status.hidden : state.compact ? t.status.compact : state.elevated ? t.status.glass : t.status.clear

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <fieldset className="gn-mode">
          <legend>
            {t.mode} <code>mode</code>
          </legend>
          {MODE_VALUES.map((value) => (
            <label key={value}>
              <input type="radio" name="gnav-mode" checked={mode === value} onChange={() => setMode(value)} /> {t.modes[value].label}
              <small>{t.modes[value].hint}</small>
            </label>
          ))}
        </fieldset>
        <label>
          <span>
            {t.threshold} <code>thresholdPx</code>
          </span>
          <input type="range" min={0} max={240} step={8} value={thresholdPx} onChange={(e) => setThresholdPx(Number(e.target.value))} />
          <output>{thresholdPx}px</output>
        </label>
        <label>
          <span>
            {t.hideAfter} <code>hideAfterPx</code>
          </span>
          <input type="range" min={0} max={300} step={10} value={hideAfterPx} onChange={(e) => setHideAfterPx(Number(e.target.value))} />
          <output>{hideAfterPx}px</output>
        </label>
        <label>
          <span>
            {t.duration} <code>--gnav-duration</code>
          </span>
          <input type="range" min={100} max={600} step={50} value={durationMs} onChange={(e) => setDurationMs(Number(e.target.value))} />
          <output>{durationMs}ms</output>
        </label>
        <p className="controls-note">
          {t.note} {t.currentStatus} <b>{status}</b> · {t.currentSection} <b>{activeId ? t.sections[activeId] : '-'}</b>
        </p>
      </section>

      <div className="gn-phone" ref={containerRef} style={vars}>
        <header ref={navRef} className="gnav" data-mode={mode}>
          <div className="gnav-bar">
            <a className="gnav-brand" href="#/glass-nav">
              <Icon name="bowl" />
              {t.brand}
            </a>
            <nav className="gnav-links" aria-label={t.navLabel}>
              <div>
                <span className="gnav-pill" aria-hidden="true" />
                <a href="#menu">{t.sections.menu}</a>
                <a href="#stores">{t.sections.stores}</a>
                <a href="#orders">{t.sections.orders}</a>
              </div>
            </nav>
            <span className="gnav-current" aria-hidden="true">
              {t.sections.menu}
            </span>
          </div>
        </header>

        <section className="gn-hero">
          <span className="gn-hero-badge">{t.heroBadge}</span>
          <h2>{t.heroTitle}</h2>
          <p>{t.heroDesc}</p>
        </section>

        <section id="menu" className="gn-section" aria-labelledby="gn-menu-title">
          <h3 id="gn-menu-title">{t.sections.menu}</h3>
          <ul className="gn-list" aria-label={t.menuList}>
            {MENU.map((item) => (
              <li key={item.id} className="gn-item">
                <DishPhoto dish={item.dish} className="gn-item-photo" />
                <div>
                  <strong>{t.menu[item.id].name}</strong>
                  <p>{t.menu[item.id].desc}</p>
                </div>
                <span className="gn-item-price">{t.price(item.price)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="stores" className="gn-section" aria-labelledby="gn-stores-title">
          <h3 id="gn-stores-title">{t.sections.stores}</h3>
          <ul className="gn-list" aria-label={t.storeList}>
            {STORES.map((store) => (
              <li key={store.id} className="gn-item">
                <Icon name="map-pin" className="gn-item-icon" />
                <div>
                  <strong>{t.stores[store.id].name}</strong>
                  <p>{t.stores[store.id].desc}</p>
                </div>
                <span className="gn-item-price">{store.hours}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="orders" className="gn-section" aria-labelledby="gn-orders-title">
          <h3 id="gn-orders-title">{t.sections.orders}</h3>
          <ul className="gn-list" aria-label={t.orderList}>
            {ORDERS.map((order) => (
              <li key={order.id} className="gn-item">
                <Icon name="receipt" className="gn-item-icon" />
                <div>
                  <strong>{t.date({ month: order.month, day: order.day })}</strong>
                  <p>{t.orderItems[order.id]}</p>
                </div>
                <span className="gn-item-price">{t.price(order.total)}</span>
              </li>
            ))}
          </ul>
          <p className="gn-end">{t.end}</p>
        </section>
      </div>
    </div>
  )
}
