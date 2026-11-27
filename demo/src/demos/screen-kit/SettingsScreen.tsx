import { useState } from 'react'
import { PageHead } from '@skills/screen-kit/assets/ScreenKit'
import { ProfileRow, SettingsGroup, SettingsRow } from '@skills/screen-kit/assets/ScreenKitSettings'
import { Switch } from '@skills/switch/assets/Switch'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { defineCopy, useDemoLang } from '../../demoLang'

/* 설정 — 상단 바 · 쪽 머리 · 프로필 줄 · 묶음(스위치 행 / 현재 값 + 꺾쇠 행) · 묶음 사이 띠 · 맨 아래 글자 링크.
 * 스위치는 switch 패턴을 행 안에 넣는다. 켜진 스위치는 강조색 토큰(거의 검정) — 받은 브랜드색이 없다 */

type AlertId = 'order' | 'pickup' | 'promo'
const ALERTS: AlertId[] = ['order', 'pickup', 'promo']

const COPY = defineCopy({
  ko: {
    back: '뒤로',
    title: '설정',
    name: '김국수',
    email: 'noodle@example.com',
    initial: '김',
    alertGroup: '알림',
    alerts: { order: '주문 알림', pickup: '픽업 준비 알림', promo: '이벤트·혜택 알림' } as Record<AlertId, string>,
    alertNote: '혜택 알림은 밤 9시부터 아침 8시까지 보내지 않아요.',
    turned: (name: string, on: boolean) => `${name}을 ${on ? '켰어요' : '껐어요'}`,
    viewGroup: '화면',
    language: '언어',
    languageValue: '한국어',
    theme: '테마',
    themeValue: '기기 설정 따름',
    textSize: '글자 크기',
    textSizeValue: '보통',
    payGroup: '결제',
    payment: '결제 수단',
    paymentValue: '카드 2개',
    receipt: '영수증 받을 곳',
    receiptValue: '문자',
    logout: '로그아웃',
    leave: '탈퇴하기',
  },
  en: {
    back: 'Back',
    title: 'Settings',
    name: 'Alex Kim',
    email: 'noodle@example.com',
    initial: 'A',
    alertGroup: 'Notifications',
    alerts: { order: 'Order updates', pickup: 'Ready for pickup', promo: 'Events and offers' } as Record<AlertId, string>,
    alertNote: 'We don’t send offers between 9 PM and 8 AM.',
    turned: (name: string, on: boolean) => `${name} turned ${on ? 'on' : 'off'}`,
    viewGroup: 'Display',
    language: 'Language',
    languageValue: 'English',
    theme: 'Theme',
    themeValue: 'Match device',
    textSize: 'Text size',
    textSizeValue: 'Default',
    payGroup: 'Payment',
    payment: 'Payment methods',
    paymentValue: '2 cards',
    receipt: 'Send receipts to',
    receiptValue: 'Text message',
    logout: 'Log out',
    leave: 'Delete account',
  },
})

export const SettingsScreen = () => {
  const t = COPY[useDemoLang()]
  // 예시 상태는 켜짐·꺼짐을 섞는다 — 모두 켜져 있으면 스위치가 상태로 읽히지 않는다(화면 관례 "설정·마이")
  const [alerts, setAlerts] = useState<Record<AlertId, boolean>>({ order: true, pickup: true, promo: false })
  const [status, setStatus] = useState('')

  const toggle = ({ id, on }: { id: AlertId; on: boolean }) => {
    setAlerts((previous) => ({ ...previous, [id]: on }))
    setStatus(t.turned(t.alerts[id], on))
  }

  return (
    <div className="kit-screen">
      <div className="kit-column">
        <div className="kit-topbar">
          <a className="kit-icon-button" href="#/screen-kit" aria-label={t.back}>
            <Icon name="chevron-left" />
          </a>
        </div>
        <PageHead title={t.title} level={2} />
        <ProfileRow name={t.name} sub={t.email} initial={t.initial} href="#/screen-kit" />

        <div className="kit-band" />
        <SettingsGroup label={t.alertGroup} note={t.alertNote}>
          {ALERTS.map((id) => (
            <li key={id} className="kit-row">
              <Switch className="kit-row-switch" label={t.alerts[id]} checked={alerts[id]} onChange={(on) => toggle({ id, on })} />
            </li>
          ))}
        </SettingsGroup>

        <div className="kit-band" />
        <SettingsGroup label={t.viewGroup}>
          <SettingsRow label={t.language} value={t.languageValue} href="#/screen-kit" />
          <SettingsRow label={t.theme} value={t.themeValue} href="#/screen-kit" />
          <SettingsRow label={t.textSize} value={t.textSizeValue} href="#/screen-kit" />
        </SettingsGroup>

        <div className="kit-band" />
        <SettingsGroup label={t.payGroup}>
          <SettingsRow label={t.payment} value={t.paymentValue} href="#/screen-kit" />
          <SettingsRow label={t.receipt} value={t.receiptValue} href="#/screen-kit" />
        </SettingsGroup>

        <div className="kit-text-links">
          <button type="button" className="kit-text-link">
            {t.logout}
          </button>
          <a className="kit-text-link kit-text-link-danger" href="#/screen-kit">
            {t.leave}
          </a>
        </div>
        <p className="kit-sr" role="status">
          {status}
        </p>
      </div>
    </div>
  )
}
