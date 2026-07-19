# Family coverage — 2026–27 six-course room

**Status:** scaffold, awaiting Randall's judgment cells · **Date:** 2026-07-19
**Source:** `src/modules/` inventory at commit 361dfd9 · founding spec §7 item 1

> **REQUIRED INPUT:** two course columns are placeholders (`COURSE-5 ☐`, `COURSE-6 ☐`). Confirmed 2026-07-19: **Algebra II (EdgeEx)** and **Algebra III (EdgeEx)** are the two main preps (see steel `wiki/edge-ex-courses.md`); Math Essentials and BRCC College Algebra are the recorded endpoints. Randall: name the remaining two (a Geometry-bearing course would claim the geometry-remediation rows).

## 1. Unit inventory (29 units)

| # | moduleId | File | Family | Standards cited |
|---|----------|------|--------|-----------------|
| 1 | `quadratics-ptr` | QuadraticsPTR.jsx | PTR | A-REI.B.4 |
| 2 | `systems-ptr` | SystemsPTR.jsx | PTR | — (none cited; linear rate-vs-start bet) |
| 3 | `key-features-ptr` | KeyFeaturesPTR.jsx | PTR | F-IF.B.4 |
| 4 | `equivalent-forms-ptr` | EquivalentFormsPTR.jsx | PTR | A-SSE.B.3, F-IF.C.8a |
| 5 | `intersections-ptr` | IntersectionsPTR.jsx | PTR | A-REI.D.11 |
| 6 | `linear-exponential-ptr` | LinearExponentialPTR.jsx | PTR | F-LE.A.2, F-LE.A.3 |
| 7 | `geometry-coordinate-ptr` | GeometryCoordinatePTR.jsx | PTR | LEAP.II.GM.1 |
| 8 | `predict-test-reconcile` | PredictTestReconcile.jsx | PTR | — (none cited; rate-vs-start bet) |
| 9 | `bind-the-parts` | BindTheParts.jsx | Bind-and-Justify | A-REI.B.3, A-SSE.A.1 |
| 10 | `assume-fit-reflect` | AssumeFitReflect.jsx | Assume-Fit-Reflect | HSS-ID.A.3, HSS-ID.B.6, HSS-ID.C.7 |
| 11 | `algebra-remediation/interpreting-functions` | AlgebraRemediation.jsx | Remediation suite | F-IF (F-IF.A.2, F-IF.B.4) |
| 12 | `algebra-remediation/systems-of-equations` | AlgebraRemediation.jsx | Remediation suite | A-REI systems (A-REI.C.6, A-REI.D.10) |
| 13 | `algebra-remediation/seeing-structure` | AlgebraRemediation.jsx | Remediation suite | A-SSE |
| 14 | `algebra-remediation/solving-modeling` | AlgebraRemediation.jsx | Remediation suite | A-REI.B / A-CED |
| 15 | `algebra-remediation/real-number-system` | AlgebraRemediation.jsx | Remediation suite | N-RN |
| 16 | `algebra-remediation/quantities-units` | AlgebraRemediation.jsx | Remediation suite | N-Q |
| 17 | `algebra-remediation/polynomials` | AlgebraRemediation.jsx | Remediation suite | A-APR |
| 18 | `algebra-remediation/creating-equations` | AlgebraRemediation.jsx | Remediation suite | A-CED |
| 19 | `algebra-remediation/building-functions` | AlgebraRemediation.jsx | Remediation suite | F-BF |
| 20 | `algebra-remediation/linear-quad-exp-models` | AlgebraRemediation.jsx | Remediation suite | F-LE |
| 21 | `algebra-remediation/interpreting-data` | AlgebraRemediation.jsx | Remediation suite | S-ID |
| 22 | `geometry-remediation/coordinate-reasoning` | GeometryRemediation.jsx | Remediation suite | G-GPE (LEAP.II.GM.1) |
| 23 | `geometry-remediation/right-triangle-trig` | GeometryRemediation.jsx | Remediation suite | G-SRT.C (G-SRT.C.8) |
| 24 | `geometry-remediation/congruence` | GeometryRemediation.jsx | Remediation suite | G-CO |
| 25 | `geometry-remediation/similarity-transformations` | GeometryRemediation.jsx | Remediation suite | G-SRT.A/B |
| 26 | `geometry-remediation/circles` | GeometryRemediation.jsx | Remediation suite | G-C |
| 27 | `geometry-remediation/volume-micro-model` | GeometryRemediation.jsx | Remediation suite | G-GMD |
| 28 | `geometry-remediation/modeling-with-geometry` | GeometryRemediation.jsx | Remediation suite | G-MG |
| 29 | `geometry-remediation/conditional-probability` | GeometryRemediation.jsx | Remediation suite | S-CP |

