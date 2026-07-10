import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
import { useTelemetry } from "../lib/TelemetryContext";

// Bump on pedagogically meaningful change only (spec §4.6); roundIds are append-only.
export const MODULE_VERSION = "1.0.0";

// Fixed scenario id (spec §4.2) — the single bet this module runs.
const ROUND_ID = "one-pair-not-enough";
// Read by the StartGate: round_enter fires from the studentCode dismissal (spec §8).
export const TELEMETRY_ENTRY = { roundId: ROUND_ID, guideState: "predict" };
 
/* ============================================================================
   PROTOTYPE — PREDICT → TEST → RECONCILE
   Geometry Build 1 (Coordinate Reasoning, LEAP.II.GM.1) rebuilt around a
   load-bearing prediction — the "drag-to-break-the-parallelogram" conversion.
 
   The bet: "OT is parallel to PS, so it's a parallelogram." TRUE or NOT ENOUGH?
   The student commits in writing BEFORE the drag handle appears. Then they drag
   one vertex; the checked pair (OT ∥ PS) stays parallel for EVERY drag value,
   while the unwatched pair (OP vs TS) swings out of parallel — the figure is a
   trapezoid almost everywhere. The manipulative refutes the bet; no grader does.
 
   Carried over verbatim from the built Algebra PTR module:
   - design tokens (C), fonts, Coach/Btn/Field/NumField/Plane/RecapRow/CopyResults
   - copyText fallback chain, SessionContext / useSessionReport
   - isThinPrediction floor, isFiller floor
   - no-wall principle: the reveal UNLOCKS on commit, never hard-gates
   - verified-praise-only: praise fires only for the bet the manipulative
     actually showed (right call AND a trapezoid is on screen); reconcile prose
     is saved unjudged for the teacher
 
   The test-phase camera is deliberately FIXED bounds (O,T,S fixed; only P slides
   horizontally inside frame) so it cannot drift off-screen. The parametric
   auto-fit camera risk lives only in the producer phase, unchanged by this build.
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
function P({ children, style }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.ink, margin: "10px 0", ...style }}>{children}</p>;
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
 
/* ---------- prediction floor (verbatim from the Algebra PTR build) ---------- */
function isThinPrediction(v) {
  const t = (v || "").trim().toLowerCase();
  if (t.length < 4) return true;
  return /^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|maybe|not sure|i dont know)\.?$/.test(t);
}
 
/* ---------- pure geometry helpers (unit-testable; no React) -----------------
   Test-phase figure, FIXED bounds so it can never leave frame:
     O = (0,0)            fixed
     T = (8,0)            fixed         -> OT slope 0, ALWAYS
     S = (9,6)            fixed
     P = (1 + drag, 6)    only P moves  -> PS slope 0, ALWAYS (P,S both at y=6)
   The "checked" pair OT ∥ PS holds for every drag (both horizontal).
   The "unwatched" pair: slope(OP) = 6/(1+drag), slope(TS) = 6/(9-8) = 6.
   Equal — a parallelogram — ONLY when 1+drag === 1, i.e. drag === 0.
   Everywhere else: a trapezoid. drag===0 is the crossing-point analog.        */
function quadVertices(drag) {
  return {
    O: { x: 0, y: 0 },
    T: { x: 8, y: 0 },
    S: { x: 9, y: 6 },
    P: { x: 1 + drag, y: 6 },
  };
}
function slope(a, b) {
  const dx = b.x - a.x;
  if (dx === 0) return Infinity;
  return (b.y - a.y) / dx;
}
/* The two pair-slopes that decide parallelogram-vs-trapezoid. */
function pairSlopes(drag) {
  const v = quadVertices(drag);
  return {
    OT: slope(v.O, v.T),   // 0 always
    PS: slope(v.P, v.S),   // 0 always
    OP: slope(v.O, v.P),   // 6/(1+drag)
    TS: slope(v.T, v.S),   // 6 always
  };
}
function isParallelogram(drag) {
  const s = pairSlopes(drag);
  const topBottom = s.OT === s.PS;            // true for all drag
  const leftRight = Math.abs(s.OP - s.TS) < 1e-9;
  return topBottom && leftRight;
}
 
/* ============================================================================
   GEOMETRY MODULE — COORDINATE REASONING, as predict → test → reconcile
   ============================================================================ */
