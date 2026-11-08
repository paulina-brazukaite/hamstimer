/**
 * The rules of Cheek Stuffer, with no drawing in them. A game is a few trips.
 * On each trip you stuff seeds into the hamster's cheeks, then either waddle to
 * the nest to bank them or stuff one too many and lose the lot. The cheeks have
 * a hidden limit that changes every trip; the hamster's wobble gives it away.
 */
export const TRIPS = 3;
export const MIN_LIMIT = 7;
export const MAX_LIMIT = 16;

export type Phase = "stuffing" | "waddling" | "burst" | "over";

export interface Game {
  trip: number; // 1..TRIPS
  cheeks: number;
  limit: number; // the most the cheeks can hold this trip
  banked: number;
  phase: Phase;
}

type Random = () => number;

function rollLimit(random: Random): number {
  return MIN_LIMIT + Math.floor(random() * (MAX_LIMIT - MIN_LIMIT + 1));
}

export function newGame(random: Random = Math.random): Game {
  return { trip: 1, cheeks: 0, limit: rollLimit(random), banked: 0, phase: "stuffing" };
}

/** One more seed. Past the limit the cheeks burst and that trip's seeds are lost. */
export function stuff(g: Game): Game {
  if (g.phase !== "stuffing") return g;
  if (g.cheeks >= g.limit) return { ...g, cheeks: 0, phase: "burst" };
  return { ...g, cheeks: g.cheeks + 1 };
}

/** Head for the nest. The seeds count as soon as the hamster sets off. */
export function bank(g: Game): Game {
  if (g.phase !== "stuffing" || g.cheeks === 0) return g;
  return { ...g, cheeks: 0, banked: g.banked + g.cheeks, phase: "waddling" };
}

/** After the waddle or the burst: the next trip, or the end of the game. */
export function nextTrip(g: Game, random: Random = Math.random): Game {
  if (g.phase !== "waddling" && g.phase !== "burst") return g;
  if (g.trip >= TRIPS) return { ...g, phase: "over" };
  return { ...g, trip: g.trip + 1, cheeks: 0, limit: rollLimit(random), phase: "stuffing" };
}

/** How close the cheeks are to bursting, 0..1. */
export function fullness(g: Game): number {
  return Math.min(1, g.cheeks / g.limit);
}

/** What the hamster manages to say with its mouth full. */
export function mumble(g: Game): string {
  if (g.phase === "waddling") return "Waddle, waddle, waddle.";
  if (g.phase === "burst") return "Pfffft. Seeds everywhere.";
  if (g.cheeks === 0) return g.trip === 1 ? "Tap to stuff a seed." : "Ready for more.";
  const f = fullness(g);
  if (f < 0.35) return "Mmf.";
  if (f < 0.65) return "Mmmf mmf.";
  if (f < 0.9) return "MMMMF!";
  return "Mm. MMF. mmf?!";
}

/** The performance review at the end of a game. */
export function reviewTitle(haul: number): string {
  if (haul === 0) return "On a strict diet";
  if (haul < 15) return "Light snacker";
  if (haul < 30) return "Solid contributor";
  if (haul < 40) return "Exceeds expectations";
  return "Hoarder of the Quarter";
}
