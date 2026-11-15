import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// vitest는 demo/에서 돈다 — 정본 CSS를 파일로 읽는다
const patternsDir = resolve(process.cwd(), '../skills/suta/patterns')

const cssFiles = readdirSync(patternsDir).flatMap((pattern) => {
  const assets = resolve(patternsDir, pattern, 'assets')
  let names: string[] = []
  try {
    names = readdirSync(assets)
  } catch {
    return []
  }
  return names.filter((name) => name.endsWith('.css')).map((name) => ({ pattern, name, css: readFileSync(resolve(assets, name), 'utf8') }))
})

// 면의 배경 변수(--{패턴}-bg)가 흰색 고정값으로 끝나는 선언 — 프로젝트가 --color-surface·--color-text를 어둡게 바꾸면
// 글자만 밝아지고 면은 흰색으로 남아 글자가 보이지 않는다
const BARE_WHITE_SURFACE = /(?:background(?:-color)?|--_bg):\s*var\(--[\w-]*bg,\s*(?:#fff(?:fff)?|rgba?\(255[ ,]+255[ ,]+255[^)]*\))\s*\)/gi

describe('패턴의 면 — 글자색과 같은 토큰 묶음을 따른다', () => {
  it('패턴 CSS를 읽었다', () => {
    expect(cssFiles.length).toBeGreaterThan(40)
  })

  it('면의 배경이 흰색 고정값으로 끝나지 않는다 — --color-surface를 거친다', () => {
    const found = cssFiles.flatMap(({ pattern, name, css }) => [...css.matchAll(BARE_WHITE_SURFACE)].map((match) => `${pattern}/${name}: ${match[0]}`))
    expect(found).toEqual([])
  })

  it('메뉴의 가리킨 항목 표시가 푸른 회색·검정 고정값이 아니다 — 어두운 면에서도 보인다', () => {
    const menus = cssFiles.filter(({ pattern }) => pattern === 'dropdown-menu' || pattern === 'long-press-menu')
    expect(menus).toHaveLength(2)
    for (const { css } of menus) {
      expect(css).not.toMatch(/active-bg,\s*#f3f4f6\)/)
      expect(css).not.toMatch(/active-bg,\s*rgb\(0 0 0 \/ 0\.06\)\)/)
    }
  })
})
