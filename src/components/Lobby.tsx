import type { Mode, Stats } from '../game/store'

interface Props {
  stats: Stats
  onStart: (mode: Mode) => void
}

export function Lobby({ stats, onStart }: Props) {
  const dailyDone = stats.dailyDoneFor === todayKey()
  return (
    <div className="lobby">
      <header className="lobby__hero">
        <Logo />
        <h1 className="lobby__title">
          PRIME
          <br />
          SUSPECTS
        </h1>
        <p className="lobby__tagline">Twelve numbers. One culprit. Five probes.</p>
        <p className="lobby__sub">
          Interrogate the lineup. Every probe eliminates the innocents on the wrong side of the
          truth. Name the culprit before your chips run out.
        </p>
      </header>

      <div className="lobby__cases">
        <button type="button" className="casecard casecard--daily" onClick={() => onStart('daily')}>
          <span className="casecard__seal" aria-hidden>
            ✦
          </span>
          <span className="casecard__name">The Daily Case</span>
          <span className="casecard__desc">Same file for everyone. One shot a day.</span>
          <span className={`casecard__status ${dailyDone ? 'is-done' : ''}`}>
            {dailyDone ? '✓ Closed for today' : 'Open — awaiting inspection'}
          </span>
        </button>

        <button
          type="button"
          className="casecard casecard--endless"
          onClick={() => onStart('endless')}
        >
          <span className="casecard__seal" aria-hidden>
            ∞
          </span>
          <span className="casecard__name">The Endless Docket</span>
          <span className="casecard__desc">A fresh case every time. The stack never thins.</span>
          <span className="casecard__status">Open — take as many as you can handle</span>
        </button>
      </div>

      <dl className="lobby__stats">
        <div>
          <dt>Streak</dt>
          <dd>{stats.streak}</dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>{stats.bestStreak}</dd>
        </div>
        <div>
          <dt>Cases closed</dt>
          <dd>{stats.casesClosed}</dd>
        </div>
        <div>
          <dt>Stars earned</dt>
          <dd>{stats.totalStars}</dd>
        </div>
      </dl>

      <details className="lobby__howto">
        <summary>How to play</summary>
        <ol>
          <li>
            <strong>Draft.</strong> Six probes from eleven dealt cards. Beat cops are blunt;
            specialists are surgical; wildcards bend the rules.
          </li>
          <li>
            <strong>Interrogate.</strong> Each probe asks one true question about the culprit —
            and every suspect on the wrong side of the answer is crossed off.
          </li>
          <li>
            <strong>Accuse.</strong> Click a survivor and stamp the accusation. Fewer probes used,
            more stars: beat the par for three.
          </li>
        </ol>
        <div className="legend" role="list" aria-label="Probe tier legend">
          <span role="listitem">
            <i className="gem gem--beat" aria-hidden /> beat — blunt questions
          </span>
          <span role="listitem">
            <i className="gem gem--detective" aria-hidden /> detective — classic tells
          </span>
          <span role="listitem">
            <i className="gem gem--specialist" aria-hidden /> specialist — surgical strikes
          </span>
          <span role="listitem">
            <i className="gem gem--wildcard" aria-hidden /> wildcard — bends the rules
          </span>
        </div>
      </details>
    </div>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 200 200" className="lobby__logo" aria-hidden>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9e7a0" />
          <stop offset=".45" stopColor="#d4af37" />
          <stop offset=".75" stopColor="#a8842c" />
          <stop offset="1" stopColor="#e8cf7a" />
        </linearGradient>
        <radialGradient id="feltlight" cx=".5" cy=".35" r=".8">
          <stop offset="0" stopColor="#14614a" />
          <stop offset="1" stopColor="#0b3d2e" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#feltlight)" stroke="url(#gold)" strokeWidth="3" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="url(#gold)" strokeWidth="1" opacity=".6" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="url(#gold)" strokeWidth="1" opacity=".4" />
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i / 36) * Math.PI * 2
        return (
          <circle
            key={i}
            cx={100 + Math.cos(a) * 78}
            cy={100 + Math.sin(a) * 78}
            r={i % 3 === 0 ? 2.2 : 1.1}
            fill="#d4af37"
            opacity={i % 3 === 0 ? 0.9 : 0.5}
          />
        )
      })}
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fontSize="64"
        fontWeight="700"
        fill="url(#gold)"
        fontFamily="Cinzel, Georgia, serif"
      >
        ?
      </text>
      <text
        x="100"
        y="152"
        textAnchor="middle"
        fontSize="13"
        letterSpacing="4"
        fill="#d4af37"
        opacity=".85"
        fontFamily="Cinzel, Georgia, serif"
      >
        EST. MMXXVI
      </text>
    </svg>
  )
}

function todayKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
