import { useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { Field, FieldGroup, PageHead, PhotoFrame, ProductCell, SummaryPanel } from '@skills/screen-kit/assets/ScreenKit'
import { inSlotRange, pickSlotRange, slotRangeTime, timeSlots, type SlotRange } from '@skills/screen-kit/assets/slotRange'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { Illustration } from '@skills/layout-principles/assets/Illustration'
import type { IllustrationName } from '@skills/layout-principles/assets/illustrations'
import '@skills/layout-principles/assets/content-art.css'
import { photoSrc, type DishId } from '../../shared/dishes'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DetailScreen } from './DetailScreen'
import { SettingsScreen } from './SettingsScreen'
import { DashboardScreen } from './DashboardScreen'
import './screen-kit-demo.css'

/* ---------------- 데이터 — 언어와 무관한 값(사진·가격·분류·칸 번호)은 밖에, 보이는 문구는 COPY 두 벌에 ---------------- */

type MenuId = 'janchi' | 'bibim' | 'bajirak' | 'deulkkae' | 'makguksu' | 'mandu' | 'kimchiMandu' | 'memil'
type CategoryId = 'all' | 'noodle' | 'kalguksu' | 'mandu'

/** 사진이 있는 메뉴는 photo, 아직 없는 메뉴는 콘텐츠 그림(접시 + 그림 아이콘) — 회색 칸 + 사진 아이콘으로 두지 않는다 */
const MENU: {
  id: MenuId
  category: Exclude<CategoryId, 'all'>
  price: number
  originalPrice?: number
  popularity: number
  photo?: DishId
  art?: { illustration: IllustrationName; tone: 'sand' | 'clay' | 'sage' | 'rose' }
  soldOut?: boolean
}[] = [
  { id: 'janchi', category: 'noodle', price: 7000, popularity: 9, photo: 'janchi' },
  { id: 'bibim', category: 'noodle', price: 8000, popularity: 8, photo: 'bibim' },
  { id: 'bajirak', category: 'kalguksu', price: 8550, originalPrice: 9500, popularity: 7, photo: 'bajirak' },
  { id: 'deulkkae', category: 'kalguksu', price: 9500, popularity: 6, photo: 'deulkkae' },
  { id: 'makguksu', category: 'noodle', price: 9000, popularity: 5, art: { illustration: 'steaming-bowl', tone: 'sage' } },
  { id: 'mandu', category: 'mandu', price: 7500, popularity: 4, photo: 'mandu' },
  { id: 'kimchiMandu', category: 'mandu', price: 7500, popularity: 3, art: { illustration: 'dumpling', tone: 'clay' } },
  { id: 'memil', category: 'noodle', price: 9000, popularity: 2, photo: 'memil', soldOut: true },
]
const CATEGORIES: CategoryId[] = ['all', 'noodle', 'kalguksu', 'mandu']
const discountOf = ({ price, originalPrice }: { price: number; originalPrice?: number }) =>
  originalPrice ? `${Math.round((1 - price / originalPrice) * 100)}%` : undefined

type RoomId = 'window' | 'inner' | 'attic'
const ROOMS: { id: RoomId; seats: number; hourly: number; tone: 'sand' | 'sage' | 'sky' }[] = [
  { id: 'window', seats: 4, hourly: 10000, tone: 'sand' },
  { id: 'inner', seats: 8, hourly: 20000, tone: 'sage' },
  { id: 'attic', seats: 12, hourly: 30000, tone: 'sky' },
]

/** 고를 수 있는 7일 — 견본 날짜를 한곳에 둔다(화요일은 쉬는 날) */
const DAYS = [
  { month: 11, date: 27, week: 5 },
  { month: 11, date: 28, week: 6 },
  { month: 11, date: 29, week: 0 },
  { month: 11, date: 30, week: 1 },
  { month: 12, date: 1, week: 2, closed: true },
  { month: 12, date: 2, week: 3 },
  { month: 12, date: 3, week: 4 },
]

/** 시간 칸은 11:00~21:00 한 줄이고, 점심·저녁은 보이는 묶음일 뿐이라 구간이 두 묶음에 걸칠 수 있다 */
const SLOTS = timeSlots({ from: '11:00', to: '21:00' })
const BANDS = [
  { id: 'lunch', from: 0, to: 8 },
  { id: 'dinner', from: 8, to: SLOTS.length },
] as const
const BOOKED = new Set([2, 3, 14, 15]) // 12:00·12:30·18:00·18:30
const MAX_SLOTS = 6 // 3시간까지

