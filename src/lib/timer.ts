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
  /** One line: what this session is for. */
  intention: string;
  /** The latest "Where was I?" note, i.e. the next step. */
  note: string;
  /** Why the "Where was I?" board is open, or null when it's closed. */
  notePrompt: NotePrompt | null;
  /** Focus time done this session, as of `leftAt`. Used by the resume card. */
  focusedMs: number;
  /** When you last stepped away: paused, stopped, or focus ran out. */
  leftAt: number | null;
}

export type NotePrompt = "pause" | "stop" | "end" | "note";

export const MAX_INTENTION = 120;
export const MAX_NOTE = 200;

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
    note: "",
    notePrompt: null,
    focusedMs: 0,
    leftAt: null,
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

    // Focus ending is the "session end" moment: ask where you were while it's fresh.
    next =
      next.phase === "focus"
        ? {
            ...next,
            phase: "break",
            elapsedMs: 0,
            startedAt: endsAt,
            notePrompt: "end",
            focusedMs: next.focusMs,
            leftAt: endsAt,
          }
        : { ...next, phase: "complete", elapsedMs: 0, startedAt: null };
  }
  return next;
}

/** Start a new session, or resume a paused one. */
export function start(s: TimerState, now: number): TimerState {
  if (s.phase === "idle" || s.phase === "complete") {
    const fresh = s.phase === "complete" ? reset(s) : s;
    return { ...fresh, phase: "focus", startedAt: now, elapsedMs: 0, sessionStartedAt: now, notePrompt: null };
  }
  if (s.startedAt !== null) return s; // already running
  return { ...s, startedAt: now, notePrompt: null };
}

/** Pausing opens the "Where was I?" board. */
export function pause(s: TimerState, now: number): TimerState {
  if (!isRunning(s)) return s;
  return {
    ...s,
    elapsedMs: phaseElapsed(s, now),
    startedAt: null,
    notePrompt: "pause",
    focusedMs: focusedSoFar(s, now),
    leftAt: now,
  };
}

/** End the session early. Keeps intention and note, and asks "Where was I?". */
export function stop(s: TimerState, now: number): TimerState {
  if (s.phase !== "focus" && s.phase !== "break") return s;
  return {
    ...s,
    phase: "complete",
    startedAt: null,
    elapsedMs: 0,
    notePrompt: "stop",
    focusedMs: focusedSoFar(s, now),
    leftAt: now,
  };
}

/** Focus done this session. Once on break, the whole focus block counts. */
function focusedSoFar(s: TimerState, now: number): number {
  return s.phase === "focus" ? phaseElapsed(s, now) : s.focusMs;
}

// ---- The resume card ---------------------------------------------------------

/**
 * Should a fresh page load open on the resume card? Yes when there's a session
 * with an intention that you stepped away from. A session still running (you
 * just reloaded) carries on without a card.
 */
export function shouldOfferResume(s: TimerState): boolean {
  if (!s.intention || s.leftAt === null) return false;
  if (s.phase === "idle") return false;
  return !isRunning(s);
}

/** R: continue a paused focus block, otherwise a new session with the same intention and note. */
export function resumeSession(s: TimerState, now: number): TimerState {
  if (s.phase === "focus") return start(s, now);
  return start(reset(s), now);
}

/** Esc: clean slate, keeping only the chosen preset. */
export function startFresh(s: TimerState): TimerState {
  return reset({ ...s, intention: "", note: "" });
}

/** "just now", "14m", "2h 14m", "3d". */
export function formatAgo(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h}h ${min % 60}m ago` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function setIntention(s: TimerState, text: string): TimerState {
  return { ...s, intention: oneLine(text, MAX_INTENTION) };
}

/** Enter on the board. An empty note keeps the previous one. */
export function saveNote(s: TimerState, text: string): TimerState {
  const note = oneLine(text, MAX_NOTE);
  return { ...s, note: note || s.note, notePrompt: null };
}

/** N: open the board on demand, any time after the session started. The timer keeps going. */
export function openNote(s: TimerState): TimerState {
  if (s.phase === "idle" || s.notePrompt !== null) return s;
  return { ...s, notePrompt: "note" };
}

/** Esc on the board. */
export function dismissNote(s: TimerState): TimerState {
  return s.notePrompt === null ? s : { ...s, notePrompt: null };
}

function oneLine(text: string, max: number): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
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
      notePrompt: null, // kept going, so no need to write down where you were
    };
  }
  return s;
}

/** Back to idle with the same preset and durations (extensions dropped). */
export function reset(s: TimerState): TimerState {
  const base = createTimer(s.presetId, (s.focusMs - s.extensions * EXTENSION_MS) / MINUTE, s.breakMs / MINUTE);
  return { ...base, intention: s.intention, note: s.note };
}

/** Only allowed while idle or complete; mid-session changes would be confusing. */
export function choosePreset(s: TimerState, presetId: PresetId, focusMin?: number, breakMin?: number): TimerState {
  if (s.phase === "focus" || s.phase === "break") return s;
  return { ...createTimer(presetId, focusMin, breakMin), intention: s.intention, note: s.note };
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
  if (!ok) return null;
  // Fields added after the first release get defaults, so old saves still load.
  const prompts: NotePrompt[] = ["pause", "stop", "end", "note"];
  return {
    ...(s as TimerState),
    note: typeof s.note === "string" ? s.note : "",
    notePrompt: prompts.includes(s.notePrompt as NotePrompt) ? (s.notePrompt as NotePrompt) : null,
    focusedMs: typeof s.focusedMs === "number" ? s.focusedMs : 0,
    leftAt: typeof s.leftAt === "number" ? s.leftAt : null,
  };
}
