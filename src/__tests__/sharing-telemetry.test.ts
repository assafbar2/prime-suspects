import { describe, expect, it, vi } from 'vitest'
import { generateDaily, resolveStatic } from '../engine/caseGen'
import { getProbe } from '../engine/probes'
import { createRun, reduceRun } from '../game/run'
import { CANONICAL_ORIGIN, deliverShare, parseRoute, shareText, supportUrl } from '../game/sharing'
import { allowProperties, cohortMature, createTelemetry, measuredCohort, within24Hours, type EventName, type Properties } from '../game/telemetry'
import { board, finish, game, MemoryStorage, NOW, probe } from './helpers'

describe('invitation URL contract', () => {
  it('round-trips the exact version and date with an allowlisted source', () => {
    expect(parseRoute('?daily=2026-11-14&v=2&utm_source=player_share&utm_medium=result', '2026-11-14')).toEqual({ kind: 'daily', date: '2026-11-14', source: true })
    expect(parseRoute('?daily=2026-11-07&v=2', '2026-11-14').kind).toBe('daily')
    expect(parseRoute('?utm_source=player_share&utm_medium=result&secret=do-not-keep', '2026-11-14')).toEqual({ kind: 'home', source: true })
    expect(parseRoute('?utm_source=someone&utm_medium=result', '2026-11-14')).toEqual({ kind: 'home', source: false })
    expect(parseRoute('?utm_source=player_share&utm_source=other&utm_medium=result', '2026-11-14').source).toBe(false)
  })
  it.each(['?daily=2026-11-15&v=2', '?daily=2026-11-06&v=2', '?daily=2026-02-29&v=2', '?daily=2026-11-14&v=1', '?daily=2026-11-14', '?daily=2026-11-14&v=2&v=3', '?daily=2026-11-14&daily=2026-11-13&v=2'])('explains unsupported links without substituting puzzles: %s', (search) => {
    const controller = game({ search })
    expect(controller.getSnapshot().routeError).not.toBe('')
    expect(controller.getSnapshot().run).toBeNull()
  })
  it('prioritizes stored results, then official unfinished runs, then fresh past practice', () => {
    const storage = new MemoryStorage()
    const original = game({ storage }); board(original)
    const past = game({ storage, now: () => NOW + 86400000, search: '?daily=2026-11-14&v=2' })
    expect(past.getSnapshot().mode).toBe('daily')
    expect(past.getSnapshot().phase).toBe('board')
    finish(past)
    const reopened = game({ storage, now: () => NOW + 86400000, search: '?daily=2026-11-14&v=2' })
    expect(reopened.getSnapshot().phase).toBe('verdict')
    const fresh = game({ search: '?daily=2026-11-13&v=2' })
    fresh.dispatch({ type: 'START_CASE', mode: 'daily' })
    expect(fresh.getSnapshot().mode).toBe('daily-practice')
    expect(fresh.getSnapshot().caseFile).toEqual(generateDaily('2026-11-13'))
  })
  it('preserves the exact pending invitation across a reload during teaching', () => {
    const storage = new MemoryStorage()
    let controller = game({ storage, search: '?daily=2026-11-13&v=2&utm_source=player_share&utm_medium=result' })
    controller.dispatch({ type: 'START_TUTORIAL' })
    controller = game({ storage })
    expect(controller.getSnapshot().linkedDate).toBe('2026-11-13')
    controller.dispatch({ type: 'START_TUTORIAL' }); controller.dispatch({ type: 'END_TUTORIAL', complete: false })
    expect(controller.getSnapshot().caseFile?.dateKey).toBe('2026-11-13')
    expect(controller.getSnapshot().mode).toBe('daily-practice')
  })
  it('shares spoiler-free text for all three modes and never transmits run IDs', () => {
    const controller = game(); board(controller); finish(controller)
    const run = controller.getSnapshot().run!
    const text = shareText(run)
    expect(text).toBe('Prime Suspects · 2026-11-14\nCASE CLOSED · 0/5 probes\nYour turn: https://prime-suspects.vercel.app/?daily=2026-11-14&v=2&utm_source=player_share&utm_medium=result')
    expect(text).not.toContain(String(run.caseFile.culprit))
    expect(text).not.toContain(run.id)
    expect(shareText({ ...run, mode: 'daily-practice' })).toContain('PRACTICE · 2026-11-14')
    const endless = shareText({ ...run, mode: 'endless' })
    expect(endless).toContain('PRACTICE · ENDLESS')
    expect(endless).toContain(`${CANONICAL_ORIGIN}?utm_source=player_share&utm_medium=result`)
    expect(endless).not.toContain('daily=')
    expect(shareText({ ...run, result: { ...run.result!, win: false } })).toContain('CASE MISSED')
  })
  it('has a selectable fallback for clipboard denial, and never copies on share cancellation', async () => {
    const copy = vi.fn().mockRejectedValue(new Error('denied'))
    expect(await deliverShare('invitation', 'copy', { copy })).toBe('fallback')
    const cancelled = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    copy.mockClear()
    expect(await deliverShare('invitation', 'native', { share: vi.fn().mockRejectedValue(cancelled), copy })).toBe('cancelled')
    expect(await deliverShare('invitation', 'native', { share: vi.fn().mockRejectedValue({ name: 'AbortError' }), copy })).toBe('cancelled')
    expect(copy).not.toHaveBeenCalled()
    expect(await deliverShare('invitation', 'copy', { copy: vi.fn().mockResolvedValue(undefined) })).toBe('success')
    expect(await deliverShare('invitation', 'native', {})).toBe('fallback')
  })
  it('accepts only configured, credential-free HTTPS support links', () => {
    for (const bad of [undefined, '', 'javascript:alert(1)', 'http://example.com', 'https://name:pass@example.com', ' https://example.com']) expect(supportUrl(bad)).toBeNull()
    expect(supportUrl('https://example.com/support')).toBe('https://example.com/support')
  })
})

