export function digits(n: number): number[] {
  return String(Math.abs(n)).split('').map(Number)
}

export function digitSum(n: number): number {
  return digits(n).reduce((a, b) => a + b, 0)
}

export function isEven(n: number): boolean {
  return n % 2 === 0
}

export function isSquare(n: number): boolean {
  const r = Math.round(Math.sqrt(n))
  return r * r === n
}

export function isCube(n: number): boolean {
  const r = Math.round(Math.cbrt(n))
  return r * r * r === n
}

export function isPowerOf2(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0
}

export function isPrime(n: number): boolean {
  if (n < 2) return false
  if (n < 4) return true
  if (n % 2 === 0) return false
  for (let f = 3; f * f <= n; f += 2) {
    if (n % f === 0) return false
  }
  return true
}

export function isTriangular(n: number): boolean {
  const k = (Math.sqrt(8 * n + 1) - 1) / 2
  return Number.isInteger(k)
}

export function isFibonacci(n: number): boolean {
  if (n < 1) return false
  const plus = 5 * n * n + 4
  const minus = 5 * n * n - 4
  return isPerfectSquare(plus) || (minus > 0 && isPerfectSquare(minus))
}

function isPerfectSquare(n: number): boolean {
  const r = Math.round(Math.sqrt(n))
  return r * r === n
}

export function isPalindrome(n: number): boolean {
  const s = String(n)
  return s === [...s].reverse().join('')
}

export function digitsStrictlyIncreasing(n: number): boolean {
  const d = digits(n)
  for (let i = 1; i < d.length; i++) {
    if (d[i] <= d[i - 1]) return false
  }
  return true
}

export function firstDigitGreaterThanLast(n: number): boolean {
  const d = digits(n)
  return d[0] > d[d.length - 1]
}

export function allDigitsDistinct(n: number): boolean {
  const seen = new Set(digits(n))
  return seen.size === digits(n).length
}

export function reverseBiggerThanOriginal(n: number): boolean {
  const r = Number([...String(n)].reverse().join(''))
  return r > n
}

export function reverseDivisibleByOriginal(n: number): boolean {
  const s = String(n)
  const r = Number([...s].reverse().join('').replace(/^0+(?=\d)/, ''))
  if (r === 0 || r === n) return false
  return r % n === 0
}

export function primeFactorsWithMultiplicity(n: number): number[] {
  const out: number[] = []
  let m = n
  for (let f = 2; f * f <= m; f++) {
    while (m % f === 0) {
      out.push(f)
      m /= f
    }
  }
  if (m > 1) out.push(m)
  return out
}

export function isSemiprime(n: number): boolean {
  return primeFactorsWithMultiplicity(n).length === 2
}

export function isSquareFree(n: number): boolean {
  for (let f = 2; f * f <= n; f++) {
    if (n % (f * f) === 0) return false
  }
  return true
}

export function properDivisorSum(n: number): number {
  if (n < 2) return 0
  let sum = 1
  for (let f = 2; f * f <= n; f++) {
    if (n % f === 0) {
      sum += f
      const other = n / f
      if (other !== f) sum += other
    }
  }
  return sum
}

export function isAbundant(n: number): boolean {
  return properDivisorSum(n) > n
}

export function isPerfect(n: number): boolean {
  return properDivisorSum(n) === n && n >= 2
}
