import {
  allDigitsDistinct,
  digitSum,
  digitsStrictlyIncreasing,
  firstDigitGreaterThanLast,
  isAbundant,
  isCube,
  isEven,
  isFibonacci,
  isPalindrome,
  isPerfect,
  isPowerOf2,
  isPrime,
  isSemiprime,
  isSquare,
  isSquareFree,
  isTriangular,
  primeFactorsWithMultiplicity,
  reverseBiggerThanOriginal,
} from './numbers'

export type Tier = 'beat' | 'detective' | 'specialist' | 'wildcard'

export type ProbeKind = 'static' | 'medianTrap' | 'alibi' | 'confessor'

export interface ProbeDef {
  id: string
  tier: Tier
  kind: ProbeKind
  /** Question shown on the card */
  label: string
  /** Short card-face glyph or word */
  face: string
  /** One-line explanation for the tooltip */
  note: string
  test?: (n: number) => boolean
}

const P = (p: ProbeDef): ProbeDef => p

export const PROBES: ProbeDef[] = [
  // ── Beat cops ────────────────────────────────────────────────
  P({ id: 'even', tier: 'beat', kind: 'static', label: 'Is it even?', face: '2 |', note: 'Halves the lineup on the spot.', test: isEven }),
  P({ id: 'gt500', tier: 'beat', kind: 'static', label: 'Above 500?', face: '500+', note: 'Splits the street in two.', test: (n) => n > 500 }),
  P({ id: 'ends05', tier: 'beat', kind: 'static', label: 'Ends in 0 or 5?', face: '0·5', note: 'Divisible by five.', test: (n) => n % 5 === 0 }),
  P({ id: 'digitSumOdd', tier: 'beat', kind: 'static', label: 'Odd digit sum?', face: 'Σ odd', note: 'Add the digits. Is the total odd?', test: (n) => digitSum(n) % 2 === 1 }),
  P({ id: 'contains7', tier: 'beat', kind: 'static', label: 'Wears a seven?', face: '…7…', note: 'The digit 7 appears anywhere in it.', test: (n) => String(n).includes('7') }),

  // ── Detectives ───────────────────────────────────────────────
  P({ id: 'div3', tier: 'detective', kind: 'static', label: 'Divisible by 3?', face: '÷3', note: 'Classic. Digit-sum tells the truth here too.', test: (n) => n % 3 === 0 }),
  P({ id: 'div7', tier: 'detective', kind: 'static', label: 'Divisible by 7?', face: '÷7', note: 'The trickiest small divisor.', test: (n) => n % 7 === 0 }),
  P({ id: 'div11', tier: 'detective', kind: 'static', label: 'Divisible by 11?', face: '÷11', note: 'Alternating digit sums match.', test: (n) => n % 11 === 0 }),
  P({ id: 'square', tier: 'detective', kind: 'static', label: 'A perfect square?', face: 'x²', note: 'Some integer times itself.', test: isSquare }),
  P({ id: 'palindrome', tier: 'detective', kind: 'static', label: 'Reads the same both ways?', face: '⟲', note: 'Palindromic number.', test: isPalindrome }),
  P({ id: 'digitsIncreasing', tier: 'detective', kind: 'static', label: 'Digits strictly climbing?', face: '1↗9', note: 'Each digit bigger than the last.', test: digitsStrictlyIncreasing }),
  P({ id: 'firstGtLast', tier: 'detective', kind: 'static', label: 'Head taller than tail?', face: 'a>z', note: 'First digit greater than the last.', test: firstDigitGreaterThanLast }),
  P({ id: 'digitSumDiv9', tier: 'detective', kind: 'static', label: 'Digit sum divisible by 9?', face: 'Σ9', note: "Casting out nines.", test: (n) => digitSum(n) % 9 === 0 }),
  P({ id: 'prime', tier: 'detective', kind: 'static', label: 'Prime suspect — literally?', face: 'P', note: 'No divisors but 1 and itself.', test: isPrime }),
  P({ id: 'allDistinct', tier: 'detective', kind: 'static', label: 'All digits distinct?', face: '≠≠', note: 'No repeated digits.', test: allDigitsDistinct }),
  P({
    id: 'repdigit',
    tier: 'detective',
    kind: 'static',
    label: 'All digits identical?',
    face: 'aaa',
    note: 'A repdigit — 111, 222, 777 …',
    test: (n) => new Set(String(n).split('')).size === 1,
  }),

  // ── Specialists ──────────────────────────────────────────────
  P({ id: 'cube', tier: 'specialist', kind: 'static', label: 'A perfect cube?', face: 'x³', note: 'Rare. Devastating when it lands.', test: isCube }),
  P({ id: 'powerOf2', tier: 'specialist', kind: 'static', label: 'A power of two?', face: '2ⁿ', note: '64 · 128 · 256 …', test: isPowerOf2 }),
  P({ id: 'triangular', tier: 'specialist', kind: 'static', label: 'Triangular?', face: '▲', note: 'Stack of bowling pins: 1, 3, 6, 10 …', test: isTriangular }),
  P({ id: 'fibonacci', tier: 'specialist', kind: 'static', label: 'Fibonacci?', face: 'φ', note: '144, 233, 377, 610, 987 …', test: isFibonacci }),
  P({ id: 'semiprime', tier: 'specialist', kind: 'static', label: 'Product of exactly two primes?', face: 'pq', note: 'RSA keeps its secrets here.', test: isSemiprime }),
  P({ id: 'squareFree', tier: 'specialist', kind: 'static', label: 'Square-free?', face: '√̸x²', note: 'No repeated prime factors.', test: isSquareFree }),
  P({ id: 'abundant', tier: 'specialist', kind: 'static', label: 'Abundant?', face: 'Σ>n', note: 'Its proper divisors add up to more than itself.', test: isAbundant }),
  P({ id: 'mod4eq1', tier: 'specialist', kind: 'static', label: 'Leaves remainder 1 over 4?', face: '≡1₍₄₎', note: 'The Pythagorean tell.', test: (n) => n % 4 === 1 }),
  P({
    id: 'emirp',
    tier: 'specialist',
    kind: 'static',
    label: 'Reverses into another prime?',
    face: '⇄P',
    note: 'An emirp — prime in the mirror too (13 ⇄ 31).',
    test: (n) => isPrime(n) && !isPalindrome(n) && isPrime(Number([...String(n)].reverse().join(''))),
  }),

  // ── Wildcards ────────────────────────────────────────────────
  P({
    id: 'medianTrap',
    tier: 'wildcard',
    kind: 'medianTrap',
    label: 'Above the survivors’ median?',
    face: '⚖',
    note: 'Always cuts the remaining suspects nearly in half.',
  }),
  P({
    id: 'alibi',
    tier: 'wildcard',
    kind: 'alibi',
    label: 'Call an alibi',
    face: '👥',
    note: 'Name one suspect. Not guilty → they walk. Guilty → everyone else walks.',
  }),
  P({
    id: 'confessor',
    tier: 'wildcard',
    kind: 'confessor',
    label: 'Squeeze a confession',
    face: '🕯',
    note: 'Reveals one true fact about the culprit. Crosses off nobody.',
  }),
]

