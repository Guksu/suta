import { auditAll, isAuditTarget } from '../../../skills/suta/scripts/auditAll'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { USABILITY_WARN_RULES, changedLines, editedFiles, hookResponse } from '../../../skills/suta/scripts/hookCore'

const finding = ({ severity, line = 1 }: { severity: 'error' | 'warn'; line?: number }) => ({
  file: 'src/menu.css',
  line,
  rule: severity === 'error' ? 'tiny-text' : 'spacing-off-scale',
  severity,
  message: severity === 'error' ? '글자 10px — 읽히지 않는다(하한 12px)' : '4px 격자 밖 간격 1곳(3줄)',
  fix: '고치는 법',
})

describe('hookCore — 고친 파일 찾기', () => {
  it('Claude Code의 Write·Edit·MultiEdit는 tool_input.file_path다', () => {
    expect(editedFiles({ input: { tool_name: 'Edit', tool_input: { file_path: '/repo/src/menu.css' } }, cwd: '/repo' })).toEqual(['/repo/src/menu.css'])
    expect(editedFiles({ input: { tool_name: 'Write', tool_input: { file_path: 'src/App.tsx' } }, cwd: '/repo' })).toEqual(['/repo/src/App.tsx'])
  })

  it('Codex의 apply_patch는 패치 본문의 Add·Update·Move 줄을 cwd 기준으로 읽고, Delete는 뺀다', () => {
    const patch = [
      '*** Begin Patch',
      '*** Add File: src/new.css',
      '+.a { color: red; }',
      '*** Update File: src/App.tsx',
      '@@',
      '-old',
      '+new',
      '*** Update File: src/old-name.css',
      '*** Move to: src/new-name.css',
      '*** Delete File: src/gone.css',
      '*** End Patch',
    ].join('\n')
    const input = { tool_name: 'apply_patch', cwd: '/work/app', tool_input: { command: patch } }
    expect(editedFiles({ input, cwd: '/elsewhere' })).toEqual(['/work/app/src/new.css', '/work/app/src/App.tsx', '/work/app/src/old-name.css', '/work/app/src/new-name.css'])
  })

  it('입력에 파일이 없으면 빈 목록이다', () => {
    expect(editedFiles({ input: { tool_name: 'Bash', tool_input: { command: 'npm test' } }, cwd: '/repo' })).toEqual([])
    expect(editedFiles({ input: {}, cwd: '/repo' })).toEqual([])
  })
})

