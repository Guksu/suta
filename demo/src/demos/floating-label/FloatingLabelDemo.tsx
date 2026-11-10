import { useState, type CSSProperties } from 'react'
import { TextField } from '@skills/floating-label/assets/TextField'
import { defineCopy, useDemoLang } from '../../demoLang'
import './floating-label-demo.css'

const COPY = defineCopy({
  ko: {
    controlsLabel: '애니메이션 옵션',
    speed: '떠오름 속도',
    note: '클릭(포커스)하면 라벨이 떠오르고, 값을 남긴 채 벗어나도 떠 있습니다 — 판정이 전부 CSS(:focus·:placeholder-shown)라 JS 상태가 없습니다.',
    title: '단체 예약 문의',
    name: '예약자 이름',
    nameError: '예약자 이름을 입력해 주세요',
    phoneHelp: '예약 확인 문자를 보내 드려요',
    phone: '연락처',
    headcount: '인원 (4명부터)',
    submit: '문의 남기기',
  },
  en: {
    controlsLabel: 'Animation options',
    speed: 'Float speed',
    note: 'Click (focus) a field and the label floats up. Leave with a value in it and the label stays up. It is all decided in CSS (:focus, :placeholder-shown), so there is no JS state.',
    title: 'Group booking inquiry',
    name: 'Name for the booking',
    nameError: 'Enter the name for the booking',
    phoneHelp: 'We text the booking confirmation to this number',
    phone: 'Phone',
    headcount: 'Party size (4 or more)',
    submit: 'Send inquiry',
  },
})

export const FloatingLabelDemo = () => {
  const t = COPY[useDemoLang()]
  const [durationMs, setDurationMs] = useState(150)
  const [name, setName] = useState('')
  const [nameMissing, setNameMissing] = useState(false)

  const vars = { '--field-duration': `${durationMs}ms` } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.speed} <code>--field-duration</code>
          </span>
          <input
            type="range"
            min={80}
            max={400}
            step={10}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{durationMs}ms</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <form
        className="field-stage"
        style={vars}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setNameMissing(!name.trim())
        }}
      >
        <h2 className="field-stage-title">{t.title}</h2>
        {/* 빈 채로 보내면 오류 문구가 도움말 자리에 선다 — 다시 입력을 시작하면 내린다 */}
        <TextField
          label={t.name}
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setNameMissing(false)
          }}
          errorText={nameMissing ? t.nameError : undefined}
        />
        <TextField label={t.phone} type="tel" name="phone" helperText={t.phoneHelp} />
        <TextField label={t.headcount} type="number" name="headcount" />
        <button type="submit">{t.submit}</button>
      </form>
    </div>
  )
}
