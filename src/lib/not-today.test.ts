import { describe, expect, it } from "vitest";
import { DAY_SECONDS, HOME_SECONDS, WORLD_HALF, halfWidth, laziness, newRun, periodAt, speedFactor, tick, verdict, type Faller, type Run } from "./not-today";

/** A run with nothing about to spawn, so each test controls what's in the air. */
function quietRun(over: Partial<Run> = {}): Run {
  return { ...newRun(), nextDrop: 999, ...over };
}
const faller = (over: Partial<Faller>): Faller => ({ id: 1, kind: "alarm", x: 0, y: 1, age: 0, ...over });
const never = () => 0.99;

describe("the day", () => {
  it("moves through four periods", () => {
    expect(periodAt(0)).toBe(0);
    expect(periodAt(DAY_SECONDS / 2)).toBe(2);
    expect(periodAt(DAY_SECONDS)).toBe(3);
  });

  it("announces a new period once", () => {
    const r = quietRun({ clock: DAY_SECONDS / 4 - 0.01 });
    expect(tick(r, 0.02)).toEqual([{ type: "period", period: 1 }]);
    expect(tick(r, 0.02)).toEqual([]);
  });

  it("walks home when the day ends, then finishes", () => {
    const r = quietRun({ clock: DAY_SECONDS - 0.01, x: 2 });
    expect(tick(r, 0.02).map((e) => e.type)).toContain("home");
    expect(r).toMatchObject({ phase: "home", target: 0 });
    expect(tick(r, HOME_SECONDS + 0.1).map((e) => e.type)).toEqual(["over"]);
    expect(r.phase).toBe("over");
  });

  it("does nothing once over", () => {
    const r = quietRun({ phase: "over", clock: 5 });
    expect(tick(r, 1)).toEqual([]);
    expect(r.clock).toBe(5);
  });
});

describe("falling things", () => {
  it("spawns a chore from the current period", () => {
    const r = newRun();
    r.nextDrop = 0;
    tick(r, 0.01, never);
    expect(r.fallers).toHaveLength(1);
    expect(r.fallers[0].kind).toBe("bucket"); // the last morning chore
  });

  it("sticks a chore to the hamster when it lands on it", () => {
    const r = quietRun({ fallers: [faller({ kind: "sock" })] });
    expect(tick(r, 0.01)).toEqual([{ type: "hit", kind: "sock" }]);
    expect(r.stuck).toEqual(["sock"]);
    expect(r.fallers).toEqual([]);
  });

  it("counts a chore that reaches the ground as dodged", () => {
    const r = quietRun({ fallers: [faller({ x: 2.5, y: 0.01 })] });
    tick(r, 0.1);
    expect(r.dodged).toBe(1);
    expect(r.fallers).toEqual([]);
  });

  it("doesn't count a missed seed as a dodge", () => {
    const r = quietRun({ fallers: [faller({ kind: "seed", x: 2.5, y: 0.01 })] });
    tick(r, 0.1);
    expect(r.dodged).toBe(0);
  });

  it("the vacuum drifts towards the hamster", () => {
    const r = quietRun({ x: 0, fallers: [faller({ kind: "vacuum", x: 2.5, y: 6 })] });
    tick(r, 0.1);
    expect(r.fallers[0].x).toBeLessThan(2.5);
  });
});

describe("pickups", () => {
  it("seeds score and widen the hamster", () => {
    const r = quietRun({ fallers: [faller({ kind: "seed" })] });
    tick(r, 0.01);
    expect(r.seeds).toBe(1);
    expect(halfWidth(30)).toBeGreaterThan(halfWidth(0));
  });

  it("the pillow slows the sky down", () => {
    const fast = quietRun({ fallers: [faller({ x: 2.5, y: 6 })] });
    const slow = quietRun({ slow: 3, fallers: [faller({ x: 2.5, y: 6 })] });
    tick(fast, 0.1);
    tick(slow, 0.1);
    expect(slow.fallers[0].y).toBeGreaterThan(fast.fallers[0].y);
  });

  it("the cancel stamp clears the chores and counts them as dodged", () => {
    const r = quietRun({
      fallers: [faller({ kind: "cancel" }), faller({ id: 2, x: 2.5, y: 5 }), faller({ id: 3, kind: "seed", x: -2.5, y: 5 })],
    });
    tick(r, 0.01);
    expect(r.dodged).toBe(1);
    expect(r.fallers.map((f) => f.kind)).toEqual(["seed"]);
  });
});

describe("moving", () => {
  it("heads for the pointer", () => {
    const r = quietRun({ target: 1 });
    tick(r, 0.05);
    expect(r.x).toBeCloseTo(0.4);
    tick(r, 1);
    expect(r.x).toBe(1);
  });

  it("stops at the edge with the arrow keys", () => {
    const r = quietRun({ direction: 1 });
    tick(r, 5);
    expect(r.x).toBe(WORLD_HALF);
  });

  it("is slowed by what it carries, but never stopped", () => {
    expect(speedFactor(5)).toBeLessThan(speedFactor(0));
    expect(speedFactor(100)).toBeGreaterThan(0);
  });
});

describe("the verdict", () => {
  it("scores laziness and never goes negative", () => {
    expect(laziness({ dodged: 10, seeds: 5, stuck: ["sock"] })).toBe(12);
    expect(laziness({ dodged: 0, seeds: 0, stuck: ["sock", "alarm"] })).toBe(0);
  });

  it("rewards doing nothing", () => {
    expect(verdict(0)).toBe("Did absolutely nothing. Perfect.");
    expect(verdict(4)).toBe("Accidentally productive.");
  });
});
