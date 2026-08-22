import { useEffect, useState } from 'react'
import { findSeparatingProbe } from '../engine/fairness'
import { sfx } from '../audio/sfx'
import type { Action, GameState } from '../game/store'

interface Props {
  state: GameState
  dispatch: (a: Action) => void
}

export function Verdict({ state, dispatch }: Props) {
  const cf = state.caseFile!
  const r = state.result!
  const [shownStars, setShownStars] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!r.win) return
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < r.stars; i++) {
      timers.push(setTimeout(() => sfx.star(i), 500 + i * 380))
      timers.push(setTimeout(() => setShownStars(i + 1), 500 + i * 380))
    }
    return () => timers.forEach(clearTimeout)
  }, [r])

  useEffect(() => {
    if (r.win) sfx.fanfare()
    else sfx.sting()
  }, [r])

  const perfect = r.win && r.stars === 3

  function shareText(): string {
    const stars = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars)
    const label = cf.isDaily ? `Daily ${cf.dateKey}` : `Case №${String(cf.caseNumber).padStart(4, '0')}`
    return `Prime Suspects — ${label}\n${stars} · ${r.probesUsed}/5 chips (par ${r.par})${
      state.stats.streak > 1 ? `\nStreak: ${state.stats.streak} 🔥` : ''
    }`
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="verdict">
      <div className={`verdict__stamp ${r.win ? 'is-win' : 'is-lose'}`}>
        <span>{r.win ? 'CASE CLOSED' : 'MISTRIAL'}</span>
      </div>

      <h2 className="verdict__headline">
        {r.win
          ? perfect
            ? 'Flawless interrogation.'
            : 'The culprit confessed.'
          : 'You named the wrong number.'}
      </h2>

      <p className="verdict__reveal">
        The culprit was <strong>{cf.culprit}</strong>
        {r.win ? ' — exactly as you said' : `, not ${r.guess}`}
      </p>

      {!r.win && <LossExplain culprit={cf.culprit} guess={r.guess!} dealt={cf.deal} />}

      <div className="verdict__stars" aria-label={`${r.stars} of 3 stars`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`vstar ${i < shownStars ? 'is-lit' : ''}`} aria-hidden>
            ★
          </span>
        ))}
      </div>

      <dl className="verdict__facts">
        <div>
          <dt>Chips spent</dt>
          <dd>
            {r.probesUsed} / 5 <em>(par {r.par})</em>
          </dd>
        </div>
        <div>
          <dt>Survivors at accusation</dt>
          <dd>{state.caseFile!.lineup.filter((n) => !new Set(state.crossedOff).has(n)).length}</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>
            {state.stats.streak}
            {state.stats.streak > 1 && <em> 🔥</em>}
          </dd>
        </div>
      </dl>

      <div className="verdict__row">
        <button type="button" className="btn btn--ghost" onClick={() => void copyShare()}>
          {copied ? '✓ Copied' : 'Copy result'}
        </button>
        <button
          type="button"
          className="btn btn--gold"
          onClick={() => {
            sfx.click()
            dispatch({ type: 'NEXT_CASE' })
          }}
        >
          Next case →
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            sfx.click()
            dispatch({ type: 'BACK_LOBBY' })
          }}
        >
          Lobby
        </button>
      </div>
    </div>
  )
}

/**
 * On a mistrial, name the property that proves the accused number innocent:
 * the catalog probe whose truthful answer differs between culprit and guess.
 */
function LossExplain({
  culprit,
  guess,
  dealt,
}: {
  culprit: number
  guess: number
  dealt: string[]
}) {
  const sep = findSeparatingProbe(culprit, guess)
  if (!sep || !sep.test) {
    return (
      <p className="verdict__tell">
        Your number agreed with the culprit on every question in the deck — a true double. Bad
        luck; even the house couldn’t have told them apart.
      </p>
    )
  }
  const truth = sep.test(culprit)
  const yours = sep.test(guess)
  const wasDealt = dealt.includes(sep.id)
  return (
    <p className="verdict__tell">
      The tell you missed: <strong>{sep.label}</strong> — the culprit answers{' '}
      <strong>{truth ? 'YES' : 'NO'}</strong>, your {guess} says{' '}
      <strong>{yours ? 'YES' : 'NO'}</strong>.
      {wasDealt ? ' It was on the table tonight.' : ' It wasn’t dealt tonight.'}
    </p>
  )
}
