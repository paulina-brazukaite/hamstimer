import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, type TimerSnapshot } from "./timer-store";

/**
 * The current timer state plus the `now` it was computed at, re-rendering
 * roughly 4× a second. Returns null during server rendering and the very first
 * client render (before localStorage has been read).
 */
export function useTimer(): TimerSnapshot | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
