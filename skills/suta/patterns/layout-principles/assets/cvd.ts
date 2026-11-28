/* @shared-core cvd.ts origin: layout-principles — 다른 패턴 assets에 복사될 때 이 헤더를 유지한다(저장소 검사가 원본과 해시 비교) */
/**
 * layout-principles — 색각 이상 시뮬레이션과 색 짝 검사(의존성 0). palette.ts가 다시 내보내고, layout-audit의 cvd-pair 규칙이 같은 함수를 쓴다.
 *
 * 왜 필요한가: 오류 빨강과 완료 초록, 해외 등락 초록·빨강처럼 뜻이 반대인 색 짝은 적색·녹색 계열 색각 이상에서 거의 같은 색이 된다.
 * 한국 남성의 약 6%다(Kim 외 1989). 그래서 "색만으로 알리지 않는다"(tone.md 2절)를 숫자로 확인한다.
 *
 * 모델(선형 sRGB에서 3×3 행렬 — 감마를 풀지 않고 곱하면 색이 지나치게 어두워진다):
 *  - 적색 계열(protan)·녹색 계열(deutan): Viénot, Brettel, Mollon 1999
 *  - 청색 계열(tritan): Brettel, Viénot, Mollon 1997 — 분리 평면의 어느 쪽인지에 따라 행렬 둘 중 하나
 * 행렬은 libDaltonLens(Unlicense, 퍼블릭 도메인)의 값이다. 이색형(가장 강한 정도)이라 실제 사람보다 나쁜 쪽으로 본다.
 * 거리는 OKLab 유클리드 거리(ΔEOK)다. 근거와 계산표: docs/research/2026-11-26-color-science.md 6절(저장소 문서).
 */

export type CvdType = 'protan' | 'deutan' | 'tritan'
export type Vision = 'normal' | CvdType
export type PairVerdict = 'distinct' | 'cvd' | 'all'
export type PairDistance = { distance: number; lightness: number }

/**
 * 문턱 — 판단값이다. "몇 이상이면 작은 표시에서 구별된다"는 연구 근거를 찾지 못했다(넓은 면 JND 0.02를 쓰면 거의 모든 짝이 통과한다).
 * 색각 이상에서 거리 0.12 미만이고 밝기 차 0.1 미만이면 "색만으로는 구별이 어렵다"(cvd). 오류 빨강 ↔ 완료 초록(0.11)이 여기에 들고,
 * 국내 등락 빨강 ↔ 파랑(0.27 이상)은 들지 않는다. 밝기 차는 색각 이상에서도 남는 신호라 따로 본다.
 * 정상 시각에서 0.1 미만이면 "누구에게나 가깝다"(all). 옛 보상 금 ↔ 동(0.070)이 여기에 들었다.
 */
export const CVD_MIN_DISTANCE = 0.12
export const CVD_MIN_LIGHTNESS = 0.1
export const NORMAL_MIN_DISTANCE = 0.1

type Matrix = readonly [number, number, number, number, number, number, number, number, number]

const VIENOT: Record<'protan' | 'deutan', Matrix> = {
  protan: [0.11238, 0.88762, 0, 0.11238, 0.88762, 0, 0.00401, -0.00401, 1],
  deutan: [0.29275, 0.70725, 0, 0.29275, 0.70725, 0, -0.02234, 0.02234, 1],
}

const BRETTEL_TRITAN = {
  first: [1.01277, 0.13548, -0.14826, -0.01243, 0.86812, 0.14431, 0.07589, 0.805, 0.11911] as Matrix,
  second: [0.93678, 0.18979, -0.12657, 0.06154, 0.81526, 0.1232, -0.37562, 1.12767, 0.24796] as Matrix,
  normal: [0.03901, -0.02788, -0.01113] as const,
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

const linearOf = (hex: string) => {
  const raw = hex.trim().replace('#', '')
  const full = raw.length === 3 ? [...raw].map((d) => d + d).join('') : raw.slice(0, 6)
  return [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255))
}

const multiply = (m: Matrix, [r, g, b]: number[]) => [m[0] * r + m[1] * g + m[2] * b, m[3] * r + m[4] * g + m[5] * b, m[6] * r + m[7] * g + m[8] * b].map(clamp01)

/** 선형 sRGB → 시뮬레이션한 선형 sRGB */
const simulateLinear = ({ rgb, type }: { rgb: number[]; type: CvdType }) => {
  if (type !== 'tritan') return multiply(VIENOT[type], rgb)
  const [nr, ng, nb] = BRETTEL_TRITAN.normal
  const side = rgb[0] * nr + rgb[1] * ng + rgb[2] * nb
  return multiply(side >= 0 ? BRETTEL_TRITAN.first : BRETTEL_TRITAN.second, rgb)
}

const hexOfLinear = (rgb: number[]) => `#${rgb.map((v) => Math.round(clamp01(toGamma(v)) * 255).toString(16).padStart(2, '0')).join('')}`

/** 선형 sRGB → OKLab [L, a, b] */
const oklabOfLinear = ([r, g, b]: number[]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}

const distanceOf = (a: number[], b: number[]): PairDistance => {
  const [la, lb] = [oklabOfLinear(a), oklabOfLinear(b)]
  return { distance: Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]), lightness: Math.abs(la[0] - lb[0]) }
}

/** 색 하나를 색각 이상 유형으로 본 색(hex) */
export const simulateCvd = ({ hex, type }: { hex: string; type: CvdType }) => hexOfLinear(simulateLinear({ rgb: linearOf(hex), type }))

const CVD_TYPES: CvdType[] = ['protan', 'deutan', 'tritan']

/**
 * 두 색이 정상 시각과 세 유형에서 얼마나 떨어지는가. distance는 OKLab 거리, lightness는 OKLab 밝기 차.
 * verdict: distinct — 모두 문턱 이상 / cvd — 어느 유형에서 색만으로 구별이 어렵다 / all — 정상 시각에서도 가깝다.
 * worst: all이면 normal, cvd면 문턱 안에 든 유형 중 거리가 가장 짧은 것, distinct면 거리가 가장 짧은 유형.
 */
export const cvdPairCheck = ({ a, b }: { a: string; b: string }) => {
  const [la, lb] = [linearOf(a), linearOf(b)]
  const normal = distanceOf(la, lb)
  const [protan, deutan, tritan] = CVD_TYPES.map((type) => distanceOf(simulateLinear({ rgb: la, type }), simulateLinear({ rgb: lb, type })))
  const byType = { protan, deutan, tritan }
  const close = ({ distance, lightness }: PairDistance) => distance < CVD_MIN_DISTANCE && lightness < CVD_MIN_LIGHTNESS
  // 가장 나쁜 유형은 문턱 안에 든 유형 중 거리가 가장 짧은 것 — 거리는 짧아도 밝기 차로 갈리는 유형은 고르지 않는다
  const failing = CVD_TYPES.filter((type) => close(byType[type]))
  const nearest = (failing.length ? failing : CVD_TYPES).reduce((best, type) => (byType[type].distance < byType[best].distance ? type : best))
  const verdict: PairVerdict = normal.distance < NORMAL_MIN_DISTANCE ? 'all' : failing.length ? 'cvd' : 'distinct'
  const worst: Vision = verdict === 'all' ? 'normal' : nearest
  return { normal, protan, deutan, tritan, verdict, worst, distinct: verdict === 'distinct' }
}
