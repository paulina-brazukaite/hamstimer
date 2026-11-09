"use client";

import { useEffect } from "react";
import { finishTaskUndoable, update } from "@/lib/timer-store";
import { currentLine, formatAgo, resumeSession, type TimerState } from "@/lib/timer";
import { leadClass } from "@/components/lead";
import { Pomodoros } from "@/components/task-view";
import { Button, Card, ProgressBar } from "@/components/ui";

const MIN = 60_000;

/**
 * The first thing you see when you come back to an unfinished task: the line you
 * were on leads, the task gives it context. R resumes, Esc finishes the task
 * (undoable for a few seconds). The only animated element in the product.
 */
export function ResumeCard({ state, now }: { state: TimerState; now: number }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return; // e.g. typing in the command menu
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        update(resumeSession);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finishTaskUndoable();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const line = currentLine(state) ?? state.task.lines.find((l) => l.doneAt === null);
  const { lines, title } = state.task;
  const doneCount = lines.filter((l) => l.doneAt !== null).length;
  const ago = state.leftAt === null ? "" : formatAgo(now - state.leftAt);
  const pausedMidBlock = state.phase === "focus";
  const share = Math.min(1, state.elapsedMs / state.focusMs);

  if (!line) return null;

  return (
    <Card
      as="section"
      radius="xl"
      raised
      role="dialog"
      aria-labelledby="resume-lead"
      className="animate-rise-in w-full max-w-lg p-7 sm:p-9"
    >
      <p className="text-xs text-faint">
        Where you left off{ago && <> · {ago}</>}
      </p>

      <p className="mt-4 text-[15px] leading-snug text-pretty text-muted">
        {title && <>{title} · </>}
        {doneCount} of {lines.length} {lines.length === 1 ? "line" : "lines"} done
      </p>
      {/* "pretty", not "balance": balancing around the inline label leaves a short first line. */}
      <h1 id="resume-lead" className={`mt-2 ${leadClass(line.text, "pretty")}`}>
        <span className="mr-1 align-[0.2em] text-sm font-normal tracking-normal text-lamp-ink">↳ now</span>{" "}
        {line.text}
      </h1>

      <div className="mt-5 flex items-center gap-3 text-xs text-faint">
        <Pomodoros count={line.pomodoros} lit />
        <span>
          {line.pomodoros === 0
            ? "No pomodoros on this yet"
            : `${line.pomodoros} pomodoro${line.pomodoros === 1 ? "" : "s"} so far`}
        </span>
      </div>

      {pausedMidBlock && (
        <div className="mt-5">
          <ProgressBar value={share} />
          <p className="mt-2.5 text-xs text-faint tabular-nums">
            Paused at {Math.round(state.elapsedMs / MIN)} of {Math.round(state.focusMs / MIN)} min
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button variant="primary" size="lg" shortcut="R" autoFocus onClick={() => update(resumeSession)}>
          Resume
        </Button>
        <Button variant="outline" size="lg" shortcut="Esc" onClick={finishTaskUndoable}>
          Finish task
        </Button>
      </div>
    </Card>
  );
}
