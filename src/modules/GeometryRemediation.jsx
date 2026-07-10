import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";
 
/* Session store: modules report copy-lines; app-level button reads the union. */
const SessionContext = createContext(null);
 
function isThinVerdict(v) {
  const t = (v || "").trim().toLowerCase();
  if (t.length < 15) return true;
  return /^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|i dont know|not sure)\.?$/.test(t);
}
 
function useSessionReport(title, lines) {
  const ctx = useContext(SessionContext);
  const joined = (lines || []).filter(Boolean).join("\n");
  useEffect(() => { if (ctx) ctx.record(title, joined); }, [ctx, title, joined]);
}
 
/* ============================================================================
   GEOMETRY — SUMMER REMEDIATION (prototype)
   Reasoning-first, judge → producer → recap. Standalone; React only.
 
   Build 1 — Coordinate Reasoning   (LEAP.II.GM.1 / G-GPE.B)  — deep / usable
   Build 2 — Right-Triangle Trig     (G-SRT.C.8 / LEAP.III.GM.3) — rough / probe
 
   v1 = no teacher view, no routing (you are the instrument). Copy-results
   button at the end so a student can hand you their reasoning.
 
   Coach never marks the student wrong; redirects are additive. Verdict gates
   never hard-block. Session-only state.
   ============================================================================ */
 
const C = {
  ink: "#1c2230",
  inkSoft: "#55607a",
  paper: "#f4f1ea",
  panel: "#fbfaf6",
  line: "#dcd6c8",
  accent: "#1f6f6b",
  accentSoft: "#d7e8e6",
  accentInk: "#0f4a47",
  amber: "#b06a13",
  amberSoft: "#f3e3c9",
  amberInk: "#6f4209",
  neutralSoft: "#e6ebf2",
  neutralInk: "#2c3e57",
  pairA: "#1f6f6b",
  pairB: "#b06a13",
  grid: "#e7e2d6",
};
const FONT_DISPLAY = "'Fraunces','Georgia',serif";
const FONT_BODY = "'Inter','Segoe UI',system-ui,sans-serif";
const MONO = "'JetBrains Mono','SFMono-Regular',monospace";
 
/* Copy that works inside a sandboxed artifact iframe (Clipboard API often blocked).
   Returns "copied" | "selected" | "failed". Never reports success unless real. */
async function copyText(text, selectFallbackId) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.top = "-1000px";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta); ta.select();
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
 
// Default producer floor: reject obvious filler when no objective key exists.
function isFiller(s) {
  const t = (s || "").trim().toLowerCase();
  if (t.length < 6) return true;
  if (/^(idk|i don'?t know|dunno|no idea|nothing|none|n\/a|na|\?+|test|asdf|aaa+|\.+|x+|abc|123|qwerty|blah|stuff)\.?$/.test(t)) return true;
  if (/^(.)\1{4,}$/.test(t.replace(/\s/g, ""))) return true;
  return false;
}
 
/* ---------- shared atoms --------------------------------------------------- */
function Coach({ children, tone = "neutral" }) {
  const bg = tone === "good" ? C.accentSoft : tone === "redirect" ? C.amberSoft : C.neutralSoft;
  const ink = tone === "good" ? C.accentInk : tone === "redirect" ? C.amberInk : C.neutralInk;
  const bar = tone === "good" ? C.accent : tone === "redirect" ? C.amber : "#3a5e86";
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
    opacity: disabled ? 0.45 : 1 };
  const styles = {
    primary: { ...base, background: C.ink, color: C.paper },
    ghost: { ...base, background: "transparent", color: C.inkSoft, border: `1px solid ${C.line}` },
  };
  return <button style={styles[kind]} onClick={disabled ? undefined : onClick} disabled={disabled}>{children}</button>;
}
 
function Field({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label style={{ display: "block", margin: "12px 0" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.inkSoft, marginBottom: 6 }}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.5,
          color: C.ink, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px",
          resize: "vertical" }} />
    </label>
  );
}
 
function StageTag({ children }) {
  return <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    textTransform: "uppercase", color: C.amber, marginBottom: 6 }}>{children}</div>;
}
function H({ children }) {
  return <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>{children}</h2>;
}
function P({ children }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.ink, margin: "10px 0" }}>{children}</p>;
}
function RecapRow({ label, text }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
        color: C.inkSoft, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, color: C.ink }}>
        {text ? text : <span style={{ color: C.inkSoft, fontStyle: "italic" }}>—</span>}
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
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 6 }}>
          Copying is blocked here — tap inside the box, select all, and copy.
        </div>
      )}
      <textarea id={idRef.current} readOnly value={text} rows={4}
        onFocus={(e) => e.target.select()}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 10, fontFamily: FONT_BODY, fontSize: 13,
          color: C.inkSoft, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px" }} />
    </div>
  );
}
 
// divide-safe slope used everywhere (string output, "∞" for vertical)
function slope(x1, y1, x2, y2) {
  const dx = x2 - x1;
  if (dx === 0) return "∞";
  const m = (y2 - y1) / dx;
  return Number.isInteger(m) ? String(m) : m.toFixed(2);
}
 
/* ============================================================================
   BUILD 1 — COORDINATE REASONING  (released Type II parallelogram item)
   Parametric figure: P(a,b), S(a+c,b), T(c,0), O(0,0). Camera auto-fits a,b,c.
   ============================================================================ */
