import { describe, expect, it } from "vitest";
import { FOCUS_ACTIVITIES, focusActivity, hamsterPose } from "./hamster";
import { addLine, createTimer, pause, start, tick } from "./timer";

const T0 = 1_000_000;

function running() {
  return start(addLine(createTimer("25-5"), "Write the handler", T0), T0);
}

describe("hamsterPose", () => {
  it("sits before the first start", () => {
    expect(hamsterPose(addLine(createTimer(), "x", T0), false)).toBe("sit");
  });

  it("does a focus activity while focus runs", () => {
    expect(FOCUS_ACTIVITIES).toContain(hamsterPose(running(), false));
  });

  it("sits when paused", () => {
    expect(hamsterPose(pause(running(), T0 + 1000), false)).toBe("sit");
  });

  it("eats on a break", () => {
    const s = tick(running(), T0 + 25 * 60_000 + 1);
    expect(s.phase).toBe("break");
    expect(hamsterPose(s, false)).toBe("eat");
  });

  it("sleeps on the resume card", () => {
    expect(hamsterPose(running(), true)).toBe("sleep");
  });
});

describe("focusActivity", () => {
  it("is stable for the same task and block", () => {
    expect(focusActivity(7, 3)).toBe(focusActivity(7, 3));
  });

  it("never repeats the previous block's activity", () => {
    for (let task = 1; task < 50; task++) {
      for (let b = 1; b < 12; b++) {
        expect(focusActivity(task, b)).not.toBe(focusActivity(task, b - 1));
      }
    }
  });
});
