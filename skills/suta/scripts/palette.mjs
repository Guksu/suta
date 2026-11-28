#!/usr/bin/env node
/**
 * suta 색 조합 CLI — 강조색 하나에서 한 벌(주 버튼 면·위 글자·강조 글자·선택 바탕·무채색)을 만들어 :root 블록으로 낸다.
 *
 *   node palette.mjs '#3182f6'            # 무채색은 순수 회색(기본 — 잘 만든 앱 29곳 중 24곳)
 *   node palette.mjs '#c62828' --tint     # 무채색을 강조색 쪽으로 아주 살짝 기울인다
 *   node palette.mjs '#0e7a56' --json     # 기계가 읽을 JSON(토큰·안내·진단)
 *   node palette.mjs --check              # 뜻 짝(오류·완료, 등락, 금·은·동)이 색각 이상에서 구별되는지 — OKLab 거리 표
 *   node palette.mjs --check '#c8341f' '#13795b'   # 내 두 색을 잰다
 *
 * 대비가 모자라면 같은 색상각으로 조금 어둡게 하거나 위 글자를 짙게 바꾸고, 그 이유를 주석으로 남긴다.
 * 탁한 강조색(어둡고 채도 낮음)·옅은 파스텔은 경고한다. 기준은 patterns/layout-principles/references/tone.md 3·4절.
 * 요구: Node 22.18 이상(코어 .ts를 그대로 import한다).
 */
import { buildPalette, cvdPairCheck, formatCss } from '../patterns/layout-principles/assets/palette.ts'
import { COLOR } from '../patterns/layout-principles/assets/layoutTokens.ts'

const args = process.argv.slice(2)

// --check: 색각 이상 시뮬레이션(적색·녹색 계열 Viénot 1999, 청색 계열 Brettel 1997)으로 뜻 짝의 OKLab 거리를 잰다.
// 문턱(색각 이상 0.12·밝기 0.1, 정상 0.1)은 판단값이다 — 넘지 못한 짝은 색 말고 다른 신호(아이콘·글자·부호)를 함께 둔다
if (args.includes('--check')) {
  const hexes = args.filter((a) => /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(a)).map((a) => (a.startsWith('#') ? a : `#${a}`))
  const pairs = hexes.length >= 2
    ? [['두 색', hexes[0], hexes[1]]]
    : [
        ['오류 ↔ 완료', COLOR.danger, COLOR.success],
        ['상승 ↔ 하락', COLOR.rise, COLOR.fall],
        ['금 ↔ 은 채움', COLOR.reward, COLOR.rewardSilver],
        ['금 ↔ 동 채움', COLOR.reward, COLOR.rewardBronze],
        ['은 ↔ 동 채움', COLOR.rewardSilver, COLOR.rewardBronze],
      ]
  const VERDICT = { distinct: '구별된다', cvd: '색각 이상에서 가깝다 — 색 말고 다른 신호를 함께', all: '누구에게나 가깝다' }
  console.log('짝 | 정상 | 적색 계열 | 녹색 계열 | 청색 계열 | 판정 (OKLab 거리, 괄호는 밝기 차)')
  for (const [name, a, b] of pairs) {
    const c = cvdPairCheck({ a, b })
    const cell = ({ distance, lightness }) => `${distance.toFixed(3)} (${lightness.toFixed(2)})`
    console.log(`${name} ${a}·${b} | ${cell(c.normal)} | ${cell(c.protan)} | ${cell(c.deutan)} | ${cell(c.tritan)} | ${VERDICT[c.verdict]}`)
  }
  process.exit(0)
}
const accent = args.find((a) => /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(a))
if (!accent) {
  console.error("사용: node palette.mjs '<강조색 hex>' [--tint] [--json]  |  node palette.mjs --check ['<색>' '<색>']")
  process.exit(2)
}
const { tokens, notes, issues } = buildPalette({ accent: accent.startsWith('#') ? accent : `#${accent}`, tint: args.includes('--tint') ? 'accent' : 'pure' })
if (args.includes('--json')) {
  console.log(JSON.stringify({ tokens, notes, issues }, null, 2))
} else {
  for (const note of notes) console.log(`/* ${note} */`)
  process.stdout.write(formatCss(tokens))
}
