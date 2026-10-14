import { useState, type CSSProperties } from 'react'
import { QuantityStepper } from '@skills/quantity-stepper/assets/QuantityStepper'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import './quantity-stepper-demo.css'

// 언어와 무관한 데이터(id·가격·사진·수량)만 상태에 둔다. 메뉴 이름은 COPY에 id로 둔다
type CartItem = { id: 'myeolchi' | 'bibim' | 'mandu'; price: number; dish: DishId; count: number }

const INITIAL: CartItem[] = [
  { id: 'myeolchi', price: 8000, dish: 'myeolchi', count: 2 },
  { id: 'bibim', price: 9000, dish: 'bibim', count: 1 },
  { id: 'mandu', price: 7000, dish: 'mandu', count: 1 },
]

const COPY = defineCopy({
  ko: {
    menus: { myeolchi: '멸치국수', bibim: '비빔국수', mandu: '손만두' },
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    count: (n: number) => `${n}개`,
    controlsLabel: '스테퍼 옵션',
    max: '최대 수량',
    removeAtOne: '수량 1에서 −를 누르면 삭제',
    note: (
      <>
        <b>+ 를 누르고 있어 보세요</b> — 0.4초 뒤부터 반복되며 점점 빨라집니다. 짧게 한 번 누르면 딱 한 칸만 오릅니다. 숫자를 직접 쳐도 되고(다 치면 범위에 맞춰 정리됩니다), 숫자 칸에서 방향키로도 조절됩니다. 최대 수량에 닿으면 + 버튼이 흐려집니다.
      </>
    ),
    title: '장바구니',
    stepperLabel: (name: string) => `${name} 수량`,
    // 패턴 기본 버튼 이름("{label} 줄이기·삭제·늘리기")과 같은 문구 — 영어판과 모양을 맞추려고 여기에 적는다
    buttonLabels: (name: string) => ({
      decrease: () => `${name} 수량 줄이기`,
      remove: () => `${name} 수량 삭제`,
      increase: () => `${name} 수량 늘리기`,
    }),
    empty: '장바구니가 비었어요',
    total: '합계',
    refill: '다시 채우기',
  },
  en: {
    menus: { myeolchi: 'Anchovy-broth noodles', bibim: 'Spicy mixed noodles', mandu: 'Handmade dumplings' },
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    count: (n: number) => `${n}`,
    controlsLabel: 'Stepper options',
    max: 'Max quantity',
    removeAtOne: 'Pressing − at 1 removes the item',
    note: (
      <>
        <b>Press and hold +</b>. After 0.4 seconds it starts repeating and speeds up. A quick tap adds exactly one. You can also type a number (it snaps into range when you finish) or use the arrow keys in the number field. At the max quantity, the + button fades.
      </>
    ),
    title: 'Cart',
    stepperLabel: (name: string) => `${name} quantity`,
    // 영어는 "Remove {name} quantity"가 어색해 그룹 이름 대신 메뉴 이름으로 버튼 이름을 만든다
    buttonLabels: (name: string) => ({
      decrease: () => `Decrease ${name}`,
      remove: () => `Remove ${name}`,
      increase: () => `Increase ${name}`,
    }),
    empty: 'Your cart is empty',
    total: 'Total',
    refill: 'Refill cart',
  },
})

export const QuantityStepperDemo = () => {
  const t = COPY[useDemoLang()]
  const [items, setItems] = useState(INITIAL)
  const [max, setMax] = useState(20)
  const [removeAtOne, setRemoveAtOne] = useState(true)

  const total = items.reduce((sum, item) => sum + item.price * item.count, 0)

  const setCount = ({ id, count }: { id: string; count: number }) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, count } : item)))

  const vars = {
    '--qty-bg': 'var(--bg)',
    '--qty-border': 'var(--border)',
    '--qty-color': 'var(--text)',
    '--qty-accent': 'var(--accent)',
    '--qty-hover': 'var(--accent-soft)',
    '--qty-active': 'var(--accent-soft)',
  } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.max} <code>max</code>
          </span>
          <input type="range" min={2} max={50} step={1} value={max} onChange={(e) => setMax(Number(e.target.value))} />
          <output>{t.count(max)}</output>
        </label>
        <label className="controls-inline">
          <input type="checkbox" checked={removeAtOne} onChange={(e) => setRemoveAtOne(e.target.checked)} />
          <span>
            {t.removeAtOne} <code>onBelowMin</code>
          </span>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="qs-stage" style={vars}>
        <h2 className="qs-title">{t.title}</h2>

        <ul className="qs-list">
          {items.map((item) => (
            <li key={item.id} className="qs-row">
              <DishPhoto dish={item.dish} className="qs-thumb" />
              <span className="qs-body">
                <strong className="qs-name">{t.menus[item.id]}</strong>
                <span className="qs-unit">{t.price(item.price)}</span>
              </span>

              <QuantityStepper
                value={item.count}
                min={1}
                max={max}
                label={t.stepperLabel(t.menus[item.id])}
                buttonLabels={t.buttonLabels(t.menus[item.id])}
                onChange={(count) => setCount({ id: item.id, count })}
                onBelowMin={removeAtOne ? () => setItems((prev) => prev.filter((row) => row.id !== item.id)) : undefined}
              />

              <span className="qs-sum">{t.price(item.price * item.count)}</span>
            </li>
          ))}
          {items.length === 0 && <li className="qs-empty">{t.empty}</li>}
        </ul>

        <div className="qs-footer">
          <span>
            {t.total} <strong>{t.price(total)}</strong>
          </span>
          <button type="button" onClick={() => setItems(INITIAL)}>
            {t.refill}
          </button>
        </div>
      </div>
    </div>
  )
}
