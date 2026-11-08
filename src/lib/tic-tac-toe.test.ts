import { describe, expect, it } from "vitest";
import { EMPTY_BOARD, chooseMove, outcome, place, type Board, type Square } from "./tic-tac-toe";

const X: Square = "X";
const O: Square = "O";
const _: Square = null;
const always = () => 0;
const never = () => 0.99;

describe("place", () => {
  it("marks an empty cell without changing the original", () => {
    const next = place(EMPTY_BOARD, 4, "X");
    expect(next[4]).toBe("X");
    expect(EMPTY_BOARD[4]).toBeNull();
  });

  it("refuses a taken cell", () => {
    const board = place(EMPTY_BOARD, 4, "X");
    expect(place(board, 4, "O")).toBe(board);
  });
});

describe("outcome", () => {
  it("is null while the game is going", () => {
    expect(outcome(EMPTY_BOARD)).toBeNull();
  });

  it("finds a win and its line", () => {
    const board: Board = [X, X, X, O, O, _, _, _, _];
    expect(outcome(board)).toEqual({ winner: "X", line: [0, 1, 2] });
  });

  it("finds a diagonal", () => {
    const board: Board = [X, O, O, _, X, _, _, _, X];
    expect(outcome(board)).toEqual({ winner: "X", line: [0, 4, 8] });
  });

  it("calls a full board with no line a draw", () => {
    const board: Board = [X, O, X, X, O, O, O, X, X];
    expect(outcome(board)).toEqual({ winner: null, line: null });
  });
});

describe("chooseMove", () => {
  it("takes a win when it's paying attention", () => {
    const board: Board = [O, O, _, X, X, _, _, _, X];
    expect(chooseMove(board, always)).toBe(2);
  });

  it("prefers winning to blocking", () => {
    const board: Board = [X, X, _, O, O, _, _, _, _];
    expect(chooseMove(board, always)).toBe(5);
  });

  it("blocks when it's paying attention", () => {
    const board: Board = [X, X, _, _, O, _, _, _, _];
    expect(chooseMove(board, always)).toBe(2);
  });

  it("can miss a block, so it can be beaten", () => {
    const board: Board = [X, X, _, _, O, _, _, _, _];
    // Distracted, it goes for the last corner it picks from the list, not the block.
    expect(chooseMove(board, never)).toBe(8);
  });

  it("likes the centre", () => {
    expect(chooseMove(place(EMPTY_BOARD, 0, "X"), always)).toBe(4);
  });

  it("only ever picks an empty cell", () => {
    const board: Board = [X, O, X, X, O, _, O, X, _];
    for (const value of [0, 0.3, 0.6, 0.99]) {
      expect(board[chooseMove(board, () => value)]).toBeNull();
    }
  });
});
