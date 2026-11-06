import { useSyncExternalStore } from "react";
import { CHANGED } from "./storage";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(CHANGED, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/**
 * The raw string stored under `key`, kept live as it changes. Returns undefined
 * on the server (no localStorage there) and null when the key isn't set.
 * Strings compare by value, so React only re-renders when the text changes.
 */
export function useStoredRaw(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => undefined,
  );
}
