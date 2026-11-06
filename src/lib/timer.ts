// The timer engine. Pure functions, no React, no browser APIs, so it's easy to test.
//
// The key idea: we never count ticks. We store *timestamps* (when the current
// running stretch started) plus how much time had already elapsed before it.
// "How long has passed" is always computed from `now`, so a throttled background
// tab, a sleeping laptop or a page reload can't make the timer drift.
//
// Every function takes the old state and returns a new one (or the same object
// when nothing changed). Think of it like an immutable record in C#.

export type Phase = "idle" | "focus" | "break" | "complete";

export type PresetId = "50-10" | "25-5" | "90-15" | "custom";

export interface Preset {
  id: PresetId;
  label: string;
  focusMin: number;
  breakMin: number;
}

export const PRESETS: readonly Preset[] = [
  { id: "50-10", label: "50 / 10", focusMin: 50, breakMin: 10 },
  { id: "25-5", label: "25 / 5", focusMin: 25, breakMin: 5 },
  { id: "90-15", label: "90 / 15", focusMin: 90, breakMin: 15 },
];

export const DEFAULT_PRESET: PresetId = "50-10";
export const EXTENSION_MS = 15 * 60_000;
const MINUTE = 60_000;

export interface TimerState {
  version: 1;
  phase: Phase;
  presetId: PresetId;
  /** Focus target for this session, including any +15 extensions. */
  focusMs: number;
  breakMs: number;
  /** When the current running stretch began. null = paused (or not started). */
  startedAt: number | null;
  /** Time spent in the current phase before `startedAt`. */
  elapsedMs: number;
  extensions: number;
  sessionStartedAt: number | null;
  intention: string;
}

export function createTimer(presetId: PresetId = DEFAULT_PRESET, focusMin?: number, breakMin?: number): TimerState {
  const preset = PRESETS.find((p) => p.id === presetId);
  const f = clampMinutes(focusMin ?? preset?.focusMin ?? 50, 1, 240);
  const b = clampMinutes(breakMin ?? preset?.breakMin ?? 10, 1, 60);
  return {
    version: 1,
    phase: "idle",
    presetId,
    focusMs: f * MINUTE,
    breakMs: b * MINUTE,
    startedAt: null,
    elapsedMs: 0,
    extensions: 0,
    sessionStartedAt: null,
    intention: "",
  };
}

function clampMinutes(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// ---- Reading the state -------------------------------------------------------

export function isRunning(s: TimerState): boolean {
  return s.startedAt !== null && (s.phase === "focus" || s.phase === "break");
}

/** Length of the phase we're in right now. */
export function phaseLength(s: TimerState): number {
  return s.phase === "break" ? s.breakMs : s.focusMs;
}

/** Time spent in the current phase, never negative and never past the phase end. */
export function phaseElapsed(s: TimerState, now: number): number {
  // Math.max(0, …) guards against the system clock moving backwards.
  const running = s.startedAt === null ? 0 : Math.max(0, now - s.startedAt);
  return Math.min(phaseLength(s), s.elapsedMs + running);
}

export function remaining(s: TimerState, now: number): number {
  if (s.phase === "idle") return s.focusMs;
  if (s.phase === "complete") return 0;
  return phaseLength(s) - phaseElapsed(s, now);
}

/** 0..1 progress through the current phase, for the progress line. */
export function progress(s: TimerState, now: number): number {
  if (s.phase === "idle") return 0;
  if (s.phase === "complete") return 1;
  return phaseElapsed(s, now) / phaseLength(s);
}

/** "mm:ss", rounding *up* so a fresh 50 min timer shows 50:00, not 49:59. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ---- Changing the state ------------------------------------------------------

/**
 * Moves the timer forward to `now`: focus → break → complete.
 * Transitions are placed at the moment they *should* have happened, not when
 * we noticed, so a tab that slept for 20 minutes lands in the right spot.
 */
export function tick(s: TimerState, now: number): TimerState {
  let next = s;
  // A loop because one long gap can cross more than one boundary.
  while (next.startedAt !== null && (next.phase === "focus" || next.phase === "break")) {
    const length = phaseLength(next);
    const endsAt = next.startedAt + (length - next.elapsedMs);
    if (now < endsAt) break;

    next =
      next.phase === "focus"
        ? { ...next, phase: "break", elapsedMs: 0, startedAt: endsAt }
        : { ...next, phase: "complete", elapsedMs: 0, startedAt: null };
  }
  return next;
}

/** Start a new session, or resume a paused one. */
export function start(s: TimerState, now: number): TimerState {
  if (s.phase === "idle" || s.phase === "complete") {
    const fresh = s.phase === "complete" ? reset(s) : s;
    return { ...fresh, phase: "focus", startedAt: now, elapsedMs: 0, sessionStartedAt: now };
  }
  if (s.startedAt !== null) return s; // already running
  return { ...s, startedAt: now };
}

export function pause(s: TimerState, now: number): TimerState {
  if (!isRunning(s)) return s;
  return { ...s, elapsedMs: phaseElapsed(s, now), startedAt: null };
}

/** What Space does. */
export function toggle(s: TimerState, now: number): TimerState {
  return isRunning(s) ? pause(s, now) : start(s, now);
}

/**
 * +15 minutes of focus. During focus it extends the target. Once the break has
 * arrived it goes back to focus with 15 minutes left (the break is skipped).
 * Repeatable: each press adds another 15.
 */
export function extend(s: TimerState, now: number): TimerState {
  if (s.phase === "focus") {
    return { ...s, focusMs: s.focusMs + EXTENSION_MS, extensions: s.extensions + 1 };
  }
  if (s.phase === "break") {
    return {
      ...s,
      phase: "focus",
      elapsedMs: s.focusMs, // focus was fully done…
      focusMs: s.focusMs + EXTENSION_MS, // …and now has 15 more minutes
      startedAt: now,
      extensions: s.extensions + 1,
    };
  }
  return s;
}

/** Back to idle with the same preset and durations (extensions dropped). */
export function reset(s: TimerState): TimerState {
  const base = createTimer(s.presetId, (s.focusMs - s.extensions * EXTENSION_MS) / MINUTE, s.breakMs / MINUTE);
  return { ...base, intention: s.intention };
}

/** Only allowed while idle or complete; mid-session changes would be confusing. */
export function choosePreset(s: TimerState, presetId: PresetId, focusMin?: number, breakMin?: number): TimerState {
  if (s.phase === "focus" || s.phase === "break") return s;
  return { ...createTimer(presetId, focusMin, breakMin), intention: s.intention };
}

// ---- Persistence -------------------------------------------------------------

/** Accepts whatever came out of localStorage; returns a valid state or null. */
export function parseTimer(raw: unknown): TimerState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Partial<TimerState>;
  const phases: Phase[] = ["idle", "focus", "break", "complete"];
  const ok =
    s.version === 1 &&
    phases.includes(s.phase as Phase) &&
    typeof s.presetId === "string" &&
    typeof s.focusMs === "number" && s.focusMs > 0 &&
    typeof s.breakMs === "number" && s.breakMs > 0 &&
    (s.startedAt === null || typeof s.startedAt === "number") &&
    typeof s.elapsedMs === "number" &&
    typeof s.extensions === "number" &&
    typeof s.intention === "string";
  return ok ? (s as TimerState) : null;
}
