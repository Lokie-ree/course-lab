import React, { createContext, useContext, useMemo } from "react";
import { createEmitter } from "./telemetry";

// React face of the measurement spine. telemetry.ts stays React-free (spec
// §4.3); this file is the only bridge. Modules consume `useTelemetry()` and
// call emit() inside named action handlers only — never renders, never
// effects (spec §4.4).
//
// Wired module files export, next to MODULE_VERSION:
//
//   export const TELEMETRY_ENTRY = {
//     roundId: "...",        // fixed scenario id, append-only (spec §4.6)
//     guideState: "...",     // entry phase value
//     moduleId: "...",       // suites only: '<suite>/<internal>' live at mount
//     moduleVersion: "...",  // suites only: that internal's version
//   };
//
// The StartGate emits round_enter from its dismissal handler using this entry
// (spec §8 studentCode ruling). Modules without the export mount silently —
// that is how wiring lands one PR at a time.

const TelemetryContext = createContext(null);

const noop = () => {};
const NOOP_TELEMETRY = { emit: noop, forModule: () => noop };

export function TelemetryProvider({ sink, session, children }) {
  const value = useMemo(() => {
    const emitters = new Map();
    const forModule = (moduleId, moduleVersion) => {
      const key = `${moduleId}@${moduleVersion}`;
      if (!emitters.has(key)) {
        emitters.set(
          key,
          createEmitter(sink, { ...session, moduleId, moduleVersion })
        );
      }
      return emitters.get(key);
    };
    return { emit: createEmitter(sink, session), forModule };
  }, [sink, session]);
  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

// Null-safe: outside a provider (tests, previews) emits are no-ops, so a
// wired module never throws for lack of a session.
export function useTelemetry() {
  return useContext(TelemetryContext) ?? NOOP_TELEMETRY;
}
