import { generateDaily, resolveStatic, type CaseFile } from '../engine/caseGen'
import { CHIPS_PER_CASE, HAND_SIZE, LINEUP_SIZE } from '../engine/constants'
import { PROBE_BY_ID, getProbe } from '../engine/probes'
import { resolveAlibi, resolveConfessor, resolveMedianTrap } from '../engine/resolve'
import { mulberry32, sampleWithoutReplacement } from '../engine/rng'
import { starterKit } from '../engine/starterKit'
import { dailyIdentity, validDate } from './dates'

export type Mode = 'daily' | 'daily-practice' | 'endless'
export interface Resolution { probeId: string; eliminated: number[]; headline: string }
export interface CaseResult { win: boolean; probesUsed: number; guess: number; completedAt: number }
export interface ProbeStep { id: string; target?: number }
export interface Run {
  schema: 2
  id: string
  mode: Mode
  identity: string | null
  startedAt: number
  phase: 'draft' | 'board' | 'verdict'
  caseFile: CaseFile
  picks: string[]
  hand: string[]
  history: ProbeStep[]
  usedIds: string[]
  chipsLeft: number
  crossedOff: number[]
  facts: string[]
  resolution: Resolution | null
  confession: string | null
  alibiMode: boolean
  alibiPicks: number[]
  accusation: number | null
  result: CaseResult | null
  markers: Partial<Record<'start' | 'complete' | 'intent' | 'success' | 'shared', boolean>>
}

export type RunAction =
  | { type: 'TOGGLE_PICK'; id: string }
  | { type: 'RANDOMIZE_PICKS' }
  | { type: 'STARTER_KIT' }
  | { type: 'SET_PICKS'; picks: string[] }
  | { type: 'CONFIRM_HAND' }
  | { type: 'USE_PROBE'; id: string }
  | { type: 'PICK_ALIBI'; n: number }
  | { type: 'CANCEL_ALIBI' }
  | { type: 'ACCUSE'; n: number }
  | { type: 'CANCEL_ACCUSE' }
  | { type: 'CONFIRM_ACCUSE' }
  | { type: 'DISMISS_RESOLUTION' }

export function createRun(caseFile: CaseFile, mode: Mode, now: number, id: string): Run {
  return {
    schema: 2, id, mode, identity: caseFile.dateKey ? dailyIdentity(caseFile.dateKey) : null,
    startedAt: now, phase: 'draft', caseFile, picks: [], hand: [], history: [], usedIds: [],
    chipsLeft: CHIPS_PER_CASE, crossedOff: [], facts: [], resolution: null, confession: null,
    alibiMode: false, alibiPicks: [], accusation: null, result: null, markers: {},
  }
}

