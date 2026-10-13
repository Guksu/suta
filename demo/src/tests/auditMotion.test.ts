import { auditMotion, formatFindings, summarize } from '@skills/motion-audit/assets/auditMotion'

const rules = (findings: ReturnType<typeof auditMotion>) => findings.map((f) => f.rule)

describe('auditMotion — CSS 규칙', () => {
  it('레이아웃 속성 transition을 error로 잡고 줄 번호와 대안 스킬을 준다', () => {
    const text = `.box {\n  color: red;\n  transition: height 300ms ease, opacity 300ms;\n}\n@media (prefers-reduced-motion: reduce) { .box { transition: none; } }`
    const findings = auditMotion([{ file: 'a.css', text }])
    expect(rules(findings)).toEqual(['layout-animation'])
    expect(findings[0].line).toBe(3)
    expect(findings[0].severity).toBe('error')
    expect(findings[0].fix).toContain('accordion')
  })

  it('여러 줄 주석 뒤에서도 줄 번호가 맞는다', () => {
    const text = `/* 머리 주석\n * 둘째 줄\n * 셋째 줄 */\n.a {\n  color: red;\n  transition: top 200ms;\n}\n@media (prefers-reduced-motion: reduce) { .a { transition: none } }`
    const findings = auditMotion([{ file: 'm.css', text }])
    expect(findings.map((f) => [f.rule, f.line])).toEqual([['layout-animation', 6]])
  })

  it('transition: all 과 @keyframes 안의 width를 잡는다', () => {
    const text = `.a { transition: all 200ms; }\n@keyframes grow { from { width: 0 } to { width: 100px } }\n@media (prefers-reduced-motion: reduce) { .a { transition: none } }`
    const findings = auditMotion([{ file: 'b.css', text }])
    expect(rules(findings)).toEqual(['transition-all', 'layout-animation'])
    expect(findings[1].line).toBe(2)
  })

  it('움직임이 있는데 reduced-motion 블록이 없으면 error, 없는 파일은 조용하다', () => {
    const moving = auditMotion([{ file: 'c.css', text: `.x { transition: opacity 200ms; }` }])
    expect(rules(moving)).toEqual(['no-reduced-motion'])
    const still = auditMotion([{ file: 'd.css', text: `.x { color: red; }` }])
    expect(still).toEqual([])
  })

  it('시간 범위 — 60ms 미만·700ms 초과는 warn, reduced-motion 블록 안의 1ms는 제외', () => {
    const text = `.a { transition: opacity 30ms; }\n.b { transition: transform 900ms ease-out; }\n.c { transition: transform 250ms ease-out; }\n@media (prefers-reduced-motion: reduce) { .a { transition: opacity 1ms; } }`
    const findings = auditMotion([{ file: 'e.css', text }])
    expect(rules(findings)).toEqual(['duration-range', 'duration-range'])
    expect(findings.map((f) => f.line)).toEqual([1, 2])
  })

  it('이동에 linear, 퇴장 상태에 ease-in을 warn으로 잡는다', () => {
    const text = `.card { transition: transform 250ms linear; }\n.card[data-state='exiting'] { transition: opacity 200ms ease-in; }\n.bar { transition: width 1s linear; }\n@media (prefers-reduced-motion: reduce) { .card { transition: none } }`
    const findings = auditMotion([{ file: 'f.css', text }])
    expect(rules(findings)).toEqual(['linear-movement', 'ease-in-exit', 'layout-animation', 'duration-range'])
  })

  it('무한 반복과 상시 will-change를 warn으로 잡는다', () => {
    const text = `.spin { animation: spin 1s linear infinite; will-change: transform; }\n.btn:hover { will-change: transform; }\n@media (prefers-reduced-motion: reduce) { .btn { transition: none } }`
    const findings = auditMotion([{ file: 'g.css', text }])
    expect(rules(findings)).toEqual(['infinite-loop', 'will-change-global'])
  })
})

