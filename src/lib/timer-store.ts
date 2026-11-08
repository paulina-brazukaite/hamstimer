// Connects the pure timer engine to the browser: localStorage, a clock, and
// React subscriptions. Roughly a singleton service with an "on changed" event.
//
// React reads it through `useSyncExternalStore` (see use-timer.ts), which is
// React's built-in way to subscribe to data that lives outside React.

import { KEYS, readJSON, writeJSON } from "./storage";
import { createTimer, finishTask, parseTimer, shouldOfferResume, tick, type TimerState } from "./timer";
import { entryFromTask, parseHistory, recordTask, type HistoryEntry } from "./history";

export interface TimerSnapshot {
  state: TimerState;
  now: number;
  /** Show the resume card. Decided once per page load; any action closes it. */
  resume: boolean;
  /** "Finish task" can be undone until this time (ms), or null when there's nothing to undo. */
  undoUntil: number | null;
}

/** How long "Task finished · Undo" stays up. */
export const UNDO_MS = 10_000;

let snapshot: TimerSnapshot | null = null; // null until loaded in the browser
/** What "Finish task" replaced, kept in memory so it can be put back. */
let beforeFinish: { state: TimerState; history: HistoryEntry[] } | null = null;
const listeners = new Set<() => void>();
let stopClock: (() => void) | null = null;
const focusEndListeners = new Set<(s: TimerState) => void>();
const breakEndListeners = new Set<(s: TimerState) => void>();

/** Only alert for a boundary crossed just now, not one passed while the laptop slept for an hour. */
const ALERT_WINDOW_MS = 2 * 60_000;

function load(): TimerSnapshot {
  const now = Date.now();
  const raw = readJSON<unknown>(KEYS.timer, null);
  const saved = parseTimer(raw);
  const state = tick(saved ?? createTimer(), now);
  // Also writes once after a save from an older version was converted.
  if (state !== saved || (saved && (raw as { version?: unknown }).version !== saved.version)) saveTimer(state);
  return { state, now, resume: shouldOfferResume(state), undoUntil: null };
}

function saveTimer(state: TimerState) {
  writeJSON(KEYS.timer, state);
}

function readHistory(): HistoryEntry[] {
  return parseHistory(readJSON<unknown>(KEYS.history, []));
}

function emit() {
  for (const l of listeners) l();
}

/** Re-read the clock, advance the engine, save if the state changed. */
function refresh() {
  if (!snapshot) return;
  const now = Date.now();
  const prev = snapshot.state;
  const state = tick(prev, now);
  if (state !== prev) saveTimer(state);
  const focusJustEnded =
    prev.phase === "focus" && state.phase !== "focus" && state.leftAt !== null && now - state.leftAt < ALERT_WINDOW_MS;
  // tick() only ends a running break by running out, so this is the break finishing on its own
  // (to "complete", or to "idle" when no lines are left).
  const breakEndedAt = prev.phase === "break" && prev.startedAt !== null ? prev.startedAt + prev.breakMs - prev.elapsedMs : null;
  const breakJustEnded =
    breakEndedAt !== null && state.phase !== "break" && now - breakEndedAt < ALERT_WINDOW_MS;
  const undoUntil = snapshot.undoUntil !== null && now < snapshot.undoUntil ? snapshot.undoUntil : null;
  if (undoUntil === null) beforeFinish = null;
  snapshot = { ...snapshot, state, now, undoUntil };
  emit();
  if (focusJustEnded) focusEndListeners.forEach((l) => l(state));
  if (breakJustEnded) breakEndListeners.forEach((l) => l(state));
}

/** Called once when focus runs out while the app is open (for the chime and notification). */
export function onFocusEnd(listener: (s: TimerState) => void): () => void {
  focusEndListeners.add(listener);
  return () => focusEndListeners.delete(listener);
}

/** Called once when a break runs out while the app is open (for the "break's over" notification). */
export function onBreakEnd(listener: (s: TimerState) => void): () => void {
  breakEndListeners.add(listener);
  return () => breakEndListeners.delete(listener);
}

/**
 * Calls `fn` every 250 ms. Uses a tiny Web Worker when possible: timers inside a
 * worker aren't slowed down in background tabs the way page timers are (Chrome
 * can delay those by up to a minute), so the chime plays on time.
 */
function startClock(fn: () => void): () => void {
  try {
    const code = "setInterval(() => postMessage(0), 250)";
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = fn;
    return () => worker.terminate();
  } catch {
    const id = setInterval(fn, 250);
    return () => clearInterval(id);
  }
}

function onVisible() {
  if (document.visibilityState === "visible") refresh();
}

/** Another tab changed the timer: pick up its version. */
function onStorage(e: StorageEvent) {
  if (e.key !== KEYS.timer) return;
  beforeFinish = null; // the other tab's version wins; don't offer to undo over it
  snapshot = { ...load(), resume: snapshot?.resume ?? false };
  emit();
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    snapshot ??= load();
    // 250 ms keeps the seconds flip crisp. Time itself always comes from
    // Date.now(), never from counting ticks.
    stopClock = startClock(refresh);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stopClock) {
      stopClock();
      stopClock = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getSnapshot(): TimerSnapshot | null {
  return snapshot;
}

/** On the server there's no localStorage, so there's nothing to show yet. */
export function getServerSnapshot(): TimerSnapshot | null {
  return null;
}

/**
 * Apply an engine function, e.g. `update(toggle)` or `update(s => choosePreset(s, "25-5"))`.
 * Always ticks first so actions see an up-to-date state.
 */
export function update(action: (s: TimerState, now: number) => TimerState) {
  snapshot ??= load();
  const now = Date.now();
  const before = tick(snapshot.state, now);
  const state = action(before, now);
  if (state === before && !snapshot.resume && snapshot.undoUntil === null) return; // nothing to do
  saveTimer(state);
  if (state.task.lines.length > 0) markOnboarded();
  beforeFinish = null; // any other action ends the chance to undo
  snapshot = { state, now, resume: false, undoUntil: null };
  emit();
}

/**
 * "Finish task" (button, menu, or Esc on the resume card). Moves the task into
 * History and clears the screen, but keeps what was there for UNDO_MS so one
 * stray Esc can be taken back.
 */
export function finishTaskUndoable() {
  snapshot ??= load();
  const now = Date.now();
  const before = tick(snapshot.state, now);
  const history = readHistory();
  const { state, finished } = finishTask(before, now);
  if (finished) writeJSON(KEYS.history, recordTask(history, entryFromTask(finished, now)));
  saveTimer(state);
  beforeFinish = finished ? { state: before, history } : null;
  snapshot = { state, now, resume: false, undoUntil: finished ? now + UNDO_MS : null };
  emit();
}

/** Put back the task "Finish task" cleared, and take it out of History again. */
export function undoFinishTask() {
  if (!snapshot || !beforeFinish || snapshot.undoUntil === null) return;
  const now = Date.now();
  const state = tick(beforeFinish.state, now);
  writeJSON(KEYS.history, beforeFinish.history);
  beforeFinish = null;
  saveTimer(state);
  snapshot = { state, now, resume: false, undoUntil: null };
  emit();
}

/** First line added: from now on "/" skips the first-visit intro. */
function markOnboarded() {
  if (document.documentElement.dataset.returning) return;
  document.documentElement.dataset.returning = "1";
  writeJSON(KEYS.onboarded, true);
}
