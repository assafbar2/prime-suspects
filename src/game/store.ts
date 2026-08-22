import { useCallback, useEffect, useReducer } from 'react'
import {
  CHIPS_PER_CASE,
  HAND_SIZE,
  buildDeal,
  dailySeed,
  generateCase,
  resolveStatic,
  todayDateKey,
  type CaseFile,
} from '../engine/caseGen'
import { getProbe } from '../engine/probes'
import { resolveAlibi, resolveConfessor, resolveMedianTrap } from '../engine/resolve'
import { mulberry32 } from '../engine/rng'

export type Phase = 'lobby' | 'draft' | 'board' | 'verdict'
export type Mode = 'endless' | 'daily'

export interface Stats {
  streak: number
  bestStreak: number
  casesClosed: number
  totalStars: number
  dailyDoneFor?: string
}

export interface Resolution {
  probeId: string
  eliminated: number[]
  headline: string
}

export interface CaseResult {
  win: boolean
  stars: number
  probesUsed: number
  par: number
  guess: number | null
}

export interface GameState {
  phase: Phase
  mode: Mode
  caseFile: CaseFile | null
  picks: string[]
  hand: string[]
  usedIds: string[]
  /** Established facts about the culprit, in play order */
  facts: string[]
  chipsLeft: number
  crossedOff: number[]
  resolution: Resolution | null
  confession: string | null
  alibiMode: boolean
  alibiPicks: number[]
  accusation: number | null
  result: CaseResult | null
  stats: Stats
}

const STORAGE_KEY = 'prime-suspects:v1'

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stats>
      return {
        streak: parsed.streak ?? 0,
        bestStreak: parsed.bestStreak ?? 0,
        casesClosed: parsed.casesClosed ?? 0,
        totalStars: parsed.totalStars ?? 0,
        dailyDoneFor: parsed.dailyDoneFor,
      }
    }
  } catch {
    /* corrupted storage — start fresh */
  }
  return { streak: 0, bestStreak: 0, casesClosed: 0, totalStars: 0 }
}

function persistStats(stats: Stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {
    /* private mode etc. — stats just won't survive */
  }
}

let endlessCounter = 0

function makeCase(mode: Mode, caseNumber: number): CaseFile {
  if (mode === 'daily') {
    const key = todayDateKey()
    return generateCase(dailySeed(key), caseNumber, true, key)
  }
  endlessCounter += 1
  const seed = (Date.now() ^ (endlessCounter * 2654435761)) >>> 0
  return generateCase(seed, caseNumber, false)
}

export type Action =
  | { type: 'START_CASE'; mode: Mode }
  | { type: 'TOGGLE_PICK'; id: string }
  | { type: 'CONFIRM_HAND' }
  | { type: 'USE_PROBE'; id: string }
  | { type: 'PICK_ALIBI'; n: number }
  | { type: 'CANCEL_ALIBI' }
  | { type: 'ACCUSE'; n: number }
  | { type: 'CANCEL_ACCUSE' }
  | { type: 'CONFIRM_ACCUSE' }
  | { type: 'DISMISS_RESOLUTION' }
  | { type: 'NEXT_CASE' }
  | { type: 'BACK_LOBBY' }

export function initialState(): GameState {
  return {
    phase: 'lobby',
    mode: 'endless',
    caseFile: null,
    picks: [],
    hand: [],
    usedIds: [],
    facts: [],
    chipsLeft: CHIPS_PER_CASE,
    crossedOff: [],
    resolution: null,
    confession: null,
    alibiMode: false,
    alibiPicks: [],
    accusation: null,
    result: null,
    stats: loadStats(),
  }
}

