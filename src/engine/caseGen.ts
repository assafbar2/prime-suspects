import { intIn, mulberry32, sampleWithoutReplacement, shuffled, type Rng } from './rng'
import { STATIC_PROBES, getProbe, type ProbeDef } from './probes'

export interface CaseFile {
  seed: number
  caseNumber: number
  isDaily: boolean
  dateKey?: string
  lineup: number[]
  culprit: number
  /** Cards dealt for drafting (player picks a hand from these) */
  deal: string[]
  /** Greedy-optimal probe count for a perfect run */
  par: number
}

export const LINEUP_SIZE = 12
export const CHIPS_PER_CASE = 5
export const HAND_SIZE = 6

// ── Curated pools: numbers with personality ──────────────────

function range(lo: number, hi: number): number[] {
  const out: number[] = []
  for (let n = lo; n <= hi; n++) out.push(n)
  return out
}

const squares = range(4, 31).map((k) => k * k).filter((n) => n >= 16 && n <= 999)
const cubes = [27, 64, 125, 216, 343, 512, 729]
const powersOf2 = [16, 32, 64, 128, 256, 512]
const palindromes = [121, 131, 141, 151, 161, 171, 181, 191, 212, 232, 252, 272, 292, 313, 353, 373, 383, 505, 515, 525, 545, 555, 575, 585, 616, 636, 646, 656, 676, 686, 717, 737, 747, 757, 777, 787, 797, 828, 838, 848, 858, 878, 898, 919, 929, 939, 949, 959, 969, 979, 989, 999]
const repdigits = [111, 222, 333, 444, 555, 666, 777, 888]
const triangulars = [15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120, 136, 153, 171, 190, 210, 231, 253, 276, 300, 325, 351, 378, 406, 435, 465, 496, 528, 561, 595, 630, 666, 703, 741, 780, 820, 861, 903, 946, 990]
const fibonacci = [13, 21, 34, 55, 89, 144, 233, 377, 610, 987]
const perfects = [6, 28, 496]
const primes = [101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997]
const abundant = [12, 18, 20, 24, 30, 36, 40, 42, 48, 54, 56, 60, 66, 70, 72, 78, 80, 84, 88, 90, 96, 100, 102, 104, 108, 114, 126, 132, 138, 140, 150, 156, 160, 162, 174, 180]

function interestingPool(): number[] {
  return [...new Set([...squares, ...cubes, ...powersOf2, ...palindromes.slice(0, 24), ...repdigits, ...triangulars.slice(0, 20), ...fibonacci, ...perfects, ...abundant.slice(0, 20)])]
}

// ── Deal construction ────────────────────────────────────────

export function buildDeal(rng: Rng): string[] {
  const byTier = (t: string) => shuffled(rng, STATIC_PROBES.filter((p) => p.tier === t))

  // Wildcards: always offer a choice of two.
  const wc = sampleWithoutReplacement(rng, ['medianTrap', 'alibi', 'confessor'], 2)

  return shuffled(rng, [
    ...sampleWithoutReplacement(rng, byTier('beat'), 3).map((p) => p.id),
    ...sampleWithoutReplacement(rng, byTier('detective'), 4).map((p) => p.id),
    ...sampleWithoutReplacement(rng, byTier('specialist'), 2).map((p) => p.id),
    ...wc,
  ])
}

// ── Par solver (greedy most-balanced split) ───────────────────

export function greedyPar(lineup: number[]): { par: number; plan: string[] } {
  let survivors = new Set(lineup)
  const plan: string[] = []
  while (survivors.size > 1) {
    let best: ProbeDef | null = null
    let bestScore = -1
    let bestSurvivors: Set<number> | null = null
    for (const p of STATIC_PROBES) {
      const test = p.test
      if (!test || plan.includes(p.id)) continue
      const yes = [...survivors].filter(test)
      const no = [...survivors].filter((n) => !test(n))
      if (yes.length === 0 || no.length === 0) continue
      const score = Math.min(yes.length, no.length)
      if (score > bestScore) {
        bestScore = score
        best = p
        bestSurvivors = new Set(yes.length <= no.length ? yes : no)
      }
    }
    if (!best || !bestSurvivors) break
    plan.push(best.id)
    survivors = bestSurvivors
  }
  return { par: plan.length, plan }
}

// ── Case generation ───────────────────────────────────────────

function generateLineup(rng: Rng): number[] {
  const pool = shuffled(rng, interestingPool())
  const lineup: number[] = []
  const seen = new Set<number>()

  // Seed with 6 "interesting" numbers so probes have teeth…
  for (const n of pool) {
    if (lineup.length >= 6) break
    if (!seen.has(n)) {
      lineup.push(n)
      seen.add(n)
    }
  }
  // …and fill with ordinary citizens.
  let guard = 0
  while (lineup.length < LINEUP_SIZE && guard++ < 5000) {
    const n = intIn(rng, 101, 999)
    if (!seen.has(n)) {
      lineup.push(n)
      seen.add(n)
    }
  }
  return lineup
}

export function generateCase(seed: number, caseNumber: number, isDaily: boolean, dateKey?: string): CaseFile {
  for (let attempt = 0; attempt < 64; attempt++) {
    const rng = mulberry32((seed + attempt * 7919) >>> 0)
    const lineup = generateLineup(rng)
    const culprit = lineup[intIn(rng, 0, lineup.length - 1)]
    const { par } = greedyPar(lineup)
    if (par < 2 || par > CHIPS_PER_CASE - 1) continue
    return {
      seed: (seed + attempt * 7919) >>> 0,
      caseNumber,
      isDaily,
      dateKey,
      lineup: shuffled(rng, lineup),
      culprit,
      deal: buildDeal(rng),
      par,
    }
  }
  // Deterministic fallback — verified solvable by tests.
  const rng = mulberry32(1)
  const lineup = [16, 27, 49, 64, 121, 128, 225, 256, 343, 512, 729, 999]
  return {
    seed: 1,
    caseNumber,
    isDaily,
    dateKey,
    lineup,
    culprit: 128,
    deal: buildDeal(rng),
    par: greedyPar(lineup).par,
  }
}

export function todayDateKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dailySeed(dateKey: string): number {
  let h = 2166136261
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Resolve a static probe truthfully against the culprit:
 * the answer is whatever is true of the culprit, and every suspect
 * on the *other* side of the predicate walks.
 */
export function resolveStatic(
  probeId: string,
  suspects: number[],
  culprit: number,
): { answer: boolean; eliminated: number[] } {
  const def = getProbe(probeId)
  if (!def.test) throw new Error(`${probeId} is not a static probe`)
  const answer = def.test(culprit)
  const eliminated = suspects.filter((n) => def.test!(n) !== answer)
  return { answer, eliminated }
}
