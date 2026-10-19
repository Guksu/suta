#!/usr/bin/env node
/**
 * 퍼블리싱 벤치마크 3단계 — 집계. measure.mjs의 metrics.json을 조건별로 모아 비교한다.
 * 결과: evals/benchmark/<이름>.json(저장소에 남기는 요약 + 실행별 지표, 기본 이름 results)과 표준 출력의 마크다운 표
 * 사용: node scripts/benchmark/report.mjs --out <폴더> [--date YYYY-MM-DD] [--name results]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = new URL('../..', import.meta.url).pathname
const option = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const outDir = option('out')
if (!outDir) {
  console.error('사용: node scripts/benchmark/report.mjs --out <폴더> [--date YYYY-MM-DD]')
  process.exit(1)
}
const rows = JSON.parse(readFileSync(join(resolve(outDir), 'metrics.json'), 'utf8')).filter((r) => r.measured)
const conditions = ['baseline', 'suta']

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)
const median = (values) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const round = (n, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits
const share = (list, test) => ({ count: list.filter(test).length, of: list.length })

/** 지표 정의 — 표와 results.json이 같은 목록을 쓴다. better: 낮을수록 좋은 지표는 'low' */
const METRICS = [
  { key: 'overflow320', label: '320px에서 가로로 넘친 화면', en: 'Pages that scroll sideways at 320px', kind: 'share', test: (r) => r.overflow320 },
  { key: 'coveredByBar', label: '끝까지 내려도 하단 고정 바가 본문을 가리는 화면', en: 'Pages where a fixed bottom bar still covers content at the end', kind: 'share', test: (r) => r.coveredByBar },
  { key: 'tinyText', label: '12px 미만 글자가 있는 화면', en: 'Pages with text under 12px', kind: 'share', test: (r) => r.tinyText > 0 },
  { key: 'smallTargets', label: '24px 미만 터치 영역 (화면당)', en: 'Touch targets under 24px (per page)', kind: 'mean', value: (r) => r.smallTargets },
  { key: 'boxes', label: '카드형 상자 (화면당)', en: 'Card-like boxes (per page)', kind: 'mean', value: (r) => r.boxes, descriptive: true },
  { key: 'nestedBoxes', label: '상자 안 상자 (화면당)', en: 'Boxes nested in boxes (per page)', kind: 'mean', value: (r) => r.nestedBoxes },
  { key: 'strongEffects', label: '그라데이션·흐림·큰 그림자 (화면당)', en: 'Gradients, blurs, large shadows (per page)', kind: 'mean', value: (r) => r.strongEffects },
  { key: 'fontSizes', label: '글자 크기 종류 (화면당)', en: 'Distinct font sizes (per page)', kind: 'mean', value: (r) => r.fontSizes },
  { key: 'centeredParagraphs', label: '가운데 정렬 문단 (화면당)', en: 'Centered multi-line paragraphs (per page)', kind: 'mean', value: (r) => r.centeredParagraphs },
  { key: 'transitionAll', label: '`transition: all`을 쓴 화면', en: 'Pages using `transition: all`', kind: 'share', test: (r) => r.transitionAll > 0 },
  { key: 'layoutMotion', label: '너비·높이·위치·여백을 직접 움직인 화면', en: 'Pages animating width, height, position or margins directly', kind: 'share', test: (r) => r.layoutMotion > 0 },
  { key: 'gridMotion', label: '격자 트랙(grid-template-rows)으로 높이를 여닫은 화면', en: 'Pages opening height via grid tracks (grid-template-rows)', kind: 'share', test: (r) => r.gridMotion > 0, descriptive: true },
  { key: 'reducedMotion', label: '움직임이 있는데 동작 줄이기 대응이 없는 화면', en: 'Pages with motion but no reduced-motion support', kind: 'share', test: (r) => r.moving > 0 && !r.reducedMotion },
  { key: 'axeSerious', label: '접근성 위반 — 심각 이상 (화면당, axe)', en: 'Serious+ accessibility violations (per page, axe)', kind: 'mean', value: (r) => r.axe.seriousNodes },
  { key: 'axeAll', label: '접근성 위반 — 전체 (화면당, axe)', en: 'All accessibility violations (per page, axe)', kind: 'mean', value: (r) => r.axe.nodes },
  { key: 'sutaErrors', label: 'suta 검사 error (화면당)', en: 'suta audit errors (per page)', kind: 'mean', value: (r) => r.suta.errors, self: true },
  { key: 'sutaWarns', label: 'suta 검사 warn (화면당)', en: 'suta audit warnings (per page)', kind: 'mean', value: (r) => r.suta.warns, self: true },
]

