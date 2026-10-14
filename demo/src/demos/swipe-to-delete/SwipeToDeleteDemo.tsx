import { useState, type CSSProperties } from 'react'
import { SwipeToDelete } from '@skills/swipe-to-delete/assets/SwipeToDelete'
import { defineCopy, useDemoLang } from '../../demoLang'
import './swipe-to-delete-demo.css'

// 언어와 무관한 데이터(id·가격)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const INITIAL = [
  { id: 'myeolchi', price: 8000 },
  { id: 'bibim', price: 9000 },
  { id: 'deulkkae', price: 10000 },
  { id: 'mandu', price: 7000 },
] as const

const INITIAL_ORDERS = [
  { id: 'o-0912', total: 23000, later: false },
  { id: 'o-0905', total: 9000, later: false },
  { id: 'o-0828', total: 11000, later: false },
] as const

type CartItem = (typeof INITIAL)[number]
type Order = { id: (typeof INITIAL_ORDERS)[number]['id']; total: number; later: boolean }
type OrderLog = { kind: 'archive' | 'later' | 'unlater' | 'delete'; id: Order['id'] }

const COPY = defineCopy({
  ko: {
    items: { myeolchi: '멸치국수', bibim: '비빔국수', deulkkae: '들깨칼국수', mandu: '손만두 (6개)' },
    orders: {
      'o-0912': { title: '잔치국수 2 · 손만두 1', date: '9월 12일 · 성수점' },
      'o-0905': { title: '비빔국수 1', date: '9월 5일 · 성수점' },
      'o-0828': { title: '들깨칼국수 1 · 공깃밥 1', date: '8월 28일 · 포장' },
    },
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    controlsLabel: '제스처 옵션',
    actionWidth: '액션 폭',
    duration: '속도',
    note: '행을 왼쪽으로 끌어 보세요 — 절반 이상 끌면 삭제 버튼이 열리고, 액션 폭의 2.5배 이상 끌거나 세게 튕기면 바로 삭제됩니다. 세로로 스크롤하면 행이 따라오지 않습니다(축 잠금). Tab으로 삭제 버튼에 가면 행이 열립니다. 아래 주문 내역은 액션이 세 개라 열림 폭이 액션 폭 × 3이고, 끝까지 밀면 마지막 액션(삭제)이 늘어나며 실행됩니다.',
    cartTitle: '장바구니',
    deleteLabel: '삭제',
    cartEmpty: '장바구니가 비었어요.',
    cartSummary: ({ total, lastDeleted }: { total: string; lastDeleted?: string }) =>
      `합계 ${total}${lastDeleted ? ` · 마지막 삭제: ${lastDeleted}` : ''}`,
    refill: '다시 채우기',
    ordersTitle: '주문 내역',
    ordersSubtitle: '여러 액션 행 — 보관 · 나중에 · 삭제',
    actions: { archive: '보관', later: '나중에', unlater: '해제', delete: '삭제' },
    laterBadge: '나중에',
    ordersEmpty: '주문 내역이 없어요.',
    orderLog: {
      archive: (title: string) => `보관함으로 옮김: ${title}`,
      later: (title: string) => `나중에 다시 주문: ${title}`,
      unlater: (title: string) => `나중에 표시 해제: ${title}`,
      delete: (title: string) => `삭제: ${title}`,
    },
    orderHint: '행을 밀어 세 액션을 열어 보세요',
  },
  en: {
    items: {
      myeolchi: 'Anchovy-broth noodles',
      bibim: 'Spicy mixed noodles',
      deulkkae: 'Perilla knife-cut noodles',
      mandu: 'Handmade dumplings (6)',
    },
    orders: {
      'o-0912': { title: 'Anchovy-broth noodles ×2 · Handmade dumplings ×1', date: 'Sep 12 · Seongsu-dong' },
      'o-0905': { title: 'Spicy mixed noodles ×1', date: 'Sep 5 · Seongsu-dong' },
      'o-0828': { title: 'Perilla knife-cut noodles ×1 · Rice ×1', date: 'Aug 28 · Takeout' },
    },
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    controlsLabel: 'Gesture options',
    actionWidth: 'Action width',
    duration: 'Speed',
    note: 'Drag a row to the left. Past halfway, the delete button opens. Drag more than 2.5× the action width or flick hard, and the row is deleted right away. Scrolling vertically leaves the row in place (axis lock). Tab to the delete button and the row opens. The order history below has three actions, so it opens to the action width × 3. Swipe all the way and the last action (Delete) stretches and runs.',
    cartTitle: 'Cart',
    deleteLabel: 'Delete',
    cartEmpty: 'Your cart is empty.',
    cartSummary: ({ total, lastDeleted }: { total: string; lastDeleted?: string }) =>
      `Total ${total}${lastDeleted ? ` · Last deleted: ${lastDeleted}` : ''}`,
    refill: 'Refill',
    ordersTitle: 'Order history',
    ordersSubtitle: 'Multi-action rows: Archive · Later · Delete',
    actions: { archive: 'Archive', later: 'Later', unlater: 'Unmark', delete: 'Delete' },
    laterBadge: 'Later',
    ordersEmpty: 'No orders yet.',
    orderLog: {
      archive: (title: string) => `Archived: ${title}`,
      later: (title: string) => `Order again later: ${title}`,
      unlater: (title: string) => `Unmarked later: ${title}`,
      delete: (title: string) => `Deleted: ${title}`,
    },
    orderHint: 'Swipe a row to reveal three actions',
  },
})

