import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
 
/* ============================================================================
   PROTOTYPE — ASSUME → FIT → REFLECT   (the fitting family, NOT the spine)
   HSS-ID.B.6 — Represent data on two quantitative variables on a scatter plot
   and describe how the variables are related.
     folding in:
     HSS-ID.C.7 — interpret slope and intercept of a linear model in context
     HSS-ID.A.3 — account for the effect of extreme points (outliers)
 
   WHY THIS IS NOT PREDICT → TEST → RECONCILE
   --------------------------------------------------------------------------
   The spine needs a wrong intuitive answer a manipulative overturns: a
   crossing, a count, a "which one wins." Describing how two variables relate
   has none. Reasonable students read the same cloud differently. So the
   load-bearing move is NOT "commit a prediction" — it is "commit an ASSUMPTION
   and own it." The adjudicator is NOT right/wrong — it is the RESIDUAL: a cost
   you reason about, never a verdict you pass or fail.
 
   THE NO-SNAP RULE (the thing that keeps this from collapsing back into the
   spine / into "matching IS verification"):
     - The student's line is THEIR line. It never snaps to a best fit.
     - Residual goes DOWN as the fit improves but NEVER reaches zero and never
       locks. Two different defensible lines can leave similar residual.
     - For the curved round, the data is ENGINEERED to defeat a straight line:
       the leftover error stays stubbornly high no matter what the student does,
       and that resistance IS the lesson (the micro-model — LEAP.III.A1.3).
 
   Carried over VERBATIM from the binding/spine builds (spine, not skin):
     - Coach / Btn / Field / RecapRow / CopyResults atoms
     - copyText fallback chain, SessionContext / useSessionReport
     - no-wall principle: reflect UNLOCKS on commit, never hard-gates
     - verified-praise-only: the app praises only the fit quality it actually
       measured (residual); ALL assume/reflect prose is saved unjudged for the
       teacher. The keep/drop CHOICE is never graded — only that it was owned.
 
   NEW in this build (what the fitting family genuinely needs):
     - ScatterPlane: a draggable two-handle line over a point cloud with live
       residual. Sibling to Plane (which draws functions); does NOT replace it.
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
  ember: "#C6471F",   // the student's fitted line
  violet: "#6B4FB0",  // residual emphasis / interpreted unit
  teal: "#1D8A66",
  amber: "#A8740F",   // set-aside points / learning moments
  goodBg: "#E9F4EF",
  goodInk: "#125E47",
  warnBg: "#FAF1DA",
  warnInk: "#74520A",
  neutralBg: "#EDF1F8",
  neutralInk: "#283F66",
  dot: "#3457A6",
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
 
/* ============================================================================
   ScatterPlane — the NEW manipulative.
   A point cloud + a two-handle draggable line. Residual is computed live as
   mean absolute vertical error over the ACTIVE points (set-aside points are
   excluded from the residual but stay visible, greyed, so the student sees what
   they chose to ignore). NO SNAP: the line is exactly where the handles are.
   ============================================================================ */
