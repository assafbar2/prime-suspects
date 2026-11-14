import { useState } from 'react'
import { resolveStatic } from '../engine/caseGen'
import { firstMeaningfulMove } from '../game/onboarding'
import type { Action } from '../game/store'

export const TUTORIAL_LINEUP = [12, 15, 22, 27]
export const TUTORIAL_CULPRIT = 22

export function Tutorial({ dispatch }: { dispatch: (action: Action) => void }) {
  const [step, setStep] = useState(0)
  const [crossed, setCrossed] = useState<number[]>([])
  const ask = (id: string) => {
    const response = resolveStatic(id, TUTORIAL_LINEUP.filter((number) => !crossed.includes(number)), TUTORIAL_CULPRIT)
    setCrossed([...crossed, ...response.eliminated]); setStep(step + 1); firstMeaningfulMove()
  }
  return <section className="tutorial">
    <p className="eyebrow">Training file · not your daily attempt</p>
    <h1>One case. Three moves.</h1>
    <p className="tutorial__intro">One of these numbers is hiding something. Ask the hidden number a question; every number that disagrees leaves.</p>
    <ol className="tutorial__steps" aria-label="Tutorial progress"><li aria-current={step === 0 ? 'step' : undefined}>1. Ask even</li><li aria-current={step === 1 ? 'step' : undefined}>2. Ask ÷ 3</li><li aria-current={step >= 2 ? 'step' : undefined}>3. Accuse</li></ol>
    <div className="tutorial__lineup">
      {TUTORIAL_LINEUP.map((number) => <button key={number} className={`tutorial__suspect ${crossed.includes(number) ? 'is-crossed' : ''}`} disabled={step !== 2 || crossed.includes(number)} aria-label={`${number}${crossed.includes(number) ? ', eliminated' : ', still a suspect'}`} onClick={() => { setStep(3); dispatch({ type: 'TUTORIAL_COMPLETE' }) }}>
        <strong>{number}</strong><span>{crossed.includes(number) ? 'ELIMINATED' : step === 3 ? 'CULPRIT' : 'SUSPECT'}</span>
      </button>)}
    </div>
    <div className="tutorial__evidence" aria-live="polite">
      {step === 0 && <p>Start with a simple split: is the hidden number even?</p>}
      {step >= 1 && <p><strong>Even? YES.</strong> 15 and 27 are odd, so they leave. 12 and 22 stay.</p>}
      {step >= 2 && <p><strong>Divisible by three? NO.</strong> 12 divides evenly by 3; 22 does not. Only 22 stays.</p>}
      {step === 2 && <p>Click 22 to accuse. You have followed the evidence.</p>}
      {step === 3 && <p><strong>Case closed.</strong> In a real case, choose six cards and spend up to five probes. Then make one accusation.</p>}
    </div>
    {step === 0 && <button className="btn btn--gold" onClick={() => ask('even')}>Ask: is it even?</button>}
    {step === 1 && <button className="btn btn--gold" onClick={() => ask('div3')}>Ask: divisible by three?</button>}
    {step === 3 && <button className="btn btn--gold" onClick={() => dispatch({ type: 'END_TUTORIAL', complete: true })}>Continue to your case</button>}
    {step < 3 && <button className="btn btn--ghost" onClick={() => dispatch({ type: 'END_TUTORIAL', complete: false })}>Skip tutorial</button>}
  </section>
}