describe('auditMotion — 편집 후 훅을 위한 관여 줄', () => {
  it('no-reduced-motion은 움직임을 선언한 줄 전체를 lines로 준다 — 그중 하나를 고친 편집만 이 지적을 받는다', () => {
    const text = `.a {\n  color: red;\n  transition: opacity 200ms ease-out;\n}\n.b {\n  animation: fade 300ms ease-out;\n}`
    const finding = auditMotion([{ file: 'a.css', text }]).find((f) => f.rule === 'no-reduced-motion')
    expect(finding?.line).toBe(3)
    expect(finding?.lines).toEqual([3, 6])
  })
})

describe('auditMotion — 예외와 관용 표현', () => {
  it('motion-audit-ignore 주석이 있는 줄(또는 다음 줄)의 지적은 건너뛴다', () => {
    const text = `.thumb {\n  /* motion-audit-ignore: layout-animation — absolute라 자기만 레이아웃 */\n  transition: width 200ms ease-out;\n  will-change: transform; /* motion-audit-ignore: will-change-global — 계속 끌리는 요소 */\n}\n@media (prefers-reduced-motion: reduce) { .thumb { transition: none } }`
    expect(auditMotion([{ file: 'i.css', text }])).toEqual([])
  })

  it('0ms 전이·주석 속 단어·reduced-motion이 다루는 무한 반복은 지적하지 않는다', () => {
    const zero = auditMotion([{ file: 'j.css', text: `.t { transition: visibility 0s 200ms, opacity 200ms; }\n@media (prefers-reduced-motion: reduce) { .t { transition: none } }` }])
    expect(zero).toEqual([])
    const commentOnly = auditMotion([{ file: 'k.css', text: `/* transition을 두지 않는다 — rAF가 쓴다 */\n.bar { transform: scaleX(0); }` }])
    expect(commentOnly).toEqual([])
    const handled = auditMotion([{ file: 'l.css', text: `.spin { animation: spin 1s linear infinite; }\n@media (prefers-reduced-motion: reduce) { .spin { animation: none } }` }])
    expect(handled).toEqual([])
  })
})

describe('auditMotion — JS 규칙과 출력', () => {
  it('setInterval로 style을 갱신하거나 프레임 루프에서 style.left를 쓰면 잡는다', () => {
    const text = `setInterval(() => { el.style.opacity = String(o += 0.1) }, 16)\nconst tick = () => { el.style.left = x + 'px'; requestAnimationFrame(tick) }`
    const findings = auditMotion([{ file: 'h.ts', text }])
    expect(rules(findings)).toEqual(['js-interval-anim', 'layout-animation'])
  })

  it('템플릿 문자열·주석 속 예시 코드는 실행되는 코드가 아니라서 잡지 않는다 — 줄 번호는 그대로다', () => {
    const text = [
      'const SAMPLE = `',
      'setInterval(() => {',
      "  el.style.left = x + 'px'",
      '}, 16)`',
      '// setInterval(() => { el.style.top = y + "px" }, 16)',
      "const tick = () => { el.style.left = x + 'px'; requestAnimationFrame(tick) }",
    ].join('\n')
    const findings = auditMotion([{ file: 'Demo.tsx', text }])
    expect(findings.map((f) => `${f.line}:${f.rule}`)).toEqual(['6:layout-animation'])
  })

  it('motion-audit-ignore 주석은 스크립트의 지적에도 적용된다', () => {
    const text = ['const tick = () => {', '  requestAnimationFrame(tick)', '  // motion-audit-ignore: layout-animation — 폭을 재는 측정용 막대', "  bar.style.width = w + 'px'", '}'].join('\n')
    expect(auditMotion([{ file: 'measure.ts', text }])).toEqual([])
  })

  it('요약과 file:line 형식 출력', () => {
    const findings = auditMotion([
      { file: 'z.css', text: `.a { transition: top 200ms; }` },
    ])
    const summary = summarize(findings)
    expect(summary).toEqual({ errors: 2, warnings: 0 })
    const out = formatFindings(findings)
    expect(out).toMatch(/^z\.css:1 \[error\] /m)
    expect(out).toContain('→')
  })

  it('깨끗한 파일은 결과가 없다 (suta 스킬 CSS 스타일)', () => {
    const text = `.sheet {\n  --_duration: var(--sheet-duration, 350ms);\n  transition: transform var(--_duration) cubic-bezier(0.32, 0.72, 0, 1), opacity var(--_duration) ease;\n}\n@media (prefers-reduced-motion: reduce) {\n  .sheet { transition: opacity 120ms linear; transform: none; }\n}`
    expect(auditMotion([{ file: 'clean.css', text }])).toEqual([])
  })
})