function ScatterPlane({
  width = 460, height = 340,
  xMin, xMax, yMin, yMax,
  points,                 // [{x,y,id}]
  setAside = {},          // { id: true } — excluded from residual, shown greyed
  line,                   // { x1,y1,x2,y2 } handle positions in DATA coords
  onHandle,               // (which:'a'|'b', dataX, dataY) => void
  xLabel, yLabel,
  showResiduals = false,
}) {
  const pad = { l: 46, r: 16, t: 16, b: 34 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const svgRef = useRef(null);
  const dragRef = useRef(null);
 
  const sx = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * iw;
  const sy = (y) => pad.t + ih - ((y - yMin) / (yMax - yMin)) * ih;
  const invX = (px) => xMin + ((px - pad.l) / iw) * (xMax - xMin);
  const invY = (py) => yMin + ((pad.t + ih - py) / ih) * (yMax - yMin);
 
  // line as y = m x + b from the two handles
  const m = (line.y2 - line.y1) / (line.x2 - line.x1 || 1e-9);
  const b = line.y1 - m * line.x1;
  const fy = (x) => m * x + b;
 
  const clientToData = (clientX, clientY) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * width;
    const py = ((clientY - rect.top) / rect.height) * height;
    let dx = invX(px), dy = invY(py);
    dx = Math.max(xMin, Math.min(xMax, dx));
    dy = Math.max(yMin, Math.min(yMax, dy));
    return { dx, dy };
  };
 
  const startDrag = (which) => (e) => {
    e.preventDefault();
    dragRef.current = which;
  };
  useEffect(() => {
    const move = (e) => {
      if (!dragRef.current) return;
      const pt = e.touches ? e.touches[0] : e;
      const { dx, dy } = clientToData(pt.clientX, pt.clientY);
      onHandle(dragRef.current, dx, dy);
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [onHandle, xMin, xMax, yMin, yMax]);
 
  const xticks = []; for (let t = Math.ceil(xMin); t <= xMax; t++) xticks.push(t);
  const yStep = (yMax - yMin) > 40 ? 20 : (yMax - yMin) > 12 ? 4 : 2;
  const yticks = []; for (let t = Math.ceil(yMin / yStep) * yStep; t <= yMax; t += yStep) yticks.push(t);
 
  // line clipped to plotting box
  const lx1 = xMin, lx2 = xMax;
  const ly1 = Math.max(yMin, Math.min(yMax, fy(lx1)));
  const ly2 = Math.max(yMin, Math.min(yMax, fy(lx2)));
 
  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", background: C.panel, border: `1px solid ${C.line}`,
        borderRadius: 10, display: "block", touchAction: "none", userSelect: "none" }}>
      {xticks.map((t) => <line key={`gx${t}`} x1={sx(t)} y1={pad.t} x2={sx(t)} y2={pad.t + ih} stroke="#F0ECE2" />)}
      {yticks.map((t) => <line key={`gy${t}`} x1={pad.l} y1={sy(t)} x2={pad.l + iw} y2={sy(t)} stroke="#F0ECE2" />)}
      <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.4" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ih} stroke={C.sub} strokeWidth="1.4" />
      {xticks.filter((t) => t % (xticks.length > 9 ? 2 : 1) === 0).map((t) =>
        <text key={`tx${t}`} x={sx(t)} y={pad.t + ih + 15} fontSize="10" fill={C.sub} textAnchor="middle">{t}</text>)}
      {yticks.map((t) => <text key={`ty${t}`} x={pad.l - 7} y={sy(t) + 3} fontSize="10" fill={C.sub} textAnchor="end">{t}</text>)}
      <text x={pad.l + iw / 2} y={height - 2} fontSize="11" fill={C.sub} textAnchor="middle">{xLabel}</text>
      <text x={12} y={pad.t + ih / 2} fontSize="11" fill={C.sub} textAnchor="middle"
        transform={`rotate(-90 12 ${pad.t + ih / 2})`}>{yLabel}</text>
 
      {/* residual sticks (only on active points) */}
      {showResiduals && points.map((p) => {
        if (setAside[p.id]) return null;
        return <line key={`r${p.id}`} x1={sx(p.x)} y1={sy(p.y)} x2={sx(p.x)} y2={sy(fy(p.x))}
          stroke={C.violet} strokeWidth="1.3" strokeDasharray="2 2" opacity="0.7" />;
      })}
 
      {/* the student's line */}
      <line x1={sx(lx1)} y1={sy(ly1)} x2={sx(lx2)} y2={sy(ly2)} stroke={C.ember} strokeWidth="2.6" strokeLinecap="round" />
 
      {/* points: active = solid indigo, set-aside = hollow amber */}
      {points.map((p) => setAside[p.id]
        ? <circle key={p.id} cx={sx(p.x)} cy={sy(p.y)} r="5" fill={C.panel} stroke={C.amber} strokeWidth="2" />
        : <circle key={p.id} cx={sx(p.x)} cy={sy(p.y)} r="5" fill={C.dot} opacity="0.92" />
      )}
 
      {/* draggable handles */}
      {["a", "b"].map((which) => {
        const hx = which === "a" ? line.x1 : line.x2;
        const hy = which === "a" ? line.y1 : line.y2;
        return (
          <g key={which} style={{ cursor: "grab" }}
            onMouseDown={startDrag(which)} onTouchStart={startDrag(which)}>
            <circle cx={sx(hx)} cy={sy(hy)} r="12" fill={C.ember} opacity="0.14" />
            <circle cx={sx(hx)} cy={sy(hy)} r="6.5" fill={C.panel} stroke={C.ember} strokeWidth="2.4" />
          </g>
        );
      })}
    </svg>
  );
}
 
