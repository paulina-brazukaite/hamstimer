// Session history and backups. Pure functions, no browser APIs, so they're testable.

import type { TimerState } from "./timer";

export interface HistoryEntry {
  /** The session's start timestamp doubles as its id. */
  id: number;
  intention: string;
  focusedMs: number;
  note: string;
  startedAt: number;
  /** When you last stepped away (paused, stopped, focus ended). */
  endedAt: number;
}

const MIN_RECORDED_MS = 60_000; // ignore sessions started by accident
const MAX_ENTRIES = 1000;

/**
 * Insert or update the entry for the timer's current session. Called whenever
 * the timer is saved; returns the same array when there's nothing to change,
 * so the caller can skip writing.
 */
export function recordSession(history: HistoryEntry[], s: TimerState): HistoryEntry[] {
  if (s.sessionStartedAt === null || s.leftAt === null || s.focusedMs < MIN_RECORDED_MS) return history;

  const entry: HistoryEntry = {
    id: s.sessionStartedAt,
    intention: s.intention,
    focusedMs: s.focusedMs,
    note: s.note,
    startedAt: s.sessionStartedAt,
    endedAt: s.leftAt,
  };

  const i = history.findIndex((h) => h.id === entry.id);
  if (i === -1) return [entry, ...history].slice(0, MAX_ENTRIES); // newest first
  if (sameEntry(history[i], entry)) return history;
  const next = history.slice();
  next[i] = entry;
  return next;
}

function sameEntry(a: HistoryEntry, b: HistoryEntry): boolean {
  return (
    a.intention === b.intention && a.focusedMs === b.focusedMs && a.note === b.note && a.endedAt === b.endedAt
  );
}

export function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (h): h is HistoryEntry =>
      typeof h === "object" &&
      h !== null &&
      typeof h.id === "number" &&
      typeof h.intention === "string" &&
      typeof h.focusedMs === "number" &&
      typeof h.note === "string" &&
      typeof h.startedAt === "number" &&
      typeof h.endedAt === "number",
  );
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

/** Throws an Error with a human-readable message if the file isn't a Nextline backup. */
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
