import { useEffect, useRef } from 'react'
import { HAND_SIZE } from '../engine/caseGen'
import { getProbe } from '../engine/probes'
import { sfx } from '../audio/sfx'
import type { Action, GameState } from '../game/store'
import { ProbeCard } from './ProbeCard'

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
        <h2 className="draft__title">Assemble your kit</h2>
        <p className="draft__sub">
          Pick <strong>{HAND_SIZE}</strong> probes from the eleven on the table. Choose your
          detectives wisely — you get five chips to spend them.
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
        {(state.stats.lastHand?.length ?? 0) === HAND_SIZE && (
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

      <div className="draft__table">
        {dealt.map((id) => (
          <ProbeCard
            key={id}
            id={id}
            used={false}
            selectedInDraft={picked.has(id)}
            onClick={() => dispatch({ type: 'TOGGLE_PICK', id })}
          />
        ))}
      </div>

      <button
        type="button"
        className="btn btn--gold draft__go"
        disabled={state.picks.length !== HAND_SIZE}
        onClick={() => {
          sfx.stamp()
          dispatch({ type: 'CONFIRM_HAND' })
        }}
      >
        Open the interrogation room
      </button>
    </div>
  )
}
