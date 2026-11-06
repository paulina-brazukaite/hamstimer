// Safe localStorage access. Private browsing, full quotas and disabled storage all
// throw, and the app must keep working (just without persistence) when that happens.

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nothing to do
  }
}

// All keys live under one prefix so export/import and "reset" are easy later.
export const KEYS = {
  theme: "nextline:theme",
} as const;
