#!/usr/bin/env node
/**
 * 요구 충족률(fidelity) 측정 — 요청문에 적힌 낱개 요구를 화면이 지켰는지 실제 브라우저에서 확인한다.
 *
 * run.mjs가 만든 <out>/runs/<조건>/<요청 id>-<반복>/work/index.html 을 Chromium으로 열고,
 * 요구 목록(evals/benchmark/fidelity/requirements.json)의 요구마다 대상을 찾아 관찰값(계산된 스타일·상자 좌표·글자·속성)을 모은다.
 * 판정(지킴·어김·찾지 못함·판정 필요·미지원)과 집계는 순수 로직 scripts/lib/fidelity.ts가 한다.
 *
 * 대상 찾기(설계 docs/research/2026-11-26-fidelity.md 4.3절) — 생성물마다 클래스 이름이 달라 CSS 선택자를 쓰지 않는다.
 *  1. 역할과 접근 이름(getByRole)
 *  2. 요청문의 데이터 글자(앵커)로 되풀이 단위(카드·행·칩)
 *  3. 관계 — near(가까운 요소), pinned(화면 위·아래에 붙은 fixed·sticky 요소), within(그 안에서만), blank(글자 없이 칠한 상자 — 뼈대)
 * 조작이 앞 요구의 화면을 오염시키지 않게 요구마다 새 페이지에서 시작한다. 묶음(checks·anyOf)의 낱개 확인은 화면 크기·상태·조작이
 * 같으면 한 페이지에서 조작을 한 번만 하고 차례로 본다(groupKey). 조작 중 시간을 재는 확인(motion·timing)은 따로 연다.
 *  - motion: 마지막 조작 직전에 기록을 시작해 document.getAnimations()와 style 속성 변화(스크립트 움직임)를 프레임마다 모은다
 *  - timing: 마지막 조작 뒤 50ms마다 대상이 보이는지 잰다. 시각은 조작 이벤트(pointerdown·keydown 등)가 페이지에 닿은 때부터
 *
 * 결과: 실행 폴더마다 fidelity.json, <out>/fidelity-summary.json, 콘솔에 조건별 요약
 * 사용: node scripts/benchmark/fidelity.mjs --out <폴더> [--spec evals/benchmark/fidelity/requirements.json] [--concurrency 4]
 *       node scripts/benchmark/fidelity.mjs --coverage [--spec …]   # 브라우저 없이 지원·미지원 분류표만
 * 필요: playwright(Chromium). 없으면 `npm i --no-save playwright && npx playwright install chromium`.
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { companionAnchors, coverageOf, findRepeatUnits, groupKey, leavesOf, parseSpec, summarizeFidelity, verdict } from '../lib/fidelity.ts'

const root = new URL('../..', import.meta.url).pathname
const argOf = (name) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const specPath = resolve(argOf('--spec') ?? join(root, 'evals/benchmark/fidelity/requirements.json'))
const coverageOnly = process.argv.includes('--coverage')
const outArg = argOf('--out')
if (!coverageOnly && !outArg) {
  console.error('사용: node scripts/benchmark/fidelity.mjs --out <폴더> [--spec <요구 목록>] | --coverage')
  process.exit(1)
}

const spec = parseSpec({ json: readFileSync(specPath, 'utf8') })
for (const warning of spec.warnings) console.warn(`경고: ${warning}`)
if (spec.errors.length > 0) {
  console.error(`요구 목록 오류 ${spec.errors.length}건:`)
  spec.errors.forEach((error) => console.error(`  - ${error}`))
  process.exit(1)
}

const pct = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 1000) / 10}%`)

if (coverageOnly) {
  const coverage = coverageOf({ spec })
  const total = coverage.byRequest.reduce((sum, r) => ({ total: sum.total + r.total, supported: sum.supported + r.supported, unsupported: sum.unsupported + r.unsupported, judge: sum.judge + r.judge }), { total: 0, supported: 0, unsupported: 0, judge: 0 })
  console.log('요청별 지원 범위')
  console.log('요청 | 요구 | 지원 | 미지원 | 판정 필요 | 지원하는 요구')
  for (const r of coverage.byRequest) {
    const ids = spec.requests.find((q) => q.id === r.id).requirements.filter((q) => q.support === 'supported').map((q) => q.id)
    console.log(`${r.id} | ${r.total} | ${r.supported} | ${r.unsupported} | ${r.judge} | ${ids.join(' ') || '—'}`)
  }
  console.log(`합계 | ${total.total} | ${total.supported} | ${total.unsupported} | ${total.judge}`)
  console.log('\n미지원 이유 상위 10 (요구 하나에 이유가 여럿일 수 있다)')
  coverage.reasons.slice(0, 10).forEach(({ reason, count }, i) => console.log(`${i + 1}. ${reason} — ${count}`))
  const reqs = spec.requests.flatMap((q) => q.requirements.filter((r) => r.support === 'unsupported'))
  const single = new Map()
  for (const r of reqs) if (r.reasons.length === 1) single.set(r.reasons[0], (single.get(r.reasons[0]) ?? 0) + 1)
  console.log(`\n이유가 하나뿐인 미지원 요구 ${[...single.values()].reduce((a, b) => a + b, 0)}개 — 그 키 하나만 지원하면 잴 수 있다`)
  ;[...single].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([reason, count]) => console.log(`  ${reason} — ${count}`))
  process.exit(0)
}

const out = resolve(outArg)
const require = createRequire(import.meta.url)
const globalRoot = (() => {
  try {
    return execSync('npm root -g', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
})()
// measure.mjs와 같은 방식 — 저장소·현재 폴더·BENCH_NODE_PATH·전역 설치 순으로 찾는다
const locate = (name) => {
  const bases = [process.cwd(), root, ...(process.env.BENCH_NODE_PATH ?? '').split(':'), globalRoot].filter(Boolean)
  for (const base of bases) {
    try {
      return require.resolve(name, { paths: [base] })
    } catch {
      /* 다음 위치 */
    }
  }
  throw new Error(`${name}을(를) 찾지 못했다 — npm i --no-save ${name}`)
}
const { chromium } = require(locate('playwright'))
const LOCALE = 'ko-KR'
const PAGE_TIMEOUT = 30_000 // 페이지 하나(조작 + 관찰)의 제한 — 묶음은 페이지가 여럿이라 요구 하나에 걸지 않는다
const MOTION_WINDOW = 1200 // 마지막 조작 뒤 움직임을 모으는 시간(ms). maxMs가 길면 그만큼 늘린다
const SAMPLE_INTERVAL = 50 // timing 표본 간격(ms)
const NEAR_MAX = 48 // near: 기준 요소와 이만큼(px) 안에 있어야 "가까이"다 — 장바구니 아이콘 위 숫자는 겹치거나 맞닿는다

class FindError extends Error {
  // absent: 되풀이 단위에서 그 앵커만 빠졌다(같은 목록의 다른 단위는 찾았다)
  constructor(message, { absent = false } = {}) {
    super(message)
    this.absent = absent
  }
}

