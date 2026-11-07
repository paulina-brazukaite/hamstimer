// The timer engine. Pure functions, no React, no browser APIs, so it's easy to test.
//
// The key idea: we never count ticks. We store *timestamps* (when the current
// running stretch started) plus how much time had already elapsed before it.
// "How long has passed" is always computed from `now`, so a throttled background
// tab, a sleeping laptop or a page reload can't make the timer drift.
//
// Every function takes the old state and returns a new one (or the same object
// when nothing changed). Think of it like an immutable record in C#.
//
// Alongside the clock sits the task: a list of one-line "lines" (what you're
// working on, step by step). There is one timer, and it always counts towards
// the *current* line. Each line keeps its own pomodoro count and focus time.

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

/** One thing you typed in: a step of the task. */
export interface Line {
  /** Creation timestamp, made unique within the task. */
  id: number;
  text: string;
  doneAt: number | null;
  /** Focus blocks that ran to the end while this was the current line. */
  pomodoros: number;
  /** All focus time spent while this was the current line. */
  focusedMs: number;
}

export interface Task {
  /** When the first line was added (0 while the task is still empty). */
  id: number;
  /** Optional name for the whole task. */
  title: string;
  lines: Line[];
  /** The line the timer counts towards, or null. Always an undone line. */
  currentId: number | null;
}

export interface TimerState {
  version: 2;
  phase: Phase;
  presetId: PresetId;
  /** Focus target for this block, including any +15 extensions. */
  focusMs: number;
  breakMs: number;
  /** When the current running stretch began. null = paused (or not started). */
  startedAt: number | null;
  /** Time spent in the current phase before `startedAt`. */
  elapsedMs: number;
  extensions: number;
  /** How much of this focus block's elapsed time is already added to a line. */
  creditedMs: number;
  task: Task;
  /** Focus just ended: ask "Done with this line?". */
  askDone: boolean;
  /** When you last stepped away: paused, stopped, or focus ran out. */
  leftAt: number | null;
}

export const MAX_LINE = 120;
export const MAX_TITLE = 120;

export function emptyTask(): Task {
  return { id: 0, title: "", lines: [], currentId: null };
}

