#!/usr/bin/env node
/**
 * 퍼블리싱 벤치마크 1단계 — 실행. 같은 요청문을 두 조건의 Claude Code(claude -p)에 그대로 준다.
 *   baseline  아무것도 설치하지 않은 Claude Code
 *   suta      suta 플러그인(진입 스킬 + 편집 후 검사 훅)을 --plugin-dir로 실은 Claude Code
 * 모델·설정·도구 권한은 두 조건이 같다. 다른 것은 플러그인 하나뿐이다.
 *
 * 요청문: evals/benchmark/prompts.json(--prompts로 다른 요청 세트, 예: evals/benchmark/app-prompts.json). 실행마다 빈 작업 폴더에서 시작하고, 결과는 그 폴더의 index.html이다.
 * 기록: <out>/runs/<조건>/<요청 id>-<반복>/ 에 work/(산출물)·stream.jsonl(전체 대화)·meta.json(시간·토큰·도구 사용)
 * 이미 끝난 실행(meta.json의 done)은 건너뛰므로, 중간에 끊겨도 같은 명령으로 이어서 돌린다.
 *
 * 사용: node scripts/benchmark/run.mjs --out <폴더> [--repeats 2] [--concurrency 3] [--only id,id]
 *                                     [--conditions baseline,suta] [--model 이름] [--effort 수준] [--budget 4]
 *                                     [--prompts evals/benchmark/app-prompts.json]
 * 다음 단계: measure.mjs(측정) → report.mjs(집계)
 */
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = new URL('../..', import.meta.url).pathname

const option = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const outDir = option('out')
if (!outDir) {
  console.error('사용: node scripts/benchmark/run.mjs --out <폴더> [--repeats 2] [--concurrency 3] [--only id,id] [--conditions baseline,suta]')
  process.exit(1)
}
const out = resolve(outDir)
const repeats = Number(option('repeats', '2'))
const concurrency = Number(option('concurrency', '3'))
const conditions = option('conditions', 'baseline,suta').split(',')
const only = option('only', '')
const model = option('model', '')
const effort = option('effort', '')
const budget = option('budget', '4')
const TIMEOUT_MS = 20 * 60 * 1000

const spec = JSON.parse(readFileSync(resolve(root, option('prompts', 'evals/benchmark/prompts.json')), 'utf8'))
const prompts = spec.prompts.filter((p) => !only || only.split(',').includes(p.id))

// suta 조건이 실을 플러그인 — 마켓플레이스 설치와 같은 구성(매니페스트 + skills/)만, 실행마다 따로 복사한다
// (한 실행이 플러그인 파일을 고쳐도 다른 실행에 번지지 않게)
const copyPlugin = (dir) => {
  mkdirSync(dir, { recursive: true })
  cpSync(join(root, '.claude-plugin'), join(dir, '.claude-plugin'), { recursive: true })
  cpSync(join(root, 'skills'), join(dir, 'skills'), { recursive: true })
}

// 이 하네스를 Claude Code 세션 안에서 돌리면 자식 claude가 부모 세션의 정보(세션 ID·추가 CLAUDE.md 폴더·생각 수준 등)를
// 물려받는다. 두 조건이 같은 새 세션에서 출발하도록 지운다. 일반 터미널에는 없는 변수라 지워도 아무 일이 없다.
const PARENT_SESSION_VARS = [
  'CLAUDE_EFFORT',
  'CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD',
  'CLAUDE_ADDITIONAL_DIRECTORIES',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_REMOTE_SESSION_ID',
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_CODE_DEBUG',
  'CLAUDE_CODE_DIAGNOSTICS_FILE',
  'CLAUDE_CODE_TEE_SDK_STDOUT',
  'CLAUDE_AFTER_LAST_COMPACT',
  'CLAUDE_CODE_SYNC_SESSION_REFS',
  'CLAUDE_CODE_REMOTE_SDK_URL',
  'SESSION_INGRESS_URL',
  'CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2',
]
const childEnv = { ...process.env }
for (const name of PARENT_SESSION_VARS) delete childEnv[name]

