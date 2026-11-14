import { useEffect, useState } from 'react'
import { dailyIdentity, resetClock } from '../game/dates'
import type { Action, GameState } from '../game/store'

export function ResetTime() {
  const [clock, setClock] = useState(() => resetClock())
  useEffect(() => { const timer = setInterval(() => setClock(resetClock()), 1000); return () => clearInterval(timer) }, [])
  return <p className="reset-time">New case at 00:00 UTC · {clock.local} your time · in {clock.remaining}</p>
}

export function Lobby({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const today = state.officials[dailyIdentity(state.today)]
  const first = !state.meta.onboardingSeen
  const label = today?.result ? "View today's result" : today ? "Resume today's case" : "Play today's case"
  const linked = state.linkedDate
  const open = () => dispatch({ type: 'START_CASE', mode: 'daily', date: linked ?? state.today })
  return <div className="lobby">
    <header className="lobby__hero">
      <img className="lobby__logo" src={`${import.meta.env.BASE_URL}favicon.svg`} width="100" height="100" alt="" />
      <p className="eyebrow">A daily detective puzzle</p>
      <h1 className="lobby__title">PRIME<br />SUSPECTS</h1>
      <p className="lobby__tagline">Twelve numbers. One culprit. Five probes.</p>
      <p className="lobby__sub">Ask questions. Follow the evidence. Find the hidden number.</p>
    </header>
    {state.routeError ? <section className="notice" aria-label="Challenge link unavailable">
      <h2>This case link cannot be opened</h2><p>{state.routeError}</p>
      <button className="btn btn--gold" onClick={() => dispatch({ type: 'START_CASE', mode: 'daily', date: state.today })}>Play today’s case</button>
    </section> : <>
      {linked && <p className="notice">Invitation: {linked}{linked !== state.today ? ' · unranked practice unless you already started this official case' : ' · today’s daily'}. Your invitation stays with you through the tutorial.</p>}
      <div className="lobby__primary">
        {first ? <>
          <button className="btn btn--gold" onClick={() => dispatch({ type: 'START_TUTORIAL' })}>Learn in one case</button>
          <button className="btn btn--ghost" onClick={open}>{linked ? 'Skip to the linked case' : "Skip to today's case"}</button>
          <p>Three quick moves. No daily attempt used.</p>
        </> : <button className="btn btn--gold" onClick={open}>{linked ? `Open case ${linked}` : label}</button>}
      </div>
      <ResetTime />
    </>}
    <div className="lobby__secondary">
      <button className="btn btn--ghost" onClick={() => dispatch({ type: 'START_CASE', mode: 'endless' })}>Play endless practice</button>
      {state.practice && <button className="btn btn--ghost" onClick={() => dispatch({ type: 'RESUME_PRACTICE' })}>{state.practice.result ? 'View practice result' : 'Resume practice'}</button>}
    </div>
    {Object.values(state.officials).filter((run) => !run.result && run.caseFile.dateKey !== state.today).sort((left, right) => right.caseFile.dateKey!.localeCompare(left.caseFile.dateKey!)).map((run) =>
      <button key={run.id} className="btn btn--ghost unfinished-case" onClick={() => dispatch({ type: 'RESUME_OFFICIAL', identity: run.identity! })}>Resume unfinished case {run.caseFile.dateKey}</button>)}
    {state.stats.casesClosed > 0 && <dl className="lobby__stats">
      <div><dt>Daily cases</dt><dd>{state.stats.casesClosed}</dd></div>
      <div><dt>Solved-date streak</dt><dd>{state.stats.streak}</dd></div>
      <div><dt>Best streak</dt><dd>{state.stats.bestStreak}</dd></div>
    </dl>}
    {state.meta.legacy && <p className="legacy">Legacy / overall: {state.meta.legacy.casesClosed} completed · {state.meta.legacy.totalStars} stars. These mixed-mode totals are not the new daily record.</p>}
    <details className="lobby__howto"><summary>How the case works</summary>
      <ol><li>Choose six question cards. You can ask at most five.</li><li>The hidden culprit answers truthfully. Numbers that disagree leave.</li><li>Accuse one remaining number. There is one official result per UTC date on this browser when storage works.</li></ol>
      <p>Daily play and endless practice are free. Practice does not change your daily streak. A streak counts consecutive solved case dates, not attendance.</p>
      <button className="btn btn--ghost" onClick={() => dispatch({ type: 'START_TUTORIAL' })}>Replay the tutorial</button>
    </details>
    {Object.values(state.officials).some((run) => run.result) && <details className="lobby__howto"><summary>Saved daily results</summary>
      {Object.values(state.officials).filter((run) => run.result).sort((left, right) => right.caseFile.dateKey!.localeCompare(left.caseFile.dateKey!)).map((run) =>
        <button key={run.id} className="btn btn--ghost" onClick={() => dispatch({ type: 'RESUME_OFFICIAL', identity: run.identity! })}>{run.caseFile.dateKey} · {run.result!.win ? 'Solved' : 'Missed'} · {run.result!.probesUsed}/5 probes</button>)}
    </details>}
  </div>
}