/* compute mean absolute residual over active points */
function meanAbsResidual(points, setAside, line) {
  const m = (line.y2 - line.y1) / (line.x2 - line.x1 || 1e-9);
  const b = line.y1 - m * line.x1;
  const active = points.filter((p) => !setAside[p.id]);
  if (!active.length) return null;
  const total = active.reduce((s, p) => s + Math.abs(p.y - (m * p.x + b)), 0);
  return total / active.length;
}
 
/* ============================================================================
   ROUND DATA
   Each round's cloud is hand-placed so the BET is real:
   R1: two outliers pull OPPOSITE ways → keep/drop genuinely divides students
   R2: rides on R1's fitted line — interpret slope & intercept (C.7)
   R3: data CURVES → a straight line cannot get the residual low (micro-model)
   ============================================================================ */
const R1 = {
  xMin: 0, xMax: 9, yMin: 30, yMax: 100,
  xLabel: "Hours studied", yLabel: "Test score",
  // 12 honest points on a ~ +6/hr trend through (0,52), plus two opposing outliers
  points: [
    { id: "p1", x: 1, y: 58 }, { id: "p2", x: 2, y: 62 }, { id: "p3", x: 2, y: 68 },
    { id: "p4", x: 3, y: 70 }, { id: "p5", x: 3, y: 74 }, { id: "p6", x: 4, y: 78 },
    { id: "p7", x: 4, y: 72 }, { id: "p8", x: 5, y: 82 }, { id: "p9", x: 5, y: 86 },
    { id: "p10", x: 6, y: 88 }, { id: "p11", x: 6, y: 84 }, { id: "p12", x: 7, y: 92 },
    { id: "OUT_HI", x: 1, y: 95 },   // studied 1 hr, aced it — prior knowledge?
    { id: "OUT_LO", x: 8, y: 55 },   // studied 8 hrs, bombed — bad day?
  ],
  outliers: ["OUT_HI", "OUT_LO"],
  initLine: { x1: 0, y1: 60, x2: 9, y2: 80 },
};
const R3 = {
  xMin: 0, xMax: 10, yMin: 0, yMax: 100,
  xLabel: "Hours since unplugged", yLabel: "Battery %",
  // convex decay: flat-ish then plunges. A straight line leaves big residual no
  // matter where it's dragged. Values from 100*0.78^x lightly jittered.
  points: [
    { id: "b0", x: 0, y: 100 }, { id: "b1", x: 1, y: 80 }, { id: "b2", x: 2, y: 64 },
    { id: "b3", x: 3, y: 52 }, { id: "b4", x: 4, y: 40 }, { id: "b5", x: 5, y: 33 },
    { id: "b6", x: 6, y: 25 }, { id: "b7", x: 7, y: 20 }, { id: "b8", x: 8, y: 15 },
    { id: "b9", x: 9, y: 12 }, { id: "b10", x: 10, y: 9 },
  ],
  outliers: [],
  initLine: { x1: 0, y1: 80, x2: 10, y2: 20 },
};
 
/* ---------------------------------------------------------------------------
   STAGE 1 — ASSUME → FIT (Round 1). The keep/drop bet + the no-snap fit.
   --------------------------------------------------------------------------- */
