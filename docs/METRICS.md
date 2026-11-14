# Measurement contract

## Collection status

**New remote collection defaults off.** No Vercel account/plan/dashboard was configured or verified. `VITE_CUSTOM_EVENTS=true` explicitly loads the one optional Vercel SDK for custom events and base pageviews. `VITE_TELEMETRY_DEBUG=true` is a development-only console sink, not a dashboard. The HTML5 ZIP forcibly disables both. Source HEAD and the deployed bundle differed during the audit; see HANDOFF.

Markers survive resume/reload in local run snapshots. Global activation/cohort/return markers live in v2 metadata. Storage-denied sessions deduplicate only in memory on that page. There is no player identifier sent to the collector and no server reconciliation across devices. Counts describe browser-local behavior, not unique human beings.

## Event reference

| Event | Exact trigger and exclusions |
| --- | --- |
| `game_start` | First successful probe resolution, or confirmed accusation with no probes, once per local run. Draft/kit clicks, opening the alibi picker, dead/used/blocked probes and resume do not qualify. |
| `tutorial_complete` | First completed teaching fixture locally; replays do not inflate it. Never a real-game start or first completion. Skipping does not emit it. |
| `game_complete` | One final result for a run, solved/missed and probe count. Duplicate confirmations, reopening, and reload do not reemit. |
| `first_completion` | First completed non-tutorial case on this browser (official or practice), with the actual UTC completion date. A puzzle started yesterday and completed today activates today. |
| `share_intent` | First native-share or explicit-copy request for a completed run. Stored before calling the API, even if cancelled or denied. |
| `share_success` | First successful native-share resolution or clipboard write, persisted independently from intent. It is **not** proof of posting, reading, or a referred player. |
| `shared_link_start` | First meaningful real-game action after exactly `utm_source=player_share&utm_medium=result`. This validated category persists through tutorial/draft, then is consumed. The homepage does not promise an identical replay. |
| `return_d1`, `return_d7` | First qualifying non-tutorial `game_start` exactly 1 or 7 UTC dates after the first actual completion, once each locally. Only a locally measured activation after collection began qualifies. A new start is not merely reopening an old started run. |
| `support_click` | Click on the configured external link after a real result. Not a purchase or donation confirmation. Hidden with absent/invalid configuration. |

All calls are non-blocking; synchronous throws, rejected promises, offline operation, ad blocking, and unsupported plans do not affect gameplay. Markers are not backfilled/retried as historical events: a missing event is not proof of inactivity. Without locks a truly simultaneous conflicting result can also produce unreliable event delivery; results still count once locally by date. Treat remote delivery as best-effort, not an exact ledger.

## Allowed properties

Only `mode` (`daily`, `daily-practice`, `endless`), `outcome` (`solved`, `missed`), `probe_count` (0–5), `generator_version` (2), valid `daily_date`, `activation_cohort_date`, `result_completion_date`, boolean `within_24h_of_result`, and `source=player_share` pass the adapter. Date properties use ISO UTC calendar dates. Modes and outcomes are bounded literals. No local run ID, culprit, selected probe/answer, guess, full URL, arbitrary query, email, persistent player ID, or fingerprint passes. The SDK URL hook normalizes automatic page URLs to the canonical homepage. Hosting and analytics provider network/transport policies still apply.

## Funnel and cohort formulas

- **Observed time to first move:** first-time lobby usable → first successfully resolved tutorial or real probe. Browser Performance entry and development console only. Record externally during the 10-player observation. It is separate from production `game_start`; a zero-probe accusation activates a game but does not pretend to be a first probe.
- **Completion among starts:** completed qualifying non-tutorial runs / meaningful non-tutorial starts, with matching modes and stated observation/cohort boundaries. The 30-tester manual funnel can follow individual runs with consent. Aggregated remote start/completion event totals over a calendar window can be affected by in-flight runs and are not automatically a matched run cohort.
- **Activation cohort C:** actual first non-tutorial completion on UTC date C. Retention denominator is recorded `first_completion` events in that cohort, not pageviews, daily puzzle dates, starts, or tutorial completions.
- **D1:** recorded `return_d1` / recorded `first_completion`, matching mature activation cohorts. Observe all of C+1; evaluate at C+2 00:00 UTC.
- **D7:** recorded `return_d7` / recorded `first_completion`, matching mature activation cohorts. Observe all of C+7; evaluate at C+8 00:00 UTC. November 14 → November 22. Require ≥200 mature measured first completers before the ≥15% decision gate. State cohort dates, numerator and denominator. Otherwise inconclusive.
- **First share-intent rate:** first `share_intent` with `within_24h_of_result=true` / `game_complete`, grouped by the **same result completion-date cohorts**, with matching modes. A whole date cohort is mature at C+2 00:00 UTC. The boolean covers `0 ≤ intent_time − result_time < 24 hours`. A later share is still usable and may emit an event, but is excluded from this rate. Target ≥10% for mature matching cohorts. Do not divide all-time shares by today's completions.
- **Shared-link starts ratio:** `shared_link_start` / `game_complete` over an explicitly stated observation window and matching non-tutorial population. Target ≥5%. It is an aggregate ratio, not per-person referral conversion, invite conversion, K-factor, or proof of virality.

## Exclusions and limitations

Exclude internal tests, tutorial events, cohorts predating enabled collection, partial first collection dates, immature cohorts, and any cohort lacking a recorded activation denominator from retention gates. Do not treat pre-collection activity as zero retention. If one side of a result cohort is missing, do not report a share rate for it. For the switch-on date, wait for the first full UTC collection date before forming result cohorts, so earlier unmeasured completions cannot enter a measured numerator.

Device-local retention misses cross-device returners. Cleared/blocked storage can duplicate activation or lose deduplication. Blocked/failed analytics can lose either numerator or denominator; locally marked events are not proof of remote receipt. Aggregate Vercel dashboards may not support every cohort join or export required; verify capability before using decision gates. No paid analytics infrastructure is added to work around it. Use consenting manual observations when unavailable, and label them separately.

## Owner's 30-day gates

Chosen thresholds, not external benchmarks: 8/10 observed tutorial completions unaided; first meaningful probe under 30 seconds; 30 recruited real-case testers with ≥70% completion among starts; ≥200 mature measured first completers before using D7 ≥15%; mature matched-result first-share intent ≥10%; aggregate shared-link starts/completions ≥5%. No results for those experiments are claimed by automated tests.
