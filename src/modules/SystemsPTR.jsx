import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
 
/* ============================================================================
   PROTOTYPE — PREDICT → TEST → RECONCILE
   Module 2 (Systems of Equations) rebuilt around a load-bearing prediction.
 
   The bet: two phone plans. Plan A has a $30 sign-up fee then $10/mo; Plan B
   has no fee but $15/mo. BEFORE any graph, the student commits to which plan
   they'd actually buy and why. Then they drag through the months and watch the
   lines cross at month 6 — the plan that looked worse up front (A, with the
   fee) wins long-term. Same rate-vs-start trap as Module 1, different surface.
 
   The manipulative adjudicates, not a grader. "Right" = recognizing it depends
   on how long you keep the plan / that the lines cross (no single plan wins
   forever). The reconcile box is where the real reasoning gets typed.
 
   Carried over verbatim from the existing build:
   - design tokens (C), fonts, Coach/Btn/Field/NumField/Plane/RecapRow atoms
   - copyText fallback chain + CopyResults
   - SessionContext / useSessionReport
   - the entire producer + recap (two-phone-plans build), unchanged
   - no-wall principle (reveal unlocks, never hard-gates)
   - verified-praise-only (praise only the checked break-even point)
   ============================================================================ */
 
const SessionContext = createContext(null);
 
function useSessionReport(title, lines) {
  const ctx = useContext(SessionContext);
  const joined = (lines || []).filter(Boolean).join("\n");
  useEffect(() => {
    if (ctx) ctx.record(title, joined);
  }, [ctx, title, joined]);
}
 
const C = {
  bg: "#FAF8F3",
  panel: "#FFFFFF",
  ink: "#2B2A26",
  sub: "#6B6A63",
  line: "#E4E0D6",
  blue: "#2F6FB0",
  coral: "#C8552B",
  teal: "#1D8A66",
  amber: "#B07B14",
  goodBg: "#EAF5F0",
  goodInk: "#13634A",
  warnBg: "#FBF2DD",
  warnInk: "#7A560B",
  neutralBg: "#EEF3F9",
  neutralInk: "#274B6B",
};
const FONT_DISPLAY = "'Fraunces','Georgia',serif";
const FONT_BODY = "'Inter','Segoe UI',system-ui,sans-serif";
 
/* ---------- copy fallback chain (unchanged from existing build) ------------ */
async function copyText(text, selectFallbackId) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return "copied";
  } catch (e) { /* fall through */ }
  try {
    if (selectFallbackId) {
      const el = document.getElementById(selectFallbackId);
      if (el && el.select) { el.focus(); el.select(); return "selected"; }
    }
  } catch (e) { /* fall through */ }
  return "failed";
}
let _copyIdSeq = 0;
const nextCopyId = () => `copybox-${++_copyIdSeq}`;
 
function isFiller(s) {
  const t = (s || "").trim().toLowerCase();
  if (t.length < 6) return true;
  if (/^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|test|asdf|aaa+|\.+|x+|abc|123|qwerty|blah|stuff)\.?$/.test(t)) return true;
  if (/^(.)\1{4,}$/.test(t.replace(/\s/g, ""))) return true;
  return false;
}
 