## 2. Coverage grid

Cells: ✔ (fits as-is) · ~ (fits with adaptation) · blank (no fit) · ☐ (Randall to judge). Pre-filled only where the cited standards map unambiguously onto a confirmed course's unit map (EdgeEx unit maps in steel `wiki/edge-ex-courses.md`); everything else is ☐.

| moduleId | Math Essentials | Algebra II (EdgeEx) | Algebra III (EdgeEx) | COURSE-5 ☐ | COURSE-6 ☐ | BRCC College Algebra |
|----------|----------------|---------------------|----------------------|-----------|-----------|----------------------|
| `quadratics-ptr` | ☐ | ✔ (U2 quadratic formula/discriminant) | ✔ (U2 quadratics) | ☐ | ☐ | ~ |
| `systems-ptr` | ☐ | ~ (U1 linear systems) | ~ (U1 systems) | ☐ | ☐ | ~ |
| `key-features-ptr` | ☐ | ✔ (U1/U2 function analysis) | ✔ (U3 analyzing graphs) | ☐ | ☐ | ~ |
| `equivalent-forms-ptr` | ☐ | ✔ (U2 quadratic forms) | ✔ (U4 standard/factored form) | ☐ | ☐ | ~ |
| `intersections-ptr` | ☐ | ~ (U2 mixed-degree systems) | ~ | ☐ | ☐ | ☐ |
| `linear-exponential-ptr` | ☐ | ~ (U7 exponential modeling) | ~ (U7 models) | ☐ | ☐ | ~ |
| `geometry-coordinate-ptr` | ☐ | ☐ | ~ (GM codes appear in AIII) | ☐ | ☐ | |
| `predict-test-reconcile` | ☐ | ~ (rate-vs-start, U1) | ~ (U3 comparing functions) | ☐ | ☐ | ☐ |
| `bind-the-parts` | ✔ (foundational A-REI.B.3) | ☐ | ~ (U1 multistep equations) | ☐ | ☐ | ☐ |
| `assume-fit-reflect` | ☐ | ✔ (U9 statistics) | ☐ | ☐ | ☐ | ☐ |
| `algebra-remediation/interpreting-functions` | ✔ | ~ | ~ (review course) | ☐ | ☐ | ☐ |
| `algebra-remediation/systems-of-equations` | ✔ | ~ | ~ | ☐ | ☐ | ☐ |
| `algebra-remediation/seeing-structure` | ✔ | ~ | ~ | ☐ | ☐ | ☐ |
| `algebra-remediation/solving-modeling` | ✔ | ~ | ~ | ☐ | ☐ | ☐ |
| `algebra-remediation/real-number-system` | ✔ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `algebra-remediation/quantities-units` | ✔ | ~ (U1 dimensional analysis) | ☐ | ☐ | ☐ | ☐ |
| `algebra-remediation/polynomials` | ✔ | ~ (U3) | ~ (U5) | ☐ | ☐ | ☐ |
| `algebra-remediation/creating-equations` | ✔ | ~ | ~ | ☐ | ☐ | ☐ |
| `algebra-remediation/building-functions` | ✔ | ~ (U2/U10 transformations) | ~ (U4 transformations) | ☐ | ☐ | ☐ |
| `algebra-remediation/linear-quad-exp-models` | ✔ | ~ (U7) | ~ (U7/U8) | ☐ | ☐ | ☐ |
| `algebra-remediation/interpreting-data` | ✔ | ~ (U9) | ☐ | ☐ | ☐ | ☐ |
| `geometry-remediation/coordinate-reasoning` | ☐ | ☐ | ☐ | ☐ | ☐ | |
| `geometry-remediation/right-triangle-trig` | ☐ | ~ (U10 intro trig) | ☐ | ☐ | ☐ | |
| `geometry-remediation/congruence` | ☐ | | ☐ | ☐ | ☐ | |
| `geometry-remediation/similarity-transformations` | ☐ | | ☐ | ☐ | ☐ | |
| `geometry-remediation/circles` | ☐ | | ☐ | ☐ | ☐ | |
| `geometry-remediation/volume-micro-model` | ☐ | | ☐ | ☐ | ☐ | |
| `geometry-remediation/modeling-with-geometry` | ☐ | | ☐ | ☐ | ☐ | |
| `geometry-remediation/conditional-probability` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## 3. Gaps and build/adapt/skip decisions

