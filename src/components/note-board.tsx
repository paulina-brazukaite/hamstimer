"use client";

import { update } from "@/lib/timer-store";
import { MAX_NOTE, dismissNote, saveNote, type NotePrompt } from "@/lib/timer";

const HEADINGS: Record<NotePrompt, string> = {
  pause: "Paused",
  stop: "Stopped",
  end: "Focus done",
};

/**
 * The "Where was I?" board. Mounted only while a prompt is open, so `autoFocus`
 * puts the cursor in the input the instant it appears: no click needed.
 */
export function NoteBoard({ prompt, previous }: { prompt: NotePrompt; previous: string }) {
  return (
    <div
      role="dialog"
      aria-label="Where was I?"
      className="w-full max-w-lg rounded-xl border border-line bg-surface p-5 shadow-card"
    >
      <div className="mb-3 flex items-baseline justify-between gap-4 font-mono text-xs">
        <span className="text-fg">Where was I?</span>
        <span className="text-faint">{HEADINGS[prompt]}</span>
      </div>

      <input
        autoFocus
        type="text"
        maxLength={MAX_NOTE}
        defaultValue=""
        placeholder={previous ? `Still: ${previous}` : "The very next step, in a few words"}
        aria-label="Your next step"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const text = e.currentTarget.value;
            update((s) => saveNote(s, text));
          } else if (e.key === "Escape") {
            e.preventDefault();
            update(dismissNote);
          }
        }}
        className="w-full border-b border-line bg-transparent pb-2 text-[17px] text-fg outline-none placeholder:text-faint focus:border-faint"
      />

      <div className="mt-3 flex gap-5 font-mono text-xs text-faint">
        <span>
          <span className="text-fg">Enter</span> save
        </span>
        <span>
          <span className="text-fg">Esc</span> skip
        </span>
      </div>
    </div>
  );
}

/** "↳ next  Check refresh token expiry". Amber "next" is one of the three lamp uses. */
export function NextNote({ note }: { note: string }) {
  if (!note) return null;
  return (
    <p className="max-w-xl text-center text-[15px] text-muted">
      <span className="mr-2 font-mono text-xs text-lamp">↳ next</span>
      {note}
    </p>
  );
}