const COPY = defineCopy({
  ko: {
    controlsLabel: '보기 옵션',
    listWidth: '메뉴 목록 틀',
    formWidth: '예약 폼 틀',
    detailWidth: '메뉴 상세 틀',
    settingsWidth: '설정 틀',
    dashboardWidth: '매출 대시보드 틀',
    widths: { phone: '휴대폰 390', wide: '넓게' },
    note: '다섯 화면 모두 이 패턴의 CSS만으로 그렸습니다(스위치는 switch, 수량은 quantity-stepper 패턴). 사진이 없는 메뉴(들기름 막국수·김치만두)는 회색 칸이 아니라 콘텐츠 그림입니다. 틀 폭을 바꾸면 쪽 제목·격자 열·입력칸·표가 창이 아니라 틀의 폭을 따라 바뀝니다(컨테이너 쿼리). 대시보드를 휴대폰 틀로 두면 표가 행마다 "메뉴 + 금액 / 나머지 한 줄" 목록이 됩니다. 상세·설정을 넓게 두면 옅은 바탕 가운데의 흰 열이 됩니다.',
    listCaption: '메뉴 목록 — 쪽 머리 · 탭 줄 · 목록 머리 · 상자 없는 상품 칸',
    formCaption: '예약 폼 — 사진 카드 · 날짜 띠 · 시간 칸 · 입력칸 묶음 · 요약 패널',
    detailCaption: '메뉴 상세 — 사진 머리 · 이름 묶음 · 옵션 구역 · 하나 고르는 칸 · 체크 행 · 수량 줄 · 하단 고정 바',
    settingsCaption: '설정 — 상단 바 · 쪽 머리 · 프로필 줄 · 묶음 이름 · 폭 가득한 행(스위치·현재 값) · 글자 링크',
    dashboardCaption: '매출 대시보드 — 답 머리 · 기간 · 지표 줄 · 막대 줄 · 순위 목록 · 상자 없는 표',
    shop: '성수 국수집',
    cart: (count: number) => `장바구니, 담은 메뉴 ${count}개`,
    listTitle: '오늘의 국수',
    listSub: '성수점 · 주문하면 15분 뒤 픽업',
    categoriesLabel: '메뉴 분류',
    categories: { all: '전체', noodle: '국수', kalguksu: '칼국수', mandu: '만두' },
    count: '메뉴',
    sorts: { popular: '인기순', price: '낮은 가격순' },
    sortSr: ' — 눌러서 정렬 바꾸기',
    menu: {
      janchi: '잔치국수',
      bibim: '비빔국수',
      bajirak: '바지락 칼국수',
      deulkkae: '들깨 칼국수',
      makguksu: '들기름 막국수',
      mandu: '손만두',
      kimchiMandu: '김치만두',
      memil: '메밀국수',
    },
    notes: { janchi: '멸치 육수', deulkkae: '하루 30그릇', makguksu: '여름 한정' } as Partial<Record<MenuId, string>>,
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    added: (name: string, count: number) => `${name}을(를) 담았어요. 장바구니 ${count}개`,
    cellLabels: { add: (name: string) => `${name} 담기`, soldOut: '품절', discount: '할인', original: '정가' },
    site: { home: '메뉴', booking: '단체 예약', map: '오시는 길' },
    siteLabel: '주 메뉴',
    formTitle: '별실 예약',
    formSub: '오늘부터 7일 안에서 30분 단위로, 3시간까지 예약할 수 있어요.',
    roomTitle: '별실',
    rooms: { window: '창가방', inner: '안쪽방', attic: '다락방' },
    roomMeta: (seats: number, hourly: string) => `${seats}인 · 시간당 ${hourly}`,
    picked: '선택됨',
    dayTitle: '날짜',
    dayHint: '11월 27일 ~ 12월 3일 · 화요일은 쉬어요',
    weekdays: ['일', '월', '화', '수', '목', '금', '토'],
    today: '오늘',
    daySr: (closed: boolean) => `일${closed ? ', 쉬는 날' : ''}`,
    timeTitle: '시간',
    timeHint: '시작 칸과 끝 칸을 차례로 눌러 주세요 · 줄 그은 시간은 예약됐어요',
    bands: { lunch: '점심', dinner: '저녁' },
    booked: (slot: string) => `${slot} 예약됨`,
    whoTitle: '예약자',
    name: '이름',
    namePlaceholder: '김국수',
    phone: '연락처',
    phonePlaceholder: '010-0000-0000',
    phoneError: '010으로 시작하는 연락처를 적어 주세요',
    request: '요청 사항',
    requestHint: '아기 의자·생일 초처럼 준비할 것 (선택)',
    summaryTitle: '예약 요약',
    dayShort: (month: number, date: number, week: string) => `${month}월 ${date}일 (${week})`,
    emptyAnswer: '시간을 골라 주세요',
    roomSub: (room: string, seats: number) => `${room} · ${seats}인`,
    rows: { duration: '이용 시간', hourly: '시간당' },
    hours: (minutes: number) => (minutes % 60 === 0 ? `${minutes / 60}시간` : `${Math.floor(minutes / 60)}시간 30분`),
    totalLabel: '합계',
    submit: '예약하기',
    fine: '이용 1시간 전까지 무료로 취소할 수 있어요',
    done: (day: string, from: string) => `${day} ${from}로 예약을 보냈어요. 문자로 확정을 알려 드려요.`,
  },
  en: {
    controlsLabel: 'View options',
    listWidth: 'Menu list frame',
    formWidth: 'Booking form frame',
    detailWidth: 'Dish detail frame',
    settingsWidth: 'Settings frame',
    dashboardWidth: 'Sales dashboard frame',
    widths: { phone: 'Phone 390', wide: 'Wide' },
    note: 'All five screens are drawn with this pattern’s CSS alone (the switch and the stepper come from the switch and quantity-stepper patterns). Dishes without a photo (perilla oil buckwheat noodles, kimchi dumplings) get a content illustration instead of a gray box. Change the frame width and the page title, grid columns, fields and table follow the frame, not the window (container queries). Put the dashboard in the phone frame and the table turns into a list: items and amount, then the rest on one line. Put the detail or settings screen in the wide frame and it becomes a white column on a light background.',
    listCaption: 'Menu list: page head, tab row, list head, boxless product cells',
    formCaption: 'Booking form: photo cards, date strip, time slots, field group, summary panel',
    detailCaption: 'Dish detail: photo header, name block, option sections, single-choice cells, check rows, quantity row, bottom action bar',
    settingsCaption: 'Settings: top bar, page head, profile row, group labels, full-width rows (switches, current values), text links',
    dashboardCaption: 'Sales dashboard: answer head, period, metric strip, bar row, ranked list, boxless table',
    shop: 'Seongsu Noodle House',
    cart: (count: number) => `Cart, ${count} items`,
    listTitle: 'Today’s noodles',
    listSub: 'Seongsu shop · Pick up 15 minutes after ordering',
    categoriesLabel: 'Menu categories',
    categories: { all: 'All', noodle: 'Noodles', kalguksu: 'Knife-cut', mandu: 'Dumplings' },
    count: 'Dishes',
    sorts: { popular: 'Popular', price: 'Lowest price' },
    sortSr: ', press to change the sort',
    menu: {
      janchi: 'Feast noodles',
      bibim: 'Spicy mixed noodles',
      bajirak: 'Clam knife-cut noodles',
      deulkkae: 'Perilla knife-cut noodles',
      makguksu: 'Perilla oil buckwheat noodles',
      mandu: 'Handmade dumplings',
      kimchiMandu: 'Kimchi dumplings',
      memil: 'Cold soba',
    },
    notes: { janchi: 'Anchovy broth', deulkkae: '30 bowls a day', makguksu: 'Summer only' } as Partial<Record<MenuId, string>>,
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    added: (name: string, count: number) => `Added ${name}. ${count} in cart`,
    cellLabels: { add: (name: string) => `Add ${name}`, soldOut: 'Sold out', discount: 'off', original: 'Was' },
    site: { home: 'Menu', booking: 'Group booking', map: 'Directions' },
    siteLabel: 'Main menu',
    formTitle: 'Book a private room',
    formSub: 'Book in 30-minute steps, up to 3 hours, within the next 7 days.',
    roomTitle: 'Room',
    rooms: { window: 'Window room', inner: 'Inner room', attic: 'Attic' },
    roomMeta: (seats: number, hourly: string) => `${seats} seats · ${hourly} per hour`,
    picked: 'Selected',
    dayTitle: 'Date',
    dayHint: 'Nov 27 – Dec 3 · Closed on Tuesdays',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    today: 'Today',
    daySr: (closed: boolean) => (closed ? ', closed' : ''),
    timeTitle: 'Time',
    timeHint: 'Tap a start slot, then an end slot · Struck-through times are taken',
    bands: { lunch: 'Lunch', dinner: 'Dinner' },
    booked: (slot: string) => `${slot} taken`,
    whoTitle: 'Your details',
    name: 'Name',
    namePlaceholder: 'Alex Kim',
    phone: 'Phone',
    phonePlaceholder: '010-0000-0000',
    phoneError: 'Enter a phone number that starts with 010',
    request: 'Requests',
    requestHint: 'A high chair, birthday candles (optional)',
    summaryTitle: 'Booking summary',
    dayShort: (month: number, date: number, week: string) => `${week}, ${month === 11 ? 'Nov' : 'Dec'} ${date}`,
    emptyAnswer: 'Pick a time',
    roomSub: (room: string, seats: number) => `${room} · ${seats} seats`,
    rows: { duration: 'Duration', hourly: 'Per hour' },
    hours: (minutes: number) => (minutes % 60 === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h 30 min`),
    totalLabel: 'Total',
    submit: 'Book',
    fine: 'Cancel free of charge up to 1 hour before',
    done: (day: string, from: string) => `Booking sent for ${day} at ${from}. We’ll confirm by text.`,
  },
})

type FrameWidth = 'phone' | 'wide'

/* ---------------- 메뉴 목록 ---------------- */

const MenuList = () => {
  const t = COPY[useDemoLang()]
  const [category, setCategory] = useState<CategoryId>('all')
  const [sort, setSort] = useState<'popular' | 'price'>('popular')
  const [cart, setCart] = useState(2)
  const [status, setStatus] = useState('')

  const items = MENU.filter((item) => category === 'all' || item.category === category).sort((a, b) =>
    sort === 'popular' ? b.popularity - a.popularity : a.price - b.price,
  )

  const addToCart = (name: string) => {
    const next = cart + 1
    setCart(next)
    setStatus(t.added(name, next))
  }

  // 탭 줄의 화살표 키 — 탭은 하나만 Tab 순서에 있고(지금 칸), 좌우 화살표로 옮긴다(ARIA 탭 관례)
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    const next = CATEGORIES[(CATEGORIES.indexOf(category) + step + CATEGORIES.length) % CATEGORIES.length]
    setCategory(next)
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-category="${next}"]`)?.focus()
  }

  return (
    <div className="kit-screen skd-app">
      <header className="skd-topbar">
        <span className="skd-shop">{t.shop}</span>
        <a className="skd-cart" href="#/screen-kit" aria-label={t.cart(cart)}>
          <Icon name="cart" />
          <span className="skd-cart-count" aria-hidden="true">
            {cart}
          </span>
        </a>
      </header>
      <PageHead title={t.listTitle} sub={t.listSub} level={2} />
      <div className="kit-tabs" role="tablist" aria-label={t.categoriesLabel}>
        {CATEGORIES.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="kit-tab"
            data-category={id}
            aria-selected={category === id}
            aria-controls="skd-menu-grid"
            tabIndex={category === id ? 0 : -1}
            onClick={() => setCategory(id)}
            onKeyDown={moveTab}
          >
            {t.categories[id]}
          </button>
        ))}
      </div>
      <div className="kit-list-head">
        <p className="kit-list-count">
          {t.count} <b>{items.length}</b>
        </p>
        <button type="button" className="kit-list-sort" onClick={() => setSort(sort === 'popular' ? 'price' : 'popular')}>
          {t.sorts[sort]}
          <span className="kit-sr">{t.sortSr}</span>
          <Icon name="chevron-down" size={16} />
        </button>
      </div>
      <div id="skd-menu-grid" role="tabpanel" aria-label={t.categories[category]}>
      <ul className="kit-grid">
        {items.map((item) => (
          <ProductCell
            key={item.id}
            name={t.menu[item.id]}
            price={t.price(item.price)}
            discount={discountOf(item)}
            originalPrice={item.originalPrice ? t.price(item.originalPrice) : undefined}
            note={t.notes[item.id]}
            soldOut={item.soldOut}
            onAdd={() => addToCart(t.menu[item.id])}
            labels={t.cellLabels}
            media={
              item.photo ? (
                <PhotoFrame src={photoSrc(item.photo)} alt="" />
              ) : (
                <PhotoFrame art={{ scene: 'dish', tone: item.art?.tone ?? 'sand' }} alt="">
                  {item.art && <Illustration name={item.art.illustration} size={96} />}
                </PhotoFrame>
              )
            }
          />
        ))}
      </ul>
      </div>
      <p className="kit-sr" role="status">
        {status}
      </p>
    </div>
  )
}

