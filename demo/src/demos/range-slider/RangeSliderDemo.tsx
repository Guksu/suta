import { useState, type CSSProperties } from 'react'
import { RangeSlider, type RangeValue } from '@skills/range-slider/assets/RangeSlider'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import './range-slider-demo.css'

// 언어와 무관한 데이터(id·가격·사진)는 밖에, 메뉴 이름은 COPY에 id로 둔다
type MenuId = 'mandu' | 'myeolchi' | 'janchi' | 'sujebi' | 'bibim' | 'mandu-guk' | 'deulkkae' | 'naengmyeon' | 'kong' | 'kalguksu'

const MENUS: { id: MenuId; price: number; dish: DishId }[] = [
  { id: 'mandu', price: 7000, dish: 'mandu' },
  { id: 'myeolchi', price: 8000, dish: 'myeolchi' },
  { id: 'janchi', price: 8000, dish: 'janchi' },
  { id: 'sujebi', price: 8500, dish: 'sujebi' },
  { id: 'bibim', price: 9000, dish: 'bibim' },
  { id: 'mandu-guk', price: 9000, dish: 'manduguk' },
  { id: 'deulkkae', price: 10000, dish: 'deulkkae' },
  { id: 'naengmyeon', price: 10000, dish: 'naengmyeon' },
  { id: 'kong', price: 11000, dish: 'kong' },
  { id: 'kalguksu', price: 11000, dish: 'bajirak' },
]

const COPY = defineCopy({
  ko: {
    menus: {
      mandu: '손만두',
      myeolchi: '멸치국수',
      janchi: '잔치국수',
      sujebi: '수제비',
      bibim: '비빔국수',
      'mandu-guk': '만둣국',
      deulkkae: '들깨칼국수',
      naengmyeon: '물냉면',
      kong: '콩국수',
      kalguksu: '바지락칼국수',
    },
    price: (value: number) => `${value.toLocaleString('ko-KR')}원`,
    range: ({ lower, upper }: { lower: string; upper: string }) => `${lower} ~ ${upper}`,
    controlsLabel: '슬라이더 옵션',
    step: '눈금',
    minDistance: '최소 간격',
    note: (
      <>
        손잡이를 끌어 보세요. <b>최저가를 최고가 너머로 밀어도 최고가는 그대로</b>입니다 — 움직인 쪽이 멈춥니다. 트랙의 빈 곳을 누르면 가까운 손잡이가 그 자리로 오고, Tab으로 손잡이에 간 뒤 방향키로도 한 눈금씩 조절됩니다. 두 손잡이를 오른쪽 끝에 붙인 뒤 왼쪽으로 끌어 보세요 — 겹쳐 있어도 잡힙니다.
      </>
    ),
    title: '가격대',
    handles: { lower: '최저 가격', upper: '최고 가격' },
    count: (n: number) => `이 가격대에 ${n}개 메뉴`,
    empty: '이 가격대에는 메뉴가 없어요',
  },
  en: {
    menus: {
      mandu: 'Handmade dumplings',
      myeolchi: 'Anchovy-broth noodles',
      janchi: 'Feast noodles',
      sujebi: 'Hand-torn noodle soup',
      bibim: 'Spicy mixed noodles',
      'mandu-guk': 'Dumpling soup',
      deulkkae: 'Perilla knife-cut noodles',
      naengmyeon: 'Cold buckwheat noodles',
      kong: 'Cold soy-milk noodles',
      kalguksu: 'Clam knife-cut noodles',
    },
    price: (value: number) => `₩${value.toLocaleString('en-US')}`,
    range: ({ lower, upper }: { lower: string; upper: string }) => `${lower} – ${upper}`,
    controlsLabel: 'Slider options',
    step: 'Step',
    minDistance: 'Minimum gap',
    note: (
      <>
        Drag the handles. <b>Push the minimum past the maximum and the maximum stays put</b>: the handle you moved stops. Tap an empty spot on the track and the nearer handle jumps there. Tab to a handle and the arrow keys move it one step at a time. Push both handles to the right end, then drag left: you can still grab them while they overlap.
      </>
    ),
    title: 'Price range',
    handles: { lower: 'Minimum price', upper: 'Maximum price' },
    count: (n: number) => (n === 1 ? '1 dish in this range' : `${n} dishes in this range`),
    empty: 'No dishes in this price range',
  },
})

export const RangeSliderDemo = () => {
  const t = COPY[useDemoLang()]
  const [price, setPrice] = useState<RangeValue>({ lower: 8000, upper: 10000 })
  const [step, setStep] = useState(500)
  const [minDistance, setMinDistance] = useState(0)

  const matched = MENUS.filter((menu) => menu.price >= price.lower && menu.price <= price.upper)

  const vars = {
    '--range-accent': 'var(--accent)',
    '--range-track': 'var(--border)',
    '--range-thumb': 'var(--surface)',
  } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.step} <code>step</code>
          </span>
          <input type="range" min={500} max={5000} step={500} value={step} onChange={(e) => setStep(Number(e.target.value))} />
          <output>{t.price(step)}</output>
        </label>
        <label>
          <span>
            {t.minDistance} <code>minDistance</code>
          </span>
          <input
            type="range"
            min={0}
            max={10000}
            step={1000}
            value={minDistance}
            onChange={(e) => setMinDistance(Number(e.target.value))}
          />
          <output>{t.price(minDistance)}</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="rs-stage" style={vars}>
        <div className="rs-head">
          <h2 className="rs-title">{t.title}</h2>
          <strong className="rs-value">{t.range({ lower: t.price(price.lower), upper: t.price(price.upper) })}</strong>
        </div>

        <RangeSlider
          min={5000}
          max={15000}
          step={step}
          value={price}
          onChange={setPrice}
          minDistance={minDistance}
          label={t.handles}
          format={t.price}
          className="rs-slider"
        />

        <div className="rs-scale" aria-hidden="true">
          <span>{t.price(5000)}</span>
          <span>{t.price(15000)}</span>
        </div>

        <p className="rs-count" aria-live="polite">
          {t.count(matched.length)}
        </p>

        <ul className="rs-menus">
          {matched.map((menu) => (
            <li key={menu.id} className="rs-menu">
              <DishPhoto dish={menu.dish} className="rs-thumb" />
              <span className="rs-menu-name">{t.menus[menu.id]}</span>
              <span className="rs-menu-price">{t.price(menu.price)}</span>
            </li>
          ))}
          {matched.length === 0 && <li className="rs-empty">{t.empty}</li>}
        </ul>
      </div>
    </div>
  )
}
