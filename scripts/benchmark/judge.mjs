#!/usr/bin/env node
/**
 * 퍼블리싱 벤치마크 보조 단계 — 블라인드 판정. 같은 요청으로 만든 두 화면의 스크린샷을 A·B로만 보여 주고 고르게 한다.
 * 어느 쪽이 suta인지 알리지 않고, 한 쌍을 순서를 바꿔 두 번 판정한다(앞에 놓인 쪽을 고르는 버릇을 상쇄).
 * 판정자는 플러그인 없는 새 Claude Code 세션이다. 판정 기준에는 suta의 규칙을 넣지 않는다(넣으면 suta 쪽으로 기운다).
 * 사람의 평가가 아니라 모델의 판정이라 보고서에서 참고 지표로만 쓴다.
 *
 * 입력: measure.mjs가 실행 폴더마다 남긴 shot-390.png(모바일 전체)·shot-1280.png(데스크톱 첫 화면)
 * 결과: <out>/judgments.json
 * 사용: node scripts/benchmark/judge.mjs --out <폴더> [--concurrency 4] [--model 이름] [--name 결과파일이름] [--prompts 요청 세트]
 * 요청 세트에 mobileOnly: true가 있으면(앱 화면) 모바일 화면만 보여 준다. 앱 화면을 데스크톱 배치로 판정하지 않게
 */
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = new URL('../..', import.meta.url).pathname
const option = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const outDir = option('out')
if (!outDir) {
  console.error('사용: node scripts/benchmark/judge.mjs --out <폴더> [--concurrency 4]')
  process.exit(1)
}
const out = resolve(outDir)
const concurrency = Number(option('concurrency', '4'))
const model = option('model', '')
// 판정 결과 파일 이름 — 다른 판정 모델로 한 번 더 판정할 때 앞의 결과를 덮지 않게
const name = option('name', 'judgments')
const spec = JSON.parse(readFileSync(resolve(root, option('prompts', 'evals/benchmark/prompts.json')), 'utf8'))
const prompts = Object.fromEntries(spec.prompts.map((p) => [p.id, p.prompt]))
const mobileOnly = spec.mobileOnly === true

// run.mjs와 같은 이유로 부모 세션 정보를 지운다
const childEnv = { ...process.env }
for (const name of ['CLAUDE_EFFORT', 'CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD', 'CLAUDE_ADDITIONAL_DIRECTORIES', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_REMOTE_SESSION_ID', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_CODE_DEBUG', 'CLAUDE_CODE_DIAGNOSTICS_FILE', 'CLAUDE_CODE_TEE_SDK_STDOUT', 'CLAUDE_AFTER_LAST_COMPACT', 'CLAUDE_CODE_SYNC_SESSION_REFS', 'CLAUDE_CODE_REMOTE_SDK_URL', 'SESSION_INGRESS_URL', 'CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2']) delete childEnv[name]

const SCHEMA = JSON.stringify({
  type: 'object',
  properties: { winner: { type: 'string', enum: ['A', 'B', 'tie'] }, reason: { type: 'string' } },
  required: ['winner', 'reason'],
})

const instruction = (request) =>
  mobileOnly
    ? `같은 요청으로 만든 모바일 앱 화면 두 개(A, B)의 스크린샷이 이 폴더에 있다.
- A-mobile.png, B-mobile.png: 390px 폭 모바일 화면 전체

요청: "${request}"

두 이미지를 모두 Read로 연 뒤, 숙련된 프로덕트 디자이너가 실제 앱에 그대로 내보내도 좋다고 할 쪽을 골라라.
정보의 위계, 읽기 쉬움, 간격·정렬의 일관성, 실제 앱다운 배치, 전체 완성도를 본다.
차이가 거의 없으면 tie. 답은 winner(A·B·tie)와 reason(한국어 한 문장)만.`
    : `같은 요청으로 만든 웹 화면 두 개(A, B)의 스크린샷이 이 폴더에 있다.
- A-mobile.png, B-mobile.png: 390px 폭 모바일 화면 전체
- A-desktop.png, B-desktop.png: 1280px 폭 데스크톱 첫 화면

요청: "${request}"

네 이미지를 모두 Read로 연 뒤, 숙련된 프로덕트 디자이너가 실제 서비스에 그대로 내보내도 좋다고 할 쪽을 골라라.
정보의 위계, 읽기 쉬움, 간격·정렬의 일관성, 모바일과 데스크톱 각각의 배치, 전체 완성도를 본다.
차이가 거의 없으면 tie. 답은 winner(A·B·tie)와 reason(한국어 한 문장)만.`

