import React, { useState, useMemo, useEffect, useRef, useContext, createContext } from "react";

// Bump on pedagogically meaningful change only (spec §4.6); roundIds are append-only.
export const MODULE_VERSION = "1.0.0";
 
/* ============================================================================
   PROTOTYPE — BIND → DEFEND → PRODUCE   (the binding family, NOT the spine)
   HSA-SSE.A.1 — Interpret expressions that represent a quantity in terms of
   its context.
     LC1: connect the terms of an expression to the quantities they represent
     LC2: recognize how an expression represents the quantities in context
 
   WHY THIS IS NOT PREDICT → TEST → RECONCILE
   --------------------------------------------------------------------------
   Structure-reading has no bet. Nothing crosses, nothing counts, no number the
   eye guesses wrong and a graph corrects. The standard wants "the product of P
   and a factor not depending on P" — an INTERPRETATION, not a prediction. So
   the load-bearing move is "commit a READING," and the verification is
   STRUCTURAL: a correct bind of a referent-bearing part IS the demonstration.
   ("Matching IS verification" — pedagogy core.)
 
   THE ADJUDICATOR (what replaces the residual / the crossing):
     CONTEXT-RENDER. A wrong bind doesn't get a red X — it re-renders the
     scenario into something visibly wrong: a "starting amount" that moves, a
     growth that flattens into a straight line. The contradiction is in the
     picture, not in a grader. This is built as a SWAPPABLE adjudicator
     (renderContradiction per option) so the A-REI.B.3 sibling can swap in an
     equality-balance surface without touching the interaction.
 
   THE REFERENT-BEARING-UNIT RULE (earned across three pressure tests):
     Only bind units that have an independent contextual referent. r alone has
     none — it's a parameter INSIDE the factor — so (1+r) is ONE target, not two.
     r renders inside the token and Coach names it on success; it is never its
     own drop target. This is the rule that decides what is bindable.
 
   Carried over VERBATIM from the spine / fitting builds:
     - Coach / Btn / Field / RecapRow / CopyResults / SessionContext
     - copyText fallback chain
     - no-wall: producer & defend unlock on commit, never hard-gate
     - verified-praise-only: praise fires only on the bind the app checked;
       all defend/produce prose saved unjudged for the teacher
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
  bg: "#F7F4ED", panel: "#FFFFFF", ink: "#23211C", sub: "#6A675E", line: "#E5E0D4",
  indigo: "#3457A6", ember: "#C6471F", violet: "#6B4FB0", teal: "#1D8A66", amber: "#A8740F",
  goodBg: "#E9F4EF", goodInk: "#125E47", warnBg: "#FAF1DA", warnInk: "#74520A",
  neutralBg: "#EDF1F8", neutralInk: "#283F66",
};
const FONT_DISPLAY = "'Fraunces','Georgia',serif";
const FONT_BODY = "'Inter','Segoe UI',system-ui,sans-serif";
 
async function copyText(text, selectFallbackId) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return "copied"; }
  } catch (e) {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.setAttribute("readonly", "");
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); document.body.removeChild(ta);
    if (ok) return "copied";
  } catch (e) {}
  try {
    if (selectFallbackId) { const el = document.getElementById(selectFallbackId); if (el && el.select) { el.focus(); el.select(); return "selected"; } }
  } catch (e) {}
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
        color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, display: "grid", placeItems: "center" }}>C</div>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: ink, alignSelf: "center" }}>{children}</div>
    </div>
  );
}
function Btn({ children, onClick, kind = "primary", disabled }) {
  const base = { fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, borderRadius: 9, padding: "10px 18px",
    cursor: disabled ? "not-allowed" : "pointer", border: "1px solid transparent", transition: "opacity .15s", opacity: disabled ? 0.45 : 1 };
  const styles = { primary: { ...base, background: C.ink, color: C.bg }, ghost: { ...base, background: "transparent", color: C.sub, border: `1px solid ${C.line}` } };
  return <button style={styles[kind]} onClick={disabled ? undefined : onClick} disabled={disabled}>{children}</button>;
}
function Field({ label, value, onChange, placeholder, rows = 3, disabled }) {
  return (
    <label style={{ display: "block", margin: "12px 0" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 6 }}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.5, color: C.ink,
          background: disabled ? C.bg : C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px", resize: "vertical" }} />
    </label>
  );
}
function StageTag({ children }) {
  return <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.ember, marginBottom: 6 }}>{children}</div>;
}
function H({ children }) { return <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>{children}</h2>; }
function P({ children, style }) { return <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.ink, margin: "10px 0", ...style }}>{children}</p>; }
function RecapRow({ label, text }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, color: C.ink }}>{text ? text : <span style={{ color: C.sub, fontStyle: "italic" }}>—</span>}</div>
    </div>
  );
}
function CopyResults({ lines }) {
  const [status, setStatus] = useState("idle");
  const idRef = useRef(nextCopyId());
  const text = lines.filter(Boolean).join("\n");
  const copy = async () => { const r = await copyText(text, idRef.current); setStatus(r); if (r === "copied") setTimeout(() => setStatus("idle"), 2000); };
  const label = status === "copied" ? "Copied ✓" : status === "selected" ? "Selected — press ⌘/Ctrl-C" : status === "failed" ? "Select the box below & copy" : "Copy my answers";
  return (
    <div style={{ marginTop: 18 }}>
      <Btn onClick={copy}>{label}</Btn>
      {(status === "selected" || status === "failed") && (
        <div style={{ fontSize: 12.5, color: C.sub, marginTop: 6 }}>Copying is blocked here — tap inside the box, select all, and copy.</div>
      )}
      <textarea id={idRef.current} readOnly value={text} rows={4} onFocus={(e) => e.target.select()}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 10, fontFamily: FONT_BODY, fontSize: 13, color: C.sub,
          background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px" }} />
    </div>
  );
}
 
/* ============================================================================
   THE BINDING MANIPULATIVE
   Tokens of P(1+r)^n are tappable. The student selects a token, then taps the
   meaning it stands for. A correct bind locks (teal). A wrong bind triggers the
   token's renderContradiction — a small live scenario panel showing the bind
   producing visible nonsense — then releases so they can re-bind. NO red X.
 
   Config-driven so the contradiction surface is swappable (context-render here;
   an equality-balance renderer would drop in for A-REI.B.3 with no interaction
   change).
   ============================================================================ */
