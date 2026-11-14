import { describe, expect, it } from 'vitest'
import { dailySeed, generateCase, generateDaily } from '../engine/caseGen'
import { starterKit } from '../engine/starterKit'
import { dailyIdentity, dailyStats, dayOffset, resetClock, utcDate, validDate } from '../game/dates'
import { createRun, reduceRun, validateRun } from '../game/run'
import { LEGACY_KEY, META_KEY, PRACTICE_KEY, Repository, runKey } from '../game/storage'
import { board, finish, game, MemoryStorage, NOW, probe } from './helpers'

describe('versioned UTC daily', () => {
  it('uses the same UTC date at offset boundaries and validates leap dates', () => {
    for (const instant of ['2026-11-15T01:30:00+02:00', '2026-11-14T15:30:00-08:00', '2026-11-15T13:30:00+14:00']) expect(utcDate(new Date(instant))).toBe('2026-11-14')
    expect(validDate('2024-02-29')).toBe(true)
    for (const invalid of ['2026-02-29', '2026-04-31', '2026-1-01', 'nope', '2026-00-10']) expect(validDate(invalid)).toBe(false)
    expect(dailyIdentity('2026-11-14')).toBe('v2:2026-11-14')
    expect(resetClock(Date.parse('2026-11-14T23:59:00Z')).remaining).toBe('0h 1m')
  })
  it('makes the complete daily independent of legacy kit and case counts', () => {
    const seed = dailySeed('v2:2026-11-14')
    expect(generateCase(seed, 1, true, '2026-11-14', ['even', 'div3'])).toEqual(generateCase(seed, 1, true, '2026-11-14', ['prime', 'alibi']))
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_KEY, JSON.stringify({ streak: 10, bestStreak: 50, casesClosed: 500, totalStars: 900, lastHand: ['even', 'div3', 'alibi', 'prime', 'square', 'confessor'] }))
    const returning = game({ storage })
    const newcomer = game()
    returning.dispatch({ type: 'START_CASE', mode: 'daily' })
    newcomer.dispatch({ type: 'START_CASE', mode: 'daily' })
    expect(returning.getSnapshot().caseFile).toEqual(newcomer.getSnapshot().caseFile)
    expect(newcomer.getSnapshot().caseFile).toEqual(generateDaily('2026-11-14'))
  })
  it('uses public data for a stable six-card starter kit', () => {
    const file = generateDaily('2026-11-14')
    const kit = starterKit(file.lineup, file.deal)
    expect(kit).toHaveLength(6)
    expect(new Set(kit).size).toBe(6)
    expect(kit.every((id) => file.deal.includes(id))).toBe(true)
    expect(starterKit([...file.lineup].reverse(), [...file.deal].reverse())).toEqual(kit)
    const controller = game()
    controller.dispatch({ type: 'START_CASE', mode: 'daily' })
    controller.dispatch({ type: 'STARTER_KIT' })
    expect(controller.getSnapshot().phase).toBe('draft')
    controller.dispatch({ type: 'TOGGLE_PICK', id: kit[0] })
    expect(controller.getSnapshot().picks).toHaveLength(5)
  })
})

