export const GENERATOR_VERSION = 2
export const DAY_MS = 86_400_000

export function utcDate(now: Date | number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const stamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(stamp) && utcDate(stamp) === value
}

export function dayOffset(date: string, days: number): string {
  return utcDate(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
}

export function daysBetween(first: string, last: string): number {
  return Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / DAY_MS)
}

export function dailyIdentity(date: string): string {
  if (!validDate(date)) throw new Error('Invalid daily date')
  return `v${GENERATOR_VERSION}:${date}`
}

export function resetClock(now = Date.now()) {
  const today = utcDate(now)
  const next = new Date(`${dayOffset(today, 1)}T00:00:00Z`)
  const seconds = Math.max(0, Math.ceil((next.getTime() - now) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return {
    today,
    remaining: `${hours}h ${minutes}m`,
    local: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(next),
  }
}

export function dailyStats(results: Record<string, { win: boolean }>, today = utcDate()) {
  const dates = Object.keys(results).filter(validDate).sort()
  let best = 0
  let chain = 0
  let previous = ''
  for (const date of dates) {
    chain = results[date].win ? (previous && dayOffset(previous, 1) === date ? chain : 0) + 1 : 0
    best = Math.max(best, chain)
    previous = date
  }
  let anchor = results[today] ? today : dayOffset(today, -1)
  let current = 0
  while (results[anchor]?.win) {
    current += 1
    anchor = dayOffset(anchor, -1)
  }
  return { current, best, completed: dates.length, solved: dates.filter((date) => results[date].win).length }
}