function ModuleCoordinatePTR() {
  // phase: predict -> revealed -> producer -> recap
  const [phase, setPhase] = useState("predict");
 
  // PREDICT — the bet: is one pair parallel SUFFICIENT?
  const [pick, setPick] = useState("");        // "enough" | "notEnough"
  const [prediction, setPrediction] = useState("");
  const [nudged, setNudged] = useState(false);
 
  // TEST (manipulative inert until committed)
  const DRAG_MIN = -3, DRAG_MAX = 5;
  const [drag, setDrag] = useState(0);
  const [touched, setTouched] = useState(false); // has the student moved off drag 0?
  const [committed, setCommitted] = useState(false);
 
  // RECONCILE
  const [surprise, setSurprise] = useState("");
 
  // PRODUCER (the literal released LEAP.II.GM.1 item — both pairs, variable coords)
  const [slopeOT, setSlopeOT] = useState("");
  const [slopePS, setSlopePS] = useState("");
  const [slopeOP, setSlopeOP] = useState("");
  const [slopeTS, setSlopeTS] = useState("");
  const [meaning, setMeaning] = useState("");   // why equal slopes settle it
  const [stuck, setStuck] = useState(false);
 
  const xMax = 12, yMax = 9;
 
  // correct bet is "not enough"; "enough" is the insufficient-condition misconception
  const predictionWasRight = pick === "notEnough";
  const isTrapNow = touched && !isParallelogram(drag);
 
  const { emit } = useTelemetry();

  const commit = () => {
    if (pick === "") return;
    if (isThinPrediction(prediction) && !nudged) { setNudged(true); return; }
    setCommitted(true);
    setPhase("revealed");
    emit({ roundId: ROUND_ID, guideState: "predict", action: "check", result: predictionWasRight ? "match" : "miss" });
  };
 
  const onDrag = (v) => {
    setDrag(v);
    if (v !== 0) setTouched(true);
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
    setDrag(0); setTouched(false); setCommitted(false); setSurprise("");
    setSlopeOT(""); setSlopePS(""); setSlopeOP(""); setSlopeTS(""); setMeaning(""); setStuck(false);
  };
 
  const pickLabel = pick === "enough" ? "One pair parallel is enough — it's a parallelogram"
    : pick === "notEnough" ? "One pair isn't enough — you have to check the other pair too" : "";
 
  const s = pairSlopes(drag);
  const opSlopeText = Number.isFinite(s.OP) ? s.OP.toFixed(2) : "∞";
 
  useSessionReport("Geometry · Coordinate Reasoning (Predict→Test→Reconcile)",
    committed ? [
      "GEOMETRY — Build 1: Coordinate Reasoning (LEAP.II.GM.1)",
      `Prediction (locked before drag): ${pickLabel} — "${prediction}"`,
      `What the figure did: OT ∥ PS held for every drag, but the shape was a trapezoid whenever the OP/TS slopes differed.`,
      `Prediction matched the geometry: ${predictionWasRight ? "yes" : "no"}`,
      `Student's reconcile (their words): ${surprise || "(not yet written)"}`,
      `Producer slopes — OT:${slopeOT || "—"} PS:${slopePS || "—"} OP:${slopeOP || "—"} TS:${slopeTS || "—"}`,
      `Why equal slopes settle it (their words): ${meaning}`,
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
 
  // shared figure renderer for the test phase
  const renderQuad = ({ sx, sy }) => {
    const v = quadVertices(drag);
    const para = isParallelogram(drag);
    const pts = [v.O, v.T, v.S, v.P];
    const poly = pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
    const sideColor = (a, b, watched) => watched ? C.teal : C.coral;
    const seg = (a, b, watched, key) => (
      <line key={key} x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)}
        stroke={sideColor(a, b, watched)} strokeWidth="2.8" />
    );
    return (
      <>
        <polygon points={poly} fill={para ? "rgba(29,138,102,0.07)" : "rgba(200,85,43,0.07)"} stroke="none" />
        {/* watched pair — the one the buggy proof checked — teal */}
        {seg(v.O, v.T, true, "OT")}
        {seg(v.P, v.S, true, "PS")}
        {/* unwatched pair — coral */}
        {seg(v.O, v.P, false, "OP")}
        {seg(v.T, v.S, false, "TS")}
        {/* parallelogram marker: amber ring at drag 0, the crossing analog */}
        {para && (
          <circle cx={sx(v.P.x)} cy={sy(v.P.y)} r="7" fill="none" stroke={C.amber} strokeWidth="2.2" />
        )}
        {/* the moving vertex P, emphasized as the handle */}
        <circle cx={sx(v.P.x)} cy={sy(v.P.y)} r="5.5" fill={C.coral} />
        {[["O", v.O], ["T", v.T], ["S", v.S], ["P", v.P]].map(([lbl, p]) => (
          <text key={lbl} x={sx(p.x) + (lbl === "T" || lbl === "S" ? 8 : -8)}
            y={sy(p.y) + (p.y === 0 ? 16 : -8)} fontSize="12" fontWeight="700"
            fill={C.ink} textAnchor={lbl === "T" || lbl === "S" ? "start" : "end"}>{lbl}</text>
        ))}
      </>
    );
  };
 
  return (
    <section>
      {/* ---------------- PREDICT ---------------- */}
      <StageTag>Coordinate Reasoning · Predict</StageTag>
      <H>Call it before you can move it</H>
      <P>A classmate is proving a four-sided figure <b>O, T, S, P</b> is a parallelogram. Their whole
        argument: <i>"Side <b style={{ color: C.teal }}>OT</b> is parallel to side <b style={{ color: C.teal }}>PS</b>
        {" "}— both are flat, slope 0. So it's a parallelogram."</i></P>
      <P><b>You don't get to move the figure yet.</b> First, make the call: is that enough to be sure it's a
        parallelogram — or not?</P>
 
      <div style={{ margin: "6px 0 2px" }}>
        {choiceBtn("enough", "One pair parallel is enough — it's a parallelogram", C.blue)}
        {choiceBtn("notEnough", "Not enough — you'd have to check the other pair too", C.coral)}
      </div>
 
      <Field
        label="Why? (one sentence — this locks in before you can drag anything)"
        value={prediction}
        onChange={setPrediction}
        placeholder="I think ___ because ___"
        rows={2}
        disabled={committed}
      />
 
      {nudged && !committed && isThinPrediction(prediction) && (
        <Coach tone="redirect">Commit to a reason — even a hunch. The point is to find out if you're right, and
          you can't be wrong-then-fixed if you don't say anything yet. The drag handle unlocks the second you do.</Coach>
      )}
 
      {!committed && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Btn onClick={commit} disabled={pick === ""}>
            {nudged && isThinPrediction(prediction) ? "Lock it in anyway →" : "Lock in my call → unlock the figure"}
          </Btn>
          {pick === "" && <span style={{ fontSize: 13, color: C.sub }}>Pick one of the two first.</span>}
        </div>
      )}
 
      {/* ---------------- TEST (revealed only after commit) ---------------- */}
      {committed && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Test</StageTag>
          <H>Now drag P. Does the proof hold?</H>
          <P>Your call is locked: <b>{pickLabel.toLowerCase()}</b>. Drag <b style={{ color: C.coral }}>P</b> and
            keep your eye on the <b style={{ color: C.teal }}>flat pair OT and PS</b> — and on the
            {" "}<b style={{ color: C.coral }}>slanted pair OP and TS</b> nobody checked.</P>
 
          <Plane width={440} height={300} xMax={xMax} yMax={yMax} xLabel="x" yLabel="y">
            {renderQuad}
          </Plane>
 
          <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.sub }}>
            Drag vertex P {isParallelogram(drag)
              ? <span style={{ color: C.teal, fontWeight: 700 }}> · parallelogram (both pairs parallel)</span>
              : <span style={{ color: C.coral, fontWeight: 700 }}> · trapezoid (only OT ∥ PS)</span>}
          </label>
          <input type="range" min={DRAG_MIN} max={DRAG_MAX} step={1} value={drag}
            onChange={(e) => onDrag(+e.target.value)} style={{ width: "100%" }} />
 
          <div style={{ fontSize: 13, color: C.sub, marginTop: 8, fontFamily: "monospace" }}>
            slope OT = {s.OT.toFixed(2)} · slope PS = {s.PS.toFixed(2)}
            {"  →  the checked pair is parallel no matter what"}
            <br />
            slope OP = {opSlopeText} · slope TS = {s.TS.toFixed(2)}
            {"  →  "}{Math.abs(s.OP - s.TS) < 1e-9 ? "equal (only here)" : "NOT equal"}
          </div>
 
          {/* verified-praise-only: praise fires only when the bet was "not enough"
              AND a trapezoid is actually on screen — the thing the drag showed. */}
          {touched && phase === "revealed" && (
            isTrapNow ? (
              predictionWasRight ? (
                <Coach tone="good">You called it. Drag anywhere — OT and PS never stop being parallel, both flat.
                  But the figure is a trapezoid almost everywhere, because OP and TS don't match. One pair parallel
                  is exactly what a trapezoid has. The proof checked the easy pair and quit.</Coach>
              ) : (
                <Coach tone="neutral">Watch the slanted sides. OT and PS stayed parallel the whole drag — and the
                  figure still became a trapezoid. So "one pair parallel" couldn't have been enough on its own.
                  Hold onto what just surprised you and write it below.</Coach>
              )
            ) : (
              <Coach tone="neutral">Right here both pairs line up, so it's a parallelogram — that's the one spot it
                works. Slide P away and keep watching OP and TS.</Coach>
            )
          )}
 
          {!touched && phase === "revealed" && (
            <Coach tone="neutral">Slide P off its starting spot — watch what the unchecked pair (OP and TS) does.</Coach>
          )}
        </div>
      )}
 
      {/* ---------------- RECONCILE ---------------- */}
      {committed && isTrapNow && (
        <div style={{ marginTop: 24 }}>
          <StageTag>Reconcile</StageTag>
          <P style={{ marginBottom: 2 }}>
            {predictionWasRight
              ? "You were right — so make the reasoning airtight. Why does one pair of parallel sides fail to guarantee a parallelogram?"
              : "You picked \"" + pickLabel.toLowerCase() + ",\" but dragging P made a trapezoid with OT still parallel to PS. What did you expect, and what actually made the difference?"}
          </P>
          <Field
            label={predictionWasRight ? "Say why both pairs are required — in your own words" : "I thought ___, but the figure showed ___ because ___"}
            value={surprise}
            onChange={setSurprise}
            placeholder={predictionWasRight
              ? "One pair parallel only rules out… it doesn't rule out a trapezoid because…"
              : "I thought one parallel pair was enough, but the shape turned into a trapezoid because…"}
            rows={3}
          />
          {surprise.trim().length >= 12 ? (
            <>
              <Coach tone="neutral">Saved for your teacher in your own words — they'll read your reasoning, not a
                score. Now prove it the way the test asks: with the slopes.</Coach>
              <Btn onClick={startProducer}>Prove it with coordinates →</Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
              A sentence or two unlocks the proof step. There's no right wording — just say what you noticed.
            </div>
          )}
        </div>
      )}
 
      {/* ---------------- PRODUCER (the literal released LEAP.II.GM.1 item) ---------------- */}
      {phase === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Prove it</StageTag>
          <H>The real item — variable coordinates</H>
          <P>Prove this figure is a parallelogram: <code style={{ fontFamily: "monospace" }}>O(0,0)</code>,
            {" "}<code style={{ fontFamily: "monospace" }}>T(c,0)</code>,
            {" "}<code style={{ fontFamily: "monospace" }}>S(a+c,b)</code>,
            {" "}<code style={{ fontFamily: "monospace" }}>P(a,b)</code>. No numbers — letters stand for any
            parallelogram. Show <b>both</b> pairs of opposite sides have equal slope.</P>
 
          <Plane width={440} height={300} xMax={12} yMax={9} xLabel="x" yLabel="y">
            {({ sx, sy }) => {
              // illustrative instance a=3, b=6, c=6 so the family is visible (auto-fit lives here in prod)
              const a = 3, b = 6, c = 6;
              const O = { x: 0, y: 0 }, T = { x: c, y: 0 }, S = { x: a + c, y: b }, Pv = { x: a, y: b };
              const poly = [O, T, S, Pv].map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
              return (
                <>
                  <polygon points={poly} fill="rgba(47,111,176,0.07)" stroke={C.blue} strokeWidth="2.2" />
                  {[["O", O], ["T", T], ["S", S], ["P", Pv]].map(([lbl, p]) => (
                    <text key={lbl} x={sx(p.x) + (lbl === "T" || lbl === "S" ? 8 : -8)}
                      y={sy(p.y) + (p.y === 0 ? 16 : -8)} fontSize="12" fontWeight="700"
                      fill={C.ink} textAnchor={lbl === "T" || lbl === "S" ? "start" : "end"}>{lbl}</text>
                  ))}
                </>
              );
            }}
          </Plane>
          <div style={{ fontSize: 12.5, color: C.sub, marginTop: 6 }}>
            (Shown with a = 3, b = 6, c = 6 so you can see one member of the family. Your proof should use the letters.)
          </div>
 
          <div style={{ marginTop: 10 }}>
            <NumField label="slope OT" value={slopeOT} onChange={setSlopeOT} placeholder="0" />
            <NumField label="slope PS" value={slopePS} onChange={setSlopePS} placeholder="0" />
            <NumField label="slope OP" value={slopeOP} onChange={setSlopeOP} placeholder="b/a" />
            <NumField label="slope TS" value={slopeTS} onChange={setSlopeTS} placeholder="b/a" />
          </div>
 
          <Field label="Why does showing both pairs of equal slopes prove it's a parallelogram (and rule out the trapezoid you saw)?"
            value={meaning} onChange={setMeaning}
            placeholder="Equal slopes mean parallel. Both pairs parallel means… and a trapezoid would fail because…" rows={3} />
 
          {(() => {
            const norm = (x) => (x || "").replace(/\s+/g, "").toLowerCase();
            // OT and PS are flat (0); OP and TS are both b/a. Accept "0" and a b/a form.
            const flatOk = norm(slopeOT) === "0" && norm(slopePS) === "0";
            const leanOk = ["b/a", "(b)/(a)", "b÷a"].includes(norm(slopeOP)) &&
                           ["b/a", "(b)/(a)", "b÷a"].includes(norm(slopeTS));
            const haveAll = slopeOT && slopePS && slopeOP && slopeTS && meaning.trim().length > 4;
            if (!haveAll) return null;
            const good = flatOk && leanOk && !isFiller(meaning);
            if (good || stuck) return (
              <>
                <Coach tone="good">Both pairs check out — OT ∥ PS (slope 0) and OP ∥ TS (slope b/a). Two pairs of
                  parallel sides is the definition, so it's a parallelogram for <i>any</i> a, b, c — not just one
                  picture. Your "why" is in your own words; reread it and make sure it names both pairs. Saved for
                  your teacher.</Coach>
                <Btn onClick={() => finishModule(flatOk && leanOk)}>See the argument you built →</Btn>
              </>
            );
            return (
              <>
                <Coach tone="redirect">{!flatOk
                  ? "OT runs along the x-axis and PS is flat at height b — both have slope 0. Recheck those two."
                  : !leanOk
                  ? "OP goes from (0,0) to (a,b): rise b over run a, so b/a. TS goes from (c,0) to (a+c,b): same rise b, same run a — also b/a. Write both as b/a."
                  : "Put a real sentence in the 'why' box — name both pairs and say why two parallel pairs rules out the trapezoid."}</Coach>
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
            <RecapRow label="Your locked-in call (before any drag)" text={`${pickLabel} — "${prediction}"`} />
            <RecapRow label="What the figure actually did" text="OT stayed parallel to PS for every drag, but the shape was a trapezoid wherever OP and TS slopes differed." />
            <RecapRow label={predictionWasRight ? "Why one pair isn't enough (your words)" : "What surprised you, and why (your words)"} text={surprise} />
            <RecapRow label="What you checked first (the easy pair)" text={slopeOT && slopePS ? `OT = ${slopeOT}, PS = ${slopePS}` : ""} />
            <RecapRow label="The pair the buggy proof skipped" text={slopeOP && slopeTS ? `OP = ${slopeOP}, TS = ${slopeTS}` : ""} />
            <RecapRow label="Why two parallel pairs settles it" text={meaning} />
          </div>
          <CopyResults lines={[
            "GEOMETRY — Build 1: Coordinate Reasoning (LEAP.II.GM.1)",
            `Prediction (locked before drag): ${pickLabel} — "${prediction}"`,
            `Prediction matched the geometry: ${predictionWasRight ? "yes" : "no"}`,
            `Reconcile (student's words): ${surprise}`,
            `Slopes — OT:${slopeOT} PS:${slopePS} OP:${slopeOP} TS:${slopeTS}`,
            `Why two parallel pairs settles it: ${meaning}`,
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
              textTransform: "uppercase", color: C.sub }}>Geometry · Reasoning Lab · Prototype</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 600, margin: "4px 0 0" }}>
              Predict → Test → Reconcile
            </h1>
            <p style={{ fontSize: 14.5, color: C.sub, lineHeight: 1.5, margin: "8px 0 0" }}>
              The figure stays locked until you commit a call in writing. Dragging the vertex — not a grader —
              tells you whether one parallel pair was ever enough.
            </p>
          </div>
 
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleCoordinatePTR />
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
 
/* Named export of pure helpers so the test harness can unit-test gate/crossing math. */
export { quadVertices, pairSlopes, slope, isParallelogram };
 
