import { useRef, useState, type CSSProperties } from 'react'
import { PinchZoom } from '@skills/pinch-zoom/assets/PinchZoom'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import './pinch-zoom-demo.css'

// 언어와 무관한 데이터(id·사진)는 밖에, 작성자·설명은 COPY에 둔다
const POSTS = [
  { id: 'deulkkae', dish: 'deulkkae' },
  { id: 'bibim', dish: 'bibim' },
  { id: 'mandu', dish: 'mandu' },
] as const

const COPY = defineCopy({
  ko: {
    author: '국수공방',
    captions: { deulkkae: '들깨칼국수 — 오늘 들깨 갓 볶았습니다', bibim: '비빔국수, 여름 한정 매운맛', mandu: '손만두 빚는 아침' },
    intro: '두 손가락으로 사진을 벌려 보세요.',
    zooming: (scale: number) => `확대 중 — ${scale.toFixed(2)}×`,
    settled: '제자리로 돌아왔어요.',
    controlsLabel: '제스처 옵션',
    maxScale: '최대 배율',
    dim: '배경 딤',
    note: '모바일에서 사진을 두 손가락으로 벌리면 그 자리에서 커지고, 손가락을 옮기면 따라오며, 놓으면 제자리로 돌아옵니다. 데스크톱이면 아래 버튼으로 같은 제스처를 재생해 보세요.',
    replay: '핀치 제스처 재생',
  },
  en: {
    author: 'Noodle Workshop',
    captions: {
      deulkkae: 'Perilla knife-cut noodles. Perilla seeds roasted fresh today',
      bibim: 'Spicy mixed noodles, extra hot for summer only',
      mandu: 'Folding handmade dumplings this morning',
    },
    intro: 'Spread two fingers on a photo.',
    zooming: (scale: number) => `Zooming: ${scale.toFixed(2)}×`,
    settled: 'Back in place.',
    controlsLabel: 'Gesture options',
    maxScale: 'Max zoom',
    dim: 'Background dim',
    note: 'On a phone, spread two fingers on a photo. It grows right where you pinch, follows your fingers as they move, and returns to place when you let go. On a desktop, replay the same gesture with the button below.',
    replay: 'Replay pinch gesture',
  },
})

type T = { clientX: number; clientY: number }

/** 데스크톱 확인용 — 실제 터치 대신 touches만 얹은 이벤트를 코어에 흘린다 (스킬 assets는 건드리지 않는다) */
const dispatchTouch = ({ el, type, touches }: { el: HTMLElement; type: string; touches: T[] }) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: touches.map((t, i) => ({ identifier: i, ...t })) })
  el.dispatchEvent(event)
}

export const PinchZoomDemo = () => {
  const t = COPY[useDemoLang()]
  const [maxScale, setMaxScale] = useState(4)
  const [dim, setDim] = useState(0.8)
  // 문구 대신 상태를 기억한다 — 언어를 바꿔도 안내가 새 언어로 다시 그려진다
  const [status, setStatus] = useState<{ scale: number; active: boolean } | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const playingRef = useRef(false)

  const vars = { '--pinch-dim': String(dim) } as CSSProperties

  /** 첫 사진 위에서 손가락 두 개가 벌어졌다 → 오른쪽 아래로 옮겼다 → 놓는 시나리오를 1.6초에 걸쳐 재생 */
  const replay = () => {
    const el = feedRef.current?.querySelector<HTMLElement>('.pinch')
    if (!el || playingRef.current) return
    playingRef.current = true
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const frame = (t: number): T[] => {
      // t: 0~1. 0~0.5 벌리기(거리 80→260), 0.5~1 이동(중점 +60,+40)
      const spread = 80 + Math.min(1, t / 0.5) * 180
      const shift = Math.max(0, (t - 0.5) / 0.5)
      const mx = cx + shift * 60
      const my = cy + shift * 40
      return [{ clientX: mx - spread / 2, clientY: my }, { clientX: mx + spread / 2, clientY: my }]
    }
    dispatchTouch({ el, type: 'touchstart', touches: frame(0) })
    const startedAt = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / 1600)
      dispatchTouch({ el, type: 'touchmove', touches: frame(t) })
      if (t < 1) {
        requestAnimationFrame(tick)
        return
      }
      window.setTimeout(() => {
        dispatchTouch({ el, type: 'touchend', touches: [] })
        playingRef.current = false
      }, 300)
    }
    requestAnimationFrame(tick)
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.maxScale} <code>maxScale</code>
          </span>
          <input type="range" min={2} max={6} step={0.5} value={maxScale} onChange={(e) => setMaxScale(Number(e.target.value))} />
          <output>{maxScale}×</output>
        </label>
        <label>
          <span>
            {t.dim} <code>--pinch-dim</code>
          </span>
          <input type="range" min={0} max={1} step={0.1} value={dim} onChange={(e) => setDim(Number(e.target.value))} />
          <output>{dim}</output>
        </label>
        <p className="controls-note">{t.note}</p>
        <button type="button" onClick={replay}>
          {t.replay}
        </button>
      </section>

      <div ref={feedRef} className="pinch-feed" style={vars}>
        {POSTS.map((post) => (
          <article key={post.id} className="pinch-post">
            <header className="pinch-post-header">
              {/* 가게 계정의 프로필 — 로고(국수 그릇)를 무채색 원에 */}
              <span className="pinch-post-avatar" aria-hidden="true">
                <Icon name="bowl" />
              </span>
              <strong>{t.author}</strong>
            </header>
            <PinchZoom maxScale={maxScale} onChange={({ scale, active }) => setStatus({ scale, active })}>
              <DishPhoto dish={post.dish} alt={t.captions[post.id]} className="pinch-photo" />
            </PinchZoom>
            <p className="pinch-post-caption">{t.captions[post.id]}</p>
          </article>
        ))}
      </div>
      <p className="pinch-status" aria-live="polite">
        {status === null ? t.intro : status.active ? t.zooming(status.scale) : t.settled}
      </p>
    </div>
  )
}
