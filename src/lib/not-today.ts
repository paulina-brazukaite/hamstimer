/**
 * The rules of Not Today, with no drawing in them. The hamster has one day to get
 * home having done nothing. Chores fall from the sky; the ones that land on it
 * stick and slow it down. Seeds score but widen the cheeks. There is no losing:
 * the day always ends, and you only find out how lazy you managed to be.
 *
 * `tick` changes the run in place, because it is called every frame.
 */
export const DAY_SECONDS = 75;
export const WORLD_HALF = 2.8; // how far left and right the hamster can go
export const HOME_SECONDS = 2.2; // the walk to the nest and the collapse
export const SPAWN_HEIGHT = 7;

const HAMSTER_TOP = 1.9;
const OBJECT_RADIUS = 0.35;
const RUN_SPEED = 8;
const SLOW_SECONDS = 4;
const SLOW_FACTOR = 0.45;

export const PERIODS = ["Morning", "Midday", "Evening", "Night"] as const;

const HAZARDS_BY_PERIOD = [
  ["alarm", "toothbrush", "bucket"],
  ["book", "broccoli", "dumbbell", "phone"],
  ["plates", "sock", "vacuum"],
  ["mosquito", "phoneNight"],
] as const;

export type Hazard = (typeof HAZARDS_BY_PERIOD)[number][number];
export type Pickup = "seed" | "pillow" | "cancel";
export type Kind = Hazard | Pickup;

export interface Faller {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  age: number;
}

export interface Run {
  phase: "running" | "home" | "over";
  clock: number;
  x: number;
  target: number | null; // where the mouse or finger is
  direction: number; // -1, 0 or 1 from the arrow keys
  fallers: Faller[];
  stuck: Hazard[];
  seeds: number;
  dodged: number;
  nextDrop: number;
  slow: number; // seconds of slow motion left
  homeLeft: number;
  nextId: number;
}

export type GameEvent =
  | { type: "hit"; kind: Hazard }
  | { type: "seed" }
  | { type: "pillow" }
  | { type: "cancel" }
  | { type: "period"; period: number }
  | { type: "home" }
  | { type: "over" };

type Random = () => number;

export function newRun(): Run {
  return { phase: "running", clock: 0, x: 0, target: null, direction: 0, fallers: [], stuck: [], seeds: 0, dodged: 0, nextDrop: 0.8, slow: 0, homeLeft: 0, nextId: 1 };
}

export function periodAt(clock: number): number {
  return Math.min(PERIODS.length - 1, Math.floor((clock / DAY_SECONDS) * PERIODS.length));
}

/** Half the hamster's width: every seed makes the cheeks, and the target, bigger. */
export function halfWidth(seeds: number): number {
  return Math.min(1.25, 0.5 + seeds * 0.025);
}

/** Each chore it carries slows it down, but never to a stop. */
export function speedFactor(stuckCount: number): number {
  return Math.max(0.45, 1 - stuckCount * 0.04);
}

export function isHazard(kind: Kind): kind is Hazard {
  return kind !== "seed" && kind !== "pillow" && kind !== "cancel";
}

function rollKind(period: number, random: Random): Kind {
  const roll = random();
  if (roll < 0.04) return "cancel";
  if (roll < 0.09) return "pillow";
  if (roll < 0.38) return "seed";
  const list = HAZARDS_BY_PERIOD[period];
  return list[Math.floor(random() * list.length)];
}

function clampX(x: number): number {
  return Math.max(-WORLD_HALF, Math.min(WORLD_HALF, x));
}

function moveHamster(r: Run, dt: number) {
  const speed = RUN_SPEED * (r.phase === "home" ? 0.5 : speedFactor(r.stuck.length));
  if (r.direction !== 0) {
    r.target = null;
    r.x = clampX(r.x + r.direction * speed * dt);
  } else if (r.target !== null) {
    const gap = r.target - r.x;
    r.x += Math.sign(gap) * Math.min(Math.abs(gap), speed * dt);
  }
}

