import { getProbe } from './probes'
import { confessionsFor } from './probes'

export type AlibiOutcome =
  | { type: 'walks'; eliminated: number[] }
  | { type: 'isCulprit'; eliminated: number[] }

/**
 * Alibi probe: the player names ONE suspect.
 *  - Named suspect is not the culprit → they walk alone.
 *  - Named suspect IS the culprit → everyone ELSE walks (case cracked).
 */
export function resolveAlibi(named: number, culprit: number, survivors: number[]): AlibiOutcome {
  if (named === culprit) {
    return { type: 'isCulprit', eliminated: survivors.filter((n) => n !== culprit) }
  }
  return { type: 'walks', eliminated: [named] }
}

/**
 * Median trap: "is the culprit above the survivors' median?"
 * Truthful answer; the half on the other side of the median walks.
 */
export function resolveMedianTrap(
  survivors: number[],
  culprit: number,
): {
  answer: boolean
  eliminated: number[]
  median: number
} {
  const sorted = [...survivors].sort((a, b) => a - b)
  const mid = Math.floor((sorted.length - 1) / 2)
  const median =
    sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid] + sorted[mid + 1]) / 2)
  const answer = culprit > median
  const eliminated = sorted.filter((n) => (n > median) !== answer)
  return { answer, eliminated, median }
}

/** Confessor: reveals one true dossier line about the culprit; eliminates nobody. */
export function resolveConfessor(culprit: number, rngPick: number): string {
  const lines = confessionsFor(culprit)
  return lines[rngPick % lines.length]
}

export function isStaticProbe(id: string): boolean {
  return getProbe(id).kind === 'static'
}
