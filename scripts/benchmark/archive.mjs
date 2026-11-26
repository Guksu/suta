#!/usr/bin/env node
/**
 * 퍼블리싱 벤치마크 — 생성물 보존. 실행 폴더(<out>/runs)는 저장소 밖이라 측정이 끝나면 사라진다.
 * 실행마다 산출물의 글자 파일·meta.json·도구 사용 순서를 한 파일로 묶어 저장소에 둔다(evals/benchmark/artifacts/<이름>.json.gz).
 * 대화 기록 전체와 캡처는 넣지 않는다 — 캡처는 풀어 놓고 measure.mjs를 돌리면 다시 나온다.
 *
 * 묶기: node scripts/benchmark/archive.mjs --out <실행 폴더> --name <이름> [--date YYYY-MM-DD]
 * 풀기: node scripts/benchmark/archive.mjs --restore <이름 또는 .json.gz 경로> --out <빈 폴더>
 *        → <빈 폴더>/runs/<조건>/<id>/ 에 work/·meta.json·trace.json. 이어서 measure.mjs --out <빈 폴더>
 * 보기: node scripts/benchmark/archive.mjs --list <이름 또는 경로>   실행마다 읽은 스킬 문서와 도구 사용 수
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { bundleOf, docsReadOf, keepFile, restorePlan, traceOf } from '../lib/runArchive.ts'

const root = new URL('../..', import.meta.url).pathname
const artifacts = join(root, 'evals/benchmark/artifacts')

const option = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : ''
}
const usage = () => {
  console.error('사용: node scripts/benchmark/archive.mjs --out <실행 폴더> --name <이름>\n      node scripts/benchmark/archive.mjs --restore <이름|경로> --out <빈 폴더>\n      node scripts/benchmark/archive.mjs --list <이름|경로>')
  process.exit(1)
}

const bundlePathOf = (nameOrPath) => (nameOrPath.endsWith('.json.gz') ? resolve(nameOrPath) : join(artifacts, `${nameOrPath}.json.gz`))
const readBundle = (nameOrPath) => {
  const path = bundlePathOf(nameOrPath)
  if (!existsSync(path)) {
    console.error(`묶음이 없다: ${path}`)
    process.exit(1)
  }
  return JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'))
}

/** 폴더 아래 모든 파일의 상대 경로 — 의존성·숨김 폴더는 들어가지 않는다 */
const walk = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path, base)
    return entry.isFile() ? [relative(base, path)] : []
  })

const list = option('list')
const restore = option('restore')
const out = option('out')

if (list) {
  const bundle = readBundle(list)
  console.log(`${bundle.name} — ${bundle.archivedAt}, 실행 ${bundle.runs.length}개`)
  for (const run of bundle.runs) {
    const docs = docsReadOf(run.trace)
    console.log(`${run.condition}/${run.id} — 파일 ${Object.keys(run.files).length}개, 도구 ${run.trace.length}번, 읽은 스킬 문서: ${docs.length > 0 ? docs.join(', ') : '없음'}`)
  }
} else if (restore) {
  if (!out) usage()
  const target = resolve(out)
  if (existsSync(join(target, 'runs'))) {
    console.error(`${join(target, 'runs')} 가 이미 있다 — 덮어쓰지 않는다. 빈 폴더를 준다.`)
    process.exit(1)
  }
  const plan = restorePlan(readBundle(restore))
  for (const file of plan) {
    const path = join(target, file.path)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, file.content)
  }
  console.log(`파일 ${plan.length}개를 ${target} 에 풀었다. 다음: node scripts/benchmark/measure.mjs --out ${out}`)
} else {
  const name = option('name')
  if (!out || !name) usage()
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    console.error('이름은 영문 소문자·숫자·하이픈만 쓴다.')
    process.exit(1)
  }
  const runsDir = join(resolve(out), 'runs')
  if (!existsSync(runsDir)) {
    console.error(`${runsDir} 가 없다 — run.mjs의 --out 폴더를 준다.`)
    process.exit(1)
  }
  const runs = []
  let skipped = 0
  for (const condition of readdirSync(runsDir)) {
    for (const id of readdirSync(join(runsDir, condition))) {
      const dir = join(runsDir, condition, id)
      const metaPath = join(dir, 'meta.json')
      if (!existsSync(metaPath)) continue
      const work = join(dir, 'work')
      const files = {}
      for (const path of existsSync(work) ? walk(work) : []) {
        const full = join(work, path)
        if (keepFile({ path, size: statSync(full).size })) files[path] = readFileSync(full, 'utf8')
        else skipped += 1
      }
      const streamPath = join(dir, 'stream.jsonl')
      runs.push({
        condition,
        id,
        meta: JSON.parse(readFileSync(metaPath, 'utf8')),
        trace: existsSync(streamPath) ? traceOf(readFileSync(streamPath, 'utf8').split('\n')) : [],
        files,
      })
    }
  }
  if (runs.length === 0) {
    console.error('묶을 실행이 없다(meta.json이 있는 실행 폴더가 없다).')
    process.exit(1)
  }
  const bundle = bundleOf({ name, archivedAt: option('date') || new Date().toISOString().slice(0, 10), runs })
  mkdirSync(artifacts, { recursive: true })
  const path = join(artifacts, `${name}.json.gz`)
  const packed = gzipSync(JSON.stringify(bundle), { level: 9 })
  writeFileSync(path, packed)
  console.log(`실행 ${runs.length}개를 묶었다 → ${relative(root, path)} (${Math.round(packed.length / 1024)}KB${skipped > 0 ? `, 뺀 파일 ${skipped}개` : ''})`)
}
