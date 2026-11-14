import { useEffect, useState, useSyncExternalStore } from 'react'
import { buildDeal, generateCase, generateDaily, type CaseFile } from '../engine/caseGen'
import { CHIPS_PER_CASE } from '../engine/constants'
import { dailyIdentity, dailyStats, daysBetween, utcDate } from './dates'
import { createRun, reduceRun, type Mode, type Run, type RunAction } from './run'
import { browserStorage, PREFIX, Repository, type Meta } from './storage'
import { parseRoute } from './sharing'
import { browserTelemetry, createTelemetry, measuredCohort, propertiesFor, within24Hours, type EventName, type Telemetry } from './telemetry'

export type { Mode, RunAction }
export type Phase = 'lobby' | 'tutorial' | 'draft' | 'board' | 'verdict'
export interface Stats { streak: number; bestStreak: number; casesClosed: number; solved: number; lastHand: string[] }
export interface GameState extends Omit<Run, 'schema' | 'phase' | 'caseFile'> {
  phase: Phase
  caseFile: CaseFile | null
  run: Run | null
  stats: Stats
  meta: Meta
  officials: Record<string, Run>
  practice: Run | null
  notice: string
  routeError: string
  linkedDate: string | null
  pending: boolean
  today: string
}

export type Action = RunAction
  | { type: 'START_CASE'; mode: Mode; date?: string }
  | { type: 'RESUME_OFFICIAL'; identity: string }
  | { type: 'RESUME_PRACTICE' }
  | { type: 'REUSE_LAST_HAND' }
  | { type: 'NEXT_CASE' }
  | { type: 'BACK_LOBBY' }
  | { type: 'START_TUTORIAL' }
  | { type: 'TUTORIAL_COMPLETE' }
  | { type: 'END_TUTORIAL'; complete: boolean }
  | { type: 'ACK_MIGRATION' }
  | { type: 'SHARE_INTENT'; runId: string }
  | { type: 'SHARE_SUCCESS'; runId: string }
  | { type: 'SUPPORT_CLICK'; runId: string }

export type Lock = (name: string, work: () => void) => Promise<unknown>
export interface ControllerOptions {
  storage: Storage | null
  now?: () => number
  id?: () => string
  lock?: Lock
  telemetry?: Telemetry
  search?: string
}

export class GameController {
  readonly repository: Repository
  private now: () => number
  private id: () => string
  private lock?: Lock
  private telemetry: Telemetry
  private active: Run | null = null
  private screen: 'lobby' | 'tutorial' | 'run' = 'lobby'
  private routeError = ''
  private linkedDate: string | null = null
  private pending = false
  private listeners = new Set<() => void>()
  private snapshot!: GameState

  constructor(options: ControllerOptions) {
    this.repository = new Repository(options.storage)
    this.now = options.now ?? Date.now
    this.id = options.id ?? (() => crypto.randomUUID())
    this.lock = options.lock
    this.telemetry = options.telemetry ?? createTelemetry()
    if (this.telemetry.enabled && !this.repository.meta.collectionStartedOn) this.repository.updateMeta({ collectionStartedOn: utcDate(this.now()) })
    let route = parseRoute(options.search ?? '', utcDate(this.now()))
    if (route.source) this.repository.updateMeta({ sourceCapturedAt: this.now() })
    if (route.kind === 'home' && this.repository.meta.pendingDaily) route = parseRoute(`?daily=${this.repository.meta.pendingDaily}&v=2`, utcDate(this.now()))
    if (route.kind === 'invalid') this.routeError = route.reason
    else if (route.kind === 'daily') {
      this.linkedDate = route.date
      this.repository.updateMeta({ pendingDaily: route.date })
      if (this.repository.meta.onboardingSeen || this.repository.forDate(route.date)) this.openDate(route.date)
    } else if (this.repository.meta.active) {
      this.active = this.repository.officials[this.repository.meta.active] ?? (this.repository.practice?.id === this.repository.meta.active ? this.repository.practice : null)
      if (this.active) this.screen = 'run'
    }
    this.publish()
  }

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.snapshot

