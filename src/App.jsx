import React, { useState, Suspense, lazy } from "react";
import { createEmitter, createLocalStorageSink } from "./lib/telemetry";
import { TelemetryProvider } from "./lib/TelemetryContext";
import { isRosterCode, normalizeStudentCode } from "./lib/roster";

// Bare module picker — deliberately minimal (spec §5: move and version, not renovate).
// ids follow the spine's moduleId convention (spec §4.2); the two Remediation
// entries are multi-module suites (11 + 8 internal modules).
const MODULES = [
  { id: "quadratics-ptr", title: "Quadratics PTR", load: () => import("./modules/QuadraticsPTR.jsx") },
  { id: "systems-ptr", title: "Systems PTR", load: () => import("./modules/SystemsPTR.jsx") },
  { id: "key-features-ptr", title: "Key Features PTR", load: () => import("./modules/KeyFeaturesPTR.jsx") },
  { id: "equivalent-forms-ptr", title: "Equivalent Forms PTR", load: () => import("./modules/EquivalentFormsPTR.jsx") },
  { id: "intersections-ptr", title: "Intersections PTR", load: () => import("./modules/IntersectionsPTR.jsx") },
  { id: "linear-exponential-ptr", title: "Linear vs Exponential PTR", load: () => import("./modules/LinearExponentialPTR.jsx") },
  { id: "geometry-coordinate-ptr", title: "Geometry Coordinate PTR", load: () => import("./modules/GeometryCoordinatePTR.jsx") },
  { id: "predict-test-reconcile", title: "Predict-Test-Reconcile", load: () => import("./modules/PredictTestReconcile.jsx") },
  { id: "bind-the-parts", title: "Bind the Parts", load: () => import("./modules/BindTheParts.jsx") },
  { id: "assume-fit-reflect", title: "Assume-Fit-Reflect", load: () => import("./modules/AssumeFitReflect.jsx") },
  { id: "algebra-remediation", title: "Algebra Remediation (suite)", load: () => import("./modules/AlgebraRemediation.jsx") },
  { id: "geometry-remediation", title: "Geometry Remediation (suite)", load: () => import("./modules/GeometryRemediation.jsx") },
];

const lazyById = Object.fromEntries(MODULES.map((m) => [m.id, lazy(m.load)]));

const sink = createLocalStorageSink();
const STUDENT_CODE_KEY = "course-lab:studentCode";

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

function StartGate({ module: mod, onStarted, onBack }) {
  const cached = readCachedCode();
  const [input, setInput] = useState(cached);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    const code = normalizeStudentCode(input);
    if (!isRosterCode(code)) {
      setError("That code isn't on the roster — check it with your teacher and try again.");
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
    <main style={{ maxWidth: "480px", margin: "60px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <button onClick={onBack} style={{ marginBottom: "16px" }}>← All modules</button>
      <h1 style={{ fontSize: "22px" }}>{mod.title}</h1>
      <label style={{ display: "block", margin: "16px 0 8px" }}>
        Enter your student code to start:
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
          autoFocus
          style={{ display: "block", width: "160px", marginTop: "6px", padding: "8px 10px", fontSize: "16px", textTransform: "uppercase" }}
        />
      </label>
      {error && <p style={{ color: "#a3261f", fontSize: "14px" }}>{error}</p>}
      <button onClick={handleStart} disabled={starting} style={{ padding: "10px 18px", fontSize: "15px" }}>
        {starting ? "Loading…" : "Start →"}
      </button>
    </main>
  );
}

function exportTelemetryCsv() {
  const csv = sink.exportCsv();
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `course-lab-events-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [pendingId, setPendingId] = useState(null); // gate showing
  const [active, setActive] = useState(null); // { id, session }

  if (active) {
    const Active = lazyById[active.id];
    return (
      <TelemetryProvider sink={sink} session={active.session}>
        <div>
          <button onClick={() => setActive(null)} style={{ margin: "8px" }}>
            ← All modules
          </button>
          <Suspense fallback={<p style={{ padding: "16px" }}>Loading…</p>}>
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
    <main style={{ maxWidth: "640px", margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>course-lab</h1>
      <p>Module library — pick one:</p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "8px" }}>
        {MODULES.map((m) => (
          <li key={m.id}>
            <button onClick={() => setPendingId(m.id)} style={{ width: "100%", padding: "10px", textAlign: "left" }}>
              {m.title}
            </button>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: "32px", fontSize: "13px", color: "#666" }}>
        Teacher:{" "}
        <button onClick={exportTelemetryCsv} style={{ fontSize: "13px" }}>
          Export telemetry CSV
        </button>{" "}
        (flat event log, one row per event — spec §8)
      </p>
    </main>
  );
}
