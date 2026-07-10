import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
 
/* ============================================================================
   PROTOTYPE — PREDICT → TEST → RECONCILE
   A-REI.B.4 — Solve quadratic equations; recognize how many real solutions
   exist and connect that to the graph's x-intercepts.
 
   The bet: how many times does y = x² − 4x + 5 cross the x-axis — twice, once,
   or never? The trap is that its vertex sits at (2, 1), just ONE unit above the
   axis. It looks like it should dip through. The discriminant — b²−4ac = −4 —
   is the adjudicator: negative ⇒ zero real solutions. The parabola never
   touches. The reveal makes "sign of the discriminant ⇒ number of real roots"
   physical instead of a memorized rule.
 
   Carried over VERBATIM from the existing build (the spine, not the skin):
   - Coach / Btn / Field / NumField / Plane / RecapRow / CopyResults atoms
   - copyText fallback chain, SessionContext / useSessionReport
   - no-wall principle: the reveal UNLOCKS on commit, never hard-gates
   - verified-praise-only: the app praises only the call it checked against the
     discriminant; the reconcile prose is saved unjudged for the teacher
 
   Tokens: same iterated palette as the D.11 module (warm paper, indigo/ember,
   violet reserved for the solution/intercept marker). Plane curve-plotter reused
   so the parabola draws as a sampled polyline.
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
  violet: "#6B4FB0",  // x-intercepts / real-solution marker ONLY
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
function NumField({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "inline-flex", flexDirection: "column", margin: "8px 14px 8px 0" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 5 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="decimal"
        style={{ width: 90, fontFamily: FONT_BODY, fontSize: 16, color: C.ink, background: C.panel,
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
function Plane({ width = 440, height = 320, xMin = -1, xMax = 5, yMin = 0, yMax = 14, children, xLabel, yLabel, curves }) {
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
      {/* x-axis emphasized — the line we're asking whether the parabola crosses */}
      <line x1={pad.l} y1={sy(0)} x2={pad.l + iw} y2={sy(0)} stroke={C.sub} strokeWidth="1.6" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.2" />
      {xticks.map((t) => <text key={`tx${t}`} x={sx(t)} y={sy(0) + 15} fontSize="10" fill={C.sub} textAnchor="middle">{t}</text>)}
      {yticks.map((t) => <text key={`ty${t}`} x={pad.l - 6} y={sy(t) + 3} fontSize="10" fill={C.sub} textAnchor="end">{t}</text>)}
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
   MODULE — A-REI.B.4 as predict → test → reconcile
   BET:   y = x² − 4x + 5   vertex (2, 1), opens up. disc = (−4)² − 4·1·5 = −4.
          NEGATIVE ⇒ zero real solutions; the parabola never touches the axis.
   PRODUCER: compute the discriminant for a fresh quadratic and predict the
   root count from its sign. Cases cover all three: 0 / 1 / 2 roots.
   ============================================================================ */
