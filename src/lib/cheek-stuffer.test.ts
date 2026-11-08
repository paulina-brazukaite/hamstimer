import { describe, expect, it } from "vitest";
import { MAX_LIMIT, MIN_LIMIT, TRIPS, bank, fullness, mumble, newGame, nextTrip, reviewTitle, stuff, type Game } from "./cheek-stuffer";

const game = (over: Partial<Game> = {}): Game => ({ trip: 1, cheeks: 0, limit: 3, banked: 0, phase: "stuffing", ...over });

describe("newGame", () => {
  it("rolls a limit across the whole range", () => {
    expect(newGame(() => 0).limit).toBe(MIN_LIMIT);
    expect(newGame(() => 0.999).limit).toBe(MAX_LIMIT);
  });
});

describe("stuff", () => {
  it("adds seeds up to and including the limit", () => {
    expect(stuff(game({ cheeks: 2 }))).toMatchObject({ cheeks: 3, phase: "stuffing" });
  });

  it("bursts one past the limit and loses only this trip's seeds", () => {
    expect(stuff(game({ cheeks: 3, banked: 5 }))).toMatchObject({ cheeks: 0, banked: 5, phase: "burst" });
  });

  it("does nothing while waddling", () => {
    const g = game({ phase: "waddling" });
    expect(stuff(g)).toBe(g);
  });
});

describe("bank", () => {
  it("moves the cheeks into the nest", () => {
    expect(bank(game({ cheeks: 2, banked: 4 }))).toMatchObject({ cheeks: 0, banked: 6, phase: "waddling" });
  });

  it("won't set off with empty cheeks", () => {
    const g = game();
    expect(bank(g)).toBe(g);
  });
});

describe("nextTrip", () => {
  it("starts the next trip with a new limit", () => {
    expect(nextTrip(game({ phase: "waddling" }), () => 0)).toMatchObject({ trip: 2, limit: MIN_LIMIT, phase: "stuffing" });
  });

  it("ends the game after the last trip, even on a burst", () => {
    expect(nextTrip(game({ trip: TRIPS, phase: "burst", banked: 9 }))).toMatchObject({ phase: "over", banked: 9 });
  });

  it("ignores a call while stuffing", () => {
    const g = game();
    expect(nextTrip(g)).toBe(g);
  });
});

describe("what the hamster shows", () => {
  it("reports fullness against the hidden limit", () => {
    expect(fullness(game({ cheeks: 3, limit: 12 }))).toBe(0.25);
  });

  it("mumbles louder as the cheeks fill", () => {
    expect(mumble(game({ cheeks: 1, limit: 10 }))).toBe("Mmf.");
    expect(mumble(game({ cheeks: 10, limit: 10 }))).toBe("Mm. MMF. mmf?!");
  });

  it("gives every haul a review", () => {
    expect(reviewTitle(0)).toBe("On a strict diet");
    expect(reviewTitle(14)).toBe("Light snacker");
    expect(reviewTitle(MAX_LIMIT * TRIPS)).toBe("Hoarder of the Quarter");
  });
});