  private publish() {
    const results = Object.fromEntries(Object.values(this.repository.officials).filter((run) => run.result).map((run) => [run.caseFile.dateKey!, run.result!]))
    const totals = dailyStats(results, utcDate(this.now()))
    const empty = { id: '', mode: 'endless' as const, identity: null, startedAt: 0, picks: [], hand: [], history: [], usedIds: [], chipsLeft: CHIPS_PER_CASE, crossedOff: [], facts: [], resolution: null, confession: null, alibiMode: false, alibiPicks: [], accusation: null, result: null, markers: {} }
    this.snapshot = {
      ...empty, ...this.active, phase: this.screen === 'run' ? this.active!.phase : this.screen,
      caseFile: this.active?.caseFile ?? null, run: this.active,
      stats: { streak: totals.current, bestStreak: totals.best, casesClosed: totals.completed, solved: totals.solved, lastHand: this.repository.meta.lastHand },
      meta: this.repository.meta, officials: { ...this.repository.officials }, practice: this.repository.practice,
      notice: this.repository.notice, routeError: this.routeError, linkedDate: this.linkedDate,
      pending: this.pending, today: utcDate(this.now()),
    }
    this.listeners.forEach((listener) => listener())
  }

  reconcile = () => {
    this.repository.reload()
    if (this.active?.mode === 'daily') {
      const durable = this.repository.officials[this.active.identity!]
      if (durable?.result) this.active = durable
    }
    this.publish()
  }

  tick = () => { if (utcDate(this.now()) !== this.snapshot.today) this.publish() }

  private select(run: Run) {
    this.active = this.repository.save(run)
    this.screen = 'run'
    this.routeError = ''
    this.linkedDate = null
    this.repository.updateMeta({ active: this.active.id, pendingDaily: null, onboardingSeen: true })
  }

  private openDate(date: string, practice = false) {
    const existing = this.repository.forDate(date)
    if (!practice && existing) { this.select(existing); return }
    const official = !practice && date === utcDate(this.now())
    const file = generateDaily(date)
    this.select(createRun(file, official ? 'daily' : 'daily-practice', this.now(), official ? dailyIdentity(date) : this.id()))
  }

  private record(name: EventName, run: Run, extra: Record<string, string | number | boolean> = {}) {
    this.telemetry.emit(name, { ...propertiesFor(run, this.repository.meta), ...extra })
  }

  private activate(run: Run): Run {
    if (run.markers.start) return run
    const shared = this.repository.meta.sourceCapturedAt > this.repository.meta.sourceConsumedAt
    let next: Run = { ...run, markers: { ...run.markers, start: true, ...(shared ? { shared: true } : {}) } }
    next = this.repository.save(next)
    if (shared) this.repository.updateMeta({ sourceConsumedAt: Math.max(this.now(), this.repository.meta.sourceCapturedAt) })
    this.record('game_start', next)
    if (shared) this.record('shared_link_start', next, { source: 'player_share' })
    const meta = this.repository.meta
    if (this.telemetry.enabled && measuredCohort(meta)) {
      const elapsed = daysBetween(meta.firstCompletion!.date, utcDate(this.now()))
      if (elapsed === 1 && !meta.returnD1) { this.repository.updateMeta({ returnD1: true }); this.record('return_d1', next) }
      if (elapsed === 7 && !meta.returnD7) { this.repository.updateMeta({ returnD7: true }); this.record('return_d7', next) }
    }
    return next
  }

  private finalize = async () => {
    if (!this.active || this.active.phase !== 'board' || this.active.accusation === null || this.pending) return
    const candidate = this.active
    this.pending = true
    this.publish()
    const work = () => {
      this.repository.reload()
      const existing = candidate.mode === 'daily' ? this.repository.readOfficial(candidate.identity!) : null
      if (existing?.result) { this.active = existing; return }
      let completed = reduceRun(candidate, { type: 'CONFIRM_ACCUSE' }, this.now())
      if (!completed.result) return
      completed = this.activate(completed)
      if (!completed.markers.complete) {
        completed = this.repository.save({ ...completed, markers: { ...completed.markers, complete: true } })
        if (completed.mode !== 'daily') this.repository.updateMeta({ practiceCompleted: this.repository.meta.practiceCompleted + 1, practiceSolved: this.repository.meta.practiceSolved + Number(completed.result!.win) })
        if (!this.repository.meta.firstCompletion) {
          this.repository.updateMeta({ firstCompletion: { date: utcDate(completed.result!.completedAt), measured: this.telemetry.enabled } })
          this.record('first_completion', completed)
        }
        this.record('game_complete', completed)
      }
      this.active = completed
    }
    try {
      if (this.lock && candidate.mode === 'daily' && this.repository.durable) {
        try { await this.lock(`prime-suspects:finalize:${candidate.identity}`, work) }
        catch { work() }
      } else work()
    } finally { this.pending = false; this.publish() }
  }

