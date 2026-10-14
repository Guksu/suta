import { useRef, useState } from 'react'
import { useToastStack } from '@skills/toast-stack/assets/useToastStack'
import { defineCopy, useDemoLang } from '../../demoLang'
import './toast-stack-demo.css'

// 토스트는 문장 하나로 결과를 알린다 — 끝에 이모지를 붙여 꾸미지 않는다
const COPY = defineCopy({
  ko: {
    messages: ['저장했어요', '장바구니에 담았어요', '주문을 받았어요', '찜 목록에 추가했어요', '링크를 복사했습니다'],
    controlsLabel: '옵션',
    duration: '소멸 시간',
    position: '위치',
    bottom: '하단 (위로 쌓임)',
    top: '상단 배너 (아래로 쌓임)',
    note: '연타해 보세요 — 새 토스트가 기존 것을 밀어내며 쌓이고(최대 3개), 각자 시간이 되면 사라집니다. 하단은 최신이 아래에 오고 위로 쌓이며, 상단 배너는 iOS 푸시처럼 위에서 내려와 최신이 맨 위에 옵니다.',
    fire: '토스트 띄우기',
    burst: '3연타',
  },
  en: {
    messages: ['Saved', 'Added to cart', 'Order placed', 'Added to Saved', 'Link copied'],
    controlsLabel: 'Options',
    duration: 'Display time',
    position: 'Position',
    bottom: 'Bottom (stacks upward)',
    top: 'Top banner (stacks downward)',
    note: 'Tap it rapidly. Each new toast pushes the older ones aside as they stack (up to 3), and each leaves when its time is up. At the bottom, the newest sits lowest and the stack grows upward. The top banner drops in from above like a phone notification, with the newest on top.',
    fire: 'Show toast',
    burst: 'Fire 3 in a row',
  },
})

type Position = 'bottom' | 'top'

export const ToastStackDemo = () => {
  const t = COPY[useDemoLang()]
  const [durationMs, setDurationMs] = useState(3500)
  const [position, setPosition] = useState<Position>('bottom')
  const { toast } = useToastStack({ durationMs, position })
  const nextRef = useRef(0)

  const fire = () => {
    toast(t.messages[nextRef.current % t.messages.length])
    nextRef.current += 1
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>durationMs</code>
          </span>
          <input
            type="range"
            min={1500}
            max={8000}
            step={500}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{(durationMs / 1000).toFixed(1)}s</output>
        </label>
        <fieldset className="toast-position-picker">
          <legend>
            {t.position} <code>position</code>
          </legend>
          <label>
            <input type="radio" name="toast-position" checked={position === 'bottom'} onChange={() => setPosition('bottom')} /> {t.bottom}
          </label>
          <label>
            <input type="radio" name="toast-position" checked={position === 'top'} onChange={() => setPosition('top')} /> {t.top}
          </label>
        </fieldset>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="toast-demo-stage">
        <button type="button" onClick={fire}>
          {t.fire}
        </button>
        <button
          type="button"
          onClick={() => {
            fire()
            setTimeout(fire, 250)
            setTimeout(fire, 500)
          }}
        >
          {t.burst}
        </button>
      </div>
    </div>
  )
}
