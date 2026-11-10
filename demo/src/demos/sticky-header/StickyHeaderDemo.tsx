import { useRef } from 'react'
import { useStickyHeader } from '@skills/sticky-header/assets/useStickyHeader'
import { defineCopy, useDemoLang } from '../../demoLang'
import './sticky-header-demo.css'

const COPY = defineCopy({
  ko: {
    sections: ['얼큰 칼국수', '들깨 수제비', '냉모밀 정식', '만두 한 판'],
    controlsLabel: '안내',
    note: '아래 상세 화면을 스크롤하세요 — 큰 제목이 밀려 나가는 순간 상단 고정 바에 컴팩트 제목이 나타납니다. 헤더 높이는 변하지 않습니다(레이아웃 애니메이션 없음).',
    frameLabel: '가게 상세 화면',
    shopName: '성수동 손칼국수',
    tagline: '수요미식회에 안 나온 것이 미스터리인 집',
    sectionBody: '멸치 육수는 새벽마다 다시 내립니다. 면은 주문이 들어오면 그때 썰기 시작합니다. 곱빼기는 사장님 기분에 따라 무료입니다.',
  },
  en: {
    sections: ['Spicy knife-cut noodles', 'Perilla hand-torn noodle soup', 'Cold soba set', 'A tray of dumplings'],
    controlsLabel: 'How it works',
    note: 'Scroll the detail screen below. The moment the large title scrolls away, a compact title appears in the sticky top bar. The header height never changes (no layout animation).',
    frameLabel: 'Shop detail screen',
    shopName: 'Seongsu-dong Knife-cut Noodles',
    tagline: 'Somehow no TV food show has found this place yet',
    sectionBody: 'The anchovy broth is made fresh every dawn. Noodles are cut only once your order comes in. A double portion is free if the owner is in a good mood.',
  },
})

export const StickyHeaderDemo = () => {
  const t = COPY[useDemoLang()]
  // 데모는 페이지가 아니라 이 상자 안에서 스크롤된다 — 상자를 root로 넘겨야 큰 제목이 머리 아래로 들어간 순간에 바뀐다
  const frameRef = useRef<HTMLDivElement>(null)
  const { headerRef, sentinelRef } = useStickyHeader<HTMLElement, HTMLHeadingElement>({ root: frameRef })

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <p className="controls-note">
          {t.note}
        </p>
      </section>

      {/* 스크롤 상자는 키보드로도 닿아야 한다(axe scrollable-region-focusable) — 초점을 받아 화살표 키로 스크롤한다 */}
      <div ref={frameRef} className="header-demo-frame" tabIndex={0} role="region" aria-label={t.frameLabel}>
        <header ref={headerRef} className="sticky-header header-demo-bar">
          <span className="sticky-header-title">{t.shopName}</span>
        </header>
        <div className="header-demo-hero">
          <h2 ref={sentinelRef} className="header-demo-title">
            {t.shopName}
          </h2>
          <p>{t.tagline}</p>
        </div>
        {t.sections.map((name) => (
          <section key={name} className="header-demo-section">
            <h3>{name}</h3>
            <p>{t.sectionBody}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
