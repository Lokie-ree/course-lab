# Geometry Summer Remediation — Prototype & Design Document
 
*A reasoning-first remediation approach for high school students who scored Unsatisfactory on the LEAP 2025 Geometry assessment and are retesting. Companion to the Algebra I design document; shares its architecture and its source-document method. This is a standalone build, sitting alongside the Algebra prototype — not an extension of any existing codebase.*
 
---
 
## What this document is, and what it is for
 
This is the design for a Geometry remediation prototype intended for **real use with students this summer**, to validate the approach through actual usage and feedback. That purpose drives every scope decision below.
 
It is deliberately *not* a plan for a complete four-module Geometry course. The full four-module scope is captured as a **roadmap** (see "The full scope, as roadmap"), but the **committed build is two modules** — one deep, one rough — chosen to answer the two questions that matter for Geometry and that the Algebra prototypes could not. Everything else is explicitly deferred until students answer those questions.
 
The guiding principle, stated once so the rest of the document can lean on it: **build the smallest thing that produces a real signal about whether this approach works for Geometry retesters.** Not the most complete thing, not the most elegant engine — the fastest honest signal.
 
---
 
## The problem we set out to solve
 
Same problem as the Algebra I design, restated for Geometry. Most LEAP test-prep is multiple choice, fails to exercise Type II (reasoning) and Type III (modeling) tasks, and loses the attention of the very students retesting after an Unsatisfactory score.
 
The design goal is unchanged: interactive modules where **students show real mathematical reasoning without multiple choice**, that **stay engaging for a reluctant retester**, and that **map directly to how the LEAP actually assesses and scores.** The first audience is the student.
 
---
 
## What the Geometry LEAP documents told us
 
We worked from the actual Louisiana source documents: the Geometry Achievement Level Descriptors (ALDs, November 2024) and the LEAP 2025 Assessment Guide for Geometry (July 2025), including its evidence statements (Appendix A), the two released constructed-response sample items, and their published rubrics (Appendix B).
 
### The rubric split is identical to Algebra — and it is still the load-bearing finding
 
**Every constructed-response task scores reasoning (or modeling) separately from computation.** Geometry confirms this on its own released items:
 
- The **Type II** rubric (the coordinate-parallelogram item, LEAP.II.GM.1) awards **2 points to a reasoning component** — determining the figure is a parallelogram *and* giving a valid explanation that opposite sides are parallel (equal slopes) or equal in length — and **1 point to a computation component**: correctly computing the slopes or lengths. A student can compute every slope correctly and still earn one of three points if they never explain *why* equal slopes settle it.
- The **Type III** rubric (the aquarium volume item, LEAP.III.GM.1) splits every part into a **modeling component** (correct setup and work) and a **computation component** (the number): Part A 2 pts, Part B 3 pts, Part C 1 pt.
This validates the same core architecture as the Algebra work: **build the math, then explain what it means and why it's true.**
 
### The reasoning gap climbs the same way — in geometric verbs
 
- **Similarity (G-SRT.A.2, B.5)** — identify (image provided) → determine relationships and solve → prove using criteria.
- **Congruence (LEAP.I.GM.1)** — reason about relationships → prove statements with given theorems → determine which theorem applies.
- **Trigonometry (G-SRT.C.6–8)** — find an unknown side with the ratio in hand → solve right triangles *in applied problems*; LEAP.III.GM.3 explicitly allows tasks that do **not** cue the method.
- **Expressing Mathematical Reasoning** — incomplete response → logical-but-incomplete chain → logical progression *with justification* → critiquing others' validity. LEAP.II.GM.3 docks credit for nonsense chains like `1 + 4 = 5 + 7 = 12` *even when the answer is correct.* Validity of the chain is the scored object.
### The micro-model is here too — and named explicitly
 