export function reduceRun(run: Run, action: RunAction, now: number): Run {
  if (run.result) return run
  const alive = run.caseFile.lineup.filter((number) => !run.crossedOff.includes(number))
  if (run.phase === 'draft') {
    let picks = run.picks
    if (action.type === 'TOGGLE_PICK' && run.caseFile.deal.includes(action.id)) {
      picks = picks.includes(action.id) ? picks.filter((id) => id !== action.id) : picks.length < HAND_SIZE ? [...picks, action.id] : picks
    } else if (action.type === 'RANDOMIZE_PICKS') {
      picks = sampleWithoutReplacement(mulberry32(now >>> 0), run.caseFile.deal, HAND_SIZE)
    } else if (action.type === 'STARTER_KIT') {
      picks = starterKit(run.caseFile.lineup, run.caseFile.deal)
    } else if (action.type === 'SET_PICKS') {
      picks = [...new Set(action.picks)].filter((id) => run.caseFile.deal.includes(id)).slice(0, HAND_SIZE)
    } else if (action.type === 'CONFIRM_HAND' && picks.length === HAND_SIZE) {
      return { ...run, phase: 'board', hand: [...picks] }
    }
    return picks === run.picks ? run : { ...run, picks }
  }
  if (run.phase !== 'board') return run
  if (action.type === 'ACCUSE' && !run.alibiMode && alive.includes(action.n)) return { ...run, accusation: action.n }
  if (action.type === 'CANCEL_ACCUSE') return { ...run, accusation: null }
  if (action.type === 'CONFIRM_ACCUSE' && run.accusation !== null && alive.includes(run.accusation)) {
    return { ...run, phase: 'verdict', resolution: null, confession: null, result: {
      win: run.accusation === run.caseFile.culprit, probesUsed: run.usedIds.length, guess: run.accusation, completedAt: now,
    } }
  }
  if (action.type === 'DISMISS_RESOLUTION') return { ...run, resolution: null, confession: null }
  if (action.type === 'CANCEL_ALIBI') return { ...run, alibiMode: false, alibiPicks: [] }
  if (action.type === 'PICK_ALIBI' && run.alibiMode && alive.includes(action.n)) return { ...run, alibiPicks: [action.n] }
  if (action.type !== 'USE_PROBE' || run.accusation !== null || !run.hand.includes(action.id) || run.usedIds.includes(action.id) || run.chipsLeft <= 0 || alive.length < 2) return run
  const probe = getProbe(action.id)
  if (run.alibiMode && probe.kind !== 'alibi') return run
  if (probe.test && (alive.every(probe.test) || alive.every((number) => !probe.test!(number)))) return run
  const culprit = run.caseFile.culprit
  let eliminated: number[] = []
  let fact = ''
  let confession: string | null = null
  if (probe.kind === 'static') {
    const answer = resolveStatic(probe.id, alive, culprit)
    eliminated = answer.eliminated
    fact = `${probe.label} → ${answer.answer ? 'YES' : 'NO'}`
  } else if (probe.kind === 'medianTrap') {
    const answer = resolveMedianTrap(alive, culprit)
    eliminated = answer.eliminated
    fact = `Above median ${answer.median}? → ${answer.answer ? 'YES' : 'NO'}`
  } else if (probe.kind === 'alibi') {
    if (!run.alibiMode) return { ...run, alibiMode: true, alibiPicks: [] }
    if (run.alibiPicks.length !== 1 || !alive.includes(run.alibiPicks[0])) return run
    const answer = resolveAlibi(run.alibiPicks[0], culprit, alive)
    eliminated = answer.eliminated
    fact = `${run.alibiPicks[0]} ${answer.type === 'isCulprit' ? 'is the culprit' : 'has an alibi'}`
  } else {
    confession = resolveConfessor(culprit, mulberry32((run.caseFile.seed ^ run.chipsLeft) >>> 0)() * 1000)
    fact = confession
  }
  const step: ProbeStep = probe.kind === 'alibi' ? { id: probe.id, target: run.alibiPicks[0] } : { id: probe.id }
  return {
    ...run, history: [...run.history, step], usedIds: [...run.usedIds, probe.id], chipsLeft: run.chipsLeft - 1,
    crossedOff: [...new Set([...run.crossedOff, ...eliminated])], facts: [...run.facts, fact],
    resolution: { probeId: probe.id, eliminated, headline: `${fact}. ${eliminated.length} non-matching suspects leave.` },
    confession, alibiMode: false, alibiPicks: [],
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < 253402300800000
}

function cards(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string' && PROBE_BY_ID.has(id)) && new Set(value).size === value.length
}

const dailyCache = new Map<string, CaseFile>()

export function validateRun(value: unknown): Run | null {
  if (!isRecord(value) || value.schema !== 2 || !['daily', 'daily-practice', 'endless'].includes(String(value.mode))) return null
  if (typeof value.id !== 'string' || value.id.length > 100 || !value.id.length || !timestamp(value.startedAt) || !isRecord(value.caseFile)) return null
  const file = value.caseFile
  if (!Number.isInteger(file.seed) || Number(file.seed) < 0 || Number(file.seed) > 0xffffffff || !Number.isSafeInteger(file.caseNumber)) return null
  if (!Array.isArray(file.lineup) || file.lineup.length !== LINEUP_SIZE || new Set(file.lineup).size !== LINEUP_SIZE || !file.lineup.every((number) => Number.isInteger(number) && number >= 1 && number <= 999)) return null
  if (!file.lineup.includes(file.culprit) || !cards(file.deal) || file.deal.length < HAND_SIZE || file.deal.length > 32 || !Number.isInteger(file.par) || Number(file.par) < 1 || Number(file.par) > 5) return null
  let caseFile = file as unknown as CaseFile
  if (value.mode !== 'endless') {
    if (!validDate(file.dateKey) || value.identity !== dailyIdentity(file.dateKey) || (value.mode === 'daily' && value.id !== value.identity)) return null
    if (!dailyCache.has(file.dateKey)) dailyCache.set(file.dateKey, generateDaily(file.dateKey))
    const canonical = dailyCache.get(file.dateKey)!
    if (JSON.stringify([file.seed, file.caseNumber, file.isDaily, file.lineup, file.culprit, file.deal, file.par]) !== JSON.stringify([canonical.seed, canonical.caseNumber, canonical.isDaily, canonical.lineup, canonical.culprit, canonical.deal, canonical.par])) return null
    caseFile = canonical
  } else if (file.isDaily !== false || file.dateKey !== undefined || value.identity !== null) return null
  if (!cards(value.picks) || value.picks.length > HAND_SIZE || !value.picks.every((id) => caseFile.deal.includes(id))) return null
  if (!cards(value.hand) || !Array.isArray(value.history) || value.history.length > CHIPS_PER_CASE) return null
  let run = createRun(caseFile, value.mode as Mode, value.startedAt, value.id)
  run = { ...run, picks: value.picks }
  if (value.phase === 'draft') {
    if (value.hand.length || value.history.length || value.result !== null || value.alibiMode !== false || value.accusation !== null) return null
  } else if (value.phase === 'board' || value.phase === 'verdict') {
    if (value.hand.length !== HAND_SIZE || !value.hand.every((id) => caseFile.deal.includes(id))) return null
    run = { ...run, phase: 'board', hand: value.hand, picks: value.hand }
    for (const step of value.history) {
      if (!isRecord(step) || typeof step.id !== 'string') return null
      const before = run.history.length
      if (step.id === 'alibi') {
        if (typeof step.target !== 'number') return null
        run = reduceRun(run, { type: 'USE_PROBE', id: 'alibi' }, value.startedAt)
        run = reduceRun(run, { type: 'PICK_ALIBI', n: step.target }, value.startedAt)
      } else if (step.target !== undefined) return null
      run = reduceRun(run, { type: 'USE_PROBE', id: step.id }, value.startedAt)
      if (run.history.length !== before + 1) return null
    }
    if (value.alibiMode === true) {
      run = reduceRun(run, { type: 'USE_PROBE', id: 'alibi' }, value.startedAt)
      if (!run.alibiMode || !Array.isArray(value.alibiPicks) || value.alibiPicks.length > 1) return null
      if (value.alibiPicks.length) {
        run = reduceRun(run, { type: 'PICK_ALIBI', n: value.alibiPicks[0] as number }, value.startedAt)
        if (!run.alibiPicks.length) return null
      }
    } else if (value.alibiMode !== false) return null
    if (value.accusation !== null) {
      if (typeof value.accusation !== 'number') return null
      run = reduceRun(run, { type: 'ACCUSE', n: value.accusation }, value.startedAt)
      if (run.accusation === null) return null
    }
    if (value.phase === 'verdict') {
      if (!isRecord(value.result) || !timestamp(value.result.completedAt) || value.result.completedAt < run.startedAt || value.result.guess !== run.accusation) return null
      run = reduceRun(run, { type: 'CONFIRM_ACCUSE' }, value.result.completedAt)
      if (!run.result) return null
    } else if (value.result !== null) return null
  } else return null
  if (!isRecord(value.markers)) return null
  for (const marker of ['start', 'complete', 'intent', 'success', 'shared'] as const) {
    if (value.markers[marker] !== undefined && typeof value.markers[marker] !== 'boolean') return null
    if (value.markers[marker] === true) run.markers[marker] = true
  }
  return { ...run, resolution: null, confession: null }
}
