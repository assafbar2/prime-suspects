import { STATIC_PROBES, getProbe, type ProbeDef } from './probes'
import { resolveMedianTrap } from './resolve'
import { BEST_DRAFT_TARGET, CHIPS_PER_CASE, WORST_DRAFT_TARGET } from './constants'

/** A static probe is live when the survivors disagree about its answer. */
export function isLiveStatic(p: ProbeDef, survivors: number[]): boolean {
  if (!p.test || survivors.length < 2) return false
  const first = p.test(survivors[0])
  return survivors.some((s) => p.test!(s) !== first)
}

/**
 * The first catalog probe whose truthful answer differs between two numbers.
 * Used on the verdict screen to explain why a wrong guess was never the culprit.
 */
export function findSeparatingProbe(a: number, b: number): ProbeDef | null {
  if (a === b) return null
  for (const p of STATIC_PROBES) {
    if (!p.test) continue
    if (p.test(a) !== p.test(b)) return p
  }
  return null
}

/**
 * Greedy truthful simulation over one fixed probe subset:
 * repeatedly play the card with the most balanced split among survivors
 * (a choice any player can make without knowing the culprit), apply the
 * real answer, continue until one suspect remains or chips run out.
 * Returns the number of suspects still standing.
 */
export function solveWithSubset(ids: string[], lineup: number[], culprit: number): number {
  let survivors = [...lineup]
  let chips = CHIPS_PER_CASE
  const used = new Set<string>()

  while (survivors.length > 1 && chips > 0) {
    let bestId: string | null = null
    let bestScore = -1
    for (const id of ids) {
      if (used.has(id)) continue
      const def = getProbe(id)
      if (def.kind === 'static' && def.test) {
        const test = def.test
        const yes = survivors.filter(test)
        const no = survivors.filter((n) => !test(n))
        if (!yes.length || !no.length) continue // dead on this board
        const score = Math.min(yes.length, no.length)
        if (score > bestScore) {
          bestScore = score
          bestId = id
        }
      } else if (def.kind === 'medianTrap') {
        const sorted = [...survivors].sort((a, b) => a - b)
        const mid = Math.floor((sorted.length - 1) / 2)
        const median =
          sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid] + sorted[mid + 1]) / 2)
        const above = survivors.filter((n) => n > median).length
        const score = Math.min(above, survivors.length - above)
        if (score > bestScore) {
          bestScore = score
          bestId = id
        }
      }
      // alibi & confessor: excluded — they are bonuses, not guarantees
    }
    if (!bestId || bestScore <= 0) break

    used.add(bestId)
    chips -= 1
    const def = getProbe(bestId)
    if (def.kind === 'medianTrap') {
      const r = resolveMedianTrap(survivors, culprit)
      const gone = new Set(r.eliminated)
      survivors = survivors.filter((n) => !gone.has(n))
    } else if (def.test) {
      const answer = def.test(culprit)
      survivors = survivors.filter((n) => def.test!(n) === answer)
    }
  }
  return survivors.length
}

function* sizeKCombos(n: number, k: number): Generator<number[]> {
  const idx = Array.from({ length: k }, (_, i) => i)
  while (true) {
    yield [...idx]
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) return
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
}

/**
 * Best-case outcome over every six-card draft of the deal — the existence
 * guarantee. Generation rejects any case that no thoughtful draft can crack
 * down to BEST_DRAFT_TARGET suspects within budget.
 */
export function bestDraftSurvivors(deal: string[], lineup: number[], culprit: number): number {
  const n = deal.length
  const k = Math.min(6, n)
  let best = lineup.length
  for (const combo of sizeKCombos(n, k)) {
    const ids = combo.map((i) => deal[i])
    const left = solveWithSubset(ids, lineup, culprit)
    if (left < best) best = left
    if (best <= BEST_DRAFT_TARGET) break // early exit — can't do better
  }
  return best
}

/**
 * Worst-case outcome over every possible six-card draft of the deal.
 * Generation rejects any case whose worst draft strands more than
 * WORST_DRAFT_TARGET suspects — the clumsiness ceiling.
 */
export function worstDraftSurvivors(deal: string[], lineup: number[], culprit: number): number {
  const n = deal.length
  const k = Math.min(6, n)
  let worst = 0
  for (const combo of sizeKCombos(n, k)) {
    const ids = combo.map((i) => deal[i])
    const left = solveWithSubset(ids, lineup, culprit)
    if (left > worst) worst = left
    if (worst > WORST_DRAFT_TARGET) break // early exit — already too bad
  }
  return worst
}
