# Owner launch checklist

Prepared November 14, 2026. **Not published.** This is preparation for the existing Prime Suspects game, not a new platform. Local verification is recorded in [HANDOFF.md](HANDOFF.md); conversion, naming clearance, and analytics eligibility are not established.

## Local deliverables

- Versioned UTC daily identity, one durable result per date, resumable official/practice snapshots, legacy recovery, date-map streaks, storage-denied fallback.
- Teaching fixture, starter/manual/random drafting, examples, mobile layout, keyboard controls, reduced motion, optional sound.
- Canonical spoiler-free invitations, native/copy fallback, validated exact-date routes, static social PNG.
- Default-off bounded analytics adapter and documented cohort rules; no remote collection is claimed to be running.
- Press copy, practice-only screenshots, repeatable HTML5 packaging, root/subpath tests with external application requests blocked.

## Before deploying (owner authorization required)

1. Review the diff against `2a56b51`, the saved test evidence, and dependency risk notes in HANDOFF. The brief's `f6a4b0f…` object is absent from the local clone; reconcile current upstream changes before integration rather than assuming this checkout is newer. Re-run `npm ci && npm test && npm run build` with Node 22. Existing Pages CI uses Node 22; the local host and verified Node 22 versions are recorded separately.
2. Verify control of the `assafbar2/prime-suspects` repository and the existing `prime-suspects.vercel.app` project. Confirm preview/production build command `npm run build`, output `dist`, and deployment environment. No new domain is needed.
3. Leave `VITE_CUSTOM_EVENTS` unset/false unless the analytics setup below is completed. Leave `VITE_SUPPORT_URL` empty unless you personally approve a valid HTTPS destination. Rebuild after changing Vite flags: they are public compile-time values, never secrets.
4. Deploy a preview only after separate authorization. Check daily UTC date, fresh and returning flows, stored-result reopening, invalid links, mobile layout, privacy page, and preview metadata. Do not redirect Pages players: origin-local saves would not transfer.
5. Production publication is a separate owner action. After publication verify the new asset hashes, social PNG, canonical metadata, and no unexpected analytics requests when disabled. Request a social-crawler refresh if the old favicon preview is cached. The current local task has not changed production.
6. Check at least one real iOS Safari and Android Chrome device before broad promotion. Automated Chromium coverage is not a claim of real-device coverage or full accessibility certification.

## Analytics prerequisites (optional, no purchase authorized)

- Inspect the actual Vercel project dashboard and confirm its current plan permits custom events. Eligibility/pricing were not verified for this account. Do not buy an upgrade automatically.
- Enable Web Analytics in that project if desired, then explicitly build with `VITE_CUSTOM_EVENTS=true`. The optional SDK also loads base pageviews. Update/confirm the policy and any consent requirements for the intended audience before collection.
- Validate each allowed event in the dashboard with a test cohort; ensure normalized URLs and bounded properties contain no solution or arbitrary query data. Exclude testing/internal traffic from launch analysis. An API resolution or local console log is not a recorded dashboard denominator.
- Record the actual deployment/collection start timestamp and first **full UTC collection date**. Exclude earlier/partial cohorts and any cohort without a recorded activation denominator. Blocking, failed delivery, cleared storage, and cross-device play bias these device-local estimates.
- If unavailable, keep the flag off. Use the manual playtest plan below instead. No remote measurement or historical backfill is fabricated.

## Naming, rights, accounts

- Clear the name “Prime Suspects” and associated trade dress in the intended markets; no trademark search or legal clearance is represented by this implementation.
- Confirm rights to repository code, artwork, fonts, sound, and existing brand/contact text. The PNG is a rendering of the game's visual system, not licensed third-party artwork. Do not assume a license merely because the repository is public; the old unverified MIT claim is removed from promotional metadata.
- If distributing on an HTML5 store, create/control the store account yourself and review its terms, content rules, privacy requirements, upload limits, and revenue settings. No store listing or account was created.
- Upload the ZIP only after verifying `index.html` is at its root. Configure browser play in the store preview, test embedded/mobile sizing and local-storage restrictions, and keep both existing modes free. No paid archive, payment account, or subscription is included.
- If enabling support, supply your own validated HTTPS donation URL. The UI promises no gameplay advantage or future entitlement. No transaction or donation has been tested or made.

## 30-day manual experiment

These are chosen decision thresholds, **not industry benchmarks or forecasts**.

1. Observe 10 new adult logic-puzzle players. Aim for 8/10 tutorial completions without verbal help. Start timing when the first-time lobby is usable; stop at the first successfully resolved tutorial or real probe. Aim under 30 seconds, then revise from observation. The local browser Performance entry `prime-suspects:time-to-first-probe` assists observation; it is not a remote event or retention clock.
2. Recruit 30 playtesters through a real case. Log real starts separately from completions; target at least 70% completion among meaningful starts before broad outreach. Do not count draft clicks or teaching completions as game starts.
3. Without collection, ask consenting testers to report their completion date and voluntary follow-up play. Keep that manual sample separate from production analytics. Do not claim the 200-person retention gate based on 30 testers or inferred missing events.
4. Once at least 200 new non-tutorial completers belong to mature measured cohorts, evaluate D7 ≥15%, reporting numerator, denominator, and cohort dates. D7 maturity is `C+8 00:00 UTC`; November 14 matures November 22. Smaller or immature samples are inconclusive.
5. For matching mature result-completion cohorts, target first share intent within 24 hours on ≥10% of completed runs. The entire date cohort matures at `C+2 00:00 UTC`. Separately target shared-link starts / completed runs ≥5% over a stated window. This aggregate ratio is not a referral probability or viral coefficient.
6. Poor completion → improve comprehension. Good completion/poor return → improve the puzzle. Good return/poor sharing → improve the invitation. Do not solve all three with new modes.

## Rollback and limits

Keep a prior deploy available. Do not delete v1 or v2 storage as a rollback step. An older app can ignore new keys; the original v1 aggregate remains untouched. Saved generator v2 data must remain interpreted by v2; a future generator change needs a new version and explicit routing policy. Browser-local results are editable by players and not anti-cheat. The fallback for browsers without locks is last-valid-result reconciliation, not strict first-writer preservation.
