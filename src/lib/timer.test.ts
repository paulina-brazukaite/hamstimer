import { describe, expect, it } from "vitest";
import {
  EXTENSION_MS,
  createTimer,
  extend,
  formatAgo,
  formatClock,
  resumeSession,
  shouldOfferResume,
  startFresh,
  dismissNote,
  parseTimer,
  pause,
  saveNote,
  setIntention,
  stop,
  remaining,
  start,
  tick,
  toggle,
} from "./timer";

const MIN = 60_000;
const T0 = 1_700_000_000_000; // any fixed timestamp

describe("start, pause and resume", () => {
  it("counts down from the preset", () => {
    const s = start(createTimer("50-10"), T0);
    expect(remaining(s, T0)).toBe(50 * MIN);
    expect(remaining(s, T0 + 10 * MIN)).toBe(40 * MIN);
  });

  it("does not count time while paused", () => {
    let s = start(createTimer("50-10"), T0);
    s = pause(s, T0 + 10 * MIN); // 10 min focused
    expect(remaining(s, T0 + 30 * MIN)).toBe(40 * MIN); // 20 min paused: unchanged
    s = start(s, T0 + 30 * MIN); // resume
    expect(remaining(s, T0 + 35 * MIN)).toBe(35 * MIN); // 15 min focused total
  });

  it("survives many pause/resume cycles without drift", () => {
    let s = start(createTimer("25-5"), T0);
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
    let s = toggle(createTimer(), T0);
    expect(s.phase).toBe("focus");
    s = toggle(s, T0 + MIN);
    expect(s.startedAt).toBeNull();
    s = toggle(s, T0 + 2 * MIN);
    expect(s.startedAt).toBe(T0 + 2 * MIN);
  });
});

describe("+15 min extension", () => {
  it("extends focus while focusing, and is repeatable", () => {
    let s = start(createTimer("50-10"), T0);
    s = extend(s, T0 + 5 * MIN);
    s = extend(s, T0 + 6 * MIN);
    expect(s.extensions).toBe(2);
    expect(remaining(s, T0 + 10 * MIN)).toBe(40 * MIN + 2 * EXTENSION_MS);
  });

  it("when the break arrives, goes back to focus with 15 minutes", () => {
    let s = start(createTimer("50-10"), T0);
    s = tick(s, T0 + 51 * MIN);
    expect(s.phase).toBe("break");

    s = extend(s, T0 + 51 * MIN);
    expect(s.phase).toBe("focus");
    expect(remaining(s, T0 + 51 * MIN)).toBe(15 * MIN);

    // And the break arrives again 15 minutes later.
    s = tick(s, T0 + 66 * MIN);
    expect(s.phase).toBe("break");
    expect(remaining(s, T0 + 66 * MIN)).toBe(10 * MIN);
  });
});