/** 톤 지표 — 좋고 나쁨의 방향이 하나가 아니라 레퍼런스(잘 만든 웹사이트 19곳, 모바일 390px의 아래 사분위·중앙값·위 사분위)와 견준다 */
const TONE = [
  { key: 'bodySize', label: '가장 많은 글자의 크기(px, 중앙값)', en: 'Size of the most-used text (px, median)', ref: '16 (13~16)', value: (r) => r.bodySize },
  { key: 'smallTextShare', label: '15px 미만 글자의 비율(%, 중앙값)', en: 'Share of text under 15px (%, median)', ref: '59 (14~82)', value: (r) => r.smallTextShare },
  { key: 'toneSurfaces', label: '바탕 말고 넓은 무채색 면의 종류(중앙값)', en: 'Neutral surfaces besides the page background (median)', ref: '2 (1~2)', value: (r) => r.toneSurfaces },
  { key: 'accentTextShare', label: '강조색 글자의 비율(%, 중앙값)', en: 'Share of text in an accent color (%, median)', ref: '0.5 (0~6.4)', value: (r) => r.accentTextShare },
  { key: 'primaryBlue', label: '주 버튼이 파랑·남색·보라 계열인 화면', en: 'Pages whose primary button is blue, indigo or violet', ref: '—', kind: 'share', test: (r) => r.primaryHue !== null && r.primaryHue !== undefined && r.primaryHue >= 200 && r.primaryHue <= 290 },
]
const hasTone = rows.some((r) => r.smallTextShare !== undefined)

const summary = {}
for (const condition of conditions) {
  const list = rows.filter((r) => r.condition === condition)
  const metrics = {}
  for (const metric of METRICS) {
    metrics[metric.key] = metric.kind === 'share' ? share(list, metric.test) : round(mean(list.map(metric.value)), 2)
  }
  const tone = hasTone ? Object.fromEntries(TONE.map((metric) => [metric.key, metric.kind === 'share' ? share(list, metric.test) : round(median(list.map(metric.value)), 1)])) : undefined
  summary[condition] = {
    pages: list.length,
    metrics,
    tone,
    process: {
      medianSeconds: round(median(list.map((r) => (r.durationMs ?? r.wallMs) / 1000)), 0),
      meanTurns: round(mean(list.map((r) => r.turns ?? 0)), 1),
      meanOutputTokens: Math.round(mean(list.map((r) => r.tokens.output))),
      meanInputTokens: Math.round(mean(list.map((r) => r.tokens.input + r.tokens.cacheRead + r.tokens.cacheWrite))),
      skillRead: share(list, (r) => r.skillRead),
      hookBlocks: list.reduce((sum, r) => sum + r.hookBlocks, 0),
      hookWarns: list.reduce((sum, r) => sum + r.hookWarns, 0),
      pageErrors: share(list, (r) => r.pageErrors > 0),
      permissionDenials: list.reduce((sum, r) => sum + (r.permissionDenials ?? 0), 0),
    },
  }
}

// 블라인드 판정(judge.mjs) — 있으면 함께 싣는다. judgments.json은 기본 판정 모델, judgments-alt.json은 다른 판정 모델
const judgeOf = (file) => {
  const path = join(resolve(outDir), file)
  const judgments = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')).filter((j) => j.winner) : []
  return judgments.length
  ? {
      judgments: judgments.length,
      suta: judgments.filter((j) => j.winner === 'suta').length,
      baseline: judgments.filter((j) => j.winner === 'baseline').length,
      tie: judgments.filter((j) => j.winner === 'tie').length,
      // 순서를 바꾼 두 판정이 같은 쪽을 고른 쌍만 센 것 — 순서에 흔들리지 않은 판정
      consistentPairs: Object.values(Object.groupBy(judgments, (j) => j.pair)).filter((pair) => pair.length === 2 && pair[0].winner === pair[1].winner).map((pair) => pair[0].winner),
      byPrompt: Object.fromEntries(Object.entries(Object.groupBy(judgments, (j) => j.prompt)).map(([prompt, list]) => [prompt, { suta: list.filter((j) => j.winner === 'suta').length, baseline: list.filter((j) => j.winner === 'baseline').length, tie: list.filter((j) => j.winner === 'tie').length }])),
      // 판정자가 남긴 한 문장 이유 원문 — 보고서의 "판정 이유" 요약을 확인할 수 있게
      reasons: judgments.map(({ pair, order, winner, reason }) => ({ pair, order, winner, reason })),
    }
  : null
}
const judge = judgeOf('judgments.json')
const judgeAlt = judgeOf('judgments-alt.json')

