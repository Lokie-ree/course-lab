import React, { useState, Suspense, lazy } from "react";
import { createEmitter, createLocalStorageSink } from "./lib/telemetry";
import { TelemetryProvider } from "./lib/TelemetryContext";
import { isRosterCode, normalizeStudentCode } from "./lib/roster";

// Module picker + start gate. ids follow the spine's moduleId convention
// (spec §4.2); `suite: true` marks the two multi-module suites (11 + 8 internal
// modules) so the grouping below is data, not a hardcoded list in the render.
export const MODULES = [
  { id: "quadratics-ptr", title: "Quadratics PTR", load: () => import("./modules/QuadraticsPTR.jsx") },
  { id: "systems-ptr", title: "Systems PTR", load: () => import("./modules/SystemsPTR.jsx") },
  { id: "key-features-ptr", title: "Key Features PTR", load: () => import("./modules/KeyFeaturesPTR.jsx") },
  { id: "equivalent-forms-ptr", title: "Equivalent Forms PTR", load: () => import("./modules/EquivalentFormsPTR.jsx") },
  { id: "intersections-ptr", title: "Intersections PTR", load: () => import("./modules/IntersectionsPTR.jsx") },
  { id: "linear-exponential-ptr", title: "Linear vs Exponential PTR", load: () => import("./modules/LinearExponentialPTR.jsx") },
  { id: "geometry-coordinate-ptr", title: "Geometry Coordinate PTR", load: () => import("./modules/GeometryCoordinatePTR.jsx") },
  { id: "predict-test-reconcile", title: "Predict-Test-Reconcile", load: () => import("./modules/PredictTestReconcile.jsx") },
  { id: "transformations-ptr", title: "Function Transformations PTR", load: () => import("./modules/TransformationsPTR.jsx") },
  { id: "bind-the-parts", title: "Bind the Parts", load: () => import("./modules/BindTheParts.jsx") },
  { id: "assume-fit-reflect", title: "Assume-Fit-Reflect", load: () => import("./modules/AssumeFitReflect.jsx") },
  { id: "algebra-remediation", title: "Algebra Remediation", suite: true, load: () => import("./modules/AlgebraRemediation.jsx") },
  { id: "geometry-remediation", title: "Geometry Remediation", suite: true, load: () => import("./modules/GeometryRemediation.jsx") },
];

const lazyById = Object.fromEntries(MODULES.map((m) => [m.id, lazy(m.load)]));

const sink = createLocalStorageSink();
const STUDENT_CODE_KEY = "course-lab:studentCode";

// Tokens mirrored from the modules' own `C` blocks. The house ruling is
// single-file module artifacts (spec §5) — duplication here is the pattern.
// The shell deliberately uses a NARROWER slice: ink, sub, line, one accent.
// Ember/violet/teal carry meaning inside a module; a hallway must not spend them
// (docs/design-brief.md — "the shell must not compete with the module").
const C = {
  bg: "#F7F4ED",
  panel: "#FFFFFF",
  ink: "#23211C",
  sub: "#6A675E",
  line: "#E5E0D4",
  accent: "#3457A6",
  good: "#1D8A66",
  danger: "#A3261F",
};
const FONT_DISPLAY = "'Fraunces','Georgia',serif";
const FONT_BODY = "'Inter','Segoe UI',system-ui,sans-serif";