// ── 브라우저 안에서 쓰는 도우미 — 문서마다 심는다(addInitScript) ────────────────────────
const helpers = () => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE'])
  const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
  // 화면 글자 — script·style 안 글자는 뺀다. 데이터 배열(const MENU = [...])을 body 끝 script에 두면 body가 모든 글자를 품은 것처럼 잡힌다
  const HIDDEN_TEXT = 'script, style, noscript, template'
  const textOf = (el) => {
    if (!el.querySelector(HIDDEN_TEXT)) return el.textContent ?? ''
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest(HIDDEN_TEXT) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) })
    let out = ''
    for (let n = walker.nextNode(); n; n = walker.nextNode()) out += n.textContent
    return out
  }
  // 화면에 보이는가 — CSS로 숨기지 않았고, 크기가 있고(1px 화면 낭독용 칸은 아니고), 잘라내는 조상 밖이나
  // 화면 밖에 떠 있는 고정 요소(닫힌 시트)가 아니다. 스크롤하면 보이는 요소는 보인다고 본다
  const isShown = (el) => {
    if (!el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })) return false
    const r = el.getBoundingClientRect()
    if (r.width <= 1 && r.height <= 1) return false
    if (r.width === 0 || r.height === 0) return false
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node)
      if (node !== el && (/hidden|clip/.test(cs.overflowX) || /hidden|clip/.test(cs.overflowY))) {
        const p = node.getBoundingClientRect()
        if (r.right <= p.left || r.left >= p.right || r.bottom <= p.top || r.top >= p.bottom) return false
      }
      if (cs.position === 'fixed') return !(r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight)
    }
    return !(r.right + scrollX <= 0 || r.bottom + scrollY <= 0)
  }
  // 같은 자리의 다른 요소에 덮였는가 — 밀어서 드러나는 버튼은 카드 앞면에 덮여 있다. 화면 밖이면 보지 않는다.
  // 화면에 붙은 막대·알림(fixed·sticky)이 덮은 것은 스크롤하면 드러나므로 덮인 것으로 보지 않는다
  const covered = (el) => {
    // 누르기를 받지 않는 요소(pointer-events: none인 알림)는 elementFromPoint에 잡히지 않아 덮였는지 알 수 없다 — 덮이지 않은 것으로 본다
    if (getComputedStyle(el).pointerEvents === 'none') return false
    const r = el.getBoundingClientRect()
    const x = (r.left + r.right) / 2
    const y = (r.top + r.bottom) / 2
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false
    const hit = document.elementFromPoint(x, y)
    if (!hit || el.contains(hit) || hit.contains(el)) return false
    for (let node = hit; node && !node.contains(el); node = node.parentElement) {
      const position = getComputedStyle(node).position
      if (position === 'fixed' || position === 'sticky') return false
    }
    return true
  }
  // 사람이 보는 "보임" — 숨기지 않았고 덮이지도 않았다. 단위·머리를 찾을 때는 덮였는지 보지 않는다(아래 카드가 하단 막대에 덮여도 카드다).
  // 숨긴 라디오·체크박스(투명·화면 낭독용 칸)는 보이는 label이 그 겉모양이라 label이 보이면 보인다
  const isSeen = (el) => (isShown(el) && !covered(el)) || [...(el.labels ?? [])].some((label) => isShown(label) && !covered(label))
  const transparent = (color) => /^transparent$|rgba\([^)]*,\s*0\)$/.test(color)
  // 보이는 바탕색 — 자기 바탕이 투명하면, 상자를 거의 다(90%) 덮는 자식의 바탕(밀어서 지우는 줄: 바깥 li는 투명, 안쪽 앞면에 바탕색),
  // 그것도 없으면 가장 가까운 칠한 조상의 바탕이 보인다(투명한 입력칸 뒤의 검색창 바탕, 숫자 글자 뒤의 빨간 동그라미)
  const surfaceColor = (el) => {
    const own = getComputedStyle(el).backgroundColor
    if (!transparent(own)) return own
    const r = el.getBoundingClientRect()
    for (const child of el.querySelectorAll('*')) {
      const c = child.getBoundingClientRect()
      if (c.width * c.height < r.width * r.height * 0.9 || !isShown(child)) continue
      const color = getComputedStyle(child).backgroundColor
      if (!transparent(color)) return color
    }
    for (let node = el.parentElement; node; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor
      if (!transparent(color)) return color
    }
    return own
  }
  // 조상에서 내려와 보이는 값 — 흐림(backdrop-filter)·필터는 감싼 칸에, 취소선(text-decoration)은 카드에 줘도 글자에 보인다
  const PROPAGATED = ['backdrop-filter', 'filter', 'text-decoration-line']
  const propagated = (el, property) => {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const value = getComputedStyle(node).getPropertyValue(property)
      if (value && value !== 'none') return value
    }
    return getComputedStyle(el).getPropertyValue(property)
  }
  const directText = (el) => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join('')
  // 요소 안에 칠한 색들 — 바탕·테두리·SVG 채움과 선·그라데이션 색·::before/::after·점 글자(●). 글자 없는 표시(상태 점·진행 링)의 색을 본다
  const paintedColors = (el) => {
    const out = new Set()
    const add = (c) => {
      if (c && c !== 'none' && !transparent(c) && !c.startsWith('url')) out.add(c)
    }
    const fromStyle = (cs) => {
      add(cs.backgroundColor)
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') add(cs[`border${side}Color`])
      for (const m of cs.backgroundImage.matchAll(/(rgba?|oklch|color)\([^()]*\)/g)) add(m[0])
    }
    for (const node of [el, ...el.querySelectorAll('*')].slice(0, 400)) {
      if (!isShown(node)) continue
      const cs = getComputedStyle(node)
      fromStyle(cs)
      if (node instanceof SVGElement && !(node instanceof SVGSVGElement)) {
        if (cs.fill !== 'none') add(cs.fill)
        if (cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0) add(cs.stroke)
      }
      if (/^[\s●•⬤◉]+$/.test(directText(node))) add(cs.color)
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(node, pseudo)
        if (ps.content === 'none' || ps.content === 'normal') continue
        fromStyle(ps)
        if (/[●•⬤◉]/.test(ps.content)) add(ps.color)
      }
    }
    return [...out].join(' | ')
  }
  // 접근성 상태 — 속성이 없으면 네이티브 요소의 같은 상태를 읽는다(HTML-AAM이 이렇게 잇는다):
  // 체크박스·라디오(이를 하나 품은 label 카드 포함)의 checked, option의 selected, details 안 summary의 open, :disabled
  const ariaState = (el, property) => {
    if (property === 'value' && 'value' in el) return String(el.value)
    const own = el.getAttribute(property)
    if (own !== null) return own
    const box = 'input[type="checkbox"], input[type="radio"]'
    const inputs = el.matches(box) ? [el] : [...el.querySelectorAll(box)]
    if (property === 'aria-checked' && inputs.length === 1) return String(inputs[0].checked)
    if (property === 'aria-selected' && el.tagName === 'OPTION') return String(el.selected)
    if (property === 'aria-expanded' && el.tagName === 'SUMMARY' && el.parentElement?.tagName === 'DETAILS') return String(el.parentElement.open)
    if (property === 'aria-disabled' && el.matches(':disabled')) return 'true'
    return null
  }
  const LIVE = '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"], output'
  const inLive = (el) => Boolean(el.closest(LIVE))
  const all = (roots) => roots.flatMap((rootEl) => [rootEl, ...rootEl.querySelectorAll('*')]).filter((el) => !SKIP.has(el.tagName) && !el.closest('svg title'))
  // 글자를 품은 가장 깊은 요소들 — 자식 요소도 품고 있으면 자식이 대상이다
  const deepest = (roots, hit) => {
    const hits = new Set(all(roots).filter((el) => hit(norm(textOf(el)), el)))
    return [...hits].filter((el) => ![...el.children].some((child) => hits.has(child)))
  }
  const painted = (cs) =>
    !/rgba\([^)]*,\s*0\)|transparent/.test(cs.backgroundColor) ||
    cs.backgroundImage !== 'none' ||
    cs.boxShadow !== 'none' ||
    ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') ||
    !/^0px( 0px)*$/.test(cs.borderRadius)
  // 되풀이 단위의 눈에 보이는 상자 — li 안에 article 하나만 있으면(같은 상자) 그 사슬에서 칠해진(바탕·테두리·그림자·모서리)
  // 가장 바깥 요소를 쓴다. 칠해진 것이 없으면 단위 그대로
  const visualUnit = (el) => {
    const levels = [el]
    for (let cur = el; ; ) {
      const kids = [...cur.children].filter(isShown)
      if (kids.length !== 1) break
      const a = cur.getBoundingClientRect()
      const b = kids[0].getBoundingClientRect()
      if (Math.abs(a.left - b.left) > 1 || Math.abs(a.right - b.right) > 1 || Math.abs(a.top - b.top) > 1 || Math.abs(a.bottom - b.bottom) > 1) break
      cur = kids[0]
      levels.push(cur)
    }
    return levels.find((level) => painted(getComputedStyle(level))) ?? el
  }
  // 글자 없이 칠한 상자(뼈대) — 바탕색이나 바탕 그림이 있고, 글자·그림·입력칸을 품지 않았다. 크기 조건을 넘는 것 중 가장 안쪽 것만 센다:
  // 뼈대 줄을 품은 흰 목록 칸은 빼고 줄을, 큰 뼈대 카드 안의 작은 막대(크기 조건 밖)는 세지 않고 카드를 센다. 화면 절반을 넘는 칸도 뺀다
  const blanks = (roots, { minWidth = 0, minHeight = 0 }) => {
    const filled = (cs) => !transparent(cs.backgroundColor) || cs.backgroundImage !== 'none'
    const area = innerWidth * innerHeight
    const found = all(roots).filter((el) => {
      if (el === document.body || /^(INPUT|TEXTAREA|SELECT|BUTTON|IMG|VIDEO|CANVAS|IFRAME|HR|svg)$/i.test(el.tagName)) return false
      if (norm(textOf(el)) !== '' || el.querySelector('img, svg, video, canvas, picture, input, textarea, select, button')) return false
      if (!isShown(el)) return false
      const r = el.getBoundingClientRect()
      if (r.width < minWidth || r.height < minHeight || r.width * r.height > area * 0.5) return false
      return filled(getComputedStyle(el))
    })
    return found.filter((el) => !found.some((other) => other !== el && el.contains(other)))
  }
  // 글자만 감싼 상자 — 칸(td)은 폭이 꽉 차 있어 오른쪽 정렬을 칸 상자로는 가를 수 없다
  const textBox = (el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const r = range.getBoundingClientRect()
    return r.width === 0 && r.height === 0 ? null : { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY }
  }
  // 가운데 점이 자기를 가리키는가 — 화면에 붙은 막대에 가려진 것도 가려진 것으로 본다(isSeen과 다르다)
  // 가운데 세로줄의 위·가운데·아래(20%·50%·80%) 세 점이 모두 자기를 가리켜야 덮이지 않은 것이다 — 입력칸 아래쪽만 막대에 가려도 가려진 것
  const hitSelf = (el) => {
    const r = el.getBoundingClientRect()
    const x = (r.left + r.right) / 2
    return [0.2, 0.5, 0.8].every((at) => {
      const y = r.top + (r.bottom - r.top) * at
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false
      const hit = document.elementFromPoint(x, y)
      return Boolean(hit) && (el === hit || el.contains(hit))
    })
  }
  // 대상들을 품은 칸이 가로로 넘어가게 되어 있는가 — 공통 조상에서 body 앞까지 overflow-x가 auto·scroll인 칸
  const scrollableX = (els) => {
    if (els.length === 0) return false
    let common = els[0].parentElement
    while (common && !els.every((el) => common.contains(el))) common = common.parentElement
    for (let node = common; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(node).overflowX)) return true
    }
    return false
  }
  const biggestScroller = () =>
    [...document.querySelectorAll('*')].filter((el) => /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1).sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth)[0] ?? null

  // ── 조작 시각과 움직임 기록 ──
  // 조작 이벤트가 페이지에 닿은 시각을 t0로 — Playwright의 대기(보일 때까지·멈출 때까지)를 시간에 넣지 않으려고
  const markTrigger = () => {
    window.__fid.t0 = null
    window.__fid.t0start = performance.now()
    const mark = () => {
      if (window.__fid.t0 === null) window.__fid.t0 = performance.now()
    }
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click', 'pointermove']) addEventListener(type, mark, { capture: true, once: true })
  }
  const elapsed = () => performance.now() - (window.__fid.t0 ?? window.__fid.t0start)
  const centerOf = (el) => {
    const r = el.getBoundingClientRect()
    return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }
  }
  const kebab = (name) => name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
  const declarations = (style) =>
    Object.fromEntries(
      style
        .split(';')
        .map((d) => d.split(':'))
        .filter((d) => d.length >= 2)
        .map(([k, ...v]) => [k.trim().toLowerCase(), v.join(':').trim()]),
    )
  // 기록 시작 — 이미 돌던 애니메이션(진행 표시 등)은 빼려고 먼저 등록해 둔다. 프레임마다 새 애니메이션을 등록하고 대상 상자 가운데를 모은다.
  // 스크립트 움직임(매 프레임 style을 바꿈)은 style 속성 변화로 모은다. 스크롤 위치(창 + 가장 큰 스크롤 칸)도 프레임마다
  const startRecording = () => {
    markTrigger()
    const rec = { anims: new Map(), muts: new Map(), scroll: [], stop: false, observer: null }
    for (const a of document.getAnimations()) rec.anims.set(a, { pre: true })
    const scroller = biggestScroller()
    const register = (a, t) => {
      const effect = a.effect
      let props = []
      try {
        props = [...new Set(effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k))
      } catch {
        /* 키프레임을 못 읽는 효과 */
      }
      if (a.transitionProperty) props = [a.transitionProperty]
      const timing = effect?.getComputedTiming?.() ?? {}
      const infinite = timing.iterations === Infinity || timing.activeDuration === Infinity
      rec.anims.set(a, {
        el: effect?.target ?? null,
        pseudo: Boolean(effect?.pseudoElement),
        props: props.map(kebab),
        ms: infinite ? null : (timing.delay ?? 0) + (timing.activeDuration ?? 0) + (timing.endDelay ?? 0),
        start: a.startTime ?? t,
        frames: [],
      })
    }
    const frame = () => {
      if (rec.stop) return
      const t = performance.now()
      for (const a of document.getAnimations()) if (!rec.anims.has(a)) register(a, t)
      for (const info of rec.anims.values()) if (!info.pre && info.el && !info.pseudo && info.el.isConnected) info.frames.push(centerOf(info.el))
      rec.scroll.push(scrollY + (scroller?.scrollTop ?? 0))
      requestAnimationFrame(frame)
    }
    rec.observer = new MutationObserver((list) => {
      const t = performance.now()
      for (const m of list) {
        if (!(m.target instanceof Element)) continue
        const entries = rec.muts.get(m.target) ?? []
        entries.push({ t, style: m.target.getAttribute('style') ?? '', center: centerOf(m.target) })
        rec.muts.set(m.target, entries)
      }
    })
    rec.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'], subtree: true })
    window.__fid.rec = rec
    requestAnimationFrame(frame)
  }
  // 기록 끝 — 대상(없으면 화면 전체)과 이어진 움직임만. 대상의 자손·조상이 움직여도 대상의 움직임이다(시트의 안쪽 판, 바깥 막)
  const motions = (targets) => {
    const rec = window.__fid.rec
    rec.stop = true
    rec.observer.disconnect()
    const t0 = window.__fid.t0 ?? window.__fid.t0start
    const related = (el) => targets.length === 0 || targets.some((h) => h === el || h.contains(el) || el.contains(h))
    const travel = (centers) => {
      if (centers.length === 0) return { shift: null, dx: null, dy: null }
      const last = centers[centers.length - 1]
      const shift = Math.max(...centers.map((c) => Math.hypot(c.x - last.x, c.y - last.y)))
      return { shift, dx: centers[0].x - last.x, dy: centers[0].y - last.y }
    }
    const out = []
    for (const info of rec.anims.values()) {
      if (info.pre || !info.el || !related(info.el)) continue
      out.push({ props: info.props, ms: info.ms, startMs: info.start - t0, ...(info.pseudo ? { shift: null, dx: null, dy: null } : travel(info.frames)) })
    }
    for (const [el, entries] of rec.muts) {
      if (!related(el) || entries.length < 3) continue
      const decls = entries.map((e) => declarations(e.style))
      const keys = [...new Set(decls.flatMap((d) => Object.keys(d)))].filter((k) => new Set(decls.map((d) => d[k] ?? '')).size > 1)
      if (keys.length === 0) continue
      const centers = [...entries.map((e) => e.center), el.isConnected ? centerOf(el) : entries[entries.length - 1].center]
      out.push({ props: keys, ms: entries[entries.length - 1].t - entries[0].t + 16, startMs: entries[0].t - t0, ...travel(centers) })
    }
    return { motions: out, scroll: rec.scroll }
  }
  window.__fid = { norm, textOf, isShown, isSeen, surfaceColor, propagated, PROPAGATED, paintedColors, ariaState, inLive, deepest, visualUnit, blanks, textBox, hitSelf, scrollableX, biggestScroller, markTrigger, elapsed, startRecording, motions, els: [] }
}