function spawn(r: Run, random: Random) {
  const progress = r.clock / DAY_SECONDS;
  const period = periodAt(r.clock);
  r.fallers.push({
    id: r.nextId++,
    kind: rollKind(period, random),
    x: (random() * 2 - 1) * WORLD_HALF,
    y: SPAWN_HEIGHT,
    age: 0,
  });
  r.nextDrop = (1.05 - 0.43 * progress) * (0.8 + random() * 0.4);
}

function drift(f: Faller, hamsterX: number, dt: number) {
  if (f.kind === "vacuum") {
    const gap = hamsterX - f.x;
    f.x += Math.sign(gap) * Math.min(Math.abs(gap), 0.85 * dt); // it chases you, a little
  } else if (f.kind === "mosquito") {
    f.x = clampX(f.x + Math.sin(f.age * 6) * 2.2 * dt);
  }
}

/** Advance the run by dt seconds and report what happened. */
export function tick(r: Run, dt: number, random: Random = Math.random): GameEvent[] {
  const events: GameEvent[] = [];
  if (r.phase === "over") return events;

  moveHamster(r, dt);

  if (r.phase === "running") {
    const before = periodAt(r.clock);
    r.clock += dt;
    r.slow = Math.max(0, r.slow - dt);
    const period = periodAt(r.clock);
    if (period !== before) events.push({ type: "period", period });
    r.nextDrop -= dt;
    if (r.nextDrop <= 0) spawn(r, random);
  }

  const rate = (3.2 + 1.5 * Math.min(1, r.clock / DAY_SECONDS)) * (r.slow > 0 ? SLOW_FACTOR : 1);
  const reach = halfWidth(r.seeds) + OBJECT_RADIUS;
  let cancelled = false;
  r.fallers = r.fallers.filter((f) => {
    f.age += dt;
    f.y -= rate * dt;
    drift(f, r.x, dt);
    if (r.phase === "running" && f.y < HAMSTER_TOP && Math.abs(f.x - r.x) < reach) {
      if (isHazard(f.kind)) {
        r.stuck.push(f.kind);
        events.push({ type: "hit", kind: f.kind });
      } else if (f.kind === "seed") {
        r.seeds++;
        events.push({ type: "seed" });
      } else if (f.kind === "pillow") {
        r.slow = SLOW_SECONDS;
        events.push({ type: "pillow" });
      } else {
        cancelled = true;
        events.push({ type: "cancel" });
      }
      return false;
    }
    if (f.y > 0) return true;
    if (r.phase === "running" && isHazard(f.kind)) r.dodged++;
    return false;
  });

  if (cancelled) {
    r.dodged += r.fallers.filter((f) => isHazard(f.kind)).length;
    r.fallers = r.fallers.filter((f) => !isHazard(f.kind));
  }

  if (r.phase === "running" && r.clock >= DAY_SECONDS) {
    r.phase = "home";
    r.homeLeft = HOME_SECONDS;
    r.target = 0;
    r.direction = 0;
    events.push({ type: "home" });
  } else if (r.phase === "home") {
    r.homeLeft -= dt;
    if (r.homeLeft <= 0) {
      r.phase = "over";
      r.fallers = [];
      events.push({ type: "over" });
    }
  }
  return events;
}

/** Dodging and snacking count for you; every chore you end up carrying counts against you. */
export function laziness(r: Pick<Run, "dodged" | "seeds" | "stuck">): number {
  return Math.max(0, r.dodged + r.seeds - r.stuck.length * 3);
}

export function verdict(stuckCount: number): string {
  if (stuckCount === 0) return "Did absolutely nothing. Perfect.";
  if (stuckCount <= 3) return "Barely lifted a paw.";
  if (stuckCount <= 10) return "Accidentally productive.";
  return "Did literally everything. Go lie down.";
}

export const HIT_LINES: Record<Hazard, string> = {
  alarm: "BEEP BEEP BEEP",
  toothbrush: "Minty regret.",
  bucket: "Cold. So cold.",
  book: "Homework. Ugh.",
  broccoli: "Not the green one.",
  dumbbell: "Leg day.",
  phone: "Ring ring. No.",
  plates: "Who used all of these?",
  sock: "Whose sock?",
  vacuum: "VRRRRRRR",
  mosquito: "Bzzz.",
  phoneNight: "Just one more video…",
};