/* ---------- shared atoms (unchanged) --------------------------------------- */
function Coach({ children, tone = "neutral" }) {
  const bg = tone === "good" ? C.goodBg : tone === "redirect" ? C.warnBg : C.neutralBg;
  const ink = tone === "good" ? C.goodInk : tone === "redirect" ? C.warnInk : C.neutralInk;
  const bar = tone === "good" ? C.teal : tone === "redirect" ? C.amber : C.blue;
  return (
    <div style={{ display: "flex", gap: 12, background: bg, border: `1px solid ${C.line}`,
      borderLeft: `4px solid ${bar}`, borderRadius: 10, padding: "13px 15px", margin: "14px 0" }}>
      <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", background: bar,
        color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
        display: "grid", placeItems: "center" }}>C</div>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: ink, alignSelf: "center" }}>{children}</div>
    </div>
  );
}
function Btn({ children, onClick, kind = "primary", disabled }) {
  const base = { fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, borderRadius: 9,
    padding: "10px 18px", cursor: disabled ? "not-allowed" : "pointer", border: "1px solid transparent",
    transition: "opacity .15s", opacity: disabled ? 0.45 : 1 };
  const styles = {
    primary: { ...base, background: C.ink, color: C.bg },
    ghost: { ...base, background: "transparent", color: C.sub, border: `1px solid ${C.line}` },
  };
  return <button style={styles[kind]} onClick={disabled ? undefined : onClick} disabled={disabled}>{children}</button>;
}
function Field({ label, value, onChange, placeholder, rows = 3, disabled }) {
  return (
    <label style={{ display: "block", margin: "12px 0" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 6 }}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        disabled={disabled}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.5,
          color: C.ink, background: disabled ? C.bg : C.panel, border: `1px solid ${C.line}`, borderRadius: 9,
          padding: "10px 12px", resize: "vertical" }} />
    </label>
  );
}
function NumField({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "inline-flex", flexDirection: "column", margin: "8px 14px 8px 0" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 5 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="decimal"
        style={{ width: 120, fontFamily: FONT_BODY, fontSize: 16, color: C.ink, background: C.panel,
          border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 11px" }} />
    </label>
  );
}
function StageTag({ children }) {
  return <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    textTransform: "uppercase", color: C.coral, marginBottom: 6 }}>{children}</div>;
}
function H({ children }) {
  return <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>{children}</h2>;
}
function P({ children }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.ink, margin: "10px 0" }}>{children}</p>;
}
function Plane({ width = 440, height = 300, xMax, yMax, children, xLabel, yLabel }) {
  const pad = { l: 42, r: 14, t: 14, b: 32 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const sx = (x) => pad.l + (x / xMax) * iw;
  const sy = (y) => pad.t + ih - (y / yMax) * ih;
  const xticks = Array.from({ length: xMax + 1 }, (_, i) => i).filter((i) => i % Math.ceil(xMax / 8 || 1) === 0);
  const yticks = Array.from({ length: Math.floor(yMax) + 1 }, (_, i) => i).filter((i) => i % Math.ceil(yMax / 6 || 1) === 0);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", background: C.panel,
      border: `1px solid ${C.line}`, borderRadius: 10, display: "block" }}>
      {xticks.map((t) => <line key={`gx${t}`} x1={sx(t)} y1={pad.t} x2={sx(t)} y2={pad.t + ih} stroke="#F0ECE2" />)}
      {yticks.map((t) => <line key={`gy${t}`} x1={pad.l} y1={sy(t)} x2={pad.l + iw} y2={sy(t)} stroke="#F0ECE2" />)}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.2" />
      <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.2" />
      {xticks.map((t) => <text key={`tx${t}`} x={sx(t)} y={height - 14} fontSize="10" fill={C.sub} textAnchor="middle">{t}</text>)}
      {yticks.map((t) => <text key={`ty${t}`} x={pad.l - 6} y={sy(t) + 3} fontSize="10" fill={C.sub} textAnchor="end">{t}</text>)}
      <text x={pad.l + iw / 2} y={height - 1} fontSize="11" fill={C.sub} textAnchor="middle">{xLabel}</text>
      <text x={11} y={pad.t + ih / 2} fontSize="11" fill={C.sub} textAnchor="middle"
        transform={`rotate(-90 11 ${pad.t + ih / 2})`}>{yLabel}</text>
      {typeof children === "function" ? children({ sx, sy }) : children}
    </svg>
  );
}
function RecapRow({ label, text }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
        color: C.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, color: C.ink }}>
        {text ? text : <span style={{ color: C.sub, fontStyle: "italic" }}>—</span>}
      </div>
    </div>
  );
}
function CopyResults({ lines }) {
  const [status, setStatus] = useState("idle");
  const idRef = useRef(nextCopyId());
  const text = lines.filter(Boolean).join("\n");
  const copy = async () => {
    const result = await copyText(text, idRef.current);
    setStatus(result);
    if (result === "copied") setTimeout(() => setStatus("idle"), 2000);
  };
  const label = status === "copied" ? "Copied ✓"
    : status === "selected" ? "Selected — press ⌘/Ctrl-C"
    : status === "failed" ? "Select the box below & copy"
    : "Copy my answers";
  return (
    <div style={{ marginTop: 18 }}>
      <Btn onClick={copy}>{label}</Btn>
      {(status === "selected" || status === "failed") && (
        <div style={{ fontSize: 12.5, color: C.sub, marginTop: 6 }}>
          Copying is blocked here — tap inside the box, select all, and copy.
        </div>
      )}
      <textarea id={idRef.current} readOnly value={text} rows={4}
        onFocus={(e) => e.target.select()}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 10, fontFamily: FONT_BODY, fontSize: 13,
          color: C.sub, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px" }} />
    </div>
  );
}
 
