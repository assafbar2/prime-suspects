import { PROBE_BY_ID } from '../engine/probes'
import { dailyIdentity, validDate } from './dates'
import { isRecord, timestamp, validateRun, type Run } from './run'

export const PREFIX = 'prime-suspects:v2:'
export const META_KEY = `${PREFIX}meta`
export const PRACTICE_KEY = `${PREFIX}practice`
export const LEGACY_KEY = 'prime-suspects:v1'
export const runKey = (identity: string) => `${PREFIX}daily:${identity}`

export interface LegacyStats { streak: number; bestStreak: number; casesClosed: number; totalStars: number; lastHand?: string[] }
export interface Meta {
  schema: 2
  onboardingSeen: boolean
  tutorialComplete: boolean
  migrationAcknowledged: boolean
  legacy: LegacyStats | null
  lastHand: string[]
  practiceCompleted: number
  practiceSolved: number
  active: string | null
  pendingDaily: string | null
  sourceCapturedAt: number
  sourceConsumedAt: number
  collectionStartedOn: string | null
  firstCompletion: { date: string; measured: boolean } | null
  returnD1: boolean
  returnD7: boolean
}

export function emptyMeta(): Meta {
  return { schema: 2, onboardingSeen: false, tutorialComplete: false, migrationAcknowledged: false, legacy: null,
    lastHand: [], practiceCompleted: 0, practiceSolved: 0, active: null, pendingDaily: null, sourceCapturedAt: 0, sourceConsumedAt: 0,
    collectionStartedOn: null, firstCompletion: null, returnD1: false, returnD7: false }
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function legacyStats(value: unknown): LegacyStats | null {
  if (!isRecord(value) || !['streak', 'bestStreak', 'casesClosed', 'totalStars'].every((key) => count(value[key]))) return null
  const lastHand = Array.isArray(value.lastHand) ? value.lastHand.filter((id): id is string => typeof id === 'string' && PROBE_BY_ID.has(id)).slice(0, 6) : []
  return { streak: Number(value.streak), bestStreak: Number(value.bestStreak), casesClosed: Number(value.casesClosed), totalStars: Number(value.totalStars), lastHand: [...new Set(lastHand)] }
}

function validateMeta(value: unknown): Meta | null {
  if (!isRecord(value) || value.schema !== 2) return null
  for (const key of ['onboardingSeen', 'tutorialComplete', 'migrationAcknowledged', 'returnD1', 'returnD7']) if (typeof value[key] !== 'boolean') return null
  if (!count(value.practiceCompleted) || !count(value.practiceSolved) || value.practiceSolved > value.practiceCompleted) return null
  if (!timestamp(value.sourceCapturedAt) || !timestamp(value.sourceConsumedAt)) return null
  if (value.active !== null && (typeof value.active !== 'string' || value.active.length > 100)) return null
  if (value.pendingDaily !== null && !validDate(value.pendingDaily)) return null
  if (!Array.isArray(value.lastHand) || value.lastHand.length > 6 || !value.lastHand.every((id) => typeof id === 'string' && PROBE_BY_ID.has(id))) return null
  if (value.collectionStartedOn !== null && !validDate(value.collectionStartedOn)) return null
  if (value.firstCompletion !== null && (!isRecord(value.firstCompletion) || !validDate(value.firstCompletion.date) || typeof value.firstCompletion.measured !== 'boolean')) return null
  if (value.legacy !== null && !legacyStats(value.legacy)) return null
  return { ...emptyMeta(), ...value } as Meta
}

export class Repository {
  notice = ''
  durable = true
  meta = emptyMeta()
  officials: Record<string, Run> = {}
  practice: Run | null = null
  constructor(private storage: Storage | null) {
    if (!storage) this.fail('Browser storage is unavailable.')
    this.reload()
    if (this.durable && this.read(META_KEY) === null) {
      const legacy = this.read(LEGACY_KEY)
      if (legacy !== null) {
        const stats = legacyStats(legacy)
        if (!stats) this.fail('An old save could not be read; it has been kept untouched.')
        else this.meta = { ...this.meta, legacy: stats, lastHand: stats.lastHand ?? [], onboardingSeen: stats.casesClosed > 0 }
      }
      this.write(META_KEY, this.meta)
    }
  }

  private fail(reason: string) {
    this.durable = false
    this.notice = `${reason} Session-only play: progress may be lost on reload and the daily attempt limit cannot be durable here. Existing data is not erased.`
  }

  private read(key: string): unknown {
    if (!this.durable) return null
    try {
      const raw = this.storage!.getItem(key)
      return raw === null ? null : JSON.parse(raw)
    } catch {
      this.fail('Storage is blocked or contains unreadable data.')
      return null
    }
  }

  private write(key: string, value: unknown) {
    if (!this.durable) return
    try { this.storage!.setItem(key, JSON.stringify(value)) }
    catch { this.fail('Progress could not be saved (storage may be full or blocked).') }
  }

  reload() {
    if (!this.durable) return
    const storedMeta = this.read(META_KEY)
    if (storedMeta !== null) {
      const meta = validateMeta(storedMeta)
      if (meta) this.meta = meta
      else this.fail('The save uses an unsupported or damaged schema.')
    }
    try {
      for (let index = 0; this.durable && index < this.storage!.length; index++) {
        const key = this.storage!.key(index)!
        if (!key.startsWith(`${PREFIX}daily:`) && key !== PRACTICE_KEY) continue
        const raw = this.read(key)
        const run = validateRun(raw)
        if (!run || (key === PRACTICE_KEY ? run.mode === 'daily' : run.mode !== 'daily' || key !== runKey(run.identity!))) {
          this.fail('A saved case failed validation; the original has been kept untouched.')
          break
        }
        if (key === PRACTICE_KEY) this.practice = run
        else this.officials[run.identity!] = run
      }
    } catch { this.fail('Saved cases are unavailable.') }
  }

  updateMeta(patch: Partial<Meta>) {
    this.meta = { ...this.meta, ...patch }
    this.write(META_KEY, this.meta)
  }

  readOfficial(identity: string): Run | null {
    if (this.durable) {
      const raw = this.read(runKey(identity))
      if (raw !== null) {
        const stored = validateRun(raw)
        if (stored?.mode === 'daily' && stored.identity === identity) this.officials[identity] = stored
        else this.fail('A saved daily failed validation.')
      }
    }
    return this.officials[identity] ?? null
  }

  save(run: Run): Run {
    let selected = run
    if (run.mode === 'daily') {
      const existing = this.readOfficial(run.identity!)
      if (existing) selected = { ...run, markers: { ...run.markers, ...existing.markers } }
      if (existing?.result) {
        selected = existing
        if (run.result?.completedAt === existing.result.completedAt && run.result.guess === existing.result.guess) {
          selected = { ...existing, markers: { ...run.markers, ...existing.markers } }
        }
      }
      this.officials[run.identity!] = selected
      this.write(runKey(run.identity!), selected)
    } else {
      this.practice = selected
      this.write(PRACTICE_KEY, selected)
    }
    return selected
  }

  forDate(date: string) { return this.readOfficial(dailyIdentity(date)) }
}

export function browserStorage(): Storage | null {
  try { return window.localStorage } catch { return null }
}
