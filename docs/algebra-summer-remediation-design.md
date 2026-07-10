# Algebra I Summer Remediation — Prototype & Design Document
 
*A reasoning-first remediation approach for high school students who scored Unsatisfactory on the LEAP 2025 Algebra I assessment and are retesting within about a month.*
 
---
 
## The problem we set out to solve
 
Most LEAP test-prep resources fail the students who need remediation most. They are typically multiple choice, they do not effectively address Type II (reasoning) and Type III (modeling) tasks, and they do not hold the attention of the very students retesting after an Unsatisfactory score.
 
The design goal: build interactive modules where **students show real mathematical reasoning without multiple choice**, that **stay engaging for a reluctant retester**, and that map directly to how the LEAP actually assesses and scores.
 
The first audience is always the student. The teacher is served second, in aggregate.
 
---
 
## What the LEAP documents told us
 
We worked from the actual Louisiana source documents: the Algebra I Achievement Level Descriptors (ALDs, Nov 2024), the LEAP 2025 Assessment Guide for Algebra I (July 2025), the LEAP evidence statements, and the published constructed-response rubrics and sample items.
 
### The single most important finding
 
**Every constructed-response task scores reasoning (or modeling) separately from computation.** A student can get the answer completely right and still earn only half the points if they cannot explain or justify it.
 
- The **Type II** rubric (e.g., completing the square) explicitly splits a *reasoning component* (the explanation) from a *computation component* (the answer). Part B of that sample item required explaining *why* there is only one solution — not just computing the value.
- The **Type III** rubric (the candle burn-rate task) splits a *modeling component* (the correct equation plus accurate notation, vocabulary, and variable identification) from a *computation component* (applying the model to predict).
This validates the core architecture we arrived at independently: **build the math, then explain what it means and why it's true.** That "build then justify" pattern is not just good pedagogy — it mirrors the scoring.
 
### The reasoning gap is consistent across clusters
 
Across the ALDs, the jump from the lower achievement levels to Mastery is almost never about whether a student can perform a procedure. It is about whether they can *interpret* and *justify*. Examples:
 
- **Interpreting Functions** — lower levels write a linear function from a context; higher levels *interpret* what its parts mean and *analyze* it.
- **Expressions** — lower levels "identify components" of an expression; higher levels "interpret parts that represent a quantity in terms of its context."
- **Systems / Multiple Representations** — lower levels write systems in *simple* contexts; higher levels handle *multi-step* contexts and articulate what the solution means.
- **Expressing Mathematical Reasoning** (its own reporting category) — the climb is from an "incomplete response" to a "logical progression of steps" with "justification of a conclusion," and at the top, critiquing the validity of others' reasoning.
### The most distinctive — and least-served — skill: the micro-model
 
