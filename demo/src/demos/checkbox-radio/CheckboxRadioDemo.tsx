import { useState, type CSSProperties } from 'react'
import { Checkbox } from '@skills/checkbox-radio/assets/Checkbox'
import { Radio } from '@skills/checkbox-radio/assets/Radio'
import { defineCopy, useDemoLang } from '../../demoLang'
import './checkbox-radio-demo.css'

// 언어와 무관한 값(아이디)은 밖에, 보이는 이름은 COPY에 아이디로 둔다
const NOODLES = ['somyeon', 'kalguksu', 'jjolmyeon'] as const
const TOPPINGS = ['egg', 'greenOnion', 'mandu'] as const

type NoodleId = (typeof NOODLES)[number]

const COPY = defineCopy({
  ko: {
    noodles: { somyeon: '소면', kalguksu: '칼국수', jjolmyeon: '쫄면' } satisfies Record<NoodleId, string>,
    toppings: { egg: '계란 (+500원)', greenOnion: '파 많이', mandu: '만두 3개 (+2,000원)' } satisfies Record<(typeof TOPPINGS)[number], string>,
    controlsLabel: '애니메이션 옵션',
    speed: '속도',
    note: '체크마크는 획 순서대로 그려지고(박스가 먼저 칠해진 뒤 30% 늦게 시작), 라디오 도트는 살짝 튀어 맺힙니다. 라디오에 포커스를 두고 ←→ 화살표로 옮겨 보세요 — 네이티브 input이라 그대로 됩니다.',
    noodleLegend: '면 종류 (하나만)',
    toppingLegend: '토핑 (여러 개)',
    refill: '셀프 리필 (준비 중)',
    agree: '주문 안내에 동의합니다',
    toppingCount: (count: number) => ` + 토핑 ${count}개`,
    ready: ' — 주문 가능',
    needAgree: ' — 동의가 필요해요',
  },
  en: {
    noodles: { somyeon: 'Thin wheat noodles', kalguksu: 'Knife-cut noodles', jjolmyeon: 'Chewy spicy noodles' },
    toppings: { egg: 'Egg (+₩500)', greenOnion: 'Extra green onion', mandu: '3 dumplings (+₩2,000)' },
    controlsLabel: 'Animation options',
    speed: 'Speed',
    note: 'The checkmark draws in stroke order (starting 30% after the box fills), and the radio dot pops in with a small bounce. Focus a radio and move with the ←→ arrow keys. They are native inputs, so this just works.',
    noodleLegend: 'Noodles (pick one)',
    toppingLegend: 'Toppings (pick any)',
    refill: 'Self refill (coming soon)',
    agree: 'I agree to the order terms',
    toppingCount: (count: number) => ` + ${count} ${count === 1 ? 'topping' : 'toppings'}`,
    ready: ': ready to order',
    needAgree: ': agreement needed',
  },
})

export const CheckboxRadioDemo = () => {
  const t = COPY[useDemoLang()]
  const [noodle, setNoodle] = useState<NoodleId>('somyeon')
  const [toppings, setToppings] = useState<string[]>([])
  const [agree, setAgree] = useState(false)
  const [durationMs, setDurationMs] = useState(200)

  const vars = { '--check-duration': `${durationMs}ms`, '--check-accent': 'var(--accent)' } as CSSProperties
  const noodleLabel = t.noodles[noodle]

  const toggleTopping = ({ id, next }: { id: string; next: boolean }) => {
    setToppings((prev) => (next ? [...prev, id] : prev.filter((toppingId) => toppingId !== id)))
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.speed} <code>--check-duration</code>
          </span>
          <input
            type="range"
            min={100}
            max={600}
            step={50}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{durationMs}ms</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <form className="check-stage" style={vars} onSubmit={(e) => e.preventDefault()}>
        <fieldset className="check-group">
          <legend>{t.noodleLegend}</legend>
          {NOODLES.map((id) => (
            <Radio key={id} name="noodle" value={id} checked={noodle === id} onChange={() => setNoodle(id)} label={t.noodles[id]} />
          ))}
        </fieldset>

        <fieldset className="check-group">
          <legend>{t.toppingLegend}</legend>
          {TOPPINGS.map((id) => (
            <Checkbox
              key={id}
              checked={toppings.includes(id)}
              onChange={(e) => toggleTopping({ id, next: e.target.checked })}
              label={t.toppings[id]}
            />
          ))}
          <Checkbox label={t.refill} disabled />
        </fieldset>

        <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} label={t.agree} />

        <p className="check-result" aria-live="polite">
          {noodleLabel}
          {toppings.length > 0 ? t.toppingCount(toppings.length) : ''}
          {agree ? t.ready : t.needAgree}
        </p>
      </form>
    </div>
  )
}
