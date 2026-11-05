import { useEffect, useState } from 'react'
import { Icon } from '@skills/layout-principles/assets/Icon'
import { DemoLangContext } from './demoLang'
import { CATEGORIES, demos, type DemoEntry } from './demos'
import { HomeCase } from './HomeCase'
import { CATEGORY_LABEL, STRINGS, useLang, type Lang } from './i18n'
import { DISHES, type DishId, dishName } from './shared/dishes'
import { DishPhoto } from './shared/DishPhoto'

const REPO_URL = 'https://github.com/Guksu/suta'
const INSTALL_COMMANDS = '/plugin marketplace add Guksu/suta\n/plugin install suta@suta'
// 결과 메시지를 검사 코어가 만들어 한국어로만 나오는 데모 — 영어 화면에서 이 둘에만 안내를 붙인다
const KOREAN_OUTPUT_DEMOS = new Set(['layout-audit', 'motion-audit'])

const slugFromHash = () => window.location.hash.replace(/^#\/?/, '')

/** 언어에 맞는 제목·설명 — 데모 안의 콘텐츠는 각 데모가 가지므로 여기서는 목록 정보만 바꾼다 */
const titleOf = ({ demo, lang }: { demo: DemoEntry; lang: Lang }) => (lang === 'en' ? demo.titleEn : demo.title)
const descriptionOf = ({ demo, lang }: { demo: DemoEntry; lang: Lang }) => (lang === 'en' ? demo.descriptionEn : demo.description)

export const App = () => {
  const [slug, setSlug] = useState(slugFromHash)
  // 좁은 화면에서만 쓰는 메뉴 펼침 상태 — 넓은 화면은 CSS가 목록을 늘 보여 준다
  const [menuOpen, setMenuOpen] = useState(false)
  const { lang, toggle } = useLang()
  const t = STRINGS[lang]

  useEffect(function syncSlugWithHash() {
    const onHashChange = () => {
      setSlug(slugFromHash())
      // 패턴을 고르면 목록을 접어 데모 본문이 바로 보이게 한다
      setMenuOpen(false)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(
    function revealCurrentNavItem() {
      // 주소로 바로 들어오면(#/bottom-nav) 현재 항목이 사이드바 아래쪽 밖에 있다. 넓은 화면에서만 — 좁은 화면은 목록이 접혀 있다
      if (!window.matchMedia('(min-width: 721px)').matches) return
      document.querySelector('#pattern-nav [aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
    },
    [slug],
  )

  const active = demos.find((demo) => demo.slug === slug)

  return (
    <div className="layout">
      <aside className="sidebar" data-menu-open={menuOpen ? 'true' : 'false'}>
        <div className="brand-row">
          <a className="brand" href="#/">
            suta
          </a>
          <button type="button" className="lang-toggle" onClick={toggle} aria-label={t.langToggleLabel} lang={lang === 'ko' ? 'en' : 'ko'}>
            {t.langToggle}
          </button>
        </div>
        <p className="tagline">{t.tagline}</p>
        <button type="button" className="nav-toggle" aria-expanded={menuOpen} aria-controls="pattern-nav" onClick={() => setMenuOpen((open) => !open)}>
          <span>{t.menu(demos.length)}</span>
          <Icon name="chevron-down" size={20} className="nav-toggle-icon" />
        </button>
        <nav id="pattern-nav" aria-label={t.navLabel}>
          {CATEGORIES.map((category, index) => (
            <div key={category} className="nav-group">
              <p className="nav-group-title" id={`nav-group-${index}`}>
                {CATEGORY_LABEL[lang][category]}
              </p>
              <ul className="nav-list" aria-labelledby={`nav-group-${index}`}>
                {demos
                  .filter((demo) => demo.category === category)
                  .map((demo) => (
                    <li key={demo.slug}>
                      <a href={`#/${demo.slug}`} aria-current={demo.slug === slug ? 'page' : undefined}>
                        {titleOf({ demo, lang })}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
        <footer>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            {t.github}
          </a>
          <a href="#/credits">{t.creditsLink}</a>
        </footer>
      </aside>
      <main className="content">
        {active ? <DemoPage demo={active} lang={lang} /> : slug === 'credits' ? <Credits lang={lang} /> : <Home lang={lang} />}
      </main>
    </div>
  )
}

/** 복사 단추 — 누르면 잠깐 "복사됨"으로 바뀐다. 사용 예시와 홈의 설치 명령이 함께 쓴다 */
const CopyButton = ({ text, lang }: { text: string; lang: Lang }) => {
  const [copied, setCopied] = useState(false)
  const t = STRINGS[lang]

  useEffect(
    function resetCopiedBadge() {
      if (!copied) return
      const timer = setTimeout(() => setCopied(false), 1500)
      return () => clearTimeout(timer)
    },
    [copied],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // 클립보드 권한이 없으면 선택 복사로 대신한다 — 코드는 화면에 이미 있다
    }
  }

  return (
    <button type="button" onClick={copy}>
      {copied ? t.copied : t.copy}
    </button>
  )
}

const DemoPage = ({ demo, lang }: { demo: DemoEntry; lang: Lang }) => {
  const t = STRINGS[lang]
  return (
    <>
      <header className="demo-header">
        <h1>{titleOf({ demo, lang })}</h1>
        <p>{descriptionOf({ demo, lang })}</p>
        <code>skills/suta/patterns/{demo.slug}/</code>
        {lang === 'en' && KOREAN_OUTPUT_DEMOS.has(demo.slug) && <p className="demo-lang-note">{t.auditNote}</p>}
      </header>
      {/* 데모 안 문구는 각 데모가 두 벌(defineCopy) 가진다 — 고른 언어를 내려 주고 lang도 맞춘다 */}
      <DemoLangContext.Provider value={lang}>
        <div lang={lang}>
          <demo.Component />
        </div>
      </DemoLangContext.Provider>
      <UsageBlock demo={demo} lang={lang} />
    </>
  )
}

const UsageBlock = ({ demo, lang }: { demo: DemoEntry; lang: Lang }) => {
  const t = STRINGS[lang]
  return (
    <section className="usage" aria-label={t.usage}>
      <div className="usage-head">
        <h2>{t.usage}</h2>
        <div className="usage-actions">
          <CopyButton text={demo.usage} lang={lang} />
          <a href={`${REPO_URL}/blob/main/skills/suta/patterns/${demo.slug}/PATTERN.md`} target="_blank" rel="noreferrer">
            {t.skillDoc}
          </a>
        </div>
      </div>
      {/* 긴 줄은 가로로 스크롤된다 — 키보드로도 스크롤할 수 있게 초점을 받는다 */}
      <pre className="usage-code" tabIndex={0} aria-label={t.usage}>
        <code>{demo.usage}</code>
      </pre>
    </section>
  )
}

const Home = ({ lang }: { lang: Lang }) => {
  const [query, setQuery] = useState('')
  const t = STRINGS[lang]
  const keyword = query.trim().toLowerCase()
  // 검색은 두 언어를 모두 뒤진다 — 영어 화면에서 한국어 이름을 기억하는 사람도, 그 반대도 찾을 수 있게
  const matches = (demo: DemoEntry) =>
    keyword === '' ||
    [demo.title, demo.description, demo.titleEn, demo.descriptionEn, demo.slug].some((text) => text.toLowerCase().includes(keyword))

  const visible = demos.filter(matches)

  return (
    <div className="home">
      <h1>suta</h1>
      <p className="home-intro">{t.homeIntro(demos.length)}</p>
      <ul className="home-values">
        {t.values.map((value) => (
          <li key={value.title}>
            <strong>{value.title}</strong>
            <span>{value.body}</span>
          </li>
        ))}
      </ul>
      <p className="home-links">
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          {t.github}
        </a>
        {/* 화면 언어의 README — 영어가 README.md(정본), 한국어가 README.ko.md다 */}
        <a href={`${REPO_URL}/blob/main/${t.readmeFile}`} target="_blank" rel="noreferrer">
          {t.readme}
        </a>
      </p>
      <HomeCase lang={lang} />
      <section className="home-install" aria-labelledby="home-install-title">
        <div className="usage-head">
          <h2 id="home-install-title">{t.installTitle}</h2>
          <CopyButton text={INSTALL_COMMANDS} lang={lang} />
        </div>
        <p className="home-install-step">{t.installStep}</p>
        <pre className="usage-code">
          <code>{INSTALL_COMMANDS}</code>
        </pre>
        <div className="home-install-request">
          <div className="usage-head">
            <h3>{t.firstRequestLabel}</h3>
            <CopyButton text={t.firstRequest} lang={lang} />
          </div>
          <blockquote>{t.firstRequest}</blockquote>
        </div>
        <p className="home-install-note">{t.installNote}</p>
      </section>
      <section className="home-patterns" aria-labelledby="home-patterns-title">
        <h2 id="home-patterns-title" className="home-patterns-title">{t.patternsTitle(demos.length)}</h2>
        <div className="home-search">
          <input
            type="search"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.searchLabel}
          />
          {keyword && <span className="home-search-count">{t.matches(visible.length)}</span>}
        </div>
        {CATEGORIES.map((category) => {
          const group = visible.filter((demo) => demo.category === category)
          if (group.length === 0) return null
          return (
            <div key={category} className="home-group">
              <h3>{CATEGORY_LABEL[lang][category]}</h3>
              <ul className="demo-list">
                {group.map((demo) => (
                  <li key={demo.slug}>
                    <a href={`#/${demo.slug}`}>
                      <strong>{titleOf({ demo, lang })}</strong>
                      <span>{descriptionOf({ demo, lang })}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {visible.length === 0 && <p className="home-empty">{t.noMatch(query)}</p>}
      </section>
    </div>
  )
}

/** 사진·아이콘 출처 — CC BY는 저작자·라이선스·원본·변경 사실을 사이트에서 보이게 적어야 한다 */
const Credits = ({ lang }: { lang: Lang }) => {
  const t = STRINGS[lang]
  const ids = Object.keys(DISHES) as DishId[]
  return (
    <section className="credits">
      <h1>{t.creditsTitle}</h1>
      <p className="home-intro">{t.creditsIntro}</p>
      <h2>{t.creditsPhotos}</h2>
      <ul className="credits-list">
        {ids.map((id) => {
          const { credit } = DISHES[id]
          return (
            <li key={id}>
              <DishPhoto dish={id} className="credits-thumb" />
              <span className="credits-body">
                <strong>{dishName({ id, lang })}</strong>
                <span>
                  {credit.author} ·{' '}
                  <a href={credit.licenseUrl} target="_blank" rel="noreferrer">
                    {credit.license}
                  </a>{' '}
                  ·{' '}
                  <a href={credit.source} target="_blank" rel="noreferrer">
                    {t.creditsSource}: {credit.file}
                  </a>
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <h2>{t.creditsIcons}</h2>
      <p className="credits-note">{t.creditsIconsBody}</p>
    </section>
  )
}
