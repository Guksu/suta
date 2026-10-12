import { useState } from 'react'
import { Celebration } from '@skills/celebration/assets/Celebration'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { useToastStack } from '@skills/toast-stack/assets/useToastStack'
import { defineCopy, useDemoLang } from '../../demoLang'
import './celebration-demo.css'

const GOAL = 10

const COPY = defineCopy({
  ko: {
    stampTitle: '도장 카드 (큰 성취 — 버튼으로 닫기)',
    stampNote: '도장 10개를 모으면 잔치국수 한 그릇. 10번째 도장에서 축하가 한 번 뜹니다.',
    stamped: (n: number) => `도장 ${n}개 / ${GOAL}개`,
    stamp: '도장 찍기',
    fill: '9개까지 채우기',
    bigTitle: '도장 10개를 모았어요',
    bigReward: '잔치국수 1그릇',
    bigDescription: '다음 주문 때 쿠폰으로 쓸 수 있어요',
    bigAction: '쿠폰 받기',
    smallTitle: '리뷰 적립 (자주 생기는 작은 보상 — 축하 대신 토스트)',
    smallNote: '자주 생기는 작은 적립에는 축하를 띄우지 않습니다. 위쪽 토스트 한 줄로 알리고, 늘어난 포인트는 숫자에 남깁니다.',
    points: (n: number) => `${n.toLocaleString('ko-KR')}P`,
    pointsLabel: '보유 포인트',
    attend: '리뷰 남기기',
    smallToast: '리뷰 적립 · +10P',
    reducedNote: '동작 줄이기를 켜면 조각 없이 짧은 페이드만 남습니다.',
  },
  en: {
    stampTitle: 'Stamp card (big moment, closed with the button)',
    stampNote: 'Ten stamps earn a bowl of anchovy-broth noodles. The celebration appears once, on the tenth stamp.',
    stamped: (n: number) => `${n} of ${GOAL} stamps`,
    stamp: 'Add a stamp',
    fill: 'Fill up to nine',
    bigTitle: 'You collected 10 stamps',
    bigReward: '1 bowl of noodles',
    bigDescription: 'Use it as a coupon on your next order',
    bigAction: 'Get the coupon',
    smallTitle: 'Review points (a frequent small reward, a toast instead)',
    smallNote: 'Frequent small rewards get no celebration. A one-line toast at the top says so, and the new points stay in the counter.',
    points: (n: number) => `${n.toLocaleString('en-US')} pts`,
    pointsLabel: 'Points',
    attend: 'Leave a review',
    smallToast: 'Review points · +10 pts',
    reducedNote: 'With reduced motion on, the pieces are skipped and only a short fade remains.',
  },
})

export const CelebrationDemo = () => {
  const t = COPY[useDemoLang()]
  const [stamps, setStamps] = useState(7)
  const [bigOpen, setBigOpen] = useState(false)
  const [points, setPoints] = useState(1_240)
  const { toast } = useToastStack({ position: 'top' })

  const addStamp = () => {
    const next = Math.min(GOAL, stamps + 1)
    setStamps(next)
    // 축하는 이룬 순간 한 번 — 10번째 도장을 찍은 직후
    if (next === GOAL) setBigOpen(true)
  }

  // 쿠폰은 축하가 뜬 순간 발급된 것 — 버튼으로 닫든 Esc로 닫든 카드를 비운다(여는 버튼이 다시 눌릴 수 있어야 포커스가 돌아온다)
  const finish = () => {
    setBigOpen(false)
    setStamps(0)
  }

  const attend = () => {
    setPoints((prev) => prev + 10)
    toast(t.smallToast)
  }

  return (
    <div className="playground celebration-demo">
      <section className="celebration-demo-card" aria-labelledby="stamp-title">
        <h2 id="stamp-title">{t.stampTitle}</h2>
        <p>{t.stampNote}</p>
        <ol className="celebration-demo-stamps" aria-label={t.stamped(stamps)}>
          {Array.from({ length: GOAL }, (_, index) => (
            <li key={index} className={index < stamps ? 'is-stamped' : undefined}>
              <Icon name="bowl" size={20} />
            </li>
          ))}
        </ol>
        <p className="celebration-demo-count" aria-hidden="true">
          {t.stamped(stamps)}
        </p>
        <div className="celebration-demo-actions">
          {/* 여는 버튼을 비활성으로 바꾸지 않는다 — 비활성이 되는 순간 포커스를 잃어, 축하를 닫은 뒤 돌아올 곳이 없어진다 */}
          <button type="button" onClick={addStamp}>
            {t.stamp}
          </button>
          <button type="button" onClick={() => setStamps(GOAL - 1)}>
            {t.fill}
          </button>
        </div>
      </section>

      <section className="celebration-demo-card" aria-labelledby="attend-title">
        <h2 id="attend-title">{t.smallTitle}</h2>
        <p>{t.smallNote}</p>
        <p className="celebration-demo-points">
          <span>{t.pointsLabel}</span>
          <strong>{t.points(points)}</strong>
        </p>
        <div className="celebration-demo-actions">
          <button type="button" onClick={attend}>
            {t.attend}
          </button>
        </div>
      </section>

      <p className="controls-note">{t.reducedNote}</p>

      <Celebration
        open={bigOpen}
        onClose={finish}
        title={t.bigTitle}
        reward={t.bigReward}
        description={t.bigDescription}
        figure={<Icon name="trophy" strokeWidth={1.5} />}
        actionLabel={t.bigAction}
      />
    </div>
  )
}