const MEANINGS = [
  { id: "start", label: "The starting deposit ($500)" },
  { id: "factor", label: "The growth factor — what you multiply by each year" },
  { id: "times", label: "How many years it compounds" },
  { id: "total", label: "The total after n years" },
];
 
const TOKENS = [
  {
    id: "P", glyph: "P", sub: "500", correct: "start",
    praise: "Right — P is the $500 you start with. Everything else acts ON it.",
    // wrong binds → what the scenario does
    contradiction: {
      factor: { head: "P as the growth factor?", body: "Then you'd multiply by 500 every year — $500 → $250,000 → $125 million by year three. A starting deposit can't also be the thing you multiply by.", viz: "explode" },
      times: { head: "P as the number of years?", body: "Then the account runs for 500 years. P is dollars, not a count of years.", viz: "flat" },
      total: { head: "P as the total?", body: "Then the answer is fixed at $500 forever, no matter how long it grows. But the whole point is it grows past 500.", viz: "flat" },
    },
  },
  {
    id: "factor", glyph: "(1 + r)", sub: "= 1.04", correct: "factor",
    praise: "That's the move. (1+r) is 1.04 — the factor. The r inside is your 4%; it's what makes the factor bigger than 1, which is why the money grows instead of sitting still.",
    contradiction: {
      start: { head: "The factor as the starting amount?", body: "Then you'd start with $1.04 in the account. The deposit was $500 — the factor isn't an amount of money, it's what you multiply by.", viz: "tiny" },
      times: { head: "The factor as the number of years?", body: "Then it compounds 1.04 times — once, barely. The factor isn't a count; it's the per-year multiplier.", viz: "flat" },
      total: { head: "The factor as the total?", body: "$1.04 total after years of growth? The factor is per-year, not the final amount.", viz: "tiny" },
    },
  },
  {
    id: "n", glyph: "n", sub: "exponent", correct: "times",
    praise: "Yes — n up in the exponent counts how many times the factor multiplies in. More years, more compounding.",
    contradiction: {
      start: { head: "n as the starting amount?", body: "Watch the start move: if n is the deposit, the amount you began with changes every year. A starting point can't move — that's what makes it the start.", viz: "movingStart" },
      factor: { head: "n as the growth factor?", body: "Then you'd multiply by n each year — but n IS the years. The number of years can't also be the rate it grows.", viz: "explode" },
      total: { head: "n as the total?", body: "n counts years; the total is dollars. A count of years isn't a pile of money.", viz: "flat" },
    },
  },
];
 
