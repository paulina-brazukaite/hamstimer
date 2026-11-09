"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { update } from "@/lib/timer-store";
import { LEAD_SIZE } from "@/components/lead";
import { Button, Card, TextInput, cn } from "@/components/ui";
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
 * "What are you working on?" Enter (or the Add button that appears once you've
 * typed something) adds a line and keeps the cursor here, so you can add
 * several. Space in an empty box starts or pauses the timer, so you never have
 * to leave it. Esc hands the keyboard back to the shortcuts.
 */
function LineInput({ big, hasLines }: { big: boolean; hasLines: boolean }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const canAdd = text.trim() !== "";

  // Don't steal focus from somewhere else on the page (e.g. the title box).
  useEffect(() => {
    const a = document.activeElement;
    if (!a || a === document.body) ref.current?.focus();
  }, []);

  function add() {
    if (!canAdd) return;
    update((s, now) => addLine(s, text, now));
    setText("");
    ref.current?.focus(); // ready for the next line
  }

  const inputProps = {
    ref,
    id: LINE_INPUT_ID,
    type: "text",
    maxLength: MAX_LINE,
    value: text,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    placeholder: hasLines ? "What's next?" : "What are you working on?",
    "aria-label": "Add a line: what you're working on",
    autoComplete: "off",
    enterKeyHint: "done",
    onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        add();
      } else if (e.key === " " && text === "") {
        e.preventDefault();
        update(toggle);
      } else if (e.key === "Escape") {
        e.currentTarget.blur();
      }
    },
  } as const;

  return (
    <div className={cn("relative w-full", !big && "mt-3")}>
      {big ? (
        // The lead of an empty screen, so deliberately not a <TextInput>. Padding only while the button shows (equal
        // on both sides keeps text centred); otherwise the full width is free so the placeholder isn't clipped.
        <input
          {...inputProps}
          className={`block w-full border-b border-line bg-transparent pb-2 text-center leading-snug font-semibold tracking-tight text-fg outline-none placeholder:font-normal placeholder:text-faint focus:border-faint ${canAdd ? "px-[4.5rem] sm:px-24" : "px-0"} ${LEAD_SIZE}`}
        />
      ) : (
        <TextInput {...inputProps} className={cn("w-full", canAdd && "pr-24")} />
      )}
      {canAdd && (
        <Button
          variant="solid"
          size="sm"
          shortcut="↵"
          aria-label="Add line"
          // Keep focus (and the phone keyboard) in the input while tapping the button.
          onMouseDown={(e) => e.preventDefault()}
          onClick={add}
          className={cn("absolute top-1/2 -translate-y-1/2", big ? "right-0" : "right-1.5")}
        >
          Add
        </Button>
      )}
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
    <Card role="group" aria-label="Focus done" className="mt-3 p-4">
      <p className="text-[15px] text-fg">
        Done with <span className="font-medium">“{line.text}”</span>?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          ref={done}
          variant="primary"
          size="sm"
          shortcut="D"
          onClick={() => {
            update(markCurrentDone);
            requestAnimationFrame(focusLineInput);
          }}
        >
          Done
        </Button>
        <Button variant="outline" size="sm" shortcut="Esc" onClick={() => update(keepGoing)}>
          Still on it
        </Button>
      </div>
    </Card>
  );
}
