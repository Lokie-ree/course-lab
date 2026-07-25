import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
import { useTelemetry } from "../lib/TelemetryContext";

// Bump on pedagogically meaningful change only (spec §4.6); roundIds are append-only.
export const MODULE_VERSION = "1.0.0";

// Read by the StartGate: round_enter fires from the studentCode dismissal (spec §8).
export const TELEMETRY_ENTRY = { roundId: "vshift-quad-plus3", guideState: "predict" };

/* ============================================================================
   TRANSFORMATIONS — PREDICT → TEST → RECONCILE → EARNED SANDBOX
   F-BF.B.3 — effects of f(x)+k, k·f(x), f(x+k) on a graph. Cited by ~10
   lessons across Algebra II (U2, U10) and Algebra III (U4) — the highest-reuse
   standard in the two-course assignment.

   The bet: three rounds of a·f(x+h)+k, each committed in writing before the
   curve moves. Round 2 is the trap — f(x+2) slides LEFT, and most students
   say right; that miss, reconciled in the student's own words, is the whole
   module. Round 3 switches families to |x| so the rules read as general, not
   as parabola trivia. Then a producer round (hit a fixed target by reading
   its parameters), and only after that does the free-play slider sandbox
   unlock — the earned reveal.

   Carried over VERBATIM from QuadraticsPTR (house ruling: single-file module
   artifacts, spec §5 — do NOT extract a shared kit):
   - Coach / Btn / Field / NumField / Plane / RecapRow / CopyResults atoms
   - copyText fallback chain, SessionContext / useSessionReport
   - no-wall principle: unlimited producer retries + a ghost "move on anyway"
   - verified-praise-only: the app praises only the call it checked

   Plane is extended here for reflections (y spans negatives) and for the
   move-moment: the transformed polyline carries a CSS transition so a
   parameter change animates rather than teleports.
   ============================================================================ */

// F-BF.B.3 — a·f(x+h)+k on two families; later families APPEND here (design ruling).
const FAMILIES = {
  quad: { label: "y = x²", f: (x) => x * x },
  abs: { label: "y = |x|", f: (x) => Math.abs(x) },
};

// Append-only, parameter-coupled (spec §4.6).
const ROUNDS = [
  { roundId: "vshift-quad-plus3", family: "quad", a: 1, h: 0, k: 3,
    prompt: "Where does f(x) + 3 send the parabola?",
    choices: [["up", "Up 3"], ["down", "Down 3"], ["left", "Left 3"], ["right", "Right 3"]],
    correct: "up" },
  { roundId: "hshift-quad-plus2", family: "quad", a: 1, h: 2, k: 0,
    prompt: "Where does f(x + 2) send the parabola?",
    choices: [["left", "Left 2"], ["right", "Right 2"], ["up", "Up 2"], ["down", "Down 2"]],
    correct: "left" },   // the trap round — most students pick "right"
  { roundId: "stretch-reflect-abs", family: "abs", a: -2, h: 0, k: 0,
    prompt: "What does −2·f(x) do to y = |x|?",
    choices: [["flip-stretch", "Flips it over the x-axis and makes it steeper"],
              ["flip-shrink", "Flips it and makes it wider"],
              ["stretch", "Just makes it steeper, still opens up"],
              ["shift", "Slides it down 2"]],
    correct: "flip-stretch" },
];

// Producer target (fixed, single-scenario convention §4.2): −1·f(x+2)+3 on |x|.
const PRODUCER = { roundId: "producer-abs-n1-h2-k3", family: "abs", a: -1, h: 2, k: 3 };
const SANDBOX_ROUND_ID = "sandbox-free-play";

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
  ember: "#C6471F",   // the transformed curve
  violet: "#6B4FB0",  // the producer TARGET curve ONLY
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
// Extended from QuadraticsPTR's Plane: the y-range spans negatives (round 3
// reflects across the x-axis), and each curve may carry `animate` — a CSS
// transition on the polyline so a parameter change reads as a MOVE, not a
// teleport. That transition is the module's whole "test" moment.
function Plane({ width = 440, height = 320, xMin = -8, xMax = 8, yMin = -10, yMax = 10, children, xLabel, yLabel, curves }) {
  const pad = { l: 42, r: 14, t: 14, b: 32 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const sx = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * iw;
  const sy = (y) => pad.t + ih - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * ih;
  const xticks = []; for (let t = Math.ceil(xMin); t <= xMax; t++) if (t % 2 === 0) xticks.push(t);
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
      {/* both axes emphasized — shifts are read against them */}
      <line x1={pad.l} y1={sy(0)} x2={pad.l + iw} y2={sy(0)} stroke={C.sub} strokeWidth="1.6" />
      <line x1={sx(0)} y1={pad.t} x2={sx(0)} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.6" />
      {xticks.map((t) => t !== 0 && <text key={`tx${t}`} x={sx(t)} y={sy(0) + 15} fontSize="10" fill={C.sub} textAnchor="middle">{t}</text>)}
      {yticks.map((t) => t !== 0 && <text key={`ty${t}`} x={pad.l - 6} y={sy(t) + 3} fontSize="10" fill={C.sub} textAnchor="end">{t}</text>)}
      <text x={pad.l + iw / 2} y={height - 1} fontSize="11" fill={C.sub} textAnchor="middle">{xLabel}</text>
      <text x={11} y={pad.t + ih / 2} fontSize="11" fill={C.sub} textAnchor="middle"
        transform={`rotate(-90 11 ${pad.t + ih / 2})`}>{yLabel}</text>
      {(curves || []).map((c, i) => (
        <polyline key={c.key || `curve${i}`} points={buildPath(c.f, c.samples)} fill="none"
          stroke={c.color} strokeWidth={c.width || 2.6} strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={c.dash} style={c.animate ? { transition: "all .6s ease" } : undefined} />
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

// a·f(x+h)+k — the one rule the whole module is about.
const transform = (f, a, h, k) => (x) => a * f(x + h) + k;

// "−2·f(x + 1) − 3" style readout; the identity terms drop out.
function equationText(a, h, k) {
  const aPart = a === 1 ? "f(" : a === -1 ? "−f(" : `${String(a).replace("-", "−")}·f(`;
  const hPart = h === 0 ? "x)" : h > 0 ? `x + ${h})` : `x − ${Math.abs(h)})`;
  const kPart = k === 0 ? "" : k > 0 ? ` + ${k}` : ` − ${Math.abs(k)}`;
  return `y = ${aPart}${hPart}${kPart}`;
}

function ModuleTransformationsPTR() {
  return (
    <section>
      <StageTag>F-BF.B.3 · Predict</StageTag>
      <H>transformations-ptr</H>
      <P>Rounds land in the next commit.</P>
      <Plane xLabel="x" yLabel="y"
        curves={[{ key: "ghost", f: FAMILIES.quad.f, color: C.sub, width: 2, dash: "5 4" }]} />
    </section>
  );
}

/* ============================================================================
   APP SHELL — session store + frame (mirrors the QuadraticsPTR shell)
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
              textTransform: "uppercase", color: C.sub }}>F-BF.B.3 · Function Transformations</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 600, margin: "4px 0 0" }}>
              Predict → Test → Reconcile
            </h1>
            <p style={{ fontSize: 14.5, color: C.sub, lineHeight: 1.5, margin: "8px 0 0" }}>
              Changing a, h, or k in <b>a·f(x + h) + k</b> moves a graph in a predictable way. Each round locks your
              call in writing before the curve moves — the graph, not a grader, settles it.
            </p>
          </div>

          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "22px 22px 26px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <ModuleTransformationsPTR />
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