function ModuleQuadraticsPTR() {
  const [phase, setPhase] = useState("predict"); // predict -> revealed -> producer -> recap
 
  // PREDICT
  const [pick, setPick] = useState("");           // "two" | "one" | "zero"
  const [prediction, setPrediction] = useState("");
  const [nudged, setNudged] = useState(false);
 
  // TEST
  const [committed, setCommitted] = useState(false);
  const [showDisc, setShowDisc] = useState(false); // student taps to compute the discriminant
 
  // RECONCILE
  const [surprise, setSurprise] = useState("");
 
  // PRODUCER — compute discriminant for a new quadratic, predict count
  const [pa, setPa] = useState("");
  const [pb, setPb] = useState("");
  const [pc, setPc] = useState("");
  const [pCount, setPCount] = useState("");        // "two" | "one" | "zero"
  const [pWhy, setPWhy] = useState("");
  const [stuck, setStuck] = useState(false);
 
  // The bet parabola
  const A = 1, B = -4, Cc = 5;
  const parab = (x) => A * x * x + B * x + Cc;
  const disc = B * B - 4 * A * Cc;                 // -4
  const realCount = disc > 0 ? "two" : disc === 0 ? "one" : "zero"; // "zero"
  const predictionWasRight = pick === realCount;   // correct answer: "zero"
 
  const commit = () => {
    if (pick === "") return;
    if (isThinPrediction(prediction) && !nudged) { setNudged(true); return; }
    setCommitted(true);
    setPhase("revealed");
  };
 
  const reset = () => {
    setPhase("predict"); setPick(""); setPrediction(""); setNudged(false);
    setCommitted(false); setShowDisc(false); setSurprise("");
    setPa(""); setPb(""); setPc(""); setPCount(""); setPWhy(""); setStuck(false);
  };
 
  const countWord = (c) => c === "two" ? "two real solutions (crosses twice)"
    : c === "one" ? "one real solution (touches once)"
    : c === "zero" ? "no real solutions (never touches)" : "";
  const pickLabel = countWord(pick);
 
  useSessionReport("Module · A-REI.B.4 Quadratic root count (Predict→Test→Reconcile)",
    (committed) ? [
      "ALGEBRA — A-REI.B.4: How many real solutions does a quadratic have",
      `Equation: x² − 4x + 5 = 0`,
      `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
      `Discriminant b²−4ac = (−4)² − 4(1)(5) = −4  ⇒ negative ⇒ no real solutions.`,
      `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
      `Student's reconcile (what surprised them / why): ${surprise || "(not yet written)"}`,
      `Practice quadratic: ${pa || "?"}x² + ${pb || "?"}x + ${pc || "?"}`,
      `Predicted root count from discriminant: ${pCount ? countWord(pCount) : "(not chosen)"}`,
      `Student's reasoning (sign ⇒ count): ${pWhy}`,
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
 
  // Producer evaluation
  const paN = parseFloat(pa), pbN = parseFloat(pb), pcN = parseFloat(pc);
  const pNumsOk = !isNaN(paN) && !isNaN(pbN) && !isNaN(pcN) && paN !== 0;
  const pDisc = pNumsOk ? pbN * pbN - 4 * paN * pcN : null;
  const pTrueCount = pDisc === null ? null : (pDisc > 0 ? "two" : pDisc === 0 ? "one" : "zero");
  const pCountOk = pCount !== "" && pCount === pTrueCount;
 
  return (
    <section>
      {/* ---------------- PREDICT ---------------- */}
      <StageTag>A-REI.B.4 · Predict</StageTag>
      <H>How many times does this parabola hit the x-axis?</H>
      <P>Here's the equation: <b style={{ color: C.ember }}>x² − 4x + 5 = 0</b>. Solving it means finding the
        x-values where the parabola <b>y = x² − 4x + 5</b> crosses the x-axis.</P>
      <P style={{ margin: "10px 0 2px" }}><b>No graph yet.</b> Make the call: does this parabola cross the axis
        <b> twice</b>, just <b>touch it once</b>, or <b>never reach it</b>?</P>
 
      <div style={{ margin: "6px 0 2px" }}>
        {choiceBtn("two", "Crosses twice — two real solutions", C.ember)}
        {choiceBtn("one", "Touches once — one real solution", C.amber)}
        {choiceBtn("zero", "Never touches — no real solutions", C.indigo)}
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
          <H>There's the graph. Were you right?</H>
          <P>Your call is locked: <b>{pickLabel}</b>. Look at where the curve sits relative to the x-axis.</P>
 
          <Plane width={440} height={320} xMin={-1} xMax={5} yMin={0} yMax={14}
            xLabel="x" yLabel="y"
            curves={[{ f: parab, color: C.ember, width: 2.8 }]}>
            {({ sx, sy }) => (
              <>
                {/* vertex marker — the near-miss: (2,1), one unit above the axis */}
                <circle cx={sx(2)} cy={sy(1)} r="4.5" fill={C.ember} />
                <text x={sx(2) + 7} y={sy(1) + 4} fontSize="10" fill={C.ember}>vertex (2, 1)</text>
                {/* gap annotation once the discriminant is revealed */}
                {showDisc && (
                  <>
                    <line x1={sx(2)} y1={sy(1)} x2={sx(2)} y2={sy(0)} stroke={C.violet} strokeWidth="2" strokeDasharray="3 3" />
                    <text x={sx(2) + 7} y={sy(0.5) + 4} fontSize="10" fill={C.violet}>gap of 1 — never reaches</text>
                  </>
                )}
              </>
            )}
          </Plane>
 
          {!showDisc && (
            <div style={{ marginTop: 12 }}>
              <P style={{ margin: "0 0 8px" }}>The curve's lowest point sits just above the axis — but eyeballing a
                graph isn't proof. The <b>discriminant</b> settles it. Compute b² − 4ac for a = 1, b = −4, c = 5.</P>
              <Btn onClick={() => setShowDisc(true)}>Reveal the discriminant →</Btn>
            </div>
          )}
 
          {showDisc && (
            <>
              <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "13px 16px",
                margin: "14px 0", fontFamily: FONT_BODY, fontSize: 15.5, color: C.ink }}>
                <div style={{ fontFamily: "monospace", fontSize: 15 }}>
                  b² − 4ac = (−4)² − 4(1)(5) = 16 − 20 = <b style={{ color: C.violet }}>−4</b>
                </div>
                <div style={{ marginTop: 8, color: C.sub, fontSize: 14 }}>
                  Negative discriminant ⇒ no real solutions. The square root of a negative number isn't real, so the
                  quadratic formula returns nothing real to plot — the parabola stays above the axis.
                </div>
              </div>
 
              {/* verified-praise-only: praise ONLY the checked call */}
              {predictionWasRight ? (
                <Coach tone="good">You called it. The vertex sits at (2, 1) — a full unit above the axis — and the
                  discriminant confirms it: −4 is negative, so there are <b>no real solutions</b>. You didn't trust
                  the "it's a parabola, it must cross" reflex. The sign of b²−4ac told you the count before you ever
                  solved.</Coach>
              ) : (
                <Coach tone="neutral">The discriminant is −4 — negative — so this quadratic has <b>no real
                  solutions</b>; the parabola never touches the axis. Its vertex stops at (2, 1), one unit short. A
                  parabola doesn't have to cross: when b²−4ac is negative, it floats entirely above (or below) the
                  axis. Hold onto what you expected and write it below.</Coach>
              )}
            </>
          )}
        </div>
      )}
 
      {/* ---------------- RECONCILE ---------------- */}
      {committed && showDisc && (
        <div style={{ marginTop: 24 }}>
          <StageTag>Reconcile</StageTag>
          <P style={{ marginBottom: 2 }}>
            {predictionWasRight
              ? "You were right — so nail down the rule. How does the SIGN of the discriminant tell you the number of real solutions, before you solve anything?"
              : "You picked \"" + pickLabel + ",\" but the discriminant came out −4. What did you expect, and what does a negative discriminant actually mean?"}
          </P>
          <Field
            label={predictionWasRight ? "Say how the discriminant's sign sets the count — in your own words" : "I thought ___, but the discriminant showed ___ because ___"}
            value={surprise}
            onChange={setSurprise}
            placeholder={predictionWasRight
              ? "A negative discriminant means no real solutions because…"
              : "I thought it would cross twice because…, but a negative discriminant means…"}
            rows={3}
          />
          {surprise.trim().length >= 12 ? (
            <>
              <Coach tone="neutral">Saved for your teacher in your own words — they'll read your reasoning, not a
                score. Now run the discriminant test yourself on a fresh one.</Coach>
              <Btn onClick={() => setPhase("producer")}>Test one yourself →</Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              A sentence or two unlocks the next step. There's no right wording — just say what you noticed.
            </div>
          )}
        </div>
      )}
 
      {/* ---------------- PRODUCER — compute a discriminant, predict the count ---------------- */}
      {phase === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Your turn — let the sign do the work</H>
          <P>Pick any quadratic you like (or use one of these: <b>x² − 6x + 9</b>, <b>x² − 2x − 8</b>,
            <b> x² + x + 7</b>). Enter a, b, c — then predict the number of real solutions <b>from the
            discriminant alone</b>, before solving.</P>
 
          <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", margin: "6px 0" }}>
            <NumField label="a" value={pa} onChange={setPa} placeholder="1" />
            <NumField label="b" value={pb} onChange={setPb} placeholder="-6" />
            <NumField label="c" value={pc} onChange={setPc} placeholder="9" />
          </div>
 
          {pNumsOk && (
            <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 14px",
              margin: "8px 0 4px", fontFamily: "monospace", fontSize: 14.5, color: C.ink }}>
              b² − 4ac = ({pbN})² − 4({paN})({pcN}) = <b style={{ color: C.violet }}>{pDisc}</b>
            </div>
          )}
 
          <div style={{ margin: "10px 0 2px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, display: "block", marginBottom: 6 }}>
              From that sign alone, how many real solutions?
            </span>
            {choiceProducer("two", "Two (crosses twice)", pCount, setPCount)}
            {choiceProducer("one", "One (touches once)", pCount, setPCount)}
            {choiceProducer("zero", "Zero (never touches)", pCount, setPCount)}
          </div>
 
          <Field label="How does the sign of your discriminant give that count? (your words)"
            value={pWhy} onChange={setPWhy}
            placeholder="My discriminant is ___, which is positive/zero/negative, so…" rows={2} />
 
          {(() => {
            if (!(pNumsOk && pCount !== "" && pWhy.trim().length > 4)) return null;
            const good = pCountOk && !isFiller(pWhy);
            if (good || stuck) return (
              <>
                <Coach tone="good">{pCountOk
                  ? `That matches — a discriminant of ${pDisc} is ${pDisc > 0 ? "positive, so two real solutions (crosses twice)" : pDisc === 0 ? "zero, so one real solution (touches once)" : "negative, so no real solutions (never touches)"}. You read the count straight off the sign.`
                  : `Saved — but recheck: a discriminant of ${pDisc} is ${pDisc > 0 ? "positive" : pDisc === 0 ? "zero" : "negative"}, which points to ${countWord(pTrueCount)}.`}
                  {" "}Your reasoning is in your own words and saved for your teacher.</Coach>
                <Btn onClick={() => setPhase("recap")}>See what you built →</Btn>
              </>
            );
            return (
              <>
                <Coach tone="redirect">{!pCountOk
                  ? `Match the sign to the count: positive ⇒ two, zero ⇒ one, negative ⇒ none. Your discriminant is ${pDisc}.`
                  : "Put a real sentence in the box — name your discriminant, its sign, and what that forces."}</Coach>
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
            <RecapRow label="What the discriminant actually was" text={`b² − 4ac = −4 (negative) ⇒ no real solutions; the parabola never touches the axis.`} />
            <RecapRow label={predictionWasRight ? "How the sign sets the count (your words)" : "What surprised you, and why (your words)"} text={surprise} />
            <RecapRow label="The quadratic you tested" text={pNumsOk ? `${paN}x² + ${pbN}x + ${pcN}, discriminant ${pDisc}` : ""} />
            <RecapRow label="Real-solution count you predicted" text={pCount ? countWord(pCount) : ""} />
            <RecapRow label="Your sign ⇒ count reasoning" text={pWhy} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — A-REI.B.4: How many real solutions does a quadratic have",
            `Bet equation: x² − 4x + 5 = 0`,
            `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
            `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
            `Reconcile (student's words): ${surprise}`,
            `Practice quadratic: ${pNumsOk ? `${paN}x² + ${pbN}x + ${pcN}` : "(not built)"}`,
            `Discriminant: ${pDisc === null ? "(n/a)" : pDisc}`,
            `Predicted count: ${pCount ? countWord(pCount) : "(none)"}`,
            `Sign ⇒ count reasoning (student's words): ${pWhy}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
 
  function choiceProducer(key, text, current, setter) {
    const active = current === key;
    const color = key === "two" ? C.ember : key === "one" ? C.amber : C.indigo;
    return (
      <button onClick={() => setter(key)}
        style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer",
          fontFamily: FONT_BODY, fontSize: 15, color: C.ink,
          background: active ? C.panel : "transparent",
          border: `1.5px solid ${active ? color : C.line}`,
          boxShadow: active ? `inset 3px 0 0 ${color}` : "none",
          borderRadius: 10, padding: "10px 14px", margin: "6px 0", transition: "all .12s",
          fontWeight: active ? 700 : 500 }}>
        {text}
      </button>
    );
  }
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
              A-REI.B.4 — the discriminant's sign tells you how many real solutions a quadratic has. The graph stays
              locked until you commit a call in writing. The discriminant — not a grader — settles it.
            </p>
          </div>
 
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleQuadraticsPTR />
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
 
