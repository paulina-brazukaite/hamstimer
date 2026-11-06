// Connects the pure timer engine to the browser: localStorage, a clock, and
// React subscriptions. Roughly a singleton service with an "on changed" event.
//
// React reads it through `useSyncExternalStore` (see use-timer.ts), which is
// React's built-in way to subscribe to data that lives outside React.

import { KEYS, readJSON, writeJSON } from "./storage";
import { createTimer, parseTimer, shouldOfferResume, tick, type TimerState } from "./timer";
import { parseHistory, recordSession } from "./history";

export interface TimerSnapshot {
  state: TimerState;
  now: number;
  /** Show the resume card. Decided once per page load; any action closes it. */
  resume: boolean;
}

let snapshot: TimerSnapshot | null = null; // null until loaded in the browser
const listeners = new Set<() => void>();
let stopClock: (() => void) | null = null;
const focusEndListeners = new Set<(s: TimerState) => void>();

function load(): TimerSnapshot {
  const now = Date.now();
  const saved = parseTimer(readJSON<unknown>(KEYS.timer, null));
  const state = tick(saved ?? createTimer(), now);
  if (state !== saved) saveTimer(state);
  return { state, now, resume: shouldOfferResume(state) };
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
  snapshot = { ...snapshot, state, now };
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
  snapshot = { state, now, resume: false };
  emit();
}
