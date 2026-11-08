/**
 * The rules of tic-tac-toe and the hamster's thinking, with no drawing in them.
 * You are X and go first; the hamster is O. Cells are numbered 0..8, left to
 * right, top to bottom. The hamster is good but distractible, so it can be beaten.
 */
export type Mark = "X" | "O";
export type Square = Mark | null;
export type Board = readonly Square[];

type Random = () => number;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

const CORNERS = [0, 2, 6, 8];
const TAKES_A_WIN = 0.9;
const BLOCKS_YOU = 0.7;
const LIKES_THE_CENTRE = 0.6;

export const EMPTY_BOARD: Board = Array<Square>(9).fill(null);

export interface Outcome {
  winner: Mark | null; // null is a draw
  line: readonly number[] | null;
}

export function place(board: Board, cell: number, mark: Mark): Board {
  if (board[cell] !== null) return board;
  return board.map((square, i) => (i === cell ? mark : square));
}

/** The result of the game, or null while it's still going. */
export function outcome(board: Board): Outcome | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) return { winner: mark, line };
  }
  return board.every((square) => square !== null) ? { winner: null, line: null } : null;
}

function emptyCells(board: Board): number[] {
  return board.flatMap((square, i) => (square === null ? [i] : []));
}

/** A cell that would complete a line for `mark` right now. */
function winningCell(board: Board, mark: Mark): number | undefined {
  return emptyCells(board).find((cell) => outcome(place(board, cell, mark))?.winner === mark);
}

function pick(cells: number[], random: Random): number {
  return cells[Math.floor(random() * cells.length)];
}

/** Where the hamster draws next. Call only while there is an empty cell. */
export function chooseMove(board: Board, random: Random = Math.random): number {
  const win = winningCell(board, "O");
  if (win !== undefined && random() < TAKES_A_WIN) return win;
  const block = winningCell(board, "X");
  if (block !== undefined && random() < BLOCKS_YOU) return block;
  if (board[4] === null && random() < LIKES_THE_CENTRE) return 4;
  const empty = emptyCells(board);
  const corners = empty.filter((cell) => CORNERS.includes(cell));
  return pick(corners.length > 0 ? corners : empty, random);
}
