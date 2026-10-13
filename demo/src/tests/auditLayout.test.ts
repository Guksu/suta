import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { auditLayout, formatFindings, summarize } from '@skills/layout-audit/assets/auditLayout'

type Findings = ReturnType<typeof auditLayout>
const rules = (findings: Findings) => findings.map((f) => f.rule)
const audit = (file: string, text: string) => auditLayout([{ file, text }])

describe('auditLayout — 글자 크기 하한 (tiny-text)', () => {
  it('11px 미만은 error, 11px대는 warn, 12px 이상과 0은 조용하다', () => {
    const text = `.a { font-size: 10px; }\n.b { font-size: 11px; }\n.c { font-size: 0.75rem; }\n.d { font-size: 0; }\n.e { font: 600 0.6rem/1.4 sans-serif; }`
    const findings = audit('a.css', text)
    expect(findings.map((f) => [f.rule, f.severity, f.line])).toEqual([
      ['tiny-text', 'error', 1],
      ['tiny-text', 'warn', 2],
      ['tiny-text', 'error', 5],
    ])
    expect(findings[0].fix).toContain('12px')
  })

  it('Tailwind 임의값과 JSX 인라인 스타일의 작은 글자도 잡는다', () => {
    const text = `export const Badge = () => (\n  <div>\n    <span className="text-[10px] font-bold">NEW</span>\n    <span style={{ fontSize: 9 }}>!</span>\n    <span className="text-xs">ok</span>\n  </div>\n)`
    const findings = audit('Badge.tsx', text)
    expect(findings.filter((f) => f.rule === 'tiny-text').map((f) => [f.line, f.severity])).toEqual([
      [3, 'error'],
      [4, 'error'],
    ])
  })
})

describe('auditLayout — 실제 사이트 CSS에서 확인한 글자 크기 오판', () => {
  it('아이콘 글꼴 선택자의 작은 font-size는 글자가 아니라 아이콘 크기라 세지 않는다', () => {
    const css = ['.icon-close { font-size: 10px; }', '.w-icon-file-upload-remove { font-size: 10px; }', 'i.fa { font-size: 9px; }', '.material-symbols-outlined { font-size: 10px; }', '.caption { font-size: 10px; }'].join('\n')
    expect(audit('a.css', css).filter((f) => f.rule === 'tiny-text').map((f) => f.line)).toEqual([5])
  })

  it('html 기준 크기(62.5% 등)를 바꾼 묶음은 rem을 그 기준으로 환산한다', () => {
    const css = ['html { font-size: 62.5%; }', '.a { font-size: 1.2rem; }', '.b { font-size: 0.9rem; }', '.c { padding: 0.6rem; }'].join('\n')
    const findings = audit('a.css', css)
    expect(findings.filter((f) => f.rule === 'tiny-text').map((f) => `${f.line}:${f.severity}`)).toEqual(['3:error'])
    expect(findings.find((f) => f.rule === 'spacing-off-scale')?.lines).toEqual([4])
    expect(audit('b.css', '.b { font-size: 0.9rem; }')).toEqual([])
  })
})

