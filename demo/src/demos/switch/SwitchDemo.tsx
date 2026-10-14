import { useState, type CSSProperties } from 'react'
import { Switch } from '@skills/switch/assets/Switch'
import { defineCopy, useDemoLang } from '../../demoLang'
import './switch-demo.css'

// 언어와 무관한 id는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const OPTION_IDS = ['extra', 'greenOnion', 'egg', 'soupApart'] as const

const COPY = defineCopy({
  ko: {
    options: { extra: '곱빼기 (+1,000원)', greenOnion: '파 많이', egg: '계란 추가 (+500원)', soupApart: '국물 따로 포장' },
    controlsLabel: '애니메이션 옵션',
    duration: '속도',
    note: '마우스로 누르고 있어 보세요 — 썸이 살짝 눌리는 스퀴시(iOS 관례)가 들어 있습니다. Tab으로 포커스한 뒤 Space로도 켜집니다 — 네이티브 체크박스가 그대로 일하기 때문입니다.',
    title: '주문 옵션',
    refill: '셀프 리필 (준비 중)',
    result: (count: number) => (count > 0 ? `옵션 ${count}개가 주문에 적용돼요.` : '원하는 옵션을 켜보세요.'),
  },
  en: {
    options: { extra: 'Large size (+₩1,000)', greenOnion: 'Extra scallions', egg: 'Add an egg (+₩500)', soupApart: 'Pack the broth separately' },
    controlsLabel: 'Animation options',
    duration: 'Speed',
    note: 'Press and hold with the mouse. The thumb squishes slightly, as phone settings switches do. You can also focus it with Tab and turn it on with Space, because the native checkbox does the work.',
    title: 'Order options',
    refill: 'Self-serve refills (coming soon)',
    result: (count: number) =>
      count === 0 ? 'Turn on the options you want.' : count === 1 ? '1 option applies to your order.' : `${count} options apply to your order.`,
  },
})

export const SwitchDemo = () => {
  const t = COPY[useDemoLang()]
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [durationMs, setDurationMs] = useState(200)

  const vars = { '--switch-duration': `${durationMs}ms` } as CSSProperties
  const count = checkedIds.length

  const toggleOption = ({ id, next }: { id: string; next: boolean }) => {
    setCheckedIds((prev) => (next ? [...prev, id] : prev.filter((checkedId) => checkedId !== id)))
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>--switch-duration</code>
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

      <div className="switch-stage" style={vars}>
        <h2 className="switch-stage-title">{t.title}</h2>
        {OPTION_IDS.map((id) => (
          <Switch
            key={id}
            checked={checkedIds.includes(id)}
            onChange={(next) => toggleOption({ id, next })}
            label={t.options[id]}
          />
        ))}
        <Switch checked={false} onChange={() => {}} label={t.refill} disabled />
        <p className="switch-result" aria-live="polite">
          {t.result(count)}
        </p>
      </div>
    </div>
  )
}