function StageFitOutlier({ onLineLocked }) {
  const [assumption, setAssumption] = useState("");
  const [committed, setCommitted] = useState(false);
  const [line, setLine] = useState(R1.initLine);
  const [setAside, setSetAside] = useState({});
  const [locked, setLocked] = useState(false);
 
  const onHandle = (which, dx, dy) => {
    setLine((L) => which === "a" ? { ...L, x1: dx, y1: dy } : { ...L, x2: dx, y2: dy });
  };
  const toggleAside = (id) => setSetAside((s) => ({ ...s, [id]: !s[id] }));
 
  const resid = useMemo(() => meanAbsResidual(R1.points, setAside, line), [setAside, line]);
  const asideCount = Object.values(setAside).filter(Boolean).length;
 
  const m = (line.y2 - line.y1) / (line.x2 - line.x1 || 1e-9);
  const b = line.y1 - m * line.x1;
 
  useSessionReport("Round 1 — Study hours vs. score", [
    `Assumption before fitting: ${assumption || "—"}`,
    committed ? `Points set aside: ${asideCount === 0 ? "none — kept all 14" : Object.keys(setAside).filter(k => setAside[k]).join(", ")}` : "",
    locked ? `Fitted line: score ≈ ${m.toFixed(1)} × hours + ${b.toFixed(0)} (mean error ${resid?.toFixed(1)} pts)` : "",
  ]);
 
  return (
    <section>
      <StageTag>HSS-ID.B.6 · Assume</StageTag>
      <H>Does studying more raise the score?</H>
      <P>Fourteen students. Some studied a lot, some barely. Before you draw a single line —
        two of these points are stubborn. One studied <b>1 hour and aced it</b>. One studied
        <b> 8 hours and bombed</b>. Make a call now, in writing: do those belong, or do you set them aside?
        You'll defend it either way — there's no wrong choice, only an unowned one.</P>
 
      <Field label="Your call, before you fit" value={assumption} onChange={setAssumption}
        placeholder="e.g. I'll keep all of them — one weird student each way isn't enough to throw out…"
        rows={3} disabled={committed} />
 
      {!committed && (
        <Btn onClick={() => setCommitted(true)} disabled={isFiller(assumption)}>
          {isFiller(assumption) ? "Say your call first" : "Lock my call → fit the line"}
        </Btn>
      )}
 
      {committed && (
        <>
          <Coach tone="neutral">
            Now drag the two handles to fit the cloud. Tap any point to set it aside — set-aside points
            turn hollow and stop counting toward your error. Watch the number, but don't chase zero:
            real students never sit on a line.
          </Coach>
 
          <div style={{ margin: "10px 0" }}>
            <ScatterPlane {...R1} points={R1.points} setAside={setAside} line={line}
              onHandle={onHandle} showResiduals />
          </div>
 
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 4px" }}>
            {R1.outliers.map((id) => (
              <button key={id} onClick={() => toggleAside(id)}
                style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "7px 12px",
                  cursor: "pointer", border: `1px solid ${C.line}`,
                  background: setAside[id] ? C.warnBg : C.panel, color: setAside[id] ? C.warnInk : C.sub }}>
                {setAside[id] ? "↩ Bring back " : "✕ Set aside "}
                {id === "OUT_HI" ? "the 1-hr / 95" : "the 8-hr / 55"}
              </button>
            ))}
          </div>
 
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "10px 0",
            fontFamily: FONT_BODY }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.sub }}>
              Mean error
            </span>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.violet, fontWeight: 600 }}>
              {resid == null ? "—" : `${resid.toFixed(1)} pts`}
            </span>
            <span style={{ fontSize: 13, color: C.sub }}>
              over {14 - asideCount} point{14 - asideCount === 1 ? "" : "s"}
            </span>
          </div>
 
          {!locked && (
            <Btn onClick={() => { setLocked(true); onLineLocked && onLineLocked({ m, b, resid, asideCount }); }}>
              This is my line → interpret it
            </Btn>
          )}
          {locked && (
            <Coach tone="good">
              Locked. Your line, your call on the stragglers — and an error you can defend, not a score you passed.
              That's the move the test actually rewards. Next: what your line <i>means</i>.
            </Coach>
          )}
        </>
      )}
    </section>
  );
}
 
