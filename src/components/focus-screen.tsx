"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { PresetPicker } from "@/components/preset-picker";
import { ResumeCard } from "@/components/resume-card";
import { HamsterStage } from "@/components/hamster-stage";
import { useTabIcon } from "@/components/tab-icon";
import { hamsterPose } from "@/lib/hamster";
import { TaskView, focusLineInput } from "@/components/task-view";
import { finishTaskUndoable, getSnapshot, update } from "@/lib/timer-store";
import { SiteFooter } from "@/components/site-footer";
import { UndoToast } from "@/components/undo-toast";
import { useTimer } from "@/lib/use-timer";
import { useModKey } from "@/lib/use-stored";
import { NotifyPrompt } from "@/components/notify-prompt";
import {
  EXTENSION_MS,
  canStart,
  choosePreset,
  currentLine,
  extend,
  formatClock,
  isActive,
  isRunning,
  keepGoing,
  markCurrentDone,
  phaseLength,
  progress,
  remaining,
  stop,
  toggle,
  type PresetId,
  type TimerState,
} from "@/lib/timer";

/**
 * The app screen: progress line, header, optional intro, then the resume card or
 * the task with its timer. Used by "/" and the /timer/[preset] landing pages.
 *
 * `intro` is server-rendered content passed in as a prop, so it's in the HTML for
 * search engines even though this component runs in the browser.
 */
export function FocusScreen({ preset, intro }: { preset?: PresetId; intro?: ReactNode }) {
  const snap = useTimer();
  const saved = snap?.state;
  // A landing page like /timer/25-5 shows its preset straight away (no flash of
  // 50:00), unless a block is in progress. The effect below then saves it.
  const applyPreset = !!(preset && snap && wantsPreset(snap.state, snap.resume, preset));
  const state = applyPreset && saved && preset ? choosePreset(saved, preset) : saved;
  useEffect(() => {
    if (applyPreset && preset) update((s) => (wantsPreset(s, false, preset) ? choosePreset(s, preset) : s));
  }, [applyPreset, preset]);
  const now = snap?.now ?? 0;
  const resuming = snap?.resume ?? false;

  useDocumentTitle(state, now, resuming);
  useTabIcon(state ? hamsterPose(state, resuming) : null);
  useTimerShortcuts();

  const pct = state && !resuming ? Math.round(progress(state, now) * 1000) / 10 : 0;

  return (
    <>
    <div className="flex min-h-svh flex-col">
      <div className="h-[3px] w-full bg-line-soft" aria-hidden="true">
        <div className="h-[3px] bg-lamp transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <AppHeader links={[{ href: "/history", label: "History" }]} />

      <main className="flex flex-1 flex-col">
        {intro}
        {!state ? (
          // Before localStorage is read (server render + first client render) we show
          // nothing, so a saved task never flashes an empty screen first.
          <div className="flex-1" />
        ) : resuming ? (
          // Anchored near the top, not centred: on a tall screen centring left a big empty gap above.
          <div className="flex flex-1 flex-col items-center gap-5 px-6 pt-4 pb-10 sm:pt-8">
            <HamsterStage pose="sleep" />
            <ResumeCard state={state} now={now} />
          </div>
        ) : (
          <TimerView state={state} now={now} />
        )}
      </main>
    </div>
    <UndoToast visible={snap?.undoUntil != null} />
    <SiteFooter />
    </>
  );
}

function wantsPreset(s: TimerState, resume: boolean, preset: PresetId): boolean {
  return !resume && (s.phase === "idle" || s.phase === "complete") && s.presetId !== preset;
}

