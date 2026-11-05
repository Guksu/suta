#!/usr/bin/env node
/**
 * 패턴 색인·카탈로그 생성 — 두 문서의 표시 블록을 다시 쓴다.
 *  - skills/suta/SKILL.md의 index 블록(<!-- index:start --> … end): 카테고리마다 패턴 이름과 데모 제목만
 *  - skills/suta/references/catalog.md의 catalog 블록(<!-- catalog:start --> … end): 패턴마다 한 줄 설명
 *
 * 정본: 각 skills/suta/patterns/{패턴}/PATTERN.md의 description + 데모 레지스트리(demo/src/demos/index.ts)의 카테고리·제목·순서.
 * 표를 손으로 고치면 패턴을 추가할 때 뒤처진다 — 에이전트는 색인·표에 없는 패턴을 고르지 못하므로 생성으로만 만든다.
 *
 * 실행: npm run catalog            블록을 다시 쓴다
 *       node scripts/buildCatalog.mjs --check   쓰지 않고 어긋났는지만 본다(어긋나면 exit 1)
 * validateSkills.mjs가 expectedDocuments()로 같은 계산을 해 동기 여부를 검사한다.
 */
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { INDEX_END, INDEX_START, parseRegistry, renderCatalog, renderIndex, replaceBlock } from './lib/catalog.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
export const skillDocPath = join(root, 'skills/suta/SKILL.md')
export const catalogDocPath = join(root, 'skills/suta/references/catalog.md')
export const patternsDir = join(root, 'skills/suta/patterns')

// 패턴 폴더마다 PATTERN.md의 name(폴더명)·description
export const readPatterns = () =>
  readdirSync(patternsDir)
    .sort()
    .flatMap((name) => {
      const docPath = join(patternsDir, name, 'PATTERN.md')
      if (!statSync(join(patternsDir, name)).isDirectory() || !existsSync(docPath)) return []
      const description = readFileSync(docPath, 'utf8').match(/^description:\s*(.+)$/m)?.[1] ?? ''
      return [{ name, description }]
    })

/** 생성 결과 — 경로마다 기대하는 전체 문서 */
export const expectedDocuments = () => {
  const { categories, entries } = parseRegistry(readFileSync(join(root, 'demo/src/demos/index.ts'), 'utf8'))
  const patterns = readPatterns()
  const index = renderIndex({ patterns, categories, entries })
  const catalog = renderCatalog({ patterns, categories, entries, linkPrefix: '../patterns/' })
  return [
    { path: skillDocPath, label: 'skills/suta/SKILL.md', document: replaceBlock({ document: readFileSync(skillDocPath, 'utf8'), block: index, start: INDEX_START, end: INDEX_END }) },
    { path: catalogDocPath, label: 'skills/suta/references/catalog.md', document: replaceBlock({ document: readFileSync(catalogDocPath, 'utf8'), block: catalog }) },
  ]
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stale = expectedDocuments().filter(({ path, document }) => readFileSync(path, 'utf8') !== document)
  if (process.argv.includes('--check')) {
    if (stale.length > 0) {
      console.error(`패턴 색인·카탈로그가 PATTERN.md·데모 레지스트리와 어긋남(${stale.map((doc) => doc.label).join(', ')}) — npm run catalog로 다시 만든다`)
      process.exit(1)
    }
    console.log('패턴 색인·카탈로그 동기됨')
  } else if (stale.length === 0) console.log('패턴 색인·카탈로그 변경 없음')
  else {
    for (const { path, document, label } of stale) {
      writeFileSync(path, document)
      console.log(`갱신: ${label}`)
    }
    console.log(`패턴 ${readPatterns().length}개`)
  }
}
