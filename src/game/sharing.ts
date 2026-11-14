import { daysBetween, utcDate, validDate } from './dates'
import type { Run } from './run'

export const CANONICAL_ORIGIN = 'https://prime-suspects.vercel.app/'
export type Route = { kind: 'home'; source: boolean } | { kind: 'daily'; date: string; source: boolean } | { kind: 'invalid'; reason: string; source: boolean }

export function parseRoute(search: string, today = utcDate()): Route {
  const params = new URLSearchParams(search)
  const source = params.getAll('utm_source').length === 1 && params.getAll('utm_medium').length === 1 && params.get('utm_source') === 'player_share' && params.get('utm_medium') === 'result'
  if (!params.has('daily') && !params.has('v')) return { kind: 'home', source }
  const date = params.get('daily')
  if (params.getAll('v').length !== 1 || params.get('v') !== '2') return { kind: 'invalid', reason: 'This link uses an unsupported daily version. Version 2 links are supported.', source }
  if (params.getAll('daily').length !== 1 || !validDate(date)) return { kind: 'invalid', reason: 'This link does not contain a valid calendar date.', source }
  const age = daysBetween(date, today)
  if (age < 0) return { kind: 'invalid', reason: 'That daily case is in the future. It opens at 00:00 UTC on its date.', source }
  if (age > 7) return { kind: 'invalid', reason: 'This link is older than the seven-day practice window. Saved unfinished official cases can still be resumed from the lobby.', source }
  return { kind: 'daily', date, source }
}

export function shareText(run: Pick<Run, 'mode' | 'caseFile' | 'result'>): string {
  if (!run.result) return ''
  const url = new URL(CANONICAL_ORIGIN)
  const daily = run.mode !== 'endless'
  if (daily) { url.searchParams.set('daily', run.caseFile.dateKey!); url.searchParams.set('v', '2') }
  url.searchParams.set('utm_source', 'player_share')
  url.searchParams.set('utm_medium', 'result')
  const label = run.mode === 'daily' ? run.caseFile.dateKey : run.mode === 'daily-practice' ? `PRACTICE · ${run.caseFile.dateKey}` : 'PRACTICE · ENDLESS'
  return `Prime Suspects · ${label}\n${run.result.win ? 'CASE CLOSED' : 'CASE MISSED'} · ${run.result.probesUsed}/5 probes\nYour turn: ${url.href}`
}

export async function deliverShare(text: string, method: 'native' | 'copy', services: {
  share?: (data: ShareData) => Promise<void>
  copy?: (text: string) => Promise<void>
}): Promise<'success' | 'cancelled' | 'fallback'> {
  try {
    if (method === 'native') {
      if (!services.share) return 'fallback'
      await services.share({ title: 'Prime Suspects', text })
    } else {
      if (!services.copy) return 'fallback'
      await services.copy(text)
    }
    return 'success'
  } catch (error) {
    return method === 'native' && error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError' ? 'cancelled' : 'fallback'
  }
}

export function supportUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() !== value || value.length > 2048) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}
