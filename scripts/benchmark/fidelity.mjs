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
 *  3. 관계 — near(가까운 요소), pinned(화면 위·아래에 붙은 fixed·sticky 요소), within(그 안에서만)
 * 조작이 앞 요구의 화면을 오염시키지 않게 요구마다 새 페이지에서 시작한다.
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
import { companionAnchors, coverageOf, findRepeatUnits, parseSpec, summarizeFidelity, verdict } from '../lib/fidelity.ts'

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
const REQUIREMENT_TIMEOUT = 30_000
const NEAR_MAX = 48 // near: 기준 요소와 이만큼(px) 안에 있어야 "가까이"다 — 장바구니 아이콘 위 숫자는 겹치거나 맞닿는다

class FindError extends Error {}

// ── 브라우저 안에서 쓰는 도우미 — 문서마다 심는다(addInitScript) ────────────────────────
const helpers = () => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE'])
  const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
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
  // 사람이 보는 "보임" — 숨기지 않았고 덮이지도 않았다. 단위·머리를 찾을 때는 덮였는지 보지 않는다(아래 카드가 하단 막대에 덮여도 카드다)
  const isSeen = (el) => isShown(el) && !covered(el)
  const transparent = (color) => /^transparent$|rgba\([^)]*,\s*0\)$/.test(color)
  // 보이는 바탕색 — 자기 바탕이 투명하고 자식 하나가 상자를 거의 다(90%) 덮으면 그 자식의 바탕이 보인다
  // (밀어서 지우는 줄: 바깥 li는 투명, 안쪽 앞면에 바탕색)
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
    return own
  }
  const all = (roots) => roots.flatMap((rootEl) => [rootEl, ...rootEl.querySelectorAll('*')]).filter((el) => !SKIP.has(el.tagName) && !el.closest('svg title'))
  // 글자를 품은 가장 깊은 요소들 — 자식 요소도 품고 있으면 자식이 대상이다
  const deepest = (roots, hit) => {
    const hits = new Set(all(roots).filter((el) => hit(norm(el.textContent))))
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
  window.__fid = { norm, isShown, isSeen, surfaceColor, deepest, visualUnit, els: [] }
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

const byRole = async ({ page, target, scope }) => {
  const roles = String(target.role).split('|')
  const handles = []
  for (const role of roles) {
    const options = target.name === undefined ? {} : { name: target.name, exact: target.exact === true }
    handles.push(...(await page.getByRole(role, options).elementHandles()))
  }
  // exact인데 못 찾으면, 접근 이름에 메뉴 이름을 덧붙인 버튼(aria-label "소금빵 담기")을 보이는 글자로 다시 찾는다.
  // exact는 "장바구니에 담기" 같은 다른 버튼을 빼려는 것이라, 보이는 글자가 정확히 같으면 그 뜻을 지킨다
  if (handles.length === 0 && target.exact === true && target.name !== undefined) {
    for (const role of roles) {
      for (const handle of await page.getByRole(role, { name: target.name }).elementHandles()) {
        if ((await handle.evaluate((el) => window.__fid.norm(el.textContent))) === target.name) handles.push(handle)
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
        // 앵커는 낱말 경계로 찾는다 — "식빵"이 "우유식빵"에 걸리지 않게(앞뒤가 글자·숫자가 아니어야 한다)
        const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u')
        for (const el of fid.deepest(scope ?? [document.body], (t) => re.test(t))) {
          if (!fid.isShown(el)) continue
          const t = fid.norm(el.textContent)
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
  if (missing.length > 0) throw new FindError(`되풀이 단위를 찾지 못한 앵커: ${missing.join(', ')}`)
  const found = await page.evaluateHandle((ids) => ids.map((id) => window.__fid.visualUnit(window.__fid.els[id])), asked.map((anchor) => units[anchor]))
  return handlesOf(found)
}

// near: 기준 요소와 겹치거나 가장 가까운 것 하나
const nearest = async ({ page, handles, ref }) => {
  if (handles.length === 0) return []
  const order = await page.evaluate(
    ({ els, ref, max }) => {
      const a = ref.getBoundingClientRect()
      const gap = (r) => Math.hypot(Math.max(0, a.left - r.right, r.left - a.right), Math.max(0, a.top - r.bottom, r.top - a.bottom))
      return els
        .map((el, i) => ({ i, d: gap(el.getBoundingClientRect()), shown: window.__fid.isShown(el) }))
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
  else if (target.text !== undefined) found = await byText({ page, text: target.text, scope })
  else if (target.textMatches) found = await byText({ page, pattern: target.textMatches, scope })
  if (target.near) {
    const refs = await visibleFirst({ page, handles: await resolveTarget({ ctx, target: target.near }) })
    if (refs.length === 0) throw new FindError('near 기준 대상을 찾지 못함')
    found = await nearest({ page, handles: found, ref: refs[0] })
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

const press = async ({ ctx, handle, ms, dx = 0, dy = 0 }) => {
  const { page, mobile } = ctx
  const { x, y } = await centerOf(handle)
  const moves = dx === 0 && dy === 0 ? 0 : 10
  if (mobile) {
    await touch({ ctx, type: 'touchStart', x, y })
    if (ms) await page.waitForTimeout(ms)
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

/** 조작을 차례로 한다. 조작 대상을 못 찾으면 그 이유를, 다 하면 null */
const runSteps = async ({ ctx, steps }) => {
  const { page } = ctx
  for (const [i, step] of steps.entries()) {
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
      else if (step.do === 'drag') await press({ ctx, handle, dx: step.dx ?? 0, dy: step.dy ?? 0 })
    } catch (error) {
      throw new Error(`${label}: ${String(error.message ?? error).split('\n')[0]}`)
    }
    // 조작에 반응하는 처리(이벤트 처리·상태 갱신)가 한 번은 돌 틈
    if (step.do !== 'wait') await page.waitForTimeout(50)
  }
  return null
}

const toList = (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value])

/** 대상을 찾아 type에 맞는 관찰값을 모은다 */
const collect = async ({ ctx, check }) => {
  let handles
  try {
    handles = await resolveTarget({ ctx, target: check.target })
  } catch (error) {
    if (error instanceof FindError) return { missing: error.message }
    throw error
  }
  const properties = toList(check.property)
  const elements = await Promise.all(
    handles.map((handle) =>
      handle.evaluate(
        (el, { properties, type }) => {
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          const values = {}
          for (const property of properties) {
            if (type === 'attr') values[property] = property === 'value' && 'value' in el ? String(el.value) : el.getAttribute(property)
            // 폭·높이는 보이는 상자(테두리 포함)로 — 계산된 height는 box-sizing에 따라 안쪽 여백을 뺀다
            else if (property === 'width' || property === 'height') values[property] = `${property === 'width' ? r.width : r.height}px`
            else if (property === 'background-color') values[property] = window.__fid.surfaceColor(el)
            else values[property] = cs.getPropertyValue(property)
          }
          return {
            visible: window.__fid.isSeen(el),
            text: window.__fid.norm(el.textContent),
            box: { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY },
            values,
          }
        },
        { properties, type: check.type },
      ),
    ),
  )
  return { elements }
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

const observe = async ({ browser, url, requirement, request }) => {
  const check = requirement.check
  const width = check.viewport ?? (request.platform === 'web' ? 1280 : 390)
  const mobile = width < 600
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 800 }, isMobile: mobile, hasTouch: mobile, locale: LOCALE })
  // 도우미는 문서마다 심는다 — 조작이 다른 문서로 넘어가도(링크·새로 고침) 남는다
  await context.addInitScript(helpers)
  const page = await context.newPage()
  const ctx = { page, mobile, pools: request.pools, cdp: null }
  try {
    await page.goto(check.state ? `${url}?state=${check.state}` : url, { waitUntil: 'load' })
    await settle(page)
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

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${ms / 1000}초 안에 끝나지 않음`)), ms))])

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
      if (!url) observation = { missing: 'index.html 없음(생성 실패)' }
      else {
        try {
          observation = await withTimeout(observe({ browser, url, requirement, request }), REQUIREMENT_TIMEOUT)
        } catch (error) {
          // 요구 하나가 예외를 던져도 나머지는 잰다
          observation = { error: String(error.message ?? error).split('\n')[0].slice(0, 200) }
        }
      }
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