const cell = (metric, value) => (metric.kind === 'share' ? `${value.count}/${value.of}` : String(value))
for (const [lang, head] of [['ko', '| 지표 (낮을수록 좋다) | 일반 Claude Code | suta 설치 |'], ['en', '| Metric (lower is better) | Plain Claude Code | With suta |']]) {
  const table = [head, '|---|---|---|']
  for (const metric of METRICS) {
    const label = lang === 'ko' ? metric.label : metric.en
    table.push(`| ${label}${metric.self ? ' ※' : ''}${metric.descriptive ? ' †' : ''} | ${cell(metric, summary.baseline.metrics[metric.key])} | ${cell(metric, summary.suta.metrics[metric.key])} |`)
  }
  console.log(table.join('\n') + '\n')
}
if (hasTone) {
  for (const [lang, head] of [['ko', '| 톤 지표 | 레퍼런스 웹사이트 | 일반 Claude Code | suta 설치 |'], ['en', '| Tone metric | Reference websites | Plain Claude Code | With suta |']]) {
    const table = [head, '|---|---|---|---|']
    for (const metric of TONE) table.push(`| ${lang === 'ko' ? metric.label : metric.en} | ${metric.ref} | ${cell(metric, summary.baseline.tone[metric.key])} | ${cell(metric, summary.suta.tone[metric.key])} |`)
    console.log(table.join('\n') + '\n')
  }
}
console.log('※ suta가 스스로 정한 기준(편집 후 훅이 쓰는 검사기)이라 참고로만 본다')
console.log('† 많고 적음이 곧 좋고 나쁨은 아니다 — 설명용\n')
for (const condition of conditions) console.log(condition, JSON.stringify(summary[condition].process))
if (judge) console.log('판정', JSON.stringify(judge))
if (judgeAlt) console.log('다른 모델 판정', JSON.stringify(judgeAlt))

// 요청별 — 화면 유형마다 어느 지표가 갈렸는지 본다
const perPrompt = {}
for (const prompt of new Set(rows.map((r) => r.prompt))) {
  perPrompt[prompt] = {}
  for (const condition of conditions) {
    const list = rows.filter((r) => r.prompt === prompt && r.condition === condition)
    perPrompt[prompt][condition] = {
      overflow320: list.filter((r) => r.overflow320).length,
      nestedBoxes: round(mean(list.map((r) => r.nestedBoxes)), 1),
      strongEffects: round(mean(list.map((r) => r.strongEffects)), 1),
      fontSizes: round(mean(list.map((r) => r.fontSizes)), 1),
      axeSerious: round(mean(list.map((r) => r.axe.seriousNodes)), 1),
      ...(hasTone ? { smallTextShare: round(median(list.map((r) => r.smallTextShare)), 0), toneSurfaces: round(median(list.map((r) => r.toneSurfaces)), 1) } : {}),
      seconds: Math.round(mean(list.map((r) => (r.durationMs ?? r.wallMs) / 1000))),
    }
  }
}
console.log('\n요청별', JSON.stringify(perPrompt))

const results = {
  date: option('date', new Date().toISOString().slice(0, 10)),
  about: '같은 요청문을 일반 Claude Code와 suta 플러그인을 설치한 Claude Code에 주고, 만든 index.html을 브라우저로 열어 잰 결과. 모델·설정·도구 권한은 두 조건이 같다. 방법은 docs/benchmark.md',
  prompts: JSON.parse(readFileSync(resolve(root, option('prompts', 'evals/benchmark/prompts.json')), 'utf8')).prompts.map((p) => p.id),
  metrics: METRICS.map(({ key, label, en, kind, self, descriptive }) => ({ key, label, en, kind, ...(self ? { self: true } : {}), ...(descriptive ? { descriptive: true } : {}) })),
  ...(hasTone ? { tone: TONE.map(({ key, label, en, ref, kind }) => ({ key, label, en, ref, kind: kind ?? 'median' })) } : {}),
  summary,
  judge,
  judgeAlt,
  perPrompt,
  runs: rows.map((r) => ({
    prompt: r.prompt,
    condition: r.condition,
    rep: r.rep,
    seconds: Math.round((r.durationMs ?? r.wallMs) / 1000),
    turns: r.turns,
    outputTokens: r.tokens.output,
    skillRead: r.skillRead,
    patterns: r.patterns,
    hookBlocks: r.hookBlocks,
    hookWarns: r.hookWarns,
    overflow320: r.overflow320,
    overflow390: r.overflow390,
    coveredByBar: r.coveredByBar,
    tinyText: r.tinyText,
    smallTargets: r.smallTargets,
    boxes: r.boxes,
    nestedBoxes: r.nestedBoxes,
    strongEffects: r.strongEffects,
    fontSizes: r.fontSizes,
    ...(hasTone ? { bodySize: r.bodySize, smallTextShare: r.smallTextShare, accentTextShare: r.accentTextShare, toneSurfaces: r.toneSurfaces, primaryHue: r.primaryHue } : {}),
    centeredParagraphs: r.centeredParagraphs,
    moving: r.moving,
    transitionAll: r.transitionAll,
    layoutMotion: r.layoutMotion,
    gridMotion: r.gridMotion,
    reducedMotion: r.reducedMotion,
    pageErrors: r.pageErrors,
    axe: { serious: r.axe.seriousNodes, all: r.axe.nodes, rules: r.axe.violations.map((v) => v.id) },
    suta: { errors: r.suta.errors, warns: r.suta.warns },
  })),
}
const name = option('name', 'results')
writeFileSync(join(root, `evals/benchmark/${name}.json`), JSON.stringify(results, null, 2) + '\n')
console.log(`→ evals/benchmark/${name}.json`)