function starsFor(probesUsed: number, par: number): number {
  if (probesUsed <= Math.max(1, par - 1)) return 3
  if (probesUsed <= par) return 2
  return 1
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_CASE': {
      const caseNumber = state.stats.casesClosed + 1
      const caseFile = makeCase(action.mode, caseNumber)
      return {
        ...initialState(),
        stats: state.stats,
        phase: 'draft',
        mode: action.mode,
        caseFile,
        chipsLeft: CHIPS_PER_CASE,
        picks: [],
      }
    }

    case 'TOGGLE_PICK': {
      if (!state.caseFile) return state
      const has = state.picks.includes(action.id)
      let next = has
        ? state.picks.filter((p) => p !== action.id)
        : state.picks.length < HAND_SIZE
          ? [...state.picks, action.id]
          : state.picks
      return { ...state, picks: next }
    }

    case 'CONFIRM_HAND': {
      if (!state.caseFile || state.picks.length !== HAND_SIZE) return state
      return { ...state, phase: 'board', hand: state.picks }
    }

    case 'USE_PROBE': {
      if (!state.caseFile || !state.hand.includes(action.id)) return state
      if (state.usedIds.includes(action.id)) return state
      if (state.chipsLeft <= 0) return state
      const def = getProbe(action.id)
      const culprit = state.caseFile.culprit
      const alive = state.caseFile.lineup.filter((n) => !state.crossedOff.includes(n))

      let eliminated: number[] = []
      let headline = ''
      let fact = ''
      let confession: string | null = null
      let alibiMode = state.alibiMode

      if (def.kind === 'static') {
        const r = resolveStatic(action.id, alive, culprit)
        eliminated = r.eliminated
        headline = `${def.label} → ${r.answer ? 'YES' : 'NO'} about the culprit. ${
          r.answer ? 'Non-matching' : 'Matching'
        } suspects walk:`
        fact = `${def.label} → ${r.answer ? 'YES' : 'NO'}`
      } else if (def.kind === 'medianTrap') {
        const r = resolveMedianTrap(alive, culprit)
        eliminated = r.eliminated
        headline = `Culprit sits ${
          r.answer ? 'above' : 'below'
        } the survivors' median (${r.median}). The ${r.answer ? 'lower' : 'upper'} half walks:`
        fact = `Median ${r.median} → culprit ${r.answer ? 'above' : 'below'}`
      } else if (def.kind === 'alibi') {
        if (!state.alibiMode && state.alibiPicks.length === 0) {
          return { ...state, alibiMode: true, alibiPicks: [] }
        }
        const outcome = resolveAlibi(state.alibiPicks[0], culprit, alive)
        eliminated = outcome.eliminated
        headline =
          outcome.type === 'isCulprit'
            ? `Alibi refused — ${state.alibiPicks[0]} IS the culprit. Everyone else walks!`
            : `${state.alibiPicks[0]} has an alibi and walks free.`
        fact = outcome.type === 'isCulprit' ? `${state.alibiPicks[0]} = culprit` : `${state.alibiPicks[0]} innocent`
        alibiMode = false
      } else if (def.kind === 'confessor') {
        const rng = mulberry32((state.caseFile.seed ^ state.chipsLeft) >>> 0)
        confession = resolveConfessor(state.caseFile.culprit, rng() * 1000)
        headline = 'The suspect talks…'
        fact = `🕯 ${confession}`
      }

      return {
        ...state,
        usedIds: [...state.usedIds, action.id],
        facts: fact ? [...state.facts, fact] : state.facts,
        chipsLeft: state.chipsLeft - 1,
        crossedOff: [...new Set([...state.crossedOff, ...eliminated])],
        resolution: { probeId: action.id, eliminated, headline },
        confession,
        alibiMode,
        alibiPicks: alibiMode ? state.alibiPicks : [],
      }
    }

    case 'PICK_ALIBI': {
      if (!state.alibiMode) return state
      const picks =
        state.alibiPicks.includes(action.n) ? [] : [action.n]
      return { ...state, alibiPicks: picks }
    }

    case 'CANCEL_ALIBI':
      return { ...state, alibiMode: false, alibiPicks: [] }

    case 'ACCUSE':
      return { ...state, accusation: action.n }

    case 'CANCEL_ACCUSE':
      return { ...state, accusation: null }

    case 'CONFIRM_ACCUSE': {
      if (!state.caseFile || state.accusation == null) return state
      const win = state.accusation === state.caseFile.culprit
      const probesUsed = state.usedIds.length
      const stars = win ? starsFor(probesUsed, state.caseFile.par) : 0
      const stats: Stats = {
        streak: win ? state.stats.streak + 1 : 0,
        bestStreak: win
          ? Math.max(state.stats.bestStreak, state.stats.streak + 1)
          : state.stats.bestStreak,
        casesClosed: state.stats.casesClosed + 1,
        totalStars: state.stats.totalStars + stars,
        dailyDoneFor:
          state.mode === 'daily' ? todayDateKey() : state.stats.dailyDoneFor,
      }
      persistStats(stats)
      return {
        ...state,
        phase: 'verdict',
        result: {
          win,
          stars,
          probesUsed,
          par: state.caseFile.par,
          guess: state.accusation,
        },
        stats,
      }
    }

    case 'DISMISS_RESOLUTION':
      return { ...state, resolution: null, confession: null }

    case 'NEXT_CASE': {
      const caseNumber = state.stats.casesClosed + 1
      const caseFile = makeCase('endless', caseNumber)
      return {
        ...initialState(),
        stats: state.stats,
        phase: 'draft',
        mode: 'endless',
        caseFile,
        chipsLeft: CHIPS_PER_CASE,
        picks: [],
      }
    }

    case 'BACK_LOBBY':
      return { ...initialState(), stats: state.stats }

    default:
      return state
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    // Re-persist whenever a case ends so mid-case refreshes keep old stats.
    if (state.phase === 'verdict') persistStats(state.stats)
  }, [state.phase, state.stats])

  const startCase = useCallback((mode: Mode) => dispatch({ type: 'START_CASE', mode }), [])
  return { state, dispatch, startCase }
}

// Exposed for tests / debugging.
export const _internals = { buildDeal, starsFor }
