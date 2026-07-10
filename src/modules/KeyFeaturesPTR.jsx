import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";

// Bump on pedagogically meaningful change only (spec §4.6); roundIds are append-only.
export const MODULE_VERSION = "1.0.0";
 
/* ============================================================================
   PROTOTYPE — PREDICT → TEST → RECONCILE
   F-IF.B.4 — Interpret key features of a graph (intervals where increasing/
   decreasing, positive/negative) and connect them to the quantity.
 
   This cluster has NO built-in "which one wins" crossing — so the bet is built
   from a CONFLATION instead of a race: students routinely read "increasing" as
   "positive y" / "above the x-axis." The bet curve rises steadily while still
   sitting BELOW the axis. Committing "where is it going up?" forces the student
   to separate direction (going up as x increases) from sign (y above/below 0).
   The reveal shows the rising stretch shaded below the axis — increasing AND
   negative at the same time. That's the surprise that breaks the conflation.
 
   The producer is a SKETCH-MATCH, chosen deliberately: reading a feature off a
   fresh graph is a task, not a bet, and risks the "digitized worksheet" failure
   mode. Sketch-match stays a genuine wager because the distractors ENCODE the
   misconception — to reject "increasing-but-positive" the student must actively
   apply the definition as a discriminator. The wrong answers carry the reasoning.
 
   Spine + atoms carried over verbatim; tokens are the iterated palette shared
   with the D.11 and B.4 modules (warm paper, indigo/ember, violet for the
   feature marker). Plane gains an optional below-axis shade band.
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
  ember: "#C6471F",   // the graphed curve
  violet: "#6B4FB0",  // feature marker (interval of increase) ONLY
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
 
/* ---------- Plane — same iterated atom; adds an optional below-axis shade band
   over [shadeFrom, shadeTo] so we can mark "this rising stretch is below 0".    */
