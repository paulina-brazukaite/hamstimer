import { describe, expect, it } from "vitest";
import {
  EXTENSION_MS,
  addLine,
  canStart,
  createTimer,
  currentLine,
  extend,
  finishTask,
  formatAgo,
  formatClock,
  keepGoing,
  lineFocusedMs,
  markCurrentDone,
  parseTimer,
  pause,
  remaining,
  removeLine,
  resumeSession,
  setCurrent,
  setTitle,
  shouldOfferResume,
  start,
  stop,
  taskFocusedMs,
  tick,
  toggle,
  toggleDone,
  type TimerState,
} from "./timer";

const MIN = 60_000;
const T0 = 1_700_000_000_000; // any fixed timestamp

/** A timer with one line typed in, ready to start. */
function withLine(preset: Parameters<typeof createTimer>[0] = "50-10", text = "Write the refresh handler"): TimerState {
  return addLine(createTimer(preset), text, T0 - MIN);
}

describe("start, pause and resume", () => {
  it("counts down from the preset", () => {
    const s = start(withLine("50-10"), T0);
    expect(remaining(s, T0)).toBe(50 * MIN);
    expect(remaining(s, T0 + 10 * MIN)).toBe(40 * MIN);
  });

  it("does not count time while paused", () => {
    let s = start(withLine("50-10"), T0);
    s = pause(s, T0 + 10 * MIN); // 10 min focused
    expect(remaining(s, T0 + 30 * MIN)).toBe(40 * MIN); // 20 min paused: unchanged
    s = start(s, T0 + 30 * MIN); // resume
    expect(remaining(s, T0 + 35 * MIN)).toBe(35 * MIN); // 15 min focused total
  });

  it("survives many pause/resume cycles without drift", () => {
    let s = start(withLine("25-5"), T0);
    let t = T0;
    for (let i = 0; i < 10; i++) {
      t += 1 * MIN + 333; // run
      s = pause(s, t);
      t += 7 * MIN; // pause
      s = start(s, t);
    }
    expect(remaining(s, t)).toBe(25 * MIN - 10 * (MIN + 333));
  });

  it("toggle starts, pauses and resumes", () => {
    let s = toggle(withLine(), T0);
    expect(s.phase).toBe("focus");
    s = toggle(s, T0 + MIN);
    expect(s.startedAt).toBeNull();
    s = toggle(s, T0 + 2 * MIN);
    expect(s.startedAt).toBe(T0 + 2 * MIN);
  });

  it("won't start with nothing to work on", () => {
    expect(canStart(createTimer())).toBe(false);
    expect(start(createTimer(), T0).phase).toBe("idle");
    const allDone = markCurrentDone(withLine(), T0);
    expect(start(allDone, T0).phase).toBe("idle");
  });
});

describe("+15 min extension", () => {
  it("extends focus while focusing, and is repeatable", () => {
    let s = start(withLine("50-10"), T0);
    s = extend(s, T0 + 5 * MIN);
    s = extend(s, T0 + 6 * MIN);
    expect(s.extensions).toBe(2);
    expect(remaining(s, T0 + 10 * MIN)).toBe(40 * MIN + 2 * EXTENSION_MS);
  });

  it("when the break arrives, goes back to focus with 15 minutes", () => {
    let s = start(withLine("50-10"), T0);
    s = tick(s, T0 + 51 * MIN);
    expect(s.phase).toBe("break");

    s = extend(s, T0 + 51 * MIN);
    expect(s.phase).toBe("focus");
    expect(s.askDone).toBe(false);
    expect(remaining(s, T0 + 51 * MIN)).toBe(15 * MIN);

    // And the break arrives again 15 minutes later, without counting the first 50 twice.
    s = tick(s, T0 + 66 * MIN);
    expect(s.phase).toBe("break");
    expect(remaining(s, T0 + 66 * MIN)).toBe(10 * MIN);
    expect(currentLine(s)!.focusedMs).toBe(65 * MIN);
    expect(currentLine(s)!.pomodoros).toBe(2);
  });
});

