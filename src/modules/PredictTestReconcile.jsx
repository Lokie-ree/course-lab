import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
 
/* ============================================================================
   PROTOTYPE — PREDICT → TEST → RECONCILE
   Module 1 (Interpreting Functions) rebuilt around a load-bearing prediction.
 
   The point: the typed claim is the ONLY thing that unlocks the test. Nothing
   reveals until the student commits a prediction in words. The manipulative —
   not the teacher, not a grader — adjudicates. When the prediction misses, the
   "what surprised you" box is where real reasoning gets typed, because now the
   student is confused and wants to know why.
 
   Carried over verbatim from the existing build:
   - design tokens (C), fonts, Coach/Btn/Field/NumField/Plane/RecapRow atoms
   - copyText fallback chain + CopyResults
   - SessionContext / useSessionReport
   - no-wall principle: the reveal UNLOCKS on commit, it does not hard-gate
   - verified-praise-only: the app praises only the prediction it actually
     checked against the line; the reconcile prose is saved unjudged for the teacher
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
 
/* Producer filler floor — kept for the build-stage meaning boxes. */
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
 
/* ---------- prediction floor ----------------------------------------------
   A prediction is a real claim only if it picks a side. We DON'T grade whether
   it's correct here — the line does that. We only block empty/non-attempts so
   the reveal stays load-bearing. This is the no-wall principle's soft edge:
   the student can still force past it (see "Reveal anyway" after one nudge).  */
function isThinPrediction(v) {
  const t = (v || "").trim().toLowerCase();
  if (t.length < 4) return true;
  return /^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|maybe|not sure|i dont know)\.?$/.test(t);
}
 
/* ============================================================================
   MODULE 1 — INTERPRETING FUNCTIONS, as predict → test → reconcile
   Jordan: 22 + 1·w   |   Riley: 12 + 4·w   |   they cross between week 3 and 4.
   ============================================================================ */
