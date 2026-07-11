import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
import { useTelemetry } from "../lib/TelemetryContext";

// Bump on pedagogically meaningful change only (spec §4.6); roundIds are append-only.
// This is the suite shell's version; each internal module carries its own
// `version` in the MODULES registry below (§8 suite-grain ruling).
export const MODULE_VERSION = "1.0.0";

const SUITE = "algebra-remediation";
 
/* Session store: each module reports its copy-lines here; the app-level
   "Copy my whole session" button reads the union across all modules. */
const SessionContext = createContext(null);
 
// Thin-verdict detector for the #2 gate: empty-ish or non-attempts.
function isThinVerdict(v) {
  const t = (v || "").trim().toLowerCase();
  if (t.length < 15) return true;
  return /^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|i dont know|not sure)\.?$/.test(t);
}
 
// Hook a module uses to report its current export lines into the session.
function useSessionReport(title, lines) {
  const ctx = useContext(SessionContext);
  const joined = (lines || []).filter(Boolean).join("\n");
  useEffect(() => {
    if (ctx) ctx.record(title, joined);
  }, [ctx, title, joined]);
}
 
/* ============================================================================
   ALGEBRA I — SUMMER REMEDIATION (prototype)
   Reasoning-first, judge → producer → recap. Standalone; React only.
 
   Module 1 — Interpreting Functions (F-IF.A.2, F-IF.B.4, LEAP.I.A1.1)
   Module 2 — Systems of Equations  (A-REI.C.6, A-REI.D.10–12)
 
   Design principles (from the LA remediation design doc):
   - The student is NEVER told their own work is wrong. Coach redirects.
   - Build the math, then explain what it means and why it's true
     (mirrors the LEAP reasoning/computation rubric split).
   - Verdict gates never hard-block: any submitted verdict advances; an
     unmatched one gets an ADDITIVE "here's the piece I'd add" Coach note.
   - Session-only state (no storage). Copy-results button at the end.
   ============================================================================ */
 
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
 
/* Copy that works inside a sandboxed artifact iframe (Clipboard API is often
   blocked by permissions policy). Returns "copied" | "selected" | "failed".
   - Try the async Clipboard API.
   - Fall back to selecting a hidden textarea + execCommand('copy').
   - If both fail, select the visible textarea (by id) so the student can ⌘/Ctrl-C.
   Never reports success unless a copy actually happened. */
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
  // Last resort: select the visible textarea so they can copy manually.
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
 
// Default producer floor: reject obvious filler when no objective key exists.
function isFiller(s) {
  const t = (s || "").trim().toLowerCase();
  if (t.length < 6) return true;
  if (/^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|test|asdf|aaa+|\.+|x+|abc|123|qwerty|blah|stuff)\.?$/.test(t)) return true;
  if (/^(.)\1{4,}$/.test(t.replace(/\s/g, ""))) return true; // same char repeated
  return false;
}
 
/* ---------- shared atoms --------------------------------------------------- */
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
 
function Field({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label style={{ display: "block", margin: "12px 0" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 6 }}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.5,
          color: C.ink, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px",
          resize: "vertical" }} />
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
 
/* ---------- shared coordinate plane ---------------------------------------- */
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
  const [status, setStatus] = useState("idle"); // idle | copied | selected | failed
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
 
/* ============================================================================
   MODULE 1 — INTERPRETING FUNCTIONS
   ============================================================================ */