export function createTimer(presetId: PresetId = DEFAULT_PRESET, focusMin?: number, breakMin?: number): TimerState {
  const preset = PRESETS.find((p) => p.id === presetId);
  const f = clampMinutes(focusMin ?? preset?.focusMin ?? 50, 1, 240);
  const b = clampMinutes(breakMin ?? preset?.breakMin ?? 10, 1, 60);
  return {
    version: 2,
    phase: "idle",
    presetId,
    focusMs: f * MINUTE,
    breakMs: b * MINUTE,
    startedAt: null,
    elapsedMs: 0,
    extensions: 0,
    creditedMs: 0,
    task: emptyTask(),
    askDone: false,
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

export function isActive(s: TimerState): boolean {
  return s.phase === "focus" || s.phase === "break";
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

export function currentLine(s: TimerState): Line | null {
  return s.task.lines.find((l) => l.id === s.task.currentId) ?? null;
}

/** A line's focus time including the part of the running block not yet added to it. */
export function lineFocusedMs(s: TimerState, line: Line, now: number): number {
  if (line.id !== s.task.currentId || s.phase !== "focus") return line.focusedMs;
  return line.focusedMs + Math.max(0, phaseElapsed(s, now) - s.creditedMs);
}

/** "mm:ss", rounding *up* so a fresh 50 min timer shows 50:00, not 49:59. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ---- Changing the clock ------------------------------------------------------

/**
 * Adds focus time not yet counted to the current line. Called before anything
 * that changes which line is current, or that ends or pauses a focus block.
 * With no current line the time waits, and goes to the next line that becomes current.
 */
function credit(s: TimerState, now: number): TimerState {
  if (s.phase !== "focus" || s.task.currentId === null) return s;
  const elapsed = phaseElapsed(s, now);
  const delta = elapsed - s.creditedMs;
  if (delta <= 0) return s;
  return {
    ...mapLine(s, s.task.currentId, (l) => ({ ...l, focusedMs: l.focusedMs + delta })),
    creditedMs: elapsed,
  };
}

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

    if (next.phase === "focus") {
      // A full pomodoro: it belongs to whichever line is current right now.
      next = credit(next, endsAt);
      const id = next.task.currentId;
      if (id !== null) next = mapLine(next, id, (l) => ({ ...l, pomodoros: l.pomodoros + 1 }));
      next = {
        ...next,
        phase: "break",
        elapsedMs: 0,
        startedAt: endsAt,
        creditedMs: 0,
        askDone: id !== null,
        leftAt: endsAt,
      };
    } else {
      next = { ...next, phase: "complete", elapsedMs: 0, startedAt: null };
    }
  }
  return next;
}

/** Can a focus block start? Only when there's something to work on. */
export function canStart(s: TimerState): boolean {
  return s.task.lines.some((l) => l.doneAt === null);
}

/** Start a new focus block, or resume a paused one. */
export function start(s: TimerState, now: number): TimerState {
  if (s.phase === "idle" || s.phase === "complete") {
    if (!canStart(s)) return s;
    const fresh = withCurrent(s.phase === "complete" ? reset(s) : s);
    return { ...fresh, phase: "focus", startedAt: now, elapsedMs: 0, creditedMs: 0, askDone: false };
  }
  if (s.startedAt !== null) return s; // already running
  return { ...s, startedAt: now };
}

export function pause(s: TimerState, now: number): TimerState {
  if (!isRunning(s)) return s;
  const c = credit(s, now);
  return { ...c, elapsedMs: phaseElapsed(s, now), startedAt: null, leftAt: now };
}

/** End the block early. The lines stay; the next Space starts a new block. */
export function stop(s: TimerState, now: number): TimerState {
  if (!isActive(s)) return s;
  const c = credit(s, now);
  return { ...c, phase: "complete", startedAt: null, elapsedMs: 0, creditedMs: 0, leftAt: now };
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
      elapsedMs: s.focusMs, // focus was fully done (and already counted)…
      creditedMs: s.focusMs,
      focusMs: s.focusMs + EXTENSION_MS, // …and now has 15 more minutes
      startedAt: now,
      extensions: s.extensions + 1,
      askDone: false, // kept going, so the answer is "still on it"
    };
  }
  return s;
}

/** Back to idle with the same preset and durations (extensions dropped). Keeps the task. */
export function reset(s: TimerState): TimerState {
  const base = createTimer(s.presetId, (s.focusMs - s.extensions * EXTENSION_MS) / MINUTE, s.breakMs / MINUTE);
  return { ...base, task: s.task, askDone: s.askDone, leftAt: s.leftAt };
}

/** Only allowed while idle or complete; mid-block changes would be confusing. */
export function choosePreset(s: TimerState, presetId: PresetId, focusMin?: number, breakMin?: number): TimerState {
  if (isActive(s)) return s;
  return { ...createTimer(presetId, focusMin, breakMin), task: s.task, askDone: s.askDone, leftAt: s.leftAt };
}

// ---- Lines -------------------------------------------------------------------

function mapLine(s: TimerState, id: number, fn: (l: Line) => Line): TimerState {
  return { ...s, task: { ...s.task, lines: s.task.lines.map((l) => (l.id === id ? fn(l) : l)) } };
}

/** The first undone line from the top, or null. */
function firstUndone(lines: Line[]): number | null {
  return lines.find((l) => l.doneAt === null)?.id ?? null;
}

/** Make sure there's a current line if anything is left to do. */
function withCurrent(s: TimerState): TimerState {
  const cur = currentLine(s);
  if (cur && cur.doneAt === null) return s;
  const id = firstUndone(s.task.lines);
  return id === s.task.currentId ? s : { ...s, task: { ...s.task, currentId: id } };
}

