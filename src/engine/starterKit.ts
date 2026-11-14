import { HAND_SIZE } from './constants'
import { getProbe } from './probes'

export function starterKit(lineup: readonly number[], deal: readonly string[]): string[] {
  const remaining = [...new Set(deal)].sort()
  const chosen: string[] = []
  let groups = [[...lineup]]
  while (chosen.length < HAND_SIZE && remaining.length) {
    const score = (id: string) => {
      const probe = getProbe(id)
      if (!probe.test) return probe.kind === 'medianTrap' ? 0.5 : 0
      return groups.reduce((sum, group) => {
        const yes = group.filter(probe.test!).length
        return sum + 2 * yes * (group.length - yes)
      }, 0)
    }
    remaining.sort((left, right) => score(right) - score(left) || (left < right ? -1 : left > right ? 1 : 0))
    const id = remaining.shift()!
    chosen.push(id)
    const test = getProbe(id).test
    if (test) groups = groups.flatMap((group) => [group.filter(test), group.filter((number) => !test(number))]).filter((group) => group.length)
  }
  return chosen
}
