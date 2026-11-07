import { isRunning, type TimerState } from "./timer";

/**
 * What the hamster above the task is doing. It only reads the timer, never
 * changes it, so it can't affect how the app works.
 *
 * During a running focus block it does one activity for the whole block. The
 * activity is picked at random per block (seeded by the task and the block
 * number, so it stays the same across re-renders and reloads) and never
 * repeats the previous block's. Later the three.js hamster can play the same
 * names as animation clips.
 */
export const FOCUS_ACTIVITIES = ["wheel", "laptop"] as const;

export type FocusActivity = (typeof FOCUS_ACTIVITIES)[number];
export type HamsterPose = FocusActivity | "sit" | "eat" | "sleep";

export function hamsterPose(s: TimerState, resuming: boolean): HamsterPose {
  if (resuming) return "sleep";
  if (s.phase === "focus" && isRunning(s)) return focusActivity(s.task.id, blockNumber(s));
  if (s.phase === "break") return "eat";
  return "sit"; // before starting, paused, or a block just ended
}

/** Which focus block of this task this is: one per finished pomodoro so far. */
function blockNumber(s: TimerState): number {
  return s.task.lines.reduce((n, l) => n + l.pomodoros, 0);
}

export function focusActivity(taskId: number, block: number, list: readonly FocusActivity[] = FOCUS_ACTIVITIES): FocusActivity {
  const n = list.length;
  let i = hash(taskId, 0) % n;
  // Each later block steps 1..n-1 places on, so it is never the same as the one before.
  for (let b = 1; b <= block; b++) i = (i + 1 + (hash(taskId, b) % Math.max(1, n - 1))) % n;
  return list[i];
}

// Small integer hash (FNV-1a style); only needs to look random, not be secure.
function hash(a: number, b: number): number {
  let h = 2166136261;
  for (const v of [a, b]) {
    h ^= v & 0xffffffff;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