describe('auditLayout — 상자 안 상자 (nested-card)', () => {
  it('JSX에서 둥근 모서리 + 테두리·그림자·배경을 가진 요소 안의 같은 요소를 잡는다', () => {
    const text = [
      'export const Order = () => (',
      '  <div className="rounded-xl border bg-white p-4 shadow-sm">',
      '    <h2 className="text-lg font-semibold">주문</h2>',
      '    <div className="rounded-lg bg-gray-50 p-3">잔치국수</div>',
      '    <input className="rounded-lg border px-3" />',
      '    <button className="rounded-lg bg-black text-white">담기</button>',
      '  </div>',
      ')',
    ].join('\n')
    const findings = audit('Order.tsx', text).filter((f) => f.rule === 'nested-card')
    expect(findings.map((f) => f.line)).toEqual([4])
    expect(findings[0].severity).toBe('warn')
    expect(findings[0].message).toContain('2')
  })

  it('Card 컴포넌트 중첩과, 같은 묶음의 CSS가 상자로 정의한 클래스의 중첩도 잡는다', () => {
    const tsx = `const A = () => (\n  <Card>\n    <MenuCard name="비빔국수" />\n  </Card>\n)`
    expect(rules(audit('A.tsx', tsx))).toContain('nested-card')

    const css = `.order { border: 1px solid #ddd; border-radius: 12px; }\n.price { background: #f5f5f5; border-radius: 8px; }`
    const markup = `const B = () => (\n  <section className="order">\n    <p className="price">8,000원</p>\n  </section>\n)`
    const findings = auditLayout([
      { file: 'order.css', text: css },
      { file: 'B.tsx', text: markup },
    ])
    expect(findings.filter((f) => f.rule === 'nested-card').map((f) => `${f.file}:${f.line}`)).toEqual(['B.tsx:3'])
  })

  it('CSS의 자손 선택자와 SCSS 중첩으로 상자 안 상자를 잡고, 알약·원·입력칸은 빼다', () => {
    const css = [
      '.card { border-radius: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }',
      '.card .inner { background: #f5f5f5; border-radius: 8px; }',
      '.card .badge { background: #eee; border-radius: 999px; }',
      '.card input { border: 1px solid #ccc; border-radius: 8px; }',
    ].join('\n')
    expect(audit('a.css', css).filter((f) => f.rule === 'nested-card').map((f) => f.line)).toEqual([2])

    const scss = `.panel {\n  border: 1px solid #ddd;\n  border-radius: 12px;\n  .row {\n    background: #fafafa;\n    border-radius: 8px;\n  }\n}`
    expect(audit('a.scss', scss).filter((f) => f.rule === 'nested-card').map((f) => f.line)).toEqual([4])
  })

  it('컨트롤의 부속(thumb·track)은 상자로 보지 않고, calc()로 계산한 반경은 종류로 세지 않는다', () => {
    const css = [
      '.segmented { background: #eee; border-radius: 12px; }',
      '.segmented .segment-thumb { background: #fff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }',
      '.a { border-radius: 4px; }',
      '.b { border-radius: calc(var(--r, 12px) - 4px); }',
      '.c { border-radius: var(--r, 12px) var(--r, 12px) 0 0; }',
    ].join('\n')
    expect(rules(audit('a.css', css))).toEqual([])
  })

  it('형제 상자와 한 겹 카드는 조용하다', () => {
    const text = `const L = () => (\n  <ul className="flex flex-col gap-4">\n    <li className="rounded-xl border p-4">하나</li>\n    <li className="rounded-xl border p-4">둘</li>\n  </ul>\n)`
    expect(rules(audit('L.tsx', text))).not.toContain('nested-card')
  })
})

