"use client";

import { useState, type ReactNode } from "react";

/**
 * The short explanation on "/" for first-time visitors.
 *
 * Whether you're new is decided by CSS, not React: the before-paint script in
 * layout.tsx sets <html data-returning> for people who have used the app, and
 * globals.css then hides the full text and shows a one-line "What is Nextline?"
 * instead. That way the server HTML is the same for everyone (search engines see
 * the full text) and nothing jumps around after the page loads.
 */
export function FirstVisitIntro({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`first-visit px-6 pt-10 text-center sm:pt-14 ${open ? "is-open" : ""}`}>
      <div className="first-visit-full mx-auto max-w-xl">{children}</div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="first-visit-toggle mx-auto font-mono text-xs text-faint transition-colors hover:text-fg"
      >
        {open ? "Hide" : "What is Nextline?"}
      </button>
    </section>
  );
}