const handlesOf = async (jsHandle) => {
  const props = await jsHandle.getProperties()
  const handles = [...props.values()].map((p) => p.asElement()).filter(Boolean)
  await jsHandle.dispose()
  return handles
}

// 문서 순서로 줄 세우고, 겹친 것을 빼고, scope(within) 안의 것만 남긴다
const arrange = async ({ page, handles, scope }) => {
  if (handles.length === 0) return []
  const keep = await page.evaluate(
    ({ els, scope }) => {
      const seen = new Set()
      return els
        .map((el, i) => ({ el, i }))
        .filter(({ el }) => (seen.has(el) ? false : (seen.add(el), true)))
        .filter(({ el }) => !scope || scope.some((s) => s.contains(el)))
        .sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .map(({ i }) => i)
    },
    { els: handles, scope },
  )
  return keep.map((i) => handles[i])
}

const shownOf = async ({ page, handles }) => (handles.length === 0 ? [] : page.evaluate((els) => els.map((el) => window.__fid.isSeen(el)), handles))

// 보이는 것을 앞에 — nth와 "첫 대상"은 보이는 것 중에서 고른다
const visibleFirst = async ({ page, handles }) => {
  const shown = await shownOf({ page, handles })
  return [...handles.filter((_, i) => shown[i]), ...handles.filter((_, i) => !shown[i])]
}