describe('auditLayout — 강조와 효과 (effect-overuse·gradient-text)', () => {
  it('한 파일에 색 그라데이션·backdrop-filter·큰 그림자가 3곳 이상이면 한 번 warn', () => {
    const text = [
      '.hero { background: linear-gradient(135deg, #8b5cf6, #ec4899); }',
      '.nav { backdrop-filter: blur(12px); }',
      '.cta { box-shadow: 0 0 24px rgba(236, 72, 153, 0.5); }',
      '.card { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }',
    ].join('\n')
    const findings = audit('a.css', text).filter((f) => f.rule === 'effect-overuse')
    expect(findings).toHaveLength(1)
    expect(findings[0].line).toBe(1)
    expect(findings[0].message).toContain('3')
  })

  it('사진 위 글자를 받치는 검은 스크림과 스켈레톤 반짝임은 효과로 세지 않는다', () => {
    const text = [
      '.scrim { background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent); }',
      '.shimmer { background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent); }',
      '.nav { backdrop-filter: blur(12px); }',
      '.cta { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }',
    ].join('\n')
    expect(rules(audit('a.css', text))).not.toContain('effect-overuse')
  })

  it('효과가 0인 시작 상태(blur(0)·완전히 투명한 그림자)는 세지 않는다 — 스크롤하면 유리가 되는 막대는 효과 한 곳이다', () => {
    const text = [
      '.bar {',
      '  box-shadow: 0 8px 32px rgba(0, 0, 0, 0);',
      '  -webkit-backdrop-filter: blur(0);',
      '  backdrop-filter: blur(0px);',
      '}',
      '.bar[data-elevated] {',
      '  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 8px 32px rgba(0, 0, 0, 0.18);',
      '  backdrop-filter: blur(16px) saturate(160%);',
      '}',
      '.ghost { box-shadow: 0 12px 40px transparent; }',
    ].join('\n')
    expect(rules(audit('a.css', text))).not.toContain('effect-overuse')
  })

  it('효과가 0이 아닌 같은 모양은 그대로 센다', () => {
    const text = [
      '.a { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); }',
      '.b { backdrop-filter: blur(4px); }',
      '.c { box-shadow: 0 12px 40px rgb(0 0 0 / 0.3); }',
    ].join('\n')
    expect(rules(audit('a.css', text))).toContain('effect-overuse')
  })

  it('Tailwind 클래스의 효과도 세고, 그라데이션 글자는 따로 warn', () => {
    const text = `const H = () => (\n  <div className="bg-gradient-to-r from-purple-500 to-pink-500 shadow-2xl">\n    <h1 className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">국수</h1>\n    <nav className="backdrop-blur-md" />\n  </div>\n)`
    const found = rules(audit('H.tsx', text))
    expect(found).toContain('effect-overuse')
    expect(found).toContain('gradient-text')
    expect(audit('a.css', '.t { -webkit-background-clip: text; background-clip: text; }').filter((f) => f.rule === 'gradient-text')).toHaveLength(1)
  })
})

