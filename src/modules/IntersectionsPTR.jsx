import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
 
/* ============================================================================
   PROTOTYPE — PREDICT → TEST → RECONCILE
   A-REI.D.11 — Solutions of f(x) = g(x) are the x-values where y = f(x) and
   y = g(x) intersect.
 
   The bet: a line that starts WAY ahead vs. an exponential that starts behind.
   The misconception this targets is durable — students read the head start as
   permanent and don't feel, in their gut, that a constant doubling rate erases
   any linear lead and then runs away from it. The crossing is the solution to
   f(x) = g(x); the second crossing (the curve overtakes again? no — here it
   crosses once) makes "solution = intersection x" concrete and physical.
 
   Carried over VERBATIM from the existing build (per the spine, not the skin):
   - Coach / Btn / Field / NumField / Plane / RecapRow / CopyResults atoms
   - copyText fallback chain, SessionContext / useSessionReport
   - no-wall principle: the reveal UNLOCKS on commit, never hard-gates
   - verified-praise-only: the app praises only the call it checked against the
     curves; the reconcile prose is saved unjudged for the teacher
 
   ITERATED THIS ROUND (explicit, per your note we're moving the tokens):
   - palette C: warmer paper, a two-accent system (indigo line / ember curve)
     plus a single "solution" highlight color used only at the crossing
   - Plane gains an optional curve-plotter (polyline) so g(x) can be nonlinear
   ============================================================================ */
 
const SessionContext = createContext(null);
 
function useSessionReport(title, lines) {
  const ctx = useContext(SessionContext);
  const joined = (lines || []).filter(Boolean).join("\n");
  useEffect(() => {
    if (ctx) ctx.record(title, joined);
  }, [ctx, title, joined]);
}
 
/* ---------- design tokens — ITERATED ---------------------------------------
   Kept the structural roles identical (bg/panel/ink/sub/line + the three
   feedback pairs) so every atom restyles for free. Moved the accents: the old
   blue/coral become a cooler indigo + warmer ember, and "violet" is a new role
   used ONLY to mark the solution at the intersection — it should never appear
   anywhere a student could mistake it for one of the two functions.            */
const C = {
  bg: "#F7F4ED",
  panel: "#FFFFFF",
  ink: "#23211C",
  sub: "#6A675E",
  line: "#E5E0D4",
  indigo: "#3457A6",   // f(x), the line  (was blue)
  ember: "#C6471F",    // g(x), the curve (was coral)
  violet: "#6B4FB0",   // SOLUTION marker only — the intersection x
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
 
/* ---------- shared atoms (logic unchanged; restyle via C) ------------------ */
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
    textTransform: "uppercase", color: C.ember, marginBottom: 6 }}>{children}</div>;
}
function H({ children }) {
  return <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>{children}</h2>;
}
function P({ children, style }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.ink, margin: "10px 0", ...style }}>{children}</p>;
}
 
/* ---------- Plane — ITERATED: now also plots a function curve as a polyline --
   Backward compatible: still accepts a children render-prop receiving {sx,sy}.
   New optional props: curves = [{ f, color, width, samples }] are sampled across
   [0, xMax] and drawn as smooth polylines. Used so g(x) can be exponential.     */
