# Prime Suspects

**Twelve numbers. One culprit. Five probes.**

A noir deduction game disguised as a math toy. A lineup of twelve suspects stands
in the room. One of them did it. Every probe you play asks one *true* question —
*is it a perfect square? does it wear a seven? is it prime, literally?* — and every
suspect on the wrong side of the answer walks out. Cross off ten innocents,
name the culprit, and don't spend all five chips doing it.

**Play:** run locally with `npm run dev`, or deploy the `dist/` anywhere static.
No accounts, no analytics, no server — everything runs in your browser and your
progress stays on your device.

## The loop

| Phase | What happens |
| --- | --- |
| **Draft** | Ten probe cards hit the felt; you keep six. Beat cops are blunt. Detectives ask classic questions. Specialists are surgical. Wildcards bend the rules. |
| **Interrogate** | Spend chips to play probes. Each one answers honestly about the culprit and clears the innocents on the other side. Watch the room thin out. |
| **Accuse** | Click a survivor, slam the stamp. Right name closes the case; wrong name clears your streak. |

**Stars:** solve under par for ★★★ · on par for ★★ · with your last chip for ★.

## The probes (~30)

- **Beat cops** — even? above 500? ends in 0/5? odd digit sum? wears a seven?
- **Detectives** — ÷3 ÷7 ÷11 · perfect square · palindrome · digits strictly climbing · head taller than tail · digit sum ÷9 · prime · all digits distinct · repdigit
- **Specialists** — perfect cube · power of two · triangular · Fibonacci · semiprime · square-free · abundant · ≡1 mod 4 · emirp (reverses into another prime)
- **Wildcards** — the **Median Trap** (guaranteed near-half cut), the **Alibi** (name two: if neither did it both walk — if one did, everyone else walks), the **Confessor** (one true dossier line about the culprit, nobody leaves)

The depth: every test eliminates a *structured* set — all multiples, all squares,
all palindromes — so good play is picking the probe that splits the survivors
closest to half. Information theory by instinct, hidden inside a detective game.

## Fairness & determinism

- Cases are generated from a seed by a pure function (`src/engine/caseGen.ts`)
- The **Daily Case** hashes today's date into the seed — everyone gets the same file, one attempt per day
- **Par** is computed per lineup by a greedy balanced-split solver, so stars mean the same thing everywhere
- Endless cases use fresh seeds from wall-clock entropy

## Stack

Vite · React 19 · TypeScript strict · Vitest (engine fully tested) · zero runtime dependencies beyond React · procedural WebAudio sound (no audio assets) · all graphics are CSS/SVG vectors, sharp at any DPI.

```bash
npm install
npm run dev        # local play
npm test           # engine suite
npm run build      # production bundle to dist/
```

## Design notes

The house style is an interrogation room run by a casino: baize felt, brass
plaques, ivory suspect cards with engraved numbers, oxblood stamps. Suspects are
crossed off with a slammed CROSSED OUT stamp; closing a case brings down the
CASE CLOSED seal. Sound is synthesized live — card flicks, stamp thuds, a small
brass fanfare — and mutable from the corner toggle.

*Every number is innocent until proven composite.*
