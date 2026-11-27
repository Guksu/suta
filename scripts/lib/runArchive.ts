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
  const cleaned = text
    .replace(/[^\s"']*-runs-[^/\s"']+-work\/[0-9a-f-]{36}(?:\/scratchpad)?/g, 'scratch')
    .replace(/[^\s"']*\/runs\/[^/\s]+\/[^/\s]+\/(plugin|work)/g, '$1')
    .replace(/[^\s"']*\/runs\/[^/\s"';]+\/[^/\s"';]+/g, '.')
  return root ? cleaned.replace(new RegExp(escapeRe(root.replace(/\/+$/, '')), 'g'), '<out>') : cleaned
}

const targetOf = ({ input, root }: { input: Record<string, unknown>; root?: string }) => {
  const raw = [input.file_path, input.path, input.command, input.skill, input.pattern, input.url].find((v) => typeof v === 'string' && v.length > 0)
  if (typeof raw !== 'string') return ''
  const text = withoutRunDir({ text: raw.trim(), root })
  return text.length > TARGET_MAX ? `${text.slice(0, TARGET_MAX)}…` : text
}

/** stream-json 줄들 → 도구 사용 순서. 내용(쓴 파일 본문 등)은 버리고 무엇을 대상으로 했는지만 남긴다 */
export const traceOf = (lines: string[], { root }: { root?: string } = {}): TraceStep[] => {
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
      steps.push({ tool: block.name, target: targetOf({ input: block.input ?? {}, root }) })
    }
  }
  return steps
}

/**
 * 스킬 문서(.md) 가운데 읽은 것 — 스킬 폴더 기준 경로, 처음 읽은 순서. 쓰기·고치기는 읽은 것이 아니다.
 * 시험 실행에서 본 읽는 길 세 가지를 센다: 스킬 도구로 부름(SKILL.md가 대화에 실린다), 전체 경로로 읽음,
 * 스킬 폴더로 옮겨 간(cd) 뒤 상대 경로로 읽음
 */
export const docsReadOf = (trace: TraceStep[]): string[] => {
  const docs: string[] = []
  const add = (doc: string) => {
    if (!docs.includes(doc)) docs.push(doc)
  }
  for (const step of trace) {
    if (step.tool === 'Write' || step.tool === 'Edit') continue
    if (step.tool === 'Skill') {
      if (/(^|:)suta$/.test(step.target)) add('SKILL.md')
      continue
    }
    for (const match of step.target.matchAll(/plugin\/skills\/suta\/([^\s"';]+?\.md)/g)) add(match[1])
    const moved = step.target.match(/\bcd\s+["']?[^\s"';&]*plugin\/skills\/suta((?:\/[^\s"';&/]+)*)\/?["']?/)
    if (!moved) continue
    const base = moved[1].replace(/^\//, '')
    const rest = step.target.slice((moved.index ?? 0) + moved[0].length)
    for (const match of rest.matchAll(/(?<![\w/.-])([\w.-]+(?:\/[\w.-]+)*\.md)\b/g)) {
      if (!match[1].startsWith('plugin/')) add(base ? `${base}/${match[1]}` : match[1])
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
