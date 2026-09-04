import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { sfx } from './audio/sfx'
import { Board } from './components/Board'
import { Draft } from './components/Draft'
import { Lobby } from './components/Lobby'
import { Verdict } from './components/Verdict'
import { useGame } from './game/store'

export default function App() {
  const { state, dispatch } = useGame()

  useEffect(() => {
    document.title =
      state.phase === 'board' && state.caseFile
        ? `Case №${String(state.caseFile.caseNumber).padStart(4, '0')} · Prime Suspects`
        : 'Prime Suspects'
  }, [state.phase, state.caseFile])

  return (
    <div className="table">
      <Analytics />
      <div className="spotlight" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />

      <button
        type="button"
        className="soundtoggle"
        onClick={() => sfx.toggleMute()}
        aria-label={sfx.muted ? 'Unmute sounds' : 'Mute sounds'}
        title={sfx.muted ? 'Sound: off' : 'Sound: on'}
      >
        {sfx.muted ? '🔇' : '🔊'}
      </button>

      <main className="stage">
        {state.phase === 'lobby' && <Lobby stats={state.stats} onStart={(m) => dispatch({ type: 'START_CASE', mode: m })} />}
        {state.phase === 'draft' && <Draft state={state} dispatch={dispatch} />}
        {state.phase === 'board' && <Board state={state} dispatch={dispatch} />}
        {state.phase === 'verdict' && <Verdict state={state} dispatch={dispatch} />}
      </main>

      <footer className="house">
        <span>Prime Suspects</span>
        <span aria-hidden>·</span>
        <span>v{__APP_VERSION__} · built {__BUILD_DATE__}</span>
        <span aria-hidden>·</span>
        <span className="house__motto">the house always does the math</span>
      </footer>
    </div>
  )
}