The Type III evidence statement **LEAP.III.A1.3** describes a "micro-model": autonomously applying a technique from pure mathematics to a real-world situation where it yields valuable results *even though it is obviously not strictly applicable* (e.g., applying a linear/proportional relationship to data that isn't perfectly linear).
 
The candle rubric's sample response captures this in one word — *"If the burn rate is **believed** to be constant..."* The student is rewarded for making a **defensible simplifying assumption and owning it.** This is the opposite of how a retester instinctively thinks (find the one right answer), it is what the test prizes, and it is what no multiple-choice resource can teach. It became the summit of our scope.
 
---
 
## The core design pattern: judge → producer
 
Every module is built from one repeatable unit with two stages:
 
1. **Judge stage ("you're the coach").** The student critiques someone else's work — a claim or a worked solution that contains a specific, common misconception. They manipulate something (a slider, a graph) to discover the issue, then write a justified verdict. This is the engaging hook *and*, as we later realized, a disguised diagnostic.
2. **Producer stage ("build it").** The student builds the mathematical object themselves (a function, a system, an expression, a model), interprets what its parts mean in context, and justifies an answer. This is the transfer skill — the closest analog to what a Type II/III item demands on test day.
The judge stage was chosen to lead because manipulation-before-explanation hooks reluctant students faster: they get a result before they're asked to write anything. The producer stage follows to convert that engagement into the skill the test measures.
 
### Shared components (the "spine")
 
The same shell wraps every module so a struggling student spends zero energy relearning the tool:
 
- **Coach** — a consistent character with a *direct, real-talk* voice that respects students as near-adults, never cheesy, and always lands on "you did the thinking" rather than empty praise. Critically, Coach's feedback responds to a wrong answer by redirecting ("hold up, slide past week 3 and watch") rather than marking it wrong — correction that keeps a kid in the seat.
- **Live graph** — the math is made visible and responsive. Lines cross on screen; a function's line draws itself as the student types coefficients; a wrong answer visibly starts in the wrong place before Coach says anything. The graph teaches; it isn't decoration.
- **Reasoning recap** — at the end, the student's own scattered written answers are assembled into a single coherent argument ("the argument you built": claim, model, meaning, proof). Struggling students rarely see that their fragments add up to a mathematical argument; showing them is itself the lesson.
- **Teacher view** — a toggle that surfaces the captured student writing plus the misconception flag, deliberately mirroring the test's reasoning/computation split. It shows *words, not a fake score*, because the prototype's keyword-based feedback genuinely cannot grade a justification — and being honest about that matters when showing stakeholders.
---
 
## Prototypes built
 
### Module 1 — Interpreting Functions *(built)*
 
- **Cluster:** Interpreting Functions (F-IF.A.2, F-IF.B.4, LEAP.I.A1.1) — linear functions in context.
- **Context:** Running / training progress.
- **Judge stage:** Two runners (Jordan starts ahead but grows slowly; Riley starts behind but grows faster). Riley claims "I started behind, so Jordan will always be ahead." The student uses a week slider to watch the lines cross and must give a justified verdict. **Target misconception:** confusing starting point with growth rate.
- **Producer stage:** A new runner, Maya (8 min in week 1, +3 min/week, ready at 30 min). The student builds `f(w) = 3w + 8`, explains what the 3 and the 8 mean in her training, and justifies which week she's ready. Maya's line draws live against a dashed 30-minute finish line.
### Module 2 — Systems of Equations *(built)*
 
- **Cluster:** Systems / Multiple Representations (A-REI.C.6, A-REI.D.10–12). Core principle (named verbatim in the reasoning rubric): *a graph of an equation in two variables is the set of all its solutions, and a system's solution is where those sets meet.*
- **Context:** Two phone plans (break-even).
- **Judge stage:** A worked solution to a system that correctly finds `x = 2` and stops, declaring "the solution is 2." The student must catch that the solution is a *point* needing both coordinates, `(2, 5)`, shown on a graph with the intersection marked. **Target misconception (most common for retesters):** reporting only the x-value, not the full point — a procedural-but-not-conceptual error.
- **Producer stage:** Plan A ($30 sign-up + $10/month) vs Plan B ($15/month, no fee). The student writes both equations, finds the intersection `(6, 90)` as a full point, and explains what break-even *means* for someone choosing a plan. Lines draw live with the crossing point marked.
- **Conceptual chain:** Module 2 names and defines the very thing Module 1's student discovered physically — two lines crossing. A student who did Module 1 walks in having already *seen* the idea.
---
 
## Modules designed but not yet built
 
### Module 3 — Expressions *(the no-graph pivot)*
 
- **Cluster:** Expressions (A-SSE.A.1, A-SSE.A.2, A-APR.A.1). The standard hands us the skill directly: interpret `P(1+r)^n` as "the product of P and a factor not depending on P."
- **Why it matters:** It **drops the graph entirely.** The student has spent two modules reading meaning off lines; now they read meaning off *structure*. This proves the reasoning pattern is not graph-dependent.
- **Judge stage idea:** Someone rewrites an expression correctly but misreads what a part *represents* (e.g., calls the exponent the starting amount). The "visual" is the expression itself, with tappable parts that connect to a context — no coordinate plane.
- **Producer stage idea:** Given a context, write the expression and explain what each part means.
- **Placement rationale:** Third, not first — by now the student trusts the "what does it mean" question, so losing the graph feels like a new room, not the floor dropping out.
### Module 4 — Solving Algebraically → Modeling *(the summit)*
 
- **Clusters:** Solving Algebraically (A-REI.B.3/4, A-CED.A.4) building toward Modeling & Application (Type III, LEAP.III.A1.3).
- **Why it's last:** It demands the most judgment. The rubric finding reframed this cluster: the assessed skill is *not* error-spotting arithmetic — it's *explaining why an approach is valid*, and at the top, making a defensible assumption about messy reality and owning it.
- **Judge stage idea:** "A student modeled this clearly nonlinear candle data with a straight line. Are they wrong?" The correct, hard answer: no — *if* they stated the assumption, that's exactly the micro-model skill the test rewards.
- **Producer stage idea:** Messy real data; the student builds a linear model, states the simplifying assumption, uses it to predict, and reflects on whether the result makes sense (mirroring the Modeling & Application ALD cycle: assume → map → analyze → interpret → reflect).
- **Note:** This is also where the engine genuinely needs new parts — nonlinearity breaks the "two straight lines cross once" intuition, and "no real solution" becomes a concept rather than an error.
---
 
## The scope: four modules as one course
 
The organizing principle is **not topic difficulty — it's escalating mathematical judgment**, mirroring how the rubrics climb.
 
| Order | Module | Core move | Judgment demand | Status |
|---|---|---|---|---|
| 1 | Interpreting Functions | Build a function, say what its parts mean | Lowest — one relationship | Built |
| 2 | Systems | The solution is *where two lines meet* (a point) | + a second relationship, new concept | Built |
| 3 | Expressions | Read meaning off *structure*, no graph | + abstraction, graph removed | Designed |
| 4 | Solving → Modeling | Make a defensible assumption and own it | Highest — the micro-model | Designed |
 
**The spine unifies them:** same judge→producer unit, same Coach, same reasoning recap, same teacher view (reasoning + computation). Difficulty climbs; the *experience* of navigating the tool does not. For a retester whose working memory is taxed by anxiety, spending no energy on "how does this work" is a real pedagogical gain.
 
**Caveat:** This is a *learning* sequence (the default path and the scaffold for building), not necessarily a *test-coverage* sequence. A student whose gap is specifically Systems should be able to start at Module 2 — which is what routing enables.
 
---
 
## Routing: the layer that makes it a product
 
A fixed path is the weak point of any remediation tool — a retester solid on functions but failing systems shouldn't grind through Module 1 to reach their actual gap. Routing solves this, and the elegant realization is that **the signal already exists.**
 
### The judge stage *is* the diagnostic
 
The judge stage already surfaces a specific misconception — that's exactly what the teacher-view flag captures. So it doubles as a placement check disguised as the engaging hook. No separate, tedious diagnostic quiz (which would reintroduce the exact multiple-choice tedium we're escaping, and which a just-failed retester reacts badly to).
 
