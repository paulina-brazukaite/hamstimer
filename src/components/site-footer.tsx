import Link from "next/link";
import { TIMER_PAGES } from "@/lib/timer-pages";

const link = "transition-colors hover:text-fg";

/** Quiet links below the fold: the timer landing pages and About. Helps people and search engines find them. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line-soft px-6 py-8 sm:px-10">
      <nav
        aria-label="Site"
        className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs text-faint"
      >
        {TIMER_PAGES.map((p) => (
          <Link key={p.slug} href={`/timer/${p.slug}`} className={link}>
            {p.heading}
          </Link>
        ))}
        <Link href="/about" className={link}>
          About
        </Link>
      </nav>
    </footer>
  );
}
