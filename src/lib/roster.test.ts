import { describe, expect, it } from "vitest";
import { isRosterCode, normalizeStudentCode } from "./roster";

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
