// Roster code list for studentCode validation (spec §8: a typo must not mint
// a phantom student). Codes are opaque — the roster-to-name mapping lives
// offline with Randall; the app never stores a real name (spec §4.6).
//
// PLACEHOLDER LIST — replace with the real roster codes before student use.
// Codes are matched case-insensitively after trimming.
export const ROSTER_CODES: string[] = [
  "TEST01",
  "TEST02",
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
