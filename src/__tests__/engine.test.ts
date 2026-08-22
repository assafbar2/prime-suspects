import { describe, expect, it } from 'vitest'
import {
  isAbundant,
  isCube,
  isFibonacci,
  isPalindrome,
  isPerfect,
  isPowerOf2,
  isPrime,
  isSemiprime,
  isSquare,
  isSquareFree,
  isTriangular,
} from '../engine/numbers'
import { PROBES, STATIC_PROBES, confessionsFor, getProbe } from '../engine/probes'
import {
  CHIPS_PER_CASE,
  HAND_SIZE,
  LINEUP_SIZE,
  BEST_DRAFT_TARGET,
  buildDeal,
  dailySeed,
  generateCase,
  greedyPar,
  resolveStatic,
  todayDateKey,
} from '../engine/caseGen'
import { bestDraftSurvivors } from '../engine/fairness'
import { mulberry32 } from '../engine/rng'
import { resolveAlibi, resolveConfessor, resolveMedianTrap } from '../engine/resolve'

const lineup = [49, 64, 121, 128, 315, 343, 512, 625, 729, 810, 961, 1000]

describe('numbers', () => {
  it('classifies squares and cubes', () => {
    for (const n of [16, 49, 121, 144, 961]) expect(isSquare(n)).toBe(true)
    for (const n of [27, 64, 125, 343]) expect(isCube(n)).toBe(true)
    expect(isSquare(128)).toBe(false)
    expect(isCube(128)).toBe(false)
  })

  it('classifies powers of two', () => {
    for (const n of [1, 2, 64, 128, 512]) expect(isPowerOf2(n)).toBe(true)
    for (const n of [0, 3, 100, 999]) expect(isPowerOf2(n)).toBe(false)
  })

  it('knows primes', () => {
    for (const n of [2, 3, 5, 101, 997]) expect(isPrime(n)).toBe(true)
    for (const n of [1, 4, 100, 121]) expect(isPrime(n)).toBe(false)
  })

  it('knows palindromes', () => {
    for (const n of [7, 55, 121, 999]) expect(isPalindrome(n)).toBe(true)
    expect(isPalindrome(128)).toBe(false)
  })

  it('knows triangulars, fibonaccis', () => {
    for (const n of [6, 28, 105, 496]) expect(isTriangular(n)).toBe(true)
    for (const n of [13, 21, 89, 144, 987]) expect(isFibonacci(n)).toBe(true)
    // Overlap is legal (e.g. 21) but these are not fibonacci:
    expect(isFibonacci(100)).toBe(false)
    expect(isTriangular(101)).toBe(false)
  })

  it('knows semiprimes, square-free, abundant, perfect', () => {
    expect(isSemiprime(15)).toBe(true) // 3·5
    expect(isSemiprime(128)).toBe(false) // 2^7
    expect(isSemiprime(315)).toBe(false) // 3·3·5·7
    expect(isSquareFree(30)).toBe(true)
    expect(isSquareFree(49)).toBe(false)
    expect(isSquareFree(8)).toBe(false)
    expect(isAbundant(12)).toBe(true)
    expect(isAbundant(28)).toBe(false) // perfect
    expect(isPerfect(28)).toBe(true)
    expect(isPerfect(496)).toBe(true)
    expect(isPerfect(12)).toBe(false)
  })
})

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = Array.from({ length: 10 }, a)
    const seqB = Array.from({ length: 10 }, b)
    expect(seqA).toEqual(seqB)
  })
})

describe('probes catalog', () => {
  it('every static probe answers booleans across 1..2000 without crashing', () => {
    for (const p of STATIC_PROBES) {
      expect(p.test, p.id).toBeDefined()
      for (let n = 1; n <= 2000; n++) {
        const r = p.test!(n)
        expect(typeof r).toBe('boolean')
      }
    }
  })

  it('static probes actually discriminate somewhere in 1..999', () => {
    for (const p of STATIC_PROBES) {
      if (!p.test) continue
      let yes = 0
      let no = 0
      for (let n = 1; n <= 999; n++) p.test(n) ? yes++ : no++
      expect(yes, `${p.id} never answers yes`).toBeGreaterThan(0)
      expect(no, `${p.id} never answers no`).toBeGreaterThan(0)
    }
  })

  it('wildcards exist and are non-static', () => {
    expect(getProbe('medianTrap').kind).toBe('medianTrap')
    expect(getProbe('alibi').kind).toBe('alibi')
    expect(getProbe('confessor').kind).toBe('confessor')
    expect(PROBES.length).toBeGreaterThanOrEqual(28)  })
})