/* small inline scenario visual — the context re-rendering into nonsense */
function ContradictionViz({ kind }) {
  const common = { width: 300, height: 70 };
  if (kind === "movingStart") {
    return (
      <svg viewBox="0 0 300 70" style={common}>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <text x={20 + i * 72} y={20} fontSize="10" fill={C.sub} textAnchor="middle">year {i}</text>
            <text x={20 + i * 72} y={42} fontFamily={FONT_DISPLAY} fontSize="15" fill={C.amber} textAnchor="middle">${500 + i * 120}</text>
          </g>
        ))}
        <text x={150} y={63} fontSize="11" fill={C.warnInk} textAnchor="middle" fontStyle="italic">the "start" keeps changing — impossible</text>
      </svg>
    );
  }
  if (kind === "explode") {
    return (
      <svg viewBox="0 0 300 70" style={common}>
        {["$500", "$250k", "$125M"].map((v, i) => (
          <text key={i} x={45 + i * 105} y={38} fontFamily={FONT_DISPLAY} fontSize={13 + i * 2} fill={C.amber} textAnchor="middle">{v}</text>
        ))}
        <text x={150} y={62} fontSize="11" fill={C.warnInk} textAnchor="middle" fontStyle="italic">runs away in 3 years — not how a deposit grows</text>
      </svg>
    );
  }
  if (kind === "tiny") {
    return (
      <svg viewBox="0 0 300 70" style={common}>
        <text x={150} y={38} fontFamily={FONT_DISPLAY} fontSize="20" fill={C.amber} textAnchor="middle">$1.04</text>
        <text x={150} y={60} fontSize="11" fill={C.warnInk} textAnchor="middle" fontStyle="italic">a multiplier isn't an amount of money</text>
      </svg>
    );
  }
  // flat
  return (
    <svg viewBox="0 0 300 70" style={common}>
      <line x1={20} y1={45} x2={280} y2={45} stroke={C.amber} strokeWidth="2.4" />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={20 + i * 87} cy={45} r="4" fill={C.amber} />)}
      <text x={150} y={22} fontSize="11" fill={C.warnInk} textAnchor="middle" fontStyle="italic">nothing grows — the account just sits flat</text>
    </svg>
  );
}
 
