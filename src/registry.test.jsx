import { describe, expect, it } from "vitest";
import { MODULES } from "./App.jsx";

// Wiring-contract guard (spec §4.2, §4.6): registry ↔ module-file exports.
// Not behavior tests — module behavior earns tests when next touched (§6).

const SUITE_IDS = ["algebra-remediation", "geometry-remediation"];
const SEMVER = /^\d+\.\d+\.\d+$/;

describe("module registry", () => {
  it("registers every module file exactly once", () => {
    const files = Object.keys(import.meta.glob("./modules/*.jsx"));
    expect(MODULES).toHaveLength(files.length);
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length);
  });

  it("uses kebab-case ids (spine moduleId convention, spec §4.2)", () => {
    for (const m of MODULES) {
      expect(m.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

describe("module exports (spine wiring contract)", () => {
  for (const m of MODULES) {
    it(`${m.id} exports MODULE_VERSION and a valid TELEMETRY_ENTRY`, async () => {
      const ns = await m.load();
      expect(typeof ns.default).toBe("function");
      expect(ns.MODULE_VERSION).toMatch(SEMVER);

      const entry = ns.TELEMETRY_ENTRY;
      expect(entry).toBeTruthy();
      expect(typeof entry.roundId).toBe("string");
      expect(entry.roundId.length).toBeGreaterThan(0);
      expect(typeof entry.guideState).toBe("string");
      expect(entry.guideState.length).toBeGreaterThan(0);

      if (SUITE_IDS.includes(m.id)) {
        // Suites are live at an internal module on mount (§8 internal-grain
        // ruling): entry carries '<suite>/<internal>' + that internal's version.
        expect(entry.moduleId).toMatch(new RegExp(`^${m.id}/[a-z0-9]+(-[a-z0-9]+)*$`));
        expect(entry.moduleVersion).toMatch(SEMVER);
      } else {
        // Standalones inherit moduleId/version from the registry + file.
        expect(entry.moduleId).toBeUndefined();
      }
    });
  }
});
