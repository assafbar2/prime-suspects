import { describe, expect, it } from 'vitest'
import {
  bestDraftSurvivors,
  findSeparatingProbe,
  isLiveStatic,
  solveWithSubset,
  worstDraftSurvivors,
} from '../engine/fairness'
import { getProbe } from '../engine/probes'
import { BEST_DRAFT_TARGET, WORST_DRAFT_TARGET, generateCase } from '../engine/caseGen'

describe('findSeparatingProbe', () => {
  it('returns null for identical numbers', () => {
    expect(findSeparatingProbe(128, 128)).toBeNull()
  })

  it('finds a probe whose truthful answers differ', () => {
    const sep = findSeparatingProbe(128, 512)
    expect(sep).not.toBeNull()
    expect(sep!.test!(128)).not.toBe(sep!.test!(512))
  })

  it('separates essentially any two suspects in range (catalog coverage)', () => {
    let misses = 0
    for (let i = 0; i < 400; i++) {
      const a = 2 + ((i * 7919) % 998)
      const b = 2 + ((i * 104729 + 13) % 998)
      if (a === b) continue
      if (!findSeparatingProbe(a, b)) misses++
    }
    // True doubles are allowed by design (the verdict explains them),
    // but they must be vanishingly rare.
    expect(misses).toBeLessThanOrEqual(2)
  })
})

describe('isLiveStatic', () => {
  it('is dead when every survivor agrees', () => {
    expect(isLiveStatic(getProbe('gt500'), [600, 700])).toBe(false)
    expect(isLiveStatic(getProbe('even'), [601, 701])).toBe(false)
  })

  it('is live when survivors disagree', () => {
    expect(isLiveStatic(getProbe('gt500'), [200, 700])).toBe(true)
    expect(isLiveStatic(getProbe('square'), [49, 128])).toBe(true)
  })

  it('needs at least two survivors to be live', () => {
    expect(isLiveStatic(getProbe('even'), [4])).toBe(false)
  })
})

describe('solveWithSubset', () => {
  const lineup = [49, 64, 121, 128, 315, 343, 512, 625, 729, 810, 961, 1000]

  it('narrows to one survivor when the subset has splitting power', () => {
    const left = solveWithSubset(['even', 'square', 'powerOf2'], lineup, 64)
    expect(left).toBe(1)
  })

  it('cannot move when every card is dead on the board', () => {
    // 602 & 704: both even, both above 500, neither divisible by 3.
    expect(solveWithSubset(['even', 'gt500', 'div3'], [602, 704], 602)).toBe(2)
  })

  it('stops at the chip budget instead of hallucinating progress', () => {
    // Twelve numbers whose only splits peel off one suspect at a time.
    const stubborn = [97, 89, 83, 79, 73, 71, 67, 61, 59, 53, 47, 43] // primes, descending
    const left = solveWithSubset(['prime', 'gt500'], stubborn, 47)
    expect(left).toBeGreaterThanOrEqual(1)
    expect(left).toBeLessThanOrEqual(stubborn.length)
  })

  it('matches the whole-catalog guarantee on real generated cases', () => {
    for (let s = 1; s <= 15; s++) {
      const c = generateCase(s * 3331, s, false)
      const allStatics = [
        ...new Set([
          ...c.deal,
          'even',
          'div3',
          'div7',
          'square',
          'powerOf2',
          'palindrome',
          'firstGtLast',
        ]),
      ]
      expect(solveWithSubset(allStatics, c.lineup, c.culprit)).toBe(1)
    }
  })
})

describe('generation fairness guarantees', () => {
  const cases = Array.from({ length: 25 }, (_, i) => generateCase((i + 1) * 7717, i + 1, false))

  it('BEST: some six-card draft always cracks the case to exactly one suspect', () => {
    for (const c of cases) {
      expect(
        bestDraftSurvivors(c.deal, c.lineup, c.culprit),
        `case seed ${c.seed}: no draft reaches the culprit`,
      ).toBeLessThanOrEqual(BEST_DRAFT_TARGET)
    }
  })

  it('WORST: even the clumsiest draft narrows the room to ≤3 suspects', () => {
    for (const c of cases) {
      const worst = worstDraftSurvivors(c.deal, c.lineup, c.culprit)
      expect(worst, `case seed ${c.seed}: worst draft leaves ${worst} suspects`).toBeLessThanOrEqual(
        WORST_DRAFT_TARGET,
      )
    }
  })

  it('the daily path honors both guarantees', () => {
    for (let d = 1; d <= 8; d++) {
      const key = `2026-08-${String(d).padStart(2, '0')}`
      const seed =
        [...key].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0
      const c = generateCase(seed, d, true, key)
      expect(bestDraftSurvivors(c.deal, c.lineup, c.culprit)).toBeLessThanOrEqual(BEST_DRAFT_TARGET)
      expect(worstDraftSurvivors(c.deal, c.lineup, c.culprit)).toBeLessThanOrEqual(WORST_DRAFT_TARGET)
    }
  })
})