describe('hookCore — 훅 응답', () => {
  it('error가 있으면 종료 코드 2와 stderr — 고치는 법과 예외 주석 안내를 담는다', () => {
    const response = hookResponse({ findings: [finding({ severity: 'error' }), finding({ severity: 'warn', line: 3 })] })
    expect(response.exitCode).toBe(2)
    expect(response.stdout).toBe('')
    expect(response.stderr).toContain('src/menu.css:1 [error] tiny-text')
    expect(response.stderr).toContain('고치는 법')
    expect(response.stderr).toContain('layout-audit-ignore')
    expect(response.stderr).toContain('spacing-off-scale')
  })

  it('warn만 있으면 종료 코드 0과 additionalContext JSON — 최대 5줄로 줄인다', () => {
    const findings = Array.from({ length: 7 }, (_, i) => finding({ severity: 'warn', line: i + 1 }))
    const response = hookResponse({ findings })
    expect(response.exitCode).toBe(0)
    expect(response.stderr).toBe('')
    const output = JSON.parse(response.stdout)
    expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    const context: string = output.hookSpecificOutput.additionalContext
    expect(context).toContain('warn 7건')
    expect(context.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(5)
    expect(context).toContain('외 2건')
  })

  it('warn 중 사용 문제(입력칸 확대 등)는 [사용 문제]로 앞에 두고, 취향 warn은 프로젝트 체계의 값이면 그대로 두라고 알린다', () => {
    const taste = finding({ severity: 'warn', line: 1 })
    const usability = { ...finding({ severity: 'warn', line: 2 }), rule: 'input-zoom', message: '입력칸 글자 14px' }
    const context: string = JSON.parse(hookResponse({ findings: [taste, usability] }).stdout).hookSpecificOutput.additionalContext
    const lines = context.split('\n').filter((line) => line.startsWith('- '))
    expect(lines[0]).toBe('- [사용 문제] src/menu.css:2 input-zoom — 입력칸 글자 14px')
    expect(lines[1]).toBe('- src/menu.css:1 spacing-off-scale — 4px 격자 밖 간격 1곳(3줄)')
    expect(context).toContain('프로젝트 디자인 체계의 값이면 그대로 둔다')
  })

  it('사용 문제 warn 목록의 이름은 모두 실제 검사 규칙이다 — 오타가 나면 그 warn이 취향으로 분류된다', () => {
    const sources = ['layout-audit/assets/auditLayout.ts', 'motion-audit/assets/auditMotion.ts']
      .map((file) => readFileSync(resolve(process.cwd(), '../skills/suta/patterns', file), 'utf8'))
      .join('\n')
    for (const rule of USABILITY_WARN_RULES) expect(sources, rule).toContain(`'${rule}'`)
  })

  it('error와 함께 오는 warn도 같은 구분으로 알린다', () => {
    const usability = { ...finding({ severity: 'warn', line: 2 }), rule: 'accent-contrast', message: '대비 3.9:1' }
    const response = hookResponse({ findings: [finding({ severity: 'error' }), usability] })
    expect(response.stderr).toContain('- [사용 문제] src/menu.css:2 accent-contrast')
  })

  it('문제가 없으면 아무것도 출력하지 않는다', () => {
    expect(hookResponse({ findings: [] })).toEqual({ exitCode: 0, stdout: '', stderr: '' })
  })
})

describe('hookCore — 이번 편집이 바꾼 줄', () => {
  const text = ['.a {', '  color: blue;', '  padding: 8px;', '}', '.b {', '  font-size: 10px;', '}'].join('\n')

  it('Claude Code는 tool_response.structuredPatch의 + 줄을 새 파일 줄 번호로 바꾼다 — 새로 만든 파일은 null(전체)', () => {
    const edit = {
      tool_name: 'Edit',
      tool_input: { file_path: '/p/a.css' },
      tool_response: { structuredPatch: [{ oldStart: 1, oldLines: 3, newStart: 1, newLines: 4, lines: [' .a {', '-  color: red;', '+  color: blue;', '+  padding: 8px;', ' }'] }] },
    }
    expect([...(changedLines({ input: edit, file: '/p/a.css', text }) ?? [])]).toEqual([2, 3])
    const created = { tool_name: 'Write', tool_input: { file_path: '/p/a.css' }, tool_response: { type: 'create', structuredPatch: [] } }
    expect(changedLines({ input: created, file: '/p/a.css', text })).toBeNull()
  })

  it('Codex apply_patch는 그 파일 구간의 + 줄을 새 파일에서 찾고, Add File은 null(전체)이다', () => {
    const patch = ['*** Begin Patch', '*** Update File: src/a.css', '@@ .b {', '-  font-size: 14px;', '+  font-size: 10px;', '*** Add File: src/new.css', '+.c { color: red; }', '*** End Patch'].join('\n')
    const input = { tool_name: 'apply_patch', cwd: '/w', tool_input: { command: patch } }
    expect([...(changedLines({ input, file: '/w/src/a.css', text }) ?? [])]).toEqual([6])
    expect(changedLines({ input, file: '/w/src/new.css', text: '.c { color: red; }' })).toBeNull()
  })

  it('응답이 없는 Edit은 new_string 위치로 찾는다', () => {
    const input = { tool_name: 'Edit', tool_input: { file_path: '/p/a.css', old_string: 'x', new_string: '  padding: 8px;\n}' } }
    expect([...(changedLines({ input, file: '/p/a.css', text }) ?? [])]).toEqual([3, 4])
  })

  it('이번 편집이 건드리지 않은 기존 error는 막지 않고, 건드린 줄의 error와 관여 줄이 겹치는 요약 warn만 알린다', () => {
    const old = { ...finding({ severity: 'error', line: 6 }), file: 'a.css' }
    const touchedWarn = { ...finding({ severity: 'warn', line: 9 }), file: 'a.css', lines: [3, 9] }
    const untouchedWarn = { ...finding({ severity: 'warn', line: 8 }), file: 'a.css', lines: [8] }
    const changed = new Map([['a.css', new Set([2, 3])]])
    const quiet = hookResponse({ findings: [old, untouchedWarn], changed })
    expect(quiet).toEqual({ exitCode: 0, stdout: '', stderr: '' })
    const noted = hookResponse({ findings: [old, touchedWarn], changed })
    expect(noted.exitCode).toBe(0)
    const context: string = JSON.parse(noted.stdout).hookSpecificOutput.additionalContext
    expect(context).toContain('warn 1건')
    expect(context).toContain('기존 error 1건')
    const blocked = hookResponse({ findings: [old, { ...old, line: 2 }], changed })
    expect(blocked.exitCode).toBe(2)
    expect(blocked.stderr).toContain('a.css:2 [error]')
    expect(blocked.stderr).not.toContain('a.css:6 [error]')
    expect(hookResponse({ findings: [old], changed: new Map([['a.css', null]]) }).exitCode).toBe(2)
  })
})

describe('auditAll — 모션 + 레이아웃 통합 검사', () => {
  it('두 검사의 결과를 한 목록으로 합쳐 줄 순서로 돌려준다', () => {
    const text = `.a {\n  font-size: 10px;\n  transition: height 300ms ease;\n}`
    const findings = auditAll([{ file: 'a.css', text }])
    expect(findings.map((f) => `${f.line}:${f.rule}`)).toEqual(['2:tiny-text', '3:no-reduced-motion', '3:layout-animation'])
  })

  it('검사 대상 — 스타일·마크업·스크립트 파일만, 의존성·빌드 폴더와 테스트·타입 선언·압축 파일은 뺀다', () => {
    expect(['src/a.css', 'src/A.tsx', 'src/a.vue', 'src/a.ts', 'index.html'].every(isAuditTarget)).toBe(true)
    expect(['README.md', 'node_modules/x/a.css', 'dist/a.css', 'src/A.test.tsx', 'src/a.spec.ts', 'src/types.d.ts', 'src/a.min.css'].some(isAuditTarget)).toBe(false)
  })
})