/* ---------- prediction floor (same soft edge as Module 1) ------------------ */
function isThinPrediction(v) {
  const t = (v || "").trim().toLowerCase();
  if (t.length < 4) return true;
  return /^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|maybe|not sure|i dont know)\.?$/.test(t);
}
 
/* ============================================================================
   MODULE 2 — SYSTEMS OF EQUATIONS, as predict → test → reconcile
   Plan A: 30 + 10m   |   Plan B: 15m   |   break-even at month 6 ($90).
   Before m6, B is cheaper; after m6, A is cheaper. No plan wins forever.
   ============================================================================ */
function ModuleSystemsPTR() {
  const [phase, setPhase] = useState("predict"); // predict -> revealed -> producer -> recap
 
  // PREDICT
  const [pick, setPick] = useState("");      // "a" | "b" | "depends"
  const [prediction, setPrediction] = useState("");
  const [nudged, setNudged] = useState(false);
 
  // TEST
  const [month, setMonth] = useState(0);
  const [committed, setCommitted] = useState(false);
 
  // RECONCILE
  const [surprise, setSurprise] = useState("");
 
  // PRODUCER (carried verbatim from the existing Systems module)
  const [eqA, setEqA] = useState("");
  const [eqB, setEqB] = useState("");
  const [px, setPx] = useState("");
  const [py, setPy] = useState("");
  const [meaning, setMeaning] = useState("");
  const [stuck, setStuck] = useState(false);
 
  const planA = (m) => 30 + 10 * m;
  const planB = (m) => 15 * m;
  const yMax = 150, xMax = 10;
  const crossMonth = 6; // 30 + 10m = 15m -> m = 6, cost 90
  const correctPoint = px.trim() === "6" && py.trim() === "90";
 
  // "Right" = recognizing it DEPENDS on how long you keep the plan (the lines cross).
  // Picking A-forever or B-forever is the misconception: one rate/start beats the other always.
  const predictionWasRight = pick === "depends";
 
  const commit = () => {
    if (pick === "") return;
    if (isThinPrediction(prediction) && !nudged) { setNudged(true); return; }
    setCommitted(true);
    setPhase("revealed");
  };
 
  const reset = () => {
    setPhase("predict"); setPick(""); setPrediction(""); setNudged(false);
    setMonth(0); setCommitted(false); setSurprise("");
    setEqA(""); setEqB(""); setPx(""); setPy(""); setMeaning(""); setStuck(false);
  };
 
  const pickLabel = pick === "a" ? "Plan A is the better deal"
    : pick === "b" ? "Plan B is the better deal"
    : pick === "depends" ? "It depends on how long you keep it" : "";
 
  // who's cheaper at the current month (lower cost = better)
  const cheaperNow = month < crossMonth ? "B" : month > crossMonth ? "A" : "tie";
 
  useSessionReport("Module 2 · Systems of Equations (Predict→Test→Reconcile)",
    (committed) ? [
      "ALGEBRA — Module 2: Systems of Equations",
      `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
      `What the lines actually did: they cross at month ${crossMonth} ($90). B cheaper before, A cheaper after.`,
      `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
      `Student's reconcile (what surprised them / why): ${surprise || "(not yet written)"}`,
      `System built: ${eqA || eqB ? `${eqA}  /  ${eqB}` : "(not built)"}`,
      `Break-even point: ${px !== "" && py !== "" ? `(${px}, ${py})` : "(not found)"}`,
      `Meaning of break-even (student words): ${meaning}`,
    ] : null);
 
  const choiceBtn = (key, text, color) => {
    const active = pick === key;
    return (
      <button onClick={() => setPick(key)}
        style={{
          display: "block", width: "100%", textAlign: "left", cursor: "pointer",
          fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.4, color: C.ink,
          background: active ? C.panel : "transparent",
          border: `1.5px solid ${active ? color : C.line}`,
          boxShadow: active ? `inset 3px 0 0 ${color}` : "none",
          borderRadius: 10, padding: "11px 14px", margin: "8px 0", transition: "all .12s",
        }}>
        <span style={{ fontWeight: active ? 700 : 500 }}>{text}</span>
      </button>
    );
  };
 
  return (
    <section>
      {/* ---------------- PREDICT ---------------- */}
      <StageTag>Module 2 · Predict</StageTag>
      <H>Which plan would you buy?</H>
      <P>You're picking a phone plan. <b style={{ color: C.blue }}>Plan A</b> charges a $30 sign-up fee,
        then $10 a month. <b style={{ color: C.coral }}>Plan B</b> has no fee but costs $15 a month.</P>
      <P><b>No graph yet.</b> Make the call: which plan is the better deal — and why? (Think about it before
        you can see the lines. There's a catch hiding in here.)</P>
 
      <div style={{ margin: "6px 0 2px" }}>
        {choiceBtn("a", "Plan A is the better deal", C.blue)}
        {choiceBtn("b", "Plan B is the better deal", C.coral)}
        {choiceBtn("depends", "It depends on how long you keep it", C.teal)}
      </div>
 
      <Field
        label="Why? (one sentence — this locks in before the graph unlocks)"
        value={prediction}
        onChange={setPrediction}
        placeholder="I'd pick ___ because ___"
        rows={2}
        disabled={committed}
      />
 
      {nudged && !committed && isThinPrediction(prediction) && (
        <Coach tone="redirect">Commit to a reason — even a hunch. You can't find out you were half-right until you
          say what you think. The graph unlocks the moment you do.</Coach>
      )}
 
      {!committed && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Btn onClick={commit} disabled={pick === ""}>
            {nudged && isThinPrediction(prediction) ? "Lock it in anyway →" : "Lock in my call → unlock the graph"}
          </Btn>
          {pick === "" && <span style={{ fontSize: 13, color: C.sub }}>Pick one of the three first.</span>}
        </div>
      )}
 
      {/* ---------------- TEST ---------------- */}
      {committed && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Test</StageTag>
          <H>Now run the months. Were you right?</H>
          <P>Your call is locked: <b>{pickLabel.toLowerCase()}</b>. Drag through the months and watch the costs.</P>
 
          <Plane width={440} height={300} xMax={xMax} yMax={yMax} xLabel="month (m)" yLabel="total cost ($)">
            {({ sx, sy }) => (
              <>
                <line x1={sx(0)} y1={sy(planA(0))} x2={sx(xMax)} y2={sy(planA(xMax))} stroke={C.blue} strokeWidth="2.4" />
                <line x1={sx(0)} y1={sy(planB(0))} x2={sx(xMax)} y2={sy(planB(xMax))} stroke={C.coral} strokeWidth="2.4" />
                {/* mark the break-even once the student has dragged at or past it */}
                {month >= crossMonth && (
                  <circle cx={sx(crossMonth)} cy={sy(90)} r="6" fill="none" stroke={C.teal} strokeWidth="2.2" />
                )}
                <line x1={sx(month)} y1={14} x2={sx(month)} y2={268} stroke={C.sub} strokeDasharray="3 3" />
                <circle cx={sx(month)} cy={sy(planA(month))} r="5" fill={C.blue} />
                <circle cx={sx(month)} cy={sy(planB(month))} r="5" fill={C.coral} />
                <text x={sx(month)} y={sy(planA(month)) - 9} fontSize="11" fill={C.blue} textAnchor="middle">${planA(month)}</text>
                <text x={sx(month)} y={sy(planB(month)) + 16} fontSize="11" fill={C.coral} textAnchor="middle">${planB(month)}</text>
              </>
            )}
          </Plane>
 
          <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.sub }}>
            Drag through the months — month {month}
            {cheaperNow === "tie"
              ? <span style={{ color: C.teal, fontWeight: 700 }}> · same price — they meet here</span>
              : cheaperNow === "B"
                ? <span style={{ color: C.coral, fontWeight: 700 }}> · Plan B is cheaper so far</span>
                : <span style={{ color: C.blue, fontWeight: 700 }}> · Plan A is now cheaper</span>}
          </label>
          <input type="range" min={0} max={xMax} value={month} onChange={(e) => setMonth(+e.target.value)}
            style={{ width: "100%" }} />
 
          {/* verified praise: only the checked "depends" call is praised */}
          {month >= crossMonth && phase === "revealed" && (
            predictionWasRight ? (
              <Coach tone="good">That's the read. The lines <b>cross at month 6</b> ($90 each). Plan B wins early
                because it has no fee, but Plan A's lower monthly rate catches up and passes it. Neither plan is
                "the better deal" on its own — it depends on how long you keep it. That's exactly what a system's
                solution tells you.</Coach>
            ) : (
              <Coach tone="neutral">Watch what happened: the lines crossed at month 6. Before then Plan B is cheaper
                (no fee), but after month 6 Plan A pulls ahead (lower monthly rate). Neither plan wins the whole time —
                it flips at the break-even point. Hold onto whatever just surprised you and write it down below.</Coach>
            )
          )}
 
          {month < crossMonth && phase === "revealed" && (
            <Coach tone="neutral">Keep dragging — push past month 5 and watch which line ends up on top.</Coach>
          )}
        </div>
      )}
 
      {/* ---------------- RECONCILE ---------------- */}
      {committed && month >= crossMonth && (
        <div style={{ marginTop: 24 }}>
          <StageTag>Reconcile</StageTag>
          <P style={{ marginBottom: 2 }}>
            {predictionWasRight
              ? "You saw it — now make it airtight. Why does the cheaper plan switch at month 6 instead of one plan winning the whole time?"
              : "You picked \"" + pickLabel.toLowerCase() + ",\" but the lines crossed. What made the cheaper plan change?"}
          </P>
          <Field
            label={predictionWasRight ? "Say why the better plan switches — in your own words" : "I thought ___, but the graph showed ___ because ___"}
            value={surprise}
            onChange={setSurprise}
            placeholder={predictionWasRight
              ? "The plan that's cheaper changes at month 6 because…"
              : "I thought Plan ___ would always be cheaper because ___, but…"}
            rows={3}
          />
          {surprise.trim().length >= 12 ? (
            <>
              <Coach tone="neutral">Saved for your teacher in your own words — they'll read your reasoning, not a
                score. Now build one from scratch.</Coach>
              <Btn onClick={() => setPhase("producer")}>Build one yourself →</Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              A sentence or two unlocks the build step. There's no right wording — just say what you noticed.
            </div>
          )}
        </div>
      )}
 
      {/* ---------------- PRODUCER (carried verbatim from existing Systems module) ---------------- */}
      {phase === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Now write the system</H>
          <P>Same two plans. This time, build the equations and find the exact break-even point yourself —
            then say what it means.</P>
 
          <Field label="Write Plan A's cost equation (use m for months)" value={eqA} onChange={setEqA}
            placeholder="A = 30 + 10m" rows={1} />
          <Field label="Write Plan B's cost equation" value={eqB} onChange={setEqB}
            placeholder="B = 15m" rows={1} />
 
          <P style={{ marginBottom: 2 }}>Find the break-even point as a <b>full point</b> (month, cost):</P>
          <div>
            <NumField label="month" value={px} onChange={setPx} placeholder="6" />
            <NumField label="cost ($)" value={py} onChange={setPy} placeholder="90" />
          </div>
 
          <Plane width={440} height={300} xMax={10} yMax={150} xLabel="month (m)" yLabel="cost ($)">
            {({ sx, sy }) => (
              <>
                <line x1={sx(0)} y1={sy(planA(0))} x2={sx(10)} y2={sy(planA(10))} stroke={C.blue} strokeWidth="2.4" />
                <line x1={sx(0)} y1={sy(planB(0))} x2={sx(10)} y2={sy(planB(10))} stroke={C.coral} strokeWidth="2.4" />
                <circle cx={sx(6)} cy={sy(90)} r="6" fill="none" stroke={C.teal} strokeWidth="2.4" />
                {correctPoint && <circle cx={sx(6)} cy={sy(90)} r="6" fill={C.teal} opacity="0.25" />}
                <text x={sx(6) + 8} y={sy(90) - 6} fontSize="11" fill={C.teal}>break-even</text>
              </>
            )}
          </Plane>
 
          {px !== "" && py !== "" && !correctPoint && (
            <Coach tone="redirect">Close — set the two costs equal: <code>30 + 10m = 15m</code>. Solve for the
              month, then plug back in to get the cost. The answer is the point where both lines meet.</Coach>
          )}
 
          <Field label="What does break-even MEAN for someone choosing a plan?" value={meaning} onChange={setMeaning}
            placeholder="Before that month, Plan ___ is cheaper; after it, …" rows={2} />
 
          {correctPoint && meaning.trim().length > 6 && (
            (!isFiller(meaning) || stuck) ? (
              <>
                <Coach tone="good">Your point checks out — <b>(6, 90)</b>: at 6 months both plans cost $90. Saved for your teacher.
                  Your interpretation is in your own words; reread it — does it say which plan wins before month 6 and which after?</Coach>
                <Btn onClick={() => setPhase("recap")}>See the argument you built →</Btn>
              </>
            ) : (
              <>
                <Coach tone="redirect">You've got the point — now say what break-even <i>means</i> in real words: which plan is cheaper before month 6, and which after. A real sentence, not a placeholder.</Coach>
                <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
              </>
            )
          )}
        </div>
      )}
 
      {/* ---------------- RECAP ---------------- */}
      {phase === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Your locked-in call (before any graph)" text={`${pickLabel} — "${prediction}"`} />
            <RecapRow label="What the lines actually did" text={`They cross at month ${crossMonth} ($90) — B cheaper before, A cheaper after.`} />
            <RecapRow label={predictionWasRight ? "Why the better plan switches (your words)" : "What surprised you, and why (your words)"} text={surprise} />
            <RecapRow label="System you built" text={eqA || eqB ? `${eqA}   /   ${eqB}` : ""} />
            <RecapRow label="Solution (full point)" text={px !== "" && py !== "" ? `(${px}, ${py})` : ""} />
            <RecapRow label="What break-even means" text={meaning} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — Module 2: Systems of Equations",
            `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
            `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
            `Reconcile (student's words): ${surprise}`,
            `System: ${eqA || eqB ? `${eqA}  /  ${eqB}` : "(not built)"}`,
            `Break-even point: ${px !== "" && py !== "" ? `(${px}, ${py})` : "(not found)"}`,
            `Meaning: ${meaning}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* ============================================================================
   APP SHELL — session store + frame (mirrors the existing artifact shell)
   ============================================================================ */
export default function App() {
  const [records, setRecords] = useState({});
  const ctx = useMemo(() => ({
    record: (title, text) => setRecords((r) => (r[title] === text ? r : { ...r, [title]: text })),
  }), []);
 
  const sessionLines = useMemo(() => {
    const out = [];
    Object.entries(records).forEach(([, text]) => { if (text) { out.push(text, ""); } });
    return out;
  }, [records]);
 
  return (
    <SessionContext.Provider value={ctx}>
      <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 16px",
        fontFamily: FONT_BODY, color: C.ink }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 2,
              textTransform: "uppercase", color: C.sub }}>Algebra I · Reasoning Lab · Prototype</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 600, margin: "4px 0 0" }}>
              Predict → Test → Reconcile
            </h1>
            <p style={{ fontSize: 14.5, color: C.sub, lineHeight: 1.5, margin: "8px 0 0" }}>
              The graph stays locked until you commit a call in writing. The lines — not a grader — tell you if you
              were right.
            </p>
          </div>
 
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleSystemsPTR />
          </div>
 
          <div style={{ marginTop: 22, background: C.panel, border: `1px solid ${C.line}`,
            borderRadius: 16, padding: "18px 22px" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              Hand your whole session to your teacher
            </div>
            <p style={{ fontSize: 14, color: C.sub, margin: "0 0 6px" }}>
              Everything you locked in and reasoned through, collected here.
            </p>
            <CopyResults lines={sessionLines} />
          </div>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
 