describe('durable state boundary', () => {
  it('resumes draft, board, facts and result without awarding twice', () => {
    const storage = new MemoryStorage()
    let controller = game({ storage })
    controller.dispatch({ type: 'START_CASE', mode: 'daily' })
    controller.dispatch({ type: 'STARTER_KIT' })
    const picks = controller.getSnapshot().picks
    controller = game({ storage })
    expect(controller.getSnapshot().picks).toEqual(picks)
    controller.dispatch({ type: 'CONFIRM_HAND' })
    probe(controller)
    const before = controller.getSnapshot()
    controller = game({ storage })
    expect(controller.getSnapshot().facts).toEqual(before.facts)
    expect(controller.getSnapshot().crossedOff).toEqual(before.crossedOff)
    expect(controller.getSnapshot().chipsLeft).toBe(4)
    finish(controller)
    const result = controller.getSnapshot().result
    controller.dispatch({ type: 'CONFIRM_ACCUSE' })
    controller.dispatch({ type: 'START_CASE', mode: 'daily' })
    expect(controller.getSnapshot().result).toEqual(result)
    expect(controller.getSnapshot().stats.casesClosed).toBe(1)
    expect(game({ storage }).getSnapshot().phase).toBe('verdict')
    expect(controller.getSnapshot().meta.lastHand).toEqual(picks)
    controller.dispatch({ type: 'START_CASE', mode: 'daily-practice', date: '2026-11-14' })
    board(controller); finish(controller, false)
    expect(controller.getSnapshot().stats.casesClosed).toBe(1)
    expect(controller.getSnapshot().stats.streak).toBe(1)
    expect(controller.repository.forDate('2026-11-14')?.result).toEqual(result)
  })
  it('keeps suspended officials across midnight, other cases and the link window', () => {
    let now = Date.parse('2026-11-14T23:59:59Z')
    const controller = game({ now: () => now })
    board(controller)
    const identity = controller.getSnapshot().identity!
    now += 2000
    controller.dispatch({ type: 'START_CASE', mode: 'daily' })
    expect(controller.getSnapshot().identity).toBe('v2:2026-11-15')
    controller.dispatch({ type: 'START_CASE', mode: 'endless' })
    now += 10 * 86400000
    controller.dispatch({ type: 'RESUME_OFFICIAL', identity })
    expect(controller.getSnapshot().phase).toBe('board')
    finish(controller)
    expect(controller.repository.forDate('2026-11-14')?.result?.win).toBe(true)
    expect(controller.repository.forDate('2026-11-15')?.phase).toBe('draft')
    expect(controller.getSnapshot().stats.streak).toBe(0)
  })
  it('restores pending alibi and canonical derived state, not forged survivors', () => {
    const file = generateDaily('2026-11-14')
    const sample = { ...file, isDaily: false, dateKey: undefined, deal: ['alibi', 'medianTrap', 'confessor', 'even', 'div3', 'prime'] }
    let run = createRun(sample, 'endless', NOW, 'wildcards')
    run = reduceRun(run, { type: 'SET_PICKS', picks: sample.deal }, NOW)
    run = reduceRun(run, { type: 'CONFIRM_HAND' }, NOW)
    run = reduceRun(run, { type: 'USE_PROBE', id: 'alibi' }, NOW)
    run = reduceRun(run, { type: 'PICK_ALIBI', n: file.lineup[0] }, NOW)
    const restored = validateRun(JSON.parse(JSON.stringify({ ...run, chipsLeft: 900, facts: ['forged'], crossedOff: file.lineup })))!
    expect(restored.alibiMode).toBe(true)
    expect(restored.alibiPicks).toEqual([file.lineup[0]])
    expect(restored.chipsLeft).toBe(5)
    expect(restored.crossedOff).toEqual([])
    const resolved = reduceRun(restored, { type: 'USE_PROBE', id: 'alibi' }, NOW)
    expect(validateRun(JSON.parse(JSON.stringify(resolved)))?.history).toEqual(resolved.history)
    expect(validateRun({ ...resolved, hand: ['invented'] })).toBeNull()
  })
  it('migrates legacy aggregates without altering the old record or inventing daily wins', () => {
    const storage = new MemoryStorage()
    const old = JSON.stringify({ streak: 8, bestStreak: 9, casesClosed: 22, totalStars: 50, dailyDoneFor: '2026-11-14', lastHand: ['even'] })
    storage.setItem(LEGACY_KEY, old)
    const controller = game({ storage })
    expect(controller.getSnapshot().stats.casesClosed).toBe(0)
    expect(controller.getSnapshot().meta.legacy?.casesClosed).toBe(22)
    expect(controller.getSnapshot().meta.migrationAcknowledged).toBe(false)
    controller.dispatch({ type: 'ACK_MIGRATION' })
    expect(game({ storage }).getSnapshot().meta.migrationAcknowledged).toBe(true)
    expect(storage.getItem(LEGACY_KEY)).toBe(old)
  })
  it.each(['{broken', '{"schema":99}', '{"schema":2}'])('preserves bad metadata %s and plays session-only', (raw) => {
    const storage = new MemoryStorage(); storage.setItem(META_KEY, raw)
    const controller = game({ storage }); board(controller); finish(controller)
    expect(controller.getSnapshot().phase).toBe('verdict')
    expect(controller.getSnapshot().notice).toContain('Session-only')
    expect(storage.getItem(META_KEY)).toBe(raw)
  })
  it('handles unavailable, denied and full storage', () => {
    const blocked = new MemoryStorage(); blocked.getItem = () => { throw new Error('denied') }
    const full = new MemoryStorage(); full.setItem = () => { throw new Error('quota') }
    for (const storage of [null, blocked, full]) {
      const controller = game({ storage }); board(controller); finish(controller)
      expect(controller.getSnapshot().result?.win).toBe(true)
      expect(controller.getSnapshot().notice).toContain('Session-only')
    }
  })
  it('rejects a damaged run without destroying its bytes', () => {
    const storage = new MemoryStorage(); storage.setItem(PRACTICE_KEY, JSON.stringify({ schema: 2, history: [] }))
    const repo = new Repository(storage)
    expect(repo.durable).toBe(false)
    expect(storage.getItem(PRACTICE_KEY)).not.toBeNull()
  })
})