**LEAP.III.GM.4** is titled **"Micro-models"** verbatim: *autonomously apply a technique from pure mathematics to a real-world situation in which the technique yields valuable results even though it is obviously not applicable in a strict mathematical sense.* Its footnote gives the canonical example — three buildings forming a *nearly-but-not-quite* right triangle, approximated as right for a good, defensible result. Same summit skill as the Algebra candle task.
 
### A Geometry-specific gift: the coordinate plane is Major Content, not decoration
 
In the Algebra prototypes, the live graph risked *revealing the answer*. In Geometry, the coordinate plane is itself the assessed object — **LEAP.II.GM.1 is "geometric reasoning in a coordinate setting,"** and the released Type II item is a coordinate proof. Constructing the coordinate argument *is* the task, so there is no answer to leak.
 
---
 
## The core design pattern: judge → producer
 
Every module is built from one repeatable unit with two stages, exactly as in the Algebra design:
 
1. **Judge stage ("you're the coach").** The student critiques someone else's work — a claim or worked solution containing a specific, common misconception. They manipulate something (a draggable vertex, an angle, a slider) to discover the issue, then write a justified verdict. The engaging hook *and* a disguised diagnostic.
2. **Producer stage ("build it").** The student builds the mathematical object themselves, interprets what its parts mean, and justifies an answer. The transfer skill — the closest analog to a Type II/III item on test day.
### Discovery-first, in the spirit of a proven pattern
 