function ModuleCoordinate() {
  const [stage, setStage] = useState("judge");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [showSecond, setShowSecond] = useState(false);
  // producer params
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [c, setC] = useState(6);
  const [slopesText, setSlopesText] = useState("");
  const [conclude, setConclude] = useState("");
  const [stuck, setStuck] = useState(false);
 
  const reset = () => { setStage("judge"); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false); setShowSecond(false);
    setA(3); setB(4); setC(6); setSlopesText(""); setConclude(""); };
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; } setSubmitted(true); };
 
  // O(0,0) T(c,0) S(a+c,b) P(a,b). Sides: OT (bottom), PS (top), OP (left), TS (right)
  const O = [0, 0], T = [c, 0], S = [a + c, b], Pp = [a, b];
  const sOT = slope(O[0], O[1], T[0], T[1]);   // 0
  const sPS = slope(Pp[0], Pp[1], S[0], S[1]); // 0
  const sOP = slope(O[0], O[1], Pp[0], Pp[1]); // b/a
  const sTS = slope(T[0], T[1], S[0], S[1]);   // b/a
 
  // auto-fit camera over the family
  const xs = [O[0], T[0], S[0], Pp[0]], ys = [O[1], T[1], S[1], Pp[1]];
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const padX = Math.max(1, (xmax - xmin) * 0.18), padY = Math.max(1, (ymax - ymin) * 0.25);
  const W = 440, Hh = 300, m = { l: 34, r: 16, t: 16, b: 28 };
  const vx0 = xmin - padX, vx1 = xmax + padX, vy0 = ymin - padY, vy1 = ymax + padY;
  const sx = (x) => m.l + ((x - vx0) / (vx1 - vx0)) * (W - m.l - m.r);
  const sy = (y) => m.t + (Hh - m.t - m.b) - ((y - vy0) / (vy1 - vy0)) * (Hh - m.t - m.b);
 
  const caughtIncomplete = /both|second|other pair|OP|TS|trapezoid|only one|two pair|didn'?t check|left|right side|not enough/i.test(verdict);
 
  useSessionReport("Build 1 · Coordinate Reasoning", submitted ? [
    "GEOMETRY — Build 1: Coordinate Reasoning",
    `Verdict on flawed proof: ${verdict}`,
    `Slopes: OT=${sOT}, PS=${sPS}, OP=${sOP}, TS=${sTS}`,
    `Parallel facts: ${slopesText}`, `Conclusion: ${conclude}`,
  ] : null);
 
  return (
    <section>
      <StageTag>Build 1 · Coordinate Reasoning</StageTag>
      <H>You're the coach</H>
      <P>A student wants to prove a quadrilateral is a parallelogram. Here's their work:</P>
      <pre style={{ fontFamily: MONO, fontSize: 13.5, background: C.paper, border: `1px solid ${C.line}`,
        borderRadius: 9, padding: "12px 14px", color: C.ink, overflowX: "auto", lineHeight: 1.5 }}>
{`Side OT has slope 0.
Side PS has slope 0.
OT ∥ PS, so it's a parallelogram.`}
      </pre>
      <P>The slopes are computed correctly. But does that <i>prove</i> it's a parallelogram?</P>
 
      <svg viewBox={`0 0 ${W} ${Hh}`} style={{ width: "100%", height: "auto", background: C.panel,
        border: `1px solid ${C.line}`, borderRadius: 10, display: "block" }}>
        <line x1={sx(vx0)} y1={sy(0)} x2={sx(vx1)} y2={sy(0)} stroke={C.grid} />
        <line x1={sx(0)} y1={sy(vy0)} x2={sx(0)} y2={sy(vy1)} stroke={C.grid} />
        {/* the two checked sides */}
        <line x1={sx(O[0])} y1={sy(O[1])} x2={sx(T[0])} y2={sy(T[1])} stroke={C.pairA} strokeWidth="3" />
        <line x1={sx(Pp[0])} y1={sy(Pp[1])} x2={sx(S[0])} y2={sy(S[1])} stroke={C.pairA} strokeWidth="3" />
        {/* the unchecked pair — faint until revealed */}
        <line x1={sx(O[0])} y1={sy(O[1])} x2={sx(Pp[0])} y2={sy(Pp[1])}
          stroke={showSecond ? C.pairB : C.line} strokeWidth={showSecond ? 3 : 1.5} strokeDasharray={showSecond ? "0" : "4 3"} />
        <line x1={sx(T[0])} y1={sy(T[1])} x2={sx(S[0])} y2={sy(S[1])}
          stroke={showSecond ? C.pairB : C.line} strokeWidth={showSecond ? 3 : 1.5} strokeDasharray={showSecond ? "0" : "4 3"} />
        {[["O", O], ["T", T], ["S", S], ["P", Pp]].map(([lab, pt]) => (
          <g key={lab}>
            <circle cx={sx(pt[0])} cy={sy(pt[1])} r="3.5" fill={C.ink} />
            <text x={sx(pt[0]) + 6} y={sy(pt[1]) - 6} fontSize="12" fontFamily={MONO} fill={C.ink}>{lab}</text>
          </g>
        ))}
        {showSecond && (
          <>
            <text x={sx((O[0] + Pp[0]) / 2) - 30} y={sy((O[1] + Pp[1]) / 2)} fontSize="11" fontFamily={MONO} fill={C.pairB}>OP: {sOP}</text>
            <text x={sx((T[0] + S[0]) / 2) + 6} y={sy((T[1] + S[1]) / 2)} fontSize="11" fontFamily={MONO} fill={C.pairB}>TS: {sTS}</text>
          </>
        )}
      </svg>
 
      <div style={{ marginTop: 10 }}>
        <Btn kind="ghost" onClick={() => setShowSecond((s) => !s)}>
          {showSecond ? "Hide the other pair" : "Highlight the sides they didn't check"}
        </Btn>
      </div>
 
      <Field label="Your verdict — is their proof complete? What's missing?" value={verdict} onChange={setVerdict}
        placeholder="A trapezoid also has one pair of parallel sides. So what hasn't been checked?" />
 
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess beats "I don't know." Say what you think is missing, then submit. No penalty for being wrong.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caughtIncomplete ? (
        <>
          <Coach tone="good">That's the catch. One pair parallel only gets you a <b>trapezoid</b>. A parallelogram
            needs <b>both</b> pairs of opposite sides parallel — they never checked OP and TS. On the LEAP, "both
            pairs, and here's why" is what earns the reasoning points, not just the computation point.</Coach>
          <Btn onClick={() => setStage("producer")}>Now prove it yourself →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">Good start — and here's the piece I'd add: OT ∥ PS is true, but a trapezoid has one
            pair parallel too. Hit "highlight the sides they didn't check" and look at OP and TS. A parallelogram
            needs <b>both</b> pairs. What's still unproven?</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => setStage("producer")}>Got it — prove it yourself →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Prove it</StageTag>
          <H>The real item</H>
          <P>Prove that <span style={{ fontFamily: MONO }}>O(0,0), T(c,0), S(a+c,b), P(a,b)</span> is a parallelogram
            by showing <b>both</b> pairs of opposite sides have equal slope. Drag the values — the proof has to hold
            for <i>any</i> a, b, c, not just one picture.</P>
 
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "10px 0" }}>
            {[["a", a, setA], ["b", b, setB], ["c", c, setC]].map(([lab, val, set]) => (
              <label key={lab} style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
                {lab} = {val}
                <input type="range" min={1} max={7} value={val} onChange={(e) => set(+e.target.value)}
                  style={{ display: "block", width: 120 }} />
              </label>
            ))}
          </div>
 
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontFamily: MONO, fontSize: 13,
            background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 14px", color: C.ink }}>
            <span>OT: <b style={{ color: C.pairA }}>{sOT}</b></span>
            <span>PS: <b style={{ color: C.pairA }}>{sPS}</b></span>
            <span>OP: <b style={{ color: C.pairB }}>{sOP}</b></span>
            <span>TS: <b style={{ color: C.pairB }}>{sTS}</b></span>
          </div>
 
          <Field label="State the two slope facts that prove it (use the values above)" value={slopesText} onChange={setSlopesText}
            placeholder="OT and PS both have slope 0, so OT ∥ PS. OP and TS both have slope b/a, so OP ∥ TS." rows={2} />
          <Field label="Now the conclusion — WHY do those two facts make it a parallelogram?" value={conclude} onChange={setConclude}
            placeholder="Because both pairs of opposite sides are parallel, the figure is…" rows={2} />
 
          {slopesText.trim().length > 10 && conclude.trim().length > 6 && (
            (!isFiller(slopesText) && !isFiller(conclude)) || stuck ? (
              <>
                <Coach tone="good">The four slopes shown above are computed for you — OT and PS match, OP and TS match. Saved for your teacher.
                  Your two slope facts and conclusion are in your words; reread them and make sure they state both parallel pairs hold for <i>any</i> a, b, c.</Coach>
                <Btn onClick={() => setStage("recap")}>See the argument you built →</Btn>
              </>
            ) : (
              <>
                <Coach tone="redirect">Write the two slope facts and the conclusion in real words — e.g. "OT and PS both have slope 0, OP and TS both have slope b/a, so both pairs are parallel." Not a placeholder.</Coach>
                <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
              </>
            )
          )}
        </div>
      )}
 
      {stage === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your proof, assembled</H>
          <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Claim (your verdict on the flawed proof)" text={verdict} />
            <RecapRow label="Computation (the four slopes)" text={`OT=${sOT}, PS=${sPS}, OP=${sOP}, TS=${sTS}`} />
            <RecapRow label="Reasoning (the two parallel facts)" text={slopesText} />
            <RecapRow label="Conclusion (why it's a parallelogram)" text={conclude} />
          </div>
          <CopyResults lines={[
            "GEOMETRY — Build 1: Coordinate Reasoning",
            `Verdict on flawed proof: ${verdict}`,
            `Slopes: OT=${sOT}, PS=${sPS}, OP=${sOP}, TS=${sTS}`,
            `Parallel facts: ${slopesText}`,
            `Conclusion: ${conclude}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* ============================================================================
   BUILD 2 — RIGHT-TRIANGLE TRIG  (the no-diagram probe)
   Judge stage HAS a triangle (catch sin-vs-tan). Producer stage has NO diagram.
   ============================================================================ */
function ModuleTrig() {
  const [stage, setStage] = useState("judge");
  const [theta, setTheta] = useState(37);
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [stuck, setStuck] = useState(false);
  // producer (no diagram): self-label + choose ratio
  const [oppSide, setOppSide] = useState("");
  const [adjSide, setAdjSide] = useState("");
  const [ratio, setRatio] = useState("");
  const [answer, setAnswer] = useState("");
  const [interpret, setInterpret] = useState("");
 
  const reset = () => { setStage("judge"); setTheta(37); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false);
    setOppSide(""); setAdjSide(""); setRatio(""); setAnswer(""); setInterpret(""); };
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; } setSubmitted(true); };
 
  const caughtRatio = /tan|two leg|both leg|no hypoten|leg|opposite.*adjacent|adjacent.*opposite|not sine|isn'?t sine/i.test(verdict);
 
  useSessionReport("Build 2 · Right-Triangle Trig", submitted ? [
    "GEOMETRY — Build 2: Right-Triangle Trig",
    `Verdict on sin θ = 3/4: ${verdict}`,
    `Side labels: base = ${adjSide}, ladder = ${oppSide}`,
    `Ratio chosen: ${ratio}`, `Solve: ${answer}`, `Meaning: ${interpret}`,
  ] : null);
 
  // judge triangle: legs 3 (rise) and 4 (run), drawn orthographically
  const W = 380, Hh = 260, ox = 70, oy = 210, u = 38;
  const rise = 3, run = 4;
 
  return (
    <section>
      <StageTag>Build 2 · Right-Triangle Trig <span style={{ color: C.inkSoft }}>· rough probe</span></StageTag>
      <H>You're the coach</H>
      <P>A ramp rises <b>3 ft</b> over a <b>4 ft</b> horizontal run. A student needs the angle θ the ramp makes with
        the ground, and writes:</P>
      <pre style={{ fontFamily: MONO, fontSize: 15, background: C.paper, border: `1px solid ${C.line}`,
        borderRadius: 9, padding: "12px 14px", color: C.ink }}>{`sin θ = 3/4`}</pre>
      <P>Is that the right ratio for what they were given?</P>
 
      <svg viewBox={`0 0 ${W} ${Hh}`} style={{ width: "100%", height: "auto", background: C.panel,
        border: `1px solid ${C.line}`, borderRadius: 10, display: "block" }}>
        <polygon points={`${ox},${oy} ${ox + run * u},${oy} ${ox + run * u},${oy - rise * u}`}
          fill={C.accentSoft} stroke={C.accent} strokeWidth="2" />
        {/* right-angle marker */}
        <path d={`M ${ox + run * u - 10},${oy} L ${ox + run * u - 10},${oy - 10} L ${ox + run * u},${oy - 10}`}
          fill="none" stroke={C.inkSoft} strokeWidth="1.3" />
        {/* labels */}
        <text x={ox + (run * u) / 2} y={oy + 18} fontSize="13" fontFamily={MONO} fill={C.pairB} textAnchor="middle">run = 4 (adjacent)</text>
        <text x={ox + run * u + 8} y={oy - (rise * u) / 2} fontSize="13" fontFamily={MONO} fill={C.pairA}>rise = 3 (opposite)</text>
        <text x={ox + 14} y={oy - 6} fontSize="14" fontFamily={MONO} fill={C.ink}>θ</text>
        <text x={ox + (run * u) / 2 - 6} y={oy - (rise * u) / 2 - 6} fontSize="12" fill={C.inkSoft}
          transform={`rotate(${-Math.atan2(rise, run) * 180 / Math.PI} ${ox + (run * u) / 2} ${oy - (rise * u) / 2})`}>hypotenuse (not given)</text>
      </svg>
 
      <Field label="Your verdict — is sin θ = 3/4 right? If not, what ratio fits?" value={verdict} onChange={setVerdict}
        placeholder="What two sides are 3 and 4? Which ratio uses those two?" />
 
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess beats "I don't know." Say which ratio you think fits, then submit. No penalty for being wrong.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caughtRatio ? (
        <>
          <Coach tone="good">Exactly. 3 and 4 are the two <b>legs</b> — opposite and adjacent. Sine needs the
            hypotenuse, which wasn't given. The ratio that relates the two legs is <b>tan θ = 3/4</b>. Picking the
            ratio is the whole skill here; the test won't tell you which one to use.</Coach>
          <Btn onClick={() => setStage("producer")}>Now solve one with no diagram →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">Good — and here's the piece I'd add: 3 is opposite θ, 4 is along the ground
            (adjacent). Is 4 the hypotenuse? It isn't — the hypotenuse is the slanted side, and it wasn't given.
            So which ratio uses the <b>two legs</b>?</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => setStage("producer")}>Got it — solve one →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Solve it · no diagram</StageTag>
          <H>The ladder</H>
          <P>A 12-ft ladder leans against a wall. Its base is <b>5 ft</b> from the wall. You want the angle θ the
            ladder makes with the ground. <b>There's no picture this time — you set it up.</b></P>
 
          <P style={{ marginBottom: 4 }}>First, label the sides relative to θ:</P>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
              The 5 ft (base) is the…
              <select value={adjSide} onChange={(e) => setAdjSide(e.target.value)}
                style={{ display: "block", marginTop: 4, fontFamily: FONT_BODY, fontSize: 14, padding: "8px 10px",
                  borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, color: C.ink }}>
                <option value="">choose…</option>
                <option>opposite</option><option>adjacent</option><option>hypotenuse</option>
              </select>
            </label>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
              The 12 ft (ladder) is the…
              <select value={oppSide} onChange={(e) => setOppSide(e.target.value)}
                style={{ display: "block", marginTop: 4, fontFamily: FONT_BODY, fontSize: 14, padding: "8px 10px",
                  borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, color: C.ink }}>
                <option value="">choose…</option>
                <option>opposite</option><option>adjacent</option><option>hypotenuse</option>
              </select>
            </label>
          </div>
          {(adjSide && oppSide) && !(adjSide === "adjacent" && oppSide === "hypotenuse") && (
            <Coach tone="redirect">Think about where each side sits relative to θ at the ground. The base runs
              <i> along</i> the ground next to θ; the ladder is the longest side, across from the right angle. Which
              labels does that make them?</Coach>
          )}
 
          <P style={{ marginBottom: 4, marginTop: 16 }}>Now choose the ratio that uses the two sides you actually know:</P>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["sin θ", "cos θ", "tan θ"].map((r) => (
              <button key={r} onClick={() => setRatio(r)}
                style={{ flex: "1 1 90px", minWidth: 90, fontFamily: MONO, fontSize: 14, fontWeight: 600,
                  padding: "10px 8px", borderRadius: 9, cursor: "pointer",
                  border: `1px solid ${ratio === r ? C.accent : C.line}`,
                  background: ratio === r ? C.accentSoft : C.panel, color: C.ink }}>{r}</button>
            ))}
          </div>
          {ratio && ratio !== "cos θ" && (
            <Coach tone="redirect">You know the base (adjacent) and the ladder (hypotenuse). Which ratio is built
              from adjacent and hypotenuse? Say the three ratios out — SOH-CAH-TOA — and find the one with those two.</Coach>
          )}
          {ratio === "cos θ" && (
            <Coach tone="good">Right — adjacent over hypotenuse is cosine: <b>cos θ = 5/12</b>. You picked the ratio
              from the sides you had, with no diagram handed to you.</Coach>
          )}
 
          <Field label="Solve for θ (show the setup and the value)" value={answer} onChange={setAnswer}
            placeholder="cos θ = 5/12, so θ = cos⁻¹(5/12) ≈ …°" rows={2} />
          <Field label="What does that angle mean for the ladder in real life?" value={interpret} onChange={setInterpret}
            placeholder="It's the angle the ladder leans at — steep enough that…" rows={2} />
 
          {ratio === "cos θ" && answer.trim().length > 6 && interpret.trim().length > 6 && (
            (!isFiller(answer) && !isFiller(interpret)) || stuck ? (
              <>
                <Coach tone="good">You chose the right ratio — cosine, from the two sides you had. Saved for your teacher.
                  Your solve and your real-life meaning are in your words; reread them and make sure the angle and its meaning are both there.</Coach>
                <Btn onClick={() => setStage("recap")}>See the argument you built →</Btn>
              </>
            ) : (
              <>
                <Coach tone="redirect">Show the solve (cos θ = 5/12, θ = cos⁻¹(5/12) ≈ 65°) and say what the angle means for the ladder — real sentences, not placeholders.</Coach>
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
          <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Claim (your verdict on sin θ = 3/4)" text={verdict} />
            <RecapRow label="Setup (sides you labeled)" text={adjSide && oppSide ? `base = ${adjSide}, ladder = ${oppSide}` : ""} />
            <RecapRow label="Ratio you chose" text={ratio} />
            <RecapRow label="Solve" text={answer} />
            <RecapRow label="What the angle means" text={interpret} />
          </div>
          <CopyResults lines={[
            "GEOMETRY — Build 2: Right-Triangle Trig",
            `Verdict on sin θ = 3/4: ${verdict}`,
            `Side labels: base = ${adjSide}, ladder = ${oppSide}`,
            `Ratio chosen: ${ratio}`,
            `Solve: ${answer}`,
            `Meaning: ${interpret}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* ============================================================================
   GENERIC FULL MODULE (judge → producer → recap) — Geometry-styled
   Same spine as the two hand-built modules, config-driven for breadth.
   ============================================================================ */
function FullModule({ config }) {
  const [stage, setStage] = useState("judge");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [vals, setVals] = useState({});
  const setVal = (k, v) => setVals((s) => ({ ...s, [k]: v }));
  const reset = () => { setStage("judge"); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false); setVals({}); };
  const caught = config.judge.caught.test(verdict);
  const ready = config.producer.ready({ ...vals, verdict });
  const defaultCheck = (s) => {
    const bad = config.producer.fields.find((f) => isFiller(s[f.key]));
    return bad ? { ok: false, hint: "Put a real answer in each box — a sentence in your own words, not a placeholder — then you can move on." } : { ok: true };
  };
  const checkResult = ready ? (config.producer.check ? config.producer.check({ ...vals, verdict }) : defaultCheck({ ...vals, verdict })) : { ok: true };
  const correct = ready && checkResult.ok;
  const wrong = ready && !checkResult.ok && !stuck;
  const passable = correct || stuck;
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; } setSubmitted(true); };
 
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
        <Coach tone="redirect">Give it a real shot first — even a wrong guess is worth more than "I don't know." Say what you actually think, then submit. No penalty for being wrong here.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caught ? (
        <>
          <Coach tone="good">{config.judge.goodCoach}</Coach>
          <Btn onClick={() => setStage("producer")}>Now build one yourself →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">{config.judge.redirectCoach}</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => setStage("producer")}>Got it — build one yourself →</Btn>
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
              <Coach tone="redirect">{checkResult.hint || "Not quite — take another look before moving on."}</Coach>
              <Btn kind="ghost" onClick={() => setStuck(true)}>I'm stuck — move on anyway</Btn>
            </>
          )}
          {passable && (
            <>
              <Coach tone="good">{config.producer.goodCoach}</Coach>
              <Btn onClick={() => setStage("recap")}>See the argument you built →</Btn>
            </>
          )}
        </div>
      )}
 
      {stage === "recap" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>The argument you built</StageTag>
          <H>Your reasoning, assembled</H>
          <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            {config.recap.rows({ ...vals, verdict }).map((r, i) => <RecapRow key={i} label={r.label} text={r.text} />)}
          </div>
          <CopyResults lines={config.recap.copy({ ...vals, verdict })} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* small reusable figure box */
function Fig({ children, h = 220 }) {
  return (
    <svg viewBox={`0 0 380 ${h}`} style={{ width: "100%", height: "auto", background: C.panel,
      border: `1px solid ${C.line}`, borderRadius: 10, display: "block", margin: "8px 0" }}>{children}</svg>
  );
}
 
/* ---- Module 3 — Congruence (G-CO) ---------------------------------------- */
function ModuleCongruence() {
  return <FullModule config={{
    tag: "Module 3 · Congruence",
    judge: {
      prompt: (<>
        <P>Two triangles share two pairs of equal angles and one pair of equal <i>non-included</i> sides. A student writes:</P>
        <pre style={{ fontFamily: MONO, fontSize: 14, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", color: C.ink }}>{`Two angles match and a side matches,
so the triangles are congruent by SSA.`}</pre>
        <P>They invoked "SSA." Is that a valid congruence criterion?</P>
      </>),
      visual: (
        <Fig>
          <polygon points="40,170 150,170 95,60" fill={C.accentSoft} stroke={C.accent} strokeWidth="2" />
          <polygon points="220,170 350,170 250,70" fill={C.amberSoft} stroke={C.amber} strokeWidth="2" />
          <text x="95" y="190" fontSize="12" fill={C.inkSoft} textAnchor="middle">same angles…</text>
          <text x="285" y="190" fontSize="12" fill={C.inkSoft} textAnchor="middle">…different shape</text>
        </Fig>
      ),
      input: { label: "Your verdict — is SSA a valid way to prove congruence?",
        placeholder: "Is SSA on the list (SSS, SAS, ASA, AAS)? Can two different triangles fit SSA?" },
      caught: /no|not valid|SSA.*not|ambiguous|two.*triangle|isn'?t a|AAS|ASA|SAS|SSS|doesn'?t (work|prove)|invalid|not a (real|valid)/i,
      goodCoach: (<>Right — <b>SSA isn't a valid criterion</b> (it's the "ambiguous case" — two different triangles can satisfy it). The valid ones are SSS, SAS, ASA, and AAS. Here, two angles plus any side is actually <b>AAS</b>, which <i>does</i> work — but you have to name the real reason, not SSA.</>),
      redirectCoach: (<>Good — and here's the piece I'd add: run through the valid list — SSS, SAS, ASA, AAS. Notice SSA isn't on it. That's because two <i>different</i> triangles can share SSA. Two angles and a side is really AAS. What's the correct name here?</>),
    },
    producer: {
      title: "Pick the criterion and justify",
      prompt: (<P>Two triangles have: a pair of equal sides, the angle between those sides equal, and another pair of equal sides. Name the congruence criterion and explain why it forces the triangles to match.</P>),
      fields: [
        { key: "crit", label: "Which criterion applies here?", placeholder: "SAS — side, included angle, side", rows: 1 },
        { key: "why", label: "Why does that criterion guarantee congruence?", placeholder: "Fixing two sides and the angle between them leaves no freedom, so…" },
      ],
      ready: (s) => (s.crit||"").trim().length>2 && (s.why||"").trim().length>10,
      check: (s) => {
        const c = (s.crit || "").toUpperCase().replace(/[^A-Z]/g, "");
        if (c.includes("SAS")) return { ok: true };
        return { ok: false, hint: "Two sides with the angle between them: that's side-angle-side — SAS. Name that one, then explain why it locks the triangle." };
      },
      goodCoach: (<>SAS is the right criterion — saved for your teacher. Your explanation of <i>why</i> it pins the triangle down is in your words; reread it and make sure it captures the "no remaining freedom" idea.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict on SSA)", text: s.verdict },
        { label: "Criterion you chose", text: s.crit },
        { label: "Why it guarantees congruence", text: s.why },
      ],
      copy: (s) => ["GEOMETRY — Module 3: Congruence", `Verdict on SSA: ${s.verdict}`, `Criterion: ${s.crit}`, `Why: ${s.why}`],
    },
  }} />;
}
 
/* ---- Module 4 — Similarity & Transformations (G-SRT.A/B) ----------------- */
function ModuleSimilarity() {
  const [stage, setStage] = useState("judge");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [k, setK] = useState(3);          // judge scale factor
  const [pk, setPk] = useState(4);        // producer scale factor
  const [base, setBase] = useState(20);   // producer base area
  const [rule, setRule] = useState("");
  const [stuck, setStuck] = useState(false);
  const reset = () => { setStage("judge"); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false); setK(3); setPk(4); setBase(20); setRule(""); };
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; } setSubmitted(true); };
 
  const caught = /squared|²|\bk2\b|k\^2|factor.*squar|squar.*factor|not (just )?k|k times k|grid|count|nine|n²/i.test(verdict) || /\b(area).*\b(k|factor)\b.*(square|²|twice)/i.test(verdict);
 
  useSessionReport("Module 4 · Similarity & Transformations", submitted ? [
    "GEOMETRY — Module 4: Similarity & Transformations",
    `Verdict: ${verdict}`,
    `Scaling: ${base} × ${pk}² = ${base * pk * pk} cm²`,
    `Rule: ${rule}`,
  ] : null);
 
  // tiled square: draw k×k unit cells inside the enlarged square
  const Tiled = ({ factor, cell = 26, color = C.amber, soft = C.amberSoft }) => {
    const n = factor, side = n * cell, ox = 40, oy = 20;
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      cells.push(<rect key={`${r}-${c}`} x={ox + c * cell} y={oy + r * cell} width={cell} height={cell}
        fill={soft} stroke={color} strokeWidth="1" />);
    return (
      <Fig h={side + 70}>
        <rect x={ox} y={oy} width={cell} height={cell} fill={C.accentSoft} stroke={C.accent} strokeWidth="2.5" />
        <text x={ox + cell / 2} y={oy + cell / 2 + 4} fontSize="11" fill={C.accentInk} textAnchor="middle">1</text>
        {factor > 1 && cells.map((c, i) => i === 0 ? null : c)}
        <rect x={ox} y={oy} width={side} height={side} fill="none" stroke={color} strokeWidth="2.5" />
        <text x={ox} y={oy + side + 22} fontSize="12" fill={C.inkSoft}>
          scale factor k = {factor} → side ×{factor}, area = {factor}×{factor} = <tspan fontWeight="700">{factor * factor}</tspan> unit squares
        </text>
      </Fig>
    );
  };
 
  return (
    <section>
      <StageTag>Module 4 · Similarity & Transformations</StageTag>
      <H>You're the coach</H>
      <P>A square is enlarged by a scale factor of k. A student says: <i>"Scale factor k, so the area is also k× bigger."</i></P>
      <P>Drag k and count how many unit squares actually fit inside. Does area scale by k?</P>
 
      <Tiled factor={k} />
      <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
        k = {k} — unit squares inside: <b>{k * k}</b> (not {k})
      </label>
      <input type="range" min={1} max={5} value={k} onChange={(e) => setK(+e.target.value)} style={{ width: "100%" }} />
 
      <Field label="Your verdict — does area scale by k, or something else?" value={verdict} onChange={setVerdict}
        placeholder="As k grows, count the unit squares. Is it k, or k×k?" />
 
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess beats "I don't know." Say what the square count does as k grows, then submit. No penalty for being wrong.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caught ? (
        <>
          <Coach tone="good">Exactly — area scales by the factor <b>squared</b>: at k = {k} that's <b>{k * k}</b> unit squares, not {k}. Lengths scale by k, areas by k², volumes by k³. That relationship is what the whole similarity cluster is built on.</Coach>
          <Btn onClick={() => setStage("producer")}>Now scale one yourself →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">Good start — and here's the piece I'd add: drag k to 4 and literally count the little squares filling the big one. It's a grid — {4}×{4} = 16, not 4. Area scales by the factor <i>squared</i>. So what's the real area multiplier?</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => setStage("producer")}>Got it — scale one yourself →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Scale a real shape</H>
          <P>A shape starts at area <b>{base} cm²</b>. Drag the scale factor and watch the new area update by the rule you're discovering.</P>
 
          <Tiled factor={pk} color={C.accent} soft={C.accentSoft} />
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: "12px 0 4px" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
              scale factor k = {pk}
              <input type="range" min={2} max={5} value={pk} onChange={(e) => setPk(+e.target.value)} style={{ display: "block", width: 140 }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
              base area = {base} cm²
              <input type="range" min={5} max={40} step={5} value={base} onChange={(e) => setBase(+e.target.value)} style={{ display: "block", width: 140 }} />
            </label>
          </div>
          <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 14px",
            fontFamily: MONO, fontSize: 15, color: C.ink, margin: "8px 0" }}>
            new area = {base} × {pk}² = {base} × {pk * pk} = <b>{base * pk * pk} cm²</b>
          </div>
 
          <Field label="State the rule connecting scale factor to area — and why it's squared, not linear" value={rule} onChange={setRule}
            placeholder="Area scales by k² because area is two-dimensional — both length and width get multiplied by k…" />
 
          {rule.trim().length > 12 && (
            (!isFiller(rule) || stuck) ? (
              <>
                <Coach tone="good">The live display shows new area = base × k² holding for every k. Saved for your teacher. Your rule is in your own words; reread it — does it say <i>why</i> area squares (two-dimensional, both directions scale)?</Coach>
                <Btn onClick={() => setStage("recap")}>See the argument you built →</Btn>
              </>
            ) : (
              <>
                <Coach tone="redirect">Say the rule in real words: area scales by k² because area is two-dimensional, so both length and width get multiplied by k. Not a placeholder.</Coach>
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
          <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Claim (your verdict)" text={verdict} />
            <RecapRow label="Scaling you tested" text={`base ${base} cm² × ${pk}² = ${base * pk * pk} cm²`} />
            <RecapRow label="Rule + why it's squared" text={rule} />
          </div>
          <CopyResults lines={[
            "GEOMETRY — Module 4: Similarity & Transformations",
            `Verdict: ${verdict}`,
            `Scaling: ${base} × ${pk}² = ${base * pk * pk} cm²`,
            `Rule: ${rule}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
/* ---- Module 5 — Circles (G-C) -------------------------------------------- */
function ModuleCircles() {
  const [stage, setStage] = useState("judge");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [vAngle, setVAngle] = useState(210);   // judge: vertex position on circle (deg)
  const [central, setCentral] = useState(80);  // producer: central angle (deg)
  const [why, setWhy] = useState("");
  const [stuck, setStuck] = useState(false);
  const reset = () => { setStage("judge"); setVerdict(""); setSubmitted(false); setNudged(false); setStuck(false); setVAngle(210); setCentral(80); setWhy(""); };
  const submitVerdict = () => { if (isThinVerdict(verdict) && !nudged) { setNudged(true); return; } setSubmitted(true); };
 
  const caught = /half|twice|2×|double|central.*2|inscribed.*half|not equal|1\/2|0\.5|×2|two times|stays|always|same ratio|constant/i.test(verdict);
 
  useSessionReport("Module 5 · Circles", submitted ? [
    "GEOMETRY — Module 5: Circles",
    `Verdict: ${verdict}`,
    `Tested: central ${central}° → inscribed ${(central / 2).toFixed(central % 2 ? 1 : 0)}°, arc ${central}°`,
    `Reasoning: ${why}`,
  ] : null);
 
  // Circle geometry. Center (190,120), r=85. Arc endpoints A,B fixed.
  const cx = 190, cy = 120, r = 85;
  const pt = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const aDeg = -40, bDeg = 40;             // arc AB endpoints (right side)
  const [ax, ay] = pt(aDeg), [bx, by] = pt(bDeg);
  const centralMeasure = bDeg - aDeg;      // = 80°
  const inscribed = centralMeasure / 2;    // = 40°, invariant for any vertex on major arc
 
  const CircleFig = ({ vDeg, showInscribed = true }) => {
    const [vx, vy] = pt(vDeg);
    return (
      <Fig h={260}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth="1.5" />
        {/* arc AB highlighted */}
        <path d={`M ${ax} ${ay} A ${r} ${r} 0 0 1 ${bx} ${by}`} fill="none" stroke={C.amber} strokeWidth="4" />
        {/* central angle */}
        <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={C.amber} strokeWidth="2" />
        <line x1={cx} y1={cy} x2={bx} y2={by} stroke={C.amber} strokeWidth="2" />
        <circle cx={cx} cy={cy} r="3" fill={C.ink} />
        <text x={cx - 30} y={cy + 4} fontSize="11" fill={C.amber}>central {centralMeasure}°</text>
        {/* inscribed angle from draggable vertex */}
        {showInscribed && (<>
          <line x1={vx} y1={vy} x2={ax} y2={ay} stroke={C.accent} strokeWidth="2" />
          <line x1={vx} y1={vy} x2={bx} y2={by} stroke={C.accent} strokeWidth="2" />
          <circle cx={vx} cy={vy} r="6" fill={C.accent} />
          <text x={vx < cx ? vx - 8 : vx + 8} y={vy} fontSize="11" fill={C.accentInk}
            textAnchor={vx < cx ? "end" : "start"}>inscribed {inscribed}°</text>
        </>)}
        <circle cx={ax} cy={ay} r="3" fill={C.ink} /><text x={ax + 6} y={ay} fontSize="11" fill={C.ink}>A</text>
        <circle cx={bx} cy={by} r="3" fill={C.ink} /><text x={bx + 6} y={by + 4} fontSize="11" fill={C.ink}>B</text>
      </Fig>
    );
  };
 
  return (
    <section>
      <StageTag>Module 5 · Circles</StageTag>
      <H>You're the coach</H>
      <P>An inscribed angle and a central angle both open onto the <b>same arc AB</b>. A student says: <i>"Same arc, so the two angles are equal."</i></P>
      <P>Drag the inscribed angle's vertex (teal dot) around the circle. Does it ever equal the central angle?</P>
 
      <CircleFig vDeg={vAngle} />
      <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
        vertex position — central stays <b>{centralMeasure}°</b>, inscribed stays <b>{inscribed}°</b> (exactly half)
      </label>
      <input type="range" min={70} max={290} value={vAngle} onChange={(e) => setVAngle(+e.target.value)} style={{ width: "100%" }} />
 
      <Field label="Your verdict — equal, or is there a fixed relationship?" value={verdict} onChange={setVerdict}
        placeholder="Drag the vertex anywhere on the major arc. What stays true about inscribed vs central?" />
 
      {nudged && !submitted && isThinVerdict(verdict) && (
        <Coach tone="redirect">Give it a real shot first — even a wrong guess beats "I don't know." Say what stays true as you drag, then submit. No penalty for being wrong.</Coach>
      )}
      {!submitted ? (
        <Btn onClick={submitVerdict} disabled={verdict.trim().length < 8}>
          {nudged && isThinVerdict(verdict) ? "Submit anyway" : "Submit my verdict"}
        </Btn>
      ) : caught ? (
        <>
          <Coach tone="good">Right — they're <b>not equal</b>. No matter where you drag the vertex, the inscribed angle stays <b>{inscribed}°</b> — exactly <b>half</b> the {centralMeasure}° central angle. "Same arc" sets a fixed 2:1 relationship, and the inscribed angle being constant on the arc is the inscribed-angle theorem itself.</Coach>
          <Btn onClick={() => setStage("producer")}>Now use the relationship →</Btn>
        </>
      ) : (
        <>
          <Coach tone="redirect">Good start — and here's the piece I'd add: drag the vertex all the way around. Notice the inscribed angle never changes and is always <i>smaller</i> than the central. It sits at exactly <b>half</b>. Which one is bigger, and what's the fixed ratio?</Coach>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => setStage("producer")}>Got it — use the relationship →</Btn>
            <Btn kind="ghost" onClick={() => setSubmitted(false)}>Look again</Btn>
          </div>
        </>
      )}
 
      {stage === "producer" && (
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
          <StageTag>Build it</StageTag>
          <H>Set the central angle, predict the inscribed</H>
          <P>Drag the central angle. Before you look at the label, the inscribed angle on the same arc should be half — then explain why the arc measure works the way it does.</P>
 
          <ProducerCircle central={central} />
          <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
            central angle = {central}° → inscribed = <b>{(central / 2).toFixed(central % 2 ? 1 : 0)}°</b> · arc AB = <b>{central}°</b>
          </label>
          <input type="range" min={40} max={160} step={10} value={central} onChange={(e) => setCentral(+e.target.value)} style={{ width: "100%" }} />
 
          <Field label="Why does the arc equal the central angle, while the inscribed angle is only half?" value={why} onChange={setWhy}
            placeholder="The arc has the same measure as its central angle by definition; the inscribed angle is half because…" />
 
          {why.trim().length > 12 && (
            (!isFiller(why) || stuck) ? (
              <>
                <Coach tone="good">The display confirms inscribed = half the central, and arc = central. Saved for your teacher. Your explanation is in your own words; reread it and make sure it ties the arc to its central angle and the inscribed to half.</Coach>
                <Btn onClick={() => setStage("recap")}>See the argument you built →</Btn>
              </>
            ) : (
              <>
                <Coach tone="redirect">Say it in real words: the arc equals its central angle by definition, and the inscribed angle is half the central. Not a placeholder.</Coach>
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
          <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 12 }}>
            <RecapRow label="Claim (your verdict)" text={verdict} />
            <RecapRow label="Relationship you tested" text={`central ${central}° → inscribed ${(central / 2).toFixed(central % 2 ? 1 : 0)}°, arc ${central}°`} />
            <RecapRow label="Why arc = central, inscribed = half" text={why} />
          </div>
          <CopyResults lines={[
            "GEOMETRY — Module 5: Circles",
            `Verdict: ${verdict}`,
            `Tested: central ${central}° → inscribed ${(central / 2).toFixed(central % 2 ? 1 : 0)}°, arc ${central}°`,
            `Reasoning: ${why}`,
          ]} />
          <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={reset}>Start over</Btn></div>
        </div>
      )}
    </section>
  );
}
 
// Producer-stage circle: central angle adjustable, inscribed shown as half.
function ProducerCircle({ central }) {
  const cx = 190, cy = 120, r = 85;
  const pt = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const aDeg = -central / 2, bDeg = central / 2;
  const [ax, ay] = pt(aDeg), [bx, by] = pt(bDeg);
  const [vx, vy] = pt(180);                       // inscribed vertex on far side
  const large = central > 180 ? 1 : 0;
  return (
    <Fig h={260}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth="1.5" />
      <path d={`M ${ax} ${ay} A ${r} ${r} 0 ${large} 1 ${bx} ${by}`} fill="none" stroke={C.amber} strokeWidth="4" />
      <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={C.amber} strokeWidth="2" />
      <line x1={cx} y1={cy} x2={bx} y2={by} stroke={C.amber} strokeWidth="2" />
      <circle cx={cx} cy={cy} r="3" fill={C.ink} />
      <text x={cx - 34} y={cy + 4} fontSize="11" fill={C.amber}>central {central}°</text>
      <line x1={vx} y1={vy} x2={ax} y2={ay} stroke={C.accent} strokeWidth="2" />
      <line x1={vx} y1={vy} x2={bx} y2={by} stroke={C.accent} strokeWidth="2" />
      <circle cx={vx} cy={vy} r="5" fill={C.accent} />
      <text x={vx + 8} y={vy} fontSize="11" fill={C.accentInk}>inscribed {(central / 2).toFixed(central % 2 ? 1 : 0)}°</text>
      <circle cx={ax} cy={ay} r="3" fill={C.ink} /><circle cx={bx} cy={by} r="3" fill={C.ink} />
    </Fig>
  );
}
 
/* ---- Module 6 — Volume → Micro-model (G-GMD / LEAP.III.GM.4) — summit ----- */
function ModuleVolume() {
  return <FullModule config={{
    tag: "Module 6 · Volume → Micro-model (the summit)",
    judge: {
      prompt: (<>
        <P>To estimate the volume of a slightly irregular boulder, a student models it as a perfect sphere of radius 0.5 m and writes:</P>
        <pre style={{ fontFamily: MONO, fontSize: 14, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", color: C.ink }}>{`V = (4/3)π(0.5)³ ≈ 0.52 m³
(treating the boulder as a sphere)`}</pre>
        <P><b>Another student says:</b> <i>"That's wrong — a boulder isn't a sphere, so you can't use the sphere formula."</i> Who's right?</P>
      </>),
      visual: (
        <Fig h={200}>
          <path d="M120 150 Q90 90 150 70 Q210 50 240 100 Q270 150 200 160 Q150 168 120 150 Z"
            fill={C.amberSoft} stroke={C.amber} strokeWidth="2" />
          <circle cx="185" cy="110" r="62" fill="none" stroke={C.accent} strokeWidth="2" strokeDasharray="5 4" />
          <text x="185" y="190" fontSize="12" fill={C.inkSoft} textAnchor="middle">boulder ≈ sphere (close enough?)</text>
        </Fig>
      ),
      input: { label: "Your verdict — can you model a boulder as a sphere to estimate volume?",
        placeholder: "Is an estimate allowed to use a clean shape? What makes that defensible?" },
      caught: /assum|approx|estimat|model|close enough|reasonable|if.*state|own it|good enough|defensib|simplif|useful.*even|not exact.*still|allowed/i,
      goodCoach: (<>That's the summit insight. The first student is <b>right</b> — modeling the boulder as a sphere gives a useful estimate, <i>as long as you state that you're approximating</i>. Using a clean solid to approximate messy reality, and owning the assumption, is precisely the micro-model skill (LEAP.III.GM.4).</>),
      redirectCoach: (<>Good — and here's the piece I'd add: an estimate doesn't need the exact shape. A sphere that's "close enough" gives a useful number <i>if</i> you say you're approximating. The technique works even though it isn't strictly exact. Does naming the assumption make the sphere model defensible?</>),
    },
    producer: {
      title: "Model the messy thing, own the assumption",
      prompt: (<P>A grain silo is a cylinder (radius 3 m, height 10 m) topped by a half-sphere of the same radius. Estimate its total volume, and state any assumption you're making.</P>),
      fields: [
        { key: "setup", label: "Your volume setup (cylinder + hemisphere)", placeholder: "V = πr²h + (1/2)(4/3)πr³ = π(9)(10) + …" },
        { key: "assume", label: "State a simplifying assumption you're making", placeholder: "I'm assuming the silo is a perfect cylinder + hemisphere, ignoring wall thickness and…" },
      ],
      ready: (s) => (s.setup||"").trim().length>12 && (s.assume||"").trim().length>10,
      check: (s) => {
        const w = (s.setup || "").replace(/\s/g, "").toLowerCase();
        const hasCyl = /π?r[²2\^]?2?h|πr2h|π\*?r\*?\*?2?\*?h|9.*10|π\(9\)|π9|\(3\)[²2\^]?2?.*10/.test(w) || /r2h|r\^2h/.test(w);
        const hasHemi = /1\/2|0\.5|half|hemisphere|\(4\/3\)|4\/3π?r[³3\^]?3?|r3|r\^3/.test(w);
        if (hasCyl && hasHemi) return { ok: true };
        return { ok: false, hint: "Build it from two solids: cylinder volume πr²h plus half a sphere ½·(4/3)πr³. Show both pieces in your setup." };
      },
      goodCoach: (<>Your setup has both solids — cylinder plus hemisphere. Saved for your teacher. Your assumption is in your own words; reread it and make sure it names what you idealized. That model-it-then-own-it move is the top of the Geometry rubric.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict on the boulder)", text: s.verdict },
        { label: "Volume setup", text: s.setup },
        { label: "Assumption you owned", text: s.assume },
      ],
      copy: (s) => ["GEOMETRY — Module 6: Volume → Micro-model", `Verdict: ${s.verdict}`, `Setup: ${s.setup}`, `Assumption: ${s.assume}`],
    },
  }} />;
}
 
/* ---- Module 7 — Modeling with Geometry (G-MG) ---------------------------- */
function ModuleModelingGeo() {
  return <FullModule config={{
    tag: "Module 7 · Modeling with Geometry",
    judge: {
      prompt: (<>
        <P>A city block is 200 m by 100 m. A student computes how many people live there at a density of 50 people per <b>square kilometer</b>:</P>
        <pre style={{ fontFamily: MONO, fontSize: 13.5, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", color: C.ink, lineHeight: 1.5 }}>{`Area = 200 × 100 = 20,000 m²
People = 20,000 × 50 = 1,000,000`}</pre>
        <P>They multiplied area by density directly. What went wrong?</P>
      </>),
      visual: null,
      input: { label: "Your verdict — why is a million people on one block wrong?",
        placeholder: "The density is per square km, but the area is in m². Do the units match?" },
      caught: /unit|km.*m|m.*km|convert|square (km|kilomet)|1,?000,?000 m|density.*km|mismatch|didn'?t convert|not.*same unit|10\^6|million m/i,
      goodCoach: (<>Right — the <b>units don't match</b>. Density is per km², but the area is in m². Since 1 km² = 1,000,000 m², the block is 0.02 km², giving about <b>1 person</b> — not a million. Matching units before multiplying is the modeling discipline G-MG checks.</>),
      redirectCoach: (<>Good — and here's the piece I'd add: a million people on one block is a clue something's off. The density is per <i>square kilometer</i>, but the area is in <i>square meters</i>. How many m² are in a km²? Convert first, then multiply.</>),
    },
    producer: {
      title: "Model a real situation",
      prompt: (<P>A circular pizza has a 16-inch diameter and costs $20. A 12-inch one costs $14. Use area to decide which is the better value per square inch, and explain.</P>),
      fields: [
        { key: "calc", label: "Cost per square inch for each (show the areas)", placeholder: "16in: area = π(8)² ≈ 201 in², $20/201 ≈ $0.10/in². 12in: …" },
        { key: "decide", label: "Which is better value, and why?", placeholder: "The 16-inch, because per square inch it costs less even though…" },
      ],
      ready: (s) => (s.calc||"").trim().length>12 && (s.decide||"").trim().length>8,
      goodCoach: (<>Saved — your teacher will see this. Check yours: did you compute the area-based cost for each option and use it to justify the better value? Applying geometry to a real choice is what modeling with geometry means.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict)", text: s.verdict },
        { label: "Cost-per-area work", text: s.calc },
        { label: "Your decision", text: s.decide },
      ],
      copy: (s) => ["GEOMETRY — Module 7: Modeling with Geometry", `Verdict: ${s.verdict}`, `Work: ${s.calc}`, `Decision: ${s.decide}`],
    },
  }} />;
}
 
/* ---- Module 8 — Conditional Probability (S-CP) --------------------------- */
function ModuleProbability() {
  return <FullModule config={{
    tag: "Module 8 · Conditional Probability",
    judge: {
      prompt: (<>
        <P>In a class, 60% play a sport and 30% are in band; 20% do both. A student checks if "plays a sport" and "in band" are independent by writing:</P>
        <pre style={{ fontFamily: MONO, fontSize: 13.5, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", color: C.ink, lineHeight: 1.5 }}>{`They overlap (20% do both),
so they must be independent.`}</pre>
        <P>They concluded independence just from the overlap existing. Is that the right test?</P>
      </>),
      visual: null,
      input: { label: "Your verdict — does overlap alone prove independence?",
        placeholder: "Independence means P(A and B) = P(A)×P(B). What's 0.6 × 0.3?" },
      caught: /0\.18|18|P\(A\).*P\(B\)|multipl|0\.6.*0\.3|not independent|≠|does not equal|product|times|dependent|compare/i,
      goodCoach: (<>Exactly — overlap alone proves nothing. The test is whether P(both) = P(A)×P(B). Here P(A)×P(B) = 0.6 × 0.3 = <b>0.18</b>, but P(both) = 0.20. Since 0.20 ≠ 0.18, they're <b>not independent</b>. Independence is a multiplication check, not "do they overlap."</>),
      redirectCoach: (<>Good — and here's the piece I'd add: lots of dependent events overlap. The real test is P(A and B) = P(A) × P(B). Compute 0.6 × 0.3 and compare it to the 0.20 who do both. Do they match?</>),
    },
    producer: {
      title: "Test independence yourself",
      prompt: (<P>A bag: P(red) = 0.5, P(striped) = 0.4, P(red and striped) = 0.25. Determine whether color and pattern are independent, showing the check.</P>),
      fields: [
        { key: "check", label: "Do the independence check (show the product)", placeholder: "P(red)×P(striped) = 0.5 × 0.4 = 0.20; P(red and striped) = 0.25…" },
        { key: "concl", label: "Independent or not? What does that mean in plain words?", placeholder: "Not independent, because 0.25 ≠ 0.20 — knowing it's red changes…" },
      ],
      ready: (s) => (s.check||"").trim().length>10 && (s.concl||"").trim().length>8,
      check: (s) => {
        const w = (s.check || "").replace(/\s/g, "");
        const hasProduct = /0?\.2(0)?/.test(w) && /0?\.5.*0?\.4|0?\.4.*0?\.5/.test(w);
        const hasJoint = /0?\.25/.test(w);
        if (hasProduct && hasJoint) return { ok: true };
        return { ok: false, hint: "Show the multiplication test: P(red)×P(striped) = 0.5 × 0.4 = 0.20, then compare to the 0.25 who are both. Include both numbers." };
      },
      goodCoach: (<>Your multiplication test checks out — saved for your teacher. Your conclusion is in your words; reread it and make sure it says what dependence <i>means</i> here: that knowing one outcome shifts the other.</>),
    },
    recap: {
      rows: (s) => [
        { label: "Claim (your verdict)", text: s.verdict },
        { label: "Independence check", text: s.check },
        { label: "Conclusion", text: s.concl },
      ],
      copy: (s) => ["GEOMETRY — Module 8: Conditional Probability", `Verdict: ${s.verdict}`, `Check: ${s.check}`, `Conclusion: ${s.concl}`],
    },
  }} />;
}
 
/* ============================================================================
   SHELL
   ============================================================================ */
const MODULES = [
  { id: 1, title: "Coordinate Reasoning", Comp: ModuleCoordinate, cluster: "G-GPE" },
  { id: 2, title: "Right-Triangle Trig", Comp: ModuleTrig, cluster: "G-SRT.C" },
  { id: 3, title: "Congruence", Comp: ModuleCongruence, cluster: "G-CO" },
  { id: 4, title: "Similarity & Transformations", Comp: ModuleSimilarity, cluster: "G-SRT.A/B" },
  { id: 5, title: "Circles", Comp: ModuleCircles, cluster: "G-C" },
  { id: 6, title: "Volume → Micro-model", Comp: ModuleVolume, cluster: "G-GMD" },
  { id: 7, title: "Modeling with Geometry", Comp: ModuleModelingGeo, cluster: "G-MG" },
  { id: 8, title: "Conditional Probability", Comp: ModuleProbability, cluster: "S-CP" },
];
 
// Grouped by reporting category so a student can match the score report.
const GROUPS = [
  { name: "Congruence, Similarity & Trig", ids: [3, 4, 2] },
  { name: "Circles & Coordinate Geometry", ids: [5, 1] },
  { name: "Measurement & Modeling", ids: [6, 7] },
  { name: "Statistics & Probability", ids: [8] },
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
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 1 }}>
            {entries.length} module{entries.length > 1 ? "s" : ""} attempted — hand your teacher everything at once.
          </div>
        </div>
        <Btn onClick={copy}>{label}</Btn>
      </div>
      <textarea id={idRef.current} readOnly value={text} rows={reveal ? 6 : 1}
        onFocus={(e) => e.target.select()}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 8, fontFamily: FONT_BODY, fontSize: 12.5,
          color: C.inkSoft, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px",
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
  return (
    <SessionContext.Provider value={ctx}>
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FONT_BODY, color: C.ink }}>
      <header style={{ borderBottom: `1px solid ${C.line}`, padding: "18px 22px", background: C.panel }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600 }}>Geometry · Reasoning Lab</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>
            Pick the cluster you scored lowest on. Catch the gap, build the proof, say why it holds.
          </div>
        </div>
      </header>
 
      <nav style={{ maxWidth: 760, margin: "0 auto", padding: "16px 22px 0" }}>
        {GROUPS.map((g) => (
          <div key={g.name} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              color: C.inkSoft, margin: "0 0 7px 2px" }}>{g.name}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {g.ids.map((id) => {
                const m = MODULES.find((x) => x.id === id);
                const on = m.id === active;
                const attempted = Object.keys(store).some((k) => k.includes(m.title) && store[k] && store[k].trim());
                return (
                  <button key={m.id} onClick={() => setActive(m.id)}
                    style={{ textAlign: "left", border: `1px solid ${on ? C.ink : C.line}`,
                      background: on ? C.ink : C.panel, color: on ? C.paper : C.ink, padding: "8px 13px",
                      borderRadius: 10, cursor: "pointer", fontFamily: FONT_BODY }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {m.title}
                      {attempted && <span title="attempted this session" style={{ color: on ? "#9ad9c0" : C.accent, marginLeft: 6 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: MONO,
                      color: on ? "rgba(255,255,255,.7)" : C.inkSoft, marginTop: 1 }}>{m.cluster}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
 
      <SessionExport store={store} />
 
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "12px 22px 80px" }}>
        {mod?.Comp ? <mod.Comp /> : <div style={{ color: C.inkSoft }}>On the roadmap.</div>}
      </main>
    </div>
    </SessionContext.Provider>
  );
}
 
