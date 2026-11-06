"use client";

import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PresetPicker } from "@/components/preset-picker";
import { update } from "@/lib/timer-store";
import { useTimer } from "@/lib/use-timer";
import {
  EXTENSION_MS,
  extend,
  formatClock,
  isRunning,
  phaseLength,
  progress,
  remaining,
  stop,
  toggle,
} from "@/lib/timer";
import { IntentionInput } from "@/components/intention-input";
import { NextNote, NoteBoard } from "@/components/note-board";

const DEFAULT_TITLE = "Nextline · focus timer";

export function FocusScreen() {
  const snap = useTimer();
  const state = snap?.state;
  const now = snap?.now ?? 0;

  const phase = state?.phase ?? "idle";
  const running = state ? isRunning(state) : false;
  const clock = state ? formatClock(remaining(state, now)) : "50:00";
  const label = state?.intention || "Focus";

  // Tab title, e.g. "23:14 · Fix token refresh". Changing document.title is a
  // side effect, so it lives in useEffect, which runs after React renders.
  let title = DEFAULT_TITLE;
  if (phase === "focus") title = `${clock} · ${label}${running ? "" : " (paused)"}`;
  if (phase === "break") title = `${clock} · Break`;
  if (phase === "complete") title = "Done · Nextline";
  useEffect(() => {
    document.title = title;
  }, [title]);

  // Global shortcuts. Registered once; the handlers call the store directly,
  // so they never see stale state.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      if (e.code === "Space") {
        e.preventDefault(); // stop the page scrolling or a focused button "clicking"
        update(toggle);
      } else if (e.key === "e" || e.key === "E") {
        update(extend);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = phase === "focus" || phase === "break";
  const showIntentionInput = state && !state.notePrompt && (phase === "idle" || phase === "complete");
  const pct = state ? Math.round(progress(state, now) * 1000) / 10 : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-0.5 w-full bg-line-soft" aria-hidden="true">
        <div className="h-0.5 bg-lamp transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <header className="flex items-center justify-between gap-4 px-6 pt-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-lamp" aria-hidden="true" />
          <span className="text-[15px] font-semibold tracking-tight">Nextline</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Hidden until localStorage is read, so a saved session never flashes "50:00" first. */}
      <main
        className={`flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 ${state ? "" : "invisible"}`}
      >
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
          {clock}
        </p>

        <p className="min-h-5 font-mono text-[13px] text-faint">
          {state && phase === "focus" && (
            <>
              of {formatClock(phaseLength(state))}
              {state.extensions > 0 && ` · +${(state.extensions * EXTENSION_MS) / 60_000} min`}
              {!running && " · paused"}
            </>
          )}
          {state && phase === "break" && (
            <>
              {formatClock(state.breakMs)} break{!running && " · paused"} · E for 15 more minutes
            </>
          )}
          {state && phase === "complete" && "Session over. Nice work."}
        </p>

        {state?.notePrompt ? (
          <NoteBoard prompt={state.notePrompt} previous={state.note} />
        ) : (
          <NextNote note={state?.note ?? ""} />
        )}

        {state && !state.notePrompt && (phase === "idle" || phase === "complete") && (
          <PresetPicker state={state} />
        )}

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
        {showIntentionInput && (
          <span>
            <span className="text-fg">Enter</span> start
          </span>
        )}
        {active && !state?.notePrompt && (
          <span>
            <span className="text-fg">Space</span> {running ? "pause" : "resume"}
          </span>
        )}
        {active && (
          <span>
            <span className="text-fg">E</span> +15 min
          </span>
        )}
      </footer>
    </div>
  );
}
