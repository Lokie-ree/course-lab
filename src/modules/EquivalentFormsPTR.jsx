import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
import { useTelemetry } from "../lib/TelemetryContext";

// Bump on pedagogically meaningful change only (spec §4.6); roundIds are append-only.
export const MODULE_VERSION = "1.0.0";

// Fixed scenario id (spec §4.2) — the single bet this module runs.
const ROUND_ID = "min-x2-6x+8";
// Read by the StartGate: round_enter fires from the studentCode dismissal (spec §8).
export const TELEMETRY_ENTRY = { roundId: ROUND_ID, guideState: "predict" };
 
/* ============================================================================
   PROTOTYPE — PREDICT → TEST → RECONCILE
   A-SSE.B.3 — Choose and produce an equivalent form of an expression to reveal
   and explain properties of the quantity it represents.
     (b) Complete the square to reveal the minimum value  →  THE BET
     (a) Factor a quadratic to reveal the zeros           →  THE PRODUCER
   Paired with F-IF.C.8a in the LA ALD: "use equivalent forms to reveal and
   explain zeros, extreme values, and symmetry."
 
   The bet: f(x) = x² − 6x + 8. What is the LOWEST value this function reaches?
   Standard form dangles "8" (the constant / y-intercept) where the eye wants
   to grab it. Completing the square — (x−3)² − 1 — reveals the truth: the
   minimum is −1, a full unit BELOW the axis, the opposite side from where 8
   lives. The equivalent form isn't decoration; it's the only form that shows
   the property. That gap (predicted +8, actual −1, wrong side of the axis) is
   the reasoning moment.
 
   The ALD progression names exactly this gap: struggling students *identify*
   equivalent forms; proficient students *use* them to reveal and explain
   extreme values. The bet forces the proficient move.
 
   Carried over VERBATIM from the existing build (the spine, not the skin):
   - Coach / Btn / Field / Plane / RecapRow / CopyResults atoms
   - copyText fallback chain, SessionContext / useSessionReport
   - no-wall principle: the reveal UNLOCKS on commit, never hard-gates
   - verified-praise-only: praise fires only on the call the app checked
     against the algebra; all reconcile prose is saved unjudged for the teacher
 
   Tokens: same iterated palette as the B.4 / D.11 modules. Violet reserved for
   the revealed extreme value / vertex marker. Plane yMin dropped below 0 so the
   below-axis minimum actually renders (the dip IS the lesson).
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
  bg: "#F7F4ED",
  panel: "#FFFFFF",
  ink: "#23211C",
  sub: "#6A675E",
  line: "#E5E0D4",
  indigo: "#3457A6",
  ember: "#C6471F",   // the parabola
  violet: "#6B4FB0",  // revealed extreme value / vertex marker ONLY
  teal: "#1D8A66",
  amber: "#A8740F",
  goodBg: "#E9F4EF",
  goodInk: "#125E47",
  warnBg: "#FAF1DA",
  warnInk: "#74520A",
  neutralBg: "#EDF1F8",
  neutralInk: "#283F66",
};
const FONT_DISPLAY = "'Fraunces','Georgia',serif";
const FONT_BODY = "'Inter','Segoe UI',system-ui,sans-serif";
 
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
 
function Coach({ children, tone = "neutral" }) {
  const bg = tone === "good" ? C.goodBg : tone === "redirect" ? C.warnBg : C.neutralBg;
  const ink = tone === "good" ? C.goodInk : tone === "redirect" ? C.warnInk : C.neutralInk;
  const bar = tone === "good" ? C.teal : tone === "redirect" ? C.amber : C.indigo;
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
function StageTag({ children }) {
  return <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    textTransform: "uppercase", color: C.ember, marginBottom: 6 }}>{children}</div>;
}
function H({ children }) {
  return <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>{children}</h2>;
}
function P({ children, style }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.ink, margin: "10px 0", ...style }}>{children}</p>;
}
function Plane({ width = 440, height = 320, xMin = -1, xMax = 7, yMin = -3, yMax = 11, children, xLabel, yLabel, curves }) {
  const pad = { l: 42, r: 14, t: 14, b: 32 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const sx = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * iw;
  const sy = (y) => pad.t + ih - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * ih;
  const xticks = []; for (let t = Math.ceil(xMin); t <= xMax; t++) xticks.push(t);
  const yticks = []; for (let t = Math.ceil(yMin); t <= yMax; t++) if (t % 2 === 0) yticks.push(t);
  const buildPath = (fn, samples = 120) => {
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      pts.push(`${sx(x).toFixed(2)},${sy(fn(x)).toFixed(2)}`);
    }
    return pts.join(" ");
  };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", background: C.panel,
      border: `1px solid ${C.line}`, borderRadius: 10, display: "block" }}>
      {xticks.map((t) => <line key={`gx${t}`} x1={sx(t)} y1={pad.t} x2={sx(t)} y2={pad.t + ih} stroke="#F0ECE2" />)}
      {yticks.map((t) => <line key={`gy${t}`} x1={pad.l} y1={sy(t)} x2={pad.l + iw} y2={sy(t)} stroke="#F0ECE2" />)}
      {/* x-axis emphasized — the line the minimum sits below */}
      <line x1={pad.l} y1={sy(0)} x2={pad.l + iw} y2={sy(0)} stroke={C.sub} strokeWidth="1.6" />
      <line x1={sx(0)} y1={pad.t} x2={sx(0)} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.2" />
      {xticks.map((t) => <text key={`tx${t}`} x={sx(t)} y={sy(0) + 15} fontSize="10" fill={C.sub} textAnchor="middle">{t}</text>)}
      {yticks.map((t) => <text key={`ty${t}`} x={sx(0) - 6} y={sy(t) + 3} fontSize="10" fill={C.sub} textAnchor="end">{t}</text>)}
      <text x={pad.l + iw / 2} y={height - 1} fontSize="11" fill={C.sub} textAnchor="middle">{xLabel}</text>
      <text x={11} y={pad.t + ih / 2} fontSize="11" fill={C.sub} textAnchor="middle"
        transform={`rotate(-90 11 ${pad.t + ih / 2})`}>{yLabel}</text>
      {(curves || []).map((c, i) => (
        <polyline key={`curve${i}`} points={buildPath(c.f, c.samples)} fill="none"
          stroke={c.color} strokeWidth={c.width || 2.6} strokeLinejoin="round" strokeLinecap="round" />
      ))}
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
 
