"use client";

import { useEffect, useRef, useState } from "react";
import { update } from "@/lib/timer-store";
import { LEAD_SIZE } from "@/components/lead";
import {
  MAX_LINE,
  MAX_TITLE,
  addLine,
  currentLine,
  formatClock,
  keepGoing,
  lineFocusedMs,
  markCurrentDone,
  remaining,
  removeLine,
  setCurrent,
  setTitle,
  toggle,
  toggleDone,
  type Line,
  type TimerState,
} from "@/lib/timer";

export const LINE_INPUT_ID = "line-input";

/** A (keyboard) shortcut elsewhere can put the cursor back in the line input. */
export function focusLineInput() {
  document.getElementById(LINE_INPUT_ID)?.focus();
}

/**
 * The task: optional title, its lines (the current one marked, with the clock
 * beside it while focusing), the input for the next line, and the "Done with
 * this?" question when a focus block ends.
 */
export function TaskView({ state, now }: { state: TimerState; now: number }) {
  const { lines } = state.task;
  const current = currentLine(state);

  if (lines.length === 0) {
    return (
      <div className="flex w-full max-w-xl flex-col items-center gap-3">
        <LineInput big hasLines={false} />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col">
      <TitleInput key={state.task.id} value={state.task.title} />

      <ol className="mt-3 flex flex-col gap-0.5" aria-label="Lines">
        {lines.map((line) => (
          <LineRow
            key={line.id}
            line={line}
            current={line.id === state.task.currentId}
            clock={line.id === state.task.currentId && state.phase === "focus" ? formatClock(remaining(state, now)) : null}
            focusedMs={lineFocusedMs(state, line, now)}
          />
        ))}
      </ol>

      {state.askDone && current ? <DoneQuestion line={current} /> : <LineInput big={false} hasLines />}
    </div>
  );
}

function TitleInput({ value }: { value: string }) {
  return (
    <input
      type="text"
      maxLength={MAX_TITLE}
      defaultValue={value}
      placeholder="Name this task (optional)"
      aria-label="Task name"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const text = e.currentTarget.value;
        if (text !== value) update((s) => setTitle(s, text));
      }}
      className="w-full bg-transparent pb-1 text-2xl font-bold tracking-[-0.03em] text-fg outline-none placeholder:font-normal placeholder:text-faint sm:text-[30px]"
    />
  );
}