function BindStage({ onComplete }) {
  const [bound, setBound] = useState({});       // tokenId -> meaningId (only correct ones persist)
  const [selToken, setSelToken] = useState(null);
  const [contra, setContra] = useState(null);   // { tokenId, meaningId }
  const allDone = TOKENS.every((t) => bound[t.id] === t.correct);
 
  // meanings already claimed by a correct bind are used up
  const usedMeanings = Object.values(bound);
 
  const tryBind = (meaningId) => {
    if (!selToken) return;
    const tok = TOKENS.find((t) => t.id === selToken);
    if (meaningId === tok.correct) {
      setBound((b) => ({ ...b, [tok.id]: meaningId }));
      setContra(null);
      setSelToken(null);
    } else {
      setContra({ tokenId: tok.id, meaningId });
      // do NOT lock — the bind is rejected by the scenario, student re-tries
    }
  };
 
  useSessionReport("Round 1 — Reading P(1+r)ⁿ", [
    allDone ? "Bound every part: P = starting deposit, (1+r) = growth factor (4% inside), n = times it compounds." : "",
  ]);
 
  return (
    <section>
      <StageTag>HSS-A-SSE.A.1 · Bind</StageTag>
      <H>Every piece is doing a job</H>
      <P>$500 in an account that grows 4% a year. After <i>n</i> years you'll have
        <b> P(1+r)ⁿ</b>. Tap a piece of the expression, then tap the job it does in the account.
        Guess wrong and the account itself shows you why it can't be that.</P>
 
      {/* the expression, tappable */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 2, margin: "18px 0 6px",
        fontFamily: FONT_DISPLAY, fontSize: 40, color: C.ink }}>
        {TOKENS.map((t, i) => {
          const done = bound[t.id] === t.correct;
          const sel = selToken === t.id;
          return (
            <span key={t.id} style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
              <button onClick={() => !done && setSelToken(sel ? null : t.id)}
                style={{ fontFamily: FONT_DISPLAY, fontSize: 40, lineHeight: 1, cursor: done ? "default" : "pointer",
                  background: done ? C.goodBg : sel ? C.neutralBg : "transparent",
                  color: done ? C.teal : C.ink,
                  border: `2px solid ${done ? C.teal : sel ? C.indigo : "transparent"}`,
                  borderRadius: 10, padding: "2px 8px", transition: "all .12s",
                  position: "relative", top: t.id === "n" ? -14 : 0, fontSize: t.id === "n" ? 24 : 40 }}>
                {t.glyph}
              </button>
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sub, marginTop: 2 }}>{t.sub}</span>
            </span>
          );
        })}
      </div>
 
      <div style={{ textAlign: "center", fontSize: 13, color: C.sub, minHeight: 18, marginBottom: 8 }}>
        {allDone ? "Every part bound." : selToken ? "Now tap the job this piece does ↓" : "Tap a piece of the expression to start."}
      </div>
 
      {/* meaning targets */}
      <div style={{ display: "grid", gap: 8 }}>
        {MEANINGS.map((mn) => {
          const claimedBy = TOKENS.find((t) => bound[t.id] === mn.id);
          const claimed = !!claimedBy;
          // note: "total" is a deliberate decoy — never correct for any single
          // token, because it's the job of the WHOLE expression. Tapping it
          // yields the token's "total" contradiction, teaching part-vs-whole.
          return (
            <button key={mn.id} disabled={claimed || !selToken} onClick={() => tryBind(mn.id)}
              style={{ textAlign: "left", fontFamily: FONT_BODY, fontSize: 14.5, lineHeight: 1.4, borderRadius: 9, padding: "11px 14px",
                cursor: claimed || !selToken ? "default" : "pointer",
                border: `1px solid ${claimed ? C.teal : C.line}`,
                background: claimed ? C.goodBg : selToken ? C.panel : C.bg,
                color: claimed ? C.goodInk : !selToken ? C.sub : C.ink,
                opacity: claimed ? 0.85 : 1 }}>
              {claimed ? `✓ ${mn.label}  —  that's ${claimedBy.glyph}` : mn.label}
            </button>
          );
        })}
      </div>
 
      {/* contradiction panel — the context re-rendering into nonsense */}
      {contra && (() => {
        const tok = TOKENS.find((t) => t.id === contra.tokenId);
        const c = tok.contradiction[contra.meaningId];
        if (!c) return null;
        return (
          <div style={{ marginTop: 14, background: C.warnBg, border: `1px solid ${C.amber}`, borderRadius: 10, padding: "13px 15px" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.warnInk, marginBottom: 6 }}>{c.head}</div>
            <ContradictionViz kind={c.viz} />
            <div style={{ fontSize: 14, lineHeight: 1.5, color: C.warnInk, marginTop: 6 }}>{c.body}</div>
            <div style={{ marginTop: 8 }}>
              <Btn kind="ghost" onClick={() => setContra(null)}>Try a different job for {tok.glyph}</Btn>
            </div>
          </div>
        );
      })()}
 
      {/* praise fires per verified correct bind, inline below */}
      {Object.entries(bound).map(([tid, mid]) => {
        const tok = TOKENS.find((t) => t.id === tid);
        if (mid !== tok.correct) return null;
        return <Coach key={tid} tone="good">{tok.praise}</Coach>;
      })}
 
      {allDone && (
        <Btn onClick={onComplete}>All bound → now catch a misread</Btn>
      )}
    </section>
  );
}
 
