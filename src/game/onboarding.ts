let started: number | null = null
let elapsed: number | null = null

export function beginOnboarding(now = performance.now()) { if (started === null) started = now }
export function firstMeaningfulMove(now = performance.now()): number | null {
  if (started !== null && elapsed === null) {
    elapsed = Math.max(0, now - started)
    performance.measure('prime-suspects:time-to-first-probe', { start: started, duration: elapsed })
    if (import.meta.env.DEV) console.debug('[Prime Suspects: observed onboarding milliseconds]', Math.round(elapsed))
  }
  return elapsed
}
