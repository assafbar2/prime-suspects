# Prime Suspects

**A daily detective puzzle where the suspects are numbers.** Twelve numbers. One culprit. Five probes.

Choose six questions, interrogate the lineup, and make one accusation. The hidden culprit answers truthfully; numbers that disagree leave. Free daily and endless practice, no account, optional sound. A three-move teaching case introduces the deduction before the full draft.

**Canonical play / outgoing invitations:** https://prime-suspects.vercel.app/

GitHub Pages remains supported at https://assafbar2.github.io/prime-suspects/. There is no redirect. Saves belong to each origin and do not migrate between sites or devices. **This working tree is a local release candidate, not published.**

## Run and verify

Node 22 (the Pages workflow version), npm, and a browser:

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser suite serves `dist` over local HTTP, blocks external application requests, and exercises both `/` and `/nested/`. Build before running it. It writes practice-only screenshots to `docs/assets/`. `npm run preview:static` starts the same read-only local preview on port 4173.

## Daily rules and saves

- An official daily is **`v2:YYYY-MM-DD` in UTC**. It resets at 00:00 UTC, with a local-time translation and countdown shown in the lobby and results.
- `generateDaily(date)` hashes the versioned identity. It has no player kit, stats, local case counter, or random clock input. The lineup, culprit, ordered deal, case number, and catalog reference are identical for that identity.
- Opening a daily resumes its draft/board or reopens its first stored result. Explicit practice replay cannot change that result. Old unfinished officials remain available from the lobby while a newer case or practice is played.
- Draft, hand, resolved probes (including alibi targets), chips, survivors, facts, wildcard state, pending accusation, and result are persisted. Loaded histories are replayed through the same predicates to restore derived data rather than trusting saved survivors or scores.
- Results are stored separately per identity, not counted by incrementing a daily counter. Finalization rereads durable results and uses an exclusive same-origin Web Lock when available. The fallback can select the last valid conflicting write; storage events reconcile both tabs and still count one date. Browser-local saves are **not cheat-proof**, cross-device, or server-authoritative.
- A case that crosses midnight belongs to its immutable starting case date. Actual completion time is stored separately for measurement.
- Current streak anchors on today's result if one exists, otherwise yesterday. It counts winning case dates backward until a loss or missing date. Best streak is the longest consecutive winning-date chain. Late official wins can fill gaps; old losses cannot erase newer chains. Practice has no effect.
- `prime-suspects:v1` is retained unchanged. Old mixed-mode totals appear as legacy / overall, never fabricated v2 daily results. A one-time notice explains the new record.
- Blocked, full, unavailable, malformed, or unsupported storage switches to session-only play with a notice. Bad bytes are not overwritten. No durable attempt limit is promised then.

## Scoring, drafting, and fairness

Results and invitations compare **solved/missed + probes used out of five**. No par-based stars are awarded in this release. Existing legacy star totals remain readable. `greedyPar` is retained as an engine reference over the full static catalog, not an optimal solver or a promise about any selected hand.

Manual six-card drafting and the random-kit shortcut remain. A deterministic starter kit scores how questions separate the visible lineup, with stable probe-ID tie-breaks; its helper never accepts the culprit. It selects cards without starting the board and promises no perfect solve. Endless practice still offers the last-used kit through the existing generator/fairness checks.

The existing seeded generator and best/worst draft fairness checks are retained. The solver checks available sequences for a hand, not that any arbitrary order of player actions must solve it. Existing engine/fairness tests are unchanged.

## Invitations

`?daily=YYYY-MM-DD&v=2` names one exact daily. Supported links prefer a stored official result, then an unfinished official run. Otherwise today opens official play and the preceding seven UTC dates open unranked practice. Future, malformed, older, or unsupported-version links explain the problem; they never silently substitute a case. Saved older officials remain resumable from the lobby.

Only `utm_source=player_share&utm_medium=result` becomes a source category. It persists locally through teaching/drafting until a meaningful real-game start, then is consumed. Arbitrary query data is ignored. Daily practice says **PRACTICE**; endless says **PRACTICE · ENDLESS** and links to the homepage, not an exact replay. Native share and explicit copy coexist. Cancellation does not copy. Clipboard failure exposes selectable text. The static 1200×630 preview has no solution.

## Privacy and optional integrations

At inspected HEAD `2a56b51`, source and dependencies did **not** mount Vercel Analytics; the deployed Vercel bundle inspected on November 14, 2026 **did** include it. They were different builds. This release uses one optional `@vercel/analytics` integration, not two SDKs.

`VITE_CUSTOM_EVENTS=false` by default. No analytics script is injected in that configuration. Explicitly enabling it loads Vercel Web Analytics for custom events and base pageviews; an eligible plan and dashboard setup are owner prerequisites, not verified here. Event fields are allowlisted and analytics URLs normalized to the canonical homepage. No local run ID, culprit, answer, arbitrary query, email, or fingerprint is sent by the adapter. Failure never blocks play. Provider transport and hosting request logs still apply. `VITE_TELEMETRY_DEBUG=true` logs bounded events only in a development build; that is not a live dashboard.

System fonts avoid external font requests. A validated owner-supplied HTTPS `VITE_SUPPORT_URL` shows an optional external donation link only after a real result. It is hidden otherwise. No payment infrastructure or gameplay entitlement is included.

See [metrics definitions](docs/METRICS.md), [owner launch checklist](docs/LAUNCH.md), [press kit](docs/PRESS-KIT.md), and [verification handoff](docs/HANDOFF.md).

## HTML5 distribution

```sh
npm run assets:social
npm run package:html5
unzip -q release/prime-suspects-html5.zip -d /tmp/prime-suspects-unpacked
SERVE_DIR=/tmp/prime-suspects-unpacked npm run test:browser -- --grep "root and nested"
```

Packaging requires the system `zip` utility; extraction uses `unzip`. It stages sorted files with normalized timestamps and creates `release/prime-suspects-html5.zip` with `index.html` at the root and relative asset paths. It rebuilds with remote telemetry and support links disabled. The included social PNG is already generated; Chromium is only required to regenerate it or run browser tests. Identical source/build-date inputs produce the same package; the visible build date otherwise changes on a different day. Serve over HTTP. Double-click `file://` and offline reload of a previously hosted page are not supported; there is no service worker.

## Stack

Vite + React + TypeScript + Vitest, with Playwright acceptance tests. Browser-only game logic; no backend, accounts, LLM calls, payments, leaderboard, or new framework. Green felt, brass, ivory, and procedural optional WebAudio remain the visual and sound language.
