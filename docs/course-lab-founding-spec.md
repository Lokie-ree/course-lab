# course-lab — Founding Spec

**Status:** Spec (red-team edits applied, awaiting final review) · **Author:** Randall + Claude · **Date:** 2026-07-06 · **Revised:** 2026-07-09
**Pipeline stage:** Spec → Plan → Review → Implement

This is the founding document for the `course-lab` spoke repo. It records why the repo exists, the architectural rulings that shaped it, and the spec for its first build: the measurement spine. If a future session finds this repo drifting from these rulings, this document is the get-back reference.

> **Repo name is a placeholder.** `course-lab` is used throughout; rename freely before `git init`, then find-and-replace here.

---

## 1. Why this repo exists

The 2026–2027 six-course room (Math Essentials → BRCC dual-enrollment college algebra) will be served by the PTR / Bind-and-Justify / Assume-Fit-Reflect module library — currently ten standalone modules plus two remediation suites — ~9,000 lines and 29 pedagogical units across 12 files (the ~2,750 figure sometimes quoted is the two suites alone) — living as **loose artifacts** with no git history, no home repo, no Steel visibility, and no import path for shared code.

This repo promotes those artifacts into governed infrastructure so that:

1. Enrolled students in August are served from versioned, tracked code — not loose files.
2. The **measurement spine** (telemetry) can be a shared import instead of pasted copies.
3. Steel can see, brief on, and drift-check the platform's largest module library.

## 2. Housing decision record

**Ruling: new spoke repo, registered with Steel.** Decided 2026-07-06.

- **Not `creative-lab-demos`** — that repo's identity is ISTE-facing demos. This library is production for enrolled students. Mislabeling production as demos corrupts every future Steel session brief.
- **Not `creative-lab`** — its conventions are R3F-shaped (Eurorack design system, scene patterns, WebGL lessons-learned). Housing non-R3F modules there either dilutes the conventions or forces false compliance.
- **New spoke** keeps the two rendering stacks separate at the repo boundary — the "rendering layer is deliberately plural" architecture made physical. Steel has an adoption path for a spoke, but it is not zero-touch: several hub surfaces hardcode the four-spoke count, and there is no session-end skill to "confirm" — the real work is the checklist below.

**Steel registration checklist (same session as `git init`):**

| Item | Hub target | Note |
|---|---|---|
| Local-paths row | `index.md` → **Local paths** table | Machine-read by `Get-SpokePaths`; the row auto-enrolls course-lab in drift-check and build-context. Add it **after** the migration push — a dirty mid-migration repo flips session-start briefings to UNVERIFIED |
| Project card | `projects/course-lab.md` | House convention is a project card (see `projects/creative-lab.md`), not a "status file" |
| Spoke-count updates | `index.md`, `projects/index.md`, `wiki/ecosystem-map.md`, `session-start` skill, `drift-check` skill | All five hardcode four spokes today |
| Housing ruling | `wiki/decisions.md` (append-only) | File does not exist yet — creating it requires the one-sentence gap statement per friction rule R4 |

## 3. Architecture: two rendering stacks, one contract

The platform is three layers. Only the bottom one varies.

| Layer | Contents | Shared? |
|---|---|---|
| **Pedagogy** | Interaction families (PTR, Bind-and-Justify, Assume-Fit-Reflect, Scope-to-Zero) and their state contracts: committed prediction → locked reveal → result → reconcile | Yes — renderer-agnostic |
| **Telemetry** | `LabEvent` schema + emitter with pluggable sink | Yes — zero-dependency, drops into both stacks unchanged |
| **Rendering** | R3F/GSAP (creative-lab: spatial intuition) · plain JSX/SVG (course-lab: graph-and-symbol work) | **No — plural by design** |

3D was the right tool for rigid motions; it was never the point. A discriminant explorer does not need a WebGL context. PTR expressing cleanly in both stacks is the proof that the engine is the interaction contract, not the renderer.

**Stack boundary rule (hard):** `course-lab`'s `package.json` never contains `three`, `@react-three/fiber`, `@react-three/drei`, or `gsap`. React + Vite + test runner only. A Three.js dependency appearing in this repo means the boundary has leaked — stop and review.

## 4. Measurement spine — spec

### 4.1 Purpose

Answer one question per student per module interaction: **which version of which module did this student see, and what happened?** This is the layer that turns shipped modules into evidence — SLT/LEAP correlation, peer-conversation proof, ISTE Seal support.

### 4.2 Event schema

One shape, module-agnostic, both stacks:

