import { useState, type CSSProperties } from 'react'
import { Select } from '@skills/select/assets/Select'
import { defineCopy, useDemoLang } from '../../demoLang'
import './select-demo.css'

// 언어와 무관한 값(value)은 밖에, 옵션 이름은 COPY에 value로 둔다
const NOODLE_VALUES = ['somyeon', 'jungmyeon', 'kalguksu', 'memil', 'ssal'] as const
const SPICE_VALUES = ['0', '1', '2', '3'] as const

const COPY = defineCopy({
  ko: {
    noodles: { somyeon: '소면', jungmyeon: '중면', kalguksu: '칼국수면', memil: '메밀면', ssal: '쌀국수면' },
    spiceLevels: { 0: '0단계 — 맑은 국물', 1: '1단계 — 순한맛', 2: '2단계 — 칼칼한맛', 3: '3단계 — 얼얼한맛' },
    controlsLabel: '애니메이션 옵션',
    duration: '패널 드롭 속도',
    note: '클릭 대신 키보드로도 써보세요 — ↓로 열고 ↓↑로 이동, Enter로 선택, Esc로 취소. 포커스는 트리거에 남고 활성 옵션은 aria-activedescendant가 가리킵니다.',
    noodleLabel: '면 종류',
    noodlePlaceholder: '면 종류 선택',
    spiceLabel: '맵기',
    spicePlaceholder: '맵기 선택',
    result: ({ noodle, spice }: { noodle: string; spice: string }) => `${noodle}, ${spice}로 준비할게요.`,
    resultEmpty: '두 가지를 고르면 주문 문장이 완성됩니다.',
  },
  en: {
    noodles: {
      somyeon: 'Thin wheat noodles',
      jungmyeon: 'Medium wheat noodles',
      kalguksu: 'Knife-cut noodles',
      memil: 'Buckwheat noodles',
      ssal: 'Rice noodles',
    },
    spiceLevels: { 0: 'Level 0 (clear broth)', 1: 'Level 1 (mild)', 2: 'Level 2 (spicy)', 3: 'Level 3 (fiery)' },
    controlsLabel: 'Animation options',
    duration: 'Panel drop speed',
    note: 'Try it with the keyboard too: ↓ opens, ↓↑ move, Enter selects, Esc cancels. Focus stays on the trigger, and aria-activedescendant points to the active option.',
    noodleLabel: 'Noodle type',
    noodlePlaceholder: 'Choose noodles',
    spiceLabel: 'Spice level',
    spicePlaceholder: 'Choose spice level',
    result: ({ noodle, spice }: { noodle: string; spice: string }) => `Coming up: ${noodle}, ${spice}.`,
    resultEmpty: 'Pick both to complete your order.',
  },
})

export const SelectDemo = () => {
  const t = COPY[useDemoLang()]
  const [noodle, setNoodle] = useState<string | null>(null)
  const [spice, setSpice] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(200)

  const vars = { '--select-duration': `${durationMs}ms` } as CSSProperties
  const noodles = NOODLE_VALUES.map((value) => ({ value, label: t.noodles[value] }))
  const spiceLevels = SPICE_VALUES.map((value) => ({ value, label: t.spiceLevels[value] }))
  const noodleLabel = noodles.find((option) => option.value === noodle)?.label
  const spiceLabel = spiceLevels.find((option) => option.value === spice)?.label

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>--select-duration</code>
          </span>
          <input
            type="range"
            min={100}
            max={500}
            step={50}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{durationMs}ms</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="select-stage" style={vars}>
        <div className="select-field">
          <span className="select-field-label">{t.noodleLabel}</span>
          <Select options={noodles} value={noodle} onChange={setNoodle} label={t.noodleLabel} placeholder={t.noodlePlaceholder} />
        </div>
        <div className="select-field">
          <span className="select-field-label">{t.spiceLabel}</span>
          <Select options={spiceLevels} value={spice} onChange={setSpice} label={t.spiceLabel} placeholder={t.spicePlaceholder} />
        </div>
        <p className="select-result" aria-live="polite">
          {noodleLabel && spiceLabel ? t.result({ noodle: noodleLabel, spice: spiceLabel }) : t.resultEmpty}
        </p>
      </div>
    </div>
  )
}
