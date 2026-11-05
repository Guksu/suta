import { cleanup, render, screen, within } from '@testing-library/react'
import { App } from '../App'

// 데모 첫 화면 — 처음 온 사람이 패턴 목록보다 먼저 "같은 요청의 전후, 달라진 것, 직접 확인할 곳, 설치"를 보게 한다

const HANGUL = /[가-힣]/

const openHome = (lang: 'ko' | 'en') => {
  window.history.replaceState(null, '', `/suta/?lang=${lang}`)
  return render(<App />)
}

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

afterEach(cleanup)

describe('데모 첫 화면', () => {
  it('대표 사례가 패턴 목록보다 먼저 나오고, 설치 안내도 패턴 목록보다 앞이다', () => {
    openHome('ko')
    const main = screen.getByRole('main')
    const order = (element: HTMLElement) => Array.from(main.querySelectorAll('*')).indexOf(element)
    const caseSection = screen.getByRole('region', { name: /대표 사례/ })
    const install = screen.getByRole('region', { name: /설치/ })
    const patterns = screen.getByRole('region', { name: /패턴 57종/ })
    expect(order(caseSection)).toBeLessThan(order(patterns))
    expect(order(install)).toBeLessThan(order(patterns))
  })

  it('대표 사례는 측정한 버전과 실행 수를 밝히고, 달라진 부분 3개와 늘어난 시간·비용을 함께 보인다', () => {
    openHome('ko')
    const caseSection = screen.getByRole('region', { name: /대표 사례/ })
    expect(caseSection.textContent).toContain('0.11.0')
    expect(caseSection.querySelectorAll('ol > li')).toHaveLength(3)
    expect(caseSection.textContent).toMatch(/4\.7.*8\.9분/)
    expect(caseSection.textContent).toMatch(/0\.98.*1\.62달러/)
    expect(within(caseSection).getByRole('img').getAttribute('alt')).toMatch(/AS-IS/)
  })

  it('패턴 목록 밖의 본문에서 직접 확인할 수 있는 데모(축하 오버레이·모달·레이아웃 검사)로 이어진다', () => {
    openHome('ko')
    const patterns = screen.getByRole('region', { name: /패턴 57종/ })
    const hrefs = Array.from(screen.getByRole('main').querySelectorAll('a'))
      .filter((link) => !patterns.contains(link))
      .map((link) => link.getAttribute('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['#/celebration', '#/modal-dialog', '#/layout-audit']))
  })

  it('README 링크는 화면 언어의 README를 연다 — 한국어는 README.ko.md, 영어는 README.md', () => {
    openHome('ko')
    expect(screen.getByRole('link', { name: 'README' }).getAttribute('href')).toMatch(/README\.ko\.md$/)
    cleanup()
    openHome('en')
    expect(screen.getByRole('link', { name: 'README' }).getAttribute('href')).toMatch(/\/README\.md$/)
  })

  it('영어 첫 화면에는 한국어가 보이지 않는다(일부러 한국어를 보이는 곳은 lang="ko")', () => {
    const { container } = openHome('en')
    const main = container.querySelector('main')!.cloneNode(true) as HTMLElement
    main.querySelectorAll('[lang="ko"], pre').forEach((node) => node.remove())
    const leaked = (main.textContent ?? '').split(/\s{2,}|\n/).filter((line) => HANGUL.test(line))
    const attributes = Array.from(main.querySelectorAll('[alt], [aria-label]')).flatMap((element) =>
      ['alt', 'aria-label'].map((name) => element.getAttribute(name) ?? '').filter((value) => HANGUL.test(value)),
    )
    expect([...leaked, ...attributes]).toEqual([])
  })
})