/* ---------------------------------------------------------------------------
   STAGE 2 — DEFEND THE SEAM. The P + Prn linearization trap.
   The student has bound the parts; now they use that reading to find where a
   plausible-looking rewrite breaks. (The judge move, by structure not simulation.)
   --------------------------------------------------------------------------- */
function DefendStage({ onComplete }) {
  const [where, setWhere] = useState("");
  const [done, setDone] = useState(false);
  useSessionReport("Round 1 — Defending against P + Prn", [where ? `Where the linear reading breaks (student's words): ${where}` : ""]);
  return (
    <section style={{ marginTop: 32, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
      <StageTag>HSS-A-SSE.A.1 · Defend</StageTag>
      <H>Someone rewrote the growth. Did they get it right?</H>
      <P>A classmate says the account is easier to write as <b>500 + 500(0.04)(n)</b> —
        "the deposit, plus 4% of it for each year." It looks reasonable. Using what each part
        actually means, find where this reading <i>stops being true</i>.</P>
 
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "12px 0", fontFamily: FONT_DISPLAY }}>
        <div style={{ flex: "1 1 200px", background: C.goodBg, border: `1px solid ${C.teal}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.goodInk }}>the real expression</div>
          <div style={{ fontSize: 22, color: C.ink, marginTop: 6 }}>500(1.04)ⁿ</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sub, marginTop: 6 }}>each year multiplies what's already there</div>
        </div>
        <div style={{ flex: "1 1 200px", background: C.warnBg, border: `1px solid ${C.amber}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.warnInk }}>the classmate's rewrite</div>
          <div style={{ fontSize: 22, color: C.ink, marginTop: 6 }}>500 + 500(0.04)n</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sub, marginTop: 6 }}>adds a flat $20 every year</div>
        </div>
      </div>
 
      <Field label="Where does the rewrite break, and why? (use what the parts mean)" value={where} onChange={setWhere}
        placeholder="They read the 4% as a flat $20 added each year, but it actually… so after a few years their total is ___ than the real one because…" rows={3} />
 
      {!done && <Btn onClick={() => setDone(true)} disabled={isFiller(where)}>{isFiller(where) ? "Say where it breaks" : "Lock it in"}</Btn>}
      {done && (
        <>
          <Coach tone="good">
            Saved in your words for your teacher. The seam: their $20 never grows, so year two earns 4% of $500
            again instead of 4% of $520. The real account compounds — interest earns interest — so it pulls ahead
            and the gap widens every year. You caught it by reading the parts, no graph needed.
          </Coach>
          <Btn onClick={onComplete}>Now build one yourself →</Btn>
        </>
      )}
    </section>
  );
}
 
/* ---------------------------------------------------------------------------
   STAGE 3 — PRODUCE A READING. Depreciation: r goes NEGATIVE.
   "a factor not depending on P" survives the sign flip. Build + annotate.
   --------------------------------------------------------------------------- */
