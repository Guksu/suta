#!/usr/bin/env node
/**
 * 스킬 구조 검증 게이트 — 설치되는 진입 스킬(skills/suta)과 그 안의 패턴 전체를 검사한다.
 * 실패 시 exit 1 (검증자 게이트의 종료 코드 판정용).
 *
 * 진입 스킬 (skills/suta/SKILL.md — 에이전트가 description만 보고 고르는 유일한 스킬)
 *  - skills/ 아래 SKILL.md는 이것 하나뿐 — 패턴 문서가 SKILL.md면 도구가 패턴마다 스킬로 등록해 목록 예산을 다시 넘긴다
 *  - name 형식(소문자·숫자·하이픈, 64자 이하) = 폴더명 = 매니페스트 네 개의 이름, 버전 일치
 *    (Claude Code: .claude-plugin/plugin.json·marketplace.json, Codex: .codex-plugin/plugin.json·.agents/plugins/marketplace.json)
 *  - 매니페스트의 훅은 편집 후 검사 훅(skills/suta/scripts/post-edit-hook.mjs) 하나만 가리키고, 그 파일이 실재한다
 *  - description 1,024바이트 이하(도구에 따라 바이트로 센다)·": " 없음(YAML이 깨진다)·에이전트 명령문 없음
 *  - 본문 500줄 이하, 본문이 가리키는 patterns/·references/·scripts/ 경로 실재, 패턴 카탈로그가 PATTERN.md·데모 레지스트리와 동기
 *  - 저장소 루트가 곧 플러그인(source "./")이라, 루트에 플러그인 구성 폴더(commands·agents·hooks 등)가 없어야 한다.
 *    훅은 매니페스트에 인라인으로만 둔다 — 루트 hooks/ 폴더를 허용하면 아무 훅이나 사용자 환경에 실릴 수 있다
 * 패턴 (skills/suta/patterns/{패턴}/PATTERN.md)
 *  - frontmatter name = 폴더명, description 80~300자·명령문 없음, 본문이 참조하는 assets/·references/ 경로 실재
 *  - 데모 레지스트리(demo/src/demos/index.ts)와 패턴 폴더가 서로 빠짐없이 짝지어짐
 *  - 공유 코어 복사본 동기: 첫 줄에 `@shared-core {파일} origin: {패턴}` 헤더가 있는 assets 파일은 원본과 내용이 같아야 한다
 * 문서·지침
 *  - README.md·README.ko.md 배지 숫자(패턴 수, 테스트 수)가 실제와 일치
 *  - AGENTS.md 존재, CLAUDE.md가 @AGENTS.md를 가져옴, .claude/skills/add-skill이 .agents/skills/add-skill을 가리킴,
 *    add-skill은 metadata.internal: true — 저장소 관리용이라 일반 사용자 설치 목록(npx skills)에서 숨긴다
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { expectedSkillDocument } from './buildCatalog.mjs'

const hash = (text) => createHash('sha256').update(text).digest('hex')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const frontmatterOf = (md) => md.match(/^---\n([\s\S]*?)\n---/)?.[1]
const findFiles = ({ dir, fileName }) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return findFiles({ dir: join(dir, entry.name), fileName })
    return entry.name === fileName ? [join(dir, entry.name)] : []
  })

const root = fileURLToPath(new URL('..', import.meta.url))
const registry = readFileSync(join(root, 'demo/src/demos/index.ts'), 'utf8')
const errors = []

// ---- 진입 스킬 ----
const SKILL = 'suta'
const skillDir = join(root, 'skills', SKILL)
const skillPath = join(skillDir, 'SKILL.md')

const skillDocs = findFiles({ dir: join(root, 'skills'), fileName: 'SKILL.md' }).map((path) => relative(root, path))
if (skillDocs.length !== 1 || skillDocs[0] !== `skills/${SKILL}/SKILL.md`) {
  errors.push(`skills/ 아래 SKILL.md는 skills/${SKILL}/SKILL.md 하나여야 한다 — 지금: ${skillDocs.join(', ') || '없음'}`)
}

if (!existsSync(skillPath)) errors.push(`skills/${SKILL}/SKILL.md 없음`)
else {
  const md = readFileSync(skillPath, 'utf8')
  const fm = frontmatterOf(md) ?? ''
  const name = fm.match(/^name:\s*(\S+)/m)?.[1] ?? ''
  if (name !== SKILL) errors.push(`SKILL.md: frontmatter name(${name})이 폴더명(${SKILL})과 다름`)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) errors.push(`SKILL.md: name(${name})은 소문자·숫자·하이픈 64자 이하여야 한다`)

  const plugin = readJson(join(root, '.claude-plugin/plugin.json'))
  const marketplace = readJson(join(root, '.claude-plugin/marketplace.json'))
  const entry = marketplace.plugins?.[0]
  if (plugin.name !== SKILL) errors.push(`plugin.json name(${plugin.name})이 스킬 이름과 다름`)
  if (marketplace.name !== SKILL || entry?.name !== SKILL) errors.push('marketplace.json의 마켓플레이스·플러그인 이름이 스킬 이름과 다름')
  if (entry?.source !== './') errors.push('marketplace.json 플러그인 source는 "./"(저장소 루트)여야 한다')
  if (plugin.version !== entry?.version) errors.push(`plugin.json(${plugin.version})과 marketplace.json(${entry?.version})의 버전이 다름`)

  // Codex — 같은 저장소 루트를 Codex 플러그인으로도 설치한다(codex plugin marketplace add). 이름·버전이 어긋나면 한쪽만 갱신된다
  const readManifest = (path) => {
    if (existsSync(join(root, path))) return readJson(join(root, path))
    errors.push(`${path} 없음 — Codex 플러그인 매니페스트다`)
    return {}
  }
  const codexPlugin = readManifest('.codex-plugin/plugin.json')
  const codexEntry = readManifest('.agents/plugins/marketplace.json').plugins?.[0]
  if (codexPlugin.name !== SKILL || codexEntry?.name !== SKILL) errors.push('Codex 매니페스트(.codex-plugin/plugin.json·.agents/plugins/marketplace.json)의 이름이 스킬 이름과 다름')
  if (codexPlugin.version !== plugin.version) errors.push(`.codex-plugin/plugin.json(${codexPlugin.version})과 .claude-plugin/plugin.json(${plugin.version})의 버전이 다름`)
  if (codexEntry?.source?.source !== 'local' || codexEntry?.source?.path !== './') errors.push('.agents/plugins/marketplace.json 플러그인 source는 { "source": "local", "path": "./" }(저장소 루트)여야 한다')
  if (codexPlugin.skills !== './skills/') errors.push('.codex-plugin/plugin.json의 skills는 "./skills/"여야 한다')

  // 훅 — 사용자 환경에서 편집할 때마다 실행되는 코드다. 검사 훅 하나만, 실재하는 스크립트를 가리켜야 한다
  const HOOK_SCRIPT = 'skills/suta/scripts/post-edit-hook.mjs'
  for (const [label, manifest] of [['.claude-plugin/plugin.json', plugin], ['.codex-plugin/plugin.json', codexPlugin]]) {
    const commands = Object.values(manifest.hooks ?? {}).flat().flatMap((group) => group.hooks ?? []).map((hook) => hook.command ?? '')
    if (commands.length !== 1 || !commands[0].includes(`/${HOOK_SCRIPT}`)) errors.push(`${label}: 훅은 ${HOOK_SCRIPT} 하나만 가리켜야 한다 — 지금 ${commands.length}개`)
  }
  if (!existsSync(join(root, HOOK_SCRIPT))) errors.push(`${HOOK_SCRIPT} 없음 — 매니페스트의 훅이 가리키는 스크립트다`)

  const desc = fm.match(/^description:\s*(.+)$/m)?.[1] ?? ''
  const bytes = Buffer.byteLength(desc, 'utf8')
  if (desc.length < 80 || bytes > 1024) errors.push(`SKILL.md: description ${desc.length}자·${bytes}바이트 (80자 이상, 1,024바이트 이하)`)
  if (desc.includes(': ')) errors.push('SKILL.md: description에 ": "가 있음 — YAML 해석이 깨진다')
  if (/반드시 이 스킬을 사용할 것|이 스킬을 사용/.test(desc)) errors.push('SKILL.md: description에 에이전트 명령문이 있음 — 3인칭으로 무엇을·언제만 적는다')

  const bodyLines = md.slice(md.indexOf('\n---', 3) + 4).split('\n').length
  if (bodyLines > 500) errors.push(`SKILL.md: 본문 ${bodyLines}줄 (500줄 이하 — 매 UI 요청마다 통째로 읽힌다)`)
  const refs = [
    ...[...md.matchAll(/`((?:patterns|references|scripts)\/[^`*{}]+)`/g)].map((match) => match[1]),
    ...[...md.matchAll(/\]\(((?:patterns|references|scripts)\/[^)]+)\)/g)].map((match) => match[1]),
  ]
  for (const ref of new Set(refs)) if (!existsSync(join(skillDir, ref))) errors.push(`SKILL.md: 참조 경로 없음 — ${ref}`)
  try {
    if (md !== expectedSkillDocument()) errors.push('SKILL.md: 패턴 카탈로그가 PATTERN.md·데모 레지스트리와 어긋남 — npm run catalog로 다시 만든다')
  } catch (error) {
    errors.push(`SKILL.md: 패턴 카탈로그를 만들 수 없음 — ${error.message}`)
  }
}

// 저장소 루트가 플러그인이라, 이런 폴더가 생기면 설치한 사용자 환경에 그대로 로드된다
for (const component of ['commands', 'agents', 'hooks', 'output-styles', '.mcp.json']) {
  if (existsSync(join(root, component))) errors.push(`루트에 ${component}이(가) 있음 — 플러그인 구성으로 사용자 환경에 로드된다`)
}

// ---- 패턴 ----
const patternsDir = join(skillDir, 'patterns')
let patternCount = 0
for (const name of readdirSync(patternsDir).sort()) {
  const dir = join(patternsDir, name)
  if (!statSync(dir).isDirectory()) continue
  patternCount += 1
  const docPath = join(dir, 'PATTERN.md')
  if (!existsSync(docPath)) {
    errors.push(`${name}: PATTERN.md 없음`)
    continue
  }
  const md = readFileSync(docPath, 'utf8')
  const fm = frontmatterOf(md)
  if (!fm) {
    errors.push(`${name}: frontmatter 없음`)
    continue
  }
  const fmName = fm.match(/^name:\s*(\S+)/m)?.[1]
  if (fmName !== name) errors.push(`${name}: frontmatter name(${fmName})이 폴더명과 다름`)
  const desc = fm.match(/^description:\s*(.+)$/m)?.[1] ?? ''
  if (desc.length < 80 || desc.length > 300) errors.push(`${name}: description 길이 ${desc.length}자 (80~300자 필요)`)
  if (/반드시 이 스킬을 사용할 것|이 스킬을 사용|이 패턴을 사용/.test(desc)) errors.push(`${name}: description에 에이전트 명령문이 있음 — 3인칭으로 무엇을·언제만 적는다`)
  for (const [, ref] of md.matchAll(/`((?:assets|references)\/[\w./-]+)`/g)) {
    if (!existsSync(join(dir, ref))) errors.push(`${name}: 참조 파일 없음 — ${ref}`)
  }
  if (!registry.includes(`slug: '${name}'`)) errors.push(`${name}: 데모 레지스트리에 미등록`)

  // 공유 코어 복사본 — 원본(origin 패턴의 같은 파일명)과 해시가 다르면 드리프트
  const assetsDir = join(dir, 'assets')
  if (!existsSync(assetsDir)) continue
  for (const file of readdirSync(assetsDir)) {
    const text = readFileSync(join(assetsDir, file), 'utf8')
    const header = text.split('\n')[0].match(/@shared-core\s+(\S+)\s+origin:\s+([\w-]+)/)
    if (!header) continue
    const [, sharedFile, origin] = header
    if (origin === name) continue
    const originPath = join(patternsDir, origin, 'assets', sharedFile)
    if (!existsSync(originPath)) {
      errors.push(`${name}: 공유 코어 원본 없음 — ${origin}/assets/${sharedFile}`)
      continue
    }
    if (hash(text) !== hash(readFileSync(originPath, 'utf8'))) {
      errors.push(`${name}: assets/${file}이 원본 ${origin}/assets/${sharedFile}과 다름 — 원본을 다시 복사하라`)
    }
  }
}
// 반대 방향 — 데모 레지스트리에만 있고 패턴 폴더가 없으면 카탈로그에서 빠진다
for (const [, slug] of registry.matchAll(/slug: '([^']+)'/g)) {
  if (!existsSync(join(patternsDir, slug, 'PATTERN.md'))) errors.push(`데모 레지스트리의 ${slug}: 패턴 폴더(skills/${SKILL}/patterns/${slug}) 없음`)
}

// README 배지 — 숫자가 실제와 어긋나면 문서가 거짓말을 한다. 테스트 수는 vitest가 남긴 마지막 결과 없이도 셀 수 있게 it( 호출 수로 센다
// 한국어판(README.ko.md)이 있으면 같은 숫자여야 한다 — 두 문서가 다른 숫자를 말하면 하나는 거짓말이다
const readmes = ['README.md', 'README.ko.md'].filter((name) => existsSync(join(root, name))).map((name) => ({ name, text: readFileSync(join(root, name), 'utf8') }))
const expectBadge = ({ label, actual }) => {
  for (const { name, text } of readmes) {
    const shown = Number(text.match(new RegExp(`badge/${label}-(\\d+)%20`))?.[1] ?? NaN)
    if (shown !== actual) errors.push(`${name} 배지 ${label}: ${shown}로 표기, 실제 ${actual} — 배지를 갱신하라`)
  }
}
expectBadge({ label: SKILL, actual: patternCount })
const testsDir = join(root, 'demo/src/tests')
const testCount = readdirSync(testsDir)
  .filter((file) => /\.test\.tsx?$/.test(file))
  .reduce((sum, file) => sum + (readFileSync(join(testsDir, file), 'utf8').match(/^\s*it\(/gm) ?? []).length, 0)
expectBadge({ label: 'tests', actual: testCount })

// 공통 지침 — 다른 에이전트(Codex·Cursor·Gemini CLI·Copilot)와 Claude가 같은 규칙·같은 add-skill 절차를 읽어야 한다.
// 링크가 끊기거나 CLAUDE.md가 가져오기를 빼먹으면 한쪽만 다른 규칙을 보게 되므로 기계적으로 검사한다
const agentsPath = join(root, 'AGENTS.md')
if (!existsSync(agentsPath)) errors.push('AGENTS.md 없음 — 공통 작업 지침의 단일 출처다')
const claudeMd = existsSync(join(root, 'CLAUDE.md')) ? readFileSync(join(root, 'CLAUDE.md'), 'utf8') : ''
if (!/^@AGENTS\.md\s*$/m.test(claudeMd)) errors.push('CLAUDE.md가 @AGENTS.md를 가져오지 않음 — 첫 줄에 @AGENTS.md')
const addSkillShared = join(root, '.agents/skills/add-skill/SKILL.md')
if (!existsSync(addSkillShared)) errors.push('.agents/skills/add-skill/SKILL.md 없음 — 패턴 추가 절차는 .agents/에 둔다')
else if (!/^metadata:\s*\n\s+internal:\s*true\s*$/m.test(frontmatterOf(readFileSync(addSkillShared, 'utf8')) ?? '')) {
  errors.push('.agents/skills/add-skill: frontmatter에 metadata.internal: true가 없음 — 일반 사용자 설치 목록에 저장소 관리용 스킬이 뜬다')
}
const addSkillClaude = join(root, '.claude/skills/add-skill/SKILL.md')
if (!existsSync(addSkillClaude) || (existsSync(addSkillShared) && hash(readFileSync(addSkillClaude, 'utf8')) !== hash(readFileSync(addSkillShared, 'utf8')))) {
  errors.push('.claude/skills/add-skill이 .agents/skills/add-skill과 다름 — 심볼릭 링크(ln -s ../../.agents/skills/add-skill)여야 한다')
}

if (errors.length > 0) {
  console.error(`스킬 구조 검증 실패 ${errors.length}건:`)
  errors.forEach((error) => console.error(`  - ${error}`))
  process.exit(1)
}
console.log(`스킬 구조 검증 통과 (진입 스킬 ${SKILL}, 패턴 ${patternCount}개)`)