describe("background tab drift", () => {
  it("lands in the right phase after one huge gap (tab asleep)", () => {
    const s = start(createTimer("50-10"), T0);
    // No ticks at all for 55 minutes, like a throttled or frozen tab.
    const later = tick(s, T0 + 55 * MIN);
    expect(later.phase).toBe("break");
    // The break started at minute 50, not when we noticed at minute 55.
    expect(remaining(later, T0 + 55 * MIN)).toBe(5 * MIN);
  });

  it("crosses focus and break in one gap and completes", () => {
    const s = start(createTimer("25-5"), T0);
    expect(tick(s, T0 + 3 * 60 * MIN).phase).toBe("complete");
  });

  it("irregular, throttled ticks give the same result as one tick", () => {
    let s = start(createTimer("50-10"), T0);
    let t = T0;
    while (t < T0 + 54 * MIN) {
      t += 997 + ((t / 7) % 60_000); // uneven gaps up to a minute
      s = tick(s, t);
    }
    const direct = tick(start(createTimer("50-10"), T0), t);
    expect(s).toEqual(direct);
  });

  it("ignores the clock going backwards", () => {
    const s = start(createTimer("50-10"), T0);
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
    const s = start(createTimer("90-15"), T0);
    expect(parseTimer(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(parseTimer(null)).toBeNull();
    expect(parseTimer({ version: 2 })).toBeNull();
    expect(parseTimer("hello")).toBeNull();
  });
});

describe("intention and \"Where was I?\" notes", () => {
  it("opens the board on pause, stop and when focus ends", () => {
    const s = start(createTimer("25-5"), T0);
    expect(pause(s, T0 + MIN).notePrompt).toBe("pause");
    expect(stop(s, T0 + MIN).notePrompt).toBe("stop");
    expect(tick(s, T0 + 26 * MIN).notePrompt).toBe("end");
  });

  it("resuming or extending closes the board", () => {
    const paused = pause(start(createTimer(), T0), T0 + MIN);
    expect(start(paused, T0 + 2 * MIN).notePrompt).toBeNull();
    const onBreak = tick(start(createTimer("25-5"), T0), T0 + 26 * MIN);
    expect(extend(onBreak, T0 + 26 * MIN).notePrompt).toBeNull();
  });

  it("Enter saves a one-line note, empty keeps the old one, Esc skips", () => {
    let s = pause(start(createTimer(), T0), T0 + MIN);
    s = saveNote(s, "  check   refresh\ntoken expiry ");
    expect(s.note).toBe("check refresh token expiry");
    expect(s.notePrompt).toBeNull();

    s = saveNote(pause(start(s, T0 + 2 * MIN), T0 + 3 * MIN), "   ");
    expect(s.note).toBe("check refresh token expiry");

    const skipped = dismissNote(pause(start(s, T0 + 4 * MIN), T0 + 5 * MIN));
    expect(skipped.notePrompt).toBeNull();
    expect(skipped.note).toBe("check refresh token expiry");
  });

  it("stop keeps intention and note for the next session", () => {
    let s = setIntention(createTimer(), "Fix token refresh");
    s = saveNote(stop(start(s, T0), T0 + MIN), "write the test");
    const next = start(s, T0 + 10 * MIN);
    expect(next.phase).toBe("focus");
    expect(next.intention).toBe("Fix token refresh");
    expect(next.note).toBe("write the test");
  });

  it("loads saves from before notes existed", () => {
    const old: Record<string, unknown> = { ...createTimer() };
    delete old.note;
    delete old.notePrompt;
    const parsed = parseTimer(old);
    expect(parsed?.note).toBe("");
    expect(parsed?.notePrompt).toBeNull();
  });
});

describe("resume card", () => {
  const withIntention = setIntention(createTimer("50-10"), "Fix token refresh");

  it("is offered for a paused or stopped session with an intention", () => {
    const running = start(withIntention, T0);
    expect(shouldOfferResume(running)).toBe(false); // a plain reload: just carry on
    expect(shouldOfferResume(pause(running, T0 + 38 * MIN))).toBe(true);
    expect(shouldOfferResume(stop(running, T0 + 38 * MIN))).toBe(true);
    expect(shouldOfferResume(tick(running, T0 + 3 * 60 * MIN))).toBe(true); // came back hours later
  });

  it("is not offered without an intention or before anything started", () => {
    expect(shouldOfferResume(withIntention)).toBe(false);
    expect(shouldOfferResume(pause(start(createTimer(), T0), T0 + MIN))).toBe(false);
  });

  it("remembers how far you got and when you left", () => {
    const paused = pause(start(withIntention, T0), T0 + 38 * MIN);
    expect(paused.focusedMs).toBe(38 * MIN);
    expect(paused.leftAt).toBe(T0 + 38 * MIN);

    const ended = tick(start(withIntention, T0), T0 + 70 * MIN);
    expect(ended.focusedMs).toBe(50 * MIN);
    expect(ended.leftAt).toBe(T0 + 50 * MIN); // when focus ended, not when the break did
  });

  it("R continues a paused focus block exactly where it was", () => {
    const paused = pause(start(withIntention, T0), T0 + 38 * MIN);
    const later = T0 + 3 * 60 * MIN;
    const resumed = resumeSession(paused, later);
    expect(resumed.phase).toBe("focus");
    expect(remaining(resumed, later)).toBe(12 * MIN);
  });

  it("R after a finished or stopped session starts a new one with the same context", () => {
    const stopped = saveNote(stop(start(withIntention, T0), T0 + 20 * MIN), "write the test");
    const resumed = resumeSession(stopped, T0 + 60 * MIN);
    expect(resumed.phase).toBe("focus");
    expect(remaining(resumed, T0 + 60 * MIN)).toBe(50 * MIN);
    expect(resumed.intention).toBe("Fix token refresh");
    expect(resumed.note).toBe("write the test");
    expect(resumed.focusedMs).toBe(0);
  });

  it("Esc starts fresh: no intention, no note, same preset", () => {
    const s = saveNote(stop(start(createTimer("25-5"), T0), T0 + MIN), "x");
    const fresh = startFresh(setIntention(s, "y"));
    expect(fresh.phase).toBe("idle");
    expect(fresh.intention).toBe("");
    expect(fresh.note).toBe("");
    expect(fresh.focusMs).toBe(25 * MIN);
    expect(shouldOfferResume(fresh)).toBe(false);
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
