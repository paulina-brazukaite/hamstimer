// Connects the pure timer engine to the browser: localStorage, a clock, and
// React subscriptions. Roughly a singleton service with an "on changed" event.
//
// React reads it through `useSyncExternalStore` (see use-timer.ts), which is
// React's built-in way to subscribe to data that lives outside React.

import { KEYS, readJSON, writeJSON } from "./storage";
import { createTimer, parseTimer, shouldOfferResume, startFresh, tick, type TimerState } from "./timer";
import { parseHistory, recordSession } from "./history";

export interface TimerSnapshot {
  state: TimerState;
  now: number;
  /** Show the resume card. Decided once per page load; any action closes it. */
  resume: boolean;
  /** "Start fresh" can be undone until this time (ms), or null when there's nothing to undo. */
  undoUntil: number | null;
}

/** How long "Started fresh · Undo" stays up. */
export const UNDO_MS = 10_000;

let snapshot: TimerSnapshot | null = null; // null until loaded in the browser
/** The session that "Start fresh" cleared, kept in memory so it can be put back. */
let beforeFresh: TimerState | null = null;
const listeners = new Set<() => void>();
let stopClock: (() => void) | null = null;
const focusEndListeners = new Set<(s: TimerState) => void>();

function load(): TimerSnapshot {
  const now = Date.now();
  const saved = parseTimer(readJSON<unknown>(KEYS.timer, null));
  const state = tick(saved ?? createTimer(), now);
  if (state !== saved) saveTimer(state);
  return { state, now, resume: shouldOfferResume(state), undoUntil: null };
}

/** Save the timer, and keep this session's history entry up to date. */
function saveTimer(state: TimerState) {
  writeJSON(KEYS.timer, state);
  const history = parseHistory(readJSON<unknown>(KEYS.history, []));
  const next = recordSession(history, state);
  if (next !== history) writeJSON(KEYS.history, next);
}

function emit() {
  for (const l of listeners) l();
}

/** Re-read the clock, advance the engine, save if the state changed. */
function refresh() {
  if (!snapshot) return;
  const now = Date.now();
  const state = tick(snapshot.state, now);
  if (state !== snapshot.state) saveTimer(state);
  const focusJustEnded =
    snapshot.state.phase === "focus" &&
    state.phase !== "focus" &&
    state.leftAt !== null &&
    now - state.leftAt < 2 * 60_000; // not after the laptop slept for an hour
  const undoUntil = snapshot.undoUntil !== null && now < snapshot.undoUntil ? snapshot.undoUntil : null;
  if (undoUntil === null) beforeFresh = null;
  snapshot = { ...snapshot, state, now, undoUntil };
  emit();
  if (focusJustEnded) focusEndListeners.forEach((l) => l(state));
}

/** Called once when focus runs out while the app is open (for the chime and notification). */
export function onFocusEnd(listener: (s: TimerState) => void): () => void {
  focusEndListeners.add(listener);
  return () => focusEndListeners.delete(listener);
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
  beforeFresh = null; // the other tab's version wins; don't offer to undo over it
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
  const state = action(tick(snapshot.state, now), now);
  saveTimer(state);
  if (state.phase === "focus") markOnboarded();
  beforeFresh = null; // any other action ends the chance to undo
  snapshot = { state, now, resume: false, undoUntil: null };
  emit();
}

/**
 * "Start fresh" (Esc on the resume card, or the menu). Clears the intention and
 * note, but keeps the old session for UNDO_MS so one stray Esc can be taken back.
 * (A session with a note is also in History; see recordSession.)
 */
export function startFreshUndoable() {
  snapshot ??= load();
  const before = tick(snapshot.state, Date.now());
  update(startFresh);
  if (!before.intention && !before.note) return; // nothing worth bringing back
  beforeFresh = before;
  snapshot = { ...snapshot!, undoUntil: snapshot!.now + UNDO_MS };
  emit();
}

/** Put back the session "Start fresh" cleared, on its resume card. */
export function undoStartFresh() {
  if (!snapshot || !beforeFresh || snapshot.undoUntil === null) return;
  const now = Date.now();
  const state = tick(beforeFresh, now);
  beforeFresh = null;
  saveTimer(state);
  snapshot = { state, now, resume: shouldOfferResume(state), undoUntil: null };
  emit();
}

/** First session started: from now on "/" skips the first-visit intro. */
function markOnboarded() {
  if (document.documentElement.dataset.returning) return;
  document.documentElement.dataset.returning = "1";
  writeJSON(KEYS.onboarded, true);
}