One row per course whose column has no ✔ (plus named content gaps inside covered courses):

| Course | Gap description | Build new / adapt existing / skip (☐ Randall) | Lead time note |
|--------|-----------------|----------------------------------------------|----------------|
| BRCC College Algebra | No ✔ anywhere — only ~ cells (algebra PTR modules fit the topics but dual-enrollment rigor/format unjudged) | ☐ | Dual-enrollment syllabus needed before judging; decide before the BRCC term start |
| COURSE-5 ☐ | Course unnamed — column empty | ☐ (name the course first) | If it's Geometry-bearing, the 8 geometry-remediation rows claim it immediately |
| COURSE-6 ☐ | Course unnamed — column empty | ☐ (name the course first) | Same |
| Algebra II (EdgeEx) — content gaps | The genuinely-new AII strands have **zero** module coverage: complex numbers (U2), sequences & series (U8), trig/unit circle (U10) | ☐ build candidates; note `F-BF.B.3` transformation explorer (steel `initiatives/edgeex-build-family.md`) covers the U2/U4 transformation lessons cited in ~10 lessons across both courses | Highest-leverage builds; August start means U2 (quadratics/complex) hits first, U8/U10 are spring |
| Algebra III (EdgeEx) — content gaps | Difference quotient (U3), regression/logistic models (U7), inverses with domain restriction (U6) uncovered | ☐ | AIII is review-heavy; existing ~ cells may carry most of the year |
| Math Essentials — note | Covered (11 ✔ from the algebra suite + bind-the-parts) but geometry-remediation's home depends on COURSE-5/6 naming | — | — |

## 4. Method note

Inventory extracted from `src/modules/` at commit 361dfd9: standards codes via `grep -oE "\b[A-Z]+-[A-Z]{2,3}\.[A-Z]\.[0-9]+[a-z]?\b|\bLEAP\.[IVX]+\.[A-Z]+\.[0-9]+\b" src/modules/*.jsx`; suite internals from the `MODULES` arrays inside the two Remediation files (11 algebra + 8 geometry slugs, each with a `cluster` field used as the standards signal where file-level codes are absent). Units ≠ files ≠ rounds: 12 files → 29 units; multiple roundIds inside one unit stay one row.

Marks: **✔** fits as-is (pre-filled only where a cited standard names a topic that appears verbatim in the course's unit map — EdgeEx maps from steel `wiki/edge-ex-courses.md`; Math Essentials ✔s are the remediation suite's design target). **~** fits with adaptation (topic match, format/level unjudged). **blank** no plausible fit. **☐** awaiting Randall.

This doc is **append-updated** as decisions land — do not fork a v2. creative-lab modules are out of this grid by ruling; "adapt a creative-lab module" is a legal §3 decision option only.
