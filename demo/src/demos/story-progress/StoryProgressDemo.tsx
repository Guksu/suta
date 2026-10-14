import { useState } from 'react'
import { useStoryProgress } from '@skills/story-progress/assets/useStoryProgress'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import type { DishId } from '../../shared/dishes'
import './story-progress-demo.css'

// 장면 사진은 언어와 무관하다 — 진행 막대와 사진의 key로도 쓴다(언어를 바꿔도 막대·사진이 다시 만들어지지 않게)
const SCENE_DISHES: DishId[] = ['broth', 'dough', 'janchi', 'bajirak']

const COPY = defineCopy({
  ko: {
    scenes: [
      { title: '새벽 4시', copy: '육수를 올리는 시간. 멸치와 다시마가 먼저 출근해요.' },
      { title: '오전 9시', copy: '반죽을 밀어 썰어요. 오늘 면발의 굵기가 여기서 정해져요.' },
      { title: '정오', copy: '첫 그릇이 나가요. 오늘도 곱빼기 비율이 높아요.' },
      { title: '밤 9시', copy: '마지막 손님의 바지락칼국수. 솥을 씻으며 내일 육수를 계획해요.' },
    ],
    controlsLabel: '옵션',
    duration: '구간 시간',
    fromStart: '처음부터',
    replay: '다시 재생',
    note: '화면을 길게 누르면 멈추고, 좌/우 절반을 탭하면 이전/다음 장면으로 이동합니다.',
    paused: '일시정지',
    prev: '이전 장면',
    next: '다음 장면',
  },
  en: {
    scenes: [
      { title: '4 a.m.', copy: 'Time to start the broth. The anchovies and kelp clock in first.' },
      { title: '9 a.m.', copy: 'Rolling out and cutting the dough. This is where the noodles get their thickness for the day.' },
      { title: 'Noon', copy: 'The first bowl goes out. Plenty of double portions ordered again today.' },
      { title: '9 p.m.', copy: 'Clam knife-cut noodles for the last guest. Scrubbing the pots and planning tomorrow\'s broth.' },
    ],
    controlsLabel: 'Options',
    duration: 'Segment duration',
    fromStart: 'From the start',
    replay: 'Replay',
    note: 'Press and hold the screen to pause. Tap the left or right half to go to the previous or next scene.',
    paused: 'Paused',
    prev: 'Previous scene',
    next: 'Next scene',
  },
})

export const StoryProgressDemo = () => {
  const t = COPY[useDemoLang()]
  const [durationMs, setDurationMs] = useState(3000)
  const [holding, setHolding] = useState(false)
  const story = useStoryProgress({ count: SCENE_DISHES.length, durationMs })
  const scene = t.scenes[story.index]

  const hold = () => {
    setHolding(true)
    story.pause()
  }
  const release = () => {
    setHolding(false)
    story.resume()
  }

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.duration} <code>durationMs</code>
          </span>
          <input
            type="range"
            min={1500}
            max={8000}
            step={500}
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
          />
          <output>{(durationMs / 1000).toFixed(1)}s</output>
        </label>
        <label>
          <span>{t.fromStart}</span>
          <button type="button" onClick={story.restart}>
            {t.replay}
          </button>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div
        className="story-viewer"
        onPointerDown={hold}
        onPointerUp={release}
        onPointerLeave={release}
      >
        <div className="story-bars">
          {SCENE_DISHES.map((dish, index) => (
            <span key={dish} className="story-bar">
              <span ref={story.registerBar(index)} className="story-bar-fill" />
            </span>
          ))}
        </div>
        <div className="story-scene">
          {/* 가로 사진은 세로 화면 가운데에 폭 가득 두고(스토리의 관례), 글은 사진 밖 아래에 둔다 */}
          <DishPhoto key={SCENE_DISHES[story.index]} dish={SCENE_DISHES[story.index]} alt={scene.copy} className="story-photo" />
          <div className="story-text">
            <strong>{scene.title}</strong>
            <p>{scene.copy}</p>
          </div>
          {holding && <em className="story-paused">{t.paused}</em>}
        </div>
        <button type="button" className="story-nav story-nav-prev" aria-label={t.prev} onClick={story.prev} />
        <button type="button" className="story-nav story-nav-next" aria-label={t.next} onClick={story.next} />
      </div>
    </div>
  )
}
