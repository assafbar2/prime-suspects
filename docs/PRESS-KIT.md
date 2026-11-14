# Prime Suspects press kit

Prepared November 14, 2026. Draft material only; **not posted or published**.

## One-line pitch

A daily detective puzzle where the suspects are numbers: twelve suspects, one culprit, five probes.

## Description (100 words)

Prime Suspects is a daily detective puzzle where the suspects are numbers. Twelve stand in a lineup; one is hiding the truth. Choose six question cards, spend up to five probes, and follow the evidence before making one accusation. Every answer comes from the hidden culprit, so numbers that disagree leave the room. A short teaching case shows the idea before your first daily. Play free in your browser, without an account, with optional sound. Return for a new UTC daily or keep investigating in endless practice. Share a spoiler-free invitation and let another detective try the case for themselves.

## Three truthful post drafts

**Daily-puzzle audience**

Twelve numbers walk into an interrogation room. One is the culprit. You have five questions to work out which. Prime Suspects is a free daily deduction puzzle, with a three-move teaching case and no account required. Today's case: https://prime-suspects.vercel.app/

**Playtest invitation (use before broad promotion)**

I’m looking for adult daily-puzzle players to try Prime Suspects. The suspects are numbers; the game is about narrowing down possibilities. Can you get through the teaching case without help, and what makes you hesitate? Free browser play: https://prime-suspects.vercel.app/ — feedback welcome, no perfect scores required.

**Deduction hook**

“Is it even?” The hidden number says yes. Every odd suspect leaves. That’s the whole idea behind Prime Suspects: ask, eliminate, accuse. Six cards in your kit, five probes to spend. Free daily and endless practice, no account: https://prime-suspects.vercel.app/

## 15-second gameplay capture script

Use a clearly labeled **endless practice** case, finish it before distribution, and never show an unreleased official daily solution.

- 0–3s: “Twelve numbers. One culprit.” Show the practice lineup on green felt.
- 3–7s: Play one useful familiar probe. Hold on the YES/NO evidence and departing non-matching numbers.
- 7–11s: Cut to a second probe from the same practice run, then the accusation confirmation. No claim that every run solves in two moves.
- 11–13s: Show the finished practice result and its probe count.
- 13–15s: “Your turn.” Show the spoiler-free invitation and canonical homepage.

No invented player counts, testimonials, urgency, revenue, perfect-solve promises, or technology-as-the-pitch. Add captions; sound is optional. Do not crop away the practice label.

## Assets and usage

- `public/social-preview.png`: static 1200×630 spoiler-free preview, generated from `scripts/social-preview.html` using `npm run assets:social`.
- `docs/assets/gameplay-{width}x{height}.png`: illustrative endless-practice board captures at 360×800, 390×844, 768×1024, and 1440×900 viewports. Runs are completed by the capture tests; no unreleased daily solution is used.
- `docs/assets/viewport-{width}x{height}.png`: exact-pixel captures at each of those four sizes, alongside the longer full-page gameplay images.
- `docs/assets/draft-*.png` and `docs/assets/result-*.png`: matching draft/results evidence. Full-page image height can exceed viewport height; filenames identify the tested viewport.
- `public/favicon.svg`: existing vector favicon, retained.

The existing canonical Vercel origin is the outbound destination; Pages remains functional without redirect. Branding/naming clearance is an owner prerequisite, not established by these assets. The support link is absent unless the owner supplies a validated HTTPS destination.
