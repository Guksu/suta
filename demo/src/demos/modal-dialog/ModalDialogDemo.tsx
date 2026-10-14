import { useState, type CSSProperties } from 'react'
import { Modal } from '@skills/modal-dialog/assets/Modal'
import { defineCopy, useDemoLang } from '../../demoLang'
import './modal-dialog-demo.css'

type Which = 'cancel' | 'pay' | null

const PAY_AMOUNT = 19000

const COPY = defineCopy({
  ko: {
    log: {
      intro: '버튼을 눌러 모달을 열어 보세요.',
      cancelDismissed: '취소 확인창을 닫았어요.',
      kept: '돌아가기를 눌렀어요 — 주문은 그대로예요.',
      cancelled: '주문을 취소했어요.',
      payDismissed: '결제창은 백드롭 클릭으로 닫히지 않습니다 — Esc 또는 버튼으로 닫힙니다.',
      payCancelled: '결제를 취소했어요.',
      paid: '결제를 마쳤어요',
    },
    controlsLabel: '애니메이션 옵션',
    duration: '속도',
    note: (
      <>
        열린 뒤 Tab을 눌러 보세요 — 포커스가 모달 안에서만 돕니다. Esc·백드롭 클릭으로 닫히고, 닫히면
        포커스가 열었던 버튼으로 돌아옵니다. 전부 네이티브 <code>&lt;dialog&gt;</code>가 하는 일입니다.
      </>
    ),
    orderTitle: '주문 #1024 — 들깨칼국수 1 · 비빔국수 1',
    cancelOrder: '주문 취소',
    pay: '결제하기',
    cancelTitle: '주문을 취소할까요?',
    cancelText: '조리가 시작되면 취소할 수 없어요. 지금은 취소할 수 있어요.',
    goBack: '돌아가기',
    confirmCancel: '취소하기',
    payTitle: (amount: number) => `${amount.toLocaleString('ko-KR')}원을 결제할까요?`,
    payText: (
      <>
        파괴적·결제성 확인이라 <code>dismissOnBackdrop=false</code> — 바깥을 눌러도 닫히지 않습니다.
      </>
    ),
    payCancel: '취소',
    payConfirm: '결제',
  },
  en: {
    log: {
      intro: 'Press a button to open a modal.',
      cancelDismissed: 'Closed the cancel dialog.',
      kept: 'You pressed Go back. The order stays.',
      cancelled: 'The order was canceled.',
      payDismissed: 'The payment dialog ignores backdrop clicks. Close it with Esc or a button.',
      payCancelled: 'Payment canceled.',
      paid: 'Payment complete.',
    },
    controlsLabel: 'Animation options',
    duration: 'Speed',
    note: (
      <>
        Once it opens, press Tab: focus cycles only inside the modal. Esc or a backdrop click closes it, and focus
        returns to the button that opened it. The native <code>&lt;dialog&gt;</code> does all of this.
      </>
    ),
    orderTitle: 'Order #1024: Perilla knife-cut noodles ×1 · Spicy mixed noodles ×1',
    cancelOrder: 'Cancel order',
    pay: 'Pay now',
    cancelTitle: 'Cancel this order?',
    cancelText: 'Once cooking starts, the order can no longer be canceled. You can still cancel now.',
    goBack: 'Go back',
    confirmCancel: 'Cancel order',
    payTitle: (amount: number) => `Pay ₩${amount.toLocaleString('en-US')}?`,
    payText: (
      <>
        This confirms a payment, so <code>dismissOnBackdrop=false</code>: clicking outside does not close it.
      </>
    ),
    payCancel: 'Cancel',
    payConfirm: 'Pay',
  },
})

type LogKey = keyof (typeof COPY)['ko']['log']

export const ModalDialogDemo = () => {
  const t = COPY[useDemoLang()]
  const [which, setWhich] = useState<Which>(null)
  const [durationMs, setDurationMs] = useState(240)
  // 문구 대신 키를 기억한다 — 언어를 바꿔도 마지막 기록이 새 언어로 다시 그려진다
  const [log, setLog] = useState<LogKey>('intro')

  const vars = { '--modal-duration': `${durationMs}ms`, '--modal-bg': 'var(--surface)' } as CSSProperties
  const closeWith = (message: LogKey) => {
    setWhich(null)
    setLog(message)
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>--modal-duration</code>
          </span>
          <input
            type="range"
            min={100}
            max={600}
            step={20}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{durationMs}ms</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="modal-stage" style={vars}>
        <h2 className="modal-stage-title">{t.orderTitle}</h2>
        <div className="modal-stage-actions">
          <button type="button" onClick={() => setWhich('cancel')}>
            {t.cancelOrder}
          </button>
          <button type="button" onClick={() => setWhich('pay')}>
            {t.pay}
          </button>
        </div>
        <p className="modal-stage-log" aria-live="polite">
          {t.log[log]}
        </p>

        <Modal open={which === 'cancel'} onClose={() => closeWith('cancelDismissed')} labelledBy="cancel-title">
          <h2 id="cancel-title" className="modal-demo-title">
            {t.cancelTitle}
          </h2>
          <p className="modal-demo-text">{t.cancelText}</p>
          <div className="modal-demo-actions">
            <button type="button" onClick={() => closeWith('kept')}>
              {t.goBack}
            </button>
            <button type="button" className="modal-demo-danger" onClick={() => closeWith('cancelled')}>
              {t.confirmCancel}
            </button>
          </div>
        </Modal>

        <Modal open={which === 'pay'} onClose={() => closeWith('payDismissed')} labelledBy="pay-title" dismissOnBackdrop={false}>
          <h2 id="pay-title" className="modal-demo-title">
            {t.payTitle(PAY_AMOUNT)}
          </h2>
          <p className="modal-demo-text">{t.payText}</p>
          <div className="modal-demo-actions">
            <button type="button" onClick={() => closeWith('payCancelled')}>
              {t.payCancel}
            </button>
            <button type="button" className="modal-demo-primary" onClick={() => closeWith('paid')}>
              {t.payConfirm}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  )
}
