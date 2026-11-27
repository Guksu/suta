import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DURATION, EASE, EXIT_RATIO, PRESS, STAGGER_MS, cubicBezier, durationFor, exitDuration, staggerDelay } from '@skills/motion-principles/assets/motionTokens'

// vitest는 demo/에서 돈다 — 정본 CSS를 파일로 읽어 TS 상수와 비교한다(두 벌이 어긋나면 화면마다 속도가 달라진다)
const css = readFileSync(resolve(process.cwd(), '../skills/suta/patterns/motion-principles/assets/motion-tokens.css'), 'utf8')
const cssVar = (name: string) => css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim()

describe('motionTokens — CSS 토큰과 TS 상수가 같은 값이다', () => {
  it('시간 5단계가 CSS와 일치한다', () => {
    for (const [size, ms] of Object.entries(DURATION)) {
      expect(cssVar(`--motion-duration-${size}`)).toBe(`${ms}ms`)
    }
  })

  it('이징·퇴장 비율·스태거가 CSS와 일치한다', () => {
    expect(cssVar('--motion-ease-out')).toBe(EASE.out)
    expect(cssVar('--motion-ease-in-out')).toBe(EASE.inOut)
    expect(cssVar('--motion-ease-drawer')).toBe(EASE.drawer)
    expect(cssVar('--motion-ease-overshoot')).toBe(EASE.overshoot)
    expect(cssVar('--motion-exit-ratio')).toBe(String(EXIT_RATIO))
    expect(cssVar('--motion-stagger')).toBe(`${STAGGER_MS}ms`)
  })

  it('눌림 짝(누름·복귀·배율)이 CSS와 일치하고, 누름이 복귀보다 짧다', () => {
    expect(cssVar('--motion-duration-press')).toBe(`${PRESS.inMs}ms`)
    expect(cssVar('--motion-duration-release')).toBe(`${PRESS.outMs}ms`)
    expect(cssVar('--motion-press-scale')).toBe(String(PRESS.scale))
    expect(PRESS.inMs).toBeLessThan(PRESS.outMs)
  })

  it('CSS에 reduced-motion 블록이 있고 시간을 0ms로 두지 않는다', () => {
    const block = css.slice(css.indexOf('prefers-reduced-motion'))
    expect(block).toContain('--motion-duration-base')
    expect(block).not.toMatch(/--motion-duration-[a-z]+:\s*0ms/)
  })
})

describe('motionTokens — 계산 함수', () => {
  it('퇴장은 진입의 3/4, 5ms 단위', () => {
    expect(exitDuration(250)).toBe(190)
    expect(exitDuration(350)).toBe(265)
    expect(exitDuration(100)).toBe(75)
  })

  it('거리가 주어지면 크기보다 우선하고, 멀수록 길다', () => {
    expect(durationFor({ distancePx: 10 })).toBe(DURATION.fast)
    expect(durationFor({ distancePx: 100 })).toBe(DURATION.base)
    expect(durationFor({ distancePx: 320 })).toBe(DURATION.slow)
    expect(durationFor({ distancePx: 900 })).toBe(DURATION.page)
    expect(durationFor({ size: 'slow', distancePx: 10 })).toBe(DURATION.fast)
    expect(durationFor({})).toBe(DURATION.base)
  })

  it('스태거는 상한 개수에서 멈춘다', () => {
    expect(staggerDelay({ index: 0 })).toBe(0)
    expect(staggerDelay({ index: 3 })).toBe(90)
    expect(staggerDelay({ index: 25 })).toBe(270) // 10개 상한 → 9 × 30
    expect(staggerDelay({ index: 2, stepMs: 50, maxItems: 2 })).toBe(50)
  })

  it('cubicBezier는 양 끝이 0·1이고 ease-out은 중간에서 절반보다 앞서 있다', () => {
    const out = cubicBezier(EASE.out)
    expect(out(0)).toBe(0)
    expect(out(1)).toBe(1)
    expect(out(0.5)).toBeGreaterThan(0.8)
    const linear = cubicBezier(EASE.linear)
    expect(linear(0.3)).toBe(0.3)
    const overshoot = cubicBezier(EASE.overshoot)
    expect(overshoot(0.7)).toBeGreaterThan(1) // 넘쳤다 돌아온다
  })
})
