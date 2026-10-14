#!/usr/bin/env node
/**
 * suta 색 조합 CLI — 강조색 하나에서 한 벌(주 버튼 면·위 글자·강조 글자·선택 바탕·무채색)을 만들어 :root 블록으로 낸다.
 *
 *   node palette.mjs '#3182f6'            # 무채색은 순수 회색(기본 — 잘 만든 앱 29곳 중 24곳)
 *   node palette.mjs '#c62828' --tint     # 무채색을 강조색 쪽으로 아주 살짝 기울인다
 *   node palette.mjs '#0e7a56' --json     # 기계가 읽을 JSON(토큰·안내·진단)
 *
 * 대비가 모자라면 같은 색상각으로 조금 어둡게 하거나 위 글자를 짙게 바꾸고, 그 이유를 주석으로 남긴다.
 * 탁한 강조색(어둡고 채도 낮음)·옅은 파스텔은 경고한다. 기준은 patterns/layout-principles/references/tone.md 3·4절.
 * 요구: Node 22.18 이상(코어 .ts를 그대로 import한다).
 */
import { buildPalette, formatCss } from '../patterns/layout-principles/assets/palette.ts'

const args = process.argv.slice(2)
const accent = args.find((a) => /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(a))
if (!accent) {
  console.error("사용: node palette.mjs '<강조색 hex>' [--tint] [--json]")
  process.exit(2)
}
const { tokens, notes, issues } = buildPalette({ accent: accent.startsWith('#') ? accent : `#${accent}`, tint: args.includes('--tint') ? 'accent' : 'pure' })
if (args.includes('--json')) {
  console.log(JSON.stringify({ tokens, notes, issues }, null, 2))
} else {
  for (const note of notes) console.log(`/* ${note} */`)
  process.stdout.write(formatCss(tokens))
}
