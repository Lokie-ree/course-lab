import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createEmitter,
  createLocalStorageSink,
  toCsv,
  STORAGE_KEY,
  type LabEvent,
  type StringStore,
} from "./telemetry";

function memoryStore(): StringStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

const context = {
  studentCode: "AB12",
  sessionId: "11111111-1111-4111-8111-111111111111",
  moduleId: "quadratics-ptr",
  moduleVersion: "1.0.0",
};

const partial = {
  roundId: "scenario-1",
  guideState: "predict",
  action: "check",
  result: "match",
} as const;

afterEach(() => {
  vi.useRealTimers();
});

describe("createEmitter", () => {
  it("merges session context, partial event, and a ts stamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_750_000_000_000);
    const store = memoryStore();
    const sink = createLocalStorageSink(store);
    const emit = createEmitter(sink, context);

    emit(partial);

    expect(sink.flush()).toEqual([
      { ...context, ...partial, ts: 1_750_000_000_000 },
    ]);
  });
});

describe("createLocalStorageSink", () => {
  it("accumulates events across writes and flush returns then clears them", () => {
    const store = memoryStore();
    const sink = createLocalStorageSink(store);
    const emit = createEmitter(sink, context);

    emit({ ...partial, action: "round_enter", result: undefined });
    emit(partial);

    const flushed = sink.flush();
    expect(flushed.map((e) => e.action)).toEqual(["round_enter", "check"]);
    expect(store.map.has(STORAGE_KEY)).toBe(false);
    expect(sink.flush()).toEqual([]);
  });

  it("treats a corrupt or non-array buffer as empty instead of throwing", () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, "{not json");
    const sink = createLocalStorageSink(store);

    const emit = createEmitter(sink, context);
    emit(partial);
    expect(sink.flush()).toHaveLength(1);

    store.setItem(STORAGE_KEY, '{"an":"object"}');
    expect(createLocalStorageSink(store).flush()).toEqual([]);
  });
});

describe("toCsv / exportCsv", () => {
  const base: LabEvent = { ...context, ...partial, ts: 42 };

  it("emits a header row plus one row per event in column order", () => {
    const csv = toCsv([base]);
    const [header, row] = csv.split("\n");
    expect(header).toBe(
      "studentCode,sessionId,moduleId,moduleVersion,roundId,guideState,beatId,action,result,ts"
    );
    expect(row).toBe(
      `AB12,${context.sessionId},quadratics-ptr,1.0.0,scenario-1,predict,,check,match,42`
    );
  });

  it("leaves optional fields empty and escapes quotes, commas, and newlines", () => {
    const nasty: LabEvent = {
      ...base,
      studentCode: 'A,B"2\nX', // free-typed codes can contain anything
      beatId: "guideState-x-1",
      result: undefined,
      action: "next",
    };
    const row = toCsv([nasty]).split("\n").slice(1).join("\n");
    expect(row).toBe(
      `"A,B""2\nX",${context.sessionId},quadratics-ptr,1.0.0,scenario-1,predict,guideState-x-1,next,,42`
    );
  });

  it("exportCsv reads the buffer without clearing it", () => {
    const store = memoryStore();
    const sink = createLocalStorageSink(store);
    createEmitter(sink, context)(partial);

    expect(sink.exportCsv().split("\n")).toHaveLength(2);
    expect(sink.flush()).toHaveLength(1);
  });
});