export const PROBE_BY_ID: ReadonlyMap<string, ProbeDef> = new Map(PROBES.map((p) => [p.id, p]))

export function getProbe(id: string): ProbeDef {
  const p = PROBE_BY_ID.get(id)
  if (!p) throw new Error(`Unknown probe: ${id}`)
  return p
}

export const STATIC_PROBES = PROBES.filter((p) => p.kind === 'static')

/** True facts usable by the Confessor, phrased as dossier lines. */
export function confessionsFor(n: number): string[] {
  const out: string[] = []
  if (isPrime(n)) out.push('Works alone. (Prime.)')
  if (isEven(n)) out.push('Moves in pairs. (Even.)')
  if (isSquare(n)) out.push('Built perfectly square.')
  if (isCube(n)) out.push('Has three equal sides. (Perfect cube.)')
  if (isPowerOf2(n)) out.push('Keeps halving cleanly. (Power of two.)')
  if (isFibonacci(n)) out.push('Follows the golden ratio crowd. (Fibonacci.)')
  if (isTriangular(n)) out.push('Stacks into a triangle. (Triangular.)')
  if (isPalindrome(n)) out.push('Reads the same in the mirror.')
  if (isSemiprime(n)) out.push('Exactly two primes inside. (Semiprime.)')
  if (isAbundant(n)) out.push('Its parts outweigh the whole. (Abundant.)')
  if (isPerfect(n)) out.push('Flawlessly balanced. (Perfect number.)')
  out.push(`Digits sum to ${digitSum(n)}.`)
  out.push(`${primeFactorsWithMultiplicity(n).length} prime factor(s), counted with repeats.`)
  if (reverseBiggerThanOriginal(n)) out.push('Looks bigger backwards.')
  return out
}