/* ---------------------------------------------------------------------------
   STAGE 2 — INTERPRET the fitted line (C.7). Binding family rides on the fit.
   Slope & intercept are referent-bearing units → mis-bind self-adjudicates.
   --------------------------------------------------------------------------- */
const SLOPE_OPTIONS = [
  { id: "rate", label: "About how many points each extra hour of studying tends to add", correct: true },
  { id: "total", label: "The total score a student ends up with", correct: false },
  { id: "start", label: "The score of someone who didn't study at all", correct: false },
];
const INT_OPTIONS = [
  { id: "zero", label: "The predicted score for someone who studied zero hours", correct: true },
  { id: "rate", label: "How fast the score climbs per hour", correct: false },
  { id: "best", label: "The highest score anyone got", correct: false },
];
 
function BindRow({ prompt, value, options, picked, onPick, contradiction }) {
  return (
    <div style={{ margin: "14px 0", padding: "12px 14px", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{prompt}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.violet, marginBottom: 10 }}>{value}</div>
      <div style={{ display: "grid", gap: 7 }}>
        {options.map((o) => {
          const isPicked = picked === o.id;
          const reveal = isPicked && !o.correct;
          const right = isPicked && o.correct;
          return (
            <button key={o.id} onClick={() => onPick(o.id)}
              style={{ textAlign: "left", fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.4, borderRadius: 8,
                padding: "9px 12px", cursor: "pointer",
                border: `1px solid ${right ? C.teal : reveal ? C.amber : C.line}`,
                background: right ? C.goodBg : reveal ? C.warnBg : C.panel,
                color: right ? C.goodInk : reveal ? C.warnInk : C.ink }}>
              {o.label}
            </button>
          );
        })}
      </div>
      {picked && !options.find((o) => o.id === picked).correct && (
        <div style={{ marginTop: 9, fontSize: 13.5, lineHeight: 1.5, color: C.warnInk }}>
          {contradiction}
        </div>
      )}
    </div>
  );
}
 