function TimerView({ state, now }: { state: TimerState; now: number }) {
  const { phase } = state;
  const running = isRunning(state);
  const active = isActive(state);
  const hasLines = state.task.lines.length > 0;
  const current = currentLine(state);
  const startable = canStart(state);
  const mod = useModKey();

  return (
    <>
      {/* Anchored near the top, not centred, so a tall screen doesn't open a big gap above. */}
      <div className="flex flex-1 flex-col items-center gap-6 px-6 pt-2 pb-10 sm:pt-6">
        <HamsterStage pose={hamsterPose(state, false)} className="mb-2" />
        <TaskView state={state} now={now} />

        {/* The clock is the frame, not the subject: lighter, smaller, and only at full
            strength while it's actually running (so paused looks paused). */}
        <div className="mt-2 flex flex-col items-center gap-3">
          <p
            className={`text-6xl leading-[0.9] font-medium tracking-[-0.055em] tabular-nums sm:text-[104px] ${
              running ? "text-fg" : "text-muted"
            }`}
            role="timer"
            aria-live="off"
          >
            <ClockText text={formatClock(remaining(state, now))} />
          </p>

          <p className="min-h-5 text-center text-sm text-faint tabular-nums">
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
            {phase === "complete" && (startable ? "Break over. Space for the next one." : "All done. Add a line, or finish the task.")}
          </p>

          {!active && <PresetPicker state={state} />}

          {hasLines && (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {(active || startable) && (
                <button
                  type="button"
                  onClick={() => update(toggle)}
                  className="min-h-11 rounded-full bg-fg px-6 text-[15px] font-semibold text-ground transition-opacity hover:opacity-85"
                >
                  {running ? "Pause" : active ? "Resume" : "Start"}
                </button>
              )}
              {active && (
                <button
                  type="button"
                  onClick={() => update(stop)}
                  className="min-h-11 rounded-full border border-line bg-surface px-5 text-[15px] transition-colors hover:border-faint"
                >
                  Stop
                </button>
              )}
              <button
                type="button"
                onClick={finishTaskUndoable}
                className="min-h-11 rounded-full px-4 text-[15px] text-muted transition-colors hover:text-fg"
              >
                Finish task
              </button>
            </div>
          )}
        </div>

        {/* Asked once, while a focus block runs: the moment a heads-up is clearly useful. */}
        {phase === "focus" && running && <NotifyPrompt />}
      </div>

      {/* Key hints: pointless on a touch screen, so hidden there. */}
      <div className="flex flex-wrap justify-center gap-x-7 gap-y-2 px-6 pb-8 text-xs text-faint pointer-coarse:hidden">
        <Hint k="Enter" label="add line" />
        {(active || startable) && <Hint k="Space" label={running ? "pause" : active ? "resume" : "start"} />}
        {current && <Hint k="D" label="done" />}
        {active && <Hint k="E" label="+15 min" />}
        {hasLines && <Hint k="A" label="type" />}
        <Hint k={`${mod} K`} label="menu" />
      </div>
    </>
  );
}

/** The tabular colon is as wide as a digit; pull it in so "24:56" reads as one number. */
function ClockText({ text }: { text: string }) {
  const [m, s] = text.split(":");
  return (
    <>
      {m}
      <span className="-mx-[0.16em]">:</span>
      {s}
    </>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <span>
      <span className="font-semibold text-fg">{k}</span> {label}
    </span>
  );
}

/**
 * Tab title, e.g. "23:14 · Write the refresh handler". Changing document.title is
 * a side effect, so it lives in useEffect, which runs after React renders.
 * With nothing going on, the page's own title (from its metadata) is put back.
 */
function useDocumentTitle(state: TimerState | undefined, now: number, resuming: boolean) {
  const pageTitle = useRef<string | null>(null); // a value that survives re-renders, like a field
  let title: string | null = null;
  if (state) {
    const label = currentLine(state)?.text || state.task.title || "Focus";
    const clock = formatClock(remaining(state, now));
    if (resuming) title = `Resume · ${label}`;
    else if (state.phase === "focus") title = `${clock} · ${label}${isRunning(state) ? "" : " (paused)"}`;
    else if (state.phase === "break") title = `${clock} · Break`;
    else if (state.phase === "complete") title = "Done · Nextline";
  }
  useEffect(() => {
    pageTitle.current ??= document.title;
    document.title = title ?? pageTitle.current;
  }, [title]);
}

/**
 * Space start/pause, D done, E +15 min, A back to typing, Esc "still on it".
 * Registered once; handlers call the store directly. Inside a text box the
 * box's own keys win (the line input handles Space itself when it's empty).
 */
function useTimerShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const snap = getSnapshot();
      if (!snap || snap.resume) return; // the resume card handles its own keys
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      if (e.code === "Space") {
        e.preventDefault(); // stop the page scrolling or a focused button "clicking"
        update(toggle);
      } else if (e.key === "e" || e.key === "E") {
        update(extend);
      } else if (e.key === "d" || e.key === "D") {
        // The line input can take focus during this key press (it replaces the
        // question), so stop the "d" from being typed into it.
        e.preventDefault();
        const asked = snap.state.askDone;
        update(markCurrentDone);
        if (asked) requestAnimationFrame(focusLineInput);
      } else if (e.key === "a" || e.key === "A") {
        e.preventDefault(); // don't type the "a" into the box that gets focus
        focusLineInput();
      } else if (e.key === "Escape" && snap.state.askDone) {
        e.preventDefault();
        update(keepGoing);
        requestAnimationFrame(focusLineInput);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
