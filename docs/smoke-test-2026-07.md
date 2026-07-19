# Smoke test — Session 2 telemetry spine (2026-07)

New-doc justification (extend-don't-create): no existing doc records runtime verification results; the founding spec is a contract, not a log.

**Date:** 2026-07-18 · **Method:** scripted Playwright (Chromium headless shell r1228) against `npm run dev` (Vite, localhost:5173) — script asserted `localStorage["course-lab:events"]` after every UI action and parsed the downloaded CSV. **Plan:** steel `docs/superpowers/plans/PLAN-course-lab-smoke-verify.md`. **Result: PASS — zero defects.** 12 events total: `{round_enter: 6, check: 3, reveal_earned: 1, next: 1, complete: 1}`.

## §4.5 events × observed

| Event | quadratics-ptr (standalone) | algebra-remediation (suite, 3 internals entered) |
|---|---|---|
| `round_enter` | ✅ from StartGate dismissal, `guideState: predict` | ✅ mount → `algebra-remediation/interpreting-functions`; nav clicks → `…/systems-of-equations`, `…/seeing-structure` |
| `check` + result | ✅ commit → `match`; producer beat (`beatId: producer`) → `match` | ✅ module 1 verdict submit → `match` |
| `reset` | **0 observed — CORRECT** (post-reveal "start over" only; §4.5 documented zero) | 0 observed — correct |
| `reveal_earned` | ✅ at the discriminant reveal (commit-gated, 2026-07-09 ruling) | n/a this pass |
| `complete` | ✅ at "See what you built" | n/a this pass (internals entered, not completed) |
| `next` | ✅ at producer transition | n/a this pass |

Every event carried `studentCode`, `sessionId`, `moduleId`, `moduleVersion`, numeric `ts`. No `close` results anywhere (course-lab has no close tier). `sessionId` constant within each mount.

## StartGate

- `ZZZ99` refused with roster message; **zero events minted** after refusal; no code cached.
- ` test01 ` (whitespace + lowercase) admitted as `TEST01` — trim + case-insensitive confirmed.
- Second module in the same browser session: gate **is shown** on every mount (by design — spec §8: the Start click is the real dismissal handler / `round_enter` site) with the code **prefilled** from sessionStorage, so no re-typing. The plan's "should NOT re-prompt" holds in the sense that matters: no fresh code entry.

## Suite grain

- `moduleId` uses `<suite>/<internal>` for all internal events. `sessionId` constant across three internals within one suite mount; fresh `sessionId` per mount (standalone → suite → post-refresh re-entry all distinct).
- `moduleVersion` is sourced from each internal's own constant (plumbing verified), but **every internal is currently `"1.0.0"`** — the plan's "MODULE_VERSION differs per internal module" is unobservable as distinct values until a bump happens. Not a defect; noted for the first real version bump.

## CSV export

Header row exactly `studentCode,sessionId,moduleId,moduleVersion,roundId,guideState,beatId,action,result,ts`; **one row per event (12 = localStorage count)**; suite-internal moduleId form present; row 1 field-matches event 1.

## Parallel layer (§8 subsume trigger)

`useSessionReport` → SessionExport clipboard flow works after telemetry wiring (module 1 submitted → "Today's work" card → copy succeeds, export text contains the module content). The copy mints no telemetry events. Numbers agree: SessionExport reports 1 module attempted; telemetry shows 1 suite `check`. **No subsume trigger observed.**

## Edge cases

- Refresh mid-module: app returns to picker (per-mount state by design), cached code survives reload, re-entry mints a fresh `sessionId`. ✅
- Two modules, one browser session: no re-typing of code; fresh `sessionId` per mount. ✅

## Coverage notes (honest gaps, not defects)

- All `check` events took the correct-answer path; the `miss` branch of the result ternaries was not exercised (code path is a symmetric ternary at each emit site).
- Suite `complete`/`next`/`reveal_earned` not exercised (standalone covered them; suite pass targeted grain + entry per plan).
- Artifacts (script, event log JSON, CSV, recap screenshot) in the session scratchpad; not committed.