// summary(펼침 단추)는 Playwright가 button 역할로 찾지 않는다 — 접근 이름 대신 글자로 거른다
const summaries = async ({ page, target }) => {
  const handles = await page.locator('summary').elementHandles()
  const kept = []
  for (const handle of handles) {
    const text = await handle.evaluate((el) => window.__fid.norm(window.__fid.textOf(el)))
    const ok = target.nameMatches !== undefined ? new RegExp(target.nameMatches).test(text) : target.name === undefined ? true : target.exact === true ? text === target.name : text.includes(target.name)
    if (ok) kept.push(handle)
  }
  return kept
}

const byRole = async ({ page, target, scope }) => {
  const roles = String(target.role).split('|')
  const handles = []
  const options = target.nameMatches !== undefined ? { name: new RegExp(target.nameMatches) } : target.name === undefined ? {} : { name: target.name, exact: target.exact === true }
  for (const role of roles) handles.push(...(await page.getByRole(role, options).elementHandles()))
  if (roles.includes('button')) handles.push(...(await summaries({ page, target })))
  // exact인데 못 찾으면, 접근 이름에 메뉴 이름을 덧붙인 버튼(aria-label "소금빵 담기")을 보이는 글자로 다시 찾는다.
  // exact는 "장바구니에 담기" 같은 다른 버튼을 빼려는 것이라, 보이는 글자가 정확히 같으면 그 뜻을 지킨다
  if (handles.length === 0 && target.exact === true && target.name !== undefined) {
    for (const role of roles) {
      for (const handle of await page.getByRole(role, { name: target.name }).elementHandles()) {
        if ((await handle.evaluate((el) => window.__fid.norm(window.__fid.textOf(el)))) === target.name) handles.push(handle)
      }
    }
  }
  return arrange({ page, handles, scope })
}

const byText = async ({ page, text, pattern, scope }) => {
  const found = await page.evaluateHandle(
    ({ text, pattern, scope }) => {
      const re = pattern ? new RegExp(pattern) : null
      return window.__fid.deepest(scope ?? [document.body], (t) => (re ? re.test(t) : t.includes(text)))
    },
    { text, pattern, scope },
  )
  return arrange({ page, handles: await handlesOf(found), scope })
}

const byPinned = async ({ page, side, scope }) => {
  const found = await page.evaluateHandle(
    ({ side, scope }) => {
      const vw = document.documentElement.clientWidth
      const vh = Math.min(innerHeight, document.documentElement.clientHeight || innerHeight)
      const pinned = [...(scope?.[0] ?? document.body).querySelectorAll('*')].filter((el) => {
        const cs = getComputedStyle(el)
        if (cs.position !== 'fixed' && cs.position !== 'sticky') return false
        if (!window.__fid.isShown(el)) return false
        const r = el.getBoundingClientRect()
        // 화면 폭의 절반은 넘어야 머리·막대다 — 오른쪽 아래 둥근 버튼(FAB)은 아니다
        if (r.width < vw * 0.5) return false
        return side === 'top' ? r.top <= 2 && r.bottom > 0 : r.bottom >= vh - 2 && r.top < vh
      })
      const outer = pinned.filter((el) => !pinned.some((other) => other !== el && other.contains(el)))
      // 머리와 칩 줄을 한 sticky 묶음에 넣은 화면이 많다 — 묶음 맨 위에 머리(header·banner)가 따로 있으면 그것이 "맨 위 머리"다
      const head = (el) => {
        if (side !== 'top' || el.matches('header, [role="banner"]')) return el
        const inner = [...el.querySelectorAll('header, [role="banner"]')].find((h) => window.__fid.isShown(h) && Math.abs(h.getBoundingClientRect().top - el.getBoundingClientRect().top) <= 2)
        return inner ?? el
      }
      return outer
        .sort((a, b) => (side === 'top' ? a.getBoundingClientRect().top - b.getBoundingClientRect().top : b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom))
        .map(head)
    },
    { side, scope },
  )
  return handlesOf(found)
}