describe('auditLayout — 규격 (font-size·font-weight·radius 종류, spacing 척도)', () => {
  it('글자 크기 7종 이상, 굵기 4종 이상, 반경 4종 이상(0·50%·알약 제외)이면 파일마다 한 번 warn', () => {
    const sizes = [12, 13, 14, 15, 16, 18, 20].map((px, i) => `.s${i} { font-size: ${px}px; }`)
    const weights = [400, 500, 600, 700].map((w, i) => `.w${i} { font-weight: ${w}; }`)
    const radii = ['4px', '8px', '12px', '16px', '50%', '999px', '0'].map((r, i) => `.r${i} { border-radius: ${r}; }`)
    const found = rules(audit('a.css', [...sizes, ...weights, ...radii].join('\n')))
    expect(found.filter((r) => r === 'font-size-variety')).toHaveLength(1)
    expect(found.filter((r) => r === 'font-weight-variety')).toHaveLength(1)
    expect(found.filter((r) => r === 'radius-variety')).toHaveLength(1)

    const fewer = rules(audit('b.css', [...sizes.slice(0, 6), ...weights.slice(0, 3), ...radii.slice(1)].join('\n')))
    expect(fewer).not.toContain('font-size-variety')
    expect(fewer).not.toContain('font-weight-variety')
    expect(fewer).not.toContain('radius-variety')
  })

  it('4px 격자 밖 간격은 파일마다 한 번 요약하고 가까운 척도를 제안한다', () => {
    const text = `.a { padding: 10px 16px; margin: 0 auto; }\n.b { gap: 0.35rem; }\n.c { padding: 1px 2px; margin: -4px; gap: var(--space-2); }`
    const findings = audit('a.css', text).filter((f) => f.rule === 'spacing-off-scale')
    expect(findings).toHaveLength(1)
    expect(findings[0].line).toBe(1)
    expect(findings[0].message).toContain('2곳')
    expect(findings[0].fix).toContain('10px → 8px')
    expect(rules(audit('ok.css', '.a { padding: 12px 16px; gap: 0.5rem; margin: 0 auto; }'))).toEqual([])
  })

  it('파일 단위 요약 지적은 관여한 줄 전체를 lines로 준다', () => {
    const text = `.a { padding: 10px; }\n.b { color: red; }\n.c { gap: 6px; }`
    expect(audit('a.css', text).find((f) => f.rule === 'spacing-off-scale')?.lines).toEqual([1, 3])
    const sizes = [12, 13, 14, 15, 16, 18, 20].map((px, i) => `.s${i} { font-size: ${px}px; }`).join('\n')
    expect(audit('b.css', sizes).find((f) => f.rule === 'font-size-variety')?.lines).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('Tailwind 간격의 반 단계(1.5·2.5)와 임의값도 척도 밖으로 센다', () => {
    const text = `const C = () => <div className="px-2.5 py-0.5 gap-1.5 mt-[13px] p-4">국수</div>`
    expect(audit('C.tsx', text).find((f) => f.rule === 'spacing-off-scale')?.message).toContain('3곳')
  })
})

describe('auditLayout — 정렬과 사진 (centered-text-block·image-distort)', () => {
  it('가운데 정렬 안의 긴 문단을 잡고, 짧은 한 줄은 그대로 둔다', () => {
    const long = '멸치와 다시마로 여섯 시간 우린 국물에 손으로 뽑은 중면을 말았습니다. 고명은 그날 들어온 애호박과 달걀지단만 올립니다.'
    const text = `const I = () => (\n  <div className="text-center">\n    <h1>국수집</h1>\n    <p>${long}</p>\n    <p>오늘 휴무</p>\n  </div>\n)`
    expect(audit('I.tsx', text).filter((f) => f.rule === 'centered-text-block').map((f) => f.line)).toEqual([4])
    const dynamic = `const E = ({ message }: { message: string }) => (\n  <div className="text-center">\n    <p>{message}</p>\n  </div>\n)`
    expect(rules(audit('E.tsx', dynamic))).not.toContain('centered-text-block')
    expect(audit('a.css', '.intro-desc { text-align: center; }\n.empty-title { text-align: center; }').filter((f) => f.rule === 'centered-text-block').map((f) => f.line)).toEqual([1])
  })

  it('object-fit: fill과 object-fill은 사진을 늘인다', () => {
    expect(rules(audit('a.css', 'img.thumb { width: 100%; height: 120px; object-fit: fill; }'))).toEqual(['image-distort'])
    expect(rules(audit('P.tsx', 'const P = () => <img className="object-fill h-32 w-full" src="a.jpg" alt="" />'))).toEqual(['image-distort'])
  })
})

describe('auditLayout — 예외 주석과 파일 종류', () => {
  it('layout-audit-ignore는 그 줄과 다음 줄을, layout-audit-ignore-file은 파일 전체의 그 규칙을 건너뛴다', () => {
    const text = `/* layout-audit-ignore: tiny-text — 차트 축 눈금 */\n.axis { font-size: 10px; }\n.note { font-size: 10px; }`
    expect(audit('a.css', text).map((f) => f.line)).toEqual([3])
    const fileWide = `/* layout-audit-ignore-file: effect-overuse — 유리 효과가 이 패턴의 목적 */\n.base { color: red; }\n.a { backdrop-filter: blur(8px); }\n.b { backdrop-filter: blur(8px); }\n.c { backdrop-filter: blur(8px); }`
    expect(rules(audit('glass.css', fileWide))).toEqual([])
  })

  it('Vue·Svelte·HTML은 style 블록을 CSS로, 나머지를 마크업으로 검사하고 줄 번호를 지킨다', () => {
    const vue = `<template>\n  <div class="rounded-xl border">\n    <div class="rounded-lg bg-gray-50">안</div>\n  </div>\n</template>\n<style scoped>\n.t { font-size: 9px; }\n</style>`
    expect(audit('A.vue', vue).map((f) => `${f.rule}:${f.line}`)).toEqual(['nested-card:3', 'tiny-text:7'])
    const html = `<!doctype html>\n<p style="font-size: 10px">작은 글자</p>`
    expect(audit('a.html', html).map((f) => `${f.rule}:${f.line}`)).toEqual(['tiny-text:2'])
  })

  it('TSX 안의 여러 줄 템플릿 문자열(예시 코드·HTML 문자열)은 마크업으로 읽지 않고, 한 줄 className 템플릿은 읽는다', () => {
    const text = [
      'const SAMPLE = `<div className="rounded-xl border">',
      '  <span className="text-[9px]">작은 글자</span>',
      '</div>`',
      'export const A = ({ on }: { on: boolean }) => <p className={`text-[10px] ${on ? "font-bold" : ""}`}>{SAMPLE}</p>',
    ].join('\n')
    expect(audit('A.tsx', text).map((f) => `${f.rule}:${f.line}`)).toEqual(['tiny-text:4'])
  })

  it('ts·js 파일과 주석 속 값은 검사하지 않는다', () => {
    expect(audit('util.ts', 'const css = ".a { font-size: 8px }"')).toEqual([])
    expect(audit('a.css', '/* font-size: 8px; object-fit: fill; */\n.a { color: red; }')).toEqual([])
  })

  it('요약과 file:line 형식 출력은 motion-audit와 같다', () => {
    const findings = audit('a.css', '.a { font-size: 10px; object-fit: fill; }')
    expect(summarize(findings)).toEqual({ errors: 1, warnings: 1 })
    expect(formatFindings(findings)).toContain('a.css:1 [error] tiny-text')
  })
})

describe('auditLayout — 옅은 색 면 (tinted-surface)', () => {
  it('연노랑·살구·연파랑 같은 옅은 유채색 바탕을 파일마다 한 번 요약해 잡는다', () => {
    const css = [
      ':root {',
      '  --pointer-bg: #fcf1dc;',
      '  --surface: #ffffff;',
      '  --canvas: #f2f3f5;',
      '}',
      '.badge { background: #fff4dc; color: #9a6100; }',
      '.notice { background-color: rgb(235, 240, 252); }',
      '.danger { background: rgba(204, 61, 42, 0.08); }',
      '.button { background: #1b1e24; color: #fff; }',
    ].join('\n')
    const findings = audit('a.css', css).filter((f) => f.rule === 'tinted-surface')
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('warn')
    expect(findings[0].lines).toEqual([2, 6, 7, 8])
    expect(findings[0].fix).toContain('--color-canvas')
  })

  it('Tailwind의 옅은 색 바탕(bg-amber-50 등)도 잡고, 회색 계열과 진한 색은 조용하다', () => {
    const text = [
      'export const Row = () => (',
      '  <div className="bg-gray-50">',
      '    <span className="rounded-full bg-amber-100 text-amber-700">주의</span>',
      '    <span className="bg-emerald-50">완료</span>',
      '    <button className="bg-zinc-900 text-white">담기</button>',
      '  </div>',
      ')',
    ].join('\n')
    expect(audit('Row.tsx', text).find((f) => f.rule === 'tinted-surface')?.lines).toEqual([3, 4])
  })

  it('suta 토큰 파일(무채색 + 강조색 거의 검정 + 오류 빨강 + 등락 색 짝)은 조용하다', () => {
    const tokens = readFileSync(resolve(process.cwd(), '../skills/suta/patterns/layout-principles/assets/layout-tokens.css'), 'utf8')
    expect(audit('layout-tokens.css', tokens).filter((f) => f.rule === 'tinted-surface' || f.rule === 'hue-count')).toEqual([])
  })
})

describe('auditLayout — 유채색 계열 수 (hue-count)', () => {
  it('한 파일에 유채색 계열이 셋 이상이면 계열과 줄을 모아 한 번 알린다', () => {
    const css = [
      ':root {',
      '  --brand: #f2b544;',
      '  --danger: #cc3d2a;',
      '  --ok: #23854a;',
      '  --info: #3a62cf;',
      '  --text: #1b1c20;',
      '}',
    ].join('\n')
    const findings = audit('a.css', css).filter((f) => f.rule === 'hue-count')
    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain('4')
    expect(findings[0].lines).toEqual([2, 3, 4, 5])
  })

  it('강조색 하나 + 오류 빨강, 다크 모드의 같은 계열 값은 둘로 센다', () => {
    const css = [':root { --accent: #8a4b1f; --danger: #c8341f; --text: #1b1e24; }', '@media (prefers-color-scheme: dark) { :root { --accent: #d9a27a; --danger: #f2796b; } }'].join('\n')
    expect(audit('a.css', css).filter((f) => f.rule === 'hue-count')).toEqual([])
  })

  it('예외 주석을 단 줄(로고 그림의 브랜드색 등)은 계열 수에서도 빠진다', () => {
    const css = [
      ':root {',
      '  --danger: #cc3d2a;',
      '  --logo-mark: #f2b544; /* layout-audit-ignore: hue-count — 로고 그림의 브랜드색 */',
      '  --logo-wave: #fff4dc; /* layout-audit-ignore: hue-count — 로고 그림의 브랜드색 */',
      '  --link: #3a62cf;',
      '}',
    ].join('\n')
    expect(audit('a.css', css).filter((f) => f.rule === 'hue-count' || f.rule === 'tinted-surface')).toEqual([])
  })

  it('등락 색 짝(이름에 rise·fall·up·down)은 시세의 의미 색이라 강조색 + 오류 빨강과 따로 센다', () => {
    const css = [
      ':root {',
      '  --color-accent: #1f6b4f;',
      '  --color-danger: #c8341f;',
      '  --color-rise: #d0262d;',
      '  --color-fall: #1b64da;',
      '  --price-up: #d0262d;',
      '  --price-down: #1b64da;',
      '}',
      '.change.up { color: var(--color-rise); }',
    ].join('\n')
    expect(audit('a.css', css).filter((f) => f.rule === 'hue-count')).toEqual([])
  })

  it('보상 색(이름에 reward·gold·silver·bronze·medal·coin)은 메달·코인 그림의 색이라 강조색 + 오류 빨강과 따로 센다', () => {
    const css = [
      ':root {',
      '  --color-accent: #1f6b4f;',
      '  --color-danger: #c8341f;',
      '  --color-reward: #b07d00;',
      '  --color-reward-silver: #7b8088;',
      '  --color-reward-bronze: #a8662b;',
      '  --medal-gold: #b07d00;',
      '  --coin: #b07d00;',
      '}',
      '.badge.earned .medal { fill: var(--color-reward); }',
    ].join('\n')
    expect(audit('a.css', css).filter((f) => f.rule === 'hue-count')).toEqual([])
  })

  it('보상 변수 밖에 직접 쓴 금색은 그대로 계열로 센다', () => {
    const css = [':root {', '  --color-accent: #1f6b4f;', '  --color-danger: #c8341f;', '  --color-reward: #b07d00;', '}', '.badge { color: #b07d00; }'].join('\n')
    const findings = audit('a.css', css).filter((f) => f.rule === 'hue-count')
    expect(findings).toHaveLength(1)
    expect(findings[0].lines).toEqual([2, 3, 6])
  })

  it('등락 이름이 아닌 변수의 파랑은 그대로 계열로 센다', () => {
    const css = [':root {', '  --color-accent: #1f6b4f;', '  --color-danger: #c8341f;', '  --color-rise: #d0262d;', '  --link: #1b64da;', '}'].join('\n')
    const findings = audit('a.css', css).filter((f) => f.rule === 'hue-count')
    expect(findings).toHaveLength(1)
    expect(findings[0].lines).toEqual([2, 3, 5])
  })

  it('Tailwind 색 이름도 계열로 센다', () => {
    const text = '<div className="text-green-600"><span className="text-amber-600">a</span><span className="border-sky-500">b</span></div>'
    expect(audit('A.tsx', text).find((f) => f.rule === 'hue-count')?.message).toContain('3')
  })
})

describe('auditLayout — 이모지 아이콘 (emoji-icon)', () => {
  it('아이콘·사진 자리의 이모지를 파일마다 한 번 요약해 잡는다', () => {
    const text = [
      'const TABS = [',
      "  { to: '/', label: '홈', icon: '🏠' },",
      "  { to: '/cart', label: '장바구니', icon: '🛒' },",
      ']',
      'export const Empty = () => <p>찜한 상품이 없어요 ❤️</p>',
    ].join('\n')
    const findings = audit('Tabs.tsx', text).filter((f) => f.rule === 'emoji-icon')
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('warn')
    expect(findings[0].lines).toEqual([2, 3, 5])
    expect(findings[0].fix).toContain('icons.ts')
  })

  it('글자 기호(★ ✓ × → © ™)와 주석 속 이모지는 조용하다', () => {
    const text = [
      '// 🍜 데모용 주석',
      'export const Rate = () => <span>★ 4.8 · ✓ 확인 · × 닫기 → 다음 © 2026 suta™</span>',
    ].join('\n')
    expect(audit('Rate.tsx', text).filter((f) => f.rule === 'emoji-icon')).toEqual([])
  })

  it('HTML 마크업의 이모지도 센다', () => {
    expect(audit('index.html', '<button aria-label="검색">🔍</button>').find((f) => f.rule === 'emoji-icon')?.lines).toEqual([1])
  })
})

describe('auditLayout — 모바일 웹뷰 (viewport-height·input-zoom·zoom-disabled)', () => {
  it('100vh 높이는 바뀌는 높이 단위(dvh·svh)가 같은 블록에 없으면 알린다', () => {
    const css = [
      '.page { min-height: 100vh; }',
      '.sheet { max-height: 100vh; max-height: 100dvh; }',
      '.hero { height: 50vh; }',
    ].join('\n')
    const findings = audit('a.css', css).filter((f) => f.rule === 'viewport-height')
    expect(findings.map((f) => f.line)).toEqual([1])
    expect(findings[0].fix).toContain('100dvh')
  })

  it('Tailwind h-screen·min-h-screen도 dvh·svh 짝이 없으면 알린다', () => {
    const text = ['export const A = () => (', '  <main className="min-h-screen">', '    <div className="h-screen h-dvh" />', '  </main>', ')'].join('\n')
    expect(audit('A.tsx', text).filter((f) => f.rule === 'viewport-height').map((f) => f.line)).toEqual([2])
  })

  it('16px 미만 입력칸 글자를 잡는다 — iOS가 초점을 받을 때 화면을 확대한다', () => {
    const css = [
      'input, textarea { font-size: 14px; }',
      '.search-input { font-size: 0.875rem; }',
      'input[type="checkbox"] { font-size: 12px; }',
      '.field-label { font-size: 14px; }',
      'select { font-size: 16px; }',
      '@media (pointer: fine) { .code-input { font-size: 0.8rem; } }',
    ].join('\n')
    const findings = audit('a.css', css).filter((f) => f.rule === 'input-zoom')
    expect(findings.map((f) => f.line)).toEqual([1, 2])
    expect(findings[0].severity).toBe('warn')
  })

  it('JSX 입력칸의 작은 글자 클래스(text-sm·text-[13px])도 잡는다', () => {
    const text = ['export const S = () => (', '  <form>', '    <input className="h-10 text-sm" />', '    <textarea className="text-base" />', '    <button className="text-sm">검색</button>', '  </form>', ')'].join('\n')
    expect(audit('S.tsx', text).filter((f) => f.rule === 'input-zoom').map((f) => f.line)).toEqual([3])
  })

  it('확대를 막는 viewport 설정(user-scalable=no·maximum-scale=1)을 잡는다', () => {
    const html = [
      '<head>',
      '  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />',
      '</head>',
    ].join('\n')
    const findings = audit('index.html', html).filter((f) => f.rule === 'zoom-disabled')
    expect(findings.map((f) => f.line)).toEqual([2])
    expect(audit('ok.html', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />').filter((f) => f.rule === 'zoom-disabled')).toEqual([])
  })
})

describe('auditLayout — 저장소의 패턴 코드', () => {
  it('설치되는 패턴 assets 전체에서 error가 없다', () => {
    // vitest는 demo/에서 돈다 — 정본 패턴 폴더를 그대로 훑는다
    const root = resolve(process.cwd(), '../skills/suta/patterns')
    const collect = (dir: string): { file: string; text: string }[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) return collect(path)
        return ['.css', '.tsx', '.html'].includes(extname(path)) ? [{ file: path, text: readFileSync(path, 'utf8') }] : []
      })
    const sources = collect(root)
    expect(sources.length).toBeGreaterThan(50)
    expect(auditLayout(sources).filter((f) => f.severity === 'error')).toEqual([])
  })
})

describe('auditLayout — React Native StyleSheet', () => {
  const rn = (body: string) => `import { StyleSheet } from 'react-native'\n\nexport const styles = StyleSheet.create({\n${body}\n})\n`

  it('StyleSheet.create의 fontSize 숫자를 글자 크기로 읽는다 — 줄 번호는 원본 그대로', () => {
    const text = rn(['  title: { fontSize: 24, fontWeight: \'700\' },', '  meta: {', '    fontSize: 10,', '  },'].join('\n'))
    const findings = audit('screen.tsx', text)
    const tiny = findings.filter((f) => f.rule === 'tiny-text')
    expect(tiny.map((f) => [f.line, f.severity])).toEqual([[6, 'error']])
  })

  it('간격·반경·색을 기존 규칙으로 센다 — 토큰 참조(space.lg·colors.accent)는 값을 모르니 세지 않는다', () => {
    const text = rn(
      [
        '  a: { padding: 6, marginHorizontal: 10, gap: space.lg, borderRadius: 4 },',
        '  b: { paddingVertical: 2, borderRadius: 6, color: colors.accent },',
        '  c: { borderRadius: 10, backgroundColor: \'#2563eb\', borderColor: \'#16a34a\' },',
        '  d: { borderRadius: 14, color: \'#dc2626\', borderTopLeftRadius: radius.full },',
      ].join('\n'),
    )
    const findings = audit('screen.tsx', text)
    const off = findings.find((f) => f.rule === 'spacing-off-scale')
    expect(off?.lines).toEqual([4])
    expect(findings.find((f) => f.rule === 'radius-variety')?.message).toContain('4종')
    expect(findings.find((f) => f.rule === 'hue-count')?.message).toContain('3종')
  })

  it('스프레드·조건식·배열(transform)·주석 속 값은 건너뛰고, StyleSheet 밖 객체는 읽지 않는다', () => {
    const text = [
      "import { StyleSheet } from 'react-native'",
      'const tokens = { fontSize: 9 }',
      'const styles = StyleSheet.create({',
      '  // fontSize: 8 — 주석',
      '  card: { ...type.body, transform: [{ rotate: \'-3deg\' }, { scale: 1.1 }], opacity: pressed ? 0.6 : 1 },',
      "  label: { fontSize: 14, lineHeight: 20, fontFamily: 'GmarketSans-Bold' },",
      '})',
    ].join('\n')
    expect(audit('screen.tsx', text)).toEqual([])
  })

  it('.ts 파일의 StyleSheet.create도 읽고, 예외 주석은 그 줄에 적용된다', () => {
    // 예외 주석은 그 줄과 다음 줄을 덮는다 — 지적받을 줄을 앞에 둔다
    const text = rn(['  dot: { margin: 3 },', '  pill: { fontSize: 11 }, // layout-audit-ignore: tiny-text — 달력 칸 숫자는 OS 확대로 키운다'].join('\n'))
    const findings = audit('styles.ts', text)
    expect(rules(findings)).toEqual(['spacing-off-scale'])
  })
})
