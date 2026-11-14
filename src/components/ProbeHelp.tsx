import { getProbe } from '../engine/probes'

const EXAMPLES: Record<string, string> = {
  semiprime: 'Exactly two prime factors, counting repeats: 15 = 3 × 5 and 49 = 7 × 7.',
  triangular: 'A sum starting at 1: 10 = 1 + 2 + 3 + 4; 15 = 1 + 2 + 3 + 4 + 5.',
  squareFree: 'No square bigger than 1 divides it: 30 qualifies; 12 does not (4 divides 12).',
  abundant: 'Add the smaller divisors: 12 has 1 + 2 + 3 + 4 + 6 = 16, greater than 12.',
  fibonacci: 'Each number is the sum of the previous two: 1, 1, 2, 3, 5, 8, 13, 21…',
  even: 'Divisible by 2 with no remainder: 12 is even, 15 is odd.',
  medianTrap: 'Sort the survivors, find their middle value, then ask whether the culprit is above it.',
  prime: 'Exactly two positive divisors: 1 and itself. 13 is prime; 15 is not.',
}

export function ProbeHelp({ ids }: { ids: string[] }) {
  return <details className="probe-help"><summary>What do these questions mean?</summary>
    <p>You do not need to calculate every property. Use these examples, or choose familiar questions.</p>
    <dl>{ids.map((id) => <div key={id}><dt>{getProbe(id).label}</dt><dd>{EXAMPLES[id] ?? getProbe(id).note}</dd></div>)}</dl>
  </details>
}