export const SwipeToDeleteDemo = () => {
  const t = COPY[useDemoLang()]
  const [items, setItems] = useState<readonly CartItem[]>(INITIAL)
  const [orders, setOrders] = useState<Order[]>([...INITIAL_ORDERS])
  const [actionWidth, setActionWidth] = useState(88)
  const [durationMs, setDurationMs] = useState(260)
  // 문구 대신 id를 기억한다 — 언어를 바꿔도 마지막 삭제·주문 기록이 새 언어로 다시 그려진다
  const [lastDeleted, setLastDeleted] = useState<CartItem['id']>()
  const [orderLog, setOrderLog] = useState<OrderLog>()

  const vars = { '--swipe-duration': `${durationMs}ms`, '--swipe-bg': 'var(--surface)' } as CSSProperties
  const total = items.reduce((sum, item) => sum + item.price, 0)

  const remove = (item: CartItem) => {
    setItems((prev) => prev.filter((cartItem) => cartItem.id !== item.id))
    setLastDeleted(item.id)
  }

  // 여러 액션 행 — 보관·나중에는 즉시 처리(행 유지 또는 제거), 삭제는 마지막 액션이라 접힘 뒤에 불린다
  const archiveOrder = (order: Order) => {
    setOrders((prev) => prev.filter((candidate) => candidate.id !== order.id))
    setOrderLog({ kind: 'archive', id: order.id })
  }
  const markLater = (order: Order) => {
    setOrders((prev) => prev.map((candidate) => (candidate.id === order.id ? { ...candidate, later: !candidate.later } : candidate)))
    setOrderLog({ kind: order.later ? 'unlater' : 'later', id: order.id })
  }
  const deleteOrder = (order: Order) => {
    setOrders((prev) => prev.filter((candidate) => candidate.id !== order.id))
    setOrderLog({ kind: 'delete', id: order.id })
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.actionWidth} <code>actionWidth</code>
          </span>
          <input type="range" min={64} max={140} step={4} value={actionWidth} onChange={(e) => setActionWidth(Number(e.target.value))} />
          <output>{actionWidth}px</output>
        </label>
        <label>
          <span>
            {t.duration} <code>--swipe-duration</code>
          </span>
          <input type="range" min={100} max={600} step={20} value={durationMs} onChange={(e) => setDurationMs(Number(e.target.value))} />
          <output>{durationMs}ms</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="swipe-stage" style={vars}>
        <h2 className="swipe-stage-title">{t.cartTitle}</h2>
        <ul className="swipe-list">
          {items.map((item) => (
            <li key={item.id}>
              <SwipeToDelete onDelete={() => remove(item)} actionWidth={actionWidth} actionLabel={t.deleteLabel}>
                <div className="cart-row">
                  <span className="cart-row-name">{t.items[item.id]}</span>
                  <span className="cart-row-price">{t.price(item.price)}</span>
                </div>
              </SwipeToDelete>
            </li>
          ))}
        </ul>
        {items.length === 0 && <p className="swipe-empty">{t.cartEmpty}</p>}
        <div className="swipe-footer">
          <span aria-live="polite">
            {t.cartSummary({ total: t.price(total), lastDeleted: lastDeleted && t.items[lastDeleted] })}
          </span>
          <button
            type="button"
            onClick={() => {
              setItems(INITIAL)
              setLastDeleted(undefined)
            }}
          >
            {t.refill}
          </button>
        </div>
      </div>

      <div className="swipe-stage" style={vars}>
        <h2 className="swipe-stage-title">
          {t.ordersTitle}
          <small>{t.ordersSubtitle}</small>
        </h2>
        <ul className="swipe-list">
          {orders.map((order) => (
            <li key={order.id}>
              <SwipeToDelete
                actionWidth={actionWidth}
                actions={[
                  { label: t.actions.archive, onClick: () => archiveOrder(order) },
                  { label: order.later ? t.actions.unlater : t.actions.later, onClick: () => markLater(order), tone: 'accent' },
                  { label: t.actions.delete, onClick: () => deleteOrder(order), tone: 'danger' },
                ]}
              >
                <div className="order-row">
                  <div className="order-row-title">
                    <span>
                      {t.orders[order.id].title}
                      {order.later && <span className="order-row-badge">{t.laterBadge}</span>}
                    </span>
                    <span className="cart-row-price">{t.price(order.total)}</span>
                  </div>
                  <span className="order-row-meta">{t.orders[order.id].date}</span>
                </div>
              </SwipeToDelete>
            </li>
          ))}
        </ul>
        {orders.length === 0 && <p className="swipe-empty">{t.ordersEmpty}</p>}
        <div className="swipe-footer">
          <span aria-live="polite">{orderLog ? t.orderLog[orderLog.kind](t.orders[orderLog.id].title) : t.orderHint}</span>
          <button
            type="button"
            onClick={() => {
              setOrders([...INITIAL_ORDERS])
              setOrderLog(undefined)
            }}
          >
            {t.refill}
          </button>
        </div>
      </div>
    </div>
  )
}
