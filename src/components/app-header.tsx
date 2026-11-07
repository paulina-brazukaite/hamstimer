"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { openCommandMenu } from "@/components/command-menu";
import { useModKey } from "@/lib/use-stored";

const navLink =
  "inline-flex min-h-10 items-center rounded-full px-2 text-sm sm:px-3.5 font-medium text-muted transition-colors hover:text-fg";

/** Logo (links home), nav links, the ⌘K menu button, theme toggle. Used on every app screen. */
export function AppHeader({ links = [] }: { links?: { href: string; label: string }[] }) {
  const mod = useModKey();
  return (
    <header className="flex items-center justify-between gap-2 px-6 pt-6 max-[350px]:px-3 sm:gap-4 sm:px-10">
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg sm:gap-2.5">
        <svg viewBox="0 0 22 22" className="size-[22px] shrink-0" aria-hidden="true">
          <rect x="1" y="15" width="20" height="4" rx="2" className="fill-fg" />
          <rect x="1" y="15" width="11" height="4" rx="2" className="fill-lamp" />
          <circle cx="12" cy="9" r="4.5" className="fill-fg" />
        </svg>
        <span className="text-base font-bold sm:text-lg tracking-[-0.02em]">Hamstimer</span>
      </Link>
      <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={navLink}>
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={openCommandMenu}
          className={navLink}
          aria-label="Open command menu"
        >
          {/* Keyboard users see the shortcut; touch screens get a plain label. */}
          <span className="pointer-coarse:hidden">{mod} K</span>
          <span className="hidden pointer-coarse:inline">Menu</span>
        </button>
        <ThemeToggle />
      </nav>
    </header>
  );
}
