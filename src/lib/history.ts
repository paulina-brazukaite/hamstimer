// History (finished tasks) and backups. Pure functions, no browser APIs, so they're testable.

import { parseTask, taskFromV1, type Line, type Task } from "./timer";

/** A finished task. */
export interface HistoryEntry {
  /** The task's id (when its first line was added). */
  id: number;
  title: string;
  lines: Line[];
  /** All focus time across the lines. */
  focusedMs: number;
  startedAt: number;
  /** When "Finish task" was pressed. */
  endedAt: number;
}

const MAX_ENTRIES = 1000;

export function entryFromTask(task: Task, now: number): HistoryEntry {
  return {
    id: task.id,
    title: task.title,
    lines: task.lines,
    focusedMs: task.lines.reduce((sum, l) => sum + l.focusedMs, 0),
    startedAt: task.id,
    endedAt: now,
  };
}

/**
 * Add a finished task, newest first. An entry with the same id is replaced (a
 * session saved before tasks existed shares its id with the task it became).
 */
export function recordTask(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, MAX_ENTRIES);
}

export function pomodoroCount(entry: { lines: Line[] }): number {
  return entry.lines.reduce((sum, l) => sum + l.pomodoros, 0);
}

/**
 * Reads stored history and drops junk. Entries from before tasks existed (one
 * session with an intention and a note) are converted to a task with one line.
 */
export function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryEntry[] = [];
  for (const h of raw) {
    if (typeof h !== "object" || h === null) continue;
    const e = h as Record<string, unknown>;
    if (
      typeof e.id !== "number" ||
      typeof e.focusedMs !== "number" ||
      typeof e.startedAt !== "number" ||
      typeof e.endedAt !== "number"
    ) {
      continue;
    }
    const base = { id: e.id, focusedMs: e.focusedMs, startedAt: e.startedAt, endedAt: e.endedAt };
    if (Array.isArray(e.lines) && typeof e.title === "string") {
      const task = parseTask({ id: e.id, title: e.title, lines: e.lines, currentId: null });
      if (task) out.push({ ...base, title: task.title, lines: task.lines });
    } else if (typeof e.intention === "string") {
      const task = taskFromV1(e.id, e.intention, typeof e.note === "string" ? e.note : "", e.focusedMs);
      out.push({ ...base, title: task.title, lines: task.lines });
    }
  }
  return out;
}

/** "38 min", "1 h 15 min". */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
}

// ---- Backups -----------------------------------------------------------------

export const PREFIX = "nextline:";

export interface Backup {
  app: "nextline";
  version: 1;
  exportedAt: string;
  /** Every nextline:* localStorage key, with its value parsed from JSON. */
  data: Record<string, unknown>;
}

/** The bit of the Storage API we use, so tests can pass a plain fake. */
export interface KeyValueStore {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

export function createBackup(store: KeyValueStore, now: Date): Backup {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const raw = store.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw; // not JSON: keep the plain string
    }
  }
  return { app: "nextline", version: 1, exportedAt: now.toISOString(), data };
}

/**
 * Throws an Error with a human-readable message if the file isn't a Nextline backup.
 * The backup format itself hasn't changed: the timer and history inside it are
 * converted when they're read, so backups from before tasks still import.
 */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const b = raw as Partial<Backup> | null;
  if (!b || b.app !== "nextline" || typeof b.data !== "object" || b.data === null || Array.isArray(b.data)) {
    throw new Error("That file isn't a Nextline backup.");
  }
  if (b.version !== 1) throw new Error("This backup is from a newer version of Nextline.");

  // Only ever touch our own keys, whatever else is in the file.
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(b.data)) {
    if (key.startsWith(PREFIX)) data[key] = value;
  }
  return { app: "nextline", version: 1, exportedAt: String(b.exportedAt ?? ""), data };
}