function Plane({ width = 440, height = 320, xMin = -1, xMax = 6, yMin = -6, yMax = 6, children,
  xLabel, yLabel, curves, shade }) {
  const pad = { l: 42, r: 14, t: 14, b: 32 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const sx = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * iw;
  const sy = (y) => pad.t + ih - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * ih;
  const xticks = []; for (let t = Math.ceil(xMin); t <= xMax; t++) xticks.push(t);
  const yticks = []; for (let t = Math.ceil(yMin); t <= yMax; t++) if (t % 2 === 0) yticks.push(t);
  const buildPath = (fn, samples = 140) => {
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
      {/* below-axis shade band marking the rising-but-negative stretch */}
      {shade && (
        <rect x={sx(shade.from)} y={sy(0)} width={sx(shade.to) - sx(shade.from)} height={sy(yMin) - sy(0)}
          fill={C.violet} opacity="0.10" />
      )}
      {xticks.map((t) => <line key={`gx${t}`} x1={sx(t)} y1={pad.t} x2={sx(t)} y2={pad.t + ih} stroke="#F0ECE2" />)}
      {yticks.map((t) => <line key={`gy${t}`} x1={pad.l} y1={sy(t)} x2={pad.l + iw} y2={sy(t)} stroke="#F0ECE2" />)}
      <line x1={pad.l} y1={sy(0)} x2={pad.l + iw} y2={sy(0)} stroke={C.sub} strokeWidth="1.6" />
      <line x1={sx(0)} y1={pad.t} x2={sx(0)} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.2" />
      {xticks.map((t) => <text key={`tx${t}`} x={sx(t)} y={sy(0) + 14} fontSize="10" fill={C.sub} textAnchor="middle">{t}</text>)}
      {yticks.filter(t=>t!==0).map((t) => <text key={`ty${t}`} x={sx(0) - 6} y={sy(t) + 3} fontSize="10" fill={C.sub} textAnchor="end">{t}</text>)}
      <text x={pad.l + iw / 2} y={height - 1} fontSize="11" fill={C.sub} textAnchor="middle">{xLabel}</text>
      <text x={11} y={pad.t + ih / 2} fontSize="11" fill={C.sub} textAnchor="middle"
        transform={`rotate(-90 11 ${pad.t + ih / 2})`}>{yLabel}</text>
      {(curves || []).map((c, i) => (
        <polyline key={`curve${i}`} points={buildPath(c.f, c.samples)} fill="none"
          stroke={c.color} strokeWidth={c.width || 2.8} strokeLinejoin="round" strokeLinecap="round" />
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
 
/* ---------- mini sparkline for sketch-match candidates --------------------- */
function Sketch({ f, label, selected, onClick, correctReveal, role }) {
  const w = 150, h = 110, xMin = 0, xMax = 4, yMin = -4, yMax = 4;
  const pad = 8;
  const sx = (x) => pad + ((x - xMin) / (xMax - xMin)) * (w - 2 * pad);
  const sy = (y) => pad + (h - 2 * pad) - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * (h - 2 * pad);
  const pts = [];
  for (let i = 0; i <= 80; i++) { const x = xMin + (i / 80) * (xMax - xMin); pts.push(`${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`); }
  const border = selected ? C.violet : C.line;
  const ring = correctReveal === "correct" ? C.teal : correctReveal === "wrong" ? C.amber : border;
  return (
    <button onClick={onClick}
      style={{ background: C.panel, border: `2px solid ${ring}`, borderRadius: 12, padding: 8, cursor: "pointer",
        textAlign: "center", transition: "border-color .12s" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* target interval band [1,2] */}
        <rect x={sx(1)} y={pad} width={sx(2) - sx(1)} height={h - 2 * pad} fill={C.violet} opacity="0.08" />
        <line x1={pad} y1={sy(0)} x2={w - pad} y2={sy(0)} stroke={C.sub} strokeWidth="1.2" />
        <polyline points={pts.join(" ")} fill="none" stroke={C.ember} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: C.sub, marginTop: 4 }}>{label}</div>
      {correctReveal === "correct" && <div style={{ fontSize: 11, color: C.goodInk, fontWeight: 700 }}>matches ✓</div>}
      {correctReveal === "wrong" && role && <div style={{ fontSize: 11, color: C.warnInk }}>{role}</div>}
    </button>
  );
}
 
/* ============================================================================
   MODULE — F-IF.B.4 as predict → test → reconcile
   BET curve: f(x) = 0.5(x − 3)³ + 1. Monotonic increasing everywhere. Its only
   real root is x ≈ 1.74, so on the stretch left of there it is rising AND below
   the axis. We ask: "on the interval from x = 1 to x = 2, is the function going
   up, going down, or flat?" Answer: going UP — even though it's negative there.
   The conflation under test: "increasing" misread as "positive / above axis."
   ============================================================================ */
function ModuleKeyFeaturesPTR() {
  const [phase, setPhase] = useState("predict"); // predict -> revealed -> producer -> recap
 
  // PREDICT
  const [pick, setPick] = useState("");           // "up" | "down" | "flat"
  const [prediction, setPrediction] = useState("");
  const [nudged, setNudged] = useState(false);
 
  // TEST
  const [committed, setCommitted] = useState(false);
 
  // RECONCILE
  const [surprise, setSurprise] = useState("");
 
  // PRODUCER — sketch match
  const [matchPick, setMatchPick] = useState(""); // "A" | "B" | "C"
  const [matchChecked, setMatchChecked] = useState(false);
  const [matchWhy, setMatchWhy] = useState("");
  const [stuck, setStuck] = useState(false);
 
  const bet = (x) => 0.25 * Math.pow(x - 4, 3) + 1; // monotonic up; root ≈2.41
  const xMin = 0, xMax = 6, yMin = -6, yMax = 6;
 
  // On [1,2] the bet curve is increasing. Correct prediction = "up".
  const predictionWasRight = pick === "up";
  const dirWord = (k) => k === "up" ? "going up (increasing)"
    : k === "down" ? "going down (decreasing)" : "flat (not changing)";
  const pickLabel = dirWord(pick);
 
  const commit = () => {
    if (pick === "") return;
    if (isThinPrediction(prediction) && !nudged) { setNudged(true); return; }
    setCommitted(true);
    setPhase("revealed");
  };
 
  const reset = () => {
    setPhase("predict"); setPick(""); setPrediction(""); setNudged(false);
    setCommitted(false); setSurprise("");
    setMatchPick(""); setMatchChecked(false); setMatchWhy(""); setStuck(false);
  };
 
  // Sketch-match candidates on display interval [1,2].
  // A (correct): increasing AND negative on [1,2]
  const candA = (x) => 0.5 * Math.pow(x - 2.4, 3) - 0.4; // rising, below axis around [1,2]
  // B (conflation distractor): increasing but POSITIVE on [1,2]
  const candB = (x) => 0.5 * Math.pow(x - 1, 3) + 1.5;
  // C (direction distractor): DECREASING and negative on [1,2]
  const candC = (x) => -0.7 * (x - 1) - 1;
  const matchIsRight = matchPick === "A";
 
  const matchRole = (k) => k === "B" ? "this one is rising but ABOVE the axis"
    : k === "C" ? "this one is below the axis but going DOWN" : "";
 
  useSessionReport("Module · F-IF.B.4 Reading key features (Predict→Test→Reconcile)",
    (committed) ? [
      "ALGEBRA — F-IF.B.4: Increasing/decreasing vs positive/negative on a graph",
      `Claim under test: on the interval x = 1 to x = 2, the function is __?`,
      `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
      `What the graph showed: the curve is rising on [1,2] even though it sits BELOW the x-axis there (increasing AND negative).`,
      `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
      `Student's reconcile (what surprised them / why): ${surprise || "(not yet written)"}`,
      `Sketch-match — which graph is "increasing on [1,2] and negative there": ${matchPick ? `picked ${matchPick} (${matchIsRight ? "correct" : "not the match"})` : "(not chosen)"}`,
      `Student's reasoning for the match: ${matchWhy}`,
    ] : null);
 
  const choiceBtn = (key, text, color) => {
    const active = pick === key;
    return (
      <button onClick={() => setPick(key)}
        style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer",
          fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.4, color: C.ink,
          background: active ? C.panel : "transparent",
          border: `1.5px solid ${active ? color : C.line}`,
          boxShadow: active ? `inset 3px 0 0 ${color}` : "none",
          borderRadius: 10, padding: "11px 14px", margin: "8px 0", transition: "all .12s" }}>
        <span style={{ fontWeight: active ? 700 : 500 }}>{text}</span>
      </button>
    );
  };
 
  return (
    <section>
      {/* ---------------- PREDICT ---------------- */}
      <StageTag>F-IF.B.4 · Predict</StageTag>
      <H>On this stretch — is the function going up, down, or holding flat?</H>
      <P>Here's a table of values for a function, over the interval from <b>x = 1 to x = 2</b>. No graph yet — you
        have the numbers, so you can actually work this out. As x moves from 1 to 2, is the function
        <b> going up</b>, <b>going down</b>, or <b>holding flat</b>?</P>
 
      <div style={{ margin: "12px 0 6px", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontFamily: FONT_BODY, fontSize: 15 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 18px 6px 0", color: C.sub, fontWeight: 700 }}>x</th>
              {[1, 1.25, 1.5, 1.75, 2].map((x) => (
                <th key={x} style={{ padding: "6px 14px 6px 0", color: C.ink, fontWeight: 700 }}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "6px 18px 6px 0", color: C.ember, fontWeight: 700, borderTop: `1px solid ${C.line}` }}>y</td>
              {[1, 1.25, 1.5, 1.75, 2].map((x) => (
                <td key={x} style={{ padding: "6px 14px 6px 0", borderTop: `1px solid ${C.line}`, fontVariantNumeric: "tabular-nums" }}>
                  {(0.25 * Math.pow(x - 4, 3) + 1).toFixed(2)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <P style={{ margin: "8px 0 2px", color: C.sub, fontSize: 14.5 }}>Read the y-values carefully before you
        commit — every one of them is negative, but that's a question about <i>which side of zero</i>, not about
        which <i>direction</i> the function is heading.</P>
 
      <div style={{ margin: "6px 0 2px" }}>
        {choiceBtn("up", "Going up — increasing across that band", C.violet)}
        {choiceBtn("down", "Going down — decreasing across that band", C.ember)}
        {choiceBtn("flat", "Flat — not really changing there", C.sub)}
      </div>
 
      <Field label="Why? (one sentence — this locks in before the graph unlocks)"
        value={prediction} onChange={setPrediction}
        placeholder="I think ___ because ___" rows={2} disabled={committed} />
 
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
          <H>Now see those same numbers plotted. Were you right?</H>
          <P>Your call is locked: on [1, 2] the function is <b>{pickLabel}</b>. The shaded band is that same
            interval, and the curve runs through the exact points from your table.</P>
 
          <Plane width={440} height={320} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}
            xLabel="x" yLabel="y" curves={[{ f: bet, color: C.ember, width: 2.8 }]}
            shade={{ from: 1, to: 2 }}>
            {({ sx, sy }) => (
              <>
                {/* endpoints of the band on the curve */}
                <circle cx={sx(1)} cy={sy(bet(1))} r="4.5" fill={C.violet} />
                <circle cx={sx(2)} cy={sy(bet(2))} r="4.5" fill={C.violet} />
                <text x={sx(1) - 4} y={sy(bet(1)) + 16} fontSize="10" fill={C.violet} textAnchor="end">
                  x=1, y={bet(1).toFixed(1)}
                </text>
                <text x={sx(2) + 6} y={sy(bet(2)) - 6} fontSize="10" fill={C.violet}>
                  x=2, y={bet(2).toFixed(1)}
                </text>
              </>
            )}
          </Plane>
 
          <P style={{ fontSize: 14.5, color: C.sub, margin: "8px 0 0" }}>
            At x = 1 the curve is at y = {bet(1).toFixed(1)}; at x = 2 it's at y = {bet(2).toFixed(1)}. It climbed —
            from one negative value to a higher one. <b>Both endpoints sit below the x-axis</b>, yet the curve is
            clearly rising between them.
          </P>
 
          {phase === "revealed" && (
            predictionWasRight ? (
              <Coach tone="good">You called it. The function is <b>increasing</b> on [1, 2] — it goes from y ≈
                {" "}{bet(1).toFixed(1)} up to y ≈ {bet(2).toFixed(1)}. And here's the part that trips most people:
                it's increasing the whole time while still <b>below the x-axis</b>. "Going up" is about direction;
                "negative" is about which side of the axis. You kept those two apart.</Coach>
            ) : (
              <Coach tone="neutral">Look again at the two marked points: the curve climbs from y ≈ {bet(1).toFixed(1)}
                {" "}to y ≈ {bet(2).toFixed(1)} as x goes from 1 to 2 — so it's <b>increasing</b> there. The thing
                that makes this one slippery: it's increasing <i>while still below the axis</i>. "Increasing" is about
                direction (going up), not about being positive. Hold onto what you expected and write it below.</Coach>
            )
          )}
        </div>
      )}
 
      {/* ---------------- RECONCILE ---------------- */}
      {committed && (
        <div style={{ marginTop: 24 }}>
          <StageTag>Reconcile</StageTag>
          <P style={{ marginBottom: 2 }}>
            {predictionWasRight
              ? "You were right — so sharpen the distinction. In your own words, how is \"increasing\" different from \"positive\"? Why can a function be one without the other?"
              : "You picked \"" + pickLabel + ",\" but the curve climbed across [1, 2]. What threw you — and what does \"increasing\" actually describe?"}
          </P>
          <Field
            label={predictionWasRight ? "Say how \"increasing\" differs from \"positive\" — your words" : "I thought ___, but the graph showed ___ because ___"}
            value={surprise} onChange={setSurprise}
            placeholder={predictionWasRight
              ? "Increasing means the y-values are climbing as x grows; positive means…"
              : "I thought it was ___ because I was looking at ___, but increasing really means…"}
            rows={3} />
          {surprise.trim().length >= 12 ? (
            <>
              <Coach tone="neutral">Saved for your teacher in your own words — they'll read your reasoning, not a
                score. Now use the distinction to pick the right graph.</Coach>
              <Btn onClick={() => setPhase("producer")}>Match the description to a graph →</Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              A sentence or two unlocks the next step. There's no right wording — just say what you noticed.
            </div>
          )}
        </div>
      )}
 
      {/* ---------------- PRODUCER — sketch match ---------------- */}
      {phase === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Which graph fits this description?</H>
          <P>Find the graph that is <b>increasing on the band [1, 2]</b> <i>and</i> <b>negative there</b> (below the
            axis). Only one fits both. The other two each miss on exactly one part — figure out which part.</P>
 
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "10px 0" }}>
            <Sketch f={candA} label="Graph A" selected={matchPick === "A"}
              onClick={() => !matchChecked && setMatchPick("A")}
              correctReveal={matchChecked ? "correct" : null} role={matchRole("A")} />
            <Sketch f={candB} label="Graph B" selected={matchPick === "B"}
              onClick={() => !matchChecked && setMatchPick("B")}
              correctReveal={matchChecked && matchPick === "B" ? "wrong" : null} role={matchRole("B")} />
            <Sketch f={candC} label="Graph C" selected={matchPick === "C"}
              onClick={() => !matchChecked && setMatchPick("C")}
              correctReveal={matchChecked && matchPick === "C" ? "wrong" : null} role={matchRole("C")} />
          </div>
 
          {!matchChecked && (
            <Btn onClick={() => matchPick && setMatchChecked(true)} disabled={!matchPick}>
              Check my match →
            </Btn>
          )}
 
          {matchChecked && (
            <>
              {/* verified-praise-only: praise only the verified A pick; otherwise redirect with the WHY */}
              {matchIsRight ? (
                <Coach tone="good">Graph A — that's the one. On [1, 2] it climbs (increasing) and stays under the
                  axis (negative) the whole way. Graph B rises too, but it's above the axis — positive, not negative.
                  Graph C is below the axis, but it's heading down — decreasing, not increasing. Each wrong one fails
                  exactly one half of the description.</Coach>
              ) : (
                <Coach tone="redirect">Not quite — {matchPick === "B"
                  ? "Graph B is rising, but look where it sits: above the axis. The description needs negative (below the axis) on that band."
                  : "Graph C is below the axis, but trace it left to right on the band — it's going down. The description needs increasing."}
                  {" "}You're after the one graph that's BOTH increasing AND negative on [1, 2]. Want to say which one
                  that is and why?</Coach>
              )}
              <Field label="Why does your graph fit both parts — increasing AND negative on [1,2]? (your words)"
                value={matchWhy} onChange={setMatchWhy}
                placeholder="The one I'd pick climbs across the band, and it stays below the axis because…" rows={2} />
              {(() => {
                if (matchWhy.trim().length <= 4) return null;
                const good = matchIsRight && !isFiller(matchWhy);
                if (good || stuck) return (
                  <>
                    <Coach tone="neutral">Saved in your own words for your teacher. You separated direction from sign
                      and used both as a filter — that's the whole skill.</Coach>
                    <Btn onClick={() => setPhase("recap")}>See what you built →</Btn>
                  </>
                );
                return (
                  <>
                    <Coach tone="redirect">{!matchIsRight
                      ? "Reselect the graph that's rising AND under the axis on the band, then say why in a sentence."
                      : "Put a real sentence in the box — name both parts: which way it's heading, and which side of the axis it's on."}</Coach>
                    {matchIsRight && <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>}
                    {!matchIsRight && <Btn kind="ghost" onClick={() => { setMatchChecked(false); }}>Pick again</Btn>}
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
            <RecapRow label="What the graph showed" text={`The curve climbs across [1, 2] (increasing) while sitting below the x-axis — increasing AND negative at once.`} />
            <RecapRow label={predictionWasRight ? "How \"increasing\" differs from \"positive\" (your words)" : "What surprised you, and why (your words)"} text={surprise} />
            <RecapRow label="Sketch you matched" text={matchPick ? `Graph ${matchPick} — ${matchIsRight ? "increasing and negative on [1,2]" : "(revisit: needs both increasing and negative)"}` : ""} />
            <RecapRow label="Why it fits both parts (your words)" text={matchWhy} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — F-IF.B.4: Increasing/decreasing vs positive/negative",
            `Claim: on x = 1 to x = 2, the function is __`,
            `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
            `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
            `Reconcile (student's words): ${surprise}`,
            `Sketch-match pick: ${matchPick ? `Graph ${matchPick} (${matchIsRight ? "correct" : "not the match"})` : "(none)"}`,
            `Why it fits (student's words): ${matchWhy}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* ============================================================================
   APP SHELL
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
              F-IF.B.4 — reading key features off a graph. "Increasing" is about direction, not about being positive.
              The graph stays locked until you commit a call in writing. The graph — not a grader — settles it.
            </p>
          </div>
 
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleKeyFeaturesPTR />
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
 
