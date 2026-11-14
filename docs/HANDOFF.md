# Release-candidate handoff

November 14, 2026 · Target verified: `https://github.com/assafbar2/prime-suspects` · Starting HEAD: `2a56b51` · Package remains `0.1.5` (not a published version bump).

**Local release candidate. Not published.** The initial implementation was completed without committing or publishing. The owner subsequently authorized a local commit and local playtesting only. No branch, push, deploy, account creation, domain purchase, payment setup, store listing, or outreach was performed. No other repository was edited. The initial working tree was clean. Final packaging verification is recorded below.

## Checkpoints and commands actually run

| Check | Result |
| --- | --- |
| `git remote -v`, `git log -1 --oneline`, `git status --short` | Correct target; HEAD differs from the reviewed baseline. HEAD is dated August 29, 2026; the supplied `f6a4b0f…` object is absent locally, so no claim of being newer is established. Initial tree clean; no applicable AGENTS.md found. |
| Initial `npm test` | 36/36 original engine/fairness tests passed. |
| Integrity checkpoint `npm test` | 52/52 passed: original 36 plus 16 daily/state regressions. |
| Full `npm test` under Node 22.23.5 | 75/75 passed across four files. Original engine/fairness test files unchanged. |
| `npm run build` under Node 22.23.5 | TypeScript and Vite production build passed. Relative `base: './'` retained. |
| `npm run test:browser` under Node 22.23.5 | Final packaged-build run: 15/15 Chromium acceptance tests passed. |
| `npm run test:browser -- --grep same-origin --repeat-each=6` | 6/6 real same-origin Web Lock contention runs passed, asserting the actual first lock holder's result and eventual reconciliation in both tabs. |
| `npm run test:browser -- --grep same-origin --repeat-each=4` | Final harness waits for actual asynchronous lock acquisition: 4/4 additional stress runs passed. |
| `npm run package:html5` twice; `shasum -a 256 -c release/first-build.sha256` | Both production builds passed; identical ZIP bytes verified. |
| `unzip -q …`; `SERVE_DIR=/tmp/prime-suspects-final.04sy8l npm run test:browser -- --grep "root and nested" --reporter=list` | Extracted ZIP served over local HTTP; one test covering root and nested paths passed with external application requests blocked. |
| `npm run assets:social` | Generated and visually inspected the static PNG. PNG header verified exactly 1200×630. |
| `npm run test:browser -- --grep "layout and practice evidence" --reporter=list` | Final export run: 4/4 viewport flows passed, producing exact-dimension screenshots plus full-page evidence. |
| `npm audit --json` | Five development-tool findings: 2 critical, 2 high, 1 moderate. Not silently remediated by an unrelated major upgrade. See risks. |
| `npm audit --omit=dev --json` | Zero production-dependency advisories in this scan; not a security guarantee. |
| `git diff --check` | Passed. No formatter is configured; none added. |
| Press description word count | Exactly 100 whitespace-separated words. |

Node 24.18.0 was used for initial work; the release tests/build were also run with a temporary Node **22.23.5** runtime to match Pages' Node 22 major. Dependency and Chromium downloads needed network approval. A sandboxed Chromium launch initially failed with macOS Mach-port permission denial; the approved unsandboxed rerun worked. These were environment failures, not silently ignored checks.

### QA findings fixed during the pass

- The inherited verdict animation scaled the stamp beyond the 360/390px viewport, including during its reduced-motion delay. Replaced the oversized verdict entrance with an opacity transition, fitted mobile padding/type, and fully disabled motion in the reduced-motion variant. Real overflow assertions then passed.
- Non-result storage updates could unnecessarily replace a tab's in-progress interaction. Reconciliation now adopts completed durable records, while local unfinished interactions remain stable.
- The initial contention test tried clicking a dialog after the other tab had legitimately closed it. A later run also exposed an assertion before asynchronous lock acquisition. The final test holds the native lock until both confirmations are queued, waits for acquisition, then asserts the actual first holder's result using eventual UI assertions. Final stress/full-suite runs passed; no release invariant was weakened to hide a failure.
- A fresh exact-date invitation could lose its pending date if reloaded during teaching after its query was cleaned. The validated pending date is now persisted separately and regression-tested.
- Draft actions were too far below the scrollable deal. The start button now precedes that independently scrollable panel; six compact slots stay on one row at all requested widths. No fixed footer or sound control covers play.
- The inherited used-card overlay obscured its question label. The explicit USED tier now carries that state without a duplicate central stamp.