describe('auditMotion — React Native(Reanimated·Animated)', () => {
  it('useAnimatedStyle이 width·height·top 같은 레이아웃 속성을 움직이면 error', () => {
    const text = [
      "import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'",
      'const bar = useAnimatedStyle(() => ({',
      '  width: withTiming(progress.value * 200),',
      '}))',
      'const fade = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }))',
    ].join('\n')
    const findings = auditMotion([{ file: 'bar.tsx', text }])
    expect(findings.map((f) => [f.rule, f.line, f.severity])).toEqual([['layout-animation', 3, 'error']])
  })

  it('withRepeat(…, -1)·Animated.loop은 동작 줄이기를 다루지 않으면 warn, 다루면 조용하다', () => {
    const loop = "import { withRepeat, withTiming } from 'react-native-reanimated'\nshimmer.value = withRepeat(withTiming(1, { duration: 900 }), -1, true)"
    expect(rules(auditMotion([{ file: 'skeleton.tsx', text: loop }]))).toEqual(['infinite-loop'])
    const handled = `import { useReducedMotion, withRepeat, withTiming } from 'react-native-reanimated'\nconst reduce = useReducedMotion()\nif (!reduce) shimmer.value = withRepeat(withTiming(1, { duration: 900 }), -1, true)`
    expect(auditMotion([{ file: 'skeleton.tsx', text: handled }])).toEqual([])
    const core = "import { Animated } from 'react-native'\nAnimated.loop(Animated.timing(v, { toValue: 1, duration: 800, useNativeDriver: true })).start()"
    expect(rules(auditMotion([{ file: 'spin.tsx', text: core }]))).toEqual(['no-reduced-motion', 'infinite-loop'])
  })

  it('React Native Animated·LayoutAnimation은 OS 동작 줄이기를 따르지 않는다 — 확인 코드가 없으면 warn', () => {
    const text = "import { Animated, LayoutAnimation } from 'react-native'\nAnimated.timing(v, { toValue: 1, duration: 200, useNativeDriver: true }).start()\nLayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)"
    const findings = auditMotion([{ file: 'list.tsx', text }])
    expect(findings.map((f) => [f.rule, f.severity])).toEqual([['no-reduced-motion', 'warn']])
    const checked = `import { AccessibilityInfo, Animated } from 'react-native'\nconst reduce = await AccessibilityInfo.isReduceMotionEnabled()\nAnimated.timing(v, { toValue: 1, duration: reduce ? 0 : 200, useNativeDriver: true }).start()`
    expect(auditMotion([{ file: 'list.tsx', text: checked }])).toEqual([])
  })

  it('withTiming의 duration 숫자가 60ms 미만·700ms 초과면 warn — 반복(withRepeat) 안은 2000ms까지', () => {
    const text = [
      "import { withRepeat, withTiming, useReducedMotion } from 'react-native-reanimated'",
      'a.value = withTiming(1, { duration: 40 })',
      'b.value = withTiming(1, { duration: 900 })',
      'c.value = withRepeat(withTiming(1, { duration: 1200 }), -1)',
      'd.value = withTiming(1, { duration: MOTION.enter })',
      'const reduce = useReducedMotion()',
    ].join('\n')
    const findings = auditMotion([{ file: 't.tsx', text }])
    expect(findings.map((f) => [f.rule, f.line])).toEqual([
      ['duration-range', 2],
      ['duration-range', 3],
    ])
  })
})