function oneLine(text: string, max: number): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Enter in the input: add what you're working on now. It becomes the current line. */
export function addLine(s: TimerState, text: string, now: number): TimerState {
  const clean = oneLine(text, MAX_LINE);
  if (!clean) return s;
  const c = credit(s, now);
  const lastId = c.task.lines.reduce((m, l) => Math.max(m, l.id), 0);
  const id = Math.max(now, lastId + 1);
  const line: Line = { id, text: clean, doneAt: null, pomodoros: 0, focusedMs: 0 };
  return {
    ...c,
    task: { ...c.task, id: c.task.id || now, lines: [...c.task.lines, line], currentId: id },
    askDone: false,
  };
}

/** Tick or untick a line. Ticking the current line moves on to the first undone one. */
export function toggleDone(s: TimerState, id: number, now: number): TimerState {
  const line = s.task.lines.find((l) => l.id === id);
  if (!line) return s;
  const c = credit(s, now);
  if (line.doneAt === null) {
    const done = mapLine(c, id, (l) => ({ ...l, doneAt: now }));
    const moved = id === c.task.currentId ? { ...done, task: { ...done.task, currentId: null } } : done;
    return { ...withCurrent(moved), askDone: false };
  }
  return withCurrent(mapLine(c, id, (l) => ({ ...l, doneAt: null })));
}

/** D, or "Done" when focus ends. */
export function markCurrentDone(s: TimerState, now: number): TimerState {
  const id = s.task.currentId;
  return id === null ? keepGoing(s) : toggleDone(s, id, now);
}

/** "Still on it". */
export function keepGoing(s: TimerState): TimerState {
  return s.askDone ? { ...s, askDone: false } : s;
}

/** Click an undone line to work on it instead. The timer keeps running. */
export function setCurrent(s: TimerState, id: number, now: number): TimerState {
  const line = s.task.lines.find((l) => l.id === id);
  if (!line || line.doneAt !== null || id === s.task.currentId) return s;
  const c = credit(s, now);
  return { ...c, task: { ...c.task, currentId: id }, askDone: false };
}

export function removeLine(s: TimerState, id: number, now: number): TimerState {
  if (!s.task.lines.some((l) => l.id === id)) return s;
  const c = credit(s, now);
  const lines = c.task.lines.filter((l) => l.id !== id);
  const wasCurrent = c.task.currentId === id;
  const next = { ...c, task: { ...c.task, lines, currentId: wasCurrent ? null : c.task.currentId } };
  return withCurrent(wasCurrent ? { ...next, askDone: false } : next);
}

export function setTitle(s: TimerState, text: string): TimerState {
  const title = oneLine(text, MAX_TITLE);
  return title === s.task.title ? s : { ...s, task: { ...s.task, title } };
}

/** Total focus on the task so far, including the running block. */
export function taskFocusedMs(s: TimerState, now: number): number {
  return s.task.lines.reduce((sum, l) => sum + lineFocusedMs(s, l, now), 0);
}

/**
 * "Finish task": count the running block, then clear the task and the clock.
 * Returns the finished task (every line's time up to date), or null if it was empty.
 */
export function finishTask(s: TimerState, now: number): { state: TimerState; finished: Task | null } {
  const c = credit(s, now);
  const finished = c.task.lines.length > 0 ? c.task : null;
  const base = createTimer(s.presetId, (s.focusMs - s.extensions * EXTENSION_MS) / MINUTE, s.breakMs / MINUTE);
  return { state: base, finished };
}

// ---- The resume card ---------------------------------------------------------

/**
 * Should a fresh page load open on the resume card? Yes when there's a line to
 * get back to and you stepped away. A block still running (you just reloaded)
 * carries on without a card.
 */
export function shouldOfferResume(s: TimerState): boolean {
  if (s.leftAt === null || s.phase === "idle") return false;
  if (!canStart(s)) return false;
  return !isRunning(s);
}

