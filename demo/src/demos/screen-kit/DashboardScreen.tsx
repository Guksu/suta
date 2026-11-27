import { useState } from 'react'
import { PhotoFrame } from '@skills/screen-kit/assets/ScreenKit'
import { AnswerHead, BarChart, Metrics, Periods } from '@skills/screen-kit/assets/ScreenKitDashboard'
import { photoSrc, type DishId } from '../../shared/dishes'
import type { Lang } from '../../i18n'
import { defineCopy, useDemoLang } from '../../demoLang'

/* 사장님 매출 대시보드 — 답 머리 · 지표 줄 · 막대 줄 | 순위 목록 · 상자 없는 표.
 * 견본 숫자는 이 한곳에 모았다. 합계는 막대 값의 합, 주문당 금액은 합계 ÷ 주문 수, 순위의 금액은 그릇 수 × 메뉴 가격,
 * 표의 금액은 메뉴 가격 × 수량에서 계산한다 — 지표·차트·표의 숫자가 서로 맞는다 */

type PeriodId = 'today' | 'week' | 'month'
type MenuId = 'janchi' | 'deulkkae' | 'bibim' | 'mandu'

const PRICE: Record<MenuId, number> = { janchi: 7000, deulkkae: 9500, bibim: 8000, mandu: 7500 }
const PHOTO: Record<MenuId, DishId> = { janchi: 'janchi', deulkkae: 'deulkkae', bibim: 'bibim', mandu: 'mandu' }

/** 막대 값의 단위는 천 원. null은 아직 오지 않은 시간·쉬는 날 */
const PERIODS: Record<
  PeriodId,
  { bars: (number | null)[]; emphasis: number; orders: number; previous: { total: number; orders: number }; bowls: Record<MenuId, number> }
> = {
  today: {
    bars: [98, 236, 204, 86, 44, 52, 214, 350, null, null, null], // 11시 ~ 21시, 지금 18시
    emphasis: 7,
    orders: 148,
    previous: { total: 1188000, orders: 139 },
    bowls: { janchi: 38, deulkkae: 27, bibim: 24, mandu: 22 },
  },
  week: {
    bars: [1046, null, 982, 1108, 1284, null, null], // 월 ~ 일, 화요일 휴무, 오늘 금요일
    emphasis: 4,
    orders: 512,
    previous: { total: 4180000, orders: 489 },
    bowls: { janchi: 131, deulkkae: 96, bibim: 88, mandu: 79 },
  },
  month: {
    bars: [6210, 5840, 6030, 4420], // 1~8일, 9~15일, 16~22일, 23~27일
    emphasis: 3,
    orders: 2604,
    previous: { total: 21350000, orders: 2470 },
    bowls: { janchi: 640, deulkkae: 470, bibim: 430, mandu: 395 },
  },
}

const sumOf = (values: (number | null)[]) => values.reduce<number>((sum, value) => sum + (value ?? 0), 0)

/** 지금 픽업을 기다리는 주문 수는 표에서 센다 — 지표와 표가 어긋나지 않게 */
type OrderStatus = 'new' | 'cooking' | 'ready' | 'done'
const ORDERS: { time: string; items: [MenuId, number][]; status: OrderStatus }[] = [
  { time: '18:42', items: [['janchi', 2], ['mandu', 1]], status: 'new' },
  { time: '18:39', items: [['bibim', 1]], status: 'cooking' },
  { time: '18:31', items: [['deulkkae', 2]], status: 'ready' },
  { time: '18:24', items: [['deulkkae', 1], ['mandu', 1]], status: 'ready' },
  { time: '18:16', items: [['janchi', 1]], status: 'done' },
  { time: '18:05', items: [['mandu', 2], ['bibim', 1]], status: 'done' },
]
const orderAmount = (items: [MenuId, number][]) => items.reduce((sum, [id, count]) => sum + PRICE[id] * count, 0)
const RANKED: MenuId[] = ['janchi', 'deulkkae', 'bibim', 'mandu']

