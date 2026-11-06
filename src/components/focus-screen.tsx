"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { PresetPicker } from "@/components/preset-picker";
import { IntentionInput } from "@/components/intention-input";
import { NextNote, NoteBoard } from "@/components/note-board";
import { ResumeCard } from "@/components/resume-card";
import { getSnapshot, update } from "@/lib/timer-store";
import { useTimer } from "@/lib/use-timer";
import { useModKey } from "@/lib/use-stored";
import {
  EXTENSION_MS,
  extend,
  openNote,
  formatClock,
  isRunning,
  phaseLength,
  progress,
  remaining,
  stop,
  toggle,
  type TimerState,
} from "@/lib/timer";

const DEFAULT_TITLE = "Nextline · focus timer";

/** The whole "/" screen: progress line, header, then either the resume card or the timer. */
export function FocusScreen() {
  const snap = useTimer();
  const state = snap?.state;
  const now = snap?.now ?? 0;
  const resuming = snap?.resume ?? false;

  useDocumentTitle(state, now, resuming);
  useTimerShortcuts();

  const pct = state && !resuming ? Math.round(progress(state, now) * 1000) / 10 : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-0.5 w-full bg-line-soft" aria-hidden="true">
        <div className="h-0.5 bg-lamp transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <AppHeader links={[{ href: "/history", label: "History" }]} />

      {!state ? (
        // Before localStorage is read (server render + first client render) we show
        // nothing, so a saved session never flashes a default "50:00" first.
        <main className="flex-1" />
      ) : resuming ? (
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <ResumeCard state={state} now={now} />
        </main>
      ) : (
        <TimerView state={state} now={now} />
      )}
    </div>
  );
}

function TimerView({ state, now }: { state: TimerState; now: number }) {
  const { phase } = state;
  const running = isRunning(state);
  const active = phase === "focus" || phase === "break";
  const label = state.intention || "Focus";
  const showIntentionInput = !state.notePrompt && (phase === "idle" || phase === "complete");
  const mod = useModKey();

  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10">
        {showIntentionInput ? (
          // `key` remounts the input (fresh defaultValue + autofocus) when a session ends.
          <IntentionInput key={state.sessionStartedAt ?? 0} value={state.intention} />
        ) : (
          <p className="max-w-xl text-center text-[17px] text-muted">
            {phase === "break" ? `Break · ${label}` : label}
          </p>
        )}

        <p
          className="font-mono text-7xl leading-none tracking-tighter tabular-nums sm:text-[136px]"
          role="timer"
          aria-live="off"
        >
          {formatClock(remaining(state, now))}
        </p>

        <p className="min-h-5 font-mono text-[13px] text-faint">
          {phase === "focus" && (
            <>
              of {formatClock(phaseLength(state))}
              {state.extensions > 0 && ` · +${(state.extensions * EXTENSION_MS) / 60_000} min`}
              {!running && " · paused"}
            </>
          )}
          {phase === "break" && (
            <>
              {formatClock(state.breakMs)} break{!running && " · paused"} · E for 15 more minutes
            </>
          )}
          {phase === "complete" && "Session over. Nice work."}
        </p>

        {state.notePrompt ? (
          <NoteBoard prompt={state.notePrompt} previous={state.note} />
        ) : (
          <NextNote note={state.note} />
        )}

        {showIntentionInput && <PresetPicker state={state} />}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => update(toggle)}
            className="min-h-10 rounded-lg border border-line bg-surface px-5 text-sm transition-colors hover:border-faint"
          >
            {running ? "Pause" : active ? "Resume" : phase === "complete" ? "Start another" : "Start"}
          </button>
          {active && (
            <button
              type="button"
              onClick={() => update(stop)}
              className="min-h-10 rounded-lg px-4 text-sm text-muted transition-colors hover:text-fg"
            >
              Stop
            </button>
          )}
        </div>
      </main>

      <footer className="flex flex-wrap justify-center gap-7 px-6 pb-8 font-mono text-xs text-faint">
        {showIntentionInput && <Hint k="Enter" label="start" />}
        {active && !state.notePrompt && <Hint k="Space" label={running ? "pause" : "resume"} />}
        {active && <Hint k="E" label="+15 min" />}
        {phase !== "idle" && !state.notePrompt && <Hint k="N" label="note" />}
        <Hint k={`${mod} K`} label="menu" />
      </footer>
    </>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <span>
      <span className="text-fg">{k}</span> {label}
    </span>
  );
}

/**
 * Tab title, e.g. "23:14 · Fix token refresh". Changing document.title is a side
 * effect, so it lives in useEffect, which runs after React renders.
 * (A custom hook is just a function starting with "use" that calls other hooks.)
 */
function useDocumentTitle(state: TimerState | undefined, now: number, resuming: boolean) {
  let title = DEFAULT_TITLE;
  if (state) {
    const label = state.intention || "Focus";
    const clock = formatClock(remaining(state, now));
    if (resuming) title = `Resume · ${label}`;
    else if (state.phase === "focus") title = `${clock} · ${label}${isRunning(state) ? "" : " (paused)"}`;
    else if (state.phase === "break") title = `${clock} · Break`;
    else if (state.phase === "complete") title = "Done · Nextline";
  }
  useEffect(() => {
    document.title = title;
  }, [title]);
}

/** Space start/pause, E +15 min, N note. Registered once; handlers call the store directly. */
function useTimerShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (getSnapshot()?.resume) return; // the resume card handles its own keys
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      if (e.code === "Space") {
        e.preventDefault(); // stop the page scrolling or a focused button "clicking"
        update(toggle);
      } else if (e.key === "e" || e.key === "E") {
        update(extend);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault(); // don't type the "n" into the note box that opens
        update(openNote);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