function ModuleFunctions({ emit = () => {} }) {
  const [stage, setStage] = useState("judge");
  // judge
  const [week, setWeek] = useState(0);
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  // producer
  const [slope, setSlope] = useState("");
  const [intc, setIntc] = useState("");
  const [mean3, setMean3] = useState("");
  const [mean8, setMean8] = useState("");
  const [ready, setReady] = useState("");
  const [stuck, setStuck] = useState(false);
 
  const reset = () => { emit({ guideState: stage, action: "reset" });
    setStage("judge"); setWeek(0); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false);
    setSlope(""); setIntc(""); setMean3(""); setMean8(""); setReady(""); };
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; }
    setSubmitted(true);
    emit({ guideState: "judge", action: "check", result: caughtCrossing ? "match" : "miss" }); };
  const startProducer = () => {
    setStage("producer");
    emit({ guideState: "judge", action: "next" });
  };
  const finishModule = (producerOk) => {
    emit({ guideState: "producer", beatId: "producer", action: "check", result: producerOk ? "match" : "miss" });
    emit({ guideState: "producer", action: "complete" });
    setStage("recap");
  };
 
  // Jordan: starts 22, +1/wk. Riley: starts 12, +4/wk. Cross ~ week 3.33.
  const jordan = (w) => 22 + 1 * w;
  const riley = (w) => 12 + 4 * w;
  const yMax = 60, xMax = 10;
  const caughtCrossing = /cross|catch|overtak|pass|faster|rate|slope|stee|week 4|grow/i.test(verdict);
 
  useSessionReport("Module 1 · Interpreting Functions", submitted ? [
    "ALGEBRA — Module 1: Interpreting Functions",
    `Verdict: ${verdict}`,
    `Model: ${slope !== "" && intc !== "" ? `f(w) = ${slope}w + ${intc}` : "(not built)"}`,
    `Meaning of 3: ${mean3}`, `Meaning of 8: ${mean8}`, `Ready week + reasoning: ${ready}`,
  ] : null);
 
  return (
    <section>
      <StageTag>Module 1 · Interpreting Functions</StageTag>
      <H>You're the coach</H>
      <P>Two runners are tracking weekly training time. <b style={{ color: C.blue }}>Jordan</b> started at 22 minutes
        and adds about 1 minute a week. <b style={{ color: C.coral }}>Riley</b> started at 12 minutes and adds about
        4 minutes a week.</P>
      <P><b>Riley says:</b> <i>"I started behind, so Jordan will always be ahead of me."</i> Is Riley right?</P>
 
      <Plane width={440} height={300} xMax={xMax} yMax={yMax} xLabel="week" yLabel="minutes / week">
        {({ sx, sy }) => (
          <>
            <line x1={sx(0)} y1={sy(jordan(0))} x2={sx(xMax)} y2={sy(jordan(xMax))} stroke={C.blue} strokeWidth="2.4" />
            <line x1={sx(0)} y1={sy(riley(0))} x2={sx(xMax)} y2={sy(riley(xMax))} stroke={C.coral} strokeWidth="2.4" />
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
      </label>
      <input type="range" min={0} max={xMax} value={week} onChange={(e) => setWeek(+e.target.value)}
        style={{ width: "100%" }} />
 
      <Field label="Your verdict — is Riley right? Why?" value={verdict} onChange={setVerdict}
        placeholder="Slide through the weeks first, then say what actually happens and why." />
 
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess is worth more than "I don't know." Say what you actually think happens, then submit. No penalty for being wrong here.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caughtCrossing ? (
        <>
          <Coach tone="good">That's the read. Riley starts behind, but a bigger weekly rate means the lines
            cross — around week 4 Riley pulls ahead and stays there. You read the <b>rate</b>, not just the
            starting point. That's exactly the move the test is checking.</Coach>
          <Btn onClick={startProducer}>Now build one yourself →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">Good start — and here's the piece I'd add: slide past week 3 and watch who's
            higher at week 6. The starting point and the growth rate aren't the same thing. Riley's steeper rate
            lets the line catch up and cross. Read what the slope is doing over time.</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={startProducer}>Got it — build one yourself →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
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
                <Btn onClick={() => finishModule(sOk && iOk)}>See the argument you built →</Btn>
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
 
      {stage === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Claim (your verdict)" text={verdict} />
            <RecapRow label="Model you built" text={slope !== "" && intc !== "" ? `f(w) = ${slope}w + ${intc}` : ""} />
            <RecapRow label="What the rate (3) means" text={mean3} />
            <RecapRow label="What the start (8) means" text={mean8} />
            <RecapRow label="When she's ready, and why" text={ready} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — Module 1: Interpreting Functions",
            `Verdict: ${verdict}`,
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
   MODULE 2 — SYSTEMS OF EQUATIONS
   ============================================================================ */
function ModuleSystems({ emit = () => {} }) {
  const [stage, setStage] = useState("judge");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  // producer
  const [eqA, setEqA] = useState("");
  const [eqB, setEqB] = useState("");
  const [px, setPx] = useState("");
  const [py, setPy] = useState("");
  const [meaning, setMeaning] = useState("");
  const [stuck, setStuck] = useState(false);
 
  const reset = () => { emit({ guideState: stage, action: "reset" });
    setStage("judge"); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false);
    setEqA(""); setEqB(""); setPx(""); setPy(""); setMeaning(""); };
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; }
    setSubmitted(true);
    emit({ guideState: "judge", action: "check", result: caughtPoint ? "match" : "miss" }); };
  const startProducer = () => {
    setStage("producer");
    emit({ guideState: "judge", action: "next" });
  };
  const finishModule = (producerOk) => {
    emit({ guideState: "producer", beatId: "producer", action: "check", result: producerOk ? "match" : "miss" });
    emit({ guideState: "producer", action: "complete" });
    setStage("recap");
  };
 
  // judge system: y = 3x - 1 and y = x + 3 -> (2, 5)
  const caughtPoint = /point|both|coordinate|\(2|y\s*=|y-?value|x\s*and\s*y|5|two number|ordered/i.test(verdict);
 
  useSessionReport("Module 2 · Systems of Equations", submitted ? [
    "ALGEBRA — Module 2: Systems of Equations",
    `Verdict: ${verdict}`, `Plan A: ${eqA}`, `Plan B: ${eqB}`,
    `Break-even point: ${px !== "" && py !== "" ? `(${px}, ${py})` : "(not found)"}`,
    `Meaning: ${meaning}`,
  ] : null);
 
  // producer: Plan A 30 + 10m, Plan B 15m -> (6, 90)
  const planA = (m) => 30 + 10 * m;
  const planB = (m) => 15 * m;
  const correctPoint = px.trim() === "6" && py.trim() === "90";
 
  return (
    <section>
      <StageTag>Module 2 · Systems of Equations</StageTag>
      <H>You're the coach</H>
      <P>A student solved this system:</P>
      <pre style={{ fontFamily: "monospace", fontSize: 15, background: C.bg, border: `1px solid ${C.line}`,
        borderRadius: 9, padding: "12px 14px", color: C.ink, overflowX: "auto" }}>
{`y = 3x − 1
y = x + 3
 
3x − 1 = x + 3
2x = 4
x = 2
 
"The solution is 2."`}
      </pre>
      <P>The arithmetic is right. But is <i>"the solution is 2"</i> the whole answer?</P>
 
      <Plane width={440} height={300} xMax={6} yMax={18} xLabel="x" yLabel="y">
        {({ sx, sy }) => (
          <>
            <line x1={sx(0)} y1={sy(-1 < 0 ? 0 : -1)} x2={sx(6)} y2={sy(3 * 6 - 1)} stroke={C.blue} strokeWidth="2.4" />
            <line x1={sx(0)} y1={sy(3)} x2={sx(6)} y2={sy(6 + 3)} stroke={C.coral} strokeWidth="2.4" />
            <circle cx={sx(2)} cy={sy(5)} r="6" fill="none" stroke={C.teal} strokeWidth="2.4" />
            <line x1={sx(2)} y1={sy(5)} x2={sx(2)} y2={sy(0)} stroke={C.teal} strokeDasharray="3 3" />
            <line x1={sx(2)} y1={sy(5)} x2={sx(0)} y2={sy(5)} stroke={C.teal} strokeDasharray="3 3" />
            <text x={sx(2) + 8} y={sy(5) - 6} fontSize="11" fill={C.teal}>(2, 5)?</text>
          </>
        )}
      </Plane>
 
      <Field label="Your verdict — what's missing from their answer?" value={verdict} onChange={setVerdict}
        placeholder="Look at where the lines actually meet on the graph." />
 
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess beats "I don't know." Say what you think is missing, then submit. No penalty for being wrong.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caughtPoint ? (
        <>
          <Coach tone="good">Exactly. The solution to a system is the <b>point</b> where the lines meet — it needs
            both coordinates, <b>(2, 5)</b>. Stopping at <code>x = 2</code> is half the answer. On the test, naming
            the full point is the difference between credit and partial credit.</Coach>
          <Btn onClick={startProducer}>Now build one yourself →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">Good — and here's the piece I'd add: trace up from x = 2 to where the lines actually
            cross. The solution isn't just <code>x = 2</code>; it's the <b>point</b> the two lines share, which has a
            y-value too. What's the full ordered pair?</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={startProducer}>Got it — build one yourself →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Two phone plans</H>
          <P><b style={{ color: C.blue }}>Plan A:</b> $30 sign-up fee, then $10/month. &nbsp;
             <b style={{ color: C.coral }}>Plan B:</b> no fee, $15/month. When do they cost the same?</P>
 
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
                <Btn onClick={() => finishModule(correctPoint)}>See the argument you built →</Btn>
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
 
      {stage === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Claim (your verdict)" text={verdict} />
            <RecapRow label="System you built" text={eqA || eqB ? `${eqA}   /   ${eqB}` : ""} />
            <RecapRow label="Solution (full point)" text={px !== "" && py !== "" ? `(${px}, ${py})` : ""} />
            <RecapRow label="What break-even means" text={meaning} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — Module 2: Systems of Equations",
            `Verdict: ${verdict}`,
            `Plan A: ${eqA}`,
            `Plan B: ${eqB}`,
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
   GENERIC FULL MODULE  (judge → producer → recap)
   A reusable shell so every cluster gets the same spine without duplicating
   200 lines each. A module supplies its content via a config object.
   ----------------------------------------------------------------------------
   config = {
     tag, title, cluster, code,
     judge: { prompt(JSX), visual(JSX|null), input:{label,placeholder},
              caught:RegExp, goodCoach(JSX), redirectCoach(JSX) },
     producer: { title, prompt(JSX),
                 fields:[{key,label,placeholder,rows}],
                 ready:(state)=>bool, goodCoach(JSX) },
     recap: { rows:(state)=>[{label,text}], copy:(state)=>[strings] }
   }
   ============================================================================ */
function FullModule({ config, emit = () => {} }) {
  const [stage, setStage] = useState("judge");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [vals, setVals] = useState({});
  const setVal = (k, v) => setVals((s) => ({ ...s, [k]: v }));
  const reset = () => { emit({ guideState: stage, action: "reset" });
    setStage("judge"); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false); setVals({}); };
  const caught = config.judge.caught.test(verdict);
  const ready = config.producer.ready({ ...vals, verdict });
  // #1 objective validation: check() returns {ok, hint}. No check() → filler floor on all fields.
  const defaultCheck = (s) => {
    const bad = config.producer.fields.find((f) => isFiller(s[f.key]));
    return bad ? { ok: false, hint: "Put a real answer in each box — a sentence in your own words, not a placeholder — then you can move on." } : { ok: true };
  };
  const checkResult = ready ? (config.producer.check ? config.producer.check({ ...vals, verdict }) : defaultCheck({ ...vals, verdict })) : { ok: true };
  const correct = ready && checkResult.ok;
  const wrong = ready && !checkResult.ok && !stuck;
  const passable = correct || stuck;
 
  // #2 thin-verdict gate: one gentle nudge before allowing a non-attempt through.
  const submitVerdict = () => {
    if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; }
    setSubmitted(true);
    emit({ guideState: "judge", action: "check", result: caught ? "match" : "miss" });
  };
  const startProducer = () => {
    setStage("producer");
    emit({ guideState: "judge", action: "next" });
  };
  const finishModule = () => {
    emit({ guideState: "producer", beatId: "producer", action: "check", result: checkResult.ok ? "match" : "miss" });
    emit({ guideState: "producer", action: "complete" });
    setStage("recap");
  };
 
  // #1 session report
  useSessionReport(config.tag, stage === "judge" && !submitted ? null : config.recap.copy({ ...vals, verdict }));
 
  return (
    <section>
      <StageTag>{config.tag}</StageTag>
      <H>You're the coach</H>
      {config.judge.prompt}
      {config.judge.visual}
      <Field label={config.judge.input.label} value={verdict} onChange={setVerdict}
        placeholder={config.judge.input.placeholder} />
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess is worth more than "I don't know." Say what you actually think is going on, then submit. There's no penalty for being wrong here.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caught ? (
        <>
          <Coach tone="good">{config.judge.goodCoach}</Coach>
          <Btn onClick={startProducer}>Now build one yourself →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">{config.judge.redirectCoach}</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={startProducer}>Got it — build one yourself →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>{config.producer.title}</H>
          {config.producer.prompt}
          {config.producer.fields.map((f) => (
            <Field key={f.key} label={f.label} value={vals[f.key] || ""} onChange={(v) => setVal(f.key, v)}
              placeholder={f.placeholder} rows={f.rows || 2} />
          ))}
          {wrong && (
            <>
              <Coach tone="redirect">{checkResult.hint || "Not quite — take another look at the numbers before moving on."}</Coach>
              <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
            </>
          )}
          {passable && (
            <>
              <Coach tone="good">{config.producer.goodCoach}</Coach>
              <Btn onClick={finishModule}>See the argument you built →</Btn>
            </>
          )}
        </div>
      )}
 
      {stage === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            {config.recap.rows({ ...vals, verdict }).map((r, i) => <RecapRow key={i} label={r.label} text={r.text} />)}
          </div>
          <CopyResults lines={config.recap.copy({ ...vals, verdict })} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* ---- Module 3 — Seeing Structure in Expressions (A-SSE) — no graph -------- */
function ModuleExpressions({ emit }) {
  return <FullModule emit={emit} config={{
    tag: "Module 3 · Seeing Structure in Expressions",
    judge: {
      prompt: (<>
        <P>An investment grows by the formula <code style={{ fontFamily: "monospace", background: C.bg, padding: "2px 6px", borderRadius: 5 }}>A = P(1 + r)ⁿ</code>,
          where P is the starting amount, r is the yearly rate, and n is the number of years.</P>
        <P><b>A student says:</b> <i>"The n is the starting amount, because it's the biggest part of the expression."</i> Are they reading the structure right?</P>
      </>),
      visual: (
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "18px 16px", textAlign: "center", margin: "8px 0" }}>
          <span style={{ fontFamily: "monospace", fontSize: 26, color: C.ink }}>
            A = <span style={{ color: C.blue }}>P</span>(1 + <span style={{ color: C.coral }}>r</span>)<sup style={{ color: C.teal }}>n</sup>
          </span>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 10 }}>
            <span style={{ color: C.blue }}>P = start</span> · <span style={{ color: C.coral }}>r = rate</span> · <span style={{ color: C.teal }}>n = years (the exponent)</span>
          </div>
        </div>
      ),
      input: { label: "Your verdict — is n the starting amount? What does each part really represent?",
        placeholder: "Which part is the starting amount? What role does the exponent n play?" },
      caught: /P|starting.*P|exponent|years|n is the (number|exponent|years)|not the start|P is the start|how many times/i,
      goodCoach: (<>Right — <b>P</b> is the starting amount; <b>n</b> is the exponent, the number of years the growth repeats. Size on the page doesn't decide meaning — <b>position and role</b> do. Reading meaning off structure is the whole skill in this cluster.</>),
      redirectCoach: (<>Good start — and here's the piece I'd add: the starting amount is what you multiply <i>by</i> the growth factor, that's <b>P</b>. The <b>n</b> sits up high as an exponent — it counts how many times the growth happens. What does each letter <i>do</i> in the formula?</>),
    },
    producer: {
      title: "Write the structure yourself",
      prompt: (<P>A phone loses value each year: it starts at <b>$800</b> and keeps <b>85%</b> of its value every year. Write the expression for its value after <b>n</b> years, then say what each part means.</P>),
      fields: [
        { key: "expr", label: "Write the expression for the value after n years", placeholder: "800(0.85)ⁿ", rows: 1 },
        { key: "mean", label: "What does the 0.85 represent, and what does the exponent n represent?", placeholder: "0.85 is the factor it keeps each year; n is…" },
      ],
      ready: (s) => (s.expr || "").trim().length > 3 && (s.mean || "").trim().length > 8,
      check: (s) => {
        const e = (s.expr || "").replace(/\s/g, "");
        const has800 = /800/.test(e);
        const hasFactor = /0\.85|85%|\(?\.85/.test(e);
        const hasExp = /\^n|ⁿ|\)n|\*\*n/.test(e) || /\)n/.test(e);
        if (has800 && hasFactor && (hasExp || /n/.test(e))) return { ok: true };
        return { ok: false, hint: "Check the expression: it should start at 800, multiply by the factor it keeps each year (0.85), and raise that to the n. Something like 800(0.85)ⁿ." };
      },
      goodCoach: (<>You built it from structure alone — no graph — and named what each part does. That's exactly what A-SSE asks: interpret parts of an expression in terms of context.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict)", text: s.verdict },
        { label: "Expression you wrote", text: s.expr },
        { label: "What the parts mean", text: s.mean },
      ],
      copy: (s) => ["ALGEBRA — Module 3: Seeing Structure in Expressions", `Verdict: ${s.verdict}`, `Expression: ${s.expr}`, `Meaning: ${s.mean}`],
    },
  }} />;
}
 
/* ---- Module 4 — Solving → Modeling (A-REI.B / A-CED) — the micro-model ---- */
function ModuleModeling({ emit }) {
  return <FullModule emit={emit} config={{
    tag: "Module 4 · Solving → Modeling (the summit)",
    judge: {
      prompt: (<>
        <P>A candle's weight is measured as it burns. The data isn't a perfectly straight line. A student fits a straight line anyway and writes:
          <code style={{ fontFamily: "monospace", display: "block", background: C.bg, padding: "8px 10px", borderRadius: 6, margin: "8px 0" }}>w ≈ 16 − 0.19h  (if the burn rate is believed to be constant)</code></P>
        <P><b>Another student says:</b> <i>"That's wrong — the data isn't actually a straight line, so you can't use a line."</i> Who's right?</P>
      </>),
      visual: (
        <Plane width={440} height={260} xMax={10} yMax={18} xLabel="hours burning (h)" yLabel="weight (oz)">
          {({ sx, sy }) => (<>
            {[[0,16],[1,15.7],[2,15.5],[3,15.1],[4,14.9],[5,15.05],[6,14.7],[7,14.5],[8,14.5]].map(([x,y],i)=>
              <circle key={i} cx={sx(x)} cy={sy(y)} r="3.5" fill={C.coral} />)}
            <line x1={sx(0)} y1={sy(16)} x2={sx(8)} y2={sy(16-0.19*8)} stroke={C.teal} strokeWidth="2.4" />
          </>)}
        </Plane>
      ),
      input: { label: "Your verdict — can you use a straight line on data that isn't perfectly straight?",
        placeholder: "Is a model allowed to be an approximation? What did the first student say about the rate?" },
      caught: /assum|believ|approx|close enough|model|estimat|good enough|state|if.*constant|reasonable|own it|not perfect.*still|simplif/i,
      goodCoach: (<>That's the insight most students miss. The first student is <b>right</b> — <i>because they said "if the burn rate is believed to be constant."</i> A model is allowed to be an approximation as long as you <b>state the assumption and own it.</b> That's the micro-model skill the test rewards at the very top.</>),
      redirectCoach: (<>Good — and here's the piece I'd add: real models are almost never perfect. The first student wrote "<i>if the burn rate is believed to be constant</i>" — they <b>named the assumption</b>. That makes a straight line a defensible, useful model, not an error. Does stating the assumption change your verdict?</>),
    },
    producer: {
      title: "Build the model, own the assumption",
      prompt: (<P>A plant is measured weekly: roughly <b>2 cm</b> at week 0, growing about <b>1.5 cm/week</b> — but not perfectly steadily. Build a linear model, state your assumption, and use it to predict week 6.</P>),
      fields: [
        { key: "model", label: "Your linear model h(w) =", placeholder: "h(w) = 1.5w + 2", rows: 1 },
        { key: "assume", label: "State the simplifying assumption you're making", placeholder: "I'm assuming the growth rate is roughly constant, even though…" },
        { key: "predict", label: "Predict week 6 — and say whether the result is reasonable", placeholder: "h(6) = 11 cm. That seems reasonable because…" },
      ],
      ready: (s) => (s.model||"").trim().length>4 && (s.assume||"").trim().length>10 && (s.predict||"").trim().length>6,
      goodCoach: (<>Saved — your teacher will see this. Check your own work against the goal: did you write a model, name the assumption out loud, predict, and ask whether the result is reasonable? That assume → model → predict → reflect cycle is the Type III modeling skill.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict on the candle)", text: s.verdict },
        { label: "Model you built", text: s.model },
        { label: "Assumption you owned", text: s.assume },
        { label: "Prediction + reflection", text: s.predict },
      ],
      copy: (s) => ["ALGEBRA — Module 4: Solving → Modeling", `Verdict: ${s.verdict}`, `Model: ${s.model}`, `Assumption: ${s.assume}`, `Prediction: ${s.predict}`],
    },
  }} />;
}
 
/* ---- Module 5 — The Real Number System (N-RN) ---------------------------- */
function ModuleRealNumbers({ emit }) {
  return <FullModule emit={emit} config={{
    tag: "Module 5 · The Real Number System",
    judge: {
      prompt: (<>
        <P>A student claims: <i>"Adding two irrational numbers always gives an irrational number."</i></P>
        <P>They point to √2 + √3 as proof. But is the claim <b>always</b> true?</P>
      </>),
      visual: (
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "16px", margin: "8px 0", fontFamily: "monospace", fontSize: 17, color: C.ink }}>
          <div>√2 + √3 ≈ 3.146…  <span style={{ color: C.sub }}>(irrational ✓)</span></div>
          <div style={{ marginTop: 8 }}>√2 + (−√2) = <b style={{ color: C.coral }}>0</b>  <span style={{ color: C.sub }}>(… rational?)</span></div>
        </div>
      ),
      input: { label: "Your verdict — is the claim always true? Find a case that tests it.",
        placeholder: "What happens with √2 + (−√2)? Is the result still irrational?" },
      caught: /counter|√2.*-√2|−√2|cancel|zero|0|rational|not always|sometimes|false|opposite/i,
      goodCoach: (<>Exactly — √2 + (−√2) = <b>0</b>, which is rational. One counterexample breaks an "always" claim. The sum of two irrationals is <i>sometimes</i> irrational, not always. Knowing <b>why</b> a claim fails is the reasoning this cluster scores.</>),
      redirectCoach: (<>Good — and here's the piece I'd add: an "always" claim is broken by a single counterexample. What if the two irrationals are opposites, like √2 and −√2? Add them. Is the result still irrational?</>),
    },
    producer: {
      title: "Classify and justify",
      prompt: (<P>For each, say whether the result is rational or irrational, and <b>why</b>: (a) 3 + √5, (b) √4 × √9, (c) a nonzero rational × an irrational.</P>),
      fields: [
        { key: "ab", label: "Classify (a) 3 + √5 and (b) √4 × √9 — with reasons", placeholder: "(a) irrational because…; (b) √4=2, √9=3, so 6, rational because…" },
        { key: "c", label: "Classify (c) nonzero rational × irrational — and explain the rule", placeholder: "Always irrational, because…" },
      ],
      ready: (s) => (s.ab||"").trim().length>10 && (s.c||"").trim().length>8,
      goodCoach: (<>Saved — your teacher will see this. The test here is whether you gave a <b>reason</b> for each classification, not just the label. Reread yours: does each one say <i>why</i>?</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict)", text: s.verdict },
        { label: "Classified (a) and (b)", text: s.ab },
        { label: "Rule for (c)", text: s.c },
      ],
      copy: (s) => ["ALGEBRA — Module 5: Real Number System", `Verdict: ${s.verdict}`, `(a)(b): ${s.ab}`, `(c): ${s.c}`],
    },
  }} />;
}
 