No numerical UX score, conversion improvement, speed benchmark, real-player study, or real-device coverage is claimed.

## Exact behavior

- **Identity:** `v2:YYYY-MM-DD`, UTC, reset 00:00 UTC. `generateDaily` takes only the supported date; version, seed, and case number are canonical. The general daily generation path ignores preferred hands. Endless retains kit reuse.
- **Storage/migration:** one v2 official record per identity, separate practice slot, separate metadata. Original `prime-suspects:v1` bytes are retained. Old totals are legacy / overall; a one-time notice explains that the new daily record starts here. Replay validation reconstructs survivors, chips, facts and outcomes. Damaged/blocked/full storage gets a truthful session-only banner without destroying recovery data.
- **Attempt/replay:** fresh → draft; unfinished → resume; completed → stored verdict. Explicit practice cannot overwrite official results. Old suspended officials survive new daily/practice switches, including after the share-link window expires. Reread-before-write and same-origin locks protect finalization where available. Without locks, a genuine conflicting race may select the last valid stored record, but both tabs reconcile and the date counts once.
- **Midnight/streak:** completion belongs to the starting case date, not the finishing date. Current streak anchors on today's result if present, otherwise yesterday; a loss or gap stops it. Best streak is the longest winning-date chain. Late wins can bridge gaps, old losses cannot erase newer wins, and practice does not affect it.
- **Score:** solved/missed plus probes used out of five for every new result. Legacy stars remain historical only. No optimal-hand guarantee or par score is advertised.
- **Links:** exact version/date; stored official result precedes unfinished official run, then today official or preceding-seven-date practice. Invalid/future/old/version mismatch explains instead of substituting. Validated pending date and source survive onboarding/reload. Endless shares link to the homepage without promising replay. All outgoing invitations use Vercel; Pages is not redirected.
- **Telemetry:** remote collection off by default; local markers deduplicate start/completion/intent/success. Meaningful starts include successful probes or zero-probe confirmed accusations, not draft/dead probes or tutorial. First-completion cohorts use actual completion dates; D1/D7 qualify only on exact subsequent UTC dates and mature at C+2/C+8. Share rates use first intent within 24 hours and whole-date maturity C+2. Pre-collection and missing-denominator cohorts are excluded. Debug output is not a deployed dashboard. See METRICS for formulas and limitations.

## Distribution and visual evidence

Final artifact: `release/prime-suspects-html5.zip`. `npm run package:html5` builds with custom events, debug collection, and support links disabled; it uses relative paths and puts `index.html` at the ZIP root. There is no service worker or `file://` support promise.

Final ZIP reproducibility and extracted-HTTP smoke result: **passed**. ZIP size: **519,703 bytes**. SHA-256: `9ff69b3d2c3e8e760aafff62622dd8a23666a9628dc1eacfdf99245ad091b55c`. Root and nested paths both play with external application requests blocked; social PNG and privacy navigation also resolve. The same-source same-date second build produced identical bytes.

| Viewport | Gameplay | Other evidence |
| --- | --- | --- |
| 360×800 | [exact viewport](assets/viewport-360x800.png), [full gameplay](assets/gameplay-360x800.png) | [draft](assets/draft-360x800.png), [tutorial](assets/tutorial-360x800.png), [result](assets/result-360x800.png) |
| 390×844 | [exact viewport](assets/viewport-390x844.png), [full gameplay](assets/gameplay-390x844.png) | [draft](assets/draft-390x844.png), [tutorial](assets/tutorial-390x844.png), [result](assets/result-390x844.png) |
| 768×1024 | [exact viewport](assets/viewport-768x1024.png), [full gameplay](assets/gameplay-768x1024.png) | [draft](assets/draft-768x1024.png), [tutorial](assets/tutorial-768x1024.png), [result](assets/result-768x1024.png) |
| 1440×900 | [exact viewport](assets/viewport-1440x900.png), [full gameplay](assets/gameplay-1440x900.png) | [draft](assets/draft-1440x900.png), [tutorial](assets/tutorial-1440x900.png), [result](assets/result-1440x900.png) |

