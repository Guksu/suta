import { useState, type CSSProperties } from 'react'
import { Accordion } from '@skills/accordion/assets/Accordion'
import { defineCopy, useDemoLang } from '../../demoLang'
import './accordion-demo.css'

const COPY = defineCopy({
  ko: {
    faqs: [
      {
        id: 'takeout',
        title: '포장 되나요?',
        content: '네, 모든 메뉴 포장 가능합니다. 국물은 따로 담아드리며, 면과 국물을 합치기 전 상태로 드려요.',
      },
      {
        id: 'waiting',
        title: '웨이팅은 어떻게 하나요?',
        content: '매장 앞 태블릿에 전화번호를 등록해 주세요. 입장 순서가 되면 알림톡을 보내 드려요.',
      },
      {
        id: 'parking',
        title: '주차할 곳이 있나요?',
        content: '건물 지하 주차장을 1시간 무료로 이용하실 수 있습니다. 만차 시 옆 공영주차장을 안내드려요.',
      },
      {
        id: 'soldout',
        title: '재료가 소진되면 어떻게 되나요?',
        content: '그날 뽑은 면이 소진되면 조기 마감합니다. 마감 여부는 매장 안내 탭에서 실시간으로 확인할 수 있어요.',
      },
    ],
    controlsLabel: '애니메이션 옵션',
    duration: '펼침 속도',
    type: '열림 모드',
    single: 'single — 하나만 열림',
    multiple: 'multiple — 여러 개 열림',
    note: '높이 애니메이션인데 JS 측정이 없습니다 — grid-template-rows를 0fr↔1fr로 전이하면 콘텐츠 높이만큼 열립니다. height: auto는 전이가 안 되지만 fr 단위는 됩니다.',
    title: '자주 묻는 질문',
  },
  en: {
    faqs: [
      {
        id: 'takeout',
        title: 'Can I get takeout?',
        content: 'Yes, every item is available to go. We pack the broth separately, so the noodles and broth stay apart until you combine them.',
      },
      {
        id: 'waiting',
        title: 'How does the waitlist work?',
        content: 'Add your phone number on the tablet by the door. We will text you when it is your turn.',
      },
      {
        id: 'parking',
        title: 'Is there parking?',
        content: 'The underground lot in our building is free for the first hour. If it is full, we will point you to the public lot next door.',
      },
      {
        id: 'soldout',
        title: 'What happens when you run out?',
        content: "We close early once the day's fresh noodles are gone. Check the store info tab for live updates on closing.",
      },
    ],
    controlsLabel: 'Animation options',
    duration: 'Expand speed',
    type: 'Open mode',
    single: 'single: one at a time',
    multiple: 'multiple: several at once',
    note: 'This animates height with no JS measuring. Transition grid-template-rows between 0fr and 1fr and the panel opens to its content height. height: auto cannot transition, but fr units can.',
    title: 'Frequently asked questions',
  },
})

export const AccordionDemo = () => {
  const t = COPY[useDemoLang()]
  const [type, setType] = useState<'single' | 'multiple'>('single')
  const [durationMs, setDurationMs] = useState(300)

  const vars = { '--accordion-duration': `${durationMs}ms` } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>--accordion-duration</code>
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
        <label>
          <span>
            {t.type} <code>type</code>
          </span>
          <select value={type} onChange={(e) => setType(e.target.value as 'single' | 'multiple')}>
            <option value="single">{t.single}</option>
            <option value="multiple">{t.multiple}</option>
          </select>
        </label>
        <p className="controls-note">
          {t.note}
        </p>
      </section>

      <div className="accordion-stage" style={vars}>
        <h2 className="accordion-stage-title">{t.title}</h2>
        <Accordion key={type} items={t.faqs} type={type} />
      </div>
    </div>
  )
}
