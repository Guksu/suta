#!/usr/bin/env node
/**
 * 퍼블리싱 벤치마크 2단계 — 측정. run.mjs가 만든 index.html을 실제 브라우저로 열어 잰다.
 *
 * 렌더 지표(Playwright·Chromium) — 렌더된 화면에서 계산된 값으로 잰다. suta 검사기와 따로 만든 기준이다.
 *   가로 넘침(320·390px) · 12px 미만 글자 · 24px 미만 터치 영역(WCAG 2.2 기준 2.5.8) · 글자 크기 종류 · 상자 안 상자 ·
 *   강한 효과(그라데이션·흐림·큰 그림자) · 가운데 정렬 문단 · transition: all · 레이아웃 속성 애니메이션 · 동작 줄이기 대응 · 스크립트 오류 ·
 *   끝까지 내려도 하단 고정 바가 본문을 가리는가(390·1280px)
 * 톤(390px, 레퍼런스 웹사이트와 같은 방식) — 가장 많은 글자의 크기 · 15px 미만 글자 비율 · 강조색 글자 비율 ·
 *   페이지 바탕 말고 넓은 무채색 면의 종류 · 주 버튼의 색상각(파랑·남색·보라 계열인지)
 * 접근성(axe-core) — WCAG 2.0·2.1·2.2 A·AA 규칙 위반
 * suta 검사 — 같은 파일에 suta의 레이아웃·모션 검사를 돌린 error·warn 수. suta가 스스로 정한 기준이라 보고서에서 따로 표시한다
 *
 * 결과: <out>/metrics.json, 실행 폴더마다 shot-390.png·shot-1280.png
 * 사용: node scripts/benchmark/measure.mjs --out <폴더>
 * 필요: playwright(Chromium)·axe-core. 없으면 `npm i --no-save playwright axe-core && npx playwright install chromium`.
 *       다른 곳에 설치했다면 BENCH_NODE_PATH=<그 폴더>로 알려 준다
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { auditAll } from '../../skills/suta/scripts/auditAll.ts'
import { clippedTexts, hiddenColumns } from '../lib/clipCheck.ts'

const root = new URL('../..', import.meta.url).pathname
const i = process.argv.indexOf('--out')
if (i < 0 || !process.argv[i + 1]) {
  console.error('사용: node scripts/benchmark/measure.mjs --out <폴더>')
  process.exit(1)
}
const out = resolve(process.argv[i + 1])

const require = createRequire(import.meta.url)
const globalRoot = (() => {
  try {
    return execSync('npm root -g', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
})()
const locate = (name) => {
  const bases = [process.cwd(), root, ...(process.env.BENCH_NODE_PATH ?? '').split(':'), globalRoot].filter(Boolean)
  for (const base of bases) {
    try {
      return require.resolve(name, { paths: [base] })
    } catch {
      /* 다음 위치 */
    }
  }
  throw new Error(`${name}을(를) 찾지 못했다 — npm i --no-save ${name.split('/')[0]}`)
}
const { chromium } = require(locate('playwright'))
// 요청문이 한국어라 한국어 브라우저로 연다 — 브라우저 언어를 따라 문구를 바꾸는 페이지가 영어로 찍히지 않게
const LOCALE = 'ko-KR'
const axeSource = readFileSync(locate('axe-core/axe.min.js'), 'utf8')