/** R: continue a paused focus block, otherwise a new one on the same line. */
export function resumeSession(s: TimerState, now: number): TimerState {
  if (s.phase === "focus") return start(s, now);
  return start(reset({ ...s, askDone: false }), now);
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

// ---- Persistence -------------------------------------------------------------

type Clock = Pick<
  TimerState,
  "phase" | "presetId" | "focusMs" | "breakMs" | "startedAt" | "elapsedMs" | "extensions" | "leftAt"
>;

/**
 * Accepts whatever came out of localStorage; returns a valid state or null.
 * Saves from before tasks existed (version 1) are converted on the way in.
 */
export function parseTimer(raw: unknown): TimerState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const phases: Phase[] = ["idle", "focus", "break", "complete"];
  const clockOk =
    phases.includes(s.phase as Phase) &&
    typeof s.presetId === "string" &&
    typeof s.focusMs === "number" && s.focusMs > 0 &&
    typeof s.breakMs === "number" && s.breakMs > 0 &&
    (s.startedAt === null || typeof s.startedAt === "number") &&
    typeof s.elapsedMs === "number" &&
    typeof s.extensions === "number";
  if (!clockOk) return null;

  const clock: Clock = {
    phase: s.phase as Phase,
    presetId: s.presetId as PresetId,
    focusMs: s.focusMs as number,
    breakMs: s.breakMs as number,
    startedAt: s.startedAt as number | null,
    elapsedMs: s.elapsedMs as number,
    extensions: s.extensions as number,
    leftAt: typeof s.leftAt === "number" ? s.leftAt : null,
  };

  if (s.version === 2) {
    const task = parseTask(s.task);
    if (!task) return null;
    return {
      version: 2,
      ...clock,
      creditedMs: typeof s.creditedMs === "number" ? s.creditedMs : 0,
      task,
      askDone: s.askDone === true,
    };
  }

  if (s.version === 1 && typeof s.intention === "string") return fromV1(s, clock);
  return null;
}

export function parseTask(raw: unknown): Task | null {
  if (typeof raw !== "object" || raw === null) return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "number" || typeof t.title !== "string" || !Array.isArray(t.lines)) return null;
  const lines = t.lines.filter(isLine);
  const currentId =
    typeof t.currentId === "number" && lines.some((l) => l.id === t.currentId && l.doneAt === null)
      ? t.currentId
      : null;
  return { id: t.id, title: t.title, lines, currentId };
}

function isLine(l: unknown): l is Line {
  if (typeof l !== "object" || l === null) return false;
  const x = l as Record<string, unknown>;
  return (
    typeof x.id === "number" &&
    typeof x.text === "string" &&
    (x.doneAt === null || typeof x.doneAt === "number") &&
    typeof x.pomodoros === "number" &&
    typeof x.focusedMs === "number"
  );
}

/**
 * Turns a version 1 intention + note into a task. With a note, the intention
 * names the task and the note (the next step) is its line. Without one, the
 * intention is the line.
 */
export function taskFromV1(id: number, intention: string, note: string, focusedMs: number): Task {
  const text = note || intention;
  if (!text) return emptyTask();
  const line: Line = { id, text, doneAt: null, pomodoros: 0, focusedMs };
  return { id, title: note ? intention : "", lines: [line], currentId: id };
}

function fromV1(s: Record<string, unknown>, clock: Clock): TimerState {
  const id = typeof s.sessionStartedAt === "number" ? s.sessionStartedAt : 1;
  const note = typeof s.note === "string" ? s.note : "";
  const focusedMs = typeof s.focusedMs === "number" ? s.focusedMs : 0;
  // Version 1 counted focus time on pause, stop and end, so a focus block's
  // elapsed time so far is already in focusedMs.
  const creditedMs = clock.phase === "focus" ? clock.elapsedMs : 0;
  return {
    version: 2,
    ...clock,
    creditedMs,
    task: taskFromV1(id, s.intention as string, note, focusedMs),
    askDone: false,
  };
}