function isThinPrediction(v) {
  const t = (v || "").trim().toLowerCase();
  if (t.length < 4) return true;
  return /^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|maybe|not sure|i dont know)\.?$/.test(t);
}
 
/* ============================================================================
   PRODUCER BANK — three quadratics that ALL factor over the integers, so the
   skill stays "read the zeros off the factored form" and never collapses into
   the quadratic formula.
   ============================================================================ */
const FACTOR_BANK = [
  { id: "A", a: 1, b: -5, c: 6, std: "x² − 5x + 6", r1: 2, r2: 3,
    factored: "(x − 2)(x − 3)" },                                    // zeros 2, 3
  { id: "B", a: 1, b: 2, c: -15, std: "x² + 2x − 15", r1: -5, r2: 3,
    factored: "(x + 5)(x − 3)" },                                    // zeros −5, 3
  { id: "C", a: 1, b: -1, c: -12, std: "x² − x − 12", r1: -3, r2: 4,
    factored: "(x + 3)(x − 4)" },                                    // zeros −3, 4
];
 
/* ============================================================================
   MODULE — A-SSE.B.3 as predict → test → reconcile
   BET:  f(x) = x² − 6x + 8.  Completed square: (x − 3)² − 1.
         Vertex (3, −1); MINIMUM VALUE = −1, below the axis.
         Trap: the constant term 8 (also the y-intercept) reads as "the bottom."
   PRODUCER: pick a factorable quadratic, factor it, read off the two zeros.
   ============================================================================ */