const byBlank = async ({ page, blank, scope }) => handlesOf(await page.evaluateHandle(({ blank, scope }) => window.__fid.blanks(scope ?? [document.body], blank), { blank, scope }))

// 찾은 요소를 거른다 — containsText(그 글자를 품음), live(실시간 알림 칸 안: aria-live·status·alert·log·output)
const filterTarget = async ({ page, target, handles }) => {
  if (handles.length === 0 || (target.containsText === undefined && target.live === undefined)) return handles
  const keep = await page.evaluate(
    ({ els, text, live }) => els.map((el) => (text === undefined || window.__fid.norm(window.__fid.textOf(el)).includes(text)) && (!live || window.__fid.inLive(el))),
    { els: handles, text: target.containsText, live: target.live === true },
  )
  return handles.filter((_, i) => keep[i])
}

const byUnits = async ({ page, anchors, pools, scope }) => {
  const asked = anchors
  const withCompanions = companionAnchors({ anchors: asked, pools })
  const candidates = await page.evaluate(
    ({ anchors, scope }) => {
      const fid = window.__fid
      fid.els = []
      const idOf = (el) => {
        let i = fid.els.indexOf(el)
        if (i < 0) i = fid.els.push(el) - 1
        return i
      }
      const strip = (s) => s.replace(/[^\p{L}\p{N}]+/gu, '')
      const out = []
      for (const anchor of anchors) {
        const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // 앵커는 낱말 경계로 찾는다 — "식빵"이 "우유식빵"에 걸리지 않게(앞뒤가 글자가 아니어야 한다).
        // 숫자는 붙어도 된다 — 탭 이름과 개수를 띄우지 않고 이어 쓰면(전체<span>12</span>) 글자가 "전체12"가 된다
        const re = new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, 'u')
        // 요소 자신의 글자 마디가 앵커와 같아도 찾은 것이다 — 라벨 뒤에 표시를 띄우지 않고 붙이면
        // (연락처<span>필수</span>) 요소 글자가 "연락처필수"가 되어 낱말 경계로는 놓친다(시험 실행의 두 조건 모두에서 났다)
        const ownText = (el) => [...el.childNodes].some((node) => node.nodeType === 3 && fid.norm(node.textContent) === anchor)
        for (const el of fid.deepest(scope ?? [document.body], (t, el) => re.test(t) || ownText(el))) {
          if (!fid.isShown(el)) continue
          const t = fid.norm(fid.textOf(el))
          const chain = []
          for (let node = el; node && node !== document.documentElement; node = node.parentElement) chain.push(idOf(node))
          out.push({ anchor, chain, exact: t === anchor || strip(t) === strip(anchor) })
        }
      }
      return out
    },
    { anchors: withCompanions, scope },
  )
  const { units } = findRepeatUnits({ anchors: withCompanions, candidates })
  const missing = asked.filter((anchor) => units[anchor] === null || units[anchor] === undefined)
  if (missing.length > 0) {
    const others = withCompanions.filter((anchor) => !missing.includes(anchor) && units[anchor] !== null && units[anchor] !== undefined)
    throw new FindError(`되풀이 단위를 찾지 못한 앵커: ${missing.join(', ')}`, { absent: others.length > 0 })
  }
  const found = await page.evaluateHandle((ids) => ids.map((id) => window.__fid.visualUnit(window.__fid.els[id])), asked.map((anchor) => units[anchor]))
  return handlesOf(found)
}

// near: 기준 요소와 겹치거나 가장 가까운 것 하나. 기준을 품은 조상은 뺀다 — 기준을 품은 구역 전체가 거리 0으로 잡히지 않게.
// 기준 자신과 자손(숫자 옆 <small>예시</small>)은 그대로 둔다
const nearest = async ({ page, handles, ref }) => {
  if (handles.length === 0) return []
  const order = await page.evaluate(
    ({ els, ref, max }) => {
      const a = ref.getBoundingClientRect()
      const gap = (r) => Math.hypot(Math.max(0, a.left - r.right, r.left - a.right), Math.max(0, a.top - r.bottom, r.top - a.bottom))
      return els
        .map((el, i) => ({ i, el, d: gap(el.getBoundingClientRect()), shown: window.__fid.isShown(el) }))
        .filter((x) => x.el === ref || !x.el.contains(ref))
        .filter((x) => x.shown && x.d <= max)
        .sort((x, y) => x.d - y.d)
        .map((x) => x.i)
    },
    { els: handles, ref, max: NEAR_MAX },
  )
  return order.slice(0, 1).map((i) => handles[i])
}

/** 대상 → 요소 목록. 기준 대상(within·near)이나 단위를 못 찾으면 FindError. 그냥 없으면 빈 목록 */
const resolveTarget = async ({ ctx, target }) => {
  const { page } = ctx
  // __scope: 단위 안 요소(inner)를 찾을 때 단위 요소를 바로 넘기는 내부 키 — 요구 목록 문법이 아니다
  let scope = target.__scope ? [target.__scope] : null
  if (target.within) {
    scope = await visibleFirst({ page, handles: await resolveTarget({ ctx, target: target.within }) })
    if (scope.length === 0) throw new FindError('within 대상을 찾지 못함')
    scope = scope.slice(0, 1)
  }
  let found = []
  if (target.unit) found = await byUnits({ page, anchors: target.unit, pools: ctx.pools, scope })
  else if (target.role) found = await byRole({ page, target, scope })
  else if (target.dialog) found = await byRole({ page, target: { role: 'dialog|alertdialog' }, scope })
  else if (target.pinned) found = await byPinned({ page, side: target.pinned, scope })
  else if (target.blank) found = await byBlank({ page, blank: target.blank, scope })
  else if (target.text !== undefined) found = await byText({ page, text: target.text, scope })
  else if (target.textMatches) found = await byText({ page, pattern: target.textMatches, scope })
  // 거르기 전에 보이는 대상이 있었는데 조건 뒤 하나도 안 남으면 그 사유를 남긴다 — "없음"이 아니라 "조건에 안 맞음"이다
  const before = (await shownOf({ page, handles: found })).filter(Boolean).length
  let mismatch = null
  found = await filterTarget({ page, target, handles: found })
  if (before > 0 && found.length === 0) mismatch = `${target.containsText !== undefined ? `"${target.containsText}"를 품은` : '실시간 알림 칸 안의'} 대상이 없다(기준으로 찾은 대상 ${before}개)`
  if (target.near) {
    const refs = await visibleFirst({ page, handles: await resolveTarget({ ctx, target: target.near }) })
    if (refs.length === 0) throw new FindError('near 기준 대상을 찾지 못함')
    const candidates = (await shownOf({ page, handles: found })).filter(Boolean).length
    found = await nearest({ page, handles: found, ref: refs[0] })
    if (candidates > 0 && found.length === 0) mismatch = `기준 대상에서 ${NEAR_MAX}px 안에 없다(멀리 ${candidates}개)`
  }
  if (target.inner) {
    const inner = []
    for (const unit of found) {
      const within = await resolveTarget({ ctx, target: { ...target.inner, nth: undefined, __scope: unit } })
      const picked = await visibleFirst({ page, handles: within })
      const one = picked[typeof target.inner.nth === 'number' ? target.inner.nth : 0]
      if (!one) throw new FindError('단위 안 요소(inner)를 찾지 못한 단위가 있음')
      inner.push(one)
    }
    return inner
  }
  if (typeof target.nth === 'number') {
    const pool = await visibleFirst({ page, handles: found })
    return pool[target.nth] ? [pool[target.nth]] : []
  }
  if (mismatch) found.mismatch = mismatch
  return found
}