function ProduceStage({ onComplete }) {
  const [factor, setFactor] = useState("");
  const [why, setWhy] = useState("");
  const [done, setDone] = useState(false);
  const fNorm = factor.replace(/\s/g, "");
  const factorOK = ["0.85", ".85", "(1-0.15)", "(1-.15)", "1-0.15", "1-.15"].includes(fNorm);
  useSessionReport("Round 2 — Depreciation (r negative)", [
    factor ? `Factor given: ${factor}` : "",
    why ? `What 0.85 means / why below 1 (student's words): ${why}` : "",
  ]);
  return (
    <section style={{ marginTop: 32, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
      <StageTag>HSS-A-SSE.A.1 · Produce</StageTag>
      <H>Same structure, opposite direction</H>
      <P>A $20,000 truck <i>loses</i> 15% of its value every year. Its value after <i>n</i> years has the
        exact same shape: <b>20000 · (factor)ⁿ</b>. What's the factor — and why is it the way it is?</P>
 
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "10px 0", fontFamily: FONT_DISPLAY, fontSize: 24, color: C.ink }}>
        20000 · ( <input value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="?" inputMode="decimal"
          style={{ width: 90, fontFamily: FONT_DISPLAY, fontSize: 22, textAlign: "center", color: C.ink, background: C.panel,
            border: `1px solid ${C.line}`, borderRadius: 9, padding: "4px 8px" }} /> )ⁿ
      </div>
 
      <Field label="What does that factor mean for the truck — and why is it less than 1, when the savings factor was more than 1?"
        value={why} onChange={setWhy} placeholder="The 0.85 means each year the truck keeps… It's below 1 because…" rows={3} />
 
      {(() => {
        const ready = factor.trim() && why.trim().length > 4;
        if (!ready) return null;
        if (done) return null;
        const good = factorOK && !isFiller(why);
        return good
          ? <Btn onClick={() => setDone(true)}>See what you built →</Btn>
          : (
            <>
              <Coach tone="redirect">{!factorOK
                ? "Losing 15% means keeping 85% — so the factor is 1 − 0.15 = 0.85. It multiplies the value down each year."
                : "Put the reason in words — why does keeping 85% each year make the factor sit below 1?"}</Coach>
              <Btn kind="ghost" onClick={() => setDone(true)}>I'll move on</Btn>
            </>
          );
      })()}
      {done && (
        <Coach tone="good">
          0.85 — losing 15% is the same as keeping 85%, so the factor sits below 1 and the value drains each
          year, the mirror of the savings account climbing above 1. Same "a factor times a starting amount"
          structure, opposite direction. That's the read the test is after. <Btn onClick={onComplete}>See your session</Btn>
        </Coach>
      )}
    </section>
  );
}
 
/* ---------------------------------------------------------------------------
   SHELL
   --------------------------------------------------------------------------- */
export default function BindDefendProduce() {
  const [phase, setPhase] = useState(1);
  const recordsRef = useRef({});
  const [, force] = useState(0);
  const ctx = useMemo(() => ({ record: (title, body) => { recordsRef.current[title] = body; force((n) => n + 1); } }), []);
  const sessionLines = useMemo(() => {
    const out = [];
    Object.entries(recordsRef.current).forEach(([title, body]) => { if (body && body.trim()) { out.push(`### ${title}`, body, ""); } });
    return out;
  }, [phase]);
 
  return (
    <SessionContext.Provider value={ctx}>
      <div style={{ background: C.bg, minHeight: "100vh", padding: "26px 18px", fontFamily: FONT_BODY, color: C.ink }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.sub, marginBottom: 2 }}>
            Binding family · prototype
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: C.sub, marginBottom: 20 }}>
            Bind → Defend → Produce — read structure, no graph
          </div>
 
          {phase >= 1 && <BindStage onComplete={() => setPhase(2)} />}
          {phase >= 2 && <DefendStage onComplete={() => setPhase(3)} />}
          {phase >= 3 && <ProduceStage onComplete={() => setPhase(4)} />}
 
          {phase === 4 && (
            <div style={{ marginTop: 34, paddingTop: 22, borderTop: `2px solid ${C.ink}` }}>
              <StageTag>The reading you built</StageTag>
              <H>You read an expression the way the test asks</H>
              <P style={{ color: C.sub }}>No graph, no formula handed to you — you said what each part does, caught a
                misread, and built the same structure in reverse.</P>
              <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 14 }}>
                {Object.entries(recordsRef.current).map(([title, body]) => body && body.trim() ? <RecapRow key={title} label={title} text={body} /> : null)}
              </div>
              <div style={{ marginTop: 18 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Hand your session to your teacher</div>
                <p style={{ fontSize: 14, color: C.sub, margin: "0 0 6px" }}>Every reading you committed and every reason you gave.</p>
                <CopyResults lines={sessionLines} />
              </div>
            </div>
          )}
        </div>
      </div>
    </SessionContext.Provider>
  );
}