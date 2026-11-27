import { findUnchainedMotion, findStaleFallbacks, parseTokenDefaults } from '../../../scripts/lib/motionTokenChain'

const TOKENS = `
:root {
  --motion-duration-fast: 150ms; /* 작은 것 */
  --motion-duration-slow: 350ms;
  --motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --motion-stagger: 30ms;
  --focus-ring-width: 2px;
}
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-slow: 80ms;
  }
}
`

describe('motionTokenChain — 토큰 기본값 읽기', () => {
  it('토큰 파일의 :root 값을 읽고, 동작 줄이기 블록의 값은 기본값으로 보지 않는다', () => {
    const tokens = parseTokenDefaults(TOKENS)
    expect(tokens['--motion-duration-slow']).toBe('350ms')
    expect(tokens['--motion-ease-out']).toBe('cubic-bezier(0.22, 1, 0.36, 1)')
    expect(tokens['--focus-ring-width']).toBe('2px')
  })
})

describe('motionTokenChain — 시간 기본값이 토큰을 거치는가', () => {
  it('공개 변수의 기본값이 숫자로 끝나면 잡는다 — 토큰 파일을 넣어도 따라오지 않는다', () => {
    const found = findUnchainedMotion('.sheet {\n  --_duration: var(--sheet-duration, 350ms);\n}')
    expect(found).toEqual([{ line: 2, kind: 'time', value: '350ms', text: '--_duration: var(--sheet-duration, 350ms);' }])
  })

  it('토큰을 거친 사슬의 맨 끝 숫자는 통과한다', () => {
    expect(findUnchainedMotion('.sheet {\n  --_duration: var(--sheet-duration, var(--motion-duration-slow, 350ms));\n}')).toEqual([])
  })

  it('transition·animation 안의 숫자 시간도 잡는다', () => {
    const css = '.a {\n  transition: opacity 140ms linear;\n  animation: spin 700ms linear infinite;\n}'
    expect(findUnchainedMotion(css).map((f) => f.value)).toEqual(['140ms', '700ms'])
  })

  it('같은 줄에 "토큰 밖" 주석이 있으면 이유가 적힌 예외로 보고 통과한다', () => {
    expect(findUnchainedMotion('.a {\n  animation: spin 700ms linear infinite; /* 토큰 밖: 스피너 한 바퀴 */\n}')).toEqual([])
  })

  it('0과 0s(계단형 visibility 지연)는 시간이 아니다', () => {
    expect(findUnchainedMotion('.a {\n  transition: transform var(--_d) linear, visibility 0s linear var(--_d);\n  transition-delay: 0ms;\n}')).toEqual([])
  })

  it('동작 줄이기 블록 안은 보지 않는다 — 줄인 페이드는 토큰의 줄인 값과 일부러 다르다', () => {
    const css = '@media (prefers-reduced-motion: reduce) {\n  .a {\n    transition: opacity 150ms linear;\n  }\n}\n.b {\n  transition: opacity 120ms linear;\n}'
    expect(findUnchainedMotion(css).map((f) => f.line)).toEqual([7])
  })

  it('주석 안의 숫자는 보지 않는다', () => {
    expect(findUnchainedMotion('/* 기본 300ms — 예전 값 */\n.a {\n  color: red; /* 200ms */\n}')).toEqual([])
  })

  it('transition·animation이 아닌 속성의 시간은 보지 않는다', () => {
    expect(findUnchainedMotion('.a {\n  view-transition-name: page;\n  --reveal-label: "600ms";\n}')).toEqual([])
  })

  it('여러 줄 transition의 둘째 줄 숫자도 그 줄 번호로 잡는다', () => {
    const css = '.a {\n  transition:\n    opacity var(--_d) linear,\n    transform 260ms linear;\n}'
    expect(findUnchainedMotion(css)).toEqual([{ line: 4, kind: 'time', value: '260ms', text: 'transform 260ms linear;' }])
  })

  it('스태거 곱셈 안의 토큰은 통과한다', () => {
    expect(findUnchainedMotion('.a {\n  transition-delay: calc(var(--i) * var(--motion-stagger, 30ms));\n}')).toEqual([])
  })
})

describe('motionTokenChain — 이징이 토큰을 거치는가', () => {
  it('cubic-bezier 숫자와 ease 키워드를 잡는다 — 토큰과 눈에 띄지 않게 다른 곡선이 섞인다', () => {
    const css = '.a {\n  transition: opacity var(--_d) cubic-bezier(0.23, 1, 0.32, 1), color var(--_d) ease;\n}'
    expect(findUnchainedMotion(css).map((f) => `${f.kind}:${f.value}`)).toEqual(['ease:cubic-bezier(0.23, 1, 0.32, 1)', 'ease:ease'])
  })

  it('토큰 사슬의 맨 끝 곡선과 linear·steps는 통과한다', () => {
    const css = '.a {\n  transition: opacity var(--_d) var(--motion-ease-out, cubic-bezier(0.22, 1, 0.36, 1)), b var(--_d) linear;\n  --_e: var(--fx-ease, var(--motion-ease-out, cubic-bezier(0.22, 1, 0.36, 1)));\n}'
    expect(findUnchainedMotion(css)).toEqual([])
  })

  it('ease-in-out·ease-out 키워드도 잡고, 변수 이름 안의 ease는 잡지 않는다', () => {
    const css = '.a {\n  animation: x var(--_d) ease-out both;\n  transition: y var(--_d) var(--_ease-out);\n}'
    expect(findUnchainedMotion(css).map((f) => f.value)).toEqual(['ease-out'])
  })
})

describe('motionTokenChain — 사슬 끝 숫자가 토큰 기본값과 같은가', () => {
  const tokens = parseTokenDefaults(TOKENS)

  it('토큰 기본값과 같으면 통과한다 — 토큰 파일을 넣든 안 넣든 같은 값이 나온다', () => {
    expect(findStaleFallbacks({ css: '.a {\n  --_d: var(--x, var(--motion-duration-slow, 350ms));\n}', tokens })).toEqual([])
  })

  it('다르면 잡는다 — 토큰 파일이 없을 때만 다른 값이 된다', () => {
    const found = findStaleFallbacks({ css: '.a {\n  --_d: var(--x, var(--motion-duration-slow, 300ms));\n  outline: var(--focus-ring-width, 3px) solid red;\n}', tokens })
    expect(found).toEqual([
      { line: 2, token: '--motion-duration-slow', fallback: '300ms', expected: '350ms' },
      { line: 3, token: '--focus-ring-width', fallback: '3px', expected: '2px' },
    ])
  })

  it('곡선은 띄어쓰기를 무시하고 비교한다', () => {
    expect(findStaleFallbacks({ css: '.a {\n  --_e: var(--motion-ease-out, cubic-bezier(0.22,1,0.36,1));\n}', tokens })).toEqual([])
  })

  it('모르는 토큰과 사슬이 다시 변수로 끝나는 경우는 보지 않는다', () => {
    expect(findStaleFallbacks({ css: '.a {\n  color: var(--motion-unknown, 1ms);\n  --_d: var(--motion-duration-fast, var(--y));\n}', tokens })).toEqual([])
  })
})