/** stream-json 기록에서 실행 요약을 뽑는다 — 도구 사용 수, 스킬을 읽었는가, 훅이 무엇을 돌려보냈는가 */
const summarize = (lines) => {
  const tools = {}
  const patterns = new Set()
  let skillRead = false
  let hookBlocks = 0
  let hookWarns = 0
  let result = null
  for (const line of lines) {
    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event.type === 'result') result = event
    const blocks = event.type === 'assistant' ? (event.message?.content ?? []) : []
    for (const block of blocks) {
      if (block.type !== 'tool_use') continue
      tools[block.name] = (tools[block.name] ?? 0) + 1
      const input = JSON.stringify(block.input ?? {})
      if (block.name === 'Skill' && /suta/.test(input)) skillRead = true
      if (/skills\/suta\/SKILL\.md/.test(input)) skillRead = true
      // 패턴 폴더를 읽은 흔적 — 절대 경로(…/patterns/이름/)와, patterns 폴더로 cd한 뒤의 상대 경로(이름/assets 등)
      for (const m of input.matchAll(/skills\/suta\/patterns\/([a-z][\w-]*)\//g)) patterns.add(m[1])
      if (input.includes('skills/suta/patterns')) {
        for (const m of input.matchAll(/(?:^|[\s;"'(])([a-z][a-z0-9-]*)\/(?:assets|references|PATTERN\.md)/g)) patterns.add(m[1])
      }
    }
    // 편집 후 검사 훅의 출력 — error는 막고(종료 2) warn은 참고로 돌려보낸다
    if (line.includes('suta 검사')) {
      if (/방금 고친 줄에 error/.test(line)) hookBlocks += 1
      else if (/warn \d+건/.test(line)) hookWarns += 1
    }
  }
  const usage = result?.usage ?? {}
  return {
    ok: result?.subtype === 'success' && !result?.is_error,
    durationMs: result?.duration_ms ?? null,
    turns: result?.num_turns ?? null,
    costUsd: result?.total_cost_usd ?? null,
    tokens: {
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      cacheRead: usage.cache_read_input_tokens ?? 0,
      cacheWrite: usage.cache_creation_input_tokens ?? 0,
    },
    tools,
    skillRead,
    patterns: [...patterns].sort(),
    hookBlocks,
    hookWarns,
    // 비대화형이라 승인할 사람이 없어 막힌 도구 호출 — 0이어야 두 조건이 제 실력을 낸 것이다
    permissionDenials: result?.permission_denials?.length ?? 0,
  }
}

const runOne = ({ prompt, condition, rep }) =>
  new Promise((done) => {
    const dir = join(out, 'runs', condition, `${prompt.id}-${rep}`)
    const metaPath = join(dir, 'meta.json')
    if (existsSync(metaPath) && JSON.parse(readFileSync(metaPath, 'utf8')).done) return done('skip')
    rmSync(dir, { recursive: true, force: true })
    const work = join(dir, 'work')
    mkdirSync(work, { recursive: true })
    const argv = [
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      '--no-session-persistence',
      // 파일 쓰기는 작업 폴더 안에서 자동 승인, 셸 명령은 모두 허용 — 사람이 옆에서 승인해 주는 것과 같다.
      // 비대화형에는 승인할 사람이 없어, 허용하지 않은 호출은 그냥 거절된다(검사·확인을 못 하고 끝난다)
      '--permission-mode', 'acceptEdits',
      '--allowedTools', 'Bash',
      '--max-budget-usd', budget,
    ]
    if (condition === 'suta') {
      // 설치된 플러그인 파일(패턴 문서·검사기)은 읽을 수 있어야 한다 — 대화형이라면 사용자가 승인했을 읽기다
      const pluginDir = join(dir, 'plugin')
      copyPlugin(pluginDir)
      argv.push('--plugin-dir', pluginDir, '--add-dir', pluginDir)
    }
    if (model) argv.push('--model', model)
    if (effort) argv.push('--effort', effort)
    const started = Date.now()
    const child = spawn('claude', argv, { cwd: work, env: childEnv, stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks = []
    const errors = []
    child.stdout.on('data', (chunk) => chunks.push(chunk))
    child.stderr.on('data', (chunk) => errors.push(chunk))
    const timer = setTimeout(() => child.kill('SIGTERM'), TIMEOUT_MS)
    // 요청문은 표준 입력으로 준다 — 인자로 주면 다른 옵션 값과 섞일 수 있다
    child.stdin.end(prompt.prompt + spec.suffix)
    child.on('close', (code) => {
      clearTimeout(timer)
      const stream = Buffer.concat(chunks).toString('utf8')
      writeFileSync(join(dir, 'stream.jsonl'), stream)
      writeFileSync(join(dir, 'stderr.txt'), Buffer.concat(errors).toString('utf8'))
      const meta = {
        prompt: prompt.id,
        screen: prompt.screen,
        condition,
        rep,
        exitCode: code,
        wallMs: Date.now() - started,
        produced: existsSync(join(work, 'index.html')),
        ...summarize(stream.split('\n')),
      }
      meta.done = meta.ok && meta.produced
      writeFileSync(metaPath, JSON.stringify(meta, null, 2))
      done(meta)
    })
  })

const jobs = []
for (let rep = 1; rep <= repeats; rep += 1) {
  for (const prompt of prompts) for (const condition of conditions) jobs.push({ prompt, condition, rep })
}
console.log(`실행 ${jobs.length}개 (요청 ${prompts.length} × 조건 ${conditions.length} × 반복 ${repeats}), 동시 ${concurrency}개 → ${out}`)

let next = 0
const worker = async () => {
  while (next < jobs.length) {
    const job = jobs[next]
    next += 1
    const meta = await runOne(job)
    const label = `${job.condition}/${job.prompt.id}-${job.rep}`
    if (meta === 'skip') console.log(`건너뜀 ${label}`)
    else console.log(`${meta.done ? '완료' : '실패'} ${label} — ${Math.round(meta.wallMs / 1000)}초, 턴 ${meta.turns}, 스킬 ${meta.skillRead ? '읽음' : '안 읽음'}, 훅 막음 ${meta.hookBlocks}·알림 ${meta.hookWarns}, 권한 거절 ${meta.permissionDenials}`)
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker))
