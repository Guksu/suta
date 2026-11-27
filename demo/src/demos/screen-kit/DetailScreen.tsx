import { useState } from 'react'
import { PhotoFrame } from '@skills/screen-kit/assets/ScreenKit'
import { ActionBar, CheckList, OptionSection, PickGroup } from '@skills/screen-kit/assets/ScreenKitDetail'
import { QuantityStepper } from '@skills/quantity-stepper/assets/QuantityStepper'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { photoSrc } from '../../shared/dishes'
import { defineCopy, useDemoLang } from '../../demoLang'

/* 메뉴 상세 — 사진 머리 · 이름 묶음 · 옵션 구역(하나·여러 개) · 수량 줄 · 하단 고정 바.
 * 값(가격·추가 금액)은 COPY 밖 한곳에 두고, 합계는 늘 (기본가 + 면 양 + 추가) × 수량으로 계산한다 */

const BASE_PRICE = 7000
const SIZES = [
  { id: 'regular', extra: 0 },
  { id: 'large', extra: 1500 },
] as const
const ADDONS = [
  { id: 'egg', extra: 1000 },
  { id: 'laver', extra: 500 },
  { id: 'mandu', extra: 3000 },
] as const
type SizeId = (typeof SIZES)[number]['id']
type AddonId = (typeof ADDONS)[number]['id']

/** 고른 옵션과 수량의 합계 — 화면에 보이는 모든 금액이 이 한 곳에서 나온다 */
const totalOf = ({ size, addons, count }: { size: SizeId; addons: string[]; count: number }) => {
  const sizeExtra = SIZES.find((item) => item.id === size)?.extra ?? 0
  const addonExtra = ADDONS.filter((item) => addons.includes(item.id)).reduce((sum, item) => sum + item.extra, 0)
  return (BASE_PRICE + sizeExtra + addonExtra) * count
}

const COPY = defineCopy({
  ko: {
    back: '뒤로',
    share: '공유',
    photoCount: '사진',
    name: '잔치국수',
    desc: '아침마다 멸치와 다시마로 우린 맑은 육수에 소면을 말았어요. 달걀지단과 김, 애호박을 올려요.',
    pickup: (minutes: number) => (
      <>
        <b>{minutes}분</b> 뒤 픽업
      </>
    ),
    left: (bowls: number) => (
      <>
        오늘 <b>{bowls}그릇</b> 남음
      </>
    ),
    sizeTitle: '면 양',
    one: '하나 선택',
    sizes: { regular: '보통', large: '곱빼기' } as Record<SizeId, string>,
    addonTitle: '추가',
    many: '여러 개 선택',
    addons: { egg: '달걀지단 더', laver: '김가루 더', mandu: '손만두 2개' } as Record<AddonId, string>,
    qtyTitle: '수량',
    qtyLabel: '잔치국수 수량',
    qtyButtons: {
      decrease: (label: string) => `${label} 줄이기`,
      remove: (label: string) => `${label} 삭제`,
      increase: (label: string) => `${label} 늘리기`,
    },
    add: '담기',
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    plus: (n: number) => `+${n.toLocaleString('ko-KR')}원`,
    added: (count: number, total: string) => `잔치국수 ${count}그릇을 담았어요. ${total}`,
  },
  en: {
    back: 'Back',
    share: 'Share',
    photoCount: 'Photo',
    name: 'Feast noodles',
    desc: 'Thin wheat noodles in a clear broth we make every morning from anchovy and kelp, topped with egg ribbons, laver and zucchini.',
    pickup: (minutes: number) => (
      <>
        Pick up in <b>{minutes} min</b>
      </>
    ),
    left: (bowls: number) => (
      <>
        <b>{bowls} bowls</b> left today
      </>
    ),
    sizeTitle: 'Noodle size',
    one: 'Pick one',
    sizes: { regular: 'Regular', large: 'Large' } as Record<SizeId, string>,
    addonTitle: 'Extras',
    many: 'Pick any',
    addons: { egg: 'Extra egg ribbons', laver: 'Extra laver flakes', mandu: '2 handmade dumplings' } as Record<AddonId, string>,
    qtyTitle: 'Quantity',
    qtyLabel: 'Feast noodles quantity',
    qtyButtons: {
      decrease: (label: string) => `Decrease ${label}`,
      remove: (label: string) => `Remove ${label}`,
      increase: (label: string) => `Increase ${label}`,
    },
    add: 'Add to order',
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    plus: (n: number) => `+₩${n.toLocaleString('en-US')}`,
    added: (count: number, total: string) => `Added ${count} feast noodles. ${total}`,
  },
})

export const DetailScreen = () => {
  const t = COPY[useDemoLang()]
  const [size, setSize] = useState<SizeId>('regular')
  const [addons, setAddons] = useState<string[]>(['egg'])
  const [count, setCount] = useState(2)
  const [status, setStatus] = useState('')
  const total = t.price(totalOf({ size, addons, count }))

  return (
    <div className="kit-screen">
      <div className="kit-column">
        <div className="kit-hero">
          <PhotoFrame src={photoSrc('janchi')} alt={t.name} loading="eager" />
          <div className="kit-hero-bar">
            <a className="kit-hero-button" href="#/screen-kit" aria-label={t.back}>
              <Icon name="chevron-left" />
            </a>
            <button type="button" className="kit-hero-button" aria-label={t.share}>
              <Icon name="share" size={22} />
            </button>
          </div>
          <span className="kit-hero-count">
            <span className="kit-sr">{t.photoCount} </span>1 / 3
          </span>
        </div>

        <div className="kit-info">
          <h2 className="kit-info-name">{t.name}</h2>
          <p className="kit-info-price">{t.price(BASE_PRICE)}</p>
          <p className="kit-info-desc">{t.desc}</p>
          <ul className="kit-info-meta">
            <li>{t.pickup(15)}</li>
            <li>{t.left(42)}</li>
          </ul>
        </div>

        <div className="kit-band" />

        <OptionSection title={t.sizeTitle} hint={t.one} titleId="skd-size" level={3}>
          <PickGroup
            name="skd-size"
            labelledBy="skd-size"
            value={size}
            onChange={(value) => setSize(value as SizeId)}
            options={SIZES.map((item) => ({ value: item.id, label: t.sizes[item.id], extra: item.extra ? t.plus(item.extra) : undefined }))}
          />
        </OptionSection>

        <OptionSection title={t.addonTitle} hint={t.many} titleId="skd-addon" level={3}>
          <CheckList
            labelledBy="skd-addon"
            name="skd-addon"
            values={addons}
            onChange={setAddons}
            options={ADDONS.map((item) => ({ value: item.id, label: t.addons[item.id], price: t.plus(item.extra) }))}
          />
        </OptionSection>

        <section className="kit-option kit-qty" aria-labelledby="skd-qty">
          <h3 id="skd-qty" className="kit-option-title">
            {t.qtyTitle}
          </h3>
          <QuantityStepper value={count} onChange={setCount} min={1} max={20} label={t.qtyLabel} buttonLabels={t.qtyButtons} />
        </section>

        <ActionBar label={t.add} total={total} onClick={() => setStatus(t.added(count, total))} />
        <p className="kit-sr" role="status">
          {status}
        </p>
      </div>
    </div>
  )
}
