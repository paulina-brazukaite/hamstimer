import { describe, expect, it } from "vitest";
import { createBackup, formatDuration, parseBackup, parseHistory, recordSession, type KeyValueStore } from "./history";
import { createTimer, pause, saveNote, setIntention, start, stop, tick } from "./timer";

const MIN = 60_000;
const T0 = 1_700_000_000_000;

describe("recording sessions", () => {
  const s0 = setIntention(createTimer("50-10"), "Fix token refresh");

  it("records nothing until you step away, or for under a minute", () => {
    expect(recordSession([], start(s0, T0))).toEqual([]);
    expect(recordSession([], pause(start(s0, T0), T0 + 30_000))).toEqual([]);
  });

  it("keeps a short session once it has a note, so starting fresh can't lose it", () => {
    const s = saveNote(pause(start(s0, T0), T0 + 30_000), "check the retry header");
    const h = recordSession([], s);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ id: T0, note: "check the retry header", focusedMs: 30_000 });
  });

  it("adds an entry on pause and updates the same entry later", () => {
    let s = pause(start(s0, T0), T0 + 20 * MIN);
    let h = recordSession([], s);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ id: T0, intention: "Fix token refresh", focusedMs: 20 * MIN, endedAt: T0 + 20 * MIN });

    s = saveNote(s, "write the test");
    h = recordSession(h, s);
    expect(h[0].note).toBe("write the test");

    s = tick(start(s, T0 + 30 * MIN), T0 + 70 * MIN); // resume, focus runs out
    h = recordSession(h, s);
    expect(h).toHaveLength(1);
    expect(h[0].focusedMs).toBe(50 * MIN);
  });

  it("returns the same array when nothing changed (so we skip a write)", () => {
    const s = stop(start(s0, T0), T0 + 10 * MIN);
    const h = recordSession([], s);
    expect(recordSession(h, s)).toBe(h);
  });

  it("puts new sessions first", () => {
    const a = stop(start(s0, T0), T0 + 10 * MIN);
    const b = stop(start(setIntention(createTimer(), "Second"), T0 + 60 * MIN), T0 + 70 * MIN);
    const h = recordSession(recordSession([], a), b);
    expect(h.map((e) => e.intention)).toEqual(["Second", "Fix token refresh"]);
  });

  it("drops junk when loading", () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory([{ id: 1 }, "x"])).toEqual([]);
  });

  it("formats durations", () => {
    expect(formatDuration(38 * MIN)).toBe("38 min");
    expect(formatDuration(60 * MIN)).toBe("1 h");
    expect(formatDuration(75 * MIN)).toBe("1 h 15 min");
  });
});

function fakeStore(items: Record<string, string>): KeyValueStore {
  const keys = Object.keys(items);
  return { length: keys.length, key: (i) => keys[i] ?? null, getItem: (k) => items[k] ?? null };
}

describe("backups", () => {
  it("exports only nextline:* keys", () => {
    const b = createBackup(
      fakeStore({ "nextline:theme": '"light"', "nextline:history": "[]", "other-app": "1" }),
      new Date(T0),
    );
    expect(b.data).toEqual({ "nextline:theme": "light", "nextline:history": [] });
    expect(b.app).toBe("nextline");
  });

  it("round-trips through JSON", () => {
    const b = createBackup(fakeStore({ "nextline:theme": '"dark"' }), new Date(T0));
    expect(parseBackup(JSON.stringify(b)).data).toEqual(b.data);
  });

  it("rejects files that aren't backups, and strips foreign keys", () => {
    expect(() => parseBackup("not json")).toThrow(/valid JSON/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/Nextline backup/);
    expect(() => parseBackup('{"app":"nextline","version":9,"data":{}}')).toThrow(/newer version/);
    const b = parseBackup('{"app":"nextline","version":1,"data":{"nextline:a":1,"evil":2}}');
    expect(b.data).toEqual({ "nextline:a": 1 });
  });
});