/* ---- Module 6 — Quantities (N-Q) ----------------------------------------- */
function ModuleQuantities({ emit }) {
  return <FullModule emit={emit} config={{
    tag: "Module 6 · Quantities & Units",
    judge: {
      prompt: (<>
        <P>A car travels 150 miles in 2.5 hours. A student computes the speed:</P>
        <pre style={{ fontFamily: "monospace", fontSize: 15, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", color: C.ink }}>{`150 ÷ 2.5 = 60
"So the speed is 60 miles."`}</pre>
        <P>The arithmetic is right. But is <i>"60 miles"</i> the right way to report it?</P>
      </>),
      visual: null,
      input: { label: "Your verdict — what's wrong with the units in '60 miles'?",
        placeholder: "Speed is distance per time. What unit should the answer carry?" },
      caught: /per hour|mph|miles.*hour|mi\/h|rate|per|unit.*time|not miles|miles per/i,
      goodCoach: (<>Right — 60 <b>miles per hour</b>, not "60 miles." Dividing miles by hours gives a <b>rate</b>, and the unit has to show that. Units aren't decoration; they tell you whether your setup even makes sense.</>),
      redirectCoach: (<>Good — and here's the piece I'd add: track the units through the division. Miles ÷ hours leaves you with miles <i>per</i> hour. "60 miles" drops the time part. What's the full unit on a speed?</>),
    },
    producer: {
      title: "Let units guide the setup",
      prompt: (<P>A recipe needs 250 mL of milk per serving. You're cooking for 6 people and milk comes in 1-liter cartons. How many cartons do you need? Use units to guide each step.</P>),
      fields: [
        { key: "setup", label: "Set up the calculation, keeping units visible", placeholder: "250 mL × 6 = 1500 mL; 1 L = 1000 mL, so…" },
        { key: "answer", label: "Final answer with the right unit + why you rounded the way you did", placeholder: "2 cartons, because you can't buy 1.5 and you need at least…" },
      ],
      ready: (s) => (s.setup||"").trim().length>10 && (s.answer||"").trim().length>8,
      goodCoach: (<>Saved — your teacher will see this. Check yours: did you carry the units through the setup, and did you justify how you rounded? That judgment about level of accuracy is what N-Q is really after.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict)", text: s.verdict },
        { label: "Setup with units", text: s.setup },
        { label: "Answer + accuracy reasoning", text: s.answer },
      ],
      copy: (s) => ["ALGEBRA — Module 6: Quantities & Units", `Verdict: ${s.verdict}`, `Setup: ${s.setup}`, `Answer: ${s.answer}`],
    },
  }} />;
}
 
/* ---- Module 7 — Polynomials (A-APR) -------------------------------------- */
function ModulePolynomials({ emit }) {
  return <FullModule emit={emit} config={{
    tag: "Module 7 · Arithmetic with Polynomials",
    judge: {
      prompt: (<>
        <P>A student subtracts two polynomials:</P>
        <pre style={{ fontFamily: "monospace", fontSize: 14.5, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", color: C.ink, lineHeight: 1.5 }}>{`(3x² + 2x − 5) − (x² − 4x + 1)
= 3x² + 2x − 5 − x² − 4x + 1
= 2x² − 2x − 4`}</pre>
        <P>They distributed the minus sign to the first term only. Where does it go wrong?</P>
      </>),
      visual: null,
      input: { label: "Your verdict — what happened to the minus sign?",
        placeholder: "The minus applies to every term in the second polynomial. Check −4x and +1." },
      caught: /every term|all.*term|sign|distribute|−4x|\+4x|−1|flip|each term|both.*term|whole.*paren|−\(/i,
      goodCoach: (<>Exactly — the minus has to hit <b>every</b> term in the second polynomial: −(x² − 4x + 1) = −x² + 4x − 1. They only flipped the first term. The right answer is 2x² + 6x − 6. Subtraction of polynomials is "add the opposite of the whole thing."</>),
      redirectCoach: (<>Good — and here's the piece I'd add: subtracting a polynomial means subtracting <b>all</b> of it. −(x² − 4x + 1) flips every sign: −x² + 4x − 1. They kept −4x and +1 unchanged. Redistribute that minus to each term.</>),
    },
    producer: {
      title: "Add, subtract, and explain closure",
      prompt: (<P>Simplify <b>(2x² − 3x + 4) + (x² + 5x − 7)</b>, then <b>(2x² − 3x + 4) − (x² + 5x − 7)</b>. Then answer: is the result still a polynomial?</P>),
      fields: [
        { key: "work", label: "Both results (show the combining)", placeholder: "Sum: 3x² + 2x − 3.  Difference: x² − 8x + 11." },
        { key: "closure", label: "Is the result always a polynomial? Why? (this is 'closure')", placeholder: "Yes — adding/subtracting polynomials gives a polynomial because…" },
      ],
      ready: (s) => (s.work||"").trim().length>10 && (s.closure||"").trim().length>8,
      check: (s) => {
        const w = (s.work || "").replace(/\s/g, "").toLowerCase();
        // sum = 3x²+2x−3 ; difference = x²−8x+11. Accept if the sum's signature terms appear.
        const sumOk = /3x[²2\^]?2?/.test(w) && /2x/.test(w) && /(-|−)3/.test(w);
        const diffOk = /(^|[^0-9])x[²2\^]?2?/.test(w) && /(-|−)8x/.test(w) && /11/.test(w);
        if (sumOk || diffOk) return { ok: true };
        return { ok: false, hint: "Recheck the combining. Sum: 3x² + 2x − 3. Difference: distribute the minus to every term → x² − 8x + 11. Show at least one of those fully." };
      },
      goodCoach: (<>You combined like terms correctly <b>and</b> explained closure — that polynomials stay polynomials under + and −, just like integers stay integers. That structural insight is what A-APR is really about.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict)", text: s.verdict },
        { label: "Your sum and difference", text: s.work },
        { label: "Closure explanation", text: s.closure },
      ],
      copy: (s) => ["ALGEBRA — Module 7: Polynomials", `Verdict: ${s.verdict}`, `Work: ${s.work}`, `Closure: ${s.closure}`],
    },
  }} />;
}
 
/* ---- Module 8 — Creating Equations (A-CED) ------------------------------- */
function ModuleCreatingEquations({ emit }) {
  return <FullModule emit={emit} config={{
    tag: "Module 8 · Creating Equations",
    judge: {
      prompt: (<>
        <P>A food truck has $500 to spend. Buns cost $0.30 each and patties cost $0.80 each. A student writes the constraint as:</P>
        <pre style={{ fontFamily: "monospace", fontSize: 15, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", color: C.ink }}>{`0.30b + 0.80p = 500`}</pre>
        <P>The problem says they can spend <b>up to</b> $500. Did they capture that correctly?</P>
      </>),
      visual: null,
      input: { label: "Your verdict — does '=' capture 'up to $500'?",
        placeholder: "'Up to' means at most. What symbol shows 'no more than'?" },
      caught: /≤|less than or equal|at most|inequalit|not equal|up to|no more|≦|<=|should be.*≤/i,
      goodCoach: (<>Right — "up to $500" means <b>at most</b>, so it's <b>0.30b + 0.80p ≤ 500</b>, not "=". An equals sign forces them to spend exactly $500. Matching the symbol to the real-world constraint is the heart of A-CED.</>),
      redirectCoach: (<>Good — and here's the piece I'd add: "=" says they spend <i>exactly</i> $500 every time. But "up to" allows anything at or below. What symbol means "less than or equal to"?</>),
    },
    producer: {
      title: "Translate the constraint yourself",
      prompt: (<P>A student is saving for a $1,200 laptop. They have $300 now and save $75 per week. Write an equation/inequality for when they can afford it, and say what your variable means.</P>),
      fields: [
        { key: "eq", label: "Your equation or inequality (define the variable)", placeholder: "Let w = weeks. 300 + 75w ≥ 1200" },
        { key: "why", label: "Why that symbol, and what does the solution mean?", placeholder: "≥ because they can afford it once savings reach or pass $1200…" },
      ],
      ready: (s) => (s.eq||"").trim().length>6 && (s.why||"").trim().length>8,
      goodCoach: (<>Saved — your teacher will see this. Check yours: did you define the variable, pick the symbol that matches the situation, and say what the solution means? That's what makes an equation <i>faithfully model</i> the context.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict)", text: s.verdict },
        { label: "Equation you built", text: s.eq },
        { label: "Why that symbol", text: s.why },
      ],
      copy: (s) => ["ALGEBRA — Module 8: Creating Equations", `Verdict: ${s.verdict}`, `Equation: ${s.eq}`, `Reasoning: ${s.why}`],
    },
  }} />;
}
 
/* ---- Module 9 — Building Functions (F-BF) -------------------------------- */
// Live parabola plotter shared by both stages of F-BF.
function ParabolaPlot({ curves, k }) {
  return (
    <Plane width={440} height={300} xMax={6} yMax={20} xLabel="x" yLabel="y">
      {({ sx, sy }) => {
        const pts = (f) => Array.from({ length: 49 }, (_, i) => { const x = -3 + i * 0.1875; return [x, f(x)]; })
          .filter(([x, y]) => x >= -0.05 && y >= -0.5 && y <= 20.5 && x <= 6)
          .map(([x, y]) => `${sx(Math.max(0, x))},${sy(Math.max(0, Math.min(20, y)))}`).join(" ");
        return (<>
          <polyline points={pts((x) => x * x)} fill="none" stroke={C.sub} strokeWidth="1.6" strokeDasharray="4 3" />
          {curves.map((c, i) => <polyline key={i} points={pts(c.f)} fill="none" stroke={c.color} strokeWidth="2.6" />)}
          {curves.map((c, i) => <text key={`l${i}`} x={c.lx ? sx(c.lx) : 8} y={sy(c.ly)} fontSize="11" fill={c.color}>{c.label}</text>)}
          <text x={sx(1.5)} y={sy(2.4)} fontSize="10" fill={C.sub}>f(x)=x²</text>
        </>);
      }}
    </Plane>
  );
}
 
function ModuleBuildingFunctions({ emit = () => {} }) {
  const [stage, setStage] = useState("judge");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [k, setK] = useState(3);                 // judge slider
  const [dir, setDir] = useState("up");          // producer: which transform to build
  const [amt, setAmt] = useState(4);             // producer slider
  const [why, setWhy] = useState("");
  const [stuck, setStuck] = useState(false);
  const reset = () => { emit({ guideState: stage, action: "reset" });
    setStage("judge"); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false); setK(3); setDir("up"); setAmt(4); setWhy(""); };
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; }
    setSubmitted(true);
    emit({ guideState: "judge", action: "check", result: caught ? "match" : "miss" }); };
  const startProducer = () => {
    setStage("producer");
    emit({ guideState: "judge", action: "next" });
  };
  // The built transformation is correct by construction (picker + slider);
  // only the explanation is collected — so the producer check carries no result.
  const finishModule = () => {
    emit({ guideState: "producer", beatId: "producer", action: "check" });
    emit({ guideState: "producer", action: "complete" });
    setStage("recap");
  };
 
  const caught = /no|differ|up.*left|left.*up|outside.*vert|inside.*horiz|vertical.*horizontal|not the same|\+3 outside|outside.*input|one up.*one|direction|moves? (up|left)/i.test(verdict);
 
  // producer correctness: did they pick a function form matching the requested move?
  const moves = {
    up:   { label: "up 4 → f(x) + 4",     f: (x) => x * x + amt,        kind: "outside (+)" },
    down: { label: "down 4 → f(x) − 4",   f: (x) => x * x - amt,        kind: "outside (−)" },
    left: { label: "left 4 → f(x + 4)",   f: (x) => (x + amt) * (x + amt), kind: "inside (+)" },
    right:{ label: "right 4 → f(x − 4)",  f: (x) => (x - amt) * (x - amt), kind: "inside (−)" },
  };
 
  useSessionReport("Module 9 · Building Functions", submitted ? [
    "ALGEBRA — Module 9: Building Functions",
    `Verdict: ${verdict}`, `Built: ${moves[dir].label} — ${moves[dir].kind}`, `Reasoning: ${why}`,
  ] : null);
 
  return (
    <section>
      <StageTag>Module 9 · Building Functions</StageTag>
      <H>You're the coach</H>
      <P>Starting from f(x) = x², a student says: <i>"f(x) + k and f(x + k) are the same — both just move the graph by k."</i></P>
      <P>Drag k and watch both curves. Are the two shifts the same?</P>
 
      <ParabolaPlot curves={[
        { f: (x) => x * x + k, color: C.blue, label: `f(x)+${k}`, lx: 2.2, ly: 4 * 1 + k > 19 ? 19 : 4 + k },
        { f: (x) => (x + k) * (x + k), color: C.coral, label: `f(x+${k})`, lx: 0.2, ly: 12 },
      ]} k={k} />
      <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.sub }}>
        k = {k} — blue is f(x)+{k} (outside), coral is f(x+{k}) (inside)
      </label>
      <input type="range" min={0} max={4} step={1} value={k} onChange={(e) => setK(+e.target.value)} style={{ width: "100%" }} />
 
      <Field label="Your verdict — are f(x)+k and f(x+k) the same shift?" value={verdict} onChange={setVerdict}
        placeholder="Watch which direction each curve moves as k grows — up/down vs left/right." />
 
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess beats "I don't know." Say what you actually see happening, then submit. No penalty for being wrong.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caught ? (
        <>
          <Coach tone="good">Exactly — <b>f(x)+k</b> moves the graph <b>up</b> (the k is outside, it changes the output); <b>f(x+k)</b> moves it <b>left</b> (the k is inside, it changes the input). Outside vs inside the function is the whole distinction.</Coach>
          <Btn onClick={startProducer}>Now build one yourself →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">Good start — and here's the piece I'd add: set k back to 0, then drag up slowly. The blue curve (k outside) slides <b>up</b>; the coral curve (k inside) slides <b>left</b>. A change <i>outside</i> f moves output (vertical); <i>inside</i> moves input (horizontal). Same k, different direction.</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={startProducer}>Got it — build one yourself →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Make the move happen</H>
          <P>Pick a target move, drag the amount, and watch your function build itself. Then explain <b>why</b> it goes that way.</P>
 
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
            {Object.keys(moves).map((d) => (
              <button key={d} onClick={() => setDir(d)}
                style={{ flex: "1 1 70px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "8px 6px",
                  borderRadius: 9, cursor: "pointer", textTransform: "capitalize",
                  border: `1px solid ${dir === d ? C.ink : C.line}`, background: dir === d ? C.ink : C.panel,
                  color: dir === d ? C.bg : C.ink }}>{d}</button>
            ))}
          </div>
 
          <ParabolaPlot curves={[{ f: moves[dir].f, color: C.teal, label: moves[dir].label, lx: 0.2, ly: 18 }]} k={amt} />
          <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.sub }}>
            amount = {amt} → <span style={{ fontFamily: "monospace" }}>{moves[dir].label.split("→")[1]}</span> · {moves[dir].kind}
          </label>
          <input type="range" min={1} max={4} step={1} value={amt} onChange={(e) => setAmt(+e.target.value)} style={{ width: "100%" }} />
 
          <Field label={`Why does "${dir}" use ${moves[dir].kind.includes("inside") ? "an inside" : "an outside"} change?`} value={why} onChange={setWhy}
            placeholder={moves[dir].kind.includes("inside") ? "It's inside the function, acting on x before squaring, so it shifts horizontally…" : "It's outside the function, acting on the output, so it shifts vertically…"} />
 
          {why.trim().length > 10 && (
            (!isFiller(why) || stuck) ? (
              <>
                <Coach tone="good">Your transformation is built correctly — the equation form matches the move you picked. Saved for your teacher. Your explanation of inside-vs-outside is in your words; reread it and make sure it says which one you used and why.</Coach>
                <Btn onClick={finishModule}>See the argument you built →</Btn>
              </>
            ) : (
              <>
                <Coach tone="redirect">Say it in real words: is the change inside or outside the function, and which direction does that move the graph? A sentence, not a placeholder.</Coach>
                <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
              </>
            )
          )}
        </div>
      )}
 
      {stage === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Claim (your verdict)" text={verdict} />
            <RecapRow label="Transformation you built" text={`${moves[dir].label} (${moves[dir].kind})`} />
            <RecapRow label="Why it moves that way" text={why} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — Module 9: Building Functions",
            `Verdict: ${verdict}`,
            `Built: ${moves[dir].label} — ${moves[dir].kind}`,
            `Reasoning: ${why}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* ---- Module 10 — Linear, Quadratic & Exponential Models (F-LE) ----------- */
function ModuleLinExpModels({ emit = () => {} }) {
  const [stage, setStage] = useState("judge");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [yr, setYr] = useState(4);               // judge: how many years to reveal
  const [step, setStep] = useState("add");       // producer: add or multiply
  const [param, setParam] = useState(50);        // producer: +amount or ×factor(/100)
  const [type, setType] = useState("");
  const [func, setFunc] = useState("");
  const [stuck, setStuck] = useState(false);
  const reset = () => { emit({ guideState: stage, action: "reset" });
    setStage("judge"); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false); setYr(4); setStep("add"); setParam(50); setType(""); setFunc(""); };
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; }
    setSubmitted(true);
    emit({ guideState: "judge", action: "check", result: caught ? "match" : "miss" }); };
  const startProducer = () => {
    setStage("producer");
    emit({ guideState: "judge", action: "next" });
  };
  const finishModule = (producerOk) => {
    emit({ guideState: "producer", beatId: "producer", action: "check", result: producerOk ? "match" : "miss" });
    emit({ guideState: "producer", action: "complete" });
    setStage("recap");
  };
 
  const caught = /no|differ|linear.*expon|expon.*linear|add.*multipl|multipl.*add|constant (difference|ratio)|×|times|ratio|not the same|diverge|curve|gap/i.test(verdict);
 
  const linA = (n) => 100 + 50 * n;        // +50/yr
  const expB = (n) => 100 * Math.pow(1.5, n); // ×1.5/yr
  const yMax = 700, xMax = 8;
 
  // producer model
  const isAdd = step === "add";
  const prodF = (n) => isAdd ? 100 + param * n : 100 * Math.pow(param / 100, n);
  const prodLabel = isAdd ? `100 + ${param}·n  (linear)` : `100 · ${(param / 100).toFixed(2)}ⁿ  (exponential)`;
 
  useSessionReport("Module 10 · Linear/Quadratic/Exponential Models", submitted ? [
    "ALGEBRA — Module 10: Linear/Quadratic/Exponential Models",
    `Verdict: ${verdict}`, `Growth: ${prodLabel}`, `Type: ${type}`, `Function: ${func}`,
  ] : null);
 
  return (
    <section>
      <StageTag>Module 10 · Linear, Quadratic & Exponential Models</StageTag>
      <H>You're the coach</H>
      <P>Two savings plans. <b style={{ color: C.blue }}>Plan A</b> adds $50/year. <b style={{ color: C.coral }}>Plan B</b> multiplies by 1.5/year. Both start at $100.</P>
      <P><b>A student says:</b> <i>"Both grow the same way — they start together and Plan B is barely ahead."</i> Drag the years forward. Same kind of growth?</P>
 
      <Plane width={440} height={300} xMax={xMax} yMax={yMax} xLabel="year" yLabel="$ balance">
        {({ sx, sy }) => {
          const line = (f) => Array.from({ length: yr + 1 }, (_, n) => `${sx(n)},${sy(Math.min(yMax, f(n)))}`).join(" ");
          return (<>
            <polyline points={line(linA)} fill="none" stroke={C.blue} strokeWidth="2.6" />
            <polyline points={line(expB)} fill="none" stroke={C.coral} strokeWidth="2.6" />
            {Array.from({ length: yr + 1 }, (_, n) => (<g key={n}>
              <circle cx={sx(n)} cy={sy(Math.min(yMax, linA(n)))} r="3" fill={C.blue} />
              <circle cx={sx(n)} cy={sy(Math.min(yMax, expB(n)))} r="3" fill={C.coral} />
            </g>))}
            <text x={sx(yr)} y={sy(Math.min(yMax, linA(yr))) + 16} fontSize="11" fill={C.blue} textAnchor="end">${linA(yr)}</text>
            <text x={sx(yr)} y={sy(Math.min(yMax, expB(yr))) - 8} fontSize="11" fill={C.coral} textAnchor="end">${Math.round(expB(yr))}</text>
          </>);
        }}
      </Plane>
      <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.sub }}>
        years shown = {yr} — gap at year {yr}: <b>${Math.round(expB(yr) - linA(yr))}</b>
      </label>
      <input type="range" min={1} max={xMax} value={yr} onChange={(e) => setYr(+e.target.value)} style={{ width: "100%" }} />
 
      <Field label="Your verdict — same growth type? What happens to the gap?" value={verdict} onChange={setVerdict}
        placeholder="Does Plan A add the same amount each year, or multiply? What does the gap do as years pass?" />
 
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess beats "I don't know." Say what you see the gap doing, then submit. No penalty for being wrong.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caught ? (
        <>
          <Coach tone="good">Right — Plan A <b>adds 50 every year</b> (constant difference → <b>linear</b>, a straight line); Plan B <b>multiplies by 1.5</b> (constant ratio → <b>exponential</b>, a curve that runs away). They start close, then the gap explodes. Add-vs-multiply is how you pick the model.</Coach>
          <Btn onClick={startProducer}>Now build one yourself →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">Good start — and here's the piece I'd add: drag the years all the way out and watch the gap. A straight line (adding) can't keep up with a curve (multiplying). Plan A goes +50, +50; Plan B goes ×1.5, ×1.5. One is linear, one is exponential — what's the difference?</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={startProducer}>Got it — build one yourself →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Add or multiply?</H>
          <P>Choose how your model grows from $100, drag the parameter, and watch the shape. A straight line means linear; a curve means exponential.</P>
 
          <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            {[["add", "Add each year (+)"], ["mult", "Multiply each year (×)"]].map(([d, lab]) => (
              <button key={d} onClick={() => { setStep(d); setParam(d === "add" ? 50 : 150); }}
                style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "9px 6px", borderRadius: 9,
                  cursor: "pointer", border: `1px solid ${step === d ? C.ink : C.line}`,
                  background: step === d ? C.ink : C.panel, color: step === d ? C.bg : C.ink }}>{lab}</button>
            ))}
          </div>
 
          <Plane width={440} height={300} xMax={8} yMax={isAdd ? 700 : 900} xLabel="year (n)" yLabel="$ balance">
            {({ sx, sy }) => {
              const cap = isAdd ? 700 : 900;
              const line = Array.from({ length: 9 }, (_, n) => `${sx(n)},${sy(Math.min(cap, prodF(n)))}`).join(" ");
              return (<><polyline points={line} fill="none" stroke={C.teal} strokeWidth="2.6" />
                {Array.from({ length: 9 }, (_, n) => <circle key={n} cx={sx(n)} cy={sy(Math.min(cap, prodF(n)))} r="3" fill={C.teal} />)}</>);
            }}
          </Plane>
          <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.sub }}>
            {isAdd ? `+ $${param}/year` : `× ${(param / 100).toFixed(2)}/year`} → <span style={{ fontFamily: "monospace" }}>{prodLabel}</span>
          </label>
          <input type="range" min={isAdd ? 10 : 110} max={isAdd ? 100 : 250} step={isAdd ? 10 : 10}
            value={param} onChange={(e) => setParam(+e.target.value)} style={{ width: "100%" }} />
 
          <Field label="Is your model linear or exponential, and how can you tell from the shape?" value={type} onChange={setType}
            placeholder={isAdd ? "Linear — it's a straight line because I add the same amount each year…" : "Exponential — it curves upward because I multiply by a constant factor…"} rows={2} />
          <Field label="Write the function for the balance after n years" value={func} onChange={setFunc}
            placeholder={isAdd ? `P(n) = 100 + ${param}n` : `P(n) = 100(${(param / 100).toFixed(2)})ⁿ`} rows={1} />
 
          {type.trim().length > 10 && func.trim().length > 5 && (() => {
            const wantLinear = isAdd;
            const saysLinear = /linear|straight|add|constant difference/i.test(type) && !/expon/i.test(type);
            const saysExp = /expon|curv|multipl|constant ratio|×|times/i.test(type) && !/\blinear\b/i.test(type);
            const typeMatches = wantLinear ? saysLinear : saysExp;
            const fillerOk = !isFiller(type) && !isFiller(func);
            if ((typeMatches && fillerOk) || stuck) return (
              <>
                <Coach tone="good">Your label matches the shape you built, and your function is saved for your teacher. Reread your explanation — does it say how the straight-line-vs-curve signature told you which type it is?</Coach>
                <Btn onClick={() => finishModule(typeMatches)}>See the argument you built →</Btn>
              </>
            );
            return (
              <>
                <Coach tone="redirect">{!typeMatches
                  ? `Look again at the shape you built: ${isAdd ? "adding the same amount each year is a straight line — that's linear." : "multiplying by a constant factor curves upward — that's exponential."} Match your label to it.`
                  : "Write a real function and a real explanation in each box — not a placeholder."}</Coach>
                <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
              </>
            );
          })()}
        </div>
      )}
 
      {stage === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Claim (your verdict)" text={verdict} />
            <RecapRow label="Growth you chose" text={prodLabel} />
            <RecapRow label="Type + how you knew" text={type} />
            <RecapRow label="Function you built" text={func} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — Module 10: Linear/Quadratic/Exponential Models",
            `Verdict: ${verdict}`,
            `Growth: ${prodLabel}`,
            `Type: ${type}`,
            `Function: ${func}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* ---- Module 11 — Interpreting Data (S-ID) -------------------------------- */
function ModuleData({ emit }) {
  return <FullModule emit={emit} config={{
    tag: "Module 11 · Interpreting Categorical & Quantitative Data",
    judge: {
      prompt: (<>
        <P>A study finds that towns with more ice cream shops have more swimming-pool accidents. A student concludes:</P>
        <pre style={{ fontFamily: "monospace", fontSize: 14.5, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", color: C.ink }}>{`"Ice cream shops cause pool accidents."`}</pre>
        <P>The data really does show a strong positive correlation. Is the conclusion sound?</P>
      </>),
      visual: (
        <Plane width={440} height={260} xMax={10} yMax={10} xLabel="ice cream shops" yLabel="pool accidents">
          {({ sx, sy }) => (<>
            {[[1,1.5],[2,2.2],[3,2.8],[4,4.1],[5,4.4],[6,5.6],[7,6.2],[8,7.5],[9,8.1]].map(([x,y],i)=>
              <circle key={i} cx={sx(x)} cy={sy(y)} r="3.5" fill={C.blue} />)}
            <line x1={sx(0.5)} y1={sy(0.9)} x2={sx(9.5)} y2={sy(8.7)} stroke={C.coral} strokeWidth="2" strokeDasharray="5 4" />
          </>)}
        </Plane>
      ),
      input: { label: "Your verdict — does correlation prove ice cream causes accidents?",
        placeholder: "Could a third thing (like hot weather) drive both?" },
      caught: /correlation.*caus|caus.*correlation|not caus|third|lurking|confound|weather|summer|hot|doesn'?t (mean|prove) caus|both.*caused|other (factor|variable)/i,
      goodCoach: (<>Exactly — <b>correlation isn't causation</b>. A third factor — hot weather — drives both ice cream sales <i>and</i> swimming, and therefore pool accidents. The line is real; the causal story isn't. Spotting that gap is the reasoning S-ID is after.</>),
      redirectCoach: (<>Good — and here's the piece I'd add: a strong line shows the two move <i>together</i>, not that one <b>causes</b> the other. Ask what else could push both up at once. What happens to ice cream sales <i>and</i> swimming when it's hot out?</>),
    },
    producer: {
      title: "Interpret a line of best fit",
      prompt: (<P>Students' study hours vs. test scores give a best-fit line <code style={{ fontFamily: "monospace" }}>score = 6·(hours) + 52</code>. Interpret the <b>slope</b> and the <b>intercept</b> in context — and state one limit of the model.</P>),
      fields: [
        { key: "slopeint", label: "What do the slope (6) and intercept (52) mean here?", placeholder: "Slope: each extra hour adds ~6 points. Intercept: with 0 hours…" },
        { key: "limit", label: "Name one limit — where does the model stop making sense?", placeholder: "It can't predict above 100; very high hours would…" },
      ],
      ready: (s) => (s.slopeint||"").trim().length>12 && (s.limit||"").trim().length>8,
      goodCoach: (<>Saved — your teacher will see this. Check yours: did you read the slope as a rate, the intercept as a starting value, and name where the model breaks down? Interpreting a fit <i>and</i> its limits is the S-ID skill.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict)", text: s.verdict },
        { label: "Slope + intercept meaning", text: s.slopeint },
        { label: "Limit of the model", text: s.limit },
      ],
      copy: (s) => ["ALGEBRA — Module 11: Interpreting Data", `Verdict: ${s.verdict}`, `Slope/intercept: ${s.slopeint}`, `Limit: ${s.limit}`],
    },
  }} />;
}
 
/* ============================================================================
   SHELL
   ============================================================================ */
// slug/version = the internal-grain moduleId + MODULE_VERSION (§8 ruling);
// roundId = the internal module's fixed judge scenario, append-only (spec §4.6).
const MODULES = [
  { id: 1, slug: "interpreting-functions", version: "1.0.0", roundId: "jordan-vs-riley-run", title: "Interpreting Functions", Comp: ModuleFunctions, cluster: "F-IF" },
  { id: 2, slug: "systems-of-equations", version: "1.0.0", roundId: "solution-is-2", title: "Systems of Equations", Comp: ModuleSystems, cluster: "A-REI (systems)" },
  { id: 3, slug: "seeing-structure", version: "1.0.0", roundId: "decay-800-0.85n", title: "Seeing Structure in Expressions", Comp: ModuleExpressions, cluster: "A-SSE" },
  { id: 4, slug: "solving-modeling", version: "1.0.0", roundId: "plant-1.5w+2", title: "Solving → Modeling", Comp: ModuleModeling, cluster: "A-REI.B / A-CED" },
  { id: 5, slug: "real-number-system", version: "1.0.0", roundId: "classify-3-plus-sqrt5", title: "Real Number System", Comp: ModuleRealNumbers, cluster: "N-RN" },
  { id: 6, slug: "quantities-units", version: "1.0.0", roundId: "ml-to-cartons", title: "Quantities & Units", Comp: ModuleQuantities, cluster: "N-Q" },
  { id: 7, slug: "polynomials", version: "1.0.0", roundId: "poly-closure", title: "Polynomials", Comp: ModulePolynomials, cluster: "A-APR" },
  { id: 8, slug: "creating-equations", version: "1.0.0", roundId: "savings-300-75w", title: "Creating Equations", Comp: ModuleCreatingEquations, cluster: "A-CED" },
  { id: 9, slug: "building-functions", version: "1.0.0", roundId: "fxk-vs-fxplusk", title: "Building Functions", Comp: ModuleBuildingFunctions, cluster: "F-BF" },
  { id: 10, slug: "linear-quad-exp-models", version: "1.0.0", roundId: "add50-vs-x1.5", title: "Linear/Quad/Exp Models", Comp: ModuleLinExpModels, cluster: "F-LE" },
  { id: 11, slug: "interpreting-data", version: "1.0.0", roundId: "icecream-pools", title: "Interpreting Data", Comp: ModuleData, cluster: "S-ID" },
];

// Read by the StartGate (spec §8): the suite mounts with internal module 1
// live, so the studentCode-dismissal round_enter carries its internal grain.
export const TELEMETRY_ENTRY = {
  moduleId: `${SUITE}/interpreting-functions`,
  moduleVersion: "1.0.0",
  roundId: "jordan-vs-riley-run",
  guideState: "judge",
};
 
// Grouped by LEAP reporting category so a student can match the score report.
const GROUPS = [
  { name: "Number & Quantity", ids: [5, 6] },
  { name: "Algebra", ids: [3, 7, 8, 2, 4] },
  { name: "Functions", ids: [1, 9, 10] },
  { name: "Statistics & Probability", ids: [11] },
];
 
function SessionExport({ store }) {
  const [status, setStatus] = useState("idle");
  const idRef = useRef(nextCopyId());
  const entries = Object.entries(store).filter(([, v]) => v && v.trim());
  const text = entries.length ? entries.map(([, v]) => v).join("\n\n———\n\n") : "";
  const copy = async () => {
    const result = await copyText(text, idRef.current);
    setStatus(result);
    if (result === "copied") setTimeout(() => setStatus("idle"), 2000);
  };
  if (!entries.length) return null;
  const label = status === "copied" ? "Copied ✓"
    : status === "selected" ? "Selected — press ⌘/Ctrl-C"
    : status === "failed" ? "Select box & copy"
    : "Copy my whole session";
  const reveal = status === "selected" || status === "failed";
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 22px 16px" }}>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: C.ink }}>Today's work</div>
          <div style={{ fontSize: 12.5, color: C.sub, marginTop: 1 }}>
            {entries.length} module{entries.length > 1 ? "s" : ""} attempted — hand your teacher everything at once.
          </div>
        </div>
        <Btn onClick={copy}>{label}</Btn>
      </div>
      <textarea id={idRef.current} readOnly value={text} rows={reveal ? 6 : 1}
        onFocus={(e) => e.target.select()}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 8, fontFamily: FONT_BODY, fontSize: 12.5,
          color: C.sub, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px",
          height: reveal ? "auto" : 0, opacity: reveal ? 1 : 0, overflow: "hidden",
          position: reveal ? "static" : "absolute", left: reveal ? "auto" : "-9999px" }} />
    </div>
  );
}
 
export default function App() {
  const [active, setActive] = useState(1);
  const [store, setStore] = useState({});
  const record = useRef((title, text) =>
    setStore((s) => (s[title] === text ? s : { ...s, [title]: text }))).current;
  const ctx = useMemo(() => ({ record }), [record]);
  const mod = MODULES.find((m) => m.id === active);

  const { forModule } = useTelemetry();
  // Internal-grain emitter (§8 ruling), pre-bound to the module's scenario
  // roundId so internals only supply guideState/action/result/beatId.
  const emitFor = (m) => {
    const e = forModule(`${SUITE}/${m.slug}`, m.version);
    return (partial) => e({ roundId: m.roundId, ...partial });
  };
  // Nav select is the suite's round-entry gate (spec §4.5).
  const openModule = (m) => {
    setActive(m.id);
    emitFor(m)({ guideState: "judge", action: "round_enter" });
  };
  return (
    <SessionContext.Provider value={ctx}>
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY, color: C.ink }}>
      <header style={{ borderBottom: `1px solid ${C.line}`, padding: "18px 22px", background: C.panel }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600 }}>Algebra I · Reasoning Lab</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
            Pick the cluster you scored lowest on. Catch the error, build the math, say why it's true.
          </div>
        </div>
      </header>
 
      <nav style={{ maxWidth: 760, margin: "0 auto", padding: "16px 22px 0" }}>
        {GROUPS.map((g) => (
          <div key={g.name} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              color: C.sub, margin: "0 0 7px 2px" }}>{g.name}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {g.ids.map((id) => {
                const m = MODULES.find((x) => x.id === id);
                const on = m.id === active;
                const attempted = Object.keys(store).some((k) => k.includes(m.title) && store[k] && store[k].trim());
                return (
                  <button key={m.id} onClick={() => openModule(m)}
                    style={{ textAlign: "left", border: `1px solid ${on ? C.ink : C.line}`,
                      background: on ? C.ink : C.panel, color: on ? C.bg : C.ink, padding: "8px 13px",
                      borderRadius: 10, cursor: "pointer", fontFamily: FONT_BODY, position: "relative" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {m.title}
                      {attempted && <span title="attempted this session" style={{ color: on ? "#9ad9c0" : C.teal, marginLeft: 6 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "monospace",
                      color: on ? "rgba(255,255,255,.7)" : C.sub, marginTop: 1 }}>{m.cluster}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
 
      <SessionExport store={store} />
 
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "12px 22px 80px" }}>
        {mod?.Comp ? <mod.Comp emit={emitFor(mod)} /> : <div style={{ color: C.sub }}>Coming this summer.</div>}
      </main>
    </div>
    </SessionContext.Provider>
  );
}
 
