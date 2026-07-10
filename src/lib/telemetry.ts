// Measurement spine — LabEvent schema, emitter, localStorage sink, CSV export.
// Pure TypeScript, no React imports (spec §4.3). The schema is the durable
// asset; sinks are disposable plugs. Events are emitted at the action-handler
// boundary only — never renders, never effects (spec §4.4).

export type LabAction =
  | "round_enter"
  | "check"
  | "next"
  | "reset"
  | "reveal_earned"
  | "complete";

export type LabResult = "match" | "close" | "miss";

export interface LabEvent {
  studentCode: string; // opaque code; roster mapping lives offline
  sessionId: string; // crypto.randomUUID() per module mount
  moduleId: string; // suite-internal modules: '<suite>/<module>'
  moduleVersion: string; // MODULE_VERSION constant of the mounted module
  roundId: string; // append-only ids (spec §4.6)
  guideState: string; // per-module mapping (spec §4.2)
  beatId?: string; // optional finer grain where one roundId spans attempts
  action: LabAction;
  result?: LabResult; // 'check' only, normalized (spec §4.2)
  ts: number; // Date.now()
}

// Per-mount constants; everything per-interaction rides in PartialEvent (spec §4.3).
export interface SessionContext {
  studentCode: string;
  sessionId: string;
  moduleId: string;
  moduleVersion: string;
}

export type PartialEvent = Omit<LabEvent, keyof SessionContext | "ts">;

export interface TelemetrySink {
  write(event: LabEvent): void;
  flush(): LabEvent[]; // returns and clears buffered events
  exportCsv(): string; // teacher-triggered export
}

export function createEmitter(
  sink: TelemetrySink,
  context: SessionContext
): (partial: PartialEvent) => void {
  return (partial) => sink.write({ ...context, ...partial, ts: Date.now() });
}

const CSV_COLUMNS = [
  "studentCode",
  "sessionId",
  "moduleId",
  "moduleVersion",
  "roundId",
  "guideState",
  "beatId",
  "action",
  "result",
  "ts",
] as const;

function csvEscape(value: unknown): string {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(events: LabEvent[]): string {
  const rows = events.map((e) =>
    CSV_COLUMNS.map((col) => csvEscape(e[col])).join(",")
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}

// Minimal slice of the Storage API, injectable for tests.
export interface StringStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = "course-lab:events";

export function createLocalStorageSink(
  store: StringStore = globalThis.localStorage,
  key: string = STORAGE_KEY
): TelemetrySink {
  const read = (): LabEvent[] => {
    try {
      const raw = store.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return []; // corrupt buffer never blocks new events
    }
  };
  return {
    write(event) {
      const events = read();
      events.push(event);
      store.setItem(key, JSON.stringify(events));
    },
    flush() {
      const events = read();
      store.removeItem(key);
      return events;
    },
    exportCsv() {
      return toCsv(read());
    },
  };
}