const firstShown = async ({ page, handles }) => (await visibleFirst({ page, handles }))[0] ?? null

const centerOf = async (handle) => {
  await handle.scrollIntoViewIfNeeded().catch(() => {})
  const b = await handle.boundingBox()
  if (!b) throw new FindError('조작 대상의 상자가 없음')
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

// 휴대폰 화면에서는 손가락(터치)으로 누르고 끈다 — 마우스 이벤트만으로는 touch·pointer(touch) 처리 코드가 돌지 않는다
const touch = async ({ ctx, type, x, y }) => {
  ctx.cdp ??= await ctx.page.context().newCDPSession(ctx.page)
  await ctx.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
}

const press = async ({ ctx, handle, ms, dx = 0, dy = 0, from }) => {
  const { page, mobile } = ctx
  const center = await centerOf(handle)
  // from "top": 시트의 손잡이 자리(위 끝에서 16px 아래)부터 끈다 — 가운데는 칩·버튼일 수 있다
  const box = from === 'top' ? await handle.boundingBox() : null
  const { x, y } = box ? { x: center.x, y: Math.max(1, box.y) + 16 } : center
  const moves = dx === 0 && dy === 0 ? 0 : 10
  if (mobile) {
    await touch({ ctx, type: 'touchStart', x, y })
    if (ms) await page.waitForTimeout(ms)
    // 실제 휴대폰은 길게 누른 뒤 손을 떼도 click을 보내지 않는다. CDP 터치 흉내는 보내므로(바깥 click으로 닫는 메뉴가 바로 닫힌다) 한 번 막는다
    if (ms && ms >= 500) {
      await page.evaluate(() => {
        const stop = (event) => {
          event.stopImmediatePropagation()
          event.preventDefault()
        }
        addEventListener('click', stop, { capture: true, once: true })
        setTimeout(() => removeEventListener('click', stop, { capture: true }), 400)
      })
    }
    for (let i = 1; i <= moves; i += 1) {
      await touch({ ctx, type: 'touchMove', x: x + (dx * i) / moves, y: y + (dy * i) / moves })
      await page.waitForTimeout(16)
    }
    await touch({ ctx, type: 'touchEnd', x, y })
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    if (ms) await page.waitForTimeout(ms)
    if (moves > 0) await page.mouse.move(x + dx, y + dy, { steps: moves })
    await page.mouse.up()
  }
}

const scrollBy = async ({ page, y }) =>
  page.evaluate((y) => {
    // 창이 스크롤되면 창을, 아니면(본문을 overflow 칸 안에서 넘기는 앱 화면) 가장 큰 세로 스크롤 칸을 넘긴다
    const doc = document.scrollingElement ?? document.documentElement
    const distance = y === 'end' ? 1e6 : y
    if (doc.scrollHeight > doc.clientHeight + 1) {
      window.scrollBy({ top: distance, behavior: 'instant' })
      return
    }
    const scrollers = [...document.querySelectorAll('*')].filter((el) => /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
    const biggest = scrollers.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth)[0]
    if (biggest) biggest.scrollBy({ top: distance, behavior: 'instant' })
  }, y)

/**
 * 조작을 차례로 한다. 조작 대상을 못 찾으면 그 이유를, 다 하면 null.
 * beforeLast: 마지막 조작 바로 앞(대상을 찾은 뒤)에 부른다 — 움직임·시각 기록을 마지막 조작부터 시작하려고. 그때는 마지막 조작 뒤에 기다리지 않는다
 */
const runSteps = async ({ ctx, steps, beforeLast }) => {
  const { page } = ctx
  for (const [i, step] of steps.entries()) {
    const last = i === steps.length - 1
    const label = `조작 ${i + 1}(${step.do})`
    let handle = null
    if (step.target) {
      try {
        handle = await firstShown({ page, handles: await resolveTarget({ ctx, target: step.target }) })
      } catch (error) {
        if (error instanceof FindError) return `${label}: ${error.message}`
        throw error
      }
      if (!handle) return `${label} 대상을 찾지 못함`
    }
    if (last && beforeLast) await beforeLast()
    // 숨긴 라디오·체크박스는 누를 수 없다 — 사람처럼 보이는 label을 누른다
    if (handle && (step.do === 'click' || step.do === 'longPress' || step.do === 'drag')) {
      const label = await handle.evaluateHandle((el) => (!window.__fid.isShown(el) && el.labels?.length ? [...el.labels].find((l) => window.__fid.isShown(l)) ?? null : null))
      if (label.asElement()) handle = label.asElement()
    }
    // 누를 것이 아닌 칸(표 머리 th) 안에 누를 것이 하나뿐이면 그것을 누른다 — 사람은 머리의 '금액' 단추를 누른다(th 가운데는 빈칸일 수 있다)
    if (handle && step.do === 'click') {
      const inner = await handle.evaluateHandle((el) => {
        const INTERACTIVE = 'a[href], button, input, select, textarea, summary, [role="button"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="option"], [role="menuitem"]'
        if (el.matches(INTERACTIVE)) return el
        const inside = [...el.querySelectorAll(INTERACTIVE)].filter((x) => window.__fid.isShown(x))
        return inside.length === 1 ? inside[0] : el
      })
      if (inner.asElement()) handle = inner.asElement()
    }
    // 포커스를 받지 못하는 칸(시간 칸을 감싼 div)이면 안의 첫 포커스 요소로
    if (handle && step.do === 'focus') {
      const inner = await handle.evaluateHandle((el) => (el.matches('a[href], button, input, select, textarea, summary, [tabindex]') ? el : el.querySelector('a[href], button, input, select, textarea, summary, [tabindex]') ?? el))
      if (inner.asElement()) handle = inner.asElement()
    }
    // 조작이 실패하면(다른 요소가 가로챔·시간 초과) 몇 번째 조작인지 붙여 던진다 — 결과는 찾지 못함(오류)이 된다
    try {
      if (step.do === 'click') await handle.click({ timeout: 3000 })
      else if (step.do === 'hover') await handle.hover({ timeout: 3000 })
      else if (step.do === 'focus') await handle.focus()
      else if (step.do === 'type') {
        await handle.focus()
        await page.keyboard.type(String(step.text), { delay: 10 })
      } else if (step.do === 'press') await page.keyboard.press(step.key)
      else if (step.do === 'wait') await page.waitForTimeout(step.ms ?? 0)
      else if (step.do === 'scroll') await scrollBy({ page, y: step.y })
      else if (step.do === 'longPress') await press({ ctx, handle, ms: step.ms ?? 600 })
      else if (step.do === 'drag') await press({ ctx, handle, dx: step.dx ?? 0, dy: step.dy ?? 0, from: step.from })
    } catch (error) {
      throw new Error(`${label}: ${String(error.message ?? error).split('\n')[0]}`)
    }
    // 조작에 반응하는 처리(이벤트 처리·상태 갱신)가 한 번은 돌 틈
    if (step.do !== 'wait' && !(last && beforeLast)) await page.waitForTimeout(50)
  }
  // 조작이 일으킨 전환이 끝난 값을 본다 — 50ms 뒤에 바로 읽으면 120ms짜리 바탕색 전환의 중간색(#137870)을 읽어
  // 지킨 화면이 실행마다 지킴·어김을 오갔다(시험 실행). 움직임·시각을 재는 확인(beforeLast)은 기다리지 않는다.
  // 전환만 기다린다 — 되풀이되는 애니메이션(뼈대 깜빡임)은 끝나지 않는다. 최대 1초
  if (!beforeLast && steps.length > 0) {
    await page
      .evaluate(() => {
        const running = document.getAnimations().filter((a) => a instanceof CSSTransition && a.playState === 'running')
        const cap = new Promise((resolve) => setTimeout(resolve, 1000))
        return Promise.race([Promise.all(running.map((a) => a.finished.catch(() => {}))), cap]).then(() => null)
      })
      .catch(() => {})
  }
  return null
}

const toList = (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value])

