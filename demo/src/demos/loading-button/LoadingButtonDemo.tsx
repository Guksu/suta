import { useState } from 'react'
import { LoadingButton } from '@skills/loading-button/assets/LoadingButton'
import { defineCopy, useDemoLang } from '../../demoLang'
import './loading-button-demo.css'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const PRICE = 16000

const COPY = defineCopy({
  ko: {
    soldOut: '품절된 메뉴예요',
    controlsLabel: '버튼 옵션',
    latency: '서버 응답 지연',
    minLoading: '최소 로딩 유지',
    willFail: '서버가 실패로 응답',
    noteBefore: '지연을 90ms로 두고 최소 로딩을 0으로 내려 보세요 — 스피너가 깜빡이고 지나가 눌린 건지 알 수 없습니다. 400ms로 올리면 같은 응답이 "전송 중"으로 읽힙니다. 버튼을 연타해도 아래',
    noteStrong: '실제 전송',
    noteAfter: '수는 늘지 않습니다.',
    title: '멸치국수 2인분',
    price: (n: number) => `${n.toLocaleString('ko-KR')}원 · 성수동 손칼국수`,
    loadingLabel: '주문 중',
    successLabel: '주문 완료',
    errorLabel: '품절이에요',
    order: '주문하기',
    clicks: '버튼 클릭',
    sent: '실제 전송',
    times: (n: number) => `${n}회`,
    reset: '카운터 초기화',
  },
  en: {
    soldOut: 'This item is sold out',
    controlsLabel: 'Button options',
    latency: 'Server delay',
    minLoading: 'Minimum loading time',
    willFail: 'Server responds with an error',
    noteBefore: 'Set the delay to 90ms and drop the minimum loading time to 0. The spinner flickers past and you cannot tell whether the tap landed. Raise it to 400ms and the same response reads as "sending". Tap the button as fast as you like: the',
    noteStrong: 'Actually sent',
    noteAfter: 'count below does not go up.',
    title: 'Anchovy-broth noodles for 2',
    price: (n: number) => `₩${n.toLocaleString('en-US')} · Seongsu-dong Knife-cut Noodles`,
    loadingLabel: 'Ordering',
    successLabel: 'Ordered',
    errorLabel: 'Sold out',
    order: 'Order',
    clicks: 'Button clicks',
    sent: 'Actually sent',
    times: (n: number) => `${n}`,
    reset: 'Reset counters',
  },
})

export const LoadingButtonDemo = () => {
  const t = COPY[useDemoLang()]
  const [latencyMs, setLatencyMs] = useState(90)
  const [minLoadingMs, setMinLoadingMs] = useState(400)
  const [willFail, setWillFail] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [clickCount, setClickCount] = useState(0)

  const placeOrder = async () => {
    setSentCount((prev) => prev + 1) // 실제로 서버에 나간 요청 수 — 연타해도 늘지 않아야 한다
    await delay(latencyMs)
    if (willFail) throw new Error(t.soldOut)
    return 'ok'
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.latency} <code>latency</code>
          </span>
          <input type="range" min={0} max={2000} step={10} value={latencyMs} onChange={(e) => setLatencyMs(Number(e.target.value))} />
          <output>{latencyMs}ms</output>
        </label>
        <label>
          <span>
            {t.minLoading} <code>minLoadingMs</code>
          </span>
          <input type="range" min={0} max={1200} step={50} value={minLoadingMs} onChange={(e) => setMinLoadingMs(Number(e.target.value))} />
          <output>{minLoadingMs}ms</output>
        </label>
        <label className="controls-inline">
          <input type="checkbox" checked={willFail} onChange={(e) => setWillFail(e.target.checked)} />
          <span>{t.willFail}</span>
        </label>
        <p className="controls-note">
          {t.noteBefore} <b>{t.noteStrong}</b> {t.noteAfter}
        </p>
      </section>

      <div className="lb-stage">
        <h2 className="lb-stage-title">{t.title}</h2>
        <p className="lb-stage-price">{t.price(PRICE)}</p>

        <div className="lb-actions" onClickCapture={() => setClickCount((prev) => prev + 1)}>
          <LoadingButton
            onAction={placeOrder}
            minLoadingMs={minLoadingMs}
            loadingLabel={t.loadingLabel}
            successLabel={t.successLabel}
            errorLabel={t.errorLabel}
          >
            {t.order}
          </LoadingButton>
        </div>

        <dl className="lb-counters">
          <div>
            <dt>{t.clicks}</dt>
            <dd>{t.times(clickCount)}</dd>
          </div>
          <div>
            <dt>{t.sent}</dt>
            <dd className="lb-counter-strong">{t.times(sentCount)}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="lb-reset"
          onClick={() => {
            setClickCount(0)
            setSentCount(0)
          }}
        >
          {t.reset}
        </button>
      </div>
    </div>
  )
}