function Plane({ width = 440, height = 300, xMax, yMax, children, xLabel, yLabel, curves }) {
  const pad = { l: 42, r: 14, t: 14, b: 32 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const sx = (x) => pad.l + (x / xMax) * iw;
  const sy = (y) => pad.t + ih - (Math.max(0, Math.min(yMax, y)) / yMax) * ih;
  const xticks = Array.from({ length: xMax + 1 }, (_, i) => i).filter((i) => i % Math.ceil(xMax / 8 || 1) === 0);
  const yticks = Array.from({ length: Math.floor(yMax) + 1 }, (_, i) => i).filter((i) => i % Math.ceil(yMax / 6 || 1) === 0);
  const buildPath = (f, samples = 60) => {
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const x = (i / samples) * xMax;
      pts.push(`${sx(x).toFixed(2)},${sy(f(x)).toFixed(2)}`);
    }
    return pts.join(" ");
  };
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
      {(curves || []).map((c, i) => (
        <polyline key={`curve${i}`} points={buildPath(c.f, c.samples)} fill="none"
          stroke={c.color} strokeWidth={c.width || 2.4} strokeLinejoin="round" strokeLinecap="round" />
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
 
/* ---------- prediction floor (unchanged) ----------------------------------- */
function isThinPrediction(v) {
  const t = (v || "").trim().toLowerCase();
  if (t.length < 4) return true;
  return /^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|maybe|not sure|i dont know)\.?$/.test(t);
}
 
/* ============================================================================
   MODULE — A-REI.D.11 as predict → test → reconcile
   f(x) = 40 + 6x         (the line: a big head start, slow steady growth)
   g(x) = 5 · 2^x         (the curve: starts far behind, doubles each step)
   They are equal where the graphs cross. Solving f(x)=g(x): 40+6x = 5·2^x.
   No closed form — that's the point: the SOLUTION is the intersection x, which
   you READ off the graph / table. It crosses once, between x = 3 and x = 4.
     x:  0    1    2     3     4      5
     f: 40   46   52    58    64     70
     g:  5   10   20    40    80    160
   So g passes f between x=3 (40 vs 58) and x=4 (80 vs 64). Solution ≈ x≈3.6.
   ============================================================================ */
function ModuleIntersectionsPTR() {
  const [phase, setPhase] = useState("predict"); // predict -> revealed -> producer -> recap
 
  // PREDICT
  const [pick, setPick] = useState("");           // "line" | "curve" | "never"
  const [prediction, setPrediction] = useState("");
  const [nudged, setNudged] = useState(false);
 
  // TEST
  const [step, setStep] = useState(0);            // integer x slider 0..6
  const [committed, setCommitted] = useState(false);
 
  // RECONCILE
  const [surprise, setSurprise] = useState("");
 
  // PRODUCER — student reads the solution of a DIFFERENT pair off a table.
  const [solX, setSolX] = useState("");           // they pick which x solves h=k
  const [whyEqual, setWhyEqual] = useState("");    // what "solution" means here
  const [readMethod, setReadMethod] = useState(""); // how they'd find it on a graph
  const [stuck, setStuck] = useState(false);
 
  const f = (x) => 40 + 6 * x;          // line
  const g = (x) => 5 * Math.pow(2, x);  // exponential
  const xMax = 6, yMax = 160;
 
  // Verdict: the curve overtakes the line. "curve" is correct.
  // "line" is the head-start misconception. "never" is the also-common
  // "they're too far apart / it can't catch up" misconception.
  const predictionWasRight = pick === "curve";
  const crossStep = 4; // first integer x where g >= f: g(4)=80 >= f(4)=64
 
  const commit = () => {
    if (pick === "") return;
    if (isThinPrediction(prediction) && !nudged) { setNudged(true); return; }
    setCommitted(true);
    setPhase("revealed");
  };
 
  const reset = () => {
    setPhase("predict"); setPick(""); setPrediction(""); setNudged(false);
    setStep(0); setCommitted(false); setSurprise("");
    setSolX(""); setWhyEqual(""); setReadMethod(""); setStuck(false);
  };
 
  const pickLabel = pick === "line" ? "The line stays on top — the head start holds"
    : pick === "curve" ? "The curve catches the line and passes it"
    : pick === "never" ? "They never meet — the curve can't close that gap" : "";
 
  useSessionReport("Module · A-REI.D.11 Intersections (Predict→Test→Reconcile)",
    (committed) ? [
      "ALGEBRA — A-REI.D.11: Solutions of f(x) = g(x) as intersections",
      `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
      `What the graphs actually did: the curve g(x)=5·2^x passes the line f(x)=40+6x between x=3 and x=4.`,
      `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
      `Student's reconcile (what surprised them / why): ${surprise || "(not yet written)"}`,
      `Practice — which x solves h(x)=k(x): ${solX || "(not chosen)"}`,
      `What "solution" means here (student's words): ${whyEqual}`,
      `How to find it on a graph (student's words): ${readMethod}`,
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
 
  // Producer table: h(x) = 3x + 11 vs k(x) = x^2 + 1. Equal at x = 5 (26 = 26).
  const hT = (x) => 3 * x + 11;
  const kT = (x) => x * x + 1;
  const tableRows = [2, 3, 4, 5, 6];
  const solIsRight = solX === "5";
 
  return (
    <section>
      {/* ---------------- PREDICT ---------------- */}
      <StageTag>A-REI.D.11 · Predict</StageTag>
      <H>Where do these two meet — if they meet at all?</H>
      <P>Two accounts grow over time. The <b style={{ color: C.indigo }}>Line account</b> starts
        with <b>$40</b> and adds <b>$6</b> every step. The <b style={{ color: C.ember }}>Curve account</b>
        starts with just <b>$5</b> — but it <b>doubles</b> every step.</P>
      <P style={{ margin: "10px 0 2px" }}><b>No graph yet.</b> The Line starts eight times richer. Make the
        call: does the Curve ever catch it — and if so, does it pass it?</P>
 
      <div style={{ margin: "6px 0 2px" }}>
        {choiceBtn("line", "The line stays on top — that head start holds", C.indigo)}
        {choiceBtn("curve", "The curve catches the line and passes it", C.ember)}
        {choiceBtn("never", "They never meet — the curve can't close that gap", C.sub)}
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
          <H>Step through it. Were you right?</H>
          <P>Your call is locked: <b>{pickLabel.toLowerCase()}</b>. Step forward and watch the gap.</P>
 
          <Plane width={440} height={300} xMax={xMax} yMax={yMax} xLabel="step (x)" yLabel="dollars"
            curves={[
              { f: f, color: C.indigo, width: 2.4 },
              { f: g, color: C.ember, width: 2.4, samples: 90 },
            ]}>
            {({ sx, sy }) => (
              <>
                {/* solution marker: the intersection, drawn only once stepped to/past it */}
                {step >= crossStep && (
                  <>
                    <line x1={sx(3.6)} y1={14} x2={sx(3.6)} y2={268} stroke={C.violet} strokeDasharray="4 4" strokeWidth="1.5" />
                    <circle cx={sx(3.6)} cy={sy(f(3.6))} r="5.5" fill="none" stroke={C.violet} strokeWidth="2.2" />
                    <text x={sx(3.6) + 6} y={sy(f(3.6)) - 8} fontSize="10" fill={C.violet}>solution ≈ x = 3.6</text>
                  </>
                )}
                {/* current step readout */}
                <line x1={sx(step)} y1={14} x2={sx(step)} y2={268} stroke={C.sub} strokeDasharray="3 3" />
                <circle cx={sx(step)} cy={sy(f(step))} r="5" fill={C.indigo} />
                <circle cx={sx(step)} cy={sy(g(step))} r="5" fill={C.ember} />
                <text x={sx(step)} y={sy(f(step)) - 9} fontSize="11" fill={C.indigo} textAnchor="middle">{f(step)}</text>
                <text x={sx(step)} y={sy(Math.min(yMax, g(step))) - 9} fontSize="11" fill={C.ember} textAnchor="middle">{g(step)}</text>
              </>
            )}
          </Plane>
 
          <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.sub }}>
            Step through x — step {step} · Line ${f(step)} vs Curve ${g(step)}
            {step >= crossStep
              ? <span style={{ color: C.ember, fontWeight: 700 }}> · the curve is now on top</span>
              : <span style={{ color: C.indigo, fontWeight: 700 }}> · the line is still on top</span>}
          </label>
          <input type="range" min={0} max={xMax} value={step} onChange={(e) => setStep(+e.target.value)}
            style={{ width: "100%" }} />
 
          {/* verified-praise-only: praise ONLY the checked call */}
          {step >= crossStep && phase === "revealed" && (
            predictionWasRight ? (
              <Coach tone="good">You called it. The Curve was eight times behind at the start, but doubling beats
                adding-a-fixed-amount every time, given enough steps. The graphs cross between x = 3 and x = 4 — and
                that crossing <b>is</b> the solution of 40 + 6x = 5·2<sup>x</sup>. You read the solution as the place
                the two graphs meet. That's exactly the move.</Coach>
            ) : (
              <Coach tone="neutral">The graphs crossed. The Curve started $35 behind, but doubling each step blew
                past the line's steady +6 by step 4 — and then ran away from it. The crossing point is the solution
                of 40 + 6x = 5·2<sup>x</sup>: the one x where the two are equal. Hold onto whatever just surprised
                you and write it down below.</Coach>
            )
          )}
 
          {step < crossStep && phase === "revealed" && (
            <Coach tone="neutral">Keep stepping — push past x = 3 and watch the gap between the two flip.</Coach>
          )}
        </div>
      )}
 
      {/* ---------------- RECONCILE ---------------- */}
      {committed && step >= crossStep && (
        <div style={{ marginTop: 24 }}>
          <StageTag>Reconcile</StageTag>
          <P style={{ marginBottom: 2 }}>
            {predictionWasRight
              ? "You were right — so make the reasoning airtight. Why does a doubling rate erase any head start a line has, eventually, every time?"
              : "You picked \"" + pickLabel.toLowerCase() + ",\" but the graphs crossed. What did you expect, and what actually made the curve win?"}
          </P>
          <Field
            label={predictionWasRight ? "Say why doubling beats a head start — in your own words" : "I thought ___, but the graph showed ___ because ___"}
            value={surprise}
            onChange={setSurprise}
            placeholder={predictionWasRight
              ? "A doubling account beats a fixed head start because…"
              : "I thought the line's $40 head start would hold because…, but…"}
            rows={3}
          />
          {surprise.trim().length >= 12 ? (
            <>
              <Coach tone="neutral">Saved for your teacher in your own words — they'll read your reasoning, not a
                score. Now pin down what "solution" actually means here.</Coach>
              <Btn onClick={() => setPhase("producer")}>Find a solution yourself →</Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              A sentence or two unlocks the next step. There's no right wording — just say what you noticed.
            </div>
          )}
        </div>
      )}
 
      {/* ---------------- PRODUCER — read a solution off a table ---------------- */}
      {phase === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Now read a solution straight off the numbers</H>
          <P>New pair. <b style={{ color: C.indigo }}>h(x) = 3x + 11</b> and
            <b style={{ color: C.ember }}> k(x) = x² + 1</b>. The solution of h(x) = k(x) is the x where the two
            columns are <b>equal</b>. Find it in the table.</P>
 
          <div style={{ overflowX: "auto", margin: "10px 0 4px" }}>
            <table style={{ borderCollapse: "collapse", fontFamily: FONT_BODY, fontSize: 15, minWidth: 280 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 16px 6px 0", color: C.sub, fontWeight: 700 }}>x</th>
                  <th style={{ textAlign: "left", padding: "6px 16px 6px 0", color: C.indigo, fontWeight: 700 }}>h(x) = 3x + 11</th>
                  <th style={{ textAlign: "left", padding: "6px 0", color: C.ember, fontWeight: 700 }}>k(x) = x² + 1</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((x) => {
                  const eq = hT(x) === kT(x);
                  return (
                    <tr key={x} style={{ background: eq && solIsRight ? C.goodBg : "transparent" }}>
                      <td style={{ padding: "5px 16px 5px 0", borderTop: `1px solid ${C.line}`, fontWeight: 600 }}>{x}</td>
                      <td style={{ padding: "5px 16px 5px 0", borderTop: `1px solid ${C.line}` }}>{hT(x)}</td>
                      <td style={{ padding: "5px 0", borderTop: `1px solid ${C.line}` }}>{kT(x)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
 
          <div style={{ margin: "8px 0" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, display: "block", marginBottom: 6 }}>
              Which x is the solution of h(x) = k(x)?
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tableRows.map((x) => {
                const active = solX === String(x);
                return (
                  <button key={x} onClick={() => setSolX(String(x))}
                    style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: active ? 700 : 500,
                      cursor: "pointer", color: C.ink, background: active ? C.panel : "transparent",
                      border: `1.5px solid ${active ? C.violet : C.line}`,
                      boxShadow: active ? `inset 0 -3px 0 ${C.violet}` : "none",
                      borderRadius: 9, padding: "8px 16px" }}>
                    x = {x}
                  </button>
                );
              })}
            </div>
          </div>
 
          <Field label="In your own words: what does it mean that x = 5 is a 'solution' of h(x) = k(x)?"
            value={whyEqual} onChange={setWhyEqual}
            placeholder="It's the x where h and k give the same output, which on a graph is…" rows={2} />
          <Field label="If you only had the two graphs (no table), how would you find this solution?"
            value={readMethod} onChange={setReadMethod}
            placeholder="I'd look for where the line and the curve…" rows={2} />
 
          {(() => {
            if (!(solX && whyEqual.trim().length > 4 && readMethod.trim().length > 4)) return null;
            const fillerOk = !isFiller(whyEqual) && !isFiller(readMethod);
            const good = solIsRight && fillerOk;
            if (good || stuck) return (
              <>
                <Coach tone="good">{solIsRight
                  ? "x = 5 checks out — there h(5) = 26 and k(5) = 26, the one row where the columns match. That's the solution, and on a graph it's exactly where the two curves cross."
                  : "Saved. Reread your x against the table — find the single row where the h and k columns are equal; that's the one."}
                  {" "}Your two explanations are in your own words and saved for your teacher.</Coach>
                <Btn onClick={() => setPhase("recap")}>See what you built →</Btn>
              </>
            );
            return (
              <>
                <Coach tone="redirect">{!solIsRight
                  ? "Scan for the row where the two columns land on the same number — that x is the solution."
                  : "Put a real sentence in each box — what 'solution' means, and how you'd spot it on a graph."}</Coach>
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
            <RecapRow label="What the graphs actually did" text={`The curve 5·2^x passed the line 40+6x between x = 3 and x = 4.`} />
            <RecapRow label={predictionWasRight ? "Why doubling beats a head start (your words)" : "What surprised you, and why (your words)"} text={surprise} />
            <RecapRow label="Solution you found in the table" text={solX ? `x = ${solX} solves h(x) = k(x)` : ""} />
            <RecapRow label="What 'solution' means here (your words)" text={whyEqual} />
            <RecapRow label="How you'd find it on a graph (your words)" text={readMethod} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — A-REI.D.11: Solutions of f(x) = g(x) as intersections",
            `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
            `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
            `Reconcile (student's words): ${surprise}`,
            `Practice solution chosen: ${solX ? `x = ${solX}` : "(none)"}`,
            `What 'solution' means (student's words): ${whyEqual}`,
            `Finding it on a graph (student's words): ${readMethod}`,
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
              A-REI.D.11 — the solution of f(x) = g(x) is where the two graphs meet. The graph stays locked until you
              commit a call in writing. The curves — not a grader — tell you if you were right.
            </p>
          </div>
 
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleIntersectionsPTR />
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
 
