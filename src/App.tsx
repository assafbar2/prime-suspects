import { useEffect, useRef, useState } from 'react'
import { sfx } from './audio/sfx'
import { Board } from './components/Board'
import { Draft } from './components/Draft'
import { Lobby } from './components/Lobby'
import { Verdict } from './components/Verdict'
import { useGame } from './game/store'
import { Tutorial } from './components/Tutorial'
import { beginOnboarding, firstMeaningfulMove } from './game/onboarding'

export default function App() {
  const { state, dispatch } = useGame()
  const [muted, setMuted] = useState(sfx.muted)
  const stage = useRef<HTMLElement>(null)

  useEffect(() => {
    if (state.phase === 'lobby' && !state.meta.onboardingSeen) beginOnboarding()
    if (state.usedIds.length) firstMeaningfulMove()
  }, [state.phase, state.meta.onboardingSeen, state.usedIds.length])

  useEffect(() => {
    stage.current?.focus()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [state.phase, state.id])

  useEffect(() => {
    document.title =
      state.phase === 'board' && state.caseFile
        ? `${state.mode === 'daily' ? 'Daily' : 'Practice'} ${state.caseFile.dateKey ?? state.caseFile.caseNumber} · Prime Suspects`
        : 'Prime Suspects'
  }, [state.phase, state.caseFile])

  return (
    <div className="table">
      <div className="spotlight" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />

      <nav className="topbar" aria-label="Game controls">
        {state.phase !== 'lobby' && <button className="btn btn--ghost btn--small" disabled={state.pending} onClick={() => dispatch({ type: 'BACK_LOBBY' })}>← Lobby</button>}
        {state.phase !== 'tutorial' && <button className="btn btn--ghost btn--small" disabled={state.pending} onClick={() => dispatch({ type: 'START_TUTORIAL' })}>How to play</button>}
        <button
        type="button"
        className="soundtoggle"
        onClick={() => setMuted(sfx.toggleMute())}
        aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        aria-pressed={!muted}
        title={muted ? 'Sound: off' : 'Sound: on'}
      >
        {muted ? '🔇' : '🔊'}
      </button></nav>

      <main className="stage" ref={stage} tabIndex={-1} aria-label="Prime Suspects game">
        {state.notice && <p className="notice" role="status">{state.notice}</p>}
        {state.meta.legacy && !state.meta.migrationAcknowledged && <section className="notice" aria-label="Daily record update"><p>The new UTC daily record starts with this release. Your legacy / overall totals are kept separately; the original save remains untouched.</p><button className="btn btn--ghost btn--small" onClick={() => dispatch({ type: 'ACK_MIGRATION' })}>Got it</button></section>}
        {state.phase === 'lobby' && <Lobby state={state} dispatch={dispatch} />}
        {state.phase === 'tutorial' && <Tutorial dispatch={dispatch} />}
        {state.phase === 'draft' && <Draft state={state} dispatch={dispatch} />}
        {state.phase === 'board' && <Board state={state} dispatch={dispatch} />}
        {state.phase === 'verdict' && <Verdict state={state} dispatch={dispatch} />}
      </main>

      <footer className="house">
        <span>Prime Suspects</span>
        <span aria-hidden>·</span>
        <span>v{__APP_VERSION__} · built {__BUILD_DATE__}</span>
        <span aria-hidden>·</span>
        <a href={`${import.meta.env.BASE_URL}privacy/`}>Privacy</a>
      </footer>
    </div>
  )
}