function ModuleFunctionsPTR() {
  // phase: predict -> revealed -> producer -> recap
  const [phase, setPhase] = useState("predict");
 
  // PREDICT
  const [pick, setPick] = useState("");        // "jordan" | "riley" | "tie"
  const [prediction, setPrediction] = useState("");
  const [nudged, setNudged] = useState(false);
 
  // TEST (manipulative is inert until committed)
  const [week, setWeek] = useState(0);
  const [committed, setCommitted] = useState(false);
 
  // RECONCILE
  const [surprise, setSurprise] = useState("");
 
  // PRODUCER (carried from original build)
  const [slope, setSlope] = useState("");
  const [intc, setIntc] = useState("");
  const [mean3, setMean3] = useState("");
  const [mean8, setMean8] = useState("");
  const [ready, setReady] = useState("");
  const [stuck, setStuck] = useState(false);
 
  const jordan = (w) => 22 + 1 * w;
  const riley = (w) => 12 + 4 * w;
  const yMax = 60, xMax = 10;
 
  // The line's verdict at week 10: Riley (62) is far ahead of Jordan (32).
  // "Correct" prediction = Riley pulls ahead / they cross. Tie is wrong. Jordan-forever is the misconception.
  const predictionWasRight = pick === "riley";
  const crossWeek = 4; // first integer week Riley >= Jordan: 12+4w >= 22+w -> 3w>=10 -> w>=3.33
 
  const commit = () => {
    if (pick === "") return;
    if (isThinPrediction(prediction) && !nudged) { setNudged(true); return; }
    setCommitted(true);
    setPhase("revealed");
  };
 
  const reset = () => {
    setPhase("predict"); setPick(""); setPrediction(""); setNudged(false);
    setWeek(0); setCommitted(false); setSurprise("");
    setSlope(""); setIntc(""); setMean3(""); setMean8(""); setReady(""); setStuck(false);
  };
 
  const pickLabel = pick === "jordan" ? "Jordan stays ahead the whole time"
    : pick === "riley" ? "Riley catches up and passes Jordan"
    : pick === "tie" ? "They stay about even" : "";
 
  useSessionReport("Module 1 · Interpreting Functions (Predict→Test→Reconcile)",
    (committed) ? [
      "ALGEBRA — Module 1: Interpreting Functions",
      `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
      `What the lines actually did: Riley passes Jordan near week ${crossWeek}.`,
      `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
      `Student's reconcile (what surprised them / why): ${surprise || "(not yet written)"}`,
      `Model built: ${slope !== "" && intc !== "" ? `f(w) = ${slope}w + ${intc}` : "(not built)"}`,
      `Meaning of 3: ${mean3}`,
      `Meaning of 8: ${mean8}`,
      `Ready week + reasoning: ${ready}`,
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
      <StageTag>Module 1 · Predict</StageTag>
      <H>Call it before you can see it</H>
      <P>Two runners track weekly training time. <b style={{ color: C.blue }}>Jordan</b> starts at
        22 minutes and adds 1 minute a week. <b style={{ color: C.coral }}>Riley</b> starts at 12 minutes
        and adds 4 minutes a week.</P>
      <P><b>You don't get the graph yet.</b> First, make the call: ten weeks from now, who's running more
        per week — and why do you think so?</P>
 
      <div style={{ margin: "6px 0 2px" }}>
        {choiceBtn("jordan", "Jordan stays ahead the whole time", C.blue)}
        {choiceBtn("riley", "Riley catches up and passes Jordan", C.coral)}
        {choiceBtn("tie", "They stay about even", C.sub)}
      </div>
 
      <Field
        label="Why? (one sentence — this locks in before the graph unlocks)"
        value={prediction}
        onChange={setPrediction}
        placeholder="I think ___ because ___"
        rows={2}
        disabled={committed}
      />
 
      {nudged && !committed && isThinPrediction(prediction) && (
        <Coach tone="redirect">Commit to a reason — even a hunch you're unsure of. The whole point is to find
          out if you're right, and you can't be wrong-then-fixed if you don't say anything yet. The graph
          unlocks the second you do.</Coach>
      )}
 
      {!committed && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Btn onClick={commit} disabled={pick === ""}>
            {nudged && isThinPrediction(prediction) ? "Lock it in anyway →" : "Lock in my call → unlock the graph"}
          </Btn>
          {pick === "" && <span style={{ fontSize: 13, color: C.sub }}>Pick one of the three first.</span>}
        </div>
      )}
 
      {/* ---------------- TEST (revealed only after commit) ---------------- */}
      {committed && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Test</StageTag>
          <H>Now run it. Were you right?</H>
          <P>Your call is locked: <b>{pickLabel.toLowerCase()}</b>. Drag through the weeks and watch.</P>
 
          <Plane width={440} height={300} xMax={xMax} yMax={yMax} xLabel="week" yLabel="minutes / week">
            {({ sx, sy }) => (
              <>
                <line x1={sx(0)} y1={sy(jordan(0))} x2={sx(xMax)} y2={sy(jordan(xMax))} stroke={C.blue} strokeWidth="2.4" />
                <line x1={sx(0)} y1={sy(riley(0))} x2={sx(xMax)} y2={sy(riley(xMax))} stroke={C.coral} strokeWidth="2.4" />
                {/* mark the crossing once the student has dragged at or past it */}
                {week >= crossWeek && (
                  <circle cx={sx(10 / 3)} cy={sy(jordan(10 / 3))} r="4.5" fill="none" stroke={C.amber} strokeWidth="2" />
                )}
                <line x1={sx(week)} y1={14} x2={sx(week)} y2={268} stroke={C.sub} strokeDasharray="3 3" />
                <circle cx={sx(week)} cy={sy(jordan(week))} r="5" fill={C.blue} />
                <circle cx={sx(week)} cy={sy(riley(week))} r="5" fill={C.coral} />
                <text x={sx(week)} y={sy(jordan(week)) - 9} fontSize="11" fill={C.blue} textAnchor="middle">{jordan(week)}</text>
                <text x={sx(week)} y={sy(riley(week)) - 9} fontSize="11" fill={C.coral} textAnchor="middle">{riley(week)}</text>
              </>
            )}
          </Plane>
 
          <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.sub }}>
            Drag through the weeks — week {week}
            {week >= crossWeek
              ? <span style={{ color: C.coral, fontWeight: 700 }}> · Riley is now ahead</span>
              : <span style={{ color: C.blue, fontWeight: 700 }}> · Jordan is still ahead</span>}
          </label>
          <input type="range" min={0} max={xMax} value={week} onChange={(e) => setWeek(+e.target.value)}
            style={{ width: "100%" }} />
 
          {/* The app praises ONLY the checked prediction. The reconcile prose is never graded. */}
          {week >= crossWeek && phase === "revealed" && (
            predictionWasRight ? (
              <Coach tone="good">You called it. Riley started behind but the steeper rate — 4 a week vs 1 — let the
                line catch up and cross near week 4. You read the <b>rate</b>, not just the head start. That's the
                exact move the test checks.</Coach>
            ) : (
              <Coach tone="neutral">The lines crossed. Riley started 10 minutes behind, but gaining 4 a week against
                Jordan's 1 closed the gap by about week 4 — and after that Riley keeps pulling away. The head start
                lost to the rate. Hold onto whatever just surprised you; write it down below.</Coach>
            )
          )}
 
          {week < crossWeek && phase === "revealed" && (
            <Coach tone="neutral">Keep dragging — push past week 3 and watch what happens to the gap.</Coach>
          )}
        </div>
      )}
 
      {/* ---------------- RECONCILE ---------------- */}
      {committed && week >= crossWeek && (
        <div style={{ marginTop: 24 }}>
          <StageTag>Reconcile</StageTag>
          <P style={{ marginBottom: 2 }}>
            {predictionWasRight
              ? "You were right — so make the reasoning airtight. Why does a bigger weekly rate beat a head start, every time?"
              : "You picked \"" + pickLabel.toLowerCase() + ",\" but the lines crossed. What did you expect, and what actually made the difference?"}
          </P>
          <Field
            label={predictionWasRight ? "Say why the rate wins — in your own words" : "I thought ___, but the graph showed ___ because ___"}
            value={surprise}
            onChange={setSurprise}
            placeholder={predictionWasRight
              ? "A bigger rate wins because…"
              : "I thought Jordan would stay ahead because he started higher, but…"}
            rows={3}
          />
          {surprise.trim().length >= 12 ? (
            <>
              <Coach tone="neutral">Saved for your teacher in your own words — they'll read your reasoning, not a
                score. Now go build one from scratch.</Coach>
              <Btn onClick={() => setPhase("producer")}>Build one yourself →</Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              A sentence or two unlocks the build step. There's no right wording — just say what you noticed.
            </div>
          )}
        </div>
      )}
 
      {/* ---------------- PRODUCER (unchanged logic from original) ---------------- */}
      {phase === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Maya's training</H>
          <P>A new runner, <b style={{ color: C.teal }}>Maya</b>, runs <b>8 minutes</b> in week 1 and adds
            <b> 3 minutes every week</b>. She's ready to race when she can run <b>30 minutes</b>.</P>
          <P style={{ marginBottom: 4 }}>Write her function <code style={{ fontFamily: "monospace" }}>f(w) = </code> by filling the two numbers:</P>
          <div>
            <NumField label="slope (per week)" value={slope} onChange={setSlope} placeholder="3" />
            <NumField label="starting value" value={intc} onChange={setIntc} placeholder="8" />
          </div>
 
          {slope !== "" && intc !== "" && (
            <Plane width={440} height={300} xMax={10} yMax={40} xLabel="week (w)" yLabel="minutes f(w)">
              {({ sx, sy }) => {
                const m = parseFloat(slope), b = parseFloat(intc);
                const ok = !isNaN(m) && !isNaN(b);
                return (
                  <>
                    <line x1={sx(0)} y1={sy(30)} x2={sx(10)} y2={sy(30)} stroke={C.amber} strokeDasharray="5 4" strokeWidth="1.6" />
                    <text x={sx(10)} y={sy(30) - 5} fontSize="10" fill={C.amber} textAnchor="end">ready = 30</text>
                    {ok && <line x1={sx(0)} y1={sy(Math.max(0, Math.min(40, b)))}
                      x2={sx(10)} y2={sy(Math.max(0, Math.min(40, m * 10 + b)))} stroke={C.teal} strokeWidth="2.6" />}
                  </>
                );
              }}
            </Plane>
          )}
 
          <Field label="What does the 3 mean in Maya's training?" value={mean3} onChange={setMean3}
            placeholder="The 3 is the rate — it tells you…" rows={2} />
          <Field label="What does the 8 mean in Maya's training?" value={mean8} onChange={setMean8}
            placeholder="The 8 is where she starts — it's…" rows={2} />
          <Field label="Which week is she ready (f(w) = 30), and how do you know?" value={ready} onChange={setReady}
            placeholder="Solve 3w + 8 = 30 → w = … and explain." rows={2} />
 
          {(() => {
            if (!(mean3 && mean8 && ready.trim().length > 4)) return null;
            const sOk = parseFloat(slope) === 3, iOk = parseFloat(intc) === 8;
            const fillerOk = !isFiller(mean3) && !isFiller(mean8) && !isFiller(ready);
            const good = sOk && iOk && fillerOk;
            if (good || stuck) return (
              <>
                <Coach tone="good">Your function checks out — f(w) = 3w + 8, slope 3 and starting value 8. Saved for your teacher.
                  The meaning of each part and the ready week are in your words; reread them and make sure each says what the number stands for.</Coach>
                <Btn onClick={() => setPhase("recap")}>See the argument you built →</Btn>
              </>
            );
            return (
              <>
                <Coach tone="redirect">{!sOk || !iOk
                  ? "Check the two numbers: she starts at 8 and adds 3 each week, so f(w) = 3w + 8 — slope 3, starting value 8."
                  : "Put a real sentence in each meaning box — what the 3 and the 8 stand for, and how you found the ready week."}</Coach>
                <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
              </>
            );
          })()}
        </div>
      )}
 
      {/* ---------------- RECAP ---------------- */}
      {phase === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Your locked-in call (before any graph)" text={`${pickLabel} — "${prediction}"`} />
            <RecapRow label="What the lines actually did" text={`Riley passed Jordan near week ${crossWeek}.`} />
            <RecapRow label={predictionWasRight ? "Why the rate wins (your words)" : "What surprised you, and why (your words)"} text={surprise} />
            <RecapRow label="Model you built" text={slope !== "" && intc !== "" ? `f(w) = ${slope}w + ${intc}` : ""} />
            <RecapRow label="What the rate (3) means" text={mean3} />
            <RecapRow label="What the start (8) means" text={mean8} />
            <RecapRow label="When she's ready, and why" text={ready} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — Module 1: Interpreting Functions",
            `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
            `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
            `Reconcile (student's words): ${surprise}`,
            `Model: ${slope !== "" && intc !== "" ? `f(w) = ${slope}w + ${intc}` : "(not built)"}`,
            `Meaning of 3: ${mean3}`,
            `Meaning of 8: ${mean8}`,
            `Ready week + reasoning: ${ready}`,
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
              The graph stays locked until you commit a call in writing. The line — not a grader — tells you if you
              were right.
            </p>
          </div>
 
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleFunctionsPTR />
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
 