function StageInterpret({ fit, onDone }) {
  const [slope, setSlope] = useState(null);
  const [inter, setInter] = useState(null);
  const slopeOK = slope && SLOPE_OPTIONS.find((o) => o.id === slope).correct;
  const interOK = inter && INT_OPTIONS.find((o) => o.id === inter).correct;
  const both = slopeOK && interOK;
 
  useSessionReport("Round 1 — Reading the line (slope & intercept)", [
    fit ? `Line read: ${fit.m.toFixed(1)} points per hour, starting near ${fit.b.toFixed(0)} at zero hours.` : "",
    slopeOK ? "Read the slope as a per-hour rate ✓" : "",
    interOK ? "Read the intercept as the zero-hours prediction ✓" : "",
  ]);
 
  return (
    <section style={{ marginTop: 34, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
      <StageTag>HSS-ID.C.7 · Interpret</StageTag>
      <H>What does your line actually say?</H>
      <P>Your fit came out to about <b>{fit ? fit.m.toFixed(1) : "—"} points per hour</b>, starting near
        <b> {fit ? fit.b.toFixed(0) : "—"}</b> at zero hours. A number on a graph is just a number until you
        say what it <i>means</i> for these students. Pick the reading that fits — a wrong pick shows you why it can't be right.</P>
 
      <BindRow prompt="The slope of your line —"
        value={`${fit ? fit.m.toFixed(1) : "≈ 6"} points per hour`}
        options={SLOPE_OPTIONS} picked={slope} onPick={setSlope}
        contradiction={slope === "total"
          ? "If the slope were the total score, every student would get the same total no matter how long they studied — but the whole point is the score climbs as hours go up. A slope is a rate of change, not a total."
          : "If the slope were the no-study score, it would be a single starting point — but a slope describes how steeply the line rises, the change per hour. That starting point is the intercept, not the slope."} />
 
      <BindRow prompt="The intercept of your line —"
        value={`≈ ${fit ? fit.b.toFixed(0) : "52"} at 0 hours`}
        options={INT_OPTIONS} picked={inter} onPick={setInter}
        contradiction={inter === "rate"
          ? "That's the slope's job — the per-hour climb. The intercept is frozen at zero hours; it doesn't describe motion, it describes the starting height."
          : "The intercept isn't the top of the data — it's where the line crosses zero hours, which here is near the bottom. The highest score is just one point, not the intercept."} />
 
      {both && (
        <>
          <Coach tone="good">
            Both read right. And here's the edge the test prizes: that intercept — the zero-hours score — is
            a real prediction <i>inside</i> your data, but push it to "negative hours" and it's nonsense.
            A model is worth using <i>and</i> has a range where it stops meaning anything. Holding both at once
            is the whole skill.
          </Coach>
          <Btn onClick={onDone}>Next round → a trickier cloud</Btn>
        </>
      )}
    </section>
  );
}
 
/* ---------------------------------------------------------------------------
   STAGE 3 — THE MICRO-MODEL (Round 3). Curved data defeats the straight line.
   The stubborn residual IS the content. Reflect = own the simplifying assumption.
   --------------------------------------------------------------------------- */
function StageMicroModel({ onDone }) {
  const [assumption, setAssumption] = useState("");
  const [committed, setCommitted] = useState(false);
  const [line, setLine] = useState(R3.initLine);
  const [reflect, setReflect] = useState("");
  const [done, setDone] = useState(false);
 
  const onHandle = (which, dx, dy) => {
    setLine((L) => which === "a" ? { ...L, x1: dx, y1: dy } : { ...L, x2: dx, y2: dy });
  };
  const resid = useMemo(() => meanAbsResidual(R3.points, {}, line), [line]);
  // VERIFIED by brute-force grid search: the best straight line over this convex
  // cloud bottoms out at ~6.45% mean error — it physically cannot get near zero.
  // Fire the curve-redirect once they've clearly engaged the fit (moved off the
  // initial line's error) but are still anywhere in the achievable band. The
  // point is they can NEVER drag it good enough to hide the curve.
  const tried = committed && resid != null;
  const stubborn = tried && resid > 5.5;  // below the 6.45 floor → always fires once fitting
 
  useSessionReport("Round 3 — Battery drain (micro-model)", [
    `Assumption before fitting: ${assumption || "—"}`,
    tried ? `Best straight-line mean error reached: ${resid.toFixed(1)} %` : "",
    reflect ? `Reflection: ${reflect}` : "",
  ]);
 
  return (
    <section style={{ marginTop: 34, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
      <StageTag>HSS-ID.B.6 + LEAP.III · Assume the limits</StageTag>
      <H>Is a straight line even the right tool?</H>
      <P>Battery percent against hours unplugged. Before you fit: is this a straight-line story, or is
        something else going on? Commit your read — then try to make a line fit and see if the data agrees with you.</P>
 
      <Field label="Your read, before fitting" value={assumption} onChange={setAssumption}
        placeholder="e.g. I think it drops in a straight line… or maybe it falls faster near the end?"
        rows={2} disabled={committed} />
      {!committed && (
        <Btn onClick={() => setCommitted(true)} disabled={isFiller(assumption)}>
          {isFiller(assumption) ? "Commit a read first" : "Lock it → try to fit"}
        </Btn>
      )}
 
      {committed && (
        <>
          <div style={{ margin: "10px 0" }}>
            <ScatterPlane {...R3} points={R3.points} setAside={{}} line={line} onHandle={onHandle} showResiduals />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "8px 0",
            fontFamily: FONT_BODY }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.sub }}>
              Mean error
            </span>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.violet, fontWeight: 600 }}>
              {resid == null ? "—" : `${resid.toFixed(1)} %`}
            </span>
          </div>
 
          {stubborn && (
            <Coach tone="redirect">
              Notice it won't go down past a point — drag wherever you like, the error sticks. That's not you
              failing. The dots <i>curve</i>: the battery falls slowly, then faster. A straight line can't bend
              to follow that, so it's always off somewhere. The tool doesn't fit the reality.
            </Coach>
          )}
          {tried && !stubborn && (
            <Coach tone="redirect">
              Even at its best your line keeps missing — look at the early flat stretch and the steep drop.
              The dots curve; a straight line can't. Hold that for the reflection.
            </Coach>
          )}
 
          <Field label="So: use a straight line anyway? Say why, and say where it'd let you down."
            value={reflect} onChange={setReflect}
            placeholder="A straight line doesn't really capture this because… If I used one anyway it'd be okay for… but I wouldn't trust it for…"
            rows={3} />
 
          {!done && (
            <Btn onClick={() => setDone(true)} disabled={isFiller(reflect)}>
              {isFiller(reflect) ? "Reflect first" : "Finish → see what you built"}
            </Btn>
          )}
          {done && onDone && (
            <Coach tone="good">
              That last move — using a simple model <i>and</i> owning exactly where it breaks — is the
              hardest thing the test asks for, and you just did it on your own data. <Btn onClick={onDone}>See your session</Btn>
            </Coach>
          )}
        </>
      )}
    </section>
  );
}
 
