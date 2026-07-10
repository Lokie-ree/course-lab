import React, { useState, Suspense, lazy } from "react";

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

export default function App() {
  const [activeId, setActiveId] = useState(null);

  if (activeId) {
    const Active = lazyById[activeId];
    return (
      <div>
        <button onClick={() => setActiveId(null)} style={{ margin: "8px" }}>
          ← All modules
        </button>
        <Suspense fallback={<p style={{ padding: "16px" }}>Loading…</p>}>
          <Active />
        </Suspense>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: "640px", margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>course-lab</h1>
      <p>Module library — pick one:</p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "8px" }}>
        {MODULES.map((m) => (
          <li key={m.id}>
            <button onClick={() => setActiveId(m.id)} style={{ width: "100%", padding: "10px", textAlign: "left" }}>
              {m.title}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