function LineRow({
  line,
  current,
  clock,
  focusedMs,
}: {
  line: Line;
  current: boolean;
  clock: string | null;
  focusedMs: number;
}) {
  const done = line.doneAt !== null;
  const minutes = Math.round(focusedMs / 60_000);
  return (
    <li
      aria-current={current ? "step" : undefined}
      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3.5 ${
        current ? "border border-line bg-surface" : "border border-transparent"
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark “${line.text}” not done` : `Mark “${line.text}” done`}
        onClick={() => update((s, now) => toggleDone(s, line.id, now))}
        className={`flex size-[18px] flex-none items-center justify-center rounded-[5px] border text-[11px] transition-colors ${
          done
            ? "border-faint bg-faint text-ground"
            : current
              ? "border-2 border-fg hover:bg-lamp/30"
              : "border-faint/60 hover:border-fg"
        }`}
      >
        {done && (
          <svg viewBox="0 0 24 24" className="size-[11px]" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </button>

      {done || current ? (
        <span
          className={`min-w-0 flex-1 py-2 text-[15px] leading-snug break-words ${
            done ? "text-faint line-through decoration-faint/60" : "font-medium text-fg"
          }`}
        >
          {line.text}
        </span>
      ) : (
        // An undone line you're not on: click to work on it instead.
        <button
          type="button"
          onClick={() => update((s, now) => setCurrent(s, line.id, now))}
          title="Work on this now"
          className="min-w-0 flex-1 py-2 text-left text-[15px] leading-snug break-words text-muted transition-colors hover:text-fg"
        >
          {line.text}
        </button>
      )}

      <Pomodoros count={line.pomodoros} lit={current} />
      {clock ? (
        <span className="text-[13px] font-bold text-lamp-ink tabular-nums">{clock}</span>
      ) : (
        minutes > 0 && (
          <span className="text-xs text-faint tabular-nums" title="Focus time on this line">
            {minutes} min
          </span>
        )
      )}

      <button
        type="button"
        aria-label={`Remove “${line.text}”`}
        onClick={() => update((s, now) => removeLine(s, line.id, now))}
        className="-mr-1 flex size-7 flex-none items-center justify-center rounded-md text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-fg focus-visible:opacity-100 pointer-coarse:hidden"
      >
        ×
      </button>
    </li>
  );
}

/** Up to four dots, then "×n". Amber on the current line. */
export function Pomodoros({ count, lit }: { count: number; lit: boolean }) {
  if (count <= 0) return null;
  const color = lit ? "bg-lamp" : "bg-faint/70";
  const label = `${count} pomodoro${count === 1 ? "" : "s"}`;
  if (count > 4) {
    return (
      <span className={`text-xs ${lit ? "text-lamp-ink" : "text-faint"}`} title={label} aria-label={label}>
        ●×{count}
      </span>
    );
  }
  return (
    <span className="flex gap-1" title={label} aria-label={label} role="img">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`size-[7px] rounded-full ${color}`} />
      ))}
    </span>
  );
}

/**
 * "What are you working on?" Enter adds a line and keeps the cursor here, so
 * you can add several. Space in an empty box starts or pauses the timer, so you
 * never have to leave it. Esc hands the keyboard back to the shortcuts.
 */
function LineInput({ big, hasLines }: { big: boolean; hasLines: boolean }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  // Don't steal focus from somewhere else on the page (e.g. the title box).
  useEffect(() => {
    const a = document.activeElement;
    if (!a || a === document.body) ref.current?.focus();
  }, []);

  return (
    <div className={big ? "w-full" : "mt-3 w-full"}>
      <input
        ref={ref}
        id={LINE_INPUT_ID}
        type="text"
        maxLength={MAX_LINE}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={hasLines ? "What's next?" : "What are you working on?"}
        aria-label="Add a line: what you're working on"
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!text.trim()) return;
            update((s, now) => addLine(s, text, now));
            setText("");
          } else if (e.key === " " && text === "") {
            e.preventDefault();
            update(toggle);
          } else if (e.key === "Escape") {
            e.currentTarget.blur();
          }
        }}
        className={
          big
            ? `block w-full border-b border-line bg-transparent pb-2 text-center leading-snug font-semibold tracking-tight text-fg outline-none placeholder:font-normal placeholder:text-faint focus:border-faint ${LEAD_SIZE}`
            : "block w-full rounded-xl border border-line bg-transparent px-3.5 py-3 text-[15px] text-fg outline-none placeholder:text-faint focus:border-faint"
        }
      />
    </div>
  );
}

/** Replaces the input when a focus block ends: one question, two answers. */
function DoneQuestion({ line }: { line: Line }) {
  const done = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Put the keyboard on "Done", unless you're halfway through typing something.
    const a = document.activeElement;
    if (a instanceof HTMLInputElement && a.value) return;
    done.current?.focus();
  }, []);

  return (
    <div role="group" aria-label="Focus done" className="mt-3 rounded-xl border border-line bg-surface p-4">
      <p className="text-[15px] text-fg">
        Done with <span className="font-medium">“{line.text}”</span>?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          ref={done}
          type="button"
          onClick={() => {
            update(markCurrentDone);
            requestAnimationFrame(focusLineInput);
          }}
          className="inline-flex min-h-9 items-center gap-2.5 rounded-full bg-lamp px-5 text-sm font-semibold text-lamp-fg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          Done
          <kbd className="text-xs opacity-70 pointer-coarse:hidden">D</kbd>
        </button>
        <button
          type="button"
          onClick={() => update(keepGoing)}
          className="inline-flex min-h-9 items-center gap-2.5 rounded-full border border-line px-4 text-sm text-muted transition-colors hover:text-fg"
        >
          Still on it
          <kbd className="text-xs text-faint pointer-coarse:hidden">Esc</kbd>
        </button>
      </div>
    </div>
  );
}