// Inline styles can't express :hover / :focus-visible / reduced-motion, and a
// classroom tool needs all three. One <style> tag is the whole styling
// dependency — no framework, no CSS-in-JS (design brief: no new dependencies).
const SHELL_CSS = `
  /* The UA's default 8px body margin plus a 100vh child is 16px of guaranteed
     scroll on every screen — measured as 784px on a 1366x768 Chromebook, where
     anything below the fold is a thing nobody finds. */
  body { margin: 0; }
  .cl-shell { background: ${C.bg}; color: ${C.ink}; font-family: ${FONT_BODY};
    min-height: 100vh; }
  .cl-wrap { max-width: 62rem; margin: 0 auto; padding: 1.75rem 1.25rem 2.5rem; }
  .cl-h1 { font-family: ${FONT_DISPLAY}; font-weight: 600; font-size: 1.75rem;
    letter-spacing: -0.01em; margin: 0; }
  .cl-lede { color: ${C.sub}; font-size: 0.95rem; margin: 0.35rem 0 0; max-width: 62ch; }

  .cl-group { margin-top: 2rem; }
  .cl-group-label { font-size: 0.8rem; font-weight: 600; color: ${C.sub};
    margin: 0 0 0.6rem; }
  .cl-grid { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem;
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }

  /* One button vocabulary across the shell. */
  .cl-card, .cl-btn {
    font-family: inherit; border: 1px solid ${C.line}; border-radius: 8px;
    background: ${C.panel}; color: ${C.ink}; cursor: pointer;
    transition: border-color 160ms ease-out, background-color 160ms ease-out;
  }
  .cl-card { display: block; width: 100%; text-align: left;
    padding: 0.75rem 0.9rem; font-size: 1rem; min-height: 2.75rem; }
  .cl-card:hover { border-color: ${C.accent}; background: #FCFBF8; }
  .cl-card-sub { display: block; font-size: 0.8rem; color: ${C.sub}; margin-top: 0.15rem; }

  .cl-btn { padding: 0.6rem 1.1rem; font-size: 0.95rem; font-weight: 500;
    min-height: 2.75rem; }
  .cl-btn:hover:not(:disabled) { border-color: ${C.accent}; }
  .cl-btn:disabled { cursor: default; color: ${C.sub}; }
  .cl-btn-primary { background: ${C.accent}; border-color: ${C.accent}; color: #fff; }
  .cl-btn-primary:hover:not(:disabled) { background: #2C4A8E; }
  .cl-btn-primary:disabled { background: ${C.sub}; border-color: ${C.sub}; color: #fff; }

  .cl-link { background: none; border: none; padding: 0.35rem 0; font: inherit;
    font-size: 0.9rem; color: ${C.accent}; cursor: pointer; }
  .cl-link:hover { text-decoration: underline; }

  /* Chromebook trackpads are bad and keyboard use is common. */
  .cl-shell :focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px;
    border-radius: 4px; }

  .cl-input { font-family: inherit; font-size: 1.25rem; letter-spacing: 0.08em;
    text-transform: uppercase; width: 9rem; padding: 0.55rem 0.7rem;
    border: 1px solid ${C.sub}; border-radius: 8px; background: ${C.panel};
    color: ${C.ink}; }
  .cl-input::placeholder { color: ${C.sub}; letter-spacing: normal;
    text-transform: none; font-size: 0.95rem; }

  .cl-teacher { margin-top: 3rem; border-top: 1px solid ${C.line}; padding-top: 1rem; }
  .cl-teacher summary { font-size: 0.85rem; color: ${C.sub}; cursor: pointer;
    padding: 0.35rem 0; }
  .cl-teacher summary:hover { color: ${C.ink}; }

  @media (prefers-reduced-motion: reduce) {
    .cl-shell * { transition: none !important; animation: none !important; }
  }
`;

function Shell({ children }) {
  return (
    <div className="cl-shell">
      <style>{SHELL_CSS}</style>
      <main className="cl-wrap">{children}</main>
    </div>
  );
}

// studentCode is entered once per browser session (spec §8: prompt on mount,
// once per session); every module mount still passes through the gate so the
// Start click is a real dismissal handler — the round_enter emit site.
function readCachedCode() {
  try {
    return sessionStorage.getItem(STUDENT_CODE_KEY) || "";
  } catch {
    return "";
  }
}

// The sink degrades to an in-memory buffer when Chrome blocks site data, and a
// degraded sink is indistinguishable from a working one at every call site —
// which is exactly how a student completes the whole module, hands in their
// answers, and leaves behind no events at all, with no error anywhere. School
// Chromebooks are where that happens. Surfacing it here is what lets a
// collection protocol be four sentences instead of a page of contingencies.
function StorageHealth() {
  if (sink.persistent) {
    return (
      <p style={{ fontSize: "0.85rem", color: C.good, margin: "0.75rem 0 0" }}>
        Saving your work ✓
      </p>
    );
  }
  return (
    <p
      role="alert"
      style={{
        fontSize: "0.95rem", color: C.danger, background: "#FBF0EE",
        border: `1px solid ${C.danger}`, borderRadius: "8px",
        padding: "0.6rem 0.75rem", margin: "0.75rem 0 0", maxWidth: "44ch",
      }}
    >
      ⚠ This Chromebook isn’t saving your work. Tell Mr. L <strong>before</strong> you
      close this tab.
    </p>
  );
}

