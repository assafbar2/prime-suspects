import { useEffect, useRef } from 'react'
import { HAND_SIZE } from '../engine/caseGen'
import { getProbe } from '../engine/probes'
import { sfx } from '../audio/sfx'
import type { Action, GameState } from '../game/store'
import { ProbeCard } from './ProbeCard'
import { ProbeHelp } from './ProbeHelp'

interface Props {
  state: GameState
  dispatch: (a: Action) => void
}

export function Draft({ state, dispatch }: Props) {
  const dealt = state.caseFile?.deal ?? []
  const picked = new Set(state.picks)
  const prevCount = useRef(state.picks.length)

  useEffect(() => {
    if (state.picks.length > prevCount.current) sfx.flick()
    prevCount.current = state.picks.length
  }, [state.picks.length])

  return (
    <div className="draft">
      <header className="draft__head">
        <p className="eyebrow">{state.mode === 'daily' ? `Official daily · ${state.caseFile?.dateKey}` : state.mode === 'daily-practice' ? `Practice · ${state.caseFile?.dateKey}` : 'Practice · endless'}</p>
        <h2 className="draft__title">Assemble your kit</h2>
        <p className="draft__sub">
          Choose <strong>{HAND_SIZE}</strong> questions from {dealt.length}. You can ask five.
          Start with a suggested kit, or choose your own.
        </p>
      </header>

      <div className="draft__slots" aria-label={`${state.picks.length} of ${HAND_SIZE} picked`}>
        {Array.from({ length: HAND_SIZE }).map((_, i) => {
          const id = state.picks[i]
          return (
            <div key={i} className={`slot ${id ? 'slot--filled' : ''}`}>
              {id ? (
                <div className="slot__card">
                  <span className="slot__face">{getProbe(id).face}</span>
                </div>
              ) : (
                <span className="slot__ghost">{i + 1}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="draft__quick">
        <button type="button" className="btn btn--gold" onClick={() => dispatch({ type: 'STARTER_KIT' })}>Use a starter kit</button>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => {
            sfx.flick()
            dispatch({ type: 'RANDOMIZE_PICKS' })
          }}
        >
          🎲 Surprise me
        </button>
        {state.mode === 'endless' && (state.stats.lastHand?.length ?? 0) === HAND_SIZE && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              sfx.flick()
              dispatch({ type: 'REUSE_LAST_HAND' })
            }}
          >
            ♻️ Last game’s kit
          </button>
        )}
      </div>

      <p className="draft__note">The starter kit balances questions against the visible lineup, not the hidden answer. No perfect solve is promised.</p>
      <details className="probe-help"><summary>Inspect the twelve-number lineup</summary><p className="draft__lineup">{state.caseFile?.lineup.join(' · ')}</p></details>
      <ProbeHelp ids={dealt} />

      <div className="draft__dock"><span aria-live="polite">{state.picks.length} / {HAND_SIZE} selected</span><button
        type="button"
        className="btn btn--gold draft__go"
        disabled={state.picks.length !== HAND_SIZE}
        onClick={() => { sfx.stamp(); dispatch({ type: 'CONFIRM_HAND' }) }}
      >Start the case</button></div>

      <div className="draft__table">
        {dealt.map((id) => (
          <ProbeCard
            key={id}
            id={id}
            used={false}
            selectedInDraft={picked.has(id)}
            unavailable={!picked.has(id) && picked.size === HAND_SIZE}
            onClick={() => dispatch({ type: 'TOGGLE_PICK', id })}
          />
        ))}
      </div>

    </div>
  )
}