```typescript
interface LabEvent {
  studentCode: string;      // opaque code, entered once per session — roster mapping lives offline with Randall
  sessionId: string;        // crypto.randomUUID() per module mount
  moduleId: string;         // e.g. 'quadratics-ptr', 'rigid-motions'; suite-internal modules: '<suite>/<module>' (e.g. 'algebra-remediation/functions')
  moduleVersion: string;    // MODULE_VERSION constant — to be added everywhere; top-of-file for single-file course-lab artifacts, constants file for creative-lab (dilations keeps its at utils/)
  roundId: string;          // creative-lab: existing round / capstone ids; course-lab PTR: fixed scenario id (single-scenario modules) — per-module mapping decided at wiring
  guideState: string;       // M1: guideState values as-is; M2/M3: '<phase>/<roundState>'; course-lab: phase/stage values as-is
  beatId?: string;          // optional finer grain where one roundId spans several attempts (dilations aa-discover / capstone-final; M1 beat = guideState × successCount)
  action: 'round_enter' | 'check' | 'next' | 'reset' | 'reveal_earned' | 'complete';
  result?: 'match' | 'close' | 'miss';   // 'check' only; normalized: exact/correct/true → match, incorrect/false → miss (M3 and course-lab have no close tier)
  ts: number;               // Date.now()
}
```

The **schema is the durable asset**. Sinks are disposable plugs.

### 4.3 Emitter + sink interface

`src/lib/telemetry.ts` — pure TypeScript, **no React imports** (trivially testable, per colocated-tests convention):

```typescript
interface TelemetrySink {
  write(event: LabEvent): void;
  flush(): LabEvent[];       // returns and clears buffered events
  exportCsv(): string;       // teacher-triggered export
}

function createEmitter(sink: TelemetrySink, context: SessionContext): (partial: PartialEvent) => void;
```

`SessionContext` carries the per-mount constants (`studentCode`, `sessionId`, `moduleId`, `moduleVersion`); everything per-interaction (`roundId`, `guideState`, `beatId`, `action`, `result`) rides in `PartialEvent`, stamped inside the handler where it is in scope.

**Phase 1 sink: `localStorage`.** Thin summer attendance = small n. No backend, no endpoint, no dashboard until the six-course room's real volume forces it (August at the earliest, and only if localStorage + CSV export actually hurts).

### 4.4 Emission rule (non-negotiable)

**Events are emitted at the action-handler boundary — never derived from renders, never in effects.** This is Lesson #10 from M1 (React 18 batching) promoted to a spine-wide principle. M1's pre-reducer hook shape and M2/M3's `useReducer` convention both satisfy it, but the "five one-line `emit()` calls in named handlers" picture is M1-specific: M1 has the named handlers verbatim (`handleCheck`, `handleNext`, `handleReset`, `handleCheckSequence`, completion); M3 has **no reset action in its reducer** — a `reset` emit has no call site there and its count is honestly zero; M2's round-entry CONTINUE is an inline dispatch that must be promoted to a named handler before it can emit; and the course-lab artifacts have **no named handlers at all** — instrumenting them means creating the handler layer from inline transitions, not adding lines to existing ones. No retrofit of M1's state shape required or permitted.

### 4.5 What gets instrumented

| Event | Pedagogical meaning |
|---|---|
| `round_enter` | Anchors time-before-commit. Emitted from M2/M3's existing round-entry CONTINUE gates and, for modules live at mount (M1, all course-lab), from the `studentCode`-prompt dismissal handler. Without it, round-1 time is unmeasurable everywhere and M2/M3 `next` timestamps intro-reading pauses, not round entry |
| `check` + result | The committed bet and its outcome — the heart of PTR. In dilations ghost rounds the committed bet is the ghost **drop** (`COMMIT_PREDICTION`), not the CHECK-shaped button (which is REVEAL) — wire `check` to the drop |
| `reset` | Struggle signal (four resets before a match is information) — meaningful only for mid-round resets (M1, M2). M3 has no reset action; course-lab resets are post-reveal "start over" — structurally zero there |
| `reveal_earned` | The earned-reveal moment — first match on a beat, in **match-gated** modules. Commit-gated reveals (all course-lab per the no-wall principle; dilations rounds where REVEAL is offered after a miss) either emit at the reveal moment or are excluded from misses-before-reveal analysis — decide per module at wiring |
| `complete` | Module/capstone completion |
| `next` | Progression pacing |

**Explicitly not instrumented:** drag/pointer telemetry. It is a firehose that feels rigorous and answers no current question. See NOT DOING.

### 4.6 Versioning

- Each module gets a `MODULE_VERSION` string constant in its constants file.
- Bump on any **pedagogically meaningful** change (copy that changes meaning, scoring, round content, flow). Do not bump for styling or refactors.
- `roundId`s are **append-only**: changed round content gets a new id; ids are never reused or re-parameterized. (Round ids are parameter-coupled literals like `translate-5-3` — silently changing what an id means breaks round-level cross-version joins.)
- LEAP/SLT join happens **offline** from Randall's roster. The app never stores a real name. Privacy surface ≈ zero.