function StartGate({ module: mod, onStarted, onBack }) {
  const cached = readCachedCode();
  const [input, setInput] = useState(cached);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    const code = normalizeStudentCode(input);
    if (!isRosterCode(code)) {
      setError("That code isn’t on the roster — check it with your teacher and try again.");
      return;
    }
    setError("");
    setStarting(true);
    try {
      sessionStorage.setItem(STUDENT_CODE_KEY, code);
    } catch {
      /* private-mode storage failure must not block the session */
    }
    const ns = await mod.load();
    const session = {
      studentCode: code,
      sessionId: crypto.randomUUID(),
      moduleId: mod.id,
      moduleVersion: ns.MODULE_VERSION ?? "0.0.0",
    };
    const entry = ns.TELEMETRY_ENTRY;
    if (entry) {
      const context = entry.moduleId
        ? { ...session, moduleId: entry.moduleId, moduleVersion: entry.moduleVersion ?? session.moduleVersion }
        : session;
      createEmitter(sink, context)({
        roundId: entry.roundId,
        guideState: entry.guideState,
        action: "round_enter",
      });
    }
    onStarted(session);
  };

  return (
    <Shell>
      <button className="cl-link" onClick={onBack}>← All modules</button>
      <h1 className="cl-h1" style={{ marginTop: "0.5rem" }}>{mod.title}</h1>
      <StorageHealth />

      <label htmlFor="cl-code" style={{ display: "block", margin: "1.75rem 0 0.5rem", fontSize: "1rem" }}>
        Enter your student code to start
      </label>
      <input
        id="cl-code"
        className="cl-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? "cl-code-error" : undefined}
        placeholder="e.g. AB12"
        autoFocus
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
      {error && (
        <p id="cl-code-error" role="alert"
          style={{ color: C.danger, fontSize: "0.9rem", margin: "0.5rem 0 0", maxWidth: "44ch" }}>
          {error}
        </p>
      )}
      <div style={{ marginTop: "1.25rem" }}>
        <button className="cl-btn cl-btn-primary" onClick={handleStart} disabled={starting}>
          {starting ? "Loading…" : "Start →"}
        </button>
      </div>
    </Shell>
  );
}

function exportTelemetryCsv() {
  const csv = sink.exportCsv();
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Student code in the filename so a collected folder answers "who handed in?"
  // without opening 40 files. Falls back when a teacher exports off the picker
  // without having started a module on this device.
  const who = readCachedCode() || "device";
  a.download = `course-lab-events-${who}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ModuleGroup({ label, modules, onPick }) {
  if (!modules.length) return null;
  return (
    <section className="cl-group">
      <h2 className="cl-group-label">{label}</h2>
      <ul className="cl-grid">
        {modules.map((m) => (
          <li key={m.id}>
            <button className="cl-card" onClick={() => onPick(m.id)}>
              {m.title}
              {m.suite && <span className="cl-card-sub">Several activities inside</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function App() {
  const [pendingId, setPendingId] = useState(null); // gate showing
  const [active, setActive] = useState(null); // { id, session }
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  if (active) {
    const Active = lazyById[active.id];
    return (
      <TelemetryProvider sink={sink} session={active.session}>
        <div>
          <button
            className="cl-link"
            style={{ margin: "0.5rem 0 0 0.75rem", fontFamily: FONT_BODY }}
            onClick={() => setActive(null)}
          >
            ← All modules
          </button>
          <Suspense fallback={<p style={{ padding: "1rem", fontFamily: FONT_BODY, color: C.sub }}>Loading…</p>}>
            <Active />
          </Suspense>
        </div>
      </TelemetryProvider>
    );
  }

  if (pendingId) {
    const mod = MODULES.find((m) => m.id === pendingId);
    return (
      <StartGate
        module={mod}
        onBack={() => setPendingId(null)}
        onStarted={(session) => {
          setPendingId(null);
          setActive({ id: mod.id, session });
        }}
      />
    );
  }

  return (
    <Shell>
      <h1 className="cl-h1">course-lab</h1>
      <p className="cl-lede">Pick the activity your teacher named.</p>
      <StorageHealth />

      <ModuleGroup label="Activities" modules={MODULES.filter((m) => !m.suite)} onPick={setPendingId} />
      <ModuleGroup label="Review sets" modules={MODULES.filter((m) => m.suite)} onPick={setPendingId} />

      {/* Teacher controls live behind a disclosure so a student can't wander
          into "clear" — the two-step confirm is a backstop, not the guard. */}
      <details className="cl-teacher">
        <summary>Teacher controls</summary>
        <div style={{ padding: "0.5rem 0 0", display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
          <button className="cl-btn" onClick={exportTelemetryCsv}>Export event CSV</button>
          {!confirmingClear ? (
            <button className="cl-btn" onClick={() => { setConfirmingClear(true); setCleared(false); }}>
              Clear this device…
            </button>
          ) : (
            <>
              <button
                className="cl-btn"
                style={{ color: C.danger, borderColor: C.danger }}
                onClick={() => { sink.flush(); setConfirmingClear(false); setCleared(true); }}
              >
                Really clear — export first
              </button>
              <button className="cl-btn" onClick={() => setConfirmingClear(false)}>Cancel</button>
            </>
          )}
          {cleared && <span role="status" style={{ fontSize: "0.85rem", color: C.good }}>Cleared.</span>}
          <span style={{ fontSize: "0.8rem", color: C.sub, flexBasis: "100%" }}>
            One row per event (spec §8). Export before clearing — clearing is not undoable.
          </span>
        </div>
      </details>
    </Shell>
  );
}