describe("background tab drift", () => {
  it("lands in the right phase after one huge gap (tab asleep)", () => {
    const s = start(withLine("50-10"), T0);
    // No ticks at all for 55 minutes, like a throttled or frozen tab.
    const later = tick(s, T0 + 55 * MIN);
    expect(later.phase).toBe("break");
    // The break started at minute 50, not when we noticed at minute 55.
    expect(remaining(later, T0 + 55 * MIN)).toBe(5 * MIN);
  });

  it("crosses focus and break in one gap and completes", () => {
    const s = start(withLine("25-5"), T0);
    expect(tick(s, T0 + 3 * 60 * MIN).phase).toBe("complete");
  });

  it("irregular, throttled ticks give the same result as one tick", () => {
    let s = start(withLine("50-10"), T0);
    let t = T0;
    while (t < T0 + 54 * MIN) {
      t += 997 + ((t / 7) % 60_000); // uneven gaps up to a minute
      s = tick(s, t);
    }
    const direct = tick(start(withLine("50-10"), T0), t);
    expect(s).toEqual(direct);
  });

  it("ignores the clock going backwards", () => {
    const s = start(withLine("50-10"), T0);
    expect(remaining(s, T0 - 5 * MIN)).toBe(50 * MIN);
  });
});

describe("helpers", () => {
  it("formats clock rounding up", () => {
    expect(formatClock(50 * MIN)).toBe("50:00");
    expect(formatClock(50 * MIN - 1)).toBe("50:00");
    expect(formatClock(999)).toBe("00:01");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(90 * MIN)).toBe("90:00");
  });

  it("clamps custom durations", () => {
    const s = createTimer("custom", 999, 0);
    expect(s.focusMs).toBe(240 * MIN);
    expect(s.breakMs).toBe(1 * MIN);
  });

  it("round-trips through JSON and rejects junk", () => {
    const s = start(withLine("90-15"), T0);
    expect(parseTimer(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(parseTimer(null)).toBeNull();
    expect(parseTimer({ version: 3 })).toBeNull();
    expect(parseTimer("hello")).toBeNull();
  });

  it("formats time away", () => {
    expect(formatAgo(20_000)).toBe("just now");
    expect(formatAgo(14 * MIN)).toBe("14m ago");
    expect(formatAgo(134 * MIN)).toBe("2h 14m ago");
    expect(formatAgo(120 * MIN)).toBe("2h ago");
    expect(formatAgo(30 * 60 * MIN)).toBe("yesterday");
    expect(formatAgo(80 * 60 * MIN)).toBe("3d ago");
  });
});

describe("lines", () => {
  it("Enter adds a one-line line and makes it current", () => {
    let s = addLine(createTimer(), "  Read the   old\nmiddleware ", T0);
    expect(s.task.lines.map((l) => l.text)).toEqual(["Read the old middleware"]);
    expect(s.task.id).toBe(T0);
    s = addLine(s, "Sketch the token shape", T0);
    expect(currentLine(s)!.text).toBe("Sketch the token shape");
    expect(new Set(s.task.lines.map((l) => l.id)).size).toBe(2); // unique ids, same millisecond
    expect(addLine(s, "   ", T0)).toBe(s);
  });

  it("focus time goes to whichever line is current", () => {
    let s = start(withLine(), T0);
    s = addLine(s, "Tests for expiry", T0 + 10 * MIN); // switch after 10 min
    s = pause(s, T0 + 25 * MIN);
    const [a, b] = s.task.lines;
    expect(a.focusedMs).toBe(10 * MIN);
    expect(b.focusedMs).toBe(15 * MIN);
    expect(taskFocusedMs(s, T0 + 99 * MIN)).toBe(25 * MIN);
  });

  it("shows live focus time on the current line without saving it yet", () => {
    const s = start(withLine(), T0);
    expect(lineFocusedMs(s, currentLine(s)!, T0 + 7 * MIN)).toBe(7 * MIN);
    expect(currentLine(s)!.focusedMs).toBe(0);
  });

  it("a full focus block is one pomodoro for the current line, and asks if it's done", () => {
    let s = start(withLine("25-5"), T0);
    s = tick(s, T0 + 26 * MIN);
    expect(s.phase).toBe("break");
    expect(currentLine(s)!.pomodoros).toBe(1);
    expect(currentLine(s)!.focusedMs).toBe(25 * MIN);
    expect(s.askDone).toBe(true);
  });

  it("a stopped block counts its time but not a pomodoro", () => {
    const s = stop(start(withLine(), T0), T0 + 20 * MIN);
    expect(s.phase).toBe("complete");
    expect(currentLine(s)!.pomodoros).toBe(0);
    expect(currentLine(s)!.focusedMs).toBe(20 * MIN);
  });

  it("Done ticks the line and moves on without touching the clock", () => {
    let s = addLine(withLine(), "Tests for expiry", T0 - MIN);
    s = setCurrent(s, s.task.lines[0].id, T0);
    s = start(s, T0);
    const running = s.startedAt;
    s = markCurrentDone(s, T0 + 5 * MIN);
    expect(s.task.lines[0].doneAt).toBe(T0 + 5 * MIN);
    expect(currentLine(s)!.text).toBe("Tests for expiry");
    expect(s.startedAt).toBe(running);
    expect(s.phase).toBe("focus");
  });

  it("Done after focus ends ticks and closes the question; Still on it just closes it", () => {
    const ended = tick(start(withLine("25-5"), T0), T0 + 26 * MIN);
    const done = markCurrentDone(ended, T0 + 26 * MIN);
    expect(done.askDone).toBe(false);
    expect(done.task.lines[0].doneAt).not.toBeNull();
    const kept = keepGoing(ended);
    expect(kept.askDone).toBe(false);
    expect(kept.task.lines[0].doneAt).toBeNull();
  });

  it("time with no current line goes to the next line you add", () => {
    let s = start(withLine(), T0);
    s = markCurrentDone(s, T0 + 10 * MIN); // nothing left to do, clock keeps going
    expect(s.task.currentId).toBeNull();
    s = addLine(s, "Write the docs", T0 + 15 * MIN);
    s = pause(s, T0 + 20 * MIN);
    expect(s.task.lines.map((l) => l.focusedMs)).toEqual([10 * MIN, 10 * MIN]);
  });

  it("unticking brings a line back, and removing the current line picks the next", () => {
    let s = addLine(withLine(), "Two", T0);
    const [one, two] = s.task.lines;
    s = toggleDone(s, two.id, T0);
    expect(s.task.currentId).toBe(one.id);
    s = toggleDone(s, two.id, T0);
    expect(s.task.lines[1].doneAt).toBeNull();
    s = removeLine(s, one.id, T0);
    expect(s.task.lines).toHaveLength(1);
    expect(s.task.currentId).toBe(two.id);
  });

  describe("removing the only line", () => {
    const named = () => setTitle(withLine("25-5"), "Old task");

    it("mid-block keeps the clock running, and the next line picks it up", () => {
      let s = start(named(), T0);
      s = removeLine(s, s.task.lines[0].id, T0 + 5 * MIN);
      expect(s.task.lines).toHaveLength(0);
      expect(s.phase).toBe("focus");
      expect(remaining(s, T0 + 5 * MIN)).toBe(20 * MIN);
      s = addLine(s, "The right task", T0 + 8 * MIN);
      s = pause(s, T0 + 10 * MIN);
      expect(currentLine(s)!.focusedMs).toBe(5 * MIN); // from the removal on
    });

    it("then pausing and resuming still works", () => {
      let s = start(named(), T0);
      s = removeLine(s, s.task.lines[0].id, T0 + MIN);
      s = toggle(s, T0 + 2 * MIN);
      expect(s.startedAt).toBeNull();
      s = toggle(s, T0 + 3 * MIN);
      expect(s.startedAt).toBe(T0 + 3 * MIN);
    });

    it("then stopping returns to a clean idle, keeping the preset", () => {
      let s = extend(start(named(), T0), T0 + MIN);
      s = removeLine(s, s.task.lines[0].id, T0 + 2 * MIN);
      s = stop(s, T0 + 3 * MIN);
      expect(s).toEqual(createTimer("25-5"));
    });

    it("then running out still gives the break, followed by a clean idle", () => {
      let s = start(named(), T0);
      s = removeLine(s, s.task.lines[0].id, T0 + MIN);
      s = tick(s, T0 + 26 * MIN);
      expect(s.phase).toBe("break");
      expect(s.askDone).toBe(false);
      expect(tick(s, T0 + 31 * MIN)).toEqual(createTimer("25-5"));
    });

    it("between blocks clears straight away", () => {
      const ended = stop(start(named(), T0), T0 + MIN);
      expect(removeLine(ended, ended.task.lines[0].id, T0 + 2 * MIN)).toEqual(createTimer("25-5"));
    });

    it("leaves other lines alone when more than one exists", () => {
      const s = stop(start(addLine(named(), "Two", T0 - MIN), T0), T0 + MIN);
      const after = removeLine(s, s.task.lines[0].id, T0 + 2 * MIN);
      expect(after.phase).toBe("complete");
      expect(after.task.lines).toHaveLength(1);
      expect(after.task.title).toBe("Old task");
    });
  });

  it("can't make a done line current", () => {
    let s = addLine(withLine(), "Two", T0);
    s = toggleDone(s, s.task.lines[0].id, T0);
    expect(setCurrent(s, s.task.lines[0].id, T0)).toBe(s);
  });

  it("title is optional and one line", () => {
    expect(setTitle(withLine(), " Rewrite\n auth  flow ").task.title).toBe("Rewrite auth flow");
  });
});

describe("finishing a task", () => {
  it("returns the task with the running block counted, and clears everything but the preset", () => {
    const s = start(withLine("25-5"), T0);
    const { state, finished } = finishTask(s, T0 + 10 * MIN);
    expect(finished!.lines[0].focusedMs).toBe(10 * MIN);
    expect(state.phase).toBe("idle");
    expect(state.task.lines).toEqual([]);
    expect(state.presetId).toBe("25-5");
  });

  it("an empty task finishes to nothing", () => {
    expect(finishTask(createTimer(), T0).finished).toBeNull();
  });
});

describe("resume card", () => {
  it("is offered for a paused or stopped block with a line to get back to", () => {
    expect(shouldOfferResume(pause(start(withLine(), T0), T0 + MIN))).toBe(true);
    expect(shouldOfferResume(stop(start(withLine(), T0), T0 + MIN))).toBe(true);
    expect(shouldOfferResume(tick(start(withLine("25-5"), T0), T0 + 2 * 60 * MIN))).toBe(true);
  });

  it("is not offered while running, before anything started, or with everything done", () => {
    expect(shouldOfferResume(start(withLine(), T0))).toBe(false);
    expect(shouldOfferResume(withLine())).toBe(false);
    const allDone = markCurrentDone(stop(start(withLine(), T0), T0 + MIN), T0 + MIN);
    expect(shouldOfferResume(allDone)).toBe(false);
  });

  it("R continues a paused focus block exactly where it was", () => {
    const paused = pause(start(withLine(), T0), T0 + 20 * MIN);
    const s = resumeSession(paused, T0 + 60 * MIN);
    expect(s.phase).toBe("focus");
    expect(remaining(s, T0 + 60 * MIN)).toBe(30 * MIN);
  });

  it("R after a finished or stopped block starts a new one on the same line", () => {
    const done = tick(start(withLine("25-5"), T0), T0 + 2 * 60 * MIN);
    const s = resumeSession(done, T0 + 3 * 60 * MIN);
    expect(s.phase).toBe("focus");
    expect(remaining(s, T0 + 3 * 60 * MIN)).toBe(25 * MIN);
    expect(currentLine(s)!.pomodoros).toBe(1);
    expect(s.askDone).toBe(false);
  });
});

describe("saves from before tasks (version 1)", () => {
  const v1 = {
    version: 1,
    phase: "focus",
    presetId: "50-10",
    focusMs: 50 * MIN,
    breakMs: 10 * MIN,
    startedAt: null,
    elapsedMs: 20 * MIN,
    extensions: 0,
    sessionStartedAt: T0,
    intention: "Rewrite auth flow",
    note: "Write the refresh handler",
    notePrompt: null,
    focusedMs: 20 * MIN,
    leftAt: T0 + 20 * MIN,
  };

  it("become a task: the intention names it and the note is its line", () => {
    const s = parseTimer(v1)!;
    expect(s.version).toBe(2);
    expect(s.task.title).toBe("Rewrite auth flow");
    expect(s.task.lines).toEqual([
      { id: T0, text: "Write the refresh handler", doneAt: null, pomodoros: 0, focusedMs: 20 * MIN },
    ]);
    expect(s.task.currentId).toBe(T0);
    expect(shouldOfferResume(s)).toBe(true);
    // Resuming doesn't count the first 20 minutes twice.
    expect(currentLine(pause(start(s, T0 + 60 * MIN), T0 + 70 * MIN))!.focusedMs).toBe(30 * MIN);
  });

  it("without a note, the intention is the line", () => {
    const s = parseTimer({ ...v1, note: "" })!;
    expect(s.task.title).toBe("");
    expect(s.task.lines[0].text).toBe("Rewrite auth flow");
  });

  it("with no intention, the task is empty", () => {
    const s = parseTimer({ ...v1, phase: "idle", intention: "", note: "" })!;
    expect(s.task.lines).toEqual([]);
  });
});
