"use client";

import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button, ButtonLink, PageHeading, Stat } from "@/components/ui";
import { useGameStage } from "@/components/use-game-stage";
import { EMPTY_BOARD, chooseMove, outcome, place, type Board, type Outcome } from "@/lib/tic-tac-toe";
import type { PanicBeat, TicTacToeApi } from "@/lib/hamster3d/tic-tac-toe-game";

const loadStage = () => import("@/lib/hamster3d/tic-tac-toe-game").then((m) => m.createTicTacToe);

/** How long the message stays up when there is no 3D animation to wait for. */
const NO_3D_PAUSE = 500;

const FIRST_LINE = "You first. Tap a square.";
const THINKING = ["Hmm.", "Let me think.", "Bold move.", "Interesting…", "Oh, I see."];
const YOUR_TURN = ["Your turn.", "Beat that.", "Top that.", "Your go."];
const PANIC_LINES: Record<PanicBeat, string> = {
  shock: "Wait. What?",
  circles: "AAAAAAAAAAH!",
  stare: "…",
  gone: "You won. The hamster has left the building.",
};

type Phase = "you" | "busy" | "over";
interface Match {
  board: Board;
  phase: Phase;
}

const NEW_MATCH: Match = { board: EMPTY_BOARD, phase: "you" };
const NO_SCORE = { you: 0, hamster: 0, draws: 0 };

function anyOf(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function endLine(result: Outcome) {
  if (result.winner === "X") return "You won. The pen was faulty.";
  if (result.winner === "O") return "Hamster wins. Naturally.";
  return "A draw. Nobody has to do anything.";
}

export function TicTacToe() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { api, ready, failed } = useGameStage(canvas, loadStage);
  const [match, setMatch] = useState(NEW_MATCH);
  const latest = useRef(match); // the 3D scene calls back outside React's render cycle
  const [score, setScore] = useState(NO_SCORE);
  const [line, setLine] = useState(FIRST_LINE);
  const pause = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function commit(next: Match) {
    latest.current = next;
    setMatch(next);
  }

  // Next keeps a page you've left alive but hidden, and its 3D scene is rebuilt on return, so start fresh.
  useEffect(
    () => () => {
      clearTimeout(pause.current);
      latest.current = NEW_MATCH;
      setMatch(NEW_MATCH);
      setLine(FIRST_LINE);
    },
    [],
  );

  function animate(run: (stage: TicTacToeApi, done: () => void) => void, then: () => void) {
    if (api.current) run(api.current, then);
    else pause.current = setTimeout(then, NO_3D_PAUSE);
  }

  function endIfOver(board: Board): boolean {
    const result = outcome(board);
    if (!result) return false;
    commit({ board, phase: "over" });
    setLine(endLine(result));
    api.current?.finish(result.winner, result.line, (beat) => setLine(PANIC_LINES[beat]));
    setScore((s) => ({
      you: s.you + (result.winner === "X" ? 1 : 0),
      hamster: s.hamster + (result.winner === "O" ? 1 : 0),
      draws: s.draws + (result.winner === null ? 1 : 0),
    }));
    return true;
  }

  function hamsterTurn(board: Board) {
    const cell = chooseMove(board);
    setLine(anyOf(THINKING));
    animate(
      (stage, done) => stage.drawHamster(cell, done),
      () => {
        const next = place(board, cell, "O");
        if (endIfOver(next)) return;
        commit({ board: next, phase: "you" });
        setLine(anyOf(YOUR_TURN));
      },
    );
  }

  function play(cell: number) {
    const { board, phase } = latest.current;
    if (phase !== "you" || board[cell] !== null) return;
    const next = place(board, cell, "X");
    commit({ board: next, phase: "busy" });
    api.current?.setHover(null);
    animate(
      (stage, done) => stage.drawPlayer(cell, done),
      () => {
        if (!endIfOver(next)) hamsterTurn(next);
      },
    );
  }

  function playAgain() {
    commit(NEW_MATCH);
    setLine(FIRST_LINE);
    api.current?.reset();
  }

  function openCell(clientX: number, clientY: number): number | null {
    const cell = api.current?.cellAt(clientX, clientY) ?? null;
    const { board, phase } = latest.current;
    return cell !== null && phase === "you" && board[cell] === null ? cell : null;
  }

  const over = match.phase === "over";

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader links={[{ href: "/tired", label: "Games" }]} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 max-[350px]:px-3 sm:py-12">
        <PageHeading description="You against the hamster. It has a very big pen.">Tic Tac Toe</PageHeading>

        <div className="relative mt-6">
          {!failed && (
            <div
              aria-hidden="true"
              onPointerMove={(e) => {
                const cell = openCell(e.clientX, e.clientY);
                api.current?.setHover(cell);
                e.currentTarget.style.cursor = cell === null ? "default" : "pointer";
              }}
              onPointerLeave={() => api.current?.setHover(null)}
              onPointerDown={(e) => {
                const cell = e.button === 0 ? openCell(e.clientX, e.clientY) : null;
                if (cell !== null) play(cell);
              }}
              className="relative aspect-[3/2] w-full touch-manipulation select-none overflow-hidden rounded-3xl bg-well"
            >
              <canvas ref={canvas} className={`absolute inset-0 size-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} />
            </div>
          )}
          <p aria-live="polite" className="pointer-events-none absolute top-3 left-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-fg shadow-sm">
            {line}
          </p>
        </div>

        {/* Real buttons for keyboards and screen readers, shown when tabbed to or when there's no 3D. */}
        <div className={failed ? "mx-auto mt-16 w-fit" : "sr-only focus-within:not-sr-only focus-within:mx-auto focus-within:mt-4 focus-within:block focus-within:w-fit"}>
          <div className="grid grid-cols-3 gap-1.5">
            {match.board.map((square, i) => (
              <button
                key={i}
                type="button"
                onClick={() => play(i)}
                aria-disabled={match.phase !== "you" || square !== null}
                aria-label={`Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${square ?? "empty"}`}
                className="size-14 rounded-lg border border-line bg-surface text-lg font-semibold text-fg"
              >
                {square}
              </button>
            ))}
          </div>
        </div>

        <dl className="mt-4 flex justify-between gap-4 text-sm text-muted">
          <Stat label="You" value={score.you} />
          <Stat label="Draws" value={score.draws} />
          <Stat label="Hamster" value={score.hamster} />
        </dl>

        {over && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="xl" onClick={playAgain}>
              Play again
            </Button>
            <ButtonLink href="/" variant="secondary" size="xl">
              Back to work
            </ButtonLink>
          </div>
        )}
      </main>
    </div>
  );
}
