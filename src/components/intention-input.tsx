"use client";

import { update } from "@/lib/timer-store";
import { MAX_INTENTION, setIntention, start } from "@/lib/timer";
import { LEAD_SIZE } from "@/components/lead";

/**
 * "What are you working on?" One line, focused on load, Enter starts.
 *
 * A one-row textarea rather than an <input>, so a long intention wraps and stays
 * readable at lead size instead of scrolling out of view (`field-sizing: content`
 * grows it; browsers without it keep one scrolling row). Enter never adds a
 * newline, and setIntention collapses any pasted ones.
 *
 * Uncontrolled (`defaultValue`): the browser keeps what you type, and we only
 * save it to the timer on Enter or when you click away.
 */
export function IntentionInput({ value }: { value: string }) {
  return (
    <textarea
      autoFocus
      rows={1}
      maxLength={MAX_INTENTION}
      defaultValue={value}
      placeholder="What are you working on?"
      aria-label="Intention for this session"
      // "Start another" pre-fills the last intention: selected, so typing replaces it and Enter reuses it.
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const text = e.currentTarget.value;
          update((s, now) => start(setIntention(s, text), now));
        } else if (e.key === "Escape") {
          e.currentTarget.blur(); // hands Space back to start/pause
        }
      }}
      onBlur={(e) => {
        const text = e.currentTarget.value;
        // Only save a real edit. Blur also fires when the box disappears (e.g. Undo
        // brings the resume card back), and saving the stale text then would
        // overwrite the session that just came back.
        if (text === value) return;
        update((s) => setIntention(s, text));
      }}
      className={`field-sizing-content block w-full max-w-xl resize-none overflow-hidden border-b border-line bg-transparent pb-2 text-center leading-snug font-semibold tracking-tight text-balance text-fg outline-none placeholder:font-normal placeholder:text-faint focus:border-faint ${LEAD_SIZE}`}
    />
  );
}
