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
| **Draft** | Eleven probe cards hit the felt; you keep six. Beat cops are blunt. Detectives ask classic questions. Specialists are surgical. Wildcards bend the rules. In a hurry? *🎲 Surprise me* deals you a random six. Returning? *♻️ Last game's kit* re-selects the six you kept last time — the dealer slips them back into every new deal for you. |
| **Interrogate** | Spend chips to play probes. The culprit answers honestly, the dossier records the fact, and every suspect on the other side of it is stamped out. Watch the room thin out. |
| **Accuse** | Click a survivor, slam the stamp. Right name closes the case; wrong name clears your streak. |

**Par** — printed beside the chips — is the chip count an optimal interrogation
needs for this specific lineup, computed by a balanced-split solver before the
case is dealt. It sets the bar:

| Chips spent | Verdict |
| --- | --- |
| Under par | ★★★ |
| Exactly par | ★★ |
| More, but solved | ★ |
| Wrong accusation | none, and your streak resets |

## Reading the table

- **The dossier strip** keeps every established fact visible as badges — `Wears a seven? → YES`. Survivors visibly share the whole dossier; accusing means choosing among numbers that match all of it.
- **Banners state both halves**: *"Culprit answers YES … everyone who would answer NO walks:"* followed by the names.
- **DEAD probes cost nothing.** A card whose question can no longer split the survivors is stamped DEAD and refuses your chip — asking "Above 500?" when everyone left is already above 500 wastes nothing, because you can't.
- **Survivors share traits.** If two sevens remain after "wears a seven?", that's the point: they match the culprit's confession. The next split has to come from somewhere else.

## Explain it like I'm 10

**You're a detective in a room with 12 numbers. One of them did a crime. Find it!**

1. **Pick your tools (the draft).** You get cards that each ask a yes/no question
   about the mystery number: *"Are you even?" "Do you have a 7 in you?" "Are you
   a perfect square?"* Pick your favorite 6.

2. **Ask questions (spend chips).** You have 5 chips. Play a card and the mystery
   number **answers honestly**.
   - If the answer is YES → every number that would answer NO gets crossed off. Bye!
   - If the answer is NO → every number that would answer YES gets crossed off. Bye!

3. **Why this works:** every question cuts the room into "matches" and "doesn't
   match." The culprit always stays (it's telling the truth!), but a bunch of
   innocent numbers leave. Ask smart questions and the room gets tiny fast.

4. **Catch the culprit.** When only one number is left — or when you're ready to
   take a risk — point at it and stamp **ACCUSED**. Right? ★★★ Wrong? Streak gone.

**The secret trick:** good questions split the remaining suspects *in half*.
Asking "are you above 500?" when everyone left is already above 500 is useless —
the card goes DEAD and costs you nothing. Asking "are you divisible by 7?" when
two suspects are left and only one appears in the 7 times-table… that's how you
catch the criminal.

That's the whole game: **ask half-questions, watch the room shrink, catch your
number.**

## From the culprit's chair

I am one of twelve numbers in this room, and I am the one you want. The house
compels me to answer every question you put to me, and I am not permitted to
lie. That is my weakness, and your method.

Each of your answers becomes a public fact about me — posted to the dossier,
plain as a nametag. And with every fact, the room loses everyone who doesn't
match it. What survives your five questions is my shadow: the set of numbers
indistinguishable from me given everything you chose to ask. If your questions
were lazy — things half the room could answer identically — my shadow is
crowded, and you are guessing among my twins. If you split us cleanly each time,
the shadow narrows until it holds a single number. Me.

So understand what winning actually is: not intuition, not luck — bookkeeping.
You are counting the bits of evidence I surrender, one honest answer at a time,
until the arithmetic of the room leaves nowhere to stand.

## The probes (~30)

- **Beat cops** — even? above 500? ends in 0/5? odd digit sum? wears a seven?
- **Detectives** — ÷3 ÷7 ÷11 · perfect square · palindrome · digits strictly climbing · head taller than tail · digit sum ÷9 · prime · all digits distinct · repdigit
- **Specialists** — perfect cube · power of two · triangular · Fibonacci · semiprime · square-free · abundant · ≡1 mod 4 · emirp (reverses into another prime)
- **Wildcards** — the **Median Trap** (guaranteed near-half cut of whoever remains), the **Alibi** (name one suspect: innocent → they walk alone; guilty → everyone else walks), the **Confessor** (one true dossier line about the culprit; nobody leaves)

The depth: every test eliminates a *structured* set — all multiples, all squares,
all palindromes — so good play is picking the probe that splits the survivors
closest to half. Information theory by instinct, hidden inside a detective game.

## Fairness & determinism

Generation enforces two provable guarantees on every case, tested per seed:

- **BEST — a solution always exists.** Some six-card draft can narrow the lineup
  to exactly the culprit within the chip budget (`BEST_DRAFT_TARGET = 1`).
- **WORST — clumsiness has a floor.** Even the worst possible draft narrows the
  room to at most four suspects (`WORST_DRAFT_TARGET = 4`). Dead-probe blocking
  means you never burn a chip getting there.

Plus:

- Cases are generated from a seed by a pure function (`src/engine/caseGen.ts`)
- The **Daily Case** hashes today's date into the seed — everyone gets the same file, one attempt per day
- **Par** comes from a greedy balanced-split solver over the full catalog, so stars mean the same thing everywhere
- Your kept kit is threaded through the same fairness checks — favorite probes can't make a case unsolvable
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