/** 대상을 찾아 type에 맞는 관찰값을 모은다. 대상을 못 찾으면 targetMissing을 붙인다(조작 대상을 못 찾은 것과 가른다) */
const collect = async ({ ctx, check }) => {
  let handles
  try {
    handles = await resolveTarget({ ctx, target: check.target })
  } catch (error) {
    if (error instanceof FindError) return { missing: error.message, targetMissing: true, ...(error.absent ? { absent: true } : {}) }
    throw error
  }
  const mismatch = handles.mismatch
  const properties = toList(check.property)
  // 되풀이 단위는 앵커 순서대로 돌아온다 — 순서·앞자리(order)를 이름으로 가르려고 앵커를 붙인다
  const labels = check.target?.unit && handles.length === check.target.unit.length ? check.target.unit : null
  const elements = await Promise.all(
    handles.map((handle, i) =>
      handle.evaluate(
        (el, { properties, type, label }) => {
          const fid = window.__fid
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          const values = {}
          for (const property of properties) {
            if (type === 'attr') values[property] = fid.ariaState(el, property)
            // 폭·높이는 보이는 상자(테두리 포함)로 — 계산된 height는 box-sizing에 따라 안쪽 여백을 뺀다
            else if (property === 'width' || property === 'height') values[property] = `${property === 'width' ? r.width : r.height}px`
            else if (property === 'background-color') values[property] = fid.surfaceColor(el)
            else if (property === 'painted-colors') values[property] = fid.paintedColors(el)
            else if (fid.PROPAGATED.includes(property)) values[property] = fid.propagated(el, property)
            else values[property] = cs.getPropertyValue(property)
          }
          const active = document.activeElement
          return {
            visible: fid.isSeen(el),
            // 입력칸(라디오·체크박스)은 글자가 없다 — 겉에 보이는 글자는 label이다
            text: fid.norm(fid.textOf(el)) || fid.norm([...(el.labels ?? [])].map((label) => fid.textOf(label)).join(' ')),
            box: { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY },
            view: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
            ...(type === 'order' ? { textBox: fid.textBox(el) ?? undefined } : {}),
            ...(label ? { label } : {}),
            focused: Boolean(active) && (el === active || el.contains(active)),
            hit: fid.hitSelf(el),
            values,
          }
        },
        { properties, type: check.type, label: labels?.[i] ?? null },
      ),
    ),
  )
  const page = ctx.page
  const viewport = await page.evaluate(() => ({ width: document.documentElement.clientWidth, height: Math.min(innerHeight, document.documentElement.clientHeight || innerHeight) }))
  const extra = check.type === 'order' && handles.length > 0 ? { scrollableX: await page.evaluate((els) => window.__fid.scrollableX(els), handles) } : {}
  return { elements, viewport, ...extra, ...(mismatch ? { mismatch } : {}) }
}

const settle = async (page) => {
  // 처음 그리기가 끝날 때까지 — 본문 HTML 길이가 300ms 동안 그대로면 멈춘다(최대 2초)
  await page.waitForTimeout(300)
  let last = -1
  let stable = 0
  for (let waited = 0; waited < 2000 && stable < 300; waited += 100) {
    const length = await page.evaluate(() => document.body?.innerHTML.length ?? 0)
    stable = length === last ? stable + 100 : 0
    last = length
    await page.waitForTimeout(100)
  }
}

/** 확인 하나에 맞춰 새 페이지를 연다 — 화면 크기, 휴대폰이면 터치, 동작 줄이기, ?state= */
const openPage = async ({ browser, url, check, request }) => {
  const width = check.viewport ?? (request.platform === 'web' ? 1280 : 390)
  const mobile = width < 600
  const context = await browser.newContext({
    viewport: { width, height: mobile ? 844 : 800 },
    isMobile: mobile,
    hasTouch: mobile,
    locale: LOCALE,
    reducedMotion: check.reducedMotion === true ? 'reduce' : 'no-preference',
  })
  // 도우미는 문서마다 심는다 — 조작이 다른 문서로 넘어가도(링크·새로 고침) 남는다
  await context.addInitScript(helpers)
  const page = await context.newPage()
  const ctx = { page, mobile, pools: request.pools, cdp: null }
  await page.goto(check.state ? `${url}?state=${check.state}` : url, { waitUntil: 'load' })
  await settle(page)
  return { context, ctx }
}

/** motion: 마지막 조작 직전부터 움직임을 기록하고, 정해진 시간 뒤 대상과 이어진 움직임만 꺼낸다 */
const observeMotion = async ({ ctx, check }) => {
  const { page } = ctx
  const missing = await runSteps({ ctx, steps: check.steps, beforeLast: () => page.evaluate(() => window.__fid.startRecording()) })
  if (missing) return { missing }
  await page.waitForTimeout(Math.max(MOTION_WINDOW, (check.expect?.maxMs ?? 0) + 600))
  let handles = []
  if (check.target) {
    try {
      handles = await resolveTarget({ ctx, target: check.target })
    } catch (error) {
      if (error instanceof FindError) return { missing: error.message, targetMissing: true }
      throw error
    }
    if (handles.length === 0) return { missing: '움직임을 볼 대상을 찾지 못함', targetMissing: true }
  }
  return page.evaluate((els) => window.__fid.motions(els), handles)
}

/** timing: 마지막 조작 뒤 50ms마다 대상을 다시 찾아 보이는지 잰다. 시각은 페이지 안에서(조작 이벤트부터) */
const observeTiming = async ({ ctx, check }) => {
  const { page } = ctx
  const missing = await runSteps({ ctx, steps: check.steps, beforeLast: () => page.evaluate(() => window.__fid.markTrigger()) })
  if (missing) return { missing }
  const expect = check.expect ?? {}
  const until = Math.min(9000, Math.max(Array.isArray(expect.goneMs) ? expect.goneMs[1] : 0, expect.appearMs ?? 0) + 600)
  const samples = []
  for (;;) {
    let handles = []
    try {
      handles = await resolveTarget({ ctx, target: check.target })
    } catch (error) {
      if (!(error instanceof FindError)) throw error
    }
    const sample = await page.evaluate((els) => ({ t: window.__fid.elapsed(), visible: els.some((el) => window.__fid.isSeen(el)) }), handles)
    samples.push(sample)
    if (sample.t >= until) break
    await page.waitForTimeout(SAMPLE_INTERVAL)
  }
  return { samples }
}