/** 브라우저 안에서 도는 측정 — 렌더된 값(getComputedStyle·getBoundingClientRect)만 쓴다 */
const renderMetrics = () => {
  const shown = (el) =>
    el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }) ?? true
  const all = [...document.body.querySelectorAll('*')].filter((el) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName))
  const visible = all.filter((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && shown(el)
  })
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
  const textEls = visible.filter((el) => ownText(el).length > 0 && !el.closest('svg'))

  // 글자
  const sizes = textEls.map((el) => parseFloat(getComputedStyle(el).fontSize))
  const tinyText = sizes.filter((px) => px < 12).length
  const fontSizes = new Set(sizes.map((px) => Math.round(px * 2) / 2)).size

  // 톤 — 레퍼런스 웹사이트 19곳을 잰 방식(docs/research/2026-10-07-tone.md)과 같게, 글자 수로 가중한다
  const rgbOf = (color) => {
    const m = color.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  const hslOf = ({ r, g, b }) => {
    const [R, G, B] = [r / 255, g / 255, b / 255]
    const max = Math.max(R, G, B)
    const min = Math.min(R, G, B)
    const l = (max + min) / 2
    const d = max - min
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
    const h = d === 0 ? 0 : max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4
    return { h: (h * 60 + 360) % 360, s, l }
  }
  const saturated = (c) => {
    const { s, l } = hslOf(c)
    return s >= 0.35 && l > 0.15 && l < 0.85
  }
  const achromatic = (c) => {
    const { s, l } = hslOf(c)
    return s < 0.12 || l < 0.08 || l > 0.97
  }
  let chars = 0
  let smallChars = 0
  let accentChars = 0
  const charsBySize = new Map()
  // 레퍼런스 측정과 같게 — 화면 여섯 장 높이 안의 글자만, 반투명(알파 0.5 이하) 글자는 뺀다.
  // 화면은 clientWidth·clientHeight(390×844)다. 페이지가 가로로 넘치면 모바일 에뮬레이션의 innerWidth·innerHeight가
  // 같은 비율로 늘어나(844 → 1,911 등) 여섯 장의 범위가 넓어진다
  const screenWidth = document.documentElement.clientWidth
  const screenHeight = document.documentElement.clientHeight
  const reach = screenHeight * 6
  for (const el of textEls) {
    if (el.getBoundingClientRect().top + scrollY >= reach) continue
    const cs = getComputedStyle(el)
    const color = rgbOf(cs.color)
    if (!color || color.a <= 0.5) continue
    const n = ownText(el).replace(/\s+/g, '').length // 공백을 뺀 글자 수 — 레퍼런스 측정과 같게
    if (n === 0) continue
    const size = parseFloat(cs.fontSize)
    chars += n
    if (size < 15) smallChars += n
    charsBySize.set(Math.round(size), (charsBySize.get(Math.round(size)) ?? 0) + n)
    if (saturated(color)) accentChars += n
  }
  // 가장 많은 글자의 크기, 15px 미만 글자의 비율, 강조색(채도 있는 색) 글자의 비율
  const bodySize = [...charsBySize].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
  const smallTextShare = chars ? Math.round((100 * smallChars) / chars) : 0
  const accentTextShare = chars ? Math.round((1000 * accentChars) / chars) / 10 : 0

  // 터치 영역 — 문장 안의 링크는 WCAG 예외라 뺀다. 체크박스·라디오는 라벨까지 누르는 영역이다
  const targets = visible.filter((el) =>
    el.matches('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=switch], [role=tab], [role=checkbox], [role=radio]'),
  )
  let smallTargets = 0
  for (const el of targets) {
    if (el.tagName === 'A' && el.closest('p') && ownText(el.closest('p')).length > 0) continue
    let rect = el.getBoundingClientRect()
    const label = el.closest('label') ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null)
    if (label && /^(checkbox|radio)$/i.test(el.type ?? '')) rect = label.getBoundingClientRect()
    if (Math.min(rect.width, rect.height) < 24) smallTargets += 1
  }

  // 상자 — 둥근 모서리 + (보이는 테두리 · 둘레와 다른 바탕 · 그림자). 버튼·입력·이미지와 작은 칩·배지는 상자로 치지 않는다
  const alpha = (color) => {
    const m = color.match(/rgba?\(([^)]+)\)/)
    if (!m) return color === 'transparent' ? 0 : 1
    const parts = m[1].split(/[ ,/]+/).filter(Boolean)
    return parts.length > 3 ? parseFloat(parts[3]) : 1
  }
  const backdrop = (el) => {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor
      if (alpha(bg) > 0) return bg
    }
    return getComputedStyle(document.documentElement).backgroundColor
  }
  // 무언가를 담는 상자가 아니라 컨트롤·장식인 것 — 이름으로 거른다(아바타·칩·토글 손잡이·세그먼트 바탕 등)
  const CONTROL_NAME = /(?:^|[-_\s])(?:btn|button|badge|chip|tag|pill|avatar|icon|input|field|toggle|switch|thumb|track|indicator|knob|handle|segment(?:ed)?|slider|progress|skeleton|dot|swatch|tooltip|toast|stepper)(?:[-_\s]|$)/i
  const isBox = (el) => {
    if (/^(BUTTON|INPUT|SELECT|TEXTAREA|IMG|SVG|VIDEO|CANVAS|PICTURE|A|LABEL|SUMMARY)$/.test(el.tagName) || el.closest('svg')) return false
    if (CONTROL_NAME.test(`${el.className?.baseVal ?? el.className ?? ''} ${el.id ?? ''}`) || el.matches('[role=switch],[role=radiogroup],[role=tablist],[role=slider],[role=progressbar]')) return false
    const r = el.getBoundingClientRect()
    if (r.width < 48 || r.height < 32) return false
    const cs = getComputedStyle(el)
    const radii = ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map((c) => parseFloat(cs[`border${c}Radius`]) || 0)
    if (!radii.some((radius) => radius > 0)) return false
    // 완전히 둥근 것(원·알약)은 담는 상자가 아니다
    if (Math.min(...radii) >= Math.min(r.width, r.height) / 2 - 1) return false
    const bordered = ['Top', 'Right', 'Bottom', 'Left'].filter(
      (s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && alpha(cs[`border${s}Color`]) > 0,
    ).length >= 3
    const filled = cs.backgroundImage !== 'none' || (alpha(cs.backgroundColor) > 0 && cs.backgroundColor !== backdrop(el.parentElement))
    const shadowed = cs.boxShadow !== 'none'
    return bordered || filled || shadowed
  }
  // 면 — 페이지 바탕 말고 넓은 무채색 면이 몇 종류인가(칠한 면 넓이의 1% 이상). 흰 바탕 하나에 선만 두면 0이다
  const canvasColor = alpha(getComputedStyle(document.body).backgroundColor) > 0.5 ? getComputedStyle(document.body).backgroundColor : getComputedStyle(document.documentElement).backgroundColor
  const toneArea = new Map()
  let paintedArea = 0
  for (const el of visible) {
    const cs = getComputedStyle(el)
    const color = rgbOf(cs.backgroundColor)
    if (!color || color.a < 0.5) continue
    const r = el.getBoundingClientRect()
    if (r.top + scrollY >= reach) continue
    const area = Math.min(r.width, screenWidth) * Math.min(r.height, screenHeight * 6)
    if (area < 2000) continue
    paintedArea += area
    if (cs.backgroundColor !== canvasColor && achromatic(color)) toneArea.set(cs.backgroundColor, (toneArea.get(cs.backgroundColor) ?? 0) + area)
  }
  const toneSurfaces = [...toneArea.values()].filter((area) => area / paintedArea >= 0.01).length
  // 주 버튼 — 채도 있는 색으로 채운 버튼 중 가장 넓은 것의 색상각. 거의 검정 같은 무채색 주 버튼은 null
  let primaryHue = null
  let primaryArea = 0
  for (const el of targets) {
    if (!el.matches('button, a[href], [role=button], input[type=submit]')) continue
    const color = rgbOf(getComputedStyle(el).backgroundColor)
    if (!color || color.a < 0.5 || !saturated(color)) continue
    const r = el.getBoundingClientRect()
    if (r.width * r.height > primaryArea) {
      primaryArea = r.width * r.height
      primaryHue = Math.round(hslOf(color).h)
    }
  }

  // 제품 화면을 본뜬 그림(role="img"·aria-hidden="true") 안의 상자는 페이지 구조가 아니라 그림이다 — layout-audit의 nested-card와 같은 기준
  const boxes = visible.filter((el) => isBox(el) && !el.closest('[role="img"], [aria-hidden="true"]'))
  const boxSet = new Set(boxes)
  const nestedBoxes = boxes.filter((el) => {
    for (let node = el.parentElement; node; node = node.parentElement) if (boxSet.has(node)) return true
    return false
  }).length

  // 강한 효과 — 넓은 그라데이션, 배경 흐림, 흐림 16px 이상 그림자, 그라데이션 글자.
  // 그림(role="img"·aria-hidden="true"·콘텐츠 그림 .art) 안의 그라데이션은 사진 대역의 내용이라 장식 효과로 세지 않는다 — 두 조건에 같게 적용
  let strongEffects = 0
  for (const el of visible) {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const gradient = /gradient\(/.test(cs.backgroundImage) && r.width * r.height >= 2000 && !el.closest('[role="img"], [aria-hidden="true"], .art')
    const blur = cs.backdropFilter && cs.backdropFilter !== 'none'
    const bigShadow = cs.boxShadow !== 'none' && cs.boxShadow.split(/,(?![^(]*\))/).some((shadow) => {
      const lengths = shadow.replace(/rgba?\([^)]*\)|#[0-9a-f]+|inset/gi, '').match(/-?\d*\.?\d+px/g) ?? []
      return lengths.length >= 3 && parseFloat(lengths[2]) >= 16
    })
    const gradientText = (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') && /gradient\(/.test(cs.backgroundImage)
    if (gradient || blur || bigShadow || gradientText) strongEffects += 1
  }

  // 가운데 정렬 문단 — 두 줄 이상인 글 덩어리
  let centeredParagraphs = 0
  for (const el of textEls) {
    const cs = getComputedStyle(el)
    if (cs.textAlign !== 'center' || ownText(el).length < 30) continue
    const line = cs.lineHeight === 'normal' ? parseFloat(cs.fontSize) * 1.25 : parseFloat(cs.lineHeight)
    if (el.getBoundingClientRect().height >= line * 1.8) centeredParagraphs += 1
  }

  // 움직임 — 계산된 transition과 스타일시트의 @keyframes·미디어 쿼리
  // 크기·위치 속성을 직접 움직이는 것과, 격자 트랙(grid-template-rows: 0fr → 1fr)으로 높이를 여는 기법을 따로 센다.
  // 뒤의 것은 suta가 높이 애니메이션 대신 권하는 방법이지만, 프레임마다 레이아웃을 다시 계산하는 것은 같다
  const LAYOUT = /^(width|height|min-width|min-height|max-width|max-height|top|right|bottom|left|inset|margin.*|padding.*|flex-basis|gap)$/
  const GRID_TRACKS = /^grid-template-(rows|columns)$/
  let transitionAll = 0
  let layoutTransitions = 0
  let gridTransitions = 0
  let moving = 0
  for (const el of all) {
    const cs = getComputedStyle(el)
    const durations = cs.transitionDuration.split(',').map((d) => parseFloat(d))
    const props = cs.transitionProperty.split(',').map((p) => p.trim())
    const live = props.filter((_, k) => (durations[k % durations.length] ?? 0) > 0)
    if (live.length > 0 || (cs.animationName && cs.animationName !== 'none')) moving += 1
    if (live.includes('all')) transitionAll += 1
    if (live.some((p) => LAYOUT.test(p))) layoutTransitions += 1
    if (live.some((p) => GRID_TRACKS.test(p))) gridTransitions += 1
  }
  let layoutKeyframes = 0
  let gridKeyframes = 0
  let reducedMotionRule = false
  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        const animated = [...rule.cssRules].flatMap((frame) => [...frame.style])
        if (animated.some((p) => LAYOUT.test(p))) layoutKeyframes += 1
        if (animated.some((p) => GRID_TRACKS.test(p))) gridKeyframes += 1
      } else if (rule.type === CSSRule.MEDIA_RULE) {
        if (/prefers-reduced-motion/.test(rule.conditionText ?? rule.media?.mediaText ?? '')) reducedMotionRule = true
        walk(rule.cssRules)
      } else if (rule.cssRules) walk(rule.cssRules)
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules)
    } catch {
      /* 다른 출처 스타일시트 */
    }
  }
  const reducedMotionScript = [...document.scripts].some((s) => /prefers-reduced-motion/.test(s.textContent ?? ''))

  return {
    tinyText,
    fontSizes,
    bodySize,
    smallTextShare,
    accentTextShare,
    toneSurfaces,
    primaryHue,
    targets: targets.length,
    smallTargets,
    boxes: boxes.length,
    nestedBoxes,
    strongEffects,
    centeredParagraphs,
    moving,
    transitionAll,
    layoutMotion: layoutTransitions + layoutKeyframes,
    gridMotion: gridTransitions + gridKeyframes,
    reducedMotion: reducedMotionRule || reducedMotionScript,
  }
}