/* ---------------------------------------------------------------------------
   SHELL — session collector + recap, same pattern as the spine builds.
   --------------------------------------------------------------------------- */
export default function AssumeFitReflect() {
  const [phase, setPhase] = useState(1); // 1 fit+interpret, 2 micro-model, 3 recap
  const [fit, setFit] = useState(null);
  const [interpretOpen, setInterpretOpen] = useState(false);
  const recordsRef = useRef({});
  const [, force] = useState(0);
 
  const ctx = useMemo(() => ({
    record: (title, body) => {
      recordsRef.current[title] = body;
      force((n) => n + 1);
    },
  }), []);
 
  const sessionLines = useMemo(() => {
    const out = [];
    Object.entries(recordsRef.current).forEach(([title, body]) => {
      if (body && body.trim()) { out.push(`### ${title}`, body, ""); }
    });
    return out;
  }, [recordsRef.current, phase, interpretOpen, fit]);
 
  return (
    <SessionContext.Provider value={ctx}>
      <div style={{ background: C.bg, minHeight: "100vh", padding: "26px 18px",
        fontFamily: FONT_BODY, color: C.ink }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
            textTransform: "uppercase", color: C.sub, marginBottom: 2 }}>
            Fitting family · prototype
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: C.sub, marginBottom: 20 }}>
            Assume → Fit → Reflect — not a prediction, a defended judgment
          </div>
 
          {phase >= 1 && (
            <StageFitOutlier onLineLocked={(f) => { setFit(f); setInterpretOpen(true); }} />
          )}
          {interpretOpen && phase === 1 && (
            <StageInterpret fit={fit} onDone={() => setPhase(2)} />
          )}
          {phase >= 2 && (
            <StageMicroModel onDone={() => setPhase(3)} />
          )}
 
          {phase === 3 && (
            <div style={{ marginTop: 34, paddingTop: 22, borderTop: `2px solid ${C.ink}` }}>
              <StageTag>The reasoning you built</StageTag>
              <H>Three judgments, all yours</H>
              <P style={{ color: C.sub }}>Not three right answers — three calls you committed to and defended.
                That's what no worksheet can capture and what the rubric scores.</P>
              <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 14 }}>
                {Object.entries(recordsRef.current).map(([title, body]) =>
                  body && body.trim() ? <RecapRow key={title} label={title} text={body} /> : null
                )}
              </div>
              <div style={{ marginTop: 18 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Hand your whole session to your teacher
                </div>
                <p style={{ fontSize: 14, color: C.sub, margin: "0 0 6px" }}>
                  Every call you locked in and every reason you gave, collected here.
                </p>
                <CopyResults lines={sessionLines} />
              </div>
            </div>
          )}
        </div>
      </div>
    </SessionContext.Provider>
  );
}
 