const COPY = defineCopy({
  ko: {
    shop: '성수 국수집',
    siteLabel: '사장님 메뉴',
    site: ['오늘', '주문', '메뉴', '정산'],
    who: '김국수 사장님',
    periodLabel: '기간',
    periods: { today: '오늘', week: '이번 주', month: '이번 달' } as Record<PeriodId, string>,
    answer: {
      today: '오늘 매출 · 11월 27일 금요일',
      week: '이번 주 매출 · 11월 23일 ~ 27일',
      month: '이번 달 매출 · 11월 1일 ~ 27일',
    } as Record<PeriodId, string>,
    compareWith: { today: '지난주 금요일 같은 시각보다', week: '지난주 같은 기간보다', month: '지난달 같은 기간보다' } as Record<PeriodId, string>,
    won: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    signed: (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('ko-KR')}원`,
    metricOrders: '주문',
    metricAverage: '주문당 금액',
    metricWaiting: '지금 픽업 대기',
    metricSoldOut: '품절',
    count: (n: number) => `${n.toLocaleString('ko-KR')}건`,
    previousCount: (period: PeriodId, n: number) => `${period === 'month' ? '지난달' : '지난주'} ${n.toLocaleString('ko-KR')}건`,
    previousWon: (period: PeriodId, n: number) => `${period === 'month' ? '지난달' : '지난주'} ${n.toLocaleString('ko-KR')}원`,
    longest: (minutes: number) => `가장 오래 기다린 주문 ${minutes}분`,
    items: (n: number) => `${n}개`,
    soldOutName: '메밀국수',
    chartTitle: { today: '시간대별 매출', week: '요일별 매출', month: '주별 매출' } as Record<PeriodId, string>,
    unit: '단위 천 원',
    closedNote: '화요일 휴무',
    axis: {
      today: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
      week: ['월', '화', '수', '목', '금', '토', '일'],
      month: ['1~8', '9~15', '16~22', '23~27'],
    } as Record<PeriodId, string[]>,
    spoken: {
      today: (label: string) => `${label}시`,
      week: (label: string) => `${label}요일`,
      month: (label: string) => `${label}일`,
    } as Record<PeriodId, (label: string) => string>,
    now: { today: '지금', week: '오늘', month: '이번 주' } as Record<PeriodId, string>,
    chartLabel: (title: string, parts: string[]) => `${title} 막대 그래프, 단위 천 원. ${parts.join(', ')}`,
    noData: '없음',
    rankTitle: '잘 나간 메뉴',
    menu: { janchi: '잔치국수', deulkkae: '들깨 칼국수', bibim: '비빔국수', mandu: '손만두' } as Record<MenuId, string>,
    bowls: (n: number) => `${n.toLocaleString('ko-KR')}그릇`,
    ordersTitle: '최근 주문',
    seeAll: '전체 보기',
    columns: { time: '시각', menu: '메뉴', status: '상태', amount: '금액' },
    status: { new: '새 주문 · 확인 필요', cooking: '준비 중', ready: '픽업 대기', done: '완료' } as Record<OrderStatus, string>,
  },
  en: {
    shop: 'Seongsu Noodle House',
    siteLabel: 'Owner menu',
    site: ['Today', 'Orders', 'Menu', 'Payouts'],
    who: 'Owner: Alex Kim',
    periodLabel: 'Period',
    periods: { today: 'Today', week: 'This week', month: 'This month' } as Record<PeriodId, string>,
    answer: {
      today: 'Sales today · Fri, Nov 27',
      week: 'Sales this week · Nov 23 – 27',
      month: 'Sales this month · Nov 1 – 27',
    } as Record<PeriodId, string>,
    compareWith: { today: 'vs. last Friday at this time', week: 'vs. the same days last week', month: 'vs. the same days last month' } as Record<PeriodId, string>,
    won: (n: number) => `₩${n.toLocaleString('en-US')}`,
    signed: (n: number) => `${n >= 0 ? '+' : '−'}₩${Math.abs(n).toLocaleString('en-US')}`,
    metricOrders: 'Orders',
    metricAverage: 'Per order',
    metricWaiting: 'Waiting for pickup',
    metricSoldOut: 'Sold out',
    count: (n: number) => n.toLocaleString('en-US'),
    previousCount: (period: PeriodId, n: number) => `${period === 'month' ? 'Last month' : 'Last week'} ${n.toLocaleString('en-US')}`,
    previousWon: (period: PeriodId, n: number) => `${period === 'month' ? 'Last month' : 'Last week'} ₩${n.toLocaleString('en-US')}`,
    longest: (minutes: number) => `Longest wait ${minutes} min`,
    items: (n: number) => `${n} item${n === 1 ? '' : 's'}`,
    soldOutName: 'Cold soba',
    chartTitle: { today: 'Sales by hour', week: 'Sales by day', month: 'Sales by week' } as Record<PeriodId, string>,
    unit: 'In ₩1,000',
    closedNote: 'Closed Tuesdays',
    axis: {
      today: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
      week: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      month: ['1–8', '9–15', '16–22', '23–27'],
    } as Record<PeriodId, string[]>,
    spoken: {
      today: (label: string) => `${label}:00`,
      week: (label: string) => label,
      month: (label: string) => `Nov ${label}`,
    } as Record<PeriodId, (label: string) => string>,
    now: { today: 'now', week: 'today', month: 'this week' } as Record<PeriodId, string>,
    chartLabel: (title: string, parts: string[]) => `${title} bar chart, in thousands of won. ${parts.join(', ')}`,
    noData: 'no data',
    rankTitle: 'Top dishes',
    menu: { janchi: 'Feast noodles', deulkkae: 'Perilla knife-cut noodles', bibim: 'Spicy mixed noodles', mandu: 'Handmade dumplings' } as Record<MenuId, string>,
    bowls: (n: number) => `${n.toLocaleString('en-US')} sold`,
    ordersTitle: 'Recent orders',
    seeAll: 'See all',
    columns: { time: 'Time', menu: 'Items', status: 'Status', amount: 'Amount' },
    status: { new: 'New · needs confirming', cooking: 'Cooking', ready: 'Ready for pickup', done: 'Picked up' } as Record<OrderStatus, string>,
  },
})

/** 영어 요일 축은 한 글자라 낭독용 이름을 따로 둔다 */
const WEEKDAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const chartParts = ({ lang, period }: { lang: Lang; period: PeriodId }) => {
  const t = COPY[lang]
  const data = PERIODS[period]
  return t.axis[period].map((label, index) => {
    const name = lang === 'en' && period === 'week' ? WEEKDAYS_EN[index] : t.spoken[period](label)
    const value = data.bars[index]
    const mark = index === data.emphasis ? ` (${t.now[period]})` : ''
    return `${name} ${value === null ? t.noData : value.toLocaleString('en-US')}${mark}`
  })
}

export const DashboardScreen = () => {
  const lang = useDemoLang()
  const t = COPY[lang]
  const [period, setPeriod] = useState<PeriodId>('today')
  const data = PERIODS[period]

  const total = sumOf(data.bars) * 1000
  const diff = total - data.previous.total
  const percent = ((diff / data.previous.total) * 100).toFixed(1)
  const waiting = ORDERS.filter((order) => order.status === 'ready').length

  return (
    <div className="kit-screen skd-site">
      <header className="skd-site-head">
        <div className="skd-site-inner">
          <span className="skd-logo">{t.shop}</span>
          <nav className="skd-site-nav" aria-label={t.siteLabel}>
            {t.site.map((item, index) => (
              <a key={item} href="#/screen-kit" aria-current={index === 0 ? 'page' : undefined}>
                {item}
              </a>
            ))}
          </nav>
          <span className="skd-who">{t.who}</span>
        </div>
      </header>

      <div className="skd-site-inner skd-flush">
        <AnswerHead
          level={2}
          label={t.answer[period]}
          value={t.won(total)}
          compare={
            <>
              {t.compareWith[period]} <b>{t.signed(diff)}</b> ({percent}%)
            </>
          }
          aside={
            <Periods
              label={t.periodLabel}
              value={period}
              onChange={(value) => setPeriod(value as PeriodId)}
              options={(['today', 'week', 'month'] as const).map((id) => ({ value: id, label: t.periods[id] }))}
            />
          }
        />

        <Metrics
          items={[
            { label: t.metricOrders, value: t.count(data.orders), sub: t.previousCount(period, data.previous.orders) },
            {
              label: t.metricAverage,
              value: t.won(Math.round(total / data.orders)),
              sub: t.previousWon(period, Math.round(data.previous.total / data.previous.orders)),
            },
            { label: t.metricWaiting, value: t.count(waiting), sub: t.longest(6) },
            { label: t.metricSoldOut, value: t.items(1), sub: t.soldOutName },
          ]}
        />

        <div className="kit-board">
          <section aria-labelledby="skd-chart">
            <div className="kit-block-head">
              <h3 id="skd-chart" className="kit-block-title">
                {t.chartTitle[period]}
              </h3>
              <p className="kit-block-aside">
                {t.unit}
                {period === 'week' && ` · ${t.closedNote}`}
              </p>
            </div>
            <BarChart
              label={t.chartLabel(t.chartTitle[period], chartParts({ lang, period }))}
              data={t.axis[period].map((label, index) => ({ label, value: data.bars[index] }))}
              emphasis={data.emphasis}
              format={(value) => value.toLocaleString('en-US')}
            />
          </section>

          <section aria-labelledby="skd-rank">
            <div className="kit-block-head">
              <h3 id="skd-rank" className="kit-block-title">
                {t.rankTitle}
              </h3>
            </div>
            <ol className="kit-ranks">
              {RANKED.map((id) => (
                <li key={id} className="kit-rank">
                  <PhotoFrame src={photoSrc(PHOTO[id])} alt="" width={56} height={56} />
                  <span className="kit-rank-text">
                    <span className="kit-rank-name">{t.menu[id]}</span>
                    <span className="kit-rank-sub">{t.bowls(data.bowls[id])}</span>
                  </span>
                  <span className="kit-rank-value">{t.won(data.bowls[id] * PRICE[id])}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="kit-board-full" aria-labelledby="skd-orders">
            <div className="kit-block-head">
              <h3 id="skd-orders" className="kit-block-title">
                {t.ordersTitle}
              </h3>
              <a className="kit-block-aside" href="#/screen-kit">
                {t.seeAll}
              </a>
            </div>
            <table className="kit-table">
              <thead>
                <tr>
                  <th scope="col">{t.columns.time}</th>
                  <th scope="col">{t.columns.menu}</th>
                  <th scope="col">{t.columns.status}</th>
                  <th scope="col" className="kit-table-num">
                    {t.columns.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ORDERS.map((order) => (
                  <tr key={order.time}>
                    <td className="kit-table-sub">{order.time}</td>
                    <td className="kit-table-name">{order.items.map(([id, count]) => `${t.menu[id]} ${count}`).join(', ')}</td>
                    <td>
                      <span className="kit-status" data-attention={order.status === 'new' ? '' : undefined}>
                        {t.status[order.status]}
                      </span>
                    </td>
                    <td className="kit-table-key kit-table-num">{t.won(orderAmount(order.items))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}
