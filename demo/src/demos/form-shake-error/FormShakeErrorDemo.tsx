import { useState, type CSSProperties, type FormEvent } from 'react'
import { useShake, FieldError } from '@skills/form-shake-error/assets/ShakeField'
import { defineCopy, useDemoLang } from '../../demoLang'
import './form-shake-error-demo.css'

const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/

const COPY = defineCopy({
  ko: {
    hint: '빈 채로 예약을 눌러 보세요.',
    nameError: '예약자 이름을 입력해 주세요',
    phoneError: '010-1234-5678 형식으로 입력해 주세요',
    success: (name: string) => `${name}님, 예약을 받았어요`,
    invalid: '입력을 확인해 주세요.',
    controlsLabel: '애니메이션 옵션',
    distance: '세기',
    wholeForm: '입력 대신 폼 전체를 흔들기',
    note: '연속으로 여러 번 눌러 보세요 — 흔들리는 도중에 다시 틀려도 매번 처음부터 다시 흔들립니다(코어가 재시작을 보장). 흔들림과 함께 테두리가 붉어지고 메시지가 밀려 올라옵니다.',
    title: '국수공방 예약',
    nameLabel: '예약자 이름',
    phoneLabel: '전화번호',
    submit: '예약하기',
  },
  en: {
    hint: 'Press Reserve with the fields empty.',
    nameError: 'Enter the name for the reservation',
    phoneError: 'Use the format 010-1234-5678',
    success: (name: string) => `Thanks, ${name}. Your reservation is in.`,
    invalid: 'Check the fields above.',
    controlsLabel: 'Animation options',
    distance: 'Strength',
    wholeForm: 'Shake the whole form instead of the fields',
    note: 'Press it several times in a row. Even if you get it wrong again mid-shake, it starts over from the beginning every time (the core guarantees the restart). With the shake, the border turns red and the message slides up.',
    title: 'Noodle Workshop reservation',
    nameLabel: 'Name',
    phoneLabel: 'Phone number',
    submit: 'Reserve',
  },
})

// 안내 줄은 문구 대신 상태를 들고 있다 — 언어를 바꾸면 지금 보이는 안내도 따라 바뀐다
type Log = { kind: 'hint' } | { kind: 'success'; name: string } | { kind: 'invalid' }

export const FormShakeErrorDemo = () => {
  const t = COPY[useDemoLang()]
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [nameInvalid, setNameInvalid] = useState(false)
  const [phoneInvalid, setPhoneInvalid] = useState(false)
  const [distancePx, setDistancePx] = useState(6)
  const [shakeWholeForm, setShakeWholeForm] = useState(false)
  const [log, setLog] = useState<Log>({ kind: 'hint' })

  const nameField = useShake<HTMLInputElement>()
  const phoneField = useShake<HTMLInputElement>()
  const form = useShake<HTMLFormElement>()

  const vars = { '--shake-distance': `${distancePx}px` } as CSSProperties

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextNameError = !name.trim()
    const nextPhoneError = !PHONE_PATTERN.test(phone)
    setNameInvalid(nextNameError)
    setPhoneInvalid(nextPhoneError)

    if (!nextNameError && !nextPhoneError) {
      setLog({ kind: 'success', name })
      return
    }
    setLog({ kind: 'invalid' })
    if (shakeWholeForm) {
      form.shake()
    } else {
      if (nextNameError) nameField.shake()
      if (nextPhoneError) phoneField.shake()
    }
    // 첫 번째 오류 입력으로 포커스 — 키보드·스크린 리더 사용자가 곧바로 고칠 수 있다
    ;(nextNameError ? nameField : phoneField).ref.current?.focus()
  }

  const logText = log.kind === 'success' ? t.success(log.name) : log.kind === 'invalid' ? t.invalid : t.hint

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.distance} <code>--shake-distance</code>
          </span>
          <input type="range" min={2} max={14} step={1} value={distancePx} onChange={(e) => setDistancePx(Number(e.target.value))} />
          <output>{distancePx}px</output>
        </label>
        <label className="controls-inline">
          <input type="checkbox" checked={shakeWholeForm} onChange={(e) => setShakeWholeForm(e.target.checked)} />
          <span>{t.wholeForm}</span>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <form ref={form.ref} className="shake-stage" style={vars} onSubmit={handleSubmit} noValidate>
        <h2 className="shake-stage-title">{t.title}</h2>

        <div className="shake-field">
          <label htmlFor="shake-name">{t.nameLabel}</label>
          <input
            id="shake-name"
            ref={nameField.ref}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={nameInvalid}
            aria-describedby="shake-name-error"
            autoComplete="off"
          />
          <FieldError id="shake-name-error" message={nameInvalid ? t.nameError : undefined} />
        </div>

        <div className="shake-field">
          <label htmlFor="shake-phone">{t.phoneLabel}</label>
          <input
            id="shake-phone"
            ref={phoneField.ref}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={phoneInvalid}
            aria-describedby="shake-phone-error"
            inputMode="tel"
            autoComplete="off"
          />
          <FieldError id="shake-phone-error" message={phoneInvalid ? t.phoneError : undefined} />
        </div>

        <button type="submit">{t.submit}</button>
        <p className="shake-log" aria-live="polite">
          {logText}
        </p>
      </form>
    </div>
  )
}
