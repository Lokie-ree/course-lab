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
  // QuadraticsPTR clamped out-of-range y because its window never reached the
  // ceiling. Here it does, and a clamped parabola draws a flat line along the
  // top edge that reads as a bug. Both families are convex, so the in-range
  // sample run is contiguous — dropping the rest truncates cleanly.
  const inRange = (y) => Number.isFinite(y) && y >= yMin && y <= yMax;
  const xticks = []; for (let t = Math.ceil(xMin); t <= xMax; t++) if (t % 2 === 0) xticks.push(t);
  const yticks = []; for (let t = Math.ceil(yMin); t <= yMax; t++) if (t % 2 === 0) yticks.push(t);
  const buildPath = (fn, samples = 120) => {
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const y = fn(x);
      if (inRange(y)) pts.push(`${sx(x).toFixed(2)},${sy(y).toFixed(2)}`);
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

// Round 2 is the trap; its miss is the pedagogy, so its reconcile prose is
// mandatory. Rounds 1 and 3 advance straight from the reveal.
const RECONCILE_REQUIRED = 1;
const RECONCILE_MIN = 12;

const blankRound = () => ({ pick: "", why: "", nudged: false, committed: false, reconcile: "" });

function ModuleTransformationsPTR() {
  const [phase, setPhase] = useState("rounds"); // rounds -> producer -> recap
  const [idx, setIdx] = useState(0);
  const [rounds, setRounds] = useState(() => ROUNDS.map(blankRound));

  // PRODUCER — read the target's parameters off the graph
  const [pa, setPa] = useState("");
  const [ph, setPh] = useState("");
  const [pk, setPk] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [matched, setMatched] = useState(false);
  const [stuck, setStuck] = useState(false);

  // SANDBOX — earned by finishing the producer round
  const [showSandbox, setShowSandbox] = useState(false);
  const [sbFamily, setSbFamily] = useState("quad");
  const [sbA, setSbA] = useState(1);
  const [sbH, setSbH] = useState(0);
  const [sbK, setSbK] = useState(0);
  const sandboxEntered = useRef(false);

  const { emit } = useTelemetry();

  const round = ROUNDS[idx];
  const state = rounds[idx];
  const family = FAMILIES[round.family];
  const setState = (patch) =>
    setRounds((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const wasRight = state.pick === round.correct;
  const needsReconcile = idx === RECONCILE_REQUIRED;
  const reconcileOk = !needsReconcile || state.reconcile.trim().length >= RECONCILE_MIN;

  // --- named handlers: the only emit sites (spec §4.4) --------------------
  const commitRound = () => {
    if (state.pick === "") return;
    if (isThinPrediction(state.why) && !state.nudged) { setState({ nudged: true }); return; }
    setState({ committed: true });
    emit({
      roundId: round.roundId,
      guideState: "predict",
      action: "check",
      result: state.pick === round.correct ? "match" : "miss",
    });
  };

  const advanceRound = () => {
    const next = ROUNDS[idx + 1];
    setIdx(idx + 1);
    // Round 1's round_enter came from the StartGate (TELEMETRY_ENTRY) — only
    // rounds 2+ emit it, and only from here.
    emit({ roundId: next.roundId, guideState: "predict", action: "round_enter" });
  };

  const startProducer = () => {
    setPhase("producer");
    emit({ roundId: PRODUCER.roundId, guideState: "producer", action: "round_enter" });
  };

  // Exact parameter equality, not curve sampling — the standard is about
  // READING a, h, k, so a 0.5-off answer is a miss and that is correct.
  const aN = parseFloat(pa), hN = parseFloat(ph), kN = parseFloat(pk);
  const pNumsOk = !isNaN(aN) && !isNaN(hN) && !isNaN(kN);
  const producerOk = aN === PRODUCER.a && hN === PRODUCER.h && kN === PRODUCER.k;

  const checkProducer = () => {
    if (!pNumsOk) return;
    const ok = producerOk;
    setAttempts((n) => n + 1);
    setMatched(ok);
    emit({
      roundId: PRODUCER.roundId,
      guideState: "producer",
      beatId: "producer",
      action: "check",
      result: ok ? "match" : "miss",
    });
  };

  const finishRounds = () => {
    emit({ roundId: PRODUCER.roundId, guideState: "producer", action: "complete" });
    setPhase("recap");
  };

  const enterSandbox = () => {
    setShowSandbox(true);
    if (!sandboxEntered.current) {
      sandboxEntered.current = true;
      // Earned reveal fires when the student USES the unlocked reveal
      // (2026-07-09 ruling), not at the unlock moment.
      emit({ roundId: SANDBOX_ROUND_ID, guideState: "sandbox", action: "reveal_earned" });
    }
  };

  const choiceLabel = (r, key) => (r.choices.find(([k]) => k === key) || [, ""])[1];

  const roundLine = (i) => {
    const r = ROUNDS[i], s = rounds[i];
    return `${equationText(r.a, r.h, r.k)} on ${FAMILIES[r.family].label} — called "${choiceLabel(r, s.pick) || "(none)"}" (${s.pick === r.correct ? "matched" : "missed"}): "${s.why}"`;
  };
  const producerLine = pNumsOk
    ? `${equationText(aN, hN, kN)} after ${attempts} ${attempts === 1 ? "try" : "tries"} — ${matched ? "matched the target" : "did not match"}`
    : "(not attempted)";

  useSessionReport(
    "Module · F-BF.B.3 Function transformations (Predict→Test→Reconcile)",
    rounds[0].committed ? [
      "ALGEBRA — F-BF.B.3: how a, h, k move a graph in a·f(x + h) + k",
      ...ROUNDS.map((_, i) => `Round ${i + 1}: ${roundLine(i)}`),
      `Reconcile on the trap round (f(x + 2) shifts LEFT): ${rounds[RECONCILE_REQUIRED].reconcile || "(not written)"}`,
      `Producer target ${equationText(PRODUCER.a, PRODUCER.h, PRODUCER.k)} on ${FAMILIES[PRODUCER.family].label}`,
      `Student's parameters: ${producerLine}`,
    ] : null
  );

  const choiceBtn = (key, text) => {
    const active = state.pick === key;
    return (
      <button key={key} onClick={() => setState({ pick: key })} disabled={state.committed}
        style={{
          display: "block", width: "100%", textAlign: "left",
          cursor: state.committed ? "default" : "pointer",
          fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.4, color: C.ink,
          background: active ? C.panel : "transparent",
          border: `1.5px solid ${active ? C.ember : C.line}`,
          boxShadow: active ? `inset 3px 0 0 ${C.ember}` : "none",
          borderRadius: 10, padding: "11px 14px", margin: "8px 0", transition: "all .12s",
        }}>
        <span style={{ fontWeight: active ? 700 : 500 }}>{text}</span>
      </button>
    );
  };

  return (
    <section>
      {phase === "rounds" && (
        <>
          <StageTag>F-BF.B.3 · Round {idx + 1} of {ROUNDS.length} · Predict</StageTag>
          <H>{round.prompt}</H>
          <P>The base function is <b style={{ color: C.sub }}>{family.label}</b> — drawn dashed below. You're
            predicting where <b style={{ color: C.ember }}>{equationText(round.a, round.h, round.k)}</b> puts it.</P>
          <P style={{ margin: "10px 0 2px" }}><b>The transformed curve stays hidden</b> until you commit a call.</P>

          <Plane xLabel="x" yLabel="y"
            curves={[
              { key: "ghost", f: family.f, color: C.sub, width: 2, dash: "5 4" },
              ...(state.committed
                ? [{ key: "moved", f: transform(family.f, round.a, round.h, round.k), color: C.ember, width: 2.8, animate: true }]
                : []),
            ]} />

          <div style={{ margin: "14px 0 2px" }}>
            {round.choices.map(([key, text]) => choiceBtn(key, text))}
          </div>

          <Field
            label="Why? (one sentence — this locks in before the curve moves)"
            value={state.why}
            onChange={(v) => setState({ why: v })}
            placeholder="I think it moves ___ because ___"
            rows={2}
            disabled={state.committed}
          />

          {state.nudged && !state.committed && isThinPrediction(state.why) && (
            <Coach tone="redirect">Commit to a reason — even a hunch you're unsure of. The whole point is finding out
              whether you're right, and you can't be wrong-then-fixed if you don't say anything. The curve moves the
              second you do.</Coach>
          )}

          {!state.committed && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Btn onClick={commitRound} disabled={state.pick === ""}>
                {state.nudged && isThinPrediction(state.why) ? "Lock it in anyway →" : "Lock in my call → move the curve"}
              </Btn>
              {state.pick === "" && <span style={{ fontSize: 13, color: C.sub }}>Pick one first.</span>}
            </div>
          )}

          {/* ---------------- TEST ---------------- */}
          {state.committed && (
            <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
              <StageTag>Test</StageTag>
              <H>{wasRight ? "That's the move." : `It went ${choiceLabel(round, round.correct).toLowerCase()}.`}</H>
              <P>Your locked call: <b>{choiceLabel(round, state.pick)}</b>. The solid curve above is
                {" "}<b style={{ color: C.ember }}>{equationText(round.a, round.h, round.k)}</b>, drawn over the dashed
                original.</P>

              {/* verified-praise-only: praise ONLY the checked call */}
              {wasRight ? (
                <Coach tone="good">{idx === 0
                  ? "You called it. The + 3 sits OUTSIDE the function, so it changes the output after f does its work — every point rises 3."
                  : idx === 2
                  ? "You called it. The negative flips the V across the x-axis, and the 2 doubles every output's distance from the axis — steeper, not wider."
                  : "You called it."}</Coach>
              ) : (
                <Coach tone="neutral">{idx === RECONCILE_REQUIRED
                  ? "It moved LEFT. f(x + 2) reaches any given output 2 units EARLIER than f does — the input is boosted before f runs, so the graph arrives sooner. Inside the parentheses works opposite to the sign you read."
                  : idx === 0
                  ? "It moved UP. The + 3 is outside the function, so it lifts every output after f has run."
                  : "The −2 flips the V across the x-axis and doubles every output's distance from it — a reflection AND a vertical stretch."}</Coach>
              )}

              {/* ---------------- RECONCILE (trap round only) ---------------- */}
              {needsReconcile && (
                <div style={{ marginTop: 20 }}>
                  <StageTag>Reconcile</StageTag>
                  <P style={{ marginBottom: 2 }}>
                    {wasRight
                      ? "You were right — so nail the rule down. Why does a PLUS inside the parentheses move the graph in the minus direction?"
                      : `You said "${choiceLabel(round, state.pick)}," and it went left. What did you expect, and what does + 2 inside the parentheses actually do?`}
                  </P>
                  <Field
                    label={wasRight
                      ? "Say why inside-the-parentheses runs opposite — in your own words"
                      : "I thought ___, but f(x + 2) actually ___ because ___"}
                    value={state.reconcile}
                    onChange={(v) => setState({ reconcile: v })}
                    placeholder={wasRight
                      ? "A plus inside shifts left because…"
                      : "I thought + 2 would move it right because…, but it moved left because…"}
                    rows={3}
                  />
                  {!reconcileOk && (
                    <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                      A sentence or two unlocks the next round. There's no right wording — just say what you noticed.
                    </div>
                  )}
                </div>
              )}

              {reconcileOk && (
                <div style={{ marginTop: 16 }}>
                  {idx < ROUNDS.length - 1
                    ? <Btn onClick={advanceRound}>Next round →</Btn>
                    : <Btn onClick={startProducer}>Build one yourself →</Btn>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ---------------- PRODUCER — hit the target by reading its parameters ---------------- */}
      {phase === "producer" && (() => {
        const base = FAMILIES[PRODUCER.family];
        return (
          <>
            <StageTag>Build it</StageTag>
            <H>Match the violet curve</H>
            <P>Same base function — <b style={{ color: C.sub }}>{base.label}</b>, dashed. The
              {" "}<b style={{ color: C.violet }}>violet</b> curve is some <b>a·f(x + h) + k</b> of it. Read the
              transformation off the graph and enter the three parameters. Your attempt draws in
              {" "}<b style={{ color: C.ember }}>ember</b> as soon as all three are numbers.</P>

            <Plane xLabel="x" yLabel="y"
              curves={[
                { key: "ghost", f: base.f, color: C.sub, width: 2, dash: "5 4" },
                { key: "target", f: transform(base.f, PRODUCER.a, PRODUCER.h, PRODUCER.k), color: C.violet, width: 2.8 },
                ...(pNumsOk
                  ? [{ key: "attempt", f: transform(base.f, aN, hN, kN), color: C.ember, width: 2.4, animate: true }]
                  : []),
              ]} />

            <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", margin: "10px 0 2px" }}>
              <NumField label="a" value={pa} onChange={setPa} placeholder="1" />
              <NumField label="h" value={ph} onChange={setPh} placeholder="0" />
              <NumField label="k" value={pk} onChange={setPk} placeholder="0" />
            </div>

            {pNumsOk && (
              <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10,
                padding: "11px 14px", margin: "8px 0 4px", fontFamily: "monospace", fontSize: 15, color: C.ink }}>
                your curve: <b style={{ color: C.ember }}>{equationText(aN, hN, kN)}</b>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
              <Btn onClick={checkProducer} disabled={!pNumsOk}>Check my parameters</Btn>
              {!pNumsOk && <span style={{ fontSize: 13, color: C.sub }}>Fill all three.</span>}
            </div>

            {attempts > 0 && matched && (
              <>
                <Coach tone="good">Exactly it — <b>{equationText(PRODUCER.a, PRODUCER.h, PRODUCER.k)}</b>. You read a
                  reflection, a horizontal shift, and a vertical shift off one picture, and the sign inside the
                  parentheses didn't trick you this time.</Coach>
                <Btn onClick={finishRounds}>See what you built →</Btn>
              </>
            )}

            {attempts > 0 && !matched && (
              <>
                <Coach tone="redirect">Not yet — your ember curve isn't sitting on the violet one. Work one parameter
                  at a time: does it open the same way as the dashed original (that's <b>a</b>), where is the corner
                  side to side (<b>h</b>, and remember round 2), and how far up or down (<b>k</b>)?</Coach>
                {/* no-wall principle: unlimited retries, and a way past after a miss */}
                <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
                {stuck && (
                  <div style={{ marginTop: 12 }}>
                    <Coach tone="neutral">The target was <b>{equationText(PRODUCER.a, PRODUCER.h, PRODUCER.k)}</b>.
                      Your last attempt is saved for your teacher exactly as you entered it.</Coach>
                    <Btn onClick={finishRounds}>See what you built →</Btn>
                  </div>
                )}
              </>
            )}
          </>
        );
      })()}

      {/* ---------------- RECAP + EARNED SANDBOX ---------------- */}
      {phase === "recap" && (
        <div>
          <StageTag>The rule you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            {ROUNDS.map((r, i) => (
              <RecapRow key={r.roundId}
                label={`Round ${i + 1} — ${equationText(r.a, r.h, r.k)} on ${FAMILIES[r.family].label}`}
                text={`Locked call: ${choiceLabel(r, rounds[i].pick) || "—"} (${rounds[i].pick === r.correct ? "matched" : "missed"}) — "${rounds[i].why}"`} />
            ))}
            <RecapRow label="Your reconcile on the trap round" text={rounds[RECONCILE_REQUIRED].reconcile} />
            <RecapRow label="Producer target" text={`${equationText(PRODUCER.a, PRODUCER.h, PRODUCER.k)} on ${FAMILIES[PRODUCER.family].label}`} />
            <RecapRow label="What you entered" text={producerLine} />
          </div>

          <CopyResults lines={[
            "ALGEBRA — F-BF.B.3: how a, h, k move a graph in a·f(x + h) + k",
            ...ROUNDS.map((_, i) => `Round ${i + 1}: ${roundLine(i)}`),
            `Reconcile (student's words): ${rounds[RECONCILE_REQUIRED].reconcile}`,
            `Producer target: ${equationText(PRODUCER.a, PRODUCER.h, PRODUCER.k)}`,
            `Student's parameters: ${producerLine}`,
          ]} />

          <div style={{ marginTop: 26, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
            <StageTag>Unlocked</StageTag>
            <H>Free play — move the graph yourself</H>
            <P>You've earned the sliders. Nothing here is checked or recorded; drag until the rules feel obvious.</P>
            {!showSandbox ? (
              <Btn onClick={enterSandbox}>Open the sandbox →</Btn>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, margin: "8px 0 14px" }}>
                  {Object.entries(FAMILIES).map(([id, fam]) => (
                    <Btn key={id} kind={sbFamily === id ? "primary" : "ghost"} onClick={() => setSbFamily(id)}>
                      {fam.label}
                    </Btn>
                  ))}
                </div>

                <Plane xLabel="x" yLabel="y"
                  curves={[
                    { key: "ghost", f: FAMILIES[sbFamily].f, color: C.sub, width: 2, dash: "5 4" },
                    { key: "live", f: transform(FAMILIES[sbFamily].f, sbA, sbH, sbK), color: C.ember, width: 2.8, animate: true },
                  ]} />

                <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10,
                  padding: "11px 14px", margin: "12px 0", fontFamily: "monospace", fontSize: 16, color: C.ink }}>
                  <b style={{ color: C.ember }}>{equationText(sbA, sbH, sbK)}</b>
                  <span style={{ color: C.sub, fontSize: 13 }}>{"  where f(x) = "}{FAMILIES[sbFamily].label.replace("y = ", "")}</span>
                </div>

                {/* Sliders emit NOTHING — drag telemetry is a deliberate NOT-DOING. */}
                <Slider label="a — stretch and flip" value={sbA} min={-3} max={3} step={0.5} onChange={setSbA} skipZero />
                <Slider label="h — inside the parentheses (watch the direction)" value={sbH} min={-5} max={5} step={1} onChange={setSbH} />
                <Slider label="k — outside, after f runs" value={sbK} min={-5} max={5} step={1} onChange={setSbK} />

                <div style={{ marginTop: 14 }}>
                  <Btn kind="ghost" onClick={() => setShowSandbox(false)}>Hide the sandbox</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// a = 0 collapses the curve to y = k and reads as a bug, so the slider steps
// past zero rather than the renderer special-casing it.
function Slider({ label, value, min, max, step, onChange, skipZero }) {
  return (
    <label style={{ display: "block", margin: "12px 0" }}>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600,
        color: C.sub, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontFamily: "monospace", color: C.ink }}>{String(value).replace("-", "−")}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(skipZero && v === 0 ? (v >= value ? step : -step) : v);
        }}
        style={{ width: "100%", accentColor: C.ember }} />
    </label>
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
