import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";

// Bump on pedagogically meaningful change only (spec §4.6); roundIds are append-only.
export const MODULE_VERSION = "1.0.0";
 
/* ============================================================================
   PROTOTYPE — PREDICT → TEST → RECONCILE
   F-LE.A.2 — Construct linear and exponential functions, given a graph, a
   description, or two input-output pairs (including reading from a table).
   Paired payoff with F-LE.A.3: an exponential quantity eventually exceeds a
   linear one.
 
   The bet: two savings options, each given as TWO input-output pairs.
     Option A (linear):      (0, $100) and (3, $250)  →  A(t) = 100 + 50t
     Option B (exponential): (0, $20)  and (3, $160)  →  B(t) = 20 · 2^t
   The student must CONSTRUCT both rules from the pairs — recognize A grows by
   equal differences (+$50/mo) and B grows by equal factors (×2/mo) — then
   extend to month 6 to settle the bet.
 
   The trap: at every SHOWN point, linear is winning. A starts 5× higher ($100
   vs $20) and is still ahead at month 3 ($250 vs $160). Everything visible says
   "the one adding $50 wins." But the doubling option overtakes at month 4 and
   is more than 3× ahead by month 6 ($1,280 vs $400). The crossover is hidden in
   the gap the table doesn't show — which is exactly what makes the prediction a
   real wager, fully derivable from the two pairs.
 
   This passes the fitness test from the design notes: the prompt (two pairs per
   option) contains everything needed to derive the answer. The hidden future is
   in the extension, not in missing information.
 
   Carried over VERBATIM from the existing build (the spine, not the skin):
   - Coach / Btn / Field / Plane / RecapRow / CopyResults atoms
   - copyText fallback chain, SessionContext / useSessionReport
   - no-wall principle: the reveal UNLOCKS on commit, never hard-gates
   - verified-praise-only: praise fires only on the call the app checked against
     the constructed functions; all reconcile prose is saved unjudged
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
  indigo: "#3457A6",  // Option A — the linear line
  ember: "#C6471F",   // Option B — the exponential curve
  violet: "#6B4FB0",  // the crossover marker ONLY
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
function Plane({ width = 440, height = 320, xMin = 0, xMax = 6, yMin = 0, yMax = 1400, children, xLabel, yLabel, curves }) {
  const pad = { l: 52, r: 14, t: 14, b: 32 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const sx = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * iw;
  const sy = (y) => pad.t + ih - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * ih;
  const xticks = []; for (let t = Math.ceil(xMin); t <= xMax; t++) xticks.push(t);
  const yticks = []; for (let t = yMin; t <= yMax; t += 200) yticks.push(t);
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
      <line x1={pad.l} y1={sy(0)} x2={pad.l + iw} y2={sy(0)} stroke={C.sub} strokeWidth="1.6" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.2" />
      {xticks.map((t) => <text key={`tx${t}`} x={sx(t)} y={sy(0) + 15} fontSize="10" fill={C.sub} textAnchor="middle">{t}</text>)}
      {yticks.map((t) => <text key={`ty${t}`} x={pad.l - 6} y={sy(t) + 3} fontSize="10" fill={C.sub} textAnchor="end">${t}</text>)}
      <text x={pad.l + iw / 2} y={height - 1} fontSize="11" fill={C.sub} textAnchor="middle">{xLabel}</text>
      <text x={12} y={pad.t + ih / 2} fontSize="11" fill={C.sub} textAnchor="middle"
        transform={`rotate(-90 12 ${pad.t + ih / 2})`}>{yLabel}</text>
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
   MODULE — F-LE.A.2 as predict → test → reconcile
   BET:  Option A linear  (0,100),(3,250) → A(t)=100+50t
         Option B exp     (0,20),(3,160)  → B(t)=20·2^t
   At month 6: A=$400, B=$1280.  B overtakes A at month 4.
   PRODUCER: construct a function from two fresh pairs and decide linear vs exp.
   ============================================================================ */
