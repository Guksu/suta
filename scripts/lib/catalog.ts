/**
 * 패턴 카탈로그 — 진입 스킬의 패턴 색인과 패턴 카탈로그 표를 만든다.
 *
 *  - 짧은 색인: skills/suta/SKILL.md의 index 블록. 카테고리마다 한 행, 패턴 이름(slug)과 데모 제목만 둔다.
 *    진입 스킬은 UI 요청마다 읽히므로, 모든 패턴이 거기 보이되 설명은 빼서 짧게 둔다.
 *  - 카탈로그 표: skills/suta/references/catalog.md의 catalog 블록. 패턴마다 description 첫 문장 한 줄.
 *    컴포넌트·상호작용을 만들 때 이 표에서 후보를 고르고, 고른 패턴의 PATTERN.md를 끝까지 읽는다.
 *
 * 정본은 각 PATTERN.md의 description(무엇·언제)과 데모 레지스트리의 카테고리·제목이다. 둘 다 손으로 고치지 않고 이 함수로만 만든다
 * — 손으로 쓰면 패턴을 추가할 때 뒤처지고, 에이전트는 색인·표에 없는 패턴을 고르지 못한다.
 */
export const CATALOG_START = '<!-- catalog:start -->'
export const CATALOG_END = '<!-- catalog:end -->'
export const INDEX_START = '<!-- index:start -->'
export const INDEX_END = '<!-- index:end -->'

export type PatternMeta = { name: string; description: string }
export type RegistryEntry = { slug: string; title: string; category: string }

// 표 한 줄 요약 — description의 첫 문장. 첫 문장이 100자를 넘으면 줄표(—) 앞의 "무엇" 부분만 남긴다
export const summarize = (description: string): string => {
  const sentence = description.match(/^(.+?다\.)(?=\s|$)/)?.[1] ?? description
  if (sentence.length <= 100 || !sentence.includes(' — ')) return sentence
  const head = sentence.split(' — ')[0]
  return head.endsWith('다') ? `${head}.` : head
}

// 데모 레지스트리(TS)를 실행하지 않고 텍스트로 읽는다 — CATEGORIES 순서와 항목별 slug·title·category
export const parseRegistry = (source: string): { categories: string[]; entries: RegistryEntry[] } => {
  const list = source.match(/export const CATEGORIES[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? ''
  const categories = [...list.matchAll(/'([^']+)'/g)].map((match) => match[1])
  const entries = [...source.matchAll(/slug: '([^']+)'[\s\S]*?title: '([^']+)'[\s\S]*?category: '([^']+)'/g)].map((match) => ({
    slug: match[1],
    title: match[2],
    category: match[3],
  }))
  return { categories, entries }
}

const escapeCell = (text: string) => text.replace(/\|/g, '\\|')

// 레지스트리에 없는 패턴은 색인·표 어디에도 실리지 않는다 — 조용히 빠지지 않게 오류로 알린다
const assertListed = ({ patterns, entries }: { patterns: PatternMeta[]; entries: RegistryEntry[] }) => {
  const unlisted = patterns.filter((pattern) => !entries.some((entry) => entry.slug === pattern.name)).map((pattern) => pattern.name)
  if (unlisted.length > 0) throw new Error(`데모 레지스트리에 없는 패턴: ${unlisted.join(', ')}`)
}

// 카테고리 순서대로, 카테고리 안에서는 레지스트리 순서(데모 사이드바와 같은 순서)로 패턴을 묶는다
const groupByCategory = ({ patterns, categories, entries }: { patterns: PatternMeta[]; categories: string[]; entries: RegistryEntry[] }) => {
  assertListed({ patterns, entries })
  const byName = new Map(patterns.map((pattern) => [pattern.name, pattern]))
  return categories.flatMap((category) => {
    const items = entries
      .filter((entry) => entry.category === category)
      .flatMap((entry) => {
        const pattern = byName.get(entry.slug)
        return pattern ? [{ entry, pattern }] : []
      })
    return items.length === 0 ? [] : [{ category, items }]
  })
}

/** 카탈로그 표 — linkPrefix는 표가 든 문서에서 patterns/까지의 상대 경로(references/catalog.md면 '../patterns/') */
export const renderCatalog = ({
  patterns,
  categories,
  entries,
  linkPrefix = 'patterns/',
}: {
  patterns: PatternMeta[]
  categories: string[]
  entries: RegistryEntry[]
  linkPrefix?: string
}): string =>
  groupByCategory({ patterns, categories, entries })
    .flatMap(({ category, items }) => [
      `### ${category}`,
      '',
      '| 패턴 | 무엇을 하나 |',
      '|---|---|',
      ...items.map(({ entry, pattern }) => `| [\`${entry.slug}\`](${linkPrefix}${entry.slug}/PATTERN.md) | ${escapeCell(summarize(pattern.description))} |`),
      '',
    ])
    .join('\n')
    .trimEnd()

/** 진입 스킬의 짧은 색인 — 카테고리마다 한 행, 패턴은 `slug` + 데모 제목 */
export const renderIndex = ({ patterns, categories, entries }: { patterns: PatternMeta[]; categories: string[]; entries: RegistryEntry[] }): string =>
  [
    '| 묶음 | 패턴 |',
    '|---|---|',
    ...groupByCategory({ patterns, categories, entries }).map(
      ({ category, items }) => `| ${category} | ${items.map(({ entry }) => `\`${entry.slug}\` ${escapeCell(entry.title)}`).join(', ')} |`,
    ),
  ].join('\n')

// 표시 두 줄 사이만 바꾼다 — 같은 내용으로 다시 돌려도 결과가 같아야 검사(validate)가 "동기됨"을 판정할 수 있다
export const replaceBlock = ({
  document,
  block,
  start: startMark = CATALOG_START,
  end: endMark = CATALOG_END,
}: {
  document: string
  block: string
  start?: string
  end?: string
}): string => {
  const start = document.indexOf(startMark)
  const end = document.indexOf(endMark)
  if (start === -1 || end === -1 || end < start) throw new Error(`표시(${startMark} … ${endMark})를 찾지 못했다`)
  return `${document.slice(0, start + startMark.length)}\n${block}\n${document.slice(end)}`
}