  dispatch = (action: Action): void => {
    if (this.pending) return
    if (action.type === 'CONFIRM_ACCUSE') { void this.finalize(); return }
    if (action.type === 'START_CASE') {
      this.repository.reload()
      if (action.mode === 'endless') {
        const token = this.id()
        let seed = this.now() >>> 0
        for (const character of token) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0
        this.select(createRun(generateCase(seed, this.repository.meta.practiceCompleted + 1, false, undefined, this.repository.meta.lastHand), 'endless', this.now(), token))
      } else this.openDate(action.date ?? this.linkedDate ?? utcDate(this.now()), action.mode === 'daily-practice')
    } else if (action.type === 'NEXT_CASE') {
      this.dispatch({ type: 'START_CASE', mode: 'endless' }); return
    } else if (action.type === 'RESUME_OFFICIAL') {
      const run = this.repository.readOfficial(action.identity)
      if (run) this.select(run)
    } else if (action.type === 'RESUME_PRACTICE') {
      if (this.repository.practice) this.select(this.repository.practice)
    } else if (action.type === 'BACK_LOBBY') {
      this.screen = 'lobby'; this.active = null; this.linkedDate = null; this.routeError = ''
      this.repository.updateMeta({ active: null, pendingDaily: null })
    } else if (action.type === 'START_TUTORIAL') {
      this.screen = 'tutorial'
    } else if (action.type === 'TUTORIAL_COMPLETE') {
      if (this.screen === 'tutorial' && !this.repository.meta.tutorialComplete) {
        this.repository.updateMeta({ tutorialComplete: true })
        this.telemetry.emit('tutorial_complete', {})
      }
    } else if (action.type === 'END_TUTORIAL') {
      if (this.screen !== 'tutorial') return
      if (action.complete && !this.repository.meta.tutorialComplete) {
        this.repository.updateMeta({ tutorialComplete: true })
        this.telemetry.emit('tutorial_complete', {})
      }
      this.repository.updateMeta({ onboardingSeen: true })
      if (this.active) this.screen = 'run'
      else this.openDate(this.linkedDate ?? utcDate(this.now()))
    } else if (action.type === 'ACK_MIGRATION') {
      this.repository.updateMeta({ migrationAcknowledged: true })
    } else if (action.type === 'SHARE_INTENT' || action.type === 'SHARE_SUCCESS' || action.type === 'SUPPORT_CLICK') {
      let target = this.active?.id === action.runId ? this.active : Object.values(this.repository.officials).find((run) => run.id === action.runId) ?? (this.repository.practice?.id === action.runId ? this.repository.practice : null)
      if (target?.mode === 'daily') target = this.repository.readOfficial(target.identity!) ?? target
      if (!target?.result) return
      if (action.type === 'SUPPORT_CLICK') this.record('support_click', target)
      else {
        const marker = action.type === 'SHARE_INTENT' ? 'intent' : 'success'
        if (!target.markers[marker]) {
          const saved = this.repository.save({ ...target, markers: { ...target.markers, [marker]: true } })
          if (this.active?.id === saved.id) this.active = saved
          this.record(marker === 'intent' ? 'share_intent' : 'share_success', saved, { within_24h_of_result: within24Hours(saved.result!.completedAt, this.now()) })
        }
      }
    } else if (this.active && this.screen === 'run') {
      const durable = this.active.mode === 'daily' ? this.repository.readOfficial(this.active.identity!) : null
      if (durable?.result) this.active = durable
      else {
        const nextAction = action.type === 'REUSE_LAST_HAND' ? { type: 'SET_PICKS' as const, picks: this.repository.meta.lastHand } : action
        const before = this.active
        let next = reduceRun(before, nextAction, this.now())
        if (next !== before) {
          next = this.repository.save(next)
          if (next.usedIds.length > before.usedIds.length) next = this.activate(next)
          if (action.type === 'CONFIRM_HAND' && next.phase === 'board') this.repository.updateMeta({ lastHand: [...next.hand] })
          this.active = next
        }
      }
    }
    this.publish()
  }
}

export function useGame() {
  const [controller] = useState(() => new GameController({
    storage: browserStorage(), search: window.location.search, telemetry: browserTelemetry(),
    lock: navigator.locks ? (name, work) => navigator.locks.request(name, work) : undefined,
  }))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key.startsWith(PREFIX)) controller.reconcile() }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', controller.reconcile)
    const timer = setInterval(controller.tick, 1000)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', controller.reconcile); clearInterval(timer) }
  }, [controller])
  return { state, dispatch: controller.dispatch }
}

export const _internals = { buildDeal }