The `viewport-*` files have exactly the required pixel dimensions. Other images are full-page captures at those viewports, so their image height can exceed viewport height. Gameplay/draft/result captures use illustrative endless practice and the test finishes those runs. Teaching images use only the public `[12, 15, 22, 27]` fixture. No unreleased daily solution appears in the distribution assets. The social image is `public/social-preview.png`, produced from `scripts/social-preview.html` without solution-bearing data.

## Analytics audit and external owner actions

The checkout's App and package manifest did not contain the Analytics mount described in the older brief. The deployed HTML fetched November 14 referenced `assets/index-DUzsfPe4.js`; that deployed bundle contained `@vercel/analytics`, `_vercel/insights`, and `window.va`. This is evidence of a source/deployment mismatch, not proof of dashboard configuration, successful event delivery, or plan eligibility. The replacement uses one optional SDK and defaults collection off. The older deployed site's behavior was not changed.

Owner actions: authorize publication; verify control of Vercel/Pages and any store account; verify analytics plan/dashboard/cohort export capability if enabling collection; supply an HTTPS support destination only if wanted; complete naming/rights checks; run the 10-player/30-tester experiment and real iOS/Android checks. The code does not buy upgrades or fabricate missing integrations. LAUNCH contains the detailed checklist and the chosen 30-day decision gates.

## Remaining risks

- Browser-local results are editable, origin-local and not cheat-proof. No strict first-writer guarantee without browser locks, cross-device protection, or server authority.
- Analytics eligibility is unknown. Provider/adblock/offline failures can distort denominators; local deduplication cannot identify people across devices or cleared storage. No remote dashboard or measured cohort is claimed.
- Human comprehension, completion, conversion, D7 retention, and sharing are unproven. Automated tests are not the 30-day experiment.
- Naming/trademark/license clearance is not established. No external publication or owner account setup was done.
- This patch is against local HEAD `2a56b51`, not an unverified current remote head. Reconcile upstream changes and the brief's unavailable baseline before merging/deploying; no remote fetch/merge was performed.
- Chromium automated evidence is not real-device Safari/Android or screen-reader certification.
- Existing development dependencies have audit findings in `vitest`/`tinypool`/`@vitest/mocker`, `vite`, and `source-map-js`. They are not shipped as the static production runtime, and the production-dependency scan found no advisories. Resolve them in a separately reviewed dependency update before exposing development tooling to untrusted networks/projects. No forced Vitest major upgrade or unrelated source fix was made here.

## File-by-file change map