const pairs = []
const runsDir = join(out, 'runs')
for (const name of readdirSync(join(runsDir, 'baseline'))) {
  const base = join(runsDir, 'baseline', name)
  const suta = join(runsDir, 'suta', name)
  const shots = (dir) => ['shot-390.png', 'shot-1280.png'].every((f) => existsSync(join(dir, f)))
  if (existsSync(suta) && shots(base) && shots(suta)) pairs.push({ name, prompt: name.replace(/-\d+$/, ''), base, suta })
}

const judgeOnce = ({ pair, order }) =>
  new Promise((done) => {
    // order 'suta-first'면 A가 suta, 'base-first'면 A가 baseline
    const [a, b] = order === 'suta-first' ? [pair.suta, pair.base] : [pair.base, pair.suta]
    const work = join(out, name, `${pair.name}-${order}`)
    rmSync(work, { recursive: true, force: true })
    mkdirSync(work, { recursive: true })
    copyFileSync(join(a, 'shot-390.png'), join(work, 'A-mobile.png'))
    copyFileSync(join(b, 'shot-390.png'), join(work, 'B-mobile.png'))
    if (!mobileOnly) {
      copyFileSync(join(a, 'shot-1280.png'), join(work, 'A-desktop.png'))
      copyFileSync(join(b, 'shot-1280.png'), join(work, 'B-desktop.png'))
    }
    const argv = ['-p', '--output-format', 'json', '--no-session-persistence', '--tools', 'Read', '--json-schema', SCHEMA]
    if (model) argv.push('--model', model)
    const child = spawn('claude', argv, { cwd: work, env: childEnv, stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks = []
    child.stdout.on('data', (chunk) => chunks.push(chunk))
    child.stdin.end(instruction(prompts[pair.prompt]))
    child.on('close', () => {
      let verdict = null
      try {
        const result = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        verdict = result.structured_output ?? JSON.parse(String(result.result).match(/\{[\s\S]*\}/)?.[0] ?? 'null')
      } catch {
        verdict = null
      }
      const picked = verdict?.winner
      // A·B를 조건 이름으로 되돌린다
      const winner = picked === 'tie' ? 'tie' : picked === 'A' ? (order === 'suta-first' ? 'suta' : 'baseline') : picked === 'B' ? (order === 'suta-first' ? 'baseline' : 'suta') : null
      done({ pair: pair.name, prompt: pair.prompt, order, winner, reason: verdict?.reason ?? null })
    })
  })

const jobs = pairs.flatMap((pair) => [{ pair, order: 'base-first' }, { pair, order: 'suta-first' }])
console.log(`판정 ${jobs.length}개 (쌍 ${pairs.length} × 순서 2), 동시 ${concurrency}개`)
const judgments = []
let next = 0
const worker = async () => {
  while (next < jobs.length) {
    const job = jobs[next]
    next += 1
    const result = await judgeOnce(job)
    judgments.push(result)
    console.log(`${result.pair} ${result.order} → ${result.winner ?? '판정 실패'}`)
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker))
judgments.sort((x, y) => (x.pair + x.order).localeCompare(y.pair + y.order))
writeFileSync(join(out, `${name}.json`), JSON.stringify(judgments, null, 2))
const valid = judgments.filter((j) => j.winner)
const score = (who) => valid.reduce((sum, j) => sum + (j.winner === who ? 1 : j.winner === 'tie' ? 0.5 : 0), 0)
console.log(`suta ${score('suta')} : baseline ${score('baseline')} (판정 ${valid.length}개, 무승부는 0.5)`)