/** 끝까지 내렸을 때 화면 아래에 고정된 바가 본문 글자를 가리는가 — 고정 바만큼 본문 끝에 여백을 두지 않으면 생긴다 */
const coveredByFixedBar = () => {
  window.scrollTo(0, document.documentElement.scrollHeight)
  // 고정 요소는 넘친 페이지에서 늘어난 화면(innerHeight)에 배치된다 — 여기는 innerHeight가 맞다(clientHeight로 바꾸면 바를 못 찾는다)
  const vh = window.innerHeight
  const bars = [...document.body.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return false
    const r = el.getBoundingClientRect()
    return r.height > 0 && r.height < vh * 0.4 && r.bottom >= vh - 2 && r.top > vh * 0.5 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0
  })
  if (bars.length === 0) return false
  const texts = [...document.body.querySelectorAll('*')].filter(
    (el) => !bars.some((bar) => bar.contains(el)) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) !== false,
  )
  return texts.some((el) => {
    const r = el.getBoundingClientRect()
    if (r.height === 0 || r.bottom <= 0 || r.top >= vh) return false
    return bars.some((bar) => {
      const b = bar.getBoundingClientRect()
      // 글자 상자의 절반 넘게 바 아래에 깔리면 가려진 것으로 본다
      const overlap = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)
      const across = Math.min(r.right, b.right) - Math.max(r.left, b.left)
      return overlap > r.height / 2 && across > 0
    })
  })
}

