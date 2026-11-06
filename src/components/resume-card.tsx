"use client";

import { useEffect } from "react";
import { update } from "@/lib/timer-store";
import { formatAgo, resumeSession, startFresh, type TimerState } from "@/lib/timer";

const MIN = 60_000;

/**
 * The first thing you see when you come back to an unfinished session.
 * R resumes, Esc starts fresh. The only animated element in the product.
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
        update(startFresh);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focusedMin = Math.round(state.focusedMs / MIN);
  const targetMin = Math.round(state.focusMs / MIN);
  const share = Math.min(1, state.focusedMs / state.focusMs);
  const ago = state.leftAt === null ? "" : formatAgo(now - state.leftAt);

  return (
    <section
      role="dialog"
      aria-labelledby="resume-intention"
      className="animate-rise-in w-full max-w-lg rounded-2xl border border-line bg-surface p-7 shadow-card sm:p-9"
    >
      <p className="font-mono text-xs text-faint">
        Where you left off{ago && <> · {ago}</>}
      </p>

      <h1
        id="resume-intention"
        className="mt-4 text-2xl leading-snug font-semibold tracking-tight text-balance text-fg sm:text-[28px]"
      >
        {state.intention}
      </h1>

      {state.note && (
        <p className="mt-3 text-[17px] leading-relaxed text-muted">
          <span className="mr-2 font-mono text-xs text-lamp">↳ next</span>
          {state.note}
        </p>
      )}

      <div className="mt-7">
        <div className="h-0.5 w-full rounded-full bg-line-soft" aria-hidden="true">
          <div className="h-0.5 rounded-full bg-lamp" style={{ width: `${share * 100}%` }} />
        </div>
        <p className="mt-2.5 font-mono text-xs text-faint tabular-nums">
          {focusedMin} of {targetMin} min
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => update(resumeSession)}
          className="inline-flex min-h-11 items-center gap-3 rounded-lg bg-lamp px-5 text-[15px] font-medium text-lamp-fg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lamp"
        >
          Resume
          <kbd className="font-mono text-xs opacity-70 pointer-coarse:hidden">R</kbd>
        </button>
        <button
          type="button"
          onClick={() => update(startFresh)}
          className="inline-flex min-h-11 items-center gap-3 rounded-lg px-4 text-[15px] text-muted transition-colors hover:text-fg"
        >
          Start fresh
          <kbd className="font-mono text-xs text-faint pointer-coarse:hidden">Esc</kbd>
        </button>
      </div>
    </section>
  );
}