describe('tabs and one date, one result', () => {
  it('prefers a staggered durable result even when another tab has a pending guess', () => {
    const storage = new MemoryStorage()
    const first = game({ storage }); board(first)
    const second = game({ storage }); finish(first, true); finish(second, false)
    first.reconcile(); second.reconcile()
    expect(second.getSnapshot().result).toEqual(first.getSnapshot().result)
    expect(second.getSnapshot().stats.casesClosed).toBe(1)
  })
  it('serializes simultaneous finalization through the same lock', async () => {
    let queue = Promise.resolve()
    const names: string[] = []
    const lock = (name: string, work: () => void) => { names.push(name); queue = queue.then(work); return queue }
    const storage = new MemoryStorage()
    const first = game({ storage, lock }); board(first)
    const second = game({ storage, lock })
    finish(first, true); finish(second, false)
    await queue; await Promise.resolve()
    first.reconcile(); second.reconcile()
    expect(names).toEqual(['prime-suspects:finalize:v2:2026-11-14', 'prime-suspects:finalize:v2:2026-11-14'])
    expect(first.getSnapshot().result?.win).toBe(true)
    expect(second.getSnapshot().result).toEqual(first.getSnapshot().result)
    expect(second.getSnapshot().stats.casesClosed).toBe(1)
  })
  it('reconciles last-valid stored results in the unlocked race fallback', () => {
    const storage = new MemoryStorage()
    const first = game({ storage }); board(first)
    const stale = structuredClone(first.getSnapshot().run!)
    finish(first, true)
    let alternate = reduceRun(stale, { type: 'ACCUSE', n: stale.caseFile.lineup.find((number) => number !== stale.caseFile.culprit)! }, NOW)
    alternate = reduceRun(alternate, { type: 'CONFIRM_ACCUSE' }, NOW + 10)
    storage.setItem(runKey(stale.identity!), JSON.stringify(alternate))
    const second = game({ storage })
    first.reconcile()
    expect(first.getSnapshot().result?.win).toBe(false)
    expect(first.getSnapshot().result).toEqual(second.getSnapshot().result)
    expect(first.getSnapshot().stats.casesClosed).toBe(1)
  })
})

describe('date-map streak definitions', () => {
  it('handles gaps, losses, reverse order, late filling and inactive dates', () => {
    const results = { '2026-11-14': { win: true }, '2026-11-12': { win: true } }
    expect(dailyStats(results, '2026-11-14')).toMatchObject({ current: 1, best: 1 })
    const filled = { ...results, '2026-11-13': { win: true } }
    expect(dailyStats(filled, '2026-11-14')).toMatchObject({ current: 3, best: 3 })
    expect(dailyStats(filled, '2026-11-15').current).toBe(3)
    expect(dailyStats(filled, '2026-11-16').current).toBe(0)
    expect(dailyStats({ ...filled, '2026-11-11': { win: false } }, '2026-11-14').current).toBe(3)
    expect(dailyStats({ ...filled, '2026-11-14': { win: false } }, '2026-11-14')).toMatchObject({ current: 0, best: 2 })
    expect(dayOffset('2024-03-01', -1)).toBe('2024-02-29')
  })
})
