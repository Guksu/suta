import { useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchSuggest } from '@skills/search-suggest/assets/useSearchSuggest'
import { defineCopy, useDemoLang } from '../../demoLang'
import { DishPhoto } from '../../shared/DishPhoto'
import { dishName, type DishId } from '../../shared/dishes'
import './search-suggest-demo.css'

// 언어와 무관한 데이터(id·가격·사진)는 밖에 둔다. 메뉴 이름은 공용 사진 목록(dishName)에서 고른 언어로 읽는다
type Menu = { id: string; price: number; dish: DishId }

const MENUS: readonly Menu[] = [
  { id: 'myeolchi', price: 8000, dish: 'myeolchi' },
  { id: 'bibim', price: 9000, dish: 'bibim' },
  { id: 'deulkkae', price: 10000, dish: 'deulkkae' },
  { id: 'kong', price: 11000, dish: 'kong' },
  { id: 'janchi', price: 8000, dish: 'janchi' },
  { id: 'kalguksu', price: 11000, dish: 'bajirak' },
  { id: 'mandu', price: 7000, dish: 'mandu' },
  { id: 'mandu-guk', price: 9000, dish: 'manduguk' },
  { id: 'sujebi', price: 8500, dish: 'sujebi' },
  { id: 'naengmyeon', price: 10000, dish: 'naengmyeon' },
]

const COPY = defineCopy({
  ko: {
    price: (n: number) => `${n.toLocaleString('ko-KR')}원`,
    controlsLabel: '검색 옵션',
    debounce: '기다리는 시간',
    latency: '서버 응답 지연',
    note: (
      <>
        <b>국수</b>나 <b>만두</b>를 쳐 보세요. 기다리는 시간을 0으로 내리면 글자마다 요청이 나가고(아래 <b>요청</b>{' '}
        수), 200ms면 멈춘 뒤 한 번만 나갑니다. 지연을 1초 넘게 올리고 빠르게 지웠다 다시 쳐도 <b>옛 응답이 최신 목록을
        덮지 않습니다</b>. 방향키로 고르고 Enter로 선택합니다.
      </>
    ),
    searchLabel: '메뉴 검색',
    loading: '찾는 중…',
    error: '불러오지 못했어요',
    requests: (n: number) => `서버 요청 ${n}회`,
    picked: (name: string) => `선택: ${name}`,
    notPicked: '아직 고르지 않았어요',
    resetRequests: '요청 수 초기화',
  },
  en: {
    price: (n: number) => `₩${n.toLocaleString('en-US')}`,
    controlsLabel: 'Search options',
    debounce: 'Wait time',
    latency: 'Server latency',
    note: (
      <>
        Type <b>noodles</b> or <b>dumpling</b>. With the wait time at 0, every keystroke sends a request (see <b>requests</b>{' '}
        below). At 200ms, one request goes out after you pause. Raise the latency past 1 second, then quickly delete and
        retype: <b>an old response never overwrites the newer list</b>. Move with the arrow keys and press Enter to select.
      </>
    ),
    searchLabel: 'Search the menu',
    loading: 'Searching…',
    error: 'Could not load results',
    requests: (n: number) => `Server requests: ${n}`,
    picked: (name: string) => `Selected: ${name}`,
    notPicked: 'Nothing selected yet',
    resetRequests: 'Reset count',
  },
})

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 검색어와 일치하는 부분만 굵게 — 사용자 입력이 정규식에 들어가므로 이스케이프가 필수다 */
const highlight = ({ text, query }: { text: string; query: string }): ReactNode => {
  const keyword = query.trim()
  if (!keyword) return text
  return text.split(new RegExp(`(${escapeRegExp(keyword)})`, 'gi')).map((part, index) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={index}>{part}</mark> : part,
  )
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const SearchSuggestDemo = () => {
  const lang = useDemoLang()
  const t = COPY[lang]
  const nameOf = (menu: Menu) => dishName({ id: menu.dish, lang })
  const [debounceMs, setDebounceMs] = useState(200)
  const [latencyMs, setLatencyMs] = useState(300)
  const [requests, setRequests] = useState(0)
  const [picked, setPicked] = useState<Menu>()

  const search = useSearchSuggest<Menu>({
    debounceMs,
    toText: nameOf,
    onSelect: setPicked,
    fetchSuggestions: async ({ query, signal }) => {
      setRequests((prev) => prev + 1)
      await delay(latencyMs)
      // 실제 서비스라면 여기서 fetch(url, { signal })를 호출한다 — 취소가 실제로 동작하려면 signal을 넘겨야 한다
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      // 영어 이름은 대소문자가 섞이므로 소문자로 맞춰 비교한다(한글은 그대로다)
      const keyword = query.trim().toLowerCase()
      return MENUS.filter((menu) => nameOf(menu).toLowerCase().includes(keyword))
    },
  })

  const vars = {
    '--suggest-bg': 'var(--surface)',
    '--suggest-color': 'var(--text)',
    '--suggest-border': 'var(--border)',
    '--suggest-accent': 'var(--accent)',
    '--suggest-active-bg': 'var(--accent-soft)',
    '--suggest-dim': 'var(--text-dim)',
  } as CSSProperties

  return (
    <div className="playground">
      <section className="controls" aria-label={t.controlsLabel}>
        <label>
          <span>
            {t.debounce} <code>debounceMs</code>
          </span>
          <input type="range" min={0} max={600} step={50} value={debounceMs} onChange={(e) => setDebounceMs(Number(e.target.value))} />
          <output>{debounceMs}ms</output>
        </label>
        <label>
          <span>
            {t.latency} <code>latency</code>
          </span>
          <input type="range" min={0} max={1500} step={100} value={latencyMs} onChange={(e) => setLatencyMs(Number(e.target.value))} />
          <output>{latencyMs}ms</output>
        </label>
        <p className="controls-note">{t.note}</p>
      </section>

      <div className="ss-stage" style={vars}>
        <div className="suggest-root ss-field">
          <input {...search.inputProps} className="suggest-input" placeholder={t.searchLabel} aria-label={t.searchLabel} />

          {search.isOpen && (
            <ul {...search.listProps} className="suggest-panel">
              {search.status === 'loading' && <li className="suggest-message">{t.loading}</li>}
              {search.status === 'error' && <li className="suggest-message">{t.error}</li>}
              {search.items.map((menu, index) => (
                <li key={menu.id} {...search.getOptionProps(index)} className="suggest-option">
                  <DishPhoto dish={menu.dish} className="ss-thumb" />
                  <span className="ss-option-name">{highlight({ text: nameOf(menu), query: search.query })}</span>
                  <span className="ss-option-price">{t.price(menu.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ss-footer">
          <span>{t.requests(requests)}</span>
          <span>{picked ? t.picked(nameOf(picked)) : t.notPicked}</span>
          <button type="button" onClick={() => setRequests(0)}>
            {t.resetRequests}
          </button>
        </div>
      </div>
    </div>
  )
}
