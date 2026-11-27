/**
 * 벤치마크 생성물 보존의 순수 로직 (파일·프로세스 없음 — 읽고 쓰는 일은 scripts/benchmark/archive.mjs).
 *
 * 왜 보존하는가: 실행 폴더(<out>/runs)는 저장소 밖 임시 폴더라 측정이 끝나면 사라진다. 남는 것은 집계 JSON과 비교 이미지뿐이라,
 * 나중에 "요청한 것을 지켰는가", "어떤 문서를 읽었는가", "움직임이 어땠는가"를 다시 볼 수 없었다(2026-11-26 조사 세 건이 모두 여기서 막혔다).
 *
 * 무엇을 남기는가: 실행마다 산출물의 글자 파일(index.html 등), meta.json, 그리고 도구 사용 순서(trace).
 * 대화 기록 전체(stream.jsonl)는 크고 실행한 사람의 폴더 경로가 들어 있어 남기지 않는다.
 * 캡처는 남기지 않는다 — 산출물이 있으면 measure.mjs가 다시 찍는다.
 */

export type TraceStep = { tool: string; target: string }

export type ArchivedRun = {
  condition: string
  /** 실행 폴더 이름 — <요청 id>-<반복> */
  id: string
  meta: Record<string, unknown>
  trace: TraceStep[]
  /** 스킬 폴더에서 읽은 파일(전체 명령에서 센 것). 없으면 trace에서 다시 센다 — 줄인 기록이라 덜 잡힌다 */
  read?: string[]
  /** 작업 폴더 기준 상대 경로 → 내용 */
  files: Record<string, string>
}

export type Bundle = { schemaVersion: 1; name: string; archivedAt: string; runs: ArchivedRun[] }

const TARGET_MAX = 200

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 실행한 사람의 폴더 경로를 지운다 — 누가 어디서 돌렸는지는 기록할 것이 아니다.
 * 시험 실행에서 세 가지 모양이 나왔다: 실행 폴더 아래의 plugin·work, 실행 폴더 자체(cd로 옮겨 간 명령),
 * 자식 세션이 받은 임시 폴더(작업 폴더 경로를 이름에 품는다 — …-runs-<조건>-<id>-work/<세션 id>/scratchpad).
 * root(run.mjs의 --out)를 알면 그 아래 남은 경로도 <out>으로 바꾼다
 */