### The routing rule: skip the scaffolding, never the reasoning
 
The key reframe on the "should students skip?" tradeoff:
 
- **Don't skip the module — let the judge stage decide whether the student needs the producer stage.**
- **Caught the misconception** (reasoning *demonstrated*, not merely claimed) → route to a *harder* challenge, not just a lighter one. This protects against under-challenging a student whose gap is confidence, not concept — a harder problem they can handle rebuilds confidence faster than an easy one that bores them.
- **Missed it** → the full producer build, rebuilding the skill from the ground up.
Nobody skips the thinking. The system only skips scaffolding the student has *proven inside the module* they don't need. This is safe because it routes on demonstrated reasoning, not a detached quiz score (which could be a lucky guess that hides the real gap).
 
### One signal, two readers
 
Because routing runs on the misconception flag we already capture:
 
- **The student** experiences it as flow — catch the error, move faster; miss it, get support.
- **The teacher** sees the same signal in aggregate — which misconceptions are lighting up across the room, who's routing into heavy producer stages, where to pull a small group *that day*.
You build one signal and show it two ways. "Student first, teacher can see" isn't a compromise — it's what naturally happens when routing runs off the reasoning signal.
 
### Three philosophies (a maturity ladder, not alternatives)
 
1. **Route on a diagnostic** — clean and familiar, but front-loads tedium and measures the wrong thing (*that* they failed, not *why*).
2. **Route on the judge stage** — buildable *now* on what exists; the diagnostic and the teaching are the same act.
3. **Route on the reasoning itself** — read what the student *writes* and route on argument quality (e.g., distinguishing "right answer, no justification" from "right answer, sound justification"). This is the ambitious version.
These are the same architecture at different fidelities. The judge-stage approach is buildable today and upgrades cleanly to reasoning-based routing once a model reads the actual writing — the resolution improves; the structure doesn't change.
 
---
 
## Honest limitations of the current prototypes
 
- **Feedback is keyword-driven.** Coach's warm voice masks the seams well enough for a demo, but the engine cannot truly judge whether a justification is *sound* — only whether expected words appear. The teacher view stays honest about this by showing raw writing, not a score. This is the clearest place a production build would call a model to read reasoning properly.
- **The graph can reveal the answer.** In the producer stages, a curious student could read the answer off the live graph without building the math. This is a deliberate fork: discovery-first is often good, but if you want the building to lead, the graph could stay hidden until the student commits an equation.
- **Numbers are clean on purpose.** Tidy integers remove arithmetic friction so reasoning is the focus — but real test items rarely resolve to whole numbers. A production version needs messier cases so students don't learn "the answer is always whole."
- **"Missed it" is currently binary.** Routing's resolution is limited by keyword matching — it can't yet distinguish *how* a student missed (full misconception vs. a hedge vs. right idea, wrong words). Reasoning-reading fixes this without changing the architecture.
---
 
## Recommended next steps
 
- **Highest-value build:** Module 3 (Expressions) — it proves the reasoning pattern works with no graph at all, the riskiest open assumption in the design.
- **Highest-value validation:** A **fixed-path classroom pilot** of the two built modules *before* engineering routing. The modules are what make it *work*; routing is what makes it a *product*. Validate the first before building the second. Routing is the target architecture, not necessarily the v1 build order.
- **The clearest stakeholder artifact:** The teacher map (class-wide misconception view in real time). It is the thing a worksheet structurally cannot do, and the clearest answer to "why build this instead of buying a workbook."
- **The eventual fidelity upgrade:** Replace keyword feedback with a model that reads student reasoning — this simultaneously sharpens feedback, enables true reasoning-based routing, and lets the teacher view score reasoning the way the LEAP rubric does.
---
 
## Source documents referenced
 
- LEAP 2025 Algebra I Achievement Level Descriptors (November 2024)
- LEAP 2025 Assessment Guide for Algebra I (July 2025) — including Type II and Type III constructed-response rubrics and sample items
- LEAP evidence statements (Type I / II / III) for Algebra I, including LEAP.III.A1.3 (micro-models) and LEAP.III.A1.4 (reasoned estimates)
 
