// Roster code list for studentCode validation (spec §8: a typo must not mint
// a phantom student). Codes are opaque — the roster-to-name mapping lives
// offline with Randall; the app never stores a real name (spec §4.6).
//
// Codes are matched case-insensitively after trimming.
export const ROSTER_CODES: string[] = [
  // DEMO01 is the teacher-demo code — filter studentCode === "DEMO01" out of
  // any offline analysis. It exists so demos never mint a phantom student row
  // under a real code.
  "DEMO01",
  // Real codes below — assigned offline (spec §4.6); append-only, never
  // reassign a code to a different student (same rule as roundIds, §4.6).
  "3PSEG",
  "JS77D",
  "CRA4P",
  "BDCZN",
  "RNXJJ",
  "UU434",
  "DTMJ2",
  "8WTGE",
  "KKX2H",
  "XHRVK",
  "5EWZB",
  "DFXRS",
  "M7UQ5",
  "8GU4K",
  "KRPAK",
  "Q7MZ2",
  "M4DDA",
  "B4SSC",
  "4ZFKH",
  "PP6A5",
  "9QP4M",
  "D5BJ5",
  "42UCX",
  "8KPTA",
  "FWUKG",
  "6YRSJ",
  "Z49SG",
  "329HY",
  "HJF29",
  "M7Q4Z",
  "Z6HRX",
  "P4ZXQ",
  "A34HQ",
  "WWAFX",
  "E2V3G",
  "2QAH5",
  "HG5FD",
  "FMP7W",
  "5BCSU",
  "B5G8J",
];

export function normalizeStudentCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isRosterCode(
  input: string,
  roster: string[] = ROSTER_CODES
): boolean {
  const code = normalizeStudentCode(input);
  if (code === "") return false;
  return roster.some((r) => normalizeStudentCode(r) === code);
}
