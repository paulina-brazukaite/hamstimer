import { describe, expect, it } from "vitest";
import {
  createBackup,
  entryFromTask,
  formatDuration,
  parseBackup,
  parseHistory,
  pomodoroCount,
  recordTask,
  type KeyValueStore,
} from "./history";
import { addLine, createTimer, finishTask, markCurrentDone, start, tick } from "./timer";

const MIN = 60_000;
const T0 = 1_700_000_000_000;

function finished(title: string, at: number) {
  let s = addLine(createTimer("25-5"), "Read the old middleware", at);
  s = { ...s, task: { ...s.task, title } };
  s = tick(start(s, at), at + 26 * MIN); // one pomodoro
  s = markCurrentDone(s, at + 26 * MIN);
  s = addLine(s, "Tests for expiry", at + 30 * MIN);
  return entryFromTask(finishTask(s, at + 40 * MIN).finished!, at + 40 * MIN);
}

describe("finished tasks", () => {
  it("keep their lines, pomodoros and total focus time", () => {
    const e = finished("Rewrite auth flow", T0);
    expect(e).toMatchObject({ id: T0, title: "Rewrite auth flow", startedAt: T0, endedAt: T0 + 40 * MIN });
    expect(e.lines.map((l) => [l.text, l.doneAt !== null, l.pomodoros])).toEqual([
      ["Read the old middleware", true, 1],
      ["Tests for expiry", false, 0],
    ]);
    expect(e.focusedMs).toBe(25 * MIN);
    expect(pomodoroCount(e)).toBe(1);
  });

  it("go first, and replace an entry with the same id", () => {
    const a = finished("First", T0);
    const b = finished("Second", T0 + 60 * MIN);
    let h = recordTask(recordTask([], a), b);
    expect(h.map((e) => e.title)).toEqual(["Second", "First"]);
    h = recordTask(h, { ...a, title: "First, again" });
    expect(h.map((e) => e.title)).toEqual(["First, again", "Second"]);
  });

  it("round-trip through JSON", () => {
    const h = [finished("Rewrite auth flow", T0)];
    expect(parseHistory(JSON.parse(JSON.stringify(h)))).toEqual(h);
  });

  it("drops junk when loading", () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory([{ id: 1 }, "x"])).toEqual([]);
  });
});

describe("sessions saved before tasks", () => {
  const old = { id: T0, intention: "Fix token refresh", focusedMs: 20 * MIN, note: "", startedAt: T0, endedAt: T0 + 20 * MIN };

  it("become a task with the intention as its line", () => {
    const [e] = parseHistory([old]);
    expect(e).toMatchObject({ id: T0, title: "", focusedMs: 20 * MIN, endedAt: T0 + 20 * MIN });
    expect(e.lines).toEqual([{ id: T0, text: "Fix token refresh", doneAt: null, pomodoros: 0, focusedMs: 20 * MIN }]);
  });

  it("with a note, the intention names the task and the note is the line", () => {
    const [e] = parseHistory([{ ...old, note: "check the retry header" }]);
    expect(e.title).toBe("Fix token refresh");
    expect(e.lines.map((l) => l.text)).toEqual(["check the retry header"]);
  });
});

describe("formatting", () => {
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
    expect(() => parseBackup('{"hello":1}')).toThrow(/Hamstimer backup/);
    expect(() => parseBackup('{"app":"nextline","version":9,"data":{}}')).toThrow(/newer version/);
    const b = parseBackup('{"app":"nextline","version":1,"data":{"nextline:a":1,"evil":2}}');
    expect(b.data).toEqual({ "nextline:a": 1 });
  });
});