describe('qualifying actions and persisted telemetry', () => {
  function fixture() {
    const events: Array<{ name: EventName; properties: Properties }> = []
    const storage = new MemoryStorage()
    const telemetry = createTelemetry(true, (name, properties) => { events.push({ name, properties }) })
    const controller = game({ storage, telemetry })
    return { events, storage, telemetry, controller }
  }
  it('does not activate on draft, blocked probes, or opening an alibi picker', () => {
    const { events, controller } = fixture()
    board(controller)
    expect(events).toEqual([])
    controller.dispatch({ type: 'USE_PROBE', id: 'not-held' })
    expect(events).toEqual([])
    probe(controller)
    expect(events.filter((event) => event.name === 'game_start')).toHaveLength(1)
    controller.dispatch({ type: 'USE_PROBE', id: controller.getSnapshot().usedIds[0] })
    expect(events.filter((event) => event.name === 'game_start')).toHaveLength(1)
    const file = generateDaily('2026-11-14')
    let run = createRun({ ...file, isDaily: false, dateKey: undefined, deal: ['alibi', 'even', 'div3', 'prime', 'confessor', 'medianTrap'] }, 'endless', NOW, 'alibi')
    run = reduceRun(run, { type: 'SET_PICKS', picks: run.caseFile.deal }, NOW)
    run = reduceRun(run, { type: 'CONFIRM_HAND' }, NOW)
    run = reduceRun(run, { type: 'USE_PROBE', id: 'alibi' }, NOW)
    run = reduceRun(run, { type: 'USE_PROBE', id: 'alibi' }, NOW)
    expect(run.usedIds).toEqual([])
    expect(run.chipsLeft).toBe(5)
    const dead = { ...run, alibiMode: false, crossedOff: run.caseFile.lineup.filter((number) => !getProbe('even').test!(number)) }
    expect(reduceRun(dead, { type: 'USE_PROBE', id: 'even' }, NOW)).toBe(dead)
  })
  it('activates on a confirmed zero-probe accusation, completing exactly once after reload', () => {
    const { events, controller, storage, telemetry } = fixture()
    board(controller); finish(controller)
    expect(events.map((event) => event.name)).toEqual(['game_start', 'first_completion', 'game_complete'])
    expect(events[0].properties.probe_count).toBe(0)
    const reopened = game({ storage, telemetry }); reopened.dispatch({ type: 'CONFIRM_ACCUSE' })
    expect(events).toHaveLength(3)
  })
  it('consumes validated attribution only on the first meaningful non-tutorial action', () => {
    const { events, storage, telemetry } = fixture()
    let controller = game({ storage, telemetry, search: '?utm_source=player_share&utm_medium=result' })
    controller.dispatch({ type: 'START_TUTORIAL' })
    controller.dispatch({ type: 'TUTORIAL_COMPLETE' })
    controller.dispatch({ type: 'END_TUTORIAL', complete: true })
    expect(events.map((event) => event.name)).toEqual(['tutorial_complete'])
    controller = game({ storage, telemetry })
    board(controller); probe(controller)
    expect(events.filter((event) => event.name === 'shared_link_start')).toHaveLength(1)
    expect(controller.getSnapshot().stats.casesClosed).toBe(0)
    controller.dispatch({ type: 'START_CASE', mode: 'endless' }); board(controller); finish(controller)
    expect(events.filter((event) => event.name === 'shared_link_start')).toHaveLength(1)
  })
  it('uses the engine for the teaching fixture and skipping never changes daily results', () => {
    expect(resolveStatic('even', [12, 15, 22, 27], 22)).toEqual({ answer: true, eliminated: [15, 27] })
    expect(resolveStatic('div3', [12, 22], 22)).toEqual({ answer: false, eliminated: [12] })
    const { events, controller } = fixture()
    controller.dispatch({ type: 'START_TUTORIAL' }); controller.dispatch({ type: 'END_TUTORIAL', complete: false })
    expect(events).toEqual([])
    expect(controller.getSnapshot().stats.casesClosed).toBe(0)
    controller.dispatch({ type: 'START_TUTORIAL' }); controller.dispatch({ type: 'TUTORIAL_COMPLETE' }); controller.dispatch({ type: 'END_TUTORIAL', complete: true })
    controller.dispatch({ type: 'START_TUTORIAL' }); controller.dispatch({ type: 'TUTORIAL_COMPLETE' }); controller.dispatch({ type: 'END_TUTORIAL', complete: true })
    expect(events.map((event) => event.name)).toEqual(['tutorial_complete'])
    expect(controller.getSnapshot().stats.casesClosed).toBe(0)
  })
  it('deduplicates intent and success separately across reloads and tabs, including late shares', () => {
    const { events, controller, storage, telemetry } = fixture()
    board(controller); finish(controller)
    const runId = controller.getSnapshot().id
    controller.dispatch({ type: 'SHARE_INTENT', runId }); controller.dispatch({ type: 'SHARE_INTENT', runId })
    const reopened = game({ storage, telemetry, now: () => NOW + 2 * 86400000 })
    reopened.dispatch({ type: 'SHARE_INTENT', runId }); reopened.dispatch({ type: 'SHARE_SUCCESS', runId })
    controller.dispatch({ type: 'SHARE_SUCCESS', runId })
    expect(events.filter((event) => event.name === 'share_intent')).toHaveLength(1)
    expect(events.find((event) => event.name === 'share_intent')?.properties.within_24h_of_result).toBe(true)
    expect(events.filter((event) => event.name === 'share_success')).toHaveLength(1)
    expect(events.find((event) => event.name === 'share_success')?.properties.within_24h_of_result).toBe(false)
    expect(reopened.getSnapshot().stats.casesClosed).toBe(1)
  })
  it('records the actual first completion date across midnight, and exact D1/D7 starts', () => {
    const { events, storage, telemetry } = fixture()
    let now = Date.parse('2026-11-14T23:59:59Z')
    let controller = game({ storage, telemetry, now: () => now }); board(controller)
    now += 2000; finish(controller)
    expect(controller.getSnapshot().meta.firstCompletion?.date).toBe('2026-11-15')
    expect(events.find((event) => event.name === 'first_completion')?.properties.daily_date).toBe('2026-11-14')
    for (const offset of [0, 1, 1, 6, 7, 7, 8]) {
      now = Date.parse('2026-11-15T12:00:00Z') + offset * 86400000
      controller = game({ storage, telemetry, now: () => now })
      controller.dispatch({ type: 'START_CASE', mode: 'endless' }); board(controller); probe(controller)
    }
    expect(events.filter((event) => event.name === 'return_d1')).toHaveLength(1)
    expect(events.filter((event) => event.name === 'return_d7')).toHaveLength(1)
  })
  it('excludes pre-collection first completions from return decision gates', () => {
    const storage = new MemoryStorage()
    const disabled = game({ storage }); board(disabled); finish(disabled)
    const events: EventName[] = []
    const enabled = game({ storage, now: () => NOW + 7 * 86400000, telemetry: createTelemetry(true, (name) => { events.push(name) }) })
    enabled.dispatch({ type: 'START_CASE', mode: 'endless' }); board(enabled); probe(enabled)
    expect(measuredCohort(enabled.getSnapshot().meta)).toBe(false)
    expect(events).not.toContain('return_d7')
  })
  it('enforces the cohort clocks and full 24-hour opportunity', () => {
    expect(within24Hours(NOW, NOW + 86400000 - 1)).toBe(true)
    expect(within24Hours(NOW, NOW + 86400000)).toBe(false)
    expect(cohortMature('2026-11-14', Date.parse('2026-11-21T23:59:59Z'), 'd7')).toBe(false)
    expect(cohortMature('2026-11-14', Date.parse('2026-11-22T00:00:00Z'), 'd7')).toBe(true)
    expect(cohortMature('2026-11-14', Date.parse('2026-11-15T23:59:59Z'), 'share')).toBe(false)
    expect(cohortMature('2026-11-14', Date.parse('2026-11-16T00:00:00Z'), 'share')).toBe(true)
  })
  it('sends nothing when disabled and cannot interrupt play if any sink fails', async () => {
    const sink = vi.fn()
    createTelemetry(false, sink).emit('game_start', { mode: 'daily' })
    expect(sink).not.toHaveBeenCalled()
    for (const sink of [() => { throw new Error('blocked') }, async () => { throw new Error('offline') }]) {
      const controller = game({ telemetry: createTelemetry(true, sink) }); board(controller); finish(controller)
      expect(controller.getSnapshot().phase).toBe('verdict')
    }
    await Promise.resolve()
  })
  it('only permits bounded event fields, never full URLs, arbitrary queries or local IDs', () => {
    expect(allowProperties({ mode: 'daily', outcome: 'solved', probe_count: 5, generator_version: 2, daily_date: '2026-11-14', source: 'player_share', secret: 128, url: 'https://example.com/private', run_id: 'abc', email: 'x', full_query: 'x' })).toEqual({ mode: 'daily', outcome: 'solved', probe_count: 5, generator_version: 2, daily_date: '2026-11-14', source: 'player_share' })
    expect(allowProperties({ mode: 'tutorial', outcome: 'arbitrary', probe_count: 999, daily_date: 'invalid', source: 'a-person' })).toEqual({})
  })
})