const withoutRunDir = ({ text, root }: { text: string; root?: string }) => {
  // 경로는 '/'에서 시작한다 — 앞의 `S=` 같은 변수 이름까지 지우면 뒤의 `$S/...`가 무엇을 가리키는지 알 수 없다
  const cleaned = text
    .replace(/(^|[\s"'=(:])\/[^\s"']*-runs-[^/\s"']+-work\/[0-9a-f-]{36}(?:\/scratchpad)?/g, '$1scratch')
    .replace(/(^|[\s"'=(:])\/[^\s"']*\/runs\/[^/\s]+\/[^/\s]+\/(plugin|work)/g, '$1$2')
    .replace(/(^|[\s"'=(:])\/[^\s"']*\/runs\/[^/\s"';]+\/[^/\s"';]+/g, '$1.')
  return root ? cleaned.replace(new RegExp(escapeRe(root.replace(/\/+$/, '')), 'g'), '<out>') : cleaned
}

const fullTargetOf = ({ input, root }: { input: Record<string, unknown>; root?: string }) => {
  const raw = [input.file_path, input.path, input.command, input.skill, input.pattern, input.url].find((v) => typeof v === 'string' && v.length > 0)
  return typeof raw === 'string' ? withoutRunDir({ text: raw.trim(), root }) : ''
}

const shorten = (text: string) => (text.length > TARGET_MAX ? `${text.slice(0, TARGET_MAX)}…` : text)

/** stream-json 줄들 → 도구 사용 순서. 내용(쓴 파일 본문 등)은 버리고 무엇을 대상으로 했는지만 남긴다 */
const stepsOf = ({ lines, root }: { lines: string[]; root?: string }): TraceStep[] => {
  const steps: TraceStep[] = []
  for (const line of lines) {
    let event: { type?: string; message?: { content?: { type?: string; name?: string; input?: Record<string, unknown> }[] } }
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event?.type !== 'assistant') continue
    for (const block of event.message?.content ?? []) {
      if (block.type !== 'tool_use' || !block.name) continue
      steps.push({ tool: block.name, target: fullTargetOf({ input: block.input ?? {}, root }) })
    }
  }
  return steps
}

export const traceOf = (lines: string[], { root }: { root?: string } = {}): TraceStep[] =>
  stepsOf({ lines, root }).map((step) => ({ tool: step.tool, target: shorten(step.target) }))

/** 스킬 폴더에서 읽은 파일 — 줄이지 않은 명령 전체에서 센다. 줄인 기록(trace)으로 세면 긴 명령의 뒤쪽에서 읽은 파일이 빠진다 */
export const skillFilesRead = (lines: string[], { root }: { root?: string } = {}): string[] => docsReadOf(stepsOf({ lines, root }))

/** 읽는 것이 아닌 명령 — 크기 세기·목록·실행 */
const NOT_READING = new Set(['wc', 'ls', 'node', 'echo', 'which', 'mkdir', 'find', 'test'])

/**
 * 스킬 폴더에서 읽은 파일(문서·CSS·코드) — 스킬 폴더 기준 경로, 처음 읽은 순서. 쓰기·고치기는 읽은 것이 아니다.
 * 시험 실행에서 본 읽는 길을 센다: 스킬 도구로 부름(SKILL.md가 대화에 실린다), 전체 경로, 스킬 폴더로 옮겨 간(cd) 뒤의 상대 경로,
 * 스킬 폴더를 담은 셸 변수(S=…; sed -n 1,40p $S/…). 변수 길을 세지 않던 때에는 부품 문서를 읽은 실행을 "진입 문서만 읽었다"고 잘못 셌다.
 * 별표가 든 경로와 wc·ls·node 같은 명령의 인자는 읽은 것으로 치지 않는다
 */
export const docsReadOf = (trace: TraceStep[]): string[] => {
  const docs: string[] = []
  const add = (doc: string) => {
    if (!/[*{]/.test(doc) && !docs.includes(doc)) docs.push(doc)
  }
  for (const step of trace) {
    if (step.tool === 'Write' || step.tool === 'Edit') continue
    if (step.tool === 'Skill') {
      if (/(^|:)suta$/.test(step.target)) add('SKILL.md')
      continue
    }
    // 변수에 담은 스킬 폴더를 펼친다
    let text = step.target
    for (const assign of step.target.matchAll(/\b(\w+)=["']?(plugin\/skills\/suta[^\s"';&|]*)/g)) {
      text = text.split('${' + assign[1] + '}').join(assign[2]).replace(new RegExp('\\$' + assign[1] + '\\b', 'g'), assign[2])
    }
    let cwd: string | null = null
    for (const raw of text.split(/;|&&|\|\||\||\n/)) {
      const segment = raw.trim()
      const command = segment.split(/\s+/)[0] ?? ''
      if (command === 'cd') {
        const moved = segment.match(/plugin\/skills\/suta((?:\/[^\s"']+)*)/)
        cwd = moved ? moved[1].replace(/^\/|\/$/g, '') : null
        continue
      }
      if (NOT_READING.has(command)) continue
      for (const match of segment.matchAll(/plugin\/skills\/suta\/([^\s"';,)]+\.(?:md|css|tsx?))(?![\w.])/g)) add(match[1])
      if (cwd === null) continue
      for (const match of segment.matchAll(/(?<![\w/.$*{}-])([\w.-]+(?:\/[\w.*{},-]+)*\.(?:md|css|tsx?))(?![\w.])/g)) {
        if (!match[1].startsWith('plugin/')) add(cwd ? `${cwd}/${match[1]}` : match[1])
      }
    }
  }
  return docs
}

const TEXT_FILE = /\.(html?|css|m?js|jsx|tsx?|json|svg|md|txt)$/i
const FILE_MAX = 1024 * 1024

/** 산출물 가운데 남길 파일 — 글자 파일만, 1MB까지. 의존성·숨김 폴더는 뺀다 */
export const keepFile = ({ path, size }: { path: string; size: number }) => {
  if (size > FILE_MAX) return false
  if (path.split('/').some((part) => part === 'node_modules' || part.startsWith('.'))) return false
  return TEXT_FILE.test(path)
}

const order = (a: ArchivedRun, b: ArchivedRun) => `${a.condition}/${a.id}`.localeCompare(`${b.condition}/${b.id}`)

export const bundleOf = ({ name, archivedAt, runs }: { name: string; archivedAt: string; runs: ArchivedRun[] }): Bundle => ({
  schemaVersion: 1,
  name,
  archivedAt,
  runs: [...runs].sort(order),
})

/** 폴더 이름 하나로 쓸 수 있는가 — 구분자·상위 폴더 표기가 없어야 한다 */
const isSegment = (text: string) => text.length > 0 && !/[\\/]/.test(text) && text !== '.' && text !== '..'

const isInside = (path: string) => !path.startsWith('/') && !/^[a-zA-Z]:/.test(path) && path.split(/[\\/]/).every((part) => part !== '..' && part !== '')

/**
 * 묶음 → 풀어 쓸 파일 목록(measure.mjs가 읽는 runs/<조건>/<id>/ 배치).
 * 묶음은 저장소에 든 파일이라 누가 고쳤을 수 있다 — 대상 폴더 밖을 가리키는 경로가 하나라도 있으면 아무것도 풀지 않는다
 */
export const restorePlan = (bundle: Bundle): { path: string; content: string }[] => {
  const plan: { path: string; content: string }[] = []
  for (const run of bundle.runs) {
    if (!isSegment(run.condition) || !isSegment(run.id)) throw new Error(`묶음의 실행 경로가 올바르지 않다: ${run.condition}/${run.id}`)
    const dir = `runs/${run.condition}/${run.id}`
    plan.push({ path: `${dir}/meta.json`, content: JSON.stringify(run.meta, null, 2) })
    plan.push({ path: `${dir}/trace.json`, content: JSON.stringify(run.trace, null, 2) })
    for (const [file, content] of Object.entries(run.files).sort(([a], [b]) => a.localeCompare(b))) {
      if (!isInside(file)) throw new Error(`묶음의 파일 경로가 올바르지 않다: ${dir} → ${file}`)
      plan.push({ path: `${dir}/work/${file}`, content })
    }
  }
  return plan
}
