import { daysBetween, utcDate, validDate } from './dates'
import type { Meta } from './storage'
import type { Run } from './run'

export const EVENT_NAMES = ['game_start', 'tutorial_complete', 'game_complete', 'first_completion', 'share_intent', 'share_success', 'shared_link_start', 'return_d1', 'return_d7', 'support_click'] as const
export type EventName = typeof EVENT_NAMES[number]
export type Properties = Record<string, string | number | boolean>
export interface Telemetry { enabled: boolean; emit: (name: EventName, properties: Properties) => void }

export function allowProperties(input: Properties): Properties {
  const output: Properties = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === 'mode' && ['daily', 'daily-practice', 'endless'].includes(String(value))) output[key] = value
    if (key === 'outcome' && ['solved', 'missed'].includes(String(value))) output[key] = value
    if (key === 'probe_count' && Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 5) output[key] = value
    if (key === 'generator_version' && value === 2) output[key] = value
    if (['daily_date', 'activation_cohort_date', 'result_completion_date'].includes(key) && validDate(value)) output[key] = value
    if (key === 'within_24h_of_result' && typeof value === 'boolean') output[key] = value
    if (key === 'source' && value === 'player_share') output[key] = value
  }
  return output
}

export function createTelemetry(enabled = false, sink?: (name: EventName, properties: Properties) => void | Promise<void>, debug?: (name: EventName, properties: Properties) => void): Telemetry {
  return { enabled, emit(name, properties) {
    if (!EVENT_NAMES.includes(name)) return
    const bounded = allowProperties(properties)
    try { debug?.(name, bounded) } catch {}
    if (!enabled || !sink) return
    try { void Promise.resolve(sink(name, bounded)).catch(() => undefined) } catch {}
  } }
}

export function propertiesFor(run: Run, meta: Meta): Properties {
  return {
    mode: run.mode, probe_count: run.usedIds.length, generator_version: 2,
    ...(run.caseFile.dateKey ? { daily_date: run.caseFile.dateKey } : {}),
    ...(run.result ? { outcome: run.result.win ? 'solved' : 'missed', result_completion_date: utcDate(run.result.completedAt) } : {}),
    ...(meta.firstCompletion ? { activation_cohort_date: meta.firstCompletion.date } : {}),
  }
}

export function within24Hours(completedAt: number, now: number): boolean {
  return now >= completedAt && now - completedAt < 86_400_000
}

export function cohortMature(cohort: string, now: number, metric: 'share' | 'd1' | 'd7'): boolean {
  return daysBetween(cohort, utcDate(now)) >= (metric === 'd7' ? 8 : 2)
}

export function measuredCohort(meta: Meta): boolean {
  return !!(meta.firstCompletion?.measured && meta.collectionStartedOn && meta.firstCompletion.date >= meta.collectionStartedOn)
}

export function browserTelemetry(): Telemetry {
  const enabled = import.meta.env.VITE_CUSTOM_EVENTS === 'true'
  const debug = import.meta.env.DEV && import.meta.env.VITE_TELEMETRY_DEBUG === 'true'
    ? (name: EventName, properties: Properties) => console.debug('[Prime Suspects: local debug]', name, properties)
    : undefined
  let sdk: Promise<typeof import('@vercel/analytics')> | undefined
  const load = () => sdk ??= import('@vercel/analytics').then((module) => {
    module.inject({ mode: 'production', beforeSend: (event) => ({ ...event, url: 'https://prime-suspects.vercel.app/' }) })
    return module
  })
  return createTelemetry(enabled, async (name, properties) => { (await load()).track(name, properties) }, debug)
}