function ModuleLinearExpPTR() {
  const [phase, setPhase] = useState("predict"); // predict -> revealed -> producer -> recap
 
  // PREDICT
  const [pick, setPick] = useState("");           // "A" | "B" | "tie"
  const [prediction, setPrediction] = useState("");
  const [nudged, setNudged] = useState(false);
 
  // TEST
  const [committed, setCommitted] = useState(false);
  const [showExtend, setShowExtend] = useState(false); // tap to extend past the table
 
  // RECONCILE
  const [surprise, setSurprise] = useState("");
 
  // PRODUCER — construct from two fresh pairs, classify
  const [pType, setPType] = useState("");          // "linear" | "exp"
  const [pNext, setPNext] = useState("");           // the next term/value
  const [pWhy, setPWhy] = useState("");
  const [stuck, setStuck] = useState(false);
 
  // The bet functions
  const A = (t) => 100 + 50 * t;       // linear
  const B = (t) => 20 * Math.pow(2, t); // exponential
  const BET_MONTH = 6;
  const aBet = A(BET_MONTH);            // 400
  const bBet = B(BET_MONTH);            // 1280
  const winner = aBet > bBet ? "A" : bBet > aBet ? "B" : "tie"; // "B"
  const crossover = (() => { for (let t = 0; t <= BET_MONTH; t++) if (B(t) > A(t)) return t; return null; })(); // 4
  const predictionWasRight = pick === winner;
 
  const commit = () => {
    if (pick === "") return;
    if (isThinPrediction(prediction) && !nudged) { setNudged(true); return; }
    setCommitted(true);
    setPhase("revealed");
  };
 
  const reset = () => {
    setPhase("predict"); setPick(""); setPrediction(""); setNudged(false);
    setCommitted(false); setShowExtend(false); setSurprise("");
    setPType(""); setPNext(""); setPWhy(""); setStuck(false);
  };
 
  const winWord = (k) => k === "A" ? "Option A — the one adding $50 each month"
    : k === "B" ? "Option B — the one doubling each month"
    : k === "tie" ? "They're tied at month 6" : "";
  const pickLabel = winWord(pick);
 
  // PRODUCER bank — a fresh pair-pattern. Pairs: (1, 6), (2, 18), (3, 54): ×3 each step → exponential.
  // Next (t=4) = 162.  Classified by constant ratio (3), not constant difference.
  const PROD = { pairs: [[1, 6], [2, 18], [3, 54]], type: "exp", ratio: 3, next: 162, nextT: 4 };
  const pNextN = parseFloat(pNext);
  const pTypeOk = pType === PROD.type;
  const pNextOk = !isNaN(pNextN) && pNextN === PROD.next;
  const pBothOk = pTypeOk && pNextOk;
 
  useSessionReport("Module · F-LE.A.2 Construct linear vs exponential (Predict→Test→Reconcile)",
    (committed) ? [
      "ALGEBRA — F-LE.A.2: Build the functions from two pairs, then see which grows past the other",
      `Bet: Option A (linear) from (0,$100),(3,$250); Option B (exponential) from (0,$20),(3,$160).`,
      `Prediction (locked before reveal — who's ahead at month 6): ${pickLabel} — "${prediction}"`,
      `Constructed: A(t) = 100 + 50t ; B(t) = 20 · 2^t.  At month 6: A = $${aBet}, B = $${bBet}.`,
      `Option B overtakes Option A at month ${crossover}.`,
      `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
      `Student's reconcile (what surprised them / why): ${surprise || "(not yet written)"}`,
      `Producer pairs: (1,6),(2,18),(3,54). Student classified as: ${pType || "(not chosen)"} ; next value given: ${pNext || "?"}`,
      `Student's reasoning (difference vs factor): ${pWhy}`,
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
 
  // A small two-row table renderer for the given pairs
  const PairTable = ({ title, color, rows, foot }) => (
    <div style={{ flex: "1 1 200px", background: C.bg, border: `1px solid ${C.line}`,
      borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontWeight: 700, color, fontSize: 14, marginBottom: 8 }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}>
        <thead>
          <tr style={{ color: C.sub, fontSize: 12, textAlign: "left" }}>
            <th style={{ padding: "2px 6px 6px 0", fontWeight: 600 }}>month</th>
            <th style={{ padding: "2px 0 6px", fontWeight: 600 }}>balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([m, v]) => (
            <tr key={m}>
              <td style={{ padding: "3px 6px 3px 0", fontFamily: "monospace" }}>{m}</td>
              <td style={{ padding: "3px 0", fontFamily: "monospace", fontWeight: 600 }}>${v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {foot && <div style={{ marginTop: 8, fontSize: 12.5, color: C.sub }}>{foot}</div>}
    </div>
  );
 
  return (
    <section>
      {/* ---------------- PREDICT ---------------- */}
      <StageTag>F-LE.A.2 · Predict</StageTag>
      <H>Two savings plans. Which is bigger at month 6?</H>
      <P>Two options, each shown as just two data points — month 0 and month 3. Same starting idea, very different
        growth. Read each table and figure out the rule behind it.</P>
 
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}>
        <PairTable title="Option A" color={C.indigo} rows={[[0, 100], [3, 250]]}
          foot="Goes up by the same amount each month." />
        <PairTable title="Option B" color={C.ember} rows={[[0, 20], [3, 160]]}
          foot="Multiplies by the same factor each month." />
      </div>
 
      <P style={{ margin: "10px 0 2px" }}><b>No graph yet.</b> Build both rules from the pairs, then look ahead to
        <b> month 6</b>. Which option has more money — the one <b>adding</b> a fixed amount, or the one
        <b> multiplying</b> by a fixed factor? Or are they tied?</P>
 
      <div style={{ margin: "6px 0 2px" }}>
        {choiceBtn("A", "Option A wins — adding $50 every month stays ahead", C.indigo)}
        {choiceBtn("B", "Option B wins — doubling overtakes it", C.ember)}
        {choiceBtn("tie", "They're tied at month 6", C.amber)}
      </div>
 
      <Field
        label="Why? (one sentence — this locks in before the graph unlocks)"
        value={prediction}
        onChange={setPrediction}
        placeholder="I think ___ wins because ___"
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
          <H>There are both functions. Watch what happens.</H>
          <P>Your call is locked: <b>{pickLabel}</b>. From the pairs, the rules are
            <b style={{ color: C.indigo }}> A(t) = 100 + 50t</b> (adds $50/mo) and
            <b style={{ color: C.ember }}> B(t) = 20 · 2ᵗ</b> (doubles/mo). Here's the early stretch the table
            covered — months 0 to 3.</P>
 
          <Plane width={440} height={320} xMin={0} xMax={showExtend ? 6 : 3} yMin={0} yMax={showExtend ? 1400 : 300}
            xLabel="month" yLabel="balance"
            curves={[
              { f: A, color: C.indigo, width: 2.8 },
              { f: B, color: C.ember, width: 2.8 },
            ]}>
            {({ sx, sy }) => (
              <>
                {/* the two given data points for A */}
                <circle cx={sx(0)} cy={sy(100)} r="3.6" fill={C.indigo} />
                <circle cx={sx(3)} cy={sy(250)} r="3.6" fill={C.indigo} />
                {/* the two given data points for B */}
                <circle cx={sx(0)} cy={sy(20)} r="3.6" fill={C.ember} />
                <circle cx={sx(3)} cy={sy(160)} r="3.6" fill={C.ember} />
                {/* crossover + bet-month markers appear only after extending */}
                {showExtend && crossover != null && (
                  <>
                    <circle cx={sx(crossover)} cy={sy(A(crossover))} r="4.5" fill={C.violet} />
                    <text x={sx(crossover) - 4} y={sy(A(crossover)) - 9} fontSize="10" fill={C.violet} textAnchor="middle">
                      B overtakes here (month {crossover})
                    </text>
                    <line x1={sx(BET_MONTH)} y1={sy(0)} x2={sx(BET_MONTH)} y2={sy(bBet)} stroke={C.line} strokeWidth="1.4" strokeDasharray="3 3" />
                    <circle cx={sx(BET_MONTH)} cy={sy(aBet)} r="3.6" fill={C.indigo} />
                    <circle cx={sx(BET_MONTH)} cy={sy(bBet)} r="3.6" fill={C.ember} />
                    <text x={sx(BET_MONTH) - 4} y={sy(aBet) + 14} fontSize="10" fill={C.indigo} textAnchor="end">${aBet}</text>
                    <text x={sx(BET_MONTH) - 4} y={sy(bBet) + 4} fontSize="10" fill={C.ember} textAnchor="end">${bBet}</text>
                  </>
                )}
              </>
            )}
          </Plane>
 
          {!showExtend && (
            <div style={{ marginTop: 12 }}>
              <P style={{ margin: "0 0 8px" }}>Through month 3 — the whole window the table showed you —
                <b style={{ color: C.indigo }}> Option A is ahead the entire way</b> ($250 vs $160 at month 3). If
                you stopped here, you'd say A wins easily. But the bet was month <b>6</b>. Extend both rules and
                watch.</P>
              <Btn onClick={() => setShowExtend(true)}>Extend to month 6 →</Btn>
            </div>
          )}
 
          {showExtend && (
            <>
              <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "13px 16px",
                margin: "14px 0", fontFamily: FONT_BODY, fontSize: 15, color: C.ink }}>
                <div style={{ fontFamily: "monospace", fontSize: 14.5, lineHeight: 1.7 }}>
                  A(6) = 100 + 50·6 = <b style={{ color: C.indigo }}>$400</b><br />
                  B(6) = 20 · 2⁶ = 20 · 64 = <b style={{ color: C.ember }}>$1,280</b>
                </div>
                <div style={{ marginTop: 8, color: C.sub, fontSize: 14 }}>
                  Adding $50 grows the balance by the same step forever. Doubling grows it by a bigger and bigger
                  step — $20 → $40 → $80 → $160 → $320 → $640 → $1,280. The two lines cross at month {crossover}, and
                  after that the exponential isn't just ahead, it runs away.
                </div>
              </div>
 
              {/* verified-praise-only: praise ONLY the checked call */}
              {predictionWasRight ? (
                <Coach tone="good">You called it. Even though Option A led through every point the table showed,
                  doubling overtakes adding at month {crossover} and reaches <b>$1,280</b> by month 6 — more than
                  three times Option A's $400. You read past the head start to the growth rule.</Coach>
              ) : (
                <Coach tone="neutral">Option A led the whole time the table showed — that's the trap. But B doubles,
                  so its steps keep growing; it passes A at month {crossover} and hits <b>$1,280</b> by month 6
                  versus A's $400. A fixed factor eventually beats a fixed amount, no matter how big the head start.
                  Hold onto what you expected and write it below.</Coach>
              )}
            </>
          )}
        </div>
      )}
 
      {/* ---------------- RECONCILE ---------------- */}
      {committed && showExtend && (
        <div style={{ marginTop: 24 }}>
          <StageTag>Reconcile</StageTag>
          <P style={{ marginBottom: 2 }}>
            {predictionWasRight
              ? "You were right — so nail down why. What is it about multiplying by a fixed factor that lets it overtake adding a fixed amount, even from way behind?"
              : "You picked \"" + pickLabel + ",\" but Option B overtook at month " + crossover + " and won big at month 6. What did you expect, and what did the doubling rule actually do?"}
          </P>
          <Field
            label={predictionWasRight ? "Say why a fixed factor beats a fixed amount — in your own words" : "I thought ___ would win, but ___ did because ___"}
            value={surprise}
            onChange={setSurprise}
            placeholder={predictionWasRight
              ? "Adding gives the same step every month, but doubling…"
              : "I thought A would win because it started higher, but B caught up because…"}
            rows={3}
          />
          {surprise.trim().length >= 12 ? (
            <>
              <Coach tone="neutral">Saved for your teacher in your own words — they'll read your reasoning, not a
                score. Now construct a function yourself from a fresh set of pairs.</Coach>
              <Btn onClick={() => setPhase("producer")}>Build one yourself →</Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              A sentence or two unlocks the next step. There's no right wording — just say what you noticed.
            </div>
          )}
        </div>
      )}
 
      {/* ---------------- PRODUCER — construct from fresh pairs ---------------- */}
      {phase === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Your turn — build the rule from the pairs</H>
          <P>Here's a fresh pattern, three input-output pairs. First decide what kind of growth it is, then use the
            rule you found to predict the next value.</P>
 
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "10px 0 4px" }}>
            <PairTable title="The pattern" color={C.indigo}
              rows={PROD.pairs.map(([t, v]) => [t, v])}
              foot="Look at how each value relates to the one before it." />
          </div>
 
          <div style={{ margin: "10px 0 2px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, display: "block", marginBottom: 6 }}>
              What kind of growth is this?
            </span>
            {[["linear", "Linear — it goes up by the same amount each step"],
              ["exp", "Exponential — it multiplies by the same factor each step"]].map(([k, label]) => {
              const active = pType === k;
              const color = k === "linear" ? C.indigo : C.ember;
              return (
                <button key={k} onClick={() => setPType(k)}
                  style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    fontFamily: FONT_BODY, fontSize: 15, color: C.ink,
                    background: active ? C.panel : "transparent",
                    border: `1.5px solid ${active ? color : C.line}`,
                    boxShadow: active ? `inset 3px 0 0 ${color}` : "none",
                    borderRadius: 10, padding: "10px 14px", margin: "6px 0", transition: "all .12s",
                    fontWeight: active ? 700 : 500 }}>
                  {label}
                </button>
              );
            })}
          </div>
 
          <label style={{ display: "inline-flex", flexDirection: "column", margin: "10px 0 2px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 5 }}>
              Using your rule, what's the value at month {PROD.nextT}?
            </span>
            <input value={pNext} onChange={(e) => setPNext(e.target.value)} placeholder="next value" inputMode="decimal"
              style={{ width: 130, fontFamily: FONT_BODY, fontSize: 16, color: C.ink, background: C.panel,
                border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 11px" }} />
          </label>
 
          <Field label="What's the rule, and how did you find it? (your words)"
            value={pWhy} onChange={setPWhy}
            placeholder="Each value is ___ the one before, so the rule is…" rows={2} />
 
          {(() => {
            if (!(pType !== "" && pNext.trim() !== "" && !isNaN(pNextN) && pWhy.trim().length > 4)) return null;
            const good = pBothOk && !isFiller(pWhy);
            if (good || stuck) return (
              <>
                <Coach tone="good">{pBothOk
                  ? `That's it — each value is 3× the one before (6 → 18 → 54), so it's exponential, and the next value is 54 × 3 = 162. You found the factor and built the rule from it.`
                  : `Saved — but recheck: each step multiplies by 3 (6 → 18 → 54), so it's exponential, and month ${PROD.nextT} is 54 × 3 = ${PROD.next}.`}
                  {" "}Your reasoning is in your own words and saved for your teacher.</Coach>
                <Btn onClick={() => setPhase("recap")}>See what you built →</Btn>
              </>
            );
            return (
              <>
                <Coach tone="redirect">{!pTypeOk
                  ? "Check whether the values share a constant difference or a constant factor: 6, 18, 54 — what do you multiply by each time?"
                  : !pNextOk
                  ? `The growth type is right. Now apply the factor once more: 54 × ___ = ?`
                  : "Put a real sentence in the box — name the factor and how it builds the rule."}</Coach>
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
            <RecapRow label="What the constructed functions showed" text={`A(t) = 100 + 50t and B(t) = 20·2ᵗ. At month 6: A = $400, B = $1,280. B overtakes A at month ${crossover}.`} />
            <RecapRow label={predictionWasRight ? "Why a fixed factor beats a fixed amount (your words)" : "What surprised you, and why (your words)"} text={surprise} />
            <RecapRow label="The pattern you built a rule for" text={`(1, 6), (2, 18), (3, 54)`} />
            <RecapRow label="Growth type you identified" text={pType === "exp" ? "Exponential (×3 each step)" : pType === "linear" ? "Linear" : ""} />
            <RecapRow label="Next value you predicted" text={pNext ? `month ${PROD.nextT}: $${pNext}` : ""} />
            <RecapRow label="Your rule, in your words" text={pWhy} />
          </div>
          <CopyResults lines={[
            "ALGEBRA — F-LE.A.2: Construct linear vs exponential from pairs",
            `Bet: Option A linear from (0,$100),(3,$250); Option B exponential from (0,$20),(3,$160)`,
            `Prediction (locked before reveal): ${pickLabel} — "${prediction}"`,
            `Constructed: A(t)=100+50t, B(t)=20·2^t. Month 6: A=$400, B=$1280; B overtakes at month ${crossover}.`,
            `Prediction matched the math: ${predictionWasRight ? "yes" : "no"}`,
            `Reconcile (student's words): ${surprise}`,
            `Producer pairs: (1,6),(2,18),(3,54)`,
            `Growth type: ${pType || "(none)"} ; next value given: ${pNext || "?"} (correct: ${PROD.next})`,
            `Rule reasoning (student's words): ${pWhy}`,
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
              F-LE.A.2 — build a linear and an exponential rule from two pairs each, then see which one wins. The
              graph stays locked until you commit a call in writing. The functions — not a grader — settle it.
            </p>
          </div>
 
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleLinearExpPTR />
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
 
