import { useState, type CSSProperties } from 'react'
import { HamburgerButton, Drawer } from '@skills/hamburger-menu/assets/HamburgerMenu'
import { defineCopy, useDemoLang } from '../../demoLang'
import './hamburger-menu-demo.css'

const COPY = defineCopy({
  ko: {
    links: ['소개', '면 메뉴', '오늘의 국수', '매장 안내', '리뷰'],
    controlsLabel: '애니메이션 옵션',
    speed: '속도',
    side: '방향',
    fromLeft: 'left — 왼쪽에서',
    fromRight: 'right — 오른쪽에서',
    note: '버튼을 누르면 ≡가 X로 모핑하며 드로어가 밀려 나옵니다 — 열림/닫힘의 스위치는 aria-expanded 속성 하나입니다. Esc·백드롭 클릭으로도 닫힙니다.',
    openMenu: '메뉴 열기',
    shopName: '국수공방',
    body: '왼쪽 위 햄버거 버튼을 눌러보세요. 드로어가 열려 있는 동안에는 뒤 페이지 스크롤이 잠깁니다.',
    navLabel: '데모 메뉴',
  },
  en: {
    links: ['About', 'Noodle menu', "Today's noodles", 'Visit us', 'Reviews'],
    controlsLabel: 'Animation options',
    speed: 'Speed',
    side: 'Side',
    fromLeft: 'left: from the left',
    fromRight: 'right: from the right',
    note: 'Press the button and ≡ morphs into X as the drawer slides out. One aria-expanded attribute is the whole open/closed switch. Esc or a click on the backdrop also closes it.',
    openMenu: 'Open menu',
    shopName: 'Noodle Workshop',
    body: 'Press the hamburger button at the top left. While the drawer is open, the page behind it stops scrolling.',
    navLabel: 'Demo menu',
  },
})

export const HamburgerMenuDemo = () => {
  const t = COPY[useDemoLang()]
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<'left' | 'right'>('left')
  const [durationMs, setDurationMs] = useState(300)

  const vars = {
    '--hamburger-duration': `${durationMs}ms`,
    '--drawer-duration': `${durationMs}ms`,
  } as CSSProperties

  return (
    <div className="playground" style={vars}>
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.speed} <code>--drawer-duration</code>
          </span>
          <input
            type="range"
            min={150}
            max={700}
            step={50}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{durationMs}ms</output>
        </label>
        <label>
          <span>
            {t.side} <code>side</code>
          </span>
          <select value={side} onChange={(e) => setSide(e.target.value as 'left' | 'right')}>
            <option value="left">{t.fromLeft}</option>
            <option value="right">{t.fromRight}</option>
          </select>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="drawer-stage">
        <header className="drawer-stage-header">
          <HamburgerButton open={open} onToggle={() => setOpen(!open)} label={t.openMenu} />
          <strong>{t.shopName}</strong>
        </header>
        <p className="drawer-stage-body">{t.body}</p>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} side={side} label={t.navLabel} className="demo-drawer">
        <nav className="drawer-nav">
          <strong className="drawer-nav-title">{t.shopName}</strong>
          {t.links.map((label) => (
            <a key={label} href="#/hamburger-menu" onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
      </Drawer>
    </div>
  )
}
