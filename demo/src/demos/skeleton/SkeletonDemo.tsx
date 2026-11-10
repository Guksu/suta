import { useEffect, useState, type CSSProperties } from 'react'
import { Skeleton } from '@skills/skeleton/assets/Skeleton'
import { useSkeletonGate } from '@skills/skeleton/assets/useSkeletonGate'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { defineCopy, useDemoLang } from '../../demoLang'
import './skeleton-demo.css'

// 언어와 무관한 데이터(id)는 밖에, 화면에 보이거나 읽히는 문구는 COPY 두 벌에 둔다
const PROFILES = [{ id: 'kim' }, { id: 'park' }, { id: 'lee' }] as const

const COPY = defineCopy({
  ko: {
    controlsLabel: '애니메이션 옵션',
    speed: '시머 속도',
    latency: '응답 시간',
    replay: '로딩 다시 보기',
    reload: '다시 로딩',
    note: '뼈대는 실제 내용과 같은 자리·크기여야 바뀌는 순간 화면이 밀리지 않아요. 응답 시간을 100ms로 내리면 뼈대가 아예 뜨지 않아요. 200ms 안에 끝나는 로딩에 뼈대를 띄우면 깜빡임만 남아요.',
    profiles: {
      kim: { name: '김국수', bio: '오늘도 성수동에서 국수 한 그릇. 면은 언제나 옳다.' },
      park: { name: '박칼국', bio: '칼국수와 만두는 세트다. 반죽은 새벽에 치대야 맛있다.' },
      lee: { name: '이냉면', bio: '한겨울에도 냉면파. 육수는 슬러시 직전이 정답이다.' },
    },
  },
  en: {
    controlsLabel: 'Animation options',
    speed: 'Shimmer speed',
    latency: 'Response time',
    replay: 'Replay loading',
    reload: 'Reload',
    note: 'A skeleton needs the same position and size as the real content, so the layout does not jump when the content swaps in. Drop the response time to 100ms and no skeleton shows at all. A skeleton on a load that ends within 200ms is only a flicker.',
    profiles: {
      kim: { name: 'Noodle Kim', bio: 'Another bowl of noodles in Seongsu-dong today. Noodles are always the answer.' },
      park: { name: 'Knife-cut Park', bio: 'Knife-cut noodles and dumplings come as a set. Dough tastes best kneaded at dawn.' },
      lee: { name: 'Cold Noodle Lee', bio: 'Team cold noodles, even in midwinter. The broth should be just short of slush.' },
    },
  },
})

export const SkeletonDemo = () => {
  const t = COPY[useDemoLang()]
  const [speedMs, setSpeedMs] = useState(1400)
  const [latencyMs, setLatencyMs] = useState(2500)
  const [loaded, setLoaded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // 로딩이 200ms를 넘길 때만 뼈대를 띄우고, 띄웠으면 400ms는 유지한다
  const showSkeleton = useSkeletonGate({ loading: !loaded })

  useEffect(
    function finishLoadingAfterDelay() {
      setLoaded(false)
      const timer = setTimeout(() => setLoaded(true), latencyMs)
      return () => clearTimeout(timer)
    },
    // 응답 시간을 바꿔도 그 값으로 다시 불러온다
    [reloadKey, latencyMs],
  )

  const vars = { '--skeleton-speed': `${speedMs}ms` } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.speed} <code>--skeleton-speed</code>
          </span>
          <input
            type="range"
            min={600}
            max={3000}
            step={200}
            value={speedMs}
            onChange={(e) => setSpeedMs(Number(e.target.value))}
          />
          <output>{(speedMs / 1000).toFixed(1)}s</output>
        </label>
        <label>
          <span>
            {t.latency} <code>latency</code>
          </span>
          <input
            type="range"
            min={0}
            max={3000}
            step={100}
            value={latencyMs}
            onChange={(e) => setLatencyMs(Number(e.target.value))}
          />
          <output>{latencyMs}ms</output>
        </label>
        <label>
          <span>{t.replay}</span>
          <button type="button" onClick={() => setReloadKey((prev) => prev + 1)}>
            {t.reload}
          </button>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="skeleton-grid" style={vars}>
        {PROFILES.map((profile) => {
          if (showSkeleton) {
            return (
              <article key={profile.id} className="profile-card" aria-busy="true">
                <Skeleton variant="circle" width={48} height={48} />
                {/* 글줄 뼈대를 실제 글과 같은 글자 크기·행간의 자리에 둔다 — 한 줄이 실제 한 줄 높이를 차지한다 */}
                <div className="profile-body">
                  <div className="profile-name">
                    <Skeleton variant="text" width="40%" />
                  </div>
                  <div className="profile-bio">
                    <Skeleton variant="text" lines={2} />
                  </div>
                </div>
              </article>
            )
          }
          // 뼈대가 뜨기 전 첫 200ms — 카드 자리만 잡아 두고 비워 둔다
          if (!loaded) return <article key={profile.id} className="profile-card" aria-busy="true" />
          return (
            <article key={profile.id} className="profile-card">
              {/* 사람 프로필 사진 자리 — 사진이 없을 때는 무채색 원에 사람 아이콘. 사람마다 색·이모지로 구분하지 않는다(이름이 구분한다) */}
              <div className="profile-avatar">
                <Icon name="user" />
              </div>
              <div className="profile-body">
                <strong className="profile-name">{t.profiles[profile.id].name}</strong>
                <p className="profile-bio">{t.profiles[profile.id].bio}</p>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
