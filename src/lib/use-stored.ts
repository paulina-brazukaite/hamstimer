import { useMemo, useSyncExternalStore } from "react";
import { CHANGED, KEYS } from "./storage";
import { DEFAULT_SETTINGS, parseSettings, type Settings } from "./settings";

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

/** Sound / notification settings, kept live. Defaults on the server. */
export function useSettings(): Settings {
  const raw = useStoredRaw(KEYS.settings);
  return useMemo(() => {
    try {
      return parseSettings(raw ? JSON.parse(raw) : null);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }, [raw]);
}

const noop = () => () => {};

/** "⌘" on Apple devices, "Ctrl" elsewhere. Server render says "Ctrl", then React corrects it. */
export function useModKey(): string {
  return useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}