// 칸 밖으로 잘린 글자와 첫 화면 폭 밖의 표 열 — 브라우저에서는 상자 좌표만 모으고 판정은 scripts/lib/clipCheck.ts가 한다
const clipProbes = () => {
  const boxOf = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })
  const intersect = (a, b) => ({ left: Math.max(a.left, b.left), right: Math.min(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) })
  // 화면 폭은 innerWidth가 아니라 clientWidth다. 모바일 에뮬레이션에서 페이지가 가로로 넘치면 innerWidth가 콘텐츠 폭(예: 521)까지
  // 늘어나, 페이지 밖으로 나간 표 열을 "보인다"고 셌다. clientWidth는 넘쳐도 390이다(viewport가 width=device-width일 때)
  const viewport = { left: 0, right: document.documentElement.clientWidth, top: -Infinity, bottom: Infinity }
  // 화면 낭독용으로 숨긴 칸 — clip: rect(0 0 0 0)이나 clip-path: inset(50%)·inset(100%). 둥근 카드의 inset(0 round 12px)은 아니다
  const srHidden = (cs) => /rect\(\s*0(px)?[\s,]+0(px)?/.test(cs.clip ?? '') || /^inset\((50|100)%\)$/.test(cs.clipPath ?? '')
  // 글자를 잘라낼 수 있는 조상(overflow-x: hidden·clip)의 상자를 겹쳐 구한다.
  // 스크롤 칸(overflow auto·scroll — overflow-y: auto만 줘도 x가 auto로 계산된다)을 만나면 그 위는 보지 않는다:
  // 그 안에서 이미 찾은 잘림 칸은 그대로 쓰고, 스크롤 칸 바깥의 칸은 넘겨서 볼 수 있는 글자를 자르지 않는다.
  // position: fixed 요소는 위 조상의 칸에 잘리지 않으므로 거기서 멈춘다
  const clipOf = (el) => {
    let clip = null
    let ellipsis = getComputedStyle(el).textOverflow === 'ellipsis'
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node)
      if (cs.textOverflow === 'ellipsis') ellipsis = true
      if (srHidden(cs)) return { clip: { left: 0, right: 1, top: 0, bottom: 1 }, ellipsis }
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return { clip, ellipsis }
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
        const r = boxOf(node.getBoundingClientRect())
        clip = clip ? intersect(clip, r) : r
      }
      if (cs.position === 'fixed') return { clip, ellipsis }
    }
    return { clip, ellipsis }
  }
  // 테두리나 바탕으로 눈에 보이는 가장 가까운 칸 — 그 밖으로 삐져나온 글자는 잘리지 않아도 칸을 넘은 것으로 보인다
  const painted = (color) => color && color !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(color)
  const frameOf = (el) => {
    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node)
      // 스크롤 칸 안의 글자는 넘겨서 본다 — 스크롤 칸 자신을 넘은 것은 삐져나온 것이 아니다(숨은 표 열은 따로 센다)
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return null
      const bordered = ['Left', 'Right'].some((side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none' && painted(cs[`border${side}Color`]))
      if (bordered || painted(cs.backgroundColor)) return boxOf(node.getBoundingClientRect())
      // 고정 요소는 화면에 따로 떠 있다 — 그 위 조상의 칸은 이 글자의 칸이 아니다
      if (cs.position === 'fixed') return null
    }
    return null
  }
  const texts = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.trim()
    const el = n.parentElement
    if (!text || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue
    if (!el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })) continue
    const range = document.createRange()
    range.selectNodeContents(n)
    const r = range.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const { clip, ellipsis } = clipOf(el)
    texts.push({ text: text.slice(0, 40), box: boxOf(r), clip, frame: frameOf(el), ellipsis })
  }
  // 표: 칸이 가장 많은 줄의 칸 상자들과, 그 표를 보이는 폭(가장 가까운 가로 스크롤·잘라내는 칸과 화면의 겹침)
  const tables = []
  for (const table of document.querySelectorAll('table, [role="table"], [role="grid"]')) {
    if (!table.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })) continue
    // 너비가 있는 칸이 가장 많은 줄(앞의 다섯 줄 중)을 쓴다 — 첫 줄이 colspan 제목 줄이거나 숨긴 thead면 칸이 모자라다
    const rows = [...table.querySelectorAll('tr, [role="row"]')].slice(0, 5)
    const cellsOf = (row) => [...row.children].map((cell) => boxOf(cell.getBoundingClientRect())).filter((b) => b.right - b.left > 0)
    const cells = rows.map(cellsOf).sort((a, b) => b.length - a.length)[0] ?? []
    if (cells.length < 2) continue
    let visible = viewport
    for (let node = table.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const ox = getComputedStyle(node).overflowX
      if (ox !== 'visible') visible = intersect(visible, boxOf(node.getBoundingClientRect()))
    }
    tables.push({ cells, visible })
  }
  return { texts, tables }
}

