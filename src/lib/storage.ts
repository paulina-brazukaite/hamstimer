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
    // The browser only fires "storage" in *other* tabs; this tells this tab too.
    window.dispatchEvent(new Event(CHANGED));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // nothing to do
  }
}

/** Fired on window whenever this tab writes a nextline:* key. */
export const CHANGED = "nextline:changed";

// All keys live under one prefix so export/import and "reset" are easy later.
export const KEYS = {
  theme: "nextline:theme",
  timer: "nextline:timer",
  history: "nextline:history",
  settings: "nextline:settings",
  /** Set once the first session starts; hides the first-visit intro on /. */
  onboarded: "nextline:onboarded",
  /** Biggest haul in the Cheek Stuffer game. */
  cheekBest: "nextline:cheekBest",
  /** Highest laziness score in the Not Today game. */
  notTodayBest: "nextline:notTodayBest",
} as const;
