import { useRef, useState } from 'react'
import { SwipeDismissViewer } from '@skills/swipe-dismiss-viewer/assets/SwipeDismissViewer'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DISHES, dishName, photoSrc, type DishId } from '../../shared/dishes'
import './swipe-dismiss-viewer-demo.css'

// 언어와 무관한 데이터(사진 아이디)는 밖에 둔다. 사진 이름(alt)은 공용 데이터에서 고른 언어로 읽는다
// 썸네일과 크게 보기가 같은 사진 파일을 쓴다 — 열 때 썸네일에서 이어 커지므로 다른 그림이면 튄다
const PHOTOS = ['deulkkae', 'bibim', 'kong', 'mandu', 'gamjajeon', 'geotjeori'] as const satisfies readonly DishId[]

type PhotoId = (typeof PHOTOS)[number]

/** 안내 줄에 지금 무엇을 보일지 — 문장 대신 상태를 담아 언어를 바꾸면 새 언어로 다시 읽힌다 */
type Log = { kind: 'start' } | { kind: 'open' | 'close'; id: PhotoId }

const COPY = defineCopy({
  ko: {
    start: '사진을 눌러 크게 보고, 아무 방향으로 끌어내려 닫아 보세요.',
    opened: (name: string) => `${name} 열림`,
    closed: (name: string) => `${name} 닫힘 — 썸네일 자리로 돌아왔어요.`,
    controlsLabel: '안내',
    note: '썸네일에서 커지며 열리고, 끌면 손가락을 따라 작아지며 뒤가 비칩니다. 120px 이상 끌거나 세게 튕기면 썸네일 자리로 돌아가며 닫히고, 그 전에 놓으면 중앙으로 스프링 복귀합니다. Esc·✕로도 같은 복귀로 닫힙니다. 마우스로도 됩니다.',
    title: '국수공방 갤러리',
    close: '닫기',
  },
  en: {
    start: 'Tap a photo to view it large, then drag it away in any direction to close.',
    opened: (name: string) => `${name} opened`,
    closed: (name: string) => `${name} closed and returned to its thumbnail.`,
    controlsLabel: 'Guide',
    note: 'The photo grows out of its thumbnail. Drag it and it shrinks under your finger, letting the page show through. Drag past 120px or flick hard and it closes back into the thumbnail. Let go earlier and it springs back to the center. Esc and ✕ close it the same way. A mouse works too.',
    title: 'Noodle Workshop gallery',
    close: 'Close',
  },
})

export const SwipeDismissViewerDemo = () => {
  const lang = useDemoLang()
  const t = COPY[lang]
  const [openId, setOpenId] = useState<PhotoId | null>(null)
  const [log, setLog] = useState<Log>({ kind: 'start' })
  const thumbs = useRef<Record<string, HTMLImageElement | null>>({})
  const nameOf = (id: PhotoId) => dishName({ id, lang })

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="dismiss-stage">
        <h2 className="dismiss-stage-title">{t.title}</h2>
        <div className="dismiss-grid">
          {PHOTOS.map((id) => (
            <button
              key={id}
              type="button"
              className="dismiss-thumb"
              onClick={() => {
                setOpenId(id)
                setLog({ kind: 'open', id })
              }}
            >
              <img
                ref={(el) => {
                  thumbs.current[id] = el
                }}
                src={photoSrc(id)}
                width={DISHES[id].width}
                height={DISHES[id].height}
                alt={nameOf(id)}
                draggable={false}
              />
            </button>
          ))}
        </div>
        <p className="dismiss-log" aria-live="polite">
          {log.kind === 'start' ? t.start : log.kind === 'open' ? t.opened(nameOf(log.id)) : t.closed(nameOf(log.id))}
        </p>
      </div>

      {openId && (
        <SwipeDismissViewer
          src={photoSrc(openId)}
          alt={nameOf(openId)}
          returnTo={{ current: thumbs.current[openId] }}
          closeLabel={t.close}
          onClose={() => {
            setOpenId(null)
            setLog({ kind: 'close', id: openId })
          }}
        />
      )}
    </div>
  )
}
