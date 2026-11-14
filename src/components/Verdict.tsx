import { useEffect, useState } from 'react'
import { sfx } from '../audio/sfx'
import { findSeparatingProbe } from '../engine/fairness'
import { deliverShare, shareText, supportUrl } from '../game/sharing'
import type { Action, GameState } from '../game/store'
import { ResetTime } from './Lobby'

export function Verdict({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const run = state.run!
  const result = run.result!
  const [status, setStatus] = useState('')
  const [fallback, setFallback] = useState(false)
  const [sharing, setSharing] = useState(false)
  const support = supportUrl(import.meta.env.VITE_SUPPORT_URL)
  const text = shareText(run)
  const missed = result.win ? null : findSeparatingProbe(run.caseFile.culprit, result.guess)
  useEffect(() => { if (result.win) sfx.fanfare(); else sfx.sting() }, [run.id, result.win])

  async function share(method: 'native' | 'copy') {
    setSharing(true)
    dispatch({ type: 'SHARE_INTENT', runId: run.id })
    const outcome = await deliverShare(text, method, {
      share: navigator.share?.bind(navigator), copy: navigator.clipboard?.writeText.bind(navigator.clipboard),
    })
    if (outcome === 'success') {
      dispatch({ type: 'SHARE_SUCCESS', runId: run.id })
      setStatus(method === 'copy' ? 'Copied. Your invitation is ready to paste.' : 'Share request completed.'); setFallback(false)
    } else if (outcome === 'fallback') {
      setStatus('Sharing is unavailable here. Select and copy the invitation below.'); setFallback(true)
    } else setStatus('Share cancelled. Nothing was copied.')
    setSharing(false)
  }

  return <div className="verdict">
    <p className="eyebrow">{run.mode === 'daily' ? `Official daily · ${run.caseFile.dateKey} · v2` : run.mode === 'daily-practice' ? `PRACTICE · ${run.caseFile.dateKey} · v2` : 'PRACTICE · ENDLESS'}</p>
    <div className={`verdict__stamp ${result.win ? 'is-win' : 'is-lose'}`}><span>{result.win ? 'CASE CLOSED' : 'CASE MISSED'}</span></div>
    <h2 className="verdict__headline">{result.win ? 'You followed the evidence.' : 'Every case teaches you something.'}</h2>
    <p className="verdict__reveal">The culprit was <strong>{run.caseFile.culprit}</strong>{result.win ? '.' : `, not ${result.guess}.`}</p>
    <dl className="verdict__facts">
      <div><dt>Probes used</dt><dd>{result.probesUsed} / 5</dd></div>
      <div><dt>Outcome</dt><dd>{result.win ? 'Solved' : 'Missed'}</dd></div>
      <div><dt>Daily streak</dt><dd>{state.stats.streak}</dd></div>
    </dl>
    <p>{run.mode === 'daily' ? state.notice ? 'This result is session-only and may not survive reload.' : 'Your official result is saved in this browser for this case date.' : 'Unranked practice. Your official daily result and streak are unchanged.'}</p>
    {(run.facts.length > 0 || missed?.test) && <details className="probe-help"><summary>Review the evidence</summary>
      {run.facts.length > 0 && <ul>{run.facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>}
      {missed?.test && <p>One distinguishing question: <strong>{missed.label}</strong> The culprit answers {missed.test(run.caseFile.culprit) ? 'YES' : 'NO'}; your guess answers {missed.test(result.guess) ? 'YES' : 'NO'}. {run.hand.includes(missed.id) ? 'This question was in your kit.' : run.caseFile.deal.includes(missed.id) ? 'This question was in the deal.' : 'This catalog example was not in your deal.'}</p>}
    </details>}
    <section className="invitation" aria-label="Invite another detective">
      <h3>Same mystery. A fresh pair of eyes.</h3><p>Invite someone to play. No answers in your invitation.</p>
      <div className="verdict__row">
        {typeof navigator.share === 'function' && <button className="btn btn--gold" disabled={sharing} onClick={() => void share('native')}>Share challenge</button>}
        <button className="btn btn--gold" disabled={sharing} onClick={() => void share('copy')}>Copy result</button>
      </div>
      <p role="status">{status}</p>
      {fallback && <label className="share-fallback">Invitation text<textarea readOnly value={text} rows={6} onFocus={(event) => event.currentTarget.select()} /></label>}
    </section>
    <ResetTime />
    <div className="verdict__row">
      {run.caseFile.dateKey && <button className="btn btn--ghost" onClick={() => dispatch({ type: 'START_CASE', mode: 'daily-practice', date: run.caseFile.dateKey })}>Practice this case</button>}
      {run.caseFile.dateKey !== state.today && <button className="btn btn--gold" onClick={() => dispatch({ type: 'START_CASE', mode: 'daily', date: state.today })}>Open today’s case</button>}
      <button className="btn btn--ghost" onClick={() => dispatch({ type: 'NEXT_CASE' })}>Play endless practice</button>
      <button className="btn btn--ghost" onClick={() => dispatch({ type: 'BACK_LOBBY' })}>Lobby</button>
    </div>
    {support && <p className="support"><a href={support} target="_blank" rel="noopener noreferrer" onClick={() => dispatch({ type: 'SUPPORT_CLICK', runId: run.id })}>Support the game ↗</a><br /><small>Optional external donation. No gameplay advantages or future entitlements.</small></p>}
  </div>
}
