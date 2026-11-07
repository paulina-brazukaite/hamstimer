import type { ReactNode } from "react";

/**
 * The short explanation on "/" for first-time visitors.
 *
 * Whether you're new is decided by CSS, not React: the before-paint script in
 * layout.tsx sets <html data-returning> for people who have used the app, and
 * globals.css then hides this section. That way the server HTML is the same for
 * everyone (search engines see the full text) and nothing jumps around after
 * the page loads.
 */
export function FirstVisitIntro({ children }: { children: ReactNode }) {
  return (
    <section className="first-visit px-6 pt-10 text-center sm:pt-14">
      <div className="mx-auto max-w-xl">{children}</div>
    </section>
  );
}
