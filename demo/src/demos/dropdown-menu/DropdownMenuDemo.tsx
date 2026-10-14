import { useState, type CSSProperties } from 'react'
import { DropdownMenu } from '@skills/dropdown-menu/assets/DropdownMenu'
import { defineCopy, useDemoLang } from '../../demoLang'
import './dropdown-menu-demo.css'

// 언어와 무관한 데이터(아이디·가격)는 밖에, 메뉴 이름·날짜 표기는 COPY에 아이디로 둔다
const ORDERS = [
  { id: 'o-1', price: 16000 },
  { id: 'o-2', price: 10000 },
  { id: 'o-3', price: 27000 },
  { id: 'o-4', price: 14000 },
  { id: 'o-5', price: 11000 },
] as const

type OrderId = (typeof ORDERS)[number]['id']
type ActionId = 'receipt' | 'repeat' | 'cancel'

const COPY = defineCopy({
  ko: {
    orders: {
      'o-1': { menu: '멸치국수 × 2', date: '9월 1일' },
      'o-2': { menu: '들깨칼국수 × 1', date: '8월 28일' },
      'o-3': { menu: '비빔국수 × 3', date: '8월 21일' },
      'o-4': { menu: '손만두 × 2', date: '8월 14일' },
      'o-5': { menu: '콩국수 × 1', date: '8월 3일' },
    } satisfies Record<OrderId, { menu: string; date: string }>,
    items: { receipt: '영수증 보기', repeat: '같은 메뉴 다시 주문', review: '리뷰 쓰기 (기간 지남)', cancel: '주문 취소' },
    actions: { receipt: '영수증 보기', repeat: '다시 주문', cancel: '주문 취소' } satisfies Record<ActionId, string>,
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    menuLabel: (menu: string) => `${menu} 주문 관리`,
    result: ({ menu, action }: { menu: string; action: string }) => `실행: ${menu} — ${action}`,
    idle: '아직 아무 동작도 실행하지 않았어요',
    controlsLabel: '메뉴 옵션',
    alignEnd: '버튼 오른쪽에 맞추기',
    note: (
      <>
        각 행의 <b>⋯</b>를 눌러 보세요. <b>맨 아래 행</b>에서 열면 아래 공간이 모자라 위로 뒤집혀 열리고, 등장 방향도
        함께 바뀝니다. 키보드로는 Tab으로 ⋯에 간 뒤 <b>아래 방향키</b>로 열고, 방향키·첫 글자로 옮기며, Esc로 닫으면
        포커스가 버튼으로 돌아옵니다. 비활성 항목(리뷰 쓰기)은 방향키가 건너뜁니다.
      </>
    ),
    title: '주문 내역',
  },
  en: {
    orders: {
      'o-1': { menu: 'Anchovy-broth noodles × 2', date: 'Sep 1' },
      'o-2': { menu: 'Perilla knife-cut noodles × 1', date: 'Aug 28' },
      'o-3': { menu: 'Spicy mixed noodles × 3', date: 'Aug 21' },
      'o-4': { menu: 'Handmade dumplings × 2', date: 'Aug 14' },
      'o-5': { menu: 'Cold soy-milk noodles × 1', date: 'Aug 3' },
    },
    items: { receipt: 'View receipt', repeat: 'Order the same again', review: 'Write a review (expired)', cancel: 'Cancel order' },
    actions: { receipt: 'View receipt', repeat: 'Order again', cancel: 'Cancel order' },
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    menuLabel: (menu: string) => `Manage order: ${menu}`,
    result: ({ menu, action }: { menu: string; action: string }) => `Ran: ${action}, ${menu}`,
    idle: 'No action run yet',
    controlsLabel: 'Menu options',
    alignEnd: 'Align to the right edge of the button',
    note: (
      <>
        Press <b>⋯</b> on any row. Open it on the <b>bottom row</b> and, with too little room below, it flips to open upward
        and its entry direction flips with it. With a keyboard, Tab to ⋯, open it with the <b>Down arrow</b>, move with the
        arrow keys or a first letter, and press Esc to close and send focus back to the button. The arrow keys skip the
        disabled item (Write a review).
      </>
    ),
    title: 'Order history',
  },
})

export const DropdownMenuDemo = () => {
  const t = COPY[useDemoLang()]
  const [align, setAlign] = useState<'start' | 'end'>('end')
  // 문장 대신 주문·동작 아이디를 담는다 — 언어를 바꿔도 결과 문장이 새 언어로 다시 만들어진다
  const [lastAction, setLastAction] = useState<{ orderId: OrderId; action: ActionId }>()

  const vars = {
    '--menu-bg': 'var(--surface)',
    '--menu-color': 'var(--text)',
    '--menu-border': 'var(--border)',
    '--menu-active-bg': 'var(--accent-soft)',
    '--menu-focus': 'var(--accent)',
    '--menu-danger': '#f87171',
  } as CSSProperties

  const itemsFor = (orderId: OrderId) => [
    { id: 'receipt', label: t.items.receipt, onSelect: () => setLastAction({ orderId, action: 'receipt' }) },
    { id: 'repeat', label: t.items.repeat, onSelect: () => setLastAction({ orderId, action: 'repeat' }) },
    { id: 'review', label: t.items.review, onSelect: () => {}, disabled: true },
    { id: 'cancel', label: t.items.cancel, onSelect: () => setLastAction({ orderId, action: 'cancel' }), danger: true },
  ]

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label className="controls-inline">
          <input type="checkbox" checked={align === 'end'} onChange={(e) => setAlign(e.target.checked ? 'end' : 'start')} />
          <span>
            {t.alignEnd} <code>align="end"</code>
          </span>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="dm-stage" style={vars}>
        <h2 className="dm-title">{t.title}</h2>

        <ul className="dm-list">
          {ORDERS.map((order) => (
            <li key={order.id} className="dm-row">
              <span className="dm-row-body">
                <strong className="dm-row-menu">{t.orders[order.id].menu}</strong>
                <span className="dm-row-date">{t.orders[order.id].date}</span>
              </span>
              <span className="dm-row-price">{t.price(order.price)}</span>
              <DropdownMenu label={t.menuLabel(t.orders[order.id].menu)} align={align} items={itemsFor(order.id)} />
            </li>
          ))}
        </ul>

        <p className="dm-result" role="status">
          {lastAction ? t.result({ menu: t.orders[lastAction.orderId].menu, action: t.actions[lastAction.action] }) : t.idle}
        </p>
      </div>
    </div>
  )
}