| File | Purpose |
| --- | --- |
| `src/engine/caseGen.ts` | Canonical v2 daily wrapper, UTC helper, daily kit independence, truthful benchmark description. |
| `src/engine/starterKit.ts` | Deterministic public-information six-card selection with stable ties. |
| `src/game/dates.ts` | UTC validation/arithmetic, identity, reset countdown/local display, date-map streaks. |
| `src/game/run.ts` | Pure guarded run transitions, snapshot schema, canonical replay validation, wildcard/result restoration. |
| `src/game/storage.ts` | Per-date official storage, practice slot, metadata, non-destructive v1 migration and storage failure notices. |
| `src/game/store.ts` | React/controller boundary, routing/resume, finalization locks/reconciliation, durable telemetry markers. |
| `src/game/sharing.ts` | Exact-date URL contract, canonical spoiler-free text, clipboard/native outcomes, HTTPS support validation. |
| `src/game/telemetry.ts` | Bounded event adapter, optional single SDK, debug sink, cohort/maturity/24-hour helpers. |
| `src/game/onboarding.ts` | Local observed first-lobby-to-first-probe timer. |
| `src/App.tsx` | First-time/returning routing UI, tutorial, notices, accessible toolbar, sound state, focus/scroll transitions. |
| `src/components/Lobby.tsx` | Daily CTA state, reset, old official recovery, result history, legacy labeling and tutorial entry. |
| `src/components/Tutorial.tsx` | Actual-predicate three-action teaching fixture, skip/complete/replay. |
| `src/components/Draft.tsx` | Starter/manual/random/reused kit UI, compact six slots, accessible start/deal browsing. |
| `src/components/ProbeHelp.tsx` | Accessible term examples and question explanations. |
| `src/components/ProbeCard.tsx` | Selected/full/used/no-information text and disabled/pressed semantics. |
| `src/components/SuspectCard.tsx` | Text-equivalent elimination state and disabled eliminated suspects. |
| `src/components/Board.tsx` | Mode/date labels, probe-count scoring, non-covering evidence, guarded cards, keyboard accusation dialog. |
| `src/components/Verdict.tsx` | Comparable result, evidence review, native/copy invitation, visible failure fallback, practice/new-day/support actions. |
| `src/audio/sfx.ts` | Storage-safe muted default and user-initiated sound activation. |
| `src/styles/index.css` | Readable system body type, non-fixed toolbar/footer, mobile grids, scrolling deal, tutorial/help, focus and reduced motion. |
| `src/__tests__/helpers.ts` | Deterministic storage/controller test fixtures. |
| `src/__tests__/daily.test.ts` | Daily identity, persistence/migration, midnight/streak, starter, attempt/locking regression tests. |
| `src/__tests__/sharing-telemetry.test.ts` | Links, teaching, sharing failure/cancellation, exact activation/return/share metrics and exclusions. |
| `tests/browser/release.spec.ts` | End-to-end onboarding/results, storage denial, two-tab locks/fallback, midnight, keyboard, viewports, offline/subpath tests and screenshots. |
| `playwright.config.ts` | Minimal Chromium acceptance setup and static preview server lifecycle. |
| `vitest.config.ts` | Keep unit test discovery separate from browser tests. |
| `scripts/serve.mjs` | Local static root/subpath HTTP preview for built or extracted files. |
| `scripts/package.mjs` | Relative HTML5 ZIP build, disabled integrations, sorted normalized packaging. |
| `scripts/social-preview.html` | Editable spoiler-free social image layout in the game's visual language. |
| `scripts/social-preview.mjs` | Reproducible 1200×630 PNG rendering via Chromium. |
| `public/social-preview.png` | Actual static social preview asset. |
| `index.html` | PNG social metadata, relative public links, truthful scoring/positioning fallback, no remote fonts. |
| `public/privacy/index.html` | Actual release storage, optional collection, hosting, sharing and origin-local disclosures. |
| `public/about/index.html` | Current game/scoring/daily copy and subpath-safe local links/fonts. |
| `public/contact/index.html` | Subpath-safe links and removal of remote font requests. |
| `public/404.html` | Relative fallback links/favicon and no remote font requests. |
| `public/llms.txt` | Current rules/positioning, no false optimal-par or unverified license/build-equivalence claims. |
| `package.json` | Single optional analytics dependency, browser test dependency, test/asset/package commands. |
| `package-lock.json` | Reproducible dependency resolution; sync pre-existing root version drift to package `0.1.5`. |
| `.env.example` | Explicit public, default-off integration flags. |
| `.gitignore` | Generated test reports and ZIP output exclusions. |
| `README.md` | Setup, current rules, persistence/routing/privacy limits, verification and packaging. |
| `docs/LAUNCH.md` | Owner prerequisites, no-publication boundary, rollout/rollback and 30-day experiment. |
| `docs/METRICS.md` | Exact vocabulary, funnel/cohort formulas, maturity, exclusions, collection limitations. |
| `docs/PRESS-KIT.md` | Pitch, 100-word description, three drafts, 15-second practice capture script, asset usage. |
| `docs/HANDOFF.md` | This evidence, behavioral contract, risks and change map. |
| `docs/assets/{draft,gameplay,result,tutorial}-{360x800,390x844,768x1024,1440x900}.png` | Sixteen captures: four phases at each requested viewport; all non-daily-solution evidence. |
| `docs/assets/viewport-{360x800,390x844,768x1024,1440x900}.png` | Four exact-pixel viewport screenshots in addition to the full-page evidence. |

Generated/ignored outputs: `dist/`, `playwright-report/`, `test-results/`, `release/prime-suspects-html5.zip`, `release/first-build.sha256`, and `release/README.txt`. No deployment workflow was triggered.
