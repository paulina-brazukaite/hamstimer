// Connects the pure timer engine to the browser: localStorage, a clock, and
// React subscriptions. Roughly a singleton service with an "on changed" event.
//
// React reads it through `useSyncExternalStore` (see use-timer.ts), which is
// React's built-in way to subscribe to data that lives outside React.

import { KEYS, readJSON, writeJSON } from "./storage";
import { createTimer, parseTimer, tick, type TimerState } from "./timer";

export interface TimerSnapshot {
  state: TimerState;
  now: number;
}

let snapshot: TimerSnapshot | null = null; // null until loaded in the browser
const listeners = new Set<() => void>();
let clock: ReturnType<typeof setInterval> | null = null;

function load(): TimerSnapshot {
  const now = Date.now();
  const saved = parseTimer(readJSON<unknown>(KEYS.timer, null));
  const state = tick(saved ?? createTimer(), now);
  if (state !== saved) writeJSON(KEYS.timer, state);
  return { state, now };
}

function emit() {
  for (const l of listeners) l();
}

/** Re-read the clock, advance the engine, save if the state changed. */
function refresh() {
  if (!snapshot) return;
  const now = Date.now();
  const state = tick(snapshot.state, now);
  if (state !== snapshot.state) writeJSON(KEYS.timer, state);
  snapshot = { state, now };
  emit();
}

function onVisible() {
  if (document.visibilityState === "visible") refresh();
}

/** Another tab changed the timer: pick up its version. */
function onStorage(e: StorageEvent) {
  if (e.key !== KEYS.timer) return;
  snapshot = load();
  emit();
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    snapshot ??= load();
    // 250 ms keeps the seconds flip crisp. Browsers throttle this in background
    // tabs, which is fine: time comes from Date.now(), not from counting ticks.
    clock = setInterval(refresh, 250);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && clock) {
      clearInterval(clock);
      clock = null;
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
  writeJSON(KEYS.timer, state);
  snapshot = { state, now };
  emit();
}