A discovery-first pedagogy — manipulate first, predict, earn the insight rather than be handed it; "getting closer," never "incorrect" for the student's *own* work — has been shipped and validated repeatedly elsewhere. This build follows that spirit. The one place judge→producer extends it: there *is* a wrong worked solution on screen in the judge stage, but **the wrongness lives in the character, never in the student.** The learner evaluates Coach's (or a peer's) claim; they are never told their own input is wrong. Catching the error *is* the prediction. The warm redirect ("check the angles, then the sides — what actually stayed the same?") names the misconception without marking the student wrong.
 
### What summer validation removes from the spine
 
The Algebra design's spine included a **teacher view** and a **misconception flag** feeding **routing** — and routing was the thing that "makes it a product." For this summer's validation, **all three are out of scope, deliberately:**
 
- **You are the instrument.** Validation runs on *your own observation and notes* while students use the tool — not on in-app capture, keyword grading, or a teacher dashboard. In a mix of self-serve and in-room use, when you are present you are the error-recovery layer, the redirect, and the misconception-namer.
- **No misconception-flag emission, no routing, no teacher map in v1.** These exist to scale you *out* of the room later. Before the modules themselves are proven for Geometry, they are premature. Building them now would spend the scarce build budget on the product layer before validating the product.
- This inverts the Algebra doc's emphasis: there, routing was the headline. Here it is explicitly parked. The summer build is **the modules without the product layer** — which is exactly the "validate the modules before the product" sequencing both prior documents recommended.
### Shared components actually built for the summer
 
- **Coach** — consistent character, direct real-talk voice, redirects rather than marks wrong.
- **Live visual** — the math made visible and responsive (a coordinate plane with draggable vertices in M2; an angle-driven right triangle in M3).
- **Reasoning recap** — the student's scattered written answers assembled into one coherent argument (claim, construction, meaning, proof) at the module's end. This is the earned reveal, repointed at the student's own words.
That is the whole shell. No dashboard, no analytics, no routing.
 
---
 
## A note on Visual Specs (read before any module section)
 
This is a greenfield build, so every camera/frustum/world-unit decision is being made from scratch — which is precisely the decision class that is most expensive to get wrong (the documented scar from prior work: camera-iteration and ghost-regression burned whole sessions). The remedy is non-negotiable here: **spec before first pixel, not after the first wrong render.**
 
Each committed-build module below opens with its **camera decision and a Visual Spec stub** — container fill, camera/frustum/world-units, grid/axis bounds, z-layer map — *before* pedagogy. The stubs are not final specs; they pin the decisions where ghost-regressions are born so the full spec starts from a settled coordinate contract. Priority order for spec attention, hardest-won first: **camera/frustum/world-units, then geometry/mesh robustness, then state modeling, then animation orchestration.**
 
---
 
## The committed build: two modules
 
The two modules are chosen to answer the two Geometry-specific unknowns the Algebra work could not — one each.
 
| Build | Module | Cluster (evidence stmt) | The unknown it tests | Depth |
|---|---|---|---|---|
| 1 | **Coordinate Reasoning** | LEAP.II.GM.1 (G-GPE.B) | Does judge→producer survive the jump to *geometric proof* (not algebraic manipulation)? | **Deep / usable** |
| 2 | **Right-Triangle Trig** | G-SRT.C.8 / LEAP.III.GM.3 | Does reasoning survive with *no handed-over diagram* — or do retesters freeze? | **Rough / probe** |
 
Why these two and not the other two, for *validation specifically*:
 
- **M2 is the sharpest transfer test** — it is a verbatim released Type II item, the lightest build, and pure geometric justification ("prove it's a parallelogram; catch the proof that checked only one pair"). If the pattern transfers, M2 shows it cleanly.
- **M3 is the only test of the riskiest assumption** — removing the diagram. No prior work has tested it. It is built *rough* on purpose: it is a probe, not a polished module, and a "mix of both" setting means you can watch it closely in-room rather than needing it to survive a student alone.
- **M1 and M4 are lower information-per-build-hour for validation.** M1's similarity reasoning is close enough to Algebra's "say what the parts mean" that it tests transfer *less* sharply than M2's coordinate proof. M4's 3-D build cost is high for a question (does the micro-model land) you cannot even reach until the basic spine is proven for Geometry. Both are in the roadmap; neither earns a summer build slot.
---
 
### Build 1 — Coordinate Reasoning *(deep; the released Type II item)*
 
**Camera decision: 2D coordinate plane — and the real trap is a *parametric* frustum, not a fixed one.** The released item uses **variable coordinates**: P(a, b), S(a + c, b), T(c, 0), O(0, 0). The camera cannot be tuned to one figure; it must frame a *family* of figures as a, b, c vary, or the parallelogram drifts off-screen the instant a value changes — a textbook ghost-regression. This is the single hardest spec line in the module, and it is camera, not pedagogy.
 
**Visual Spec stub:**
- *Container fill:* full visualization area; responsive down to the smallest target viewport.
- *Camera / world:* orthographic; **world-unit range defined as a function of (a, b, c) with auto-fit padding**, not fixed bounds. Specify the padding ratio and the recompute trigger (on parameter change, debounced).
- *Grid / bounds:* axes always visible; grid spacing adapts to the parametric range.
- *Z-layer map:* grid < segments < slope labels < vertex labels.
- *Hardest-won detail:* in-scene vertex coordinate labels and prime labels (A′/B′/C′) must size without clipping at the smallest viewport — get this right at spec time, not by iteration.
**The misconception, precisely.** Insufficient-condition reasoning: a student checks that *one* pair of opposite sides is parallel and concludes "parallelogram." But one pair parallel is a *trapezoid*; a parallelogram needs *both* pairs (or both pairs equal, or one pair both parallel and equal). The geometric twin of the Algebra Systems error — procedurally active (a slope was computed correctly), conceptually incomplete. LEAP.II.GM.3's nonsense-chain rule means sufficiency and validity of the argument is the scored object.
 
**Judge stage.** Show a worked response: "Side OT has slope 0. Side PS has slope 0. They're parallel, so it's a parallelogram." The student must catch that this tested only *one* pair — OP and TS were never checked. The highlight tool lets them verify the second pair must also hold. Redirect: *"OT ∥ PS — good. But a trapezoid has one pair parallel too. What haven't they checked?"* **Target misconception: stopping at a sufficient-looking but incomplete condition.**
 
**Producer stage.** The literal released item: prove P(a, b), S(a + c, b), T(c, 0), O(0, 0) is a parallelogram by showing *both* pairs of opposite sides have equal slope (or equal length via the distance formula — the rubric accepts either). The figure draws live with computed slopes labeled. The **variable coordinates are a deliberate step up in abstraction** from clean integers — and they close the Algebra suite's explicit "numbers are clean on purpose" limitation. This is where reasoning that *generalizes* gets exercised.
 
**Rubric mapping.** Direct — it is the released rubric: 2 reasoning points (determination + valid parallel/equal-length explanation), 1 computation point (correct slopes or lengths).
 
**What "deep / usable" means here.** Polished enough that a student can work through judge → producer → recap unaided in a mix of settings, with Coach's redirects handling the common wrong turns. This is the module that has to stand on its own, because it is the one carrying the transfer question.
 
---
 
### Build 2 — Right-Triangle Trigonometry *(rough; the risky-assumption probe)*
 
**Camera decision: one orthographic triangle. No perspective camera, no 3-D context shot.** The reasoning surface is a planar right triangle. An applied establishing shot (ladder, line-of-sight) is the only thing that tempts a perspective camera — and stacking a second camera with a different projection, for decoration, onto the module that is *already* the riskiest assumption is a bad bet given that camera work is the most expensive failure mode on record. One projection. If the no-diagram assumption validates, an establishing shot can return later as polish.
 
**Visual Spec stub:**
- *Container fill:* HUD-style layout, instrument feel.
- *Camera / world:* single orthographic camera on the right triangle; angle θ drives the figure.
- *Grid / bounds:* triangle scales to fill without clipping the right-angle marker or side labels.
- *Z-layer map:* triangle < side highlights < ratio cards < angle readout.
**The misconception, precisely.** Ratio selection. Knowing the two legs and needing an angle, the student reaches for sine (memorized first) instead of tangent (the ratio relating the two legs). The ALD climb is computation → application; LEAP.III.GM.3 says tasks may not cue the method. The assessed skill is *deciding which ratio*, not executing it. This is the module where the scaffold — the handed-over labeled diagram — is removed, paralleling the Algebra "no-graph" Expressions module.
 
**Judge stage.** Someone solves "a ramp rises 3 ft over a 4 ft horizontal run; find the angle" by writing `sin θ = 3/4`. The student must catch that 3 and 4 are the two *legs* (opposite and adjacent), so the correct ratio is `tan θ = 3/4` — sine needs the hypotenuse, which wasn't given. θ is draggable; ratio cards show live which two sides each ratio relates. Redirect: *"3 is opposite, 4 is along the ground — is 4 the hypotenuse? Which ratio uses the two legs?"* **Target misconception: defaulting to sine; using a hypotenuse ratio when only the two legs are known.**
 
**Producer stage — where the risk lives.** A word-problem-only context (ladder, line of sight) with *no pre-labeled diagram*. The student (a) assigns opposite/adjacent/hypotenuse, (b) *chooses* the ratio, (c) solves, (d) interprets in context. **The open question, parallel to "does Expressions reasoning survive without a graph": does ratio-selection reasoning survive without a handed-over labeled triangle?**
 
**What "rough / probe" means here.** This module does not need to be self-serve-robust. It needs to be *good enough to watch a student attempt the no-diagram producer stage in-room* and learn whether they can self-label or freeze. The signal is the deliverable, not the polish. Built second, and deliberately lighter than M2 — its job is to answer one question, and your in-room presence covers its rough edges.
 
**Sequencing note.** Even though M3 tests the riskier assumption, M2 is built *first* — so the judge→producer spine is proven to transfer to Geometry *before* M3 puts its weight on it. That way, if M3 students struggle, the cause is isolated to the no-diagram assumption rather than confounded with "does the spine even work in Geometry." De-risk the known question first; spend the remaining budget on the genuinely unknown one.
 
---
 
## The full scope, as roadmap (not committed for summer)
 
The complete vision remains a four-module course climbing escalating mathematical judgment, mirroring how the rubrics climb. The two modules below are **roadmap, not summer build** — recorded so the vision is intact, explicitly outside the validation scope.
 
| Module | Cluster | Core move | Why deferred past summer |
|---|---|---|---|
| **Transformations & Similarity** | G-SRT.A.2, B.5 / LEAP.I.GM.1 | Map a figure to another; justify which similarity criterion | Tests transfer less sharply than M2; lower information-per-hour for *validation* |
| **Volume → Micro-model** | G-GMD.A.3 / LEAP.III.GM.4 | Approximate messy reality with a clean solid, and own it | The summit skill, but unreachable until the spine is proven; highest build cost (3-D + displacement) |
 
Both are the *released-or-near-released* heart of the test (Volume is the verbatim Type III aquarium item), so both are strong eventual builds — just not where the fastest validation signal lives.
 
**Also roadmap, not summer:** the product layer — misconception-flag emission, routing ("skip the scaffolding, never the reasoning"), and the teacher map. These are what scale the tool beyond the room. They come *after* the modules validate, and the Algebra document carries their full design unchanged.
 
---
 
## How validation actually runs this summer
 
- **Instrument: your own observation and notes.** No in-app capture. Watch what students do at the judge stage (do they catch the flawed proof?), at the producer stage (can they construct / self-label?), and at the recap (do they recognize their fragments as an argument?).
- **Setting: mix of self-serve and in-room.** M2 should hold up self-serve; M3 is watched in-room.
- **The two signals worth the summer:**
  1. *Transfer* — does judge→producer produce real geometric reasoning in M2, the way it produced algebraic reasoning in the Algebra prototypes?
  2. *The no-diagram assumption* — in M3, do retesters self-label and choose a ratio, or freeze without a handed-over figure?
- **Timeline is flexible by your call** — validation signal outranks the June test window. Build M2 to depth, M3 as a probe, get them in front of students when they're ready, and let what you observe decide what gets built next.
---
 
## Honest limitations of the summer prototype
 
- **No automated feedback.** There is no keyword grading or scoring; you are the judge of whether reasoning is sound. This is a feature for validation (honest, high-resolution) and a non-starter for scale (doesn't run without you) — which is the whole point of validating before building the product layer.
- **M2's parametric camera is unproven.** Framing a variable-coordinate family with auto-fit is new camera behavior and the most likely place to reopen the ghost-regression scar — hence its billing as the module's hardest spec line.
- **M3's core assumption is unverified — by design.** Whether ratio-selection survives without a diagram is the question M3 exists to answer; a rough probe is the right instrument for it.
- **Two modules is not the full course.** The summer validates the *approach* for Geometry, not the complete scope. A clean transfer signal from M2 plus a clear read on M3's assumption is a complete summer outcome, even though it is half the eventual scope.
---
 
## Recommended next steps
 
- **Build M2 first, to usable depth** — it carries the transfer question and is the cleanest stakeholder artifact (a verbatim released Type II item).
- **Build M3 second, as a rough in-room probe** — it isolates the riskiest assumption once the spine is proven.
- **Validate with students via your own observation** — let the two signals (transfer; no-diagram) decide what comes next.
- **Only after a real signal:** pick the next roadmap module (Transformations or Volume) and/or begin the product layer (routing, teacher map) the Algebra document already specs.
---
 
## Source documents referenced
 
- LEAP 2025 Geometry Achievement Level Descriptors (November 2024)
- LEAP 2025 Assessment Guide for Geometry (July 2025) — including the Type II coordinate-parallelogram and Type III aquarium-volume constructed-response sample items and their rubrics (Appendix B), and the evidence statements of Appendix A
- LEAP evidence statements for Geometry: LEAP.I.GM.1–5, LEAP.II.GM.1–4, LEAP.III.GM.1–5, including LEAP.III.GM.4 (micro-models) and LEAP.III.GM.5 (reasoned estimates)
- Companion: Algebra I Summer Remediation design document (shared architecture, the deferred routing/teacher-view product layer, and the source-document method)
 