### 4.7 Estimated scope

- `src/lib/telemetry.ts` (~60 lines incl. localStorage sink + CSV export) + colocated tests
- `MODULE_VERSION` constant per file (12); the suite-internal grain (29 pedagogical units — the suites contain 11 + 8 internal modules) is decided at the §8 schema gate
- `emit()` call sites: ~5 per creative-lab-style module, but ~95–145 across the fleet at internal-module grain — and every course-lab site needs a named handler created first
- `studentCode` prompt at module entry (once per session)
- Ruling on the suites' existing `useSessionReport` → `SessionExport` clipboard reporting layer: subsumed by the spine or run in parallel — decide before wiring, not implicitly

**Two sessions, explicitly split.** Session 1 = migration (§5; `telemetry.ts` lands **unwired**). Session 2 = emit wiring + `studentCode` UX, gated on §8. If either grows past its session, something is being renovated that should only be moved — stop.

## 5. Migration: move and version, not renovate

Promotion scope for the loose artifacts, timeboxed to **one session**:

1. `git init` on feature-branch discipline (never commit to `main` — inherited hard rule)
2. Minimal Vite scaffold — `package.json`, `index.html`, entry, bare module picker. No app shell exists today; the artifacts import only `react` and export default, so this is small, but it is a real step, not a given
3. Artifacts in, organized minimally (do not restructure into feature folders)
4. `MODULE_VERSION` constant added per file (12 — suite-internal grain waits for the §8 ruling)
5. `telemetry.ts` in `src/lib`, **unwired** (wiring is Session 2, per §4.7)
6. Push
7. Steel registration checklist (§2) — the Local-paths row goes in **after** the push so drift-check never sees a dirty mid-migration repo

**Not in scope:** TypeScript conversion, test backfill for working modules, design-system unification, folder restructuring. Tests are written for the **emitter** (new code); existing modules earn tests when next touched for a real reason. Backfilling tests for ten working modules nobody is changing is archaeology cosplaying as rigor.

## 6. NOT DOING (active list, with triggers)

| Item | Why not now | Trigger to revisit |
|---|---|---|
| Headless `usePTR` core shared across stacks | Rewrite of ~9,000 working lines before August converts zero student outcomes and risks all of them | Building a **new** module for the six-course room and copy-pasting PTR state logic for the Nth time — extract then, informed by working implementations |
| Backend sink (Supabase / serverless endpoint) | Small n; schema is the asset, sink is a plug | localStorage + CSV export measurably hurting under real six-course volume |
| Drag/pointer telemetry | Firehose; no current question it answers | A specific pedagogical question that requires it, written down first |
| Analytics dashboard | Same energy as the backend, plus UI | Real data exists AND a recurring manual analysis is eating sessions |
| Test backfill for migrated modules | Working code, unchanged | Next real modification to that module |
| Monorepo unification | Standing ruling from creative-lab: discipline instead | Post-deadline, explicit decision session |
| TypeScript conversion of JSX artifacts | Renovation during migration | Module-by-module, when next touched |

## 7. Open items referenced (not owned) by this spec

Tracked elsewhere; listed so they stop living in conversation memory only:

- Six-course **family-coverage mapping** (which interaction families cover which of the six courses) — design session, zero code, before August
- creative-lab closeout list: stale "Known drift" block in conventions skill, triangle ruling → `wiki/decisions.md` (file created by the §2 checklist), orphaned `scene/math.ts`, sprint-log duplicate rows, "decided-by-default" convention sync to Steel, sibling-skill repointing

## 8. Review gates

Before implementation:
- [ ] Repo name decided
- [ ] Event schema reviewed — any field missing that the SLT correlation will need? (Adding fields later to localStorage data is cheap; better now)
- [ ] Suite grain ruled: `moduleId` and `MODULE_VERSION` at `<suite>/<internal-module>` grain, or explicit acceptance of suite-level-only (suite-level defeats the LEAP-join resolution §4.1 wants — the suites' internal modules are grouped by LEAP reporting category)
- [ ] `studentCode` entry UX decided (prompt on mount vs. URL param vs. teacher-set) — include validation: free-typed codes mean a typo mints a phantom student (roster code list or checksum)
- [ ] `useSessionReport` / `SessionExport` ruling made (§4.7): subsumed by the spine or parallel
- [ ] Confirm CSV export shape against how Randall will actually do the LEAP join

---

*Founding principle, for the record: the spine multiplies what is already built; surfaces merely add. Spine before surfaces.*