const overflowOf = async ({ browser, url, width }) => {
  const page = await browser.newPage({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, locale: LOCALE })
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(300)
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  await page.close()
  return over > 1
}

// 390 전체 캡처의 최대 높이 — 판정에 넘기는 그림이 너무 길지 않게
const CAPTURE_MAX = 2400

const runDirs = []
for (const condition of readdirSync(join(out, 'runs'))) {
  for (const name of readdirSync(join(out, 'runs', condition))) runDirs.push(join(out, 'runs', condition, name))
}

const browser = await chromium.launch()
const results = []
for (const dir of runDirs.sort()) {
  const metaPath = join(dir, 'meta.json')
  const html = join(dir, 'work', 'index.html')
  if (!existsSync(metaPath)) continue
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  if (!existsSync(html)) {
    results.push({ ...meta, measured: false })
    continue
  }
  const url = pathToFileURL(html).href
  const pageErrors = []
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: LOCALE })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  const render = await page.evaluate(renderMetrics)
  const coveredMobile = await page.evaluate(coveredByFixedBar)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.addScriptTag({ content: axeSource })
  const axe = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] })
    return result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
  })
  const mobileClip = await page.evaluate(clipProbes)
  // 화면 전체를 찍되 너무 긴 페이지는 2,400px에서 자른다 — 판정(judge.mjs)과 사람이 보는 용도.
  // 전체 화면 캡처는 position: fixed 요소를 처음 화면의 자리(예: 위에서 771px)에 그대로 두어, 하단 고정 바가 페이지
  // 한가운데에 찍히고 그 아래 내용을 가린 것처럼 보인다. 사람이 스크롤하며 보는 자리로 옮겨 찍는다 —
  // 아래쪽에 붙은 것은 찍히는 영역의 끝에, 위쪽에 붙은 것은 문서 처음에. 지표는 이미 위에서 다 쟀다
  await page.evaluate((CAPTURE_MAX) => {
    // 고정 요소의 화면 판정은 innerWidth·innerHeight다 — 넘친 페이지에서는 고정 요소가 늘어난 화면에 놓인다(예: 하단 바 top 1,838 / innerHeight 1,911).
    // clientHeight(844)로 보면 그 바를 화면 밖으로 보고 캡처에서 숨긴다
    // 아래쪽 고정 요소는 찍히는 영역의 끝에 둔다. 캡처는 2,400px에서 자르므로, 문서가 그보다 길면 문서 끝에 둔 바가 잘려 나간다
    // (휴대폰에서는 화면 아래에 늘 보이는 등록 바가 캡처에서 사라졌다 — 2026-11-09 숙소 등록 6개 중 5개)
    const total = Math.min(document.documentElement.scrollHeight, CAPTURE_MAX)
    // 화면 크기는 스타일을 바꾸기 전에 한 번 읽는다. 화면보다 넓은 고정 바를 absolute로 바꾸면 문서가 옆으로 넘쳐
    // 모바일 에뮬레이션의 innerHeight가 그 자리에서 늘어난다(844 → 888). 늘어난 값으로 자리를 셈하면 바가 그만큼 위에 찍혔다
    // (2026-11-09 숙소 등록 suta 1번째 44px, 다섯 번째 묶음 강의 등록 suta 없이 3번째 143px)
    const vw = innerWidth
    const vh = innerHeight
    const pinned = []
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      if (cs.position !== 'fixed' || !el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // 처음 화면 밖에 있는 고정 요소(translateY(100%)로 내려 둔 닫힌 시트 등)는 기기에서 보이지 않는다.
      // 옮기면서 transform을 지우면 닫힌 시트가 페이지 끝에 찍혀 판정이 "깨진 화면"으로 본다 — 건드리지 않고 숨긴다.
      // 높이 검사보다 먼저 한다 — 키 큰 닫힌 시트(92vh)도 화면 밖이면 숨겨야 한다
      if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) {
        el.style.setProperty('visibility', 'hidden', 'important')
        continue
      }
      if (r.height >= vh * 0.9) continue
      pinned.push({ el, r, nearBottom: r.top > vh / 2 })
    }
    for (const { el, r, nearBottom } of pinned) {
      el.style.setProperty('position', 'absolute', 'important')
      el.style.setProperty('top', `${nearBottom ? total - (vh - r.top) : r.top}px`, 'important')
      el.style.setProperty('bottom', 'auto', 'important')
      el.style.setProperty('left', `${r.left}px`, 'important')
      el.style.setProperty('right', 'auto', 'important')
      el.style.setProperty('width', `${r.width}px`, 'important')
      // 가운데 정렬에 쓴 transform·margin이 남으면 위에서 잰 자리에서 한 번 더 밀린다
      el.style.setProperty('transform', 'none', 'important')
      el.style.setProperty('translate', 'none', 'important')
      el.style.setProperty('margin', '0', 'important')
    }
    // 아래쪽에 붙는 sticky 바도 전체 캡처에서는 처음 화면의 자리(페이지 중간)에 찍힌다 — 문서 흐름 속 제자리(끝까지 내렸을 때 보이는 자리)로 돌린다
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      if (cs.position !== 'sticky') continue
      const r = el.getBoundingClientRect()
      if (r.height > 0 && r.height < vh * 0.4 && r.top > vh / 2) el.style.setProperty('position', 'static', 'important')
    }
  }, CAPTURE_MAX)
  const height = await page.evaluate((max) => Math.min(document.documentElement.scrollHeight, max), CAPTURE_MAX)
  await page.screenshot({ path: join(dir, 'shot-390.png'), fullPage: true, clip: { x: 0, y: 0, width: 390, height }, timeout: 30000 }).catch(() => {})
  await page.close()
  const wide = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: LOCALE })
  await wide.goto(url, { waitUntil: 'load' })
  await wide.waitForTimeout(300)
  await wide.screenshot({ path: join(dir, 'shot-1280.png') })
  const desktopClip = await wide.evaluate(clipProbes)
  const coveredDesktop = await wide.evaluate(coveredByFixedBar)
  await wide.close()

  const text = readFileSync(html, 'utf8')
  const findings = auditAll([{ file: 'index.html', text }])
  const byRule = {}
  for (const f of findings) byRule[`${f.severity}:${f.rule}`] = (byRule[`${f.severity}:${f.rule}`] ?? 0) + 1

  results.push({
    ...meta,
    measured: true,
    bytes: Buffer.byteLength(text),
    overflow320: await overflowOf({ browser, url, width: 320 }),
    overflow390: await overflowOf({ browser, url, width: 390 }),
    pageErrors: pageErrors.length,
    coveredByBar: coveredMobile || coveredDesktop,
    // 칸 밖으로 잘린 글자(390·1280)와 390 첫 화면 폭 밖의 표 열 — 캡처를 눈으로 봐야 알던 결함
    clippedText390: clippedTexts({ probes: mobileClip.texts }).map((t) => t.text),
    clippedText1280: clippedTexts({ probes: desktopClip.texts }).map((t) => t.text),
    hiddenTableColumns: Math.max(0, ...mobileClip.tables.map((t) => hiddenColumns(t))),
    ...render,
    axe: {
      rules: axe.length,
      nodes: axe.reduce((sum, v) => sum + v.nodes, 0),
      seriousNodes: axe.filter((v) => v.impact === 'serious' || v.impact === 'critical').reduce((sum, v) => sum + v.nodes, 0),
      violations: axe,
    },
    suta: { errors: findings.filter((f) => f.severity === 'error').length, warns: findings.filter((f) => f.severity === 'warn').length, byRule },
  })
  console.log(`측정 ${dir.split('/runs/')[1]}`)
}
await browser.close()
writeFileSync(join(out, 'metrics.json'), JSON.stringify(results, null, 2))
console.log(`측정 ${results.filter((r) => r.measured).length}개 → ${join(out, 'metrics.json')}`)