/* ---------------- 예약 폼 ---------------- */

const won = ({ amount, lang }: { amount: number; lang: 'ko' | 'en' }) => COPY[lang].price(amount)

const BookingForm = () => {
  const lang = useDemoLang()
  const t = COPY[lang]
  const [room, setRoom] = useState<RoomId>('window')
  const [day, setDay] = useState(0)
  const [range, setRange] = useState<SlotRange>({ start: 4, end: 7 })
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState(false)
  const [done, setDone] = useState('')

  const picked = ROOMS.find((item) => item.id === room) ?? ROOMS[0]
  const pickedDay = DAYS[day]
  const time = slotRangeTime({ slots: SLOTS, range })
  const dayText = t.dayShort(pickedDay.month, pickedDay.date, t.weekdays[pickedDay.week])
  const total = time ? (time.minutes / 60) * picked.hourly : 0

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const invalid = !/^010-?\d{4}-?\d{4}$/.test(phone.trim())
    setPhoneError(invalid)
    setDone(invalid || !time ? '' : t.done(dayText, time.from))
  }

  return (
    <div className="kit-screen skd-site">
      <header className="skd-site-head">
        <div className="skd-site-inner">
          <span className="skd-logo">{t.shop}</span>
          <nav className="skd-site-nav" aria-label={t.siteLabel}>
            <a href="#/screen-kit">{t.site.home}</a>
            <a href="#/screen-kit" aria-current="page">
              {t.site.booking}
            </a>
            <a href="#/screen-kit">{t.site.map}</a>
          </nav>
        </div>
      </header>
      <form className="skd-site-inner" onSubmit={submit} noValidate>
        <PageHead title={t.formTitle} sub={t.formSub} level={2} className="skd-flush" />
        <div className="kit-split">
          <div>
            <section className="kit-section" aria-labelledby="skd-room">
              <div className="kit-section-head">
                <h3 id="skd-room" className="kit-section-title">
                  {t.roomTitle}
                </h3>
              </div>
              <fieldset className="kit-choices" aria-labelledby="skd-room">
                {ROOMS.map((item) => (
                  <label key={item.id} className="kit-choice">
                    <input className="kit-choice-input" type="radio" name="room" value={item.id} checked={room === item.id} onChange={() => setRoom(item.id)} />
                    <span className={`kit-frame art art--room art--${item.tone}`} style={{ '--kit-frame-ratio': '4 / 3' } as CSSProperties} aria-hidden="true" />
                    <span className="kit-choice-name">
                      {t.rooms[item.id]}
                      <span className="kit-choice-mark" aria-hidden="true">
                        {t.picked}
                      </span>
                    </span>
                    <span className="kit-choice-meta">{t.roomMeta(item.seats, won({ amount: item.hourly, lang }))}</span>
                  </label>
                ))}
              </fieldset>
            </section>

            <section className="kit-section" aria-labelledby="skd-day">
              <div className="kit-section-head">
                <h3 id="skd-day" className="kit-section-title">
                  {t.dayTitle}
                </h3>
                <p className="kit-section-hint">{t.dayHint}</p>
              </div>
              <ul className="kit-days" aria-labelledby="skd-day">
                {DAYS.map((item, index) => (
                  <li key={item.date}>
                    <button
                      type="button"
                      className="kit-day"
                      disabled={item.closed}
                      aria-pressed={item.closed ? undefined : day === index}
                      onClick={() => setDay(index)}
                    >
                      <span className="kit-day-week">{index === 0 ? t.today : t.weekdays[item.week]}</span>
                      <span className="kit-day-date">{item.date}</span>
                      <span className="kit-sr">{t.daySr(Boolean(item.closed))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="kit-section" aria-labelledby="skd-time">
              <div className="kit-section-head">
                <h3 id="skd-time" className="kit-section-title">
                  {t.timeTitle}
                </h3>
                <p className="kit-section-hint">{t.timeHint}</p>
              </div>
              {BANDS.map((band) => (
                <div key={band.id} className="kit-slot-band">
                  <p className="kit-slot-label" id={`skd-band-${band.id}`}>
                    {t.bands[band.id]}
                  </p>
                  <ul className="kit-slots" aria-labelledby={`skd-band-${band.id}`}>
                    {SLOTS.slice(band.from, band.to).map((slot, offset) => {
                      const index = band.from + offset
                      const booked = BOOKED.has(index)
                      return (
                        <li key={slot}>
                          <button
                            type="button"
                            className="kit-slot"
                            disabled={booked}
                            aria-label={booked ? t.booked(slot) : undefined}
                            aria-pressed={booked ? undefined : inSlotRange({ range, index })}
                            onClick={() => setRange(pickSlotRange({ range, index, blocked: BOOKED, maxLength: MAX_SLOTS }))}
                          >
                            {slot}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </section>

            <section className="kit-section" aria-labelledby="skd-who">
              <div className="kit-section-head">
                <h3 id="skd-who" className="kit-section-title">
                  {t.whoTitle}
                </h3>
              </div>
              <FieldGroup labelledBy="skd-who">
                <Field label={t.name} name="name" autoComplete="name" placeholder={t.namePlaceholder} />
                <Field
                  label={t.phone}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t.phonePlaceholder}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  error={phoneError ? t.phoneError : undefined}
                />
                <Field label={t.request} name="request" placeholder={t.requestHint} />
              </FieldGroup>
            </section>
          </div>

          <SummaryPanel
            title={t.summaryTitle}
            answer={
              time && (
                <>
                  {dayText}
                  <br />
                  {time.from} – {time.to}
                </>
              )
            }
            placeholder={t.emptyAnswer}
            sub={t.roomSub(t.rooms[picked.id], picked.seats)}
            rows={
              time
                ? [
                    { label: t.rows.duration, value: t.hours(time.minutes) },
                    { label: t.rows.hourly, value: won({ amount: picked.hourly, lang }) },
                  ]
                : []
            }
            totalLabel={t.totalLabel}
            total={won({ amount: total, lang })}
            action={
              <button type="submit" className="kit-button" disabled={!time}>
                {t.submit}
              </button>
            }
            note={
              <span role="status" className="skd-status">
                {done || t.fine}
              </span>
            }
          />
        </div>
      </form>
    </div>
  )
}

/* ---------------- 데모 ---------------- */

export const ScreenKitDemo = () => {
  const t = COPY[useDemoLang()]
  const [listWidth, setListWidth] = useState<FrameWidth>('phone')
  const [formWidth, setFormWidth] = useState<FrameWidth>('wide')
  const [detailWidth, setDetailWidth] = useState<FrameWidth>('phone')
  const [settingsWidth, setSettingsWidth] = useState<FrameWidth>('phone')
  const [dashboardWidth, setDashboardWidth] = useState<FrameWidth>('wide')

  const widthControl = ({ legend, name, value, onChange }: { legend: string; name: string; value: FrameWidth; onChange: (next: FrameWidth) => void }) => (
    <fieldset>
      <legend>{legend}</legend>
      {(['phone', 'wide'] as const).map((option) => (
        <label key={option}>
          <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
          {t.widths[option]}
        </label>
      ))}
    </fieldset>
  )

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        {widthControl({ legend: t.listWidth, name: 'skd-list-width', value: listWidth, onChange: setListWidth })}
        {widthControl({ legend: t.formWidth, name: 'skd-form-width', value: formWidth, onChange: setFormWidth })}
        {widthControl({ legend: t.detailWidth, name: 'skd-detail-width', value: detailWidth, onChange: setDetailWidth })}
        {widthControl({ legend: t.settingsWidth, name: 'skd-settings-width', value: settingsWidth, onChange: setSettingsWidth })}
        {widthControl({ legend: t.dashboardWidth, name: 'skd-dashboard-width', value: dashboardWidth, onChange: setDashboardWidth })}
        <p className="controls-note">{t.note}</p>
      </section>

      <figure className="skd-figure">
        <figcaption>{t.listCaption}</figcaption>
        <div className="skd-frame" data-width={listWidth}>
          <MenuList />
        </div>
      </figure>

      <figure className="skd-figure">
        <figcaption>{t.formCaption}</figcaption>
        <div className="skd-frame" data-width={formWidth}>
          <BookingForm />
        </div>
      </figure>

      <figure className="skd-figure">
        <figcaption>{t.detailCaption}</figcaption>
        <div className="skd-frame" data-width={detailWidth} data-screen="detail">
          <DetailScreen />
        </div>
      </figure>

      <figure className="skd-figure">
        <figcaption>{t.settingsCaption}</figcaption>
        <div className="skd-frame" data-width={settingsWidth} data-screen="settings">
          <SettingsScreen />
        </div>
      </figure>

      <figure className="skd-figure">
        <figcaption>{t.dashboardCaption}</figcaption>
        <div className="skd-frame" data-width={dashboardWidth} data-screen="dashboard">
          <DashboardScreen />
        </div>
      </figure>
    </div>
  )
}
