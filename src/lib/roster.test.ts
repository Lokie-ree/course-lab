import { describe, expect, it } from "vitest";
import { isRosterCode, normalizeStudentCode, ROSTER_CODES } from "./roster";

const ROSTER = ["AB3X", "cd7y"];

describe("normalizeStudentCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeStudentCode("  ab3x \n")).toBe("AB3X");
  });
});

describe("isRosterCode", () => {
  it("accepts a roster code regardless of case and whitespace", () => {
    expect(isRosterCode(" ab3x ", ROSTER)).toBe(true);
    expect(isRosterCode("CD7Y", ROSTER)).toBe(true);
  });

  it("rejects codes not on the roster — a typo must not mint a phantom student", () => {
    expect(isRosterCode("AB3Y", ROSTER)).toBe(false);
    expect(isRosterCode("AB3", ROSTER)).toBe(false);
  });

  it("rejects empty and whitespace-only input", () => {
    expect(isRosterCode("", ROSTER)).toBe(false);
    expect(isRosterCode("   ", ROSTER)).toBe(false);
  });
});

describe("production roster", () => {
  it("contains no placeholder codes", () => {
    expect(ROSTER_CODES).not.toContain("TEST01");
    expect(ROSTER_CODES).not.toContain("TEST02");
  });

  it("codes are unique after normalization", () => {
    const normalized = ROSTER_CODES.map(normalizeStudentCode);
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it("every roster code admits itself through the real validator", () => {
    for (const code of ROSTER_CODES) {
      expect(isRosterCode(code)).toBe(true);
    }
  });
});
