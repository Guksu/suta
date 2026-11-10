import { useState } from 'react'
import { BottomSheet } from '@skills/bottom-sheet/assets/BottomSheet'
import { Icon } from '@skills/layout-principles/assets/Icon'
import type { IconName } from '@skills/layout-principles/assets/icons'
import { defineCopy, useDemoLang } from '../../demoLang'
import './bottom-sheet-demo.css'

// 언어와 무관한 데이터(아이디·아이콘 이름)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const MENU = [
  { id: 'order', icon: 'bowl' },
  { id: 'save', icon: 'heart' },
  { id: 'call', icon: 'phone' },
  { id: 'share', icon: 'share' },
] as const satisfies readonly { id: string; icon: IconName }[]

type MenuId = (typeof MENU)[number]['id']

const COPY = defineCopy({
  ko: {
    menu: {
      order: { label: '주문하기', hint: '오늘의 국수 메뉴 보기' },
      save: { label: '찜하기', hint: '이 가게를 찜 목록에 추가' },
      call: { label: '전화 걸기', hint: '가게에 직접 문의' },
      share: { label: '공유하기', hint: '링크 복사' },
    },
    controlsLabel: '애니메이션 옵션',
    threshold: '닫기 임계 거리',
    snaps: '스냅 포인트',
    snapsOn: '반열림 ↔ 전체 열림',
    snapsOff: '끔',
    back: '뒤로 가기로 닫기',
    backOn: '켬 — 열린 동안 뒤로 가기가 시트를 닫아요',
    backOff: '끔',
    sheetLabel: '가게 메뉴',
    note: '시트를 잡고 끌어보세요 — 스냅 포인트를 켜면 반열림에서 시작해 위로 끌면 전체 열림, 마지막 스냅 아래로 끌거나 던지면 닫힙니다. 백드롭 클릭·Esc로도 닫힙니다.',
    open: '바텀시트 열기',
    lastChoice: '마지막 선택:',
  },
  en: {
    menu: {
      order: { label: 'Order', hint: "See today's noodle menu" },
      save: { label: 'Save', hint: 'Add this shop to your saved list' },
      call: { label: 'Call', hint: 'Ask the shop directly' },
      share: { label: 'Share', hint: 'Copy the link' },
    },
    controlsLabel: 'Animation options',
    threshold: 'Close threshold',
    snaps: 'Snap points',
    snapsOn: 'Half open ↔ fully open',
    snapsOff: 'Off',
    back: 'Close with Back',
    backOn: 'On: while open, Back closes the sheet',
    backOff: 'Off',
    sheetLabel: 'Shop actions',
    note: 'Grab the sheet and drag it. With snap points on, it starts half open: drag up to open it fully, and drag or fling below the last snap to close. Clicking the backdrop or pressing Esc also closes it.',
    open: 'Open bottom sheet',
    lastChoice: 'Last choice:',
  },
})

const SNAP_OFFSETS = [0, 240]

export const BottomSheetDemo = () => {
  const t = COPY[useDemoLang()]
  const [open, setOpen] = useState(false)
  const [thresholdPx, setThresholdPx] = useState(120)
  const [useSnaps, setUseSnaps] = useState(false)
  const [closeOnBack, setCloseOnBack] = useState(false)
  const [lastAction, setLastAction] = useState<MenuId | null>(null)

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.threshold} <code>dismissThresholdPx</code>
          </span>
          <input
            type="range"
            min={60}
            max={300}
            step={20}
            value={thresholdPx}
            onChange={(e) => setThresholdPx(Number(e.target.value))}
          />
          <output>{thresholdPx}px</output>
        </label>
        <label>
          <span>
            {t.snaps} <code>snapOffsetsPx</code>
          </span>
          <span className="controls-inline">
            <input
              type="checkbox"
              checked={useSnaps}
              onChange={(e) => setUseSnaps(e.target.checked)}
            />
            <output>{useSnaps ? t.snapsOn : t.snapsOff}</output>
          </span>
        </label>
        <label>
          <span>
            {t.back} <code>closeOnBack</code>
          </span>
          <span className="controls-inline">
            <input
              type="checkbox"
              checked={closeOnBack}
              onChange={(e) => setCloseOnBack(e.target.checked)}
            />
            <output>{closeOnBack ? t.backOn : t.backOff}</output>
          </span>
        </label>
        <p className="controls-note">
          {t.note}
        </p>
      </section>

      <div className="sheet-demo-stage">
        <button type="button" onClick={() => setOpen(true)}>
          {t.open}
        </button>
        {lastAction && (
          <p className="sheet-demo-result">
            {t.lastChoice} {t.menu[lastAction].label}
          </p>
        )}
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        dismissThresholdPx={thresholdPx}
        snapOffsetsPx={useSnaps ? SNAP_OFFSETS : undefined}
        closeOnBack={closeOnBack}
        label={t.sheetLabel}
        className="demo-sheet"
      >
        <ul className="sheet-menu">
          {MENU.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setLastAction(item.id)
                  setOpen(false)
                }}
              >
                <Icon name={item.icon} className="sheet-menu-icon" />
                <span>
                  <strong>{t.menu[item.id].label}</strong>
                  <small>{t.menu[item.id].hint}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  )
}
