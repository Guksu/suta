import { useRef, useState, type CSSProperties } from 'react'
import { OtpInput, type OtpHandle } from '@skills/otp-input/assets/OtpInput'
import { defineCopy, useDemoLang } from '../../demoLang'
import './otp-input-demo.css'

const CORRECT = '482913'

const COPY = defineCopy({
  ko: {
    controlsLabel: '입력 옵션',
    length: '칸 수',
    cells: (n: number) => `${n}칸`,
    cellSize: '칸 크기',
    note: (code: string) => (
      <>
        <b>{code}</b>를 입력하면 통과입니다. 한 글자를 치면 다음 칸으로 넘어가고, 빈 칸에서 지우면 앞 칸으로 돌아갑니다. <b>{code}</b>를 복사해 아무 칸에나 붙여넣어 보세요 — 칸마다 하나씩 나뉩니다. 틀리면 흔들리고 비워집니다(마지막 칸을 채우는 순간 자동으로 확인합니다).
      </>
    ),
    title: '휴대폰 인증',
    hint: (n: number) => `010-••••-1234로 보낸 ${n}자리를 입력해 주세요`,
    // 패턴 기본값과 같은 문구 — 영어판과 모양을 맞추려고 여기에 적는다
    otpLabel: '인증번호',
    digitLabel: ({ label, position }: { label: string; position: number }) => `${label} ${position}번째 자리`,
    error: '인증번호를 다시 확인해 주세요',
    success: '인증되었습니다 ✓',
    attempts: (n: number) => `시도 ${n}회`,
    reset: '다시 하기',
  },
  en: {
    controlsLabel: 'Input options',
    length: 'Digits',
    cells: (n: number) => `${n} digits`,
    cellSize: 'Cell size',
    note: (code: string) => (
      <>
        Enter <b>{code}</b> to pass. Typing a digit moves to the next cell, and deleting in an empty cell goes back one. Copy <b>{code}</b> and paste it into any cell: it splits one digit per cell. A wrong code shakes and clears (it checks automatically the moment the last cell is filled).
      </>
    ),
    title: 'Phone verification',
    hint: (n: number) => `Enter the ${n}-digit code sent to 010-••••-1234`,
    otpLabel: 'Verification code',
    digitLabel: ({ label, position }: { label: string; position: number }) => `${label}, digit ${position}`,
    error: 'That code is not correct',
    success: 'Verified ✓',
    attempts: (n: number) => (n === 1 ? '1 attempt' : `${n} attempts`),
    reset: 'Start over',
  },
})

export const OtpInputDemo = () => {
  const t = COPY[useDemoLang()]
  const [length, setLength] = useState(6)
  const [cellSize, setCellSize] = useState(48)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [attempts, setAttempts] = useState(0)
  const otp = useRef<OtpHandle>(null)

  const expected = CORRECT.slice(0, length)

  const verify = (code: string) => {
    setAttempts((prev) => prev + 1)
    if (code === expected) {
      setStatus('success')
      return
    }
    setStatus('error')
    otp.current?.shake()
    otp.current?.clear()
  }

  const vars = {
    '--otp-cell-size': `${cellSize}px`,
    '--otp-bg': 'var(--bg)',
    '--otp-color': 'var(--text)',
    '--otp-border': 'var(--border)',
    '--otp-filled-border': 'var(--text-dim)',
    '--otp-accent': 'var(--accent)',
  } as CSSProperties

  const reset = () => {
    setStatus('idle')
    setAttempts(0)
    otp.current?.clear()
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.length} <code>length</code>
          </span>
          <input type="range" min={4} max={8} step={1} value={length} onChange={(e) => setLength(Number(e.target.value))} />
          <output>{t.cells(length)}</output>
        </label>
        <label>
          <span>
            {t.cellSize} <code>--otp-cell-size</code>
          </span>
          <input type="range" min={36} max={72} step={2} value={cellSize} onChange={(e) => setCellSize(Number(e.target.value))} />
          <output>{cellSize}px</output>
        </label>
        <p className="controls-note">{t.note(expected)}</p>
      </section>

      <div className="otp-stage" style={vars}>
        <h2 className="otp-stage-title">{t.title}</h2>
        <p className="otp-stage-hint">{t.hint(length)}</p>

        {/* key로 칸 수가 바뀔 때 입력을 새로 만든다 — 남은 값이 새 칸 수와 어긋나지 않게 */}
        <OtpInput key={length} ref={otp} length={length} onComplete={verify} autoFocus={false} label={t.otpLabel} digitLabel={t.digitLabel} />

        <p className="otp-message" role="alert" data-status={status}>
          {status === 'error' && t.error}
          {status === 'success' && t.success}
        </p>

        <div className="otp-footer">
          <span>{t.attempts(attempts)}</span>
          <button type="button" onClick={reset}>
            {t.reset}
          </button>
        </div>
      </div>
    </div>
  )
}
