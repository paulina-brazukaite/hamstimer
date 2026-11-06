"use client";

import { update } from "@/lib/timer-store";
import { MAX_INTENTION, setIntention, start } from "@/lib/timer";

/**
 * "What are you working on?" One line, focused on load, Enter starts.
 * Uncontrolled (`defaultValue`): the browser keeps what you type, and we only
 * save it to the timer on Enter or when you click away.
 */
export function IntentionInput({ value }: { value: string }) {
  return (
    <input
      autoFocus
      type="text"
      maxLength={MAX_INTENTION}
      defaultValue={value}
      placeholder="What are you working on?"
      aria-label="Intention for this session"
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
        // Only save a real edit. Blur also fires when the input disappears (e.g. Undo
        // brings the resume card back), and saving the stale text then would
        // overwrite the session that just came back.
        if (text === value) return;
        update((s) => setIntention(s, text));
      }}
      className="w-full max-w-xl border-b border-line bg-transparent pb-2 text-center text-[17px] text-fg outline-none placeholder:text-faint focus:border-faint"
    />
  );
}
