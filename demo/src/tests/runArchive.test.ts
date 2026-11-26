import { bundleOf, docsReadOf, keepFile, restorePlan, traceOf, type ArchivedRun } from '../../../scripts/lib/runArchive'

const toolLine = ({ name, input }: { name: string; input: Record<string, unknown> }) =>
  JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } })

const RUN_DIR = '/home/someone/bench/runs/suta/login-1'

describe('traceOf — 대화 기록에서 도구 사용 순서만 남긴다', () => {
  it('도구 이름과 대상(파일·명령·스킬)을 순서대로 뽑는다', () => {
    const trace = traceOf([
      toolLine({ name: 'Skill', input: { skill: 'suta' } }),
      toolLine({ name: 'Read', input: { file_path: `${RUN_DIR}/plugin/skills/suta/references/defaults.md` } }),
      toolLine({ name: 'Write', input: { file_path: `${RUN_DIR}/work/index.html`, content: '<html>…아주 긴 내용…</html>' } }),
      toolLine({ name: 'Bash', input: { command: 'node check.mjs' } }),
    ])
    expect(trace).toEqual([
      { tool: 'Skill', target: 'suta' },
      { tool: 'Read', target: 'plugin/skills/suta/references/defaults.md' },
      { tool: 'Write', target: 'work/index.html' },
      { tool: 'Bash', target: 'node check.mjs' },
    ])
  })

  it('실행한 사람의 폴더 경로를 남기지 않는다 — 명령 안에 든 경로도', () => {
    const [step] = traceOf([toolLine({ name: 'Bash', input: { command: `node ${RUN_DIR}/plugin/skills/suta/scripts/audit.mjs ${RUN_DIR}/work` } })])
    expect(step.target).toBe('node plugin/skills/suta/scripts/audit.mjs work')
    expect(step.target).not.toContain('someone')
  })

  it('긴 명령은 200자에서 자르고, 깨진 줄·도구가 아닌 줄은 건너뛴다', () => {
    const trace = traceOf(['{깨진 줄', JSON.stringify({ type: 'result', subtype: 'success' }), toolLine({ name: 'Bash', input: { command: 'x'.repeat(500) } })])
    expect(trace).toHaveLength(1)
    expect(trace[0].target).toHaveLength(201)
    expect(trace[0].target.endsWith('…')).toBe(true)
  })

  it('대상을 알 수 없는 도구는 빈 대상으로 남긴다(호출 사실은 남는다)', () => {
    expect(traceOf([toolLine({ name: 'TodoWrite', input: { todos: [] } })])).toEqual([{ tool: 'TodoWrite', target: '' }])
  })
})

describe('docsReadOf — 스킬 문서 가운데 무엇을 읽었는가', () => {
  it('플러그인 안의 .md를 읽은 것만, 중복 없이 읽은 순서로', () => {
    const docs = docsReadOf([
      { tool: 'Read', target: 'plugin/skills/suta/SKILL.md' },
      { tool: 'Read', target: 'plugin/skills/suta/references/defaults.md' },
      { tool: 'Bash', target: 'cat plugin/skills/suta/patterns/switch/PATTERN.md plugin/skills/suta/references/defaults.md' },
      { tool: 'Write', target: 'work/notes.md' },
      { tool: 'Read', target: 'plugin/skills/suta/patterns/switch/assets/switch.css' },
    ])
    expect(docs).toEqual(['SKILL.md', 'references/defaults.md', 'patterns/switch/PATTERN.md'])
  })
})

describe('keepFile — 산출물 가운데 보존할 파일', () => {
  it('글자로 된 산출물은 남긴다', () => {
    for (const path of ['index.html', 'styles/app.css', 'app.js', 'data.json', 'icon.svg', 'NOTES.md']) expect(keepFile({ path, size: 1000 })).toBe(true)
  })

  it('의존성 폴더·숨김 폴더·그림 파일·너무 큰 파일은 뺀다', () => {
    expect(keepFile({ path: 'node_modules/x/index.js', size: 10 })).toBe(false)
    expect(keepFile({ path: '.cache/a.json', size: 10 })).toBe(false)
    expect(keepFile({ path: 'shot.png', size: 10 })).toBe(false)
    expect(keepFile({ path: 'index.html', size: 1024 * 1024 + 1 })).toBe(false)
  })
})

const RUN: ArchivedRun = {
  condition: 'suta',
  id: 'login-1',
  meta: { prompt: 'login', rep: 1, done: true },
  trace: [{ tool: 'Write', target: 'work/index.html' }],
  files: { 'index.html': '<!doctype html><title>로그인</title>', 'js/app.js': 'console.log(1)' },
}

describe('bundleOf · restorePlan — 묶었다가 풀면 측정 스크립트가 읽는 자리로 돌아온다', () => {
  it('묶음에 이름·날짜·실행을 담고, 실행은 조건·id 순서로 둔다', () => {
    const bundle = bundleOf({ name: 'fidelity-pilot', archivedAt: '2026-11-26', runs: [RUN, { ...RUN, condition: 'baseline' }, { ...RUN, id: 'cart-1' }] })
    expect(bundle.schemaVersion).toBe(1)
    expect(bundle.name).toBe('fidelity-pilot')
    expect(bundle.runs.map((r) => `${r.condition}/${r.id}`)).toEqual(['baseline/login-1', 'suta/cart-1', 'suta/login-1'])
  })

  it('풀 때 runs/<조건>/<id>/ 아래에 work/·meta.json·trace.json을 만든다', () => {
    const plan = restorePlan(bundleOf({ name: 'x', archivedAt: '2026-11-26', runs: [RUN] }))
    expect(plan.map((f) => f.path)).toEqual([
      'runs/suta/login-1/meta.json',
      'runs/suta/login-1/trace.json',
      'runs/suta/login-1/work/index.html',
      'runs/suta/login-1/work/js/app.js',
    ])
    expect(plan[2].content).toBe(RUN.files['index.html'])
    expect(JSON.parse(plan[0].content)).toEqual(RUN.meta)
  })

  it('폴더 밖으로 나가는 경로가 든 묶음은 풀지 않는다', () => {
    const escape = (run: Partial<ArchivedRun>) => () => restorePlan(bundleOf({ name: 'x', archivedAt: '2026-11-26', runs: [{ ...RUN, ...run }] }))
    expect(escape({ files: { '../../evil.html': 'x' } })).toThrow(/경로/)
    expect(escape({ files: { '/etc/passwd': 'x' } })).toThrow(/경로/)
    expect(escape({ id: '../login-1' })).toThrow(/경로/)
    expect(escape({ condition: 'a/b' })).toThrow(/경로/)
  })
})