describe('case generation', () => {
  it('is deterministic for a given seed', () => {
    const a = generateCase(12345, 7, false)
    const b = generateCase(12345, 7, false)
    expect(a.lineup).toEqual(b.lineup)
    expect(a.culprit).toBe(b.culprit)
    expect(a.par).toBe(b.par)
    expect(a.deal).toEqual(b.deal)
  })

  it('produces valid lineups with solvable par', () => {
    for (let s = 1; s <= 16; s++) {
      const c = generateCase(s * 977, s, false)
      expect(c.lineup).toHaveLength(LINEUP_SIZE)
      expect(new Set(c.lineup).size).toBe(LINEUP_SIZE)
      expect(c.lineup).toContain(c.culprit)
      expect(c.par).toBeGreaterThanOrEqual(2)
      expect(c.par).toBeLessThanOrEqual(CHIPS_PER_CASE - 1)
      expect(c.deal.length).toBeGreaterThanOrEqual(HAND_SIZE + 2)
      // Deal always contains at least one wildcard choice.
      const wcInDeal = c.deal.filter((id) => getProbe(id).tier === 'wildcard')
      expect(wcInDeal.length).toBe(2)
    }
  }, 45000)

  it('daily seeds differ by date and match date key format', () => {
    expect(dailySeed('2026-08-21')).not.toBe(dailySeed('2026-08-22'))
    expect(todayDateKey(new Date(2026, 7, 21))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('buildDeal deals a returning player their kit verbatim', () => {
    const kit = ['even', 'div7', 'square', 'powerOf2', 'prime', 'contains7']
    const deal = buildDeal(mulberry32(7), kit)
    expect(deal).toHaveLength(11)
    for (const id of kit) expect(deal, `missing ${id}`).toContain(id)
    expect(deal.filter((id) => getProbe(id).tier === 'wildcard')).toHaveLength(2)
  })

  it('kit-based cases still satisfy the fairness guarantee', () => {
    const kit = ['even', 'gt500', 'digitSumOdd', 'div3', 'square', 'contains7']
    const c = generateCase(424242, 1, false, undefined, kit)
    for (const id of kit) expect(c.deal).toContain(id)
    expect(bestDraftSurvivors(c.deal, c.lineup, c.culprit)).toBeLessThanOrEqual(BEST_DRAFT_TARGET)
  })
})

describe('resolution', () => {
  it('resolveStatic answers truthfully and eliminates the other side', () => {
    const r = resolveStatic('square', lineup, 64)
    expect(r.answer).toBe(true)
    expect(r.eliminated.sort((a, b) => a - b)).toEqual([128, 315, 343, 512, 810, 1000].sort((a, b) => a - b))
    const r2 = resolveStatic('square', lineup, 315)
    expect(r2.answer).toBe(false)
    expect(r2.eliminated.sort((a, b) => a - b)).toEqual([49, 64, 121, 625, 729, 961].sort((a, b) => a - b))
  })

  it('median trap splits survivors near half, truthfully', () => {
    const survivors = [100, 200, 300, 400]
    const r = resolveMedianTrap(survivors, 300)
    expect(r.median).toBe(250)
    expect(r.answer).toBe(true)
    expect(r.eliminated).toEqual([100, 200])
  })

  it('median trap handles odd counts and NO answers', () => {
    const survivors = [10, 20, 99]
    const yes = resolveMedianTrap(survivors, 99)
    expect(yes.median).toBe(20)
    expect(yes.eliminated).toEqual([10, 20])
    const no = resolveMedianTrap(survivors, 10)
    expect(no.answer).toBe(false)
    expect(no.eliminated).toEqual([99])
  })

  it('alibi: named innocent walks alone', () => {
    const r = resolveAlibi(810, 128, lineup)
    expect(r.type).toBe('walks')
    expect(r.eliminated).toEqual([810])
  })

  it('alibi: naming the culprit clears the room', () => {
    const r = resolveAlibi(128, 128, lineup)
    expect(r.type).toBe('isCulprit')
    expect(r.eliminated.sort((a, b) => a - b)).toEqual(
      lineup.filter((n) => n !== 128).sort((a, b) => a - b),
    )
  })

  it('confessor returns a true line about the culprit', () => {
    const line = resolveConfessor(128, 0)
    expect(confessionsFor(128)).toContain(line)
    expect(line.length).toBeGreaterThan(0)
  })
})

describe('greedy par solver', () => {
  it('narrows to one survivor following its own balanced-split policy', () => {
    const { par, plan } = greedyPar(lineup)
    let survivors = new Set(lineup)
    for (const id of plan) {
      const p = getProbe(id)
      const yes = [...survivors].filter(p.test!)
      const no = [...survivors].filter((n) => !p.test!(n))
      if (!yes.length || !no.length) break
      survivors = new Set(yes.length <= no.length ? yes : no)
    }
    expect(survivors.size).toBe(1)
    expect(par).toBe(plan.length)
    expect(new Set(plan).size).toBe(plan.length)
    expect(plan.every((id) => getProbe(id).kind === 'static')).toBe(true)
  })
})
