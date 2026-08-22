import { getProbe } from './probes'
import { confessionsFor } from './probes'

export type AlibiOutcome =
  | { type: 'bothWalk'; eliminated: number[] }
  | { type: 'oneOfThem'; eliminated: number[] }

/**
 * Alibi probe: the player names two suspects.
 *  - If the culprit is one of them → everyone ELSE walks (huge).
 *  - If not → both named suspects walk (still decent).
 */
export function resolveAlibi(picked: [number, number], culprit: number, suspects: number[]): AlibiOutcome {
  const named = new Set(picked)
  if (named.has(culprit)) {
    return { type: 'oneOfThem', eliminated: suspects.filter((n) => !named.has(n)) }
  }
  return { type: 'bothWalk', eliminated: [...named] }
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
