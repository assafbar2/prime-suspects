import { GameController, type ControllerOptions } from '../game/store'
import { getProbe } from '../engine/probes'

export class MemoryStorage implements Storage {
  data = new Map<string, string>()
  get length() { return this.data.size }
  clear() { this.data.clear() }
  getItem(key: string) { return this.data.get(key) ?? null }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  removeItem(key: string) { this.data.delete(key) }
  setItem(key: string, value: string) { this.data.set(key, value) }
}

export const NOW = Date.parse('2026-11-14T12:00:00Z')
let counter = 0
export function game(options: Partial<ControllerOptions> = {}) {
  return new GameController({ storage: new MemoryStorage(), now: () => NOW, id: () => `practice-${++counter}`, ...options })
}
export function board(controller: GameController) {
  if (controller.getSnapshot().phase !== 'draft') controller.dispatch({ type: 'START_CASE', mode: 'daily' })
  controller.dispatch({ type: 'STARTER_KIT' })
  controller.dispatch({ type: 'CONFIRM_HAND' })
}
export function probe(controller: GameController) {
  const state = controller.getSnapshot()
  const alive = state.caseFile!.lineup.filter((number) => !state.crossedOff.includes(number))
  const id = state.hand.find((id) => !state.usedIds.includes(id) && getProbe(id).test && alive.some(getProbe(id).test!) && alive.some((number) => !getProbe(id).test!(number)))!
  controller.dispatch({ type: 'USE_PROBE', id })
}
export function finish(controller: GameController, win = true) {
  const state = controller.getSnapshot()
  const guess = win ? state.caseFile!.culprit : state.caseFile!.lineup.find((number) => number !== state.caseFile!.culprit && !state.crossedOff.includes(number))!
  controller.dispatch({ type: 'ACCUSE', n: guess })
  controller.dispatch({ type: 'CONFIRM_ACCUSE' })
}
