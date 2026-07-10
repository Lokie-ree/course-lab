# course-lab

Production module library for the 2026–2027 six-course room (Math Essentials → BRCC dual-enrollment college algebra). Interaction families: PTR (Predict-Test-Reconcile), Bind-and-Justify, Assume-Fit-Reflect — plus two multi-module remediation suites.

Founding document: [`docs/course-lab-founding-spec.md`](docs/course-lab-founding-spec.md) — why this repo exists, the architecture rulings, and the measurement-spine spec. If the repo drifts from those rulings, that document is the get-back reference.

**Stack boundary (hard rule):** plain JSX/SVG on React + Vite + Vitest only. `three`, `@react-three/*`, and `gsap` never appear in this `package.json` — spatial/R3F work lives in `creative-lab`. A Three.js dependency here means the boundary leaked: stop and review.

## Layout

- `src/modules/` — the module library (12 files, 29 pedagogical units; the two Remediation files are multi-module suites)
- `src/lib/telemetry.ts` — measurement spine: `LabEvent` schema, emitter, localStorage sink, CSV export (unwired until Session 2, per spec §4.7)
- `docs/` — founding spec + remediation design docs

## Commands

```
npm install
npm run dev      # Vite dev server + module picker
npm test         # Vitest (telemetry spine tests)
npm run build
```

Part of the Steel hub ecosystem (spoke #5).