/** 낱개 확인 하나 — 새 페이지에서 조작하고 관찰한다 */
const observeLeaf = async ({ browser, url, check, request }) => {
  const { context, ctx } = await openPage({ browser, url, check, request })
  try {
    if (check.type === 'motion') return await observeMotion({ ctx, check })
    if (check.type === 'timing') return await observeTiming({ ctx, check })
    if (check.steps) {
      const missing = await runSteps({ ctx, steps: check.steps })
      if (missing) return { missing }
    }
    const first = await collect({ ctx, check })
    if (first.missing || !check.then) return first
    const missing = await runSteps({ ctx, steps: check.then.steps ?? [] })
    return { ...first, then: missing ? { missing } : await collect({ ctx, check }) }
  } finally {
    await context.close()
  }
}

/** 같은 열쇠(화면 크기·상태·동작 줄이기·조작)의 낱개 확인들 — 조작을 한 번 하고 차례로 관찰한다 */
const observeGroup = async ({ browser, url, leaves, request }) => {
  const { context, ctx } = await openPage({ browser, url, check: leaves[0].check, request })
  try {
    const missing = leaves[0].check.steps ? await runSteps({ ctx, steps: leaves[0].check.steps }) : null
    const out = {}
    for (const leaf of leaves) {
      try {
        out[leaf.path] = missing ? { missing } : await collect({ ctx, check: leaf.check })
      } catch (error) {
        out[leaf.path] = { error: String(error.message ?? error).split('\n')[0].slice(0, 200) }
      }
    }
    return out
  } finally {
    await context.close()
  }
}

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${ms / 1000}초 안에 끝나지 않음`)), ms))])
const errorOf = (error) => ({ error: String(error.message ?? error).split('\n')[0].slice(0, 200) })

/** 요구 하나 — 묶음이면 낱개 확인을 열쇠로 모아 페이지마다 관찰하고 경로별 관찰(leaves)을 돌려준다 */
const observe = async ({ browser, url, requirement, request }) => {
  const check = requirement.check
  if (check.checks === undefined && check.anyOf === undefined) {
    try {
      return await withTimeout(observeLeaf({ browser, url, check, request }), PAGE_TIMEOUT)
    } catch (error) {
      return errorOf(error)
    }
  }
  const groups = new Map()
  for (const leaf of leavesOf({ check })) {
    const key = groupKey({ check: leaf.check }) ?? `alone:${leaf.path}`
    groups.set(key, [...(groups.get(key) ?? []), leaf])
  }
  const leaves = {}
  for (const [key, members] of groups) {
    try {
      if (key.startsWith('alone:')) leaves[members[0].path] = await withTimeout(observeLeaf({ browser, url, check: members[0].check, request }), PAGE_TIMEOUT)
      else Object.assign(leaves, await withTimeout(observeGroup({ browser, url, leaves: members, request }), PAGE_TIMEOUT))
    } catch (error) {
      // 페이지 하나가 실패해도 다른 묶음은 잰다 — 실패한 묶음의 낱개 확인은 그 사유로 찾지 못함이 된다
      for (const member of members) leaves[member.path] = errorOf(error)
    }
  }
  return { leaves }
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
if (!existsSync(join(out, 'runs'))) {
  console.error(`${join(out, 'runs')} 없음 — run.mjs의 실행 폴더를 --out으로 준다`)
  process.exit(1)
}
const runDirs = []
for (const condition of readdirSync(join(out, 'runs')).sort()) {
  for (const name of readdirSync(join(out, 'runs', condition)).sort()) runDirs.push({ condition, name, dir: join(out, 'runs', condition, name) })
}

// 실행 하나 — 요구마다 새 페이지에서 관찰하고 판정한다
const measureRun = async ({ browser, condition, name, dir, request }) => {
  const html = join(dir, 'work', 'index.html')
  const url = existsSync(html) ? pathToFileURL(html).href : null
  const rows = []
  for (const requirement of request.requirements) {
    let observation = {}
    if (requirement.support === 'supported') {
      // 요구 하나가 예외를 던져도 나머지는 잰다(observe가 예외를 관찰의 error로 바꾼다)
      if (!url) observation = { missing: 'index.html 없음(생성 실패)' }
      else observation = await observe({ browser, url, requirement, request })
    }
    const { result, detail } = verdict({ requirement, observation })
    rows.push({
      condition,
      run: name,
      request: request.id,
      id: requirement.id,
      kind: requirement.kind,
      conflict: Boolean(requirement.conflict),
      order: requirement.order,
      total: requirement.total,
      result,
      reasons: requirement.reasons,
      detail,
      text: requirement.text,
    })
  }
  const s = summarizeFidelity({ results: rows })
  writeFileSync(join(dir, 'fidelity.json'), JSON.stringify({ condition, run: name, request: request.id, summary: s, rows }, null, 2))
  // 동시에 도는 실행끼리 줄이 섞이지 않게 한 번에 찍는다
  const lines = [`${condition}/${name} — 지킴 ${s.counts.met} · 어김 ${s.counts.violated} · 찾지 못함 ${s.counts.notFound} · 판정 필요 ${s.counts.needsJudge} · 미지원 ${s.counts.unsupported}`]
  for (const row of rows.filter((r) => r.result === 'violated' || r.result === 'not-found')) lines.push(`  ${row.result === 'violated' ? '어김' : '찾지 못함'} ${row.id} ${row.text} — ${row.detail}`)
  console.log(lines.join('\n'))
  return rows
}

const jobs = runDirs
  .map((run) => ({ ...run, request: spec.requests.find((r) => r.id === run.name.match(/^(.+)-(\d+)$/)?.[1]) }))
  .filter((job) => job.request) // 요구 목록에 없는 요청(지난 벤치마크 요청)은 재지 않는다
const concurrency = Math.max(1, Number(argOf('--concurrency') ?? 4))
const browser = await chromium.launch()
const rowsByJob = []
let next = 0
await Promise.all(
  Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (next < jobs.length) {
      const index = next
      next += 1
      rowsByJob[index] = await measureRun({ browser, ...jobs[index] })
    }
  }),
)
await browser.close()
const allRows = rowsByJob.flat()

const conditions = [...new Set(allRows.map((r) => r.condition))]
const summary = {
  spec: specPath.replace(`${root}`, ''),
  runs: jobs.length,
  overall: summarizeFidelity({ results: allRows }),
  byCondition: Object.fromEntries(conditions.map((c) => [c, summarizeFidelity({ results: allRows.filter((r) => r.condition === c) })])),
  byConditionRequest: Object.fromEntries(
    conditions.map((c) => {
      const rows = allRows.filter((r) => r.condition === c)
      const requests = [...new Set(rows.map((r) => r.request))]
      return [c, Object.fromEntries(requests.map((q) => [q, summarizeFidelity({ results: rows.filter((r) => r.request === q) })]))]
    }),
  ),
}
writeFileSync(join(out, 'fidelity-summary.json'), JSON.stringify(summary, null, 2))

console.log('\n조건 | 지킴 | 어김 | 찾지 못함 | 판정 필요 | 미지원 | 엄격 | 너그러움 | 찾지 못함 비율 | 부딪치는 요구(엄격)')
for (const c of conditions) {
  const s = summary.byCondition[c]
  console.log(`${c} | ${s.counts.met} | ${s.counts.violated} | ${s.counts.notFound} | ${s.counts.needsJudge} | ${s.counts.unsupported} | ${pct(s.strict)} | ${pct(s.lenient)} | ${pct(s.notFoundRate)} | ${pct(s.byConflict.conflict.strict)}`)
}
console.log(`→ ${join(out, 'fidelity-summary.json')}`)
