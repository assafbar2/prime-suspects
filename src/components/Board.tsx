import { useEffect } from 'react'
import { CHIPS_PER_CASE } from '../engine/caseGen'
import { getProbe } from '../engine/probes'
import { isLiveStatic } from '../engine/fairness'
import { sfx } from '../audio/sfx'
import type { Action, GameState } from '../game/store'
import type { SuspectState } from './SuspectCard'
import { SuspectCard } from './SuspectCard'
import { ProbeCard } from './ProbeCard'

interface Props {
  state: GameState
  dispatch: (a: Action) => void
}

export function Board({ state, dispatch }: Props) {
  const cf = state.caseFile!
  const crossed = new Set(state.crossedOff)

  // Auto-dismiss resolution banner; play its sound once on arrival.
  useEffect(() => {
    if (!state.resolution) return
    if (state.resolution.eliminated.length > 0) sfx.walk()
    else sfx.whisper()
    const t = setTimeout(() => dispatch({ type: 'DISMISS_RESOLUTION' }), 2600)
    return () => clearTimeout(t)
  }, [state.resolution, dispatch])

  useEffect(() => {
    if (!state.confession) return
    sfx.whisper()
  }, [state.confession])

  function suspectClick(n: number) {
    if (crossed.has(n)) return
    if (state.alibiMode) {
      sfx.click()
      dispatch({ type: 'PICK_ALIBI', n })
      const alibiId = state.hand.find(
        (h) => getProbe(h).kind === 'alibi' && !state.usedIds.includes(h),
      )
      if (alibiId) {
        sfx.flick()
        dispatch({ type: 'USE_PROBE', id: alibiId })
      }
      return
    }
    if (state.accusation != null || state.phase === 'verdict') return
    sfx.click()
    dispatch({ type: 'ACCUSE', n })
  }

  function probeUse(id: string) {
    sfx.flick()
    dispatch({ type: 'USE_PROBE', id })
  }

  const suspectState = (n: number): SuspectState => {
    if (crossed.has(n)) return 'crossed'
    if (state.alibiPicks.includes(n)) return 'alibiPick'
    if (state.accusation === n) return 'accused'
    return 'alive'
  }

  const alive = cf.lineup.filter((n) => !crossed.has(n))
  const aliveCount = alive.length

  /**
   * A probe is dead when it can no longer split the room — playing it would
   * waste a chip, so we refuse to spend one. Uses only public information:
   * whether the surviving numbers still disagree about the question.
   */
  function probeBlocked(id: string): boolean {
    if (state.usedIds.includes(id)) return false
    if (aliveCount < 2) return true // nobody left to split — time to accuse
    const def = getProbe(id)
    if (def.kind === 'static' && def.test) return !isLiveStatic(def, alive)
    if (def.kind === 'confessor') return false
    return false // median trap & alibi can always act while two or more stand
  }

  return (
    <div className={`board ${state.alibiMode ? 'board--alibi' : ''}`}>
      <header className="board__bar">
        <div className="plate">
          <span className="plate__rivet" aria-hidden />
          <span className="plate__text">
            CASE №{String(cf.caseNumber).padStart(4, '0')}
            <em>{cf.isDaily ? ' · THE DAILY' : ' · DOCKET'}</em>
          </span>
          <span className="plate__rivet plate__rivet--r" aria-hidden />
        </div>

        <div className="chips" aria-label={`${state.chipsLeft} chips left`}>
          {Array.from({ length: CHIPS_PER_CASE }).map((_, i) => (
            <span
              key={i}
              className={`chip ${i < state.chipsLeft ? '' : 'chip--spent'}`}
              aria-hidden
            />
          ))}
        </div>

        <div className="board__meta">
          <span>
            <strong>{aliveCount}</strong> in the room
          </span>
          <span className="board__par">
            par <strong>{cf.par}</strong>
          </span>
        </div>
      </header>

      {state.alibiMode && (
        <div className="alibibar">
          <span>
            Name <strong>one</strong> suspect — click a card and the check fires
            {state.alibiPicks.length > 0 && (
              <>
                {' '}
                (named: <strong>{state.alibiPicks[0]}</strong>)
              </>
            )}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => dispatch({ type: 'CANCEL_ALIBI' })}
          >
            Cancel
          </button>
        </div>
      )}

      <main className="lineup" role="list">
        {cf.lineup.map((n, i) => (
          <SuspectCard
            key={n}
            value={n}
            index={i}
            state={suspectState(n)}
            onClick={() => suspectClick(n)}
          />
        ))}
      </main>

      <footer className="hand">
        <div className="hand__cards">
          {state.hand.map((id) => (
            <ProbeCard
              key={id}
              id={id}
              used={state.usedIds.includes(id)}
              blocked={probeBlocked(id)}
              onClick={() => probeUse(id)}
            />
          ))}
        </div>
        <p className="hand__hint">Click a survivor to accuse. Probes ask one true question each.</p>
      </footer>

      {state.accusation != null && state.phase === 'board' && (
        <ConfirmAccuse state={state} dispatch={dispatch} />
      )}

      {state.confession && (
        <aside className="confession" role="status">
          <span className="confession__candle" aria-hidden>
            🕯
          </span>
          <blockquote>{state.confession}</blockquote>
        </aside>
      )}

      {state.resolution && !state.confession && (
        <aside className="banner" role="status">
          <strong>{state.resolution.headline}</strong>
          {state.resolution.eliminated.length > 0 && (
            <span>
              {' '}
              — {state.resolution.eliminated.length} walked out:{' '}
              {state.resolution.eliminated.join(' · ')}
            </span>
          )}
        </aside>
      )}
    </div>
  )
}

function ConfirmAccuse({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: (a: Action) => void
}) {
  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') dispatch({ type: 'CANCEL_ACCUSE' })
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [dispatch])

  const n = state.accusation!
  const alive = !new Set(state.crossedOff).has(n)
  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm accusation"
      onClick={() => dispatch({ type: 'CANCEL_ACCUSE' })}
    >
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="dialog__close"
          aria-label="Close"
          onClick={() => dispatch({ type: 'CANCEL_ACCUSE' })}
        >
          ✕
        </button>
        <h3>Slam the stamp?</h3>
        <p className="dialog__big">{n}</p>
        {!alive && <p className="dialog__warn">That number already walked out.</p>}
        <p>You get one accusation. Wrong name clears your streak.</p>
        <div className="dialog__row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              sfx.click()
              dispatch({ type: 'CANCEL_ACCUSE' })
            }}
          >
            Keep looking
          </button>
          <button
            type="button"
            className="btn btn--red"
            disabled={!alive}
            onClick={() => {
              sfx.stamp()
              dispatch({ type: 'CONFIRM_ACCUSE' })
            }}
          >
            ACCUSE {n}
          </button>
        </div>
      </div>
    </div>
  )
}
