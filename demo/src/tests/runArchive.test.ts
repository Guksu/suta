import { bundleOf, docsReadOf, keepFile, restorePlan, skillFilesRead, traceOf, type ArchivedRun } from '../../../scripts/lib/runArchive'

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

  it('실행 폴더 자체로 옮겨 간 명령과 자식 세션의 임시 폴더 경로도 지운다(시험 실행에서 남았다)', () => {
    const root = '/home/someone/bench'
    const scratch = '/tmp/claude-0/-home-someone-bench-runs-suta-login-1-work/7e1e692e-08b7-475b-b127-be0bd20fac11/scratchpad'
    const trace = traceOf(
      [
        toolLine({ name: 'Bash', input: { command: `cd ${RUN_DIR}; node plugin/skills/suta/scripts/audit.mjs work/index.html` } }),
        toolLine({ name: 'Bash', input: { command: `S="${scratch}"; node $S/check.mjs` } }),
        toolLine({ name: 'Read', input: { file_path: `${scratch}/shot.png` } }),
        toolLine({ name: 'Bash', input: { command: `ls ${root}/notes` } }),
      ],
      { root },
    )
    expect(trace.map((step) => step.target)).toEqual([
      'cd .; node plugin/skills/suta/scripts/audit.mjs work/index.html',
      'S="scratch"; node $S/check.mjs',
      'scratch/shot.png',
      'ls <out>/notes',
    ])
    expect(JSON.stringify(trace)).not.toContain('someone')
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
  it('플러그인 안의 파일을 읽은 것만, 중복 없이 읽은 순서로', () => {
    const docs = docsReadOf([
      { tool: 'Read', target: 'plugin/skills/suta/SKILL.md' },
      { tool: 'Read', target: 'plugin/skills/suta/references/defaults.md' },
      { tool: 'Bash', target: 'cat plugin/skills/suta/patterns/switch/PATTERN.md plugin/skills/suta/references/defaults.md' },
      { tool: 'Write', target: 'work/notes.md' },
      { tool: 'Read', target: 'plugin/skills/suta/patterns/switch/assets/switch.css' },
    ])
    expect(docs).toEqual(['SKILL.md', 'references/defaults.md', 'patterns/switch/PATTERN.md', 'patterns/switch/assets/switch.css'])
  })

  it('스킬 도구로 스킬을 부르면 SKILL.md를 읽은 것이다', () => {
    expect(docsReadOf([{ tool: 'Skill', target: 'suta:suta' }, { tool: 'Skill', target: 'other' }])).toEqual(['SKILL.md'])
  })

  it('셸 변수에 스킬 폴더를 담아 읽은 문서도 센다 — 변수 이름이 기록에 남아야 한다(시험 실행에서 놓쳤다)', () => {
    const [step] = traceOf([toolLine({ name: 'Bash', input: { command: `S=${RUN_DIR}/plugin/skills/suta; sed -n '46,67p' $S/patterns/screen-kit/PATTERN.md; cat "\${S}/references/defaults.md"` } })])
    expect(step.target.startsWith('S=plugin/skills/suta;')).toBe(true)
    expect(docsReadOf([step])).toEqual(['patterns/screen-kit/PATTERN.md', 'references/defaults.md'])
  })

  it('문서가 아닌 스킬 파일(CSS·코드)도 읽은 것으로 센다', () => {
    const docs = docsReadOf([
      { tool: 'Bash', target: 'S=plugin/skills/suta; cat $S/patterns/screen-kit/assets/screen-kit.css $S/patterns/screen-kit/assets/slotRange.ts' },
      { tool: 'Read', target: 'plugin/skills/suta/patterns/switch/assets/switch.css' },
    ])
    expect(docs).toEqual(['patterns/screen-kit/assets/screen-kit.css', 'patterns/screen-kit/assets/slotRange.ts', 'patterns/switch/assets/switch.css'])
  })

  it('크기만 세거나(wc)·목록만 보거나(ls)·검사를 돌린 것(node)은 읽은 것이 아니고, 별표가 든 경로는 세지 않는다', () => {
    const docs = docsReadOf([
      { tool: 'Bash', target: 'S=plugin/skills/suta; wc -c $S/references/*.md $S/references/design.md; ls $S/patterns/screen-kit; node $S/scripts/audit.mjs work/index.html; grep -n "상세" $S/references/checklist.md | head' },
    ])
    expect(docs).toEqual(['references/checklist.md'])
  })

  it('스킬 폴더로 옮겨 간 뒤 상대 경로로 읽은 문서도 센다', () => {
    const docs = docsReadOf([
      { tool: 'Bash', target: 'cd plugin/skills/suta/patterns; wc -c sticky-header/PATTERN.md toast-stack/PATTERN.md; cat sticky-header/PATTERN.md toast-stack/PATTERN.md' },
      { tool: 'Bash', target: 'cd plugin/skills/suta && cat references/detail.md' },
    ])
    expect(docs).toEqual(['patterns/sticky-header/PATTERN.md', 'patterns/toast-stack/PATTERN.md', 'references/detail.md'])
  })
})

describe('skillFilesRead — 줄이지 않은 명령에서 센다', () => {
  it('200자를 넘는 명령의 뒤쪽에서 읽은 파일도 센다(줄인 기록으로는 빠진다)', () => {
    const lines = [toolLine({ name: 'Bash', input: { command: `S=${RUN_DIR}/plugin/skills/suta; cat $S/references/defaults.md; echo ${'x'.repeat(220)}; cat $S/patterns/screen-kit/PATTERN.md` } })]
    expect(docsReadOf(traceOf(lines))).toEqual(['references/defaults.md'])
    expect(skillFilesRead(lines)).toEqual(['references/defaults.md', 'patterns/screen-kit/PATTERN.md'])
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