function ModuleEquivFormsPTR() {
  const [phase, setPhase] = useState("predict"); // predict -> revealed -> producer -> recap
 
  // PREDICT
  const [pick, setPick] = useState("");           // "eight" | "zero" | "negone"
  const [prediction, setPrediction] = useState("");
  const [nudged, setNudged] = useState(false);
 
  // TEST
  const [committed, setCommitted] = useState(false);
  const [showSquare, setShowSquare] = useState(false); // tap to complete the square
 
  // RECONCILE
  const [surprise, setSurprise] = useState("");
 
  // PRODUCER — pick a factorable quadratic, give its zeros
  const [pickQ, setPickQ] = useState("");         // "A" | "B" | "C"
  const [z1, setZ1] = useState("");
  const [z2, setZ2] = useState("");
  const [pWhy, setPWhy] = useState("");
  const [stuck, setStuck] = useState(false);
 
  // The bet parabola: x² − 6x + 8  =  (x − 3)² − 1
  const A = 1, B = -6, Cc = 8;
  const parab = (x) => A * x * x + B * x + Cc;
  const vertexX = -B / (2 * A);              // 3
  const minValue = Cc - (B * B) / (4 * A);   // 8 − 36/4 = −1
  const realMin = "negone";                  // correct choice key
  const predictionWasRight = pick === realMin;
 
  const { emit } = useTelemetry();

  const commit = () => {
    if (pick === "") return;
    if (isThinPrediction(prediction) && !nudged) { setNudged(true); return; }
    setCommitted(true);
    setPhase("revealed");
    emit({ roundId: ROUND_ID, guideState: "predict", action: "check", result: predictionWasRight ? "match" : "miss" });
  };
 
  const revealSquare = () => {
    setShowSquare(true);
    emit({ roundId: ROUND_ID, guideState: "revealed", action: "reveal_earned" });
  };

  const startProducer = () => {
    setPhase("producer");
    emit({ roundId: ROUND_ID, guideState: "revealed", action: "next" });
  };

  const finishModule = (producerOk) => {
    if (producerOk !== undefined) {
      emit({ roundId: ROUND_ID, guideState: "producer", beatId: "producer", action: "check", result: producerOk ? "match" : "miss" });
    }
    emit({ roundId: ROUND_ID, guideState: "producer", action: "complete" });
    setPhase("recap");
  };

  const reset = () => {
    emit({ roundId: ROUND_ID, guideState: phase, action: "reset" });
    setPhase("predict"); setPick(""); setPrediction(""); setNudged(false);
    setCommitted(false); setShowSquare(false); setSurprise("");
    setPickQ(""); setZ1(""); setZ2(""); setPWhy(""); setStuck(false);
  };
 
  const minWord = (k) => k === "eight" ? "8 (the lowest point is 8)"
    : k === "zero" ? "0 (it just touches the x-axis)"
    : k === "negone" ? "−1 (the lowest point dips below the axis)" : "";
  const pickLabel = minWord(pick);
 
  // Producer evaluation
  const chosenQ = FACTOR_BANK.find((q) => q.id === pickQ) || null;
  const z1N = parseFloat(z1), z2N = parseFloat(z2);
  const zerosOk = !!chosenQ && !isNaN(z1N) && !isNaN(z2N) &&
    [z1N, z2N].sort((a, b) => a - b).every((v, i) => v === [chosenQ.r1, chosenQ.r2].sort((a, b) => a - b)[i]);
 
  useSessionReport("Module · A-SSE.B.3 Equivalent forms reveal properties (Predict→Test→Reconcile)",
    (committed) ? [
      "ALGEBRA — A-SSE.B.3: An equivalent form reveals a hidden property",
      `Bet expression: f(x) = x² − 6x + 8`,
      `Prediction (locked before reveal — the minimum value): ${pickLabel} — "${prediction}"`,
      `Completing the square: x² − 6x + 8 = (x − 3)² − 1  ⇒ vertex (3, −1), minimum value −1.`,
      `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
      `Student's reconcile (what surprised them / why): ${surprise || "(not yet written)"}`,
      `Producer quadratic: ${chosenQ ? chosenQ.std : "(not chosen)"}`,
      `Factored form: ${chosenQ ? chosenQ.factored : "—"}`,
      `Zeros the student gave: ${z1 || "?"}, ${z2 || "?"}`,
      `Student's reasoning (how the form reveals the zeros): ${pWhy}`,
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
      <StageTag>A-SSE.B.3 · Predict</StageTag>
      <H>What's the lowest value this function ever reaches?</H>
      <P>Here's the function: <b style={{ color: C.ember }}>f(x) = x² − 6x + 8</b>. It's a parabola that opens
        upward, so it has a single lowest point — a minimum value it never goes below.</P>
      <P style={{ margin: "10px 0 2px" }}><b>No graph yet.</b> Read the expression and make the call: what is the
        smallest value of f(x)? Is the bottom at <b>8</b>, does it bottom out at <b>0</b>, or does it dip to
        <b> −1</b>, below the axis?</P>
 
      <div style={{ margin: "6px 0 2px" }}>
        {choiceBtn("eight", "The minimum is 8 — that's the lowest it goes", C.ember)}
        {choiceBtn("zero", "The minimum is 0 — it bottoms out right on the x-axis", C.amber)}
        {choiceBtn("negone", "The minimum is −1 — it dips just below the axis", C.indigo)}
      </div>
 
      <Field
        label="Why? (one sentence — this locks in before the graph unlocks)"
        value={prediction}
        onChange={setPrediction}
        placeholder="I think the minimum is ___ because ___"
        rows={2}
        disabled={committed}
      />
 
      {nudged && !committed && isThinPrediction(prediction) && (
        <Coach tone="redirect">Commit to a reason — even a hunch you're unsure of. The whole point is to find out
          if you're right, and you can't be wrong-then-fixed if you don't say anything yet. The graph unlocks the
          second you do.</Coach>
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
          <H>There's the graph. Where's the bottom?</H>
          <P>Your call is locked: <b>{pickLabel}</b>. Look at where the curve bottoms out relative to the x-axis.</P>
 
          <Plane width={440} height={320} xMin={-1} xMax={7} yMin={-3} yMax={11}
            xLabel="x" yLabel="f(x)"
            curves={[{ f: parab, color: C.ember, width: 2.8 }]}>
            {({ sx, sy }) => (
              <>
                {/* y-intercept (0, 8) — the value the eye grabs from standard form */}
                <circle cx={sx(0)} cy={sy(8)} r="4" fill={C.ember} opacity={0.55} />
                <text x={sx(0) + 7} y={sy(8) + 4} fontSize="10" fill={C.ember}>(0, 8) ← the constant</text>
                {/* vertex marker — the TRUE minimum, below the axis */}
                <circle cx={sx(vertexX)} cy={sy(minValue)} r="4.5" fill={C.violet} />
                <text x={sx(vertexX) + 7} y={sy(minValue) + 4} fontSize="10" fill={C.violet}>vertex (3, −1)</text>
                {/* once the square is completed, mark how far below the axis the min sits */}
                {showSquare && (
                  <>
                    <line x1={sx(vertexX)} y1={sy(0)} x2={sx(vertexX)} y2={sy(minValue)} stroke={C.violet} strokeWidth="2" strokeDasharray="3 3" />
                    <text x={sx(vertexX) + 7} y={sy(-0.5) + 4} fontSize="10" fill={C.violet}>1 below the axis</text>
                  </>
                )}
              </>
            )}
          </Plane>
 
          {!showSquare && (
            <div style={{ marginTop: 12 }}>
              <P style={{ margin: "0 0 8px" }}>The curve clearly bottoms out <b>below</b> the axis — so the minimum
                isn't 8, and it isn't 0. But where exactly, and why? The standard form <b>x² − 6x + 8</b> hides it.
                Rewrite it in an equivalent form that <b>shows</b> the minimum: complete the square.</P>
              <Btn onClick={revealSquare}>Complete the square →</Btn>
            </div>
          )}
 
          {showSquare && (
            <>
              <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "13px 16px",
                margin: "14px 0", fontFamily: FONT_BODY, fontSize: 15.5, color: C.ink }}>
                <div style={{ fontFamily: "monospace", fontSize: 15, lineHeight: 1.7 }}>
                  x² − 6x + 8<br />
                  = (x² − 6x <b style={{ color: C.amber }}>+ 9</b>) <b style={{ color: C.amber }}>− 9</b> + 8<br />
                  = (x − 3)² <b style={{ color: C.violet }}>− 1</b>
                </div>
                <div style={{ marginTop: 8, color: C.sub, fontSize: 14 }}>
                  A square like (x − 3)² is never negative — its smallest possible value is 0, exactly when x = 3.
                  So the whole expression bottoms out at 0 − 1 = <b style={{ color: C.violet }}>−1</b>. Same function,
                  new form — and this form puts the minimum right where you can read it.
                </div>
              </div>
 
              {/* verified-praise-only: praise ONLY the checked call */}
              {predictionWasRight ? (
                <Coach tone="good">You called it. Completing the square turns x² − 6x + 8 into (x − 3)² − 1, and the
                  <b> −1</b> is the minimum, sitting one unit below the axis at x = 3. You didn't let the constant
                  term 8 stand in for the bottom — you found the form that actually reveals it.</Coach>
              ) : (
                <Coach tone="neutral">The equivalent form (x − 3)² − 1 shows the minimum is <b>−1</b>, reached at
                  x = 3 — one unit below the axis. The 8 in x² − 6x + 8 is the y-intercept (the value at x = 0), not
                  the lowest point. Standard form hides the minimum; completing the square reveals it. Hold onto what
                  you expected and write it below.</Coach>
              )}
            </>
          )}
        </div>
      )}
 
      {/* ---------------- RECONCILE ---------------- */}
      {committed && showSquare && (
        <div style={{ marginTop: 24 }}>
          <StageTag>Reconcile</StageTag>
          <P style={{ marginBottom: 2 }}>
            {predictionWasRight
              ? "You were right — so nail down why. How does completing the square reveal the minimum, when the standard form x² − 6x + 8 doesn't?"
              : "You picked \"" + pickLabel + ",\" but the completed-square form came out (x − 3)² − 1, so the minimum is −1. What did you expect, and what does the new form actually show?"}
          </P>
          <Field
            label={predictionWasRight ? "Say how the equivalent form reveals the minimum — in your own words" : "I thought the bottom was ___, but completing the square showed ___ because ___"}
            value={surprise}
            onChange={setSurprise}
            placeholder={predictionWasRight
              ? "Completing the square shows the minimum because…"
              : "I thought the minimum was ___ because…, but (x − 3)² − 1 shows it's −1 because…"}
            rows={3}
          />
          {surprise.trim().length >= 12 ? (
            <>
              <Coach tone="neutral">Saved for your teacher in your own words — they'll read your reasoning, not a
                score. Now produce an equivalent form yourself — this time, factor one to reveal its zeros.</Coach>
              <Btn onClick={startProducer}>Reveal some zeros →</Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              A sentence or two unlocks the next step. There's no right wording — just say what you noticed.
            </div>
          )}
        </div>
      )}
 
      {/* ---------------- PRODUCER — factor to reveal zeros ---------------- */}
      {phase === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Your turn — let the factored form do the work</H>
          <P>Completing the square revealed a <i>minimum</i>. Factoring reveals a different property: the
            <b> zeros</b> — the x-values where the function equals 0. Pick one of these, factor it, and read the
            two zeros straight off the factors.</P>
 
          <div style={{ margin: "6px 0 4px" }}>
            {FACTOR_BANK.map((q) => {
              const active = pickQ === q.id;
              return (
                <button key={q.id} onClick={() => { setPickQ(q.id); setZ1(""); setZ2(""); }}
                  style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    fontFamily: FONT_BODY, fontSize: 15, color: C.ink,
                    background: active ? C.panel : "transparent",
                    border: `1.5px solid ${active ? C.indigo : C.line}`,
                    boxShadow: active ? `inset 3px 0 0 ${C.indigo}` : "none",
                    borderRadius: 10, padding: "10px 14px", margin: "6px 0", transition: "all .12s",
                    fontWeight: active ? 700 : 500 }}>
                  {q.std}
                </button>
              );
            })}
          </div>
 
          {chosenQ && (
            <>
              <P style={{ margin: "12px 0 2px" }}>You picked <b>{chosenQ.std}</b>. Factor it into the form
                (x ± __)(x ± __), then enter the two zeros — the x-values that make each factor equal 0.</P>
              <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 14, margin: "8px 0 2px" }}>
                <label style={{ display: "inline-flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 5 }}>First zero</span>
                  <input value={z1} onChange={(e) => setZ1(e.target.value)} placeholder="x =" inputMode="decimal"
                    style={{ width: 90, fontFamily: FONT_BODY, fontSize: 16, color: C.ink, background: C.panel,
                      border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 11px" }} />
                </label>
                <label style={{ display: "inline-flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Second zero</span>
                  <input value={z2} onChange={(e) => setZ2(e.target.value)} placeholder="x =" inputMode="decimal"
                    style={{ width: 90, fontFamily: FONT_BODY, fontSize: 16, color: C.ink, background: C.panel,
                      border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 11px" }} />
                </label>
              </div>
 
              <Field label="How does the factored form hand you the zeros? (your words)"
                value={pWhy} onChange={setPWhy}
                placeholder="A product equals zero when one of its factors is zero, so…" rows={2} />
 
              {(() => {
                const filledNums = z1.trim() !== "" && z2.trim() !== "" && !isNaN(z1N) && !isNaN(z2N);
                if (!(filledNums && pWhy.trim().length > 4)) return null;
                const good = zerosOk && !isFiller(pWhy);
                if (good || stuck) return (
                  <>
                    <Coach tone="good">{zerosOk
                      ? `That's it — ${chosenQ.std} factors as ${chosenQ.factored}, so it's zero exactly when x = ${chosenQ.r1} or x = ${chosenQ.r2}. You read both zeros straight off the factors, no formula needed.`
                      : `Saved — but recheck against the factors: ${chosenQ.std} = ${chosenQ.factored}, which is zero when x = ${chosenQ.r1} and x = ${chosenQ.r2}.`}
                      {" "}Your reasoning is in your own words and saved for your teacher.</Coach>
                    <Btn onClick={() => finishModule(zerosOk)}>See what you built →</Btn>
                  </>
                );
                return (
                  <>
                    <Coach tone="redirect">{!zerosOk
                      ? `Set each factor to zero and solve. ${chosenQ.std} factors as ${chosenQ.factored} — what value of x makes each piece 0?`
                      : "Put a real sentence in the box — name the zero-product idea: a product is 0 only when a factor is 0."}</Coach>
                    <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
                  </>
                );
              })()}
            </>
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
            <RecapRow label="What the equivalent form revealed" text={`x² − 6x + 8 = (x − 3)² − 1 ⇒ vertex (3, −1); the minimum value is −1, one unit below the axis.`} />
            <RecapRow label={predictionWasRight ? "How completing the square reveals the minimum (your words)" : "What surprised you, and why (your words)"} text={surprise} />
            <RecapRow label="The quadratic you factored" text={chosenQ ? `${chosenQ.std} = ${chosenQ.factored}` : ""} />
            <RecapRow label="Zeros you read off the factors" text={chosenQ && z1 && z2 ? `x = ${z1}, x = ${z2}` : ""} />
            <RecapRow label="How the form hands you the zeros (your words)" text={pWhy} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — A-SSE.B.3: An equivalent form reveals a hidden property",
            `Bet expression: f(x) = x² − 6x + 8`,
            `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
            `Completed-square form: (x − 3)² − 1 ⇒ minimum value −1 at x = 3`,
            `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
            `Reconcile (student's words): ${surprise}`,
            `Producer quadratic: ${chosenQ ? chosenQ.std : "(not built)"}`,
            `Factored form: ${chosenQ ? chosenQ.factored : "—"}`,
            `Zeros given: ${z1 || "?"}, ${z2 || "?"}`,
            `Zero-product reasoning (student's words): ${pWhy}`,
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
              A-SSE.B.3 — the same expression, written a new way, reveals a property you couldn't see before.
              The graph stays locked until you commit a call in writing. The algebra — not a grader — settles it.
            </p>
          </div>
 
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleEquivFormsPTR />
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
 
