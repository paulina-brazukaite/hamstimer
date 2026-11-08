"use client";

import Link from "next/link";
import { PeekMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { openCommandMenu } from "@/components/command-menu";
import { useModKey } from "@/lib/use-stored";

const navLink =
  "inline-flex min-h-10 items-center rounded-full px-2 text-sm max-[350px]:px-1.5 sm:px-3.5 font-medium text-muted transition-colors hover:text-fg";

/** Logo (links home), nav links, the ⌘K menu button, theme toggle. Used on every app screen. */
export function AppHeader({ links = [] }: { links?: { href: string; label: string }[] }) {
  const mod = useModKey();
  return (
    <header className="flex items-center justify-between gap-2 px-6 pt-6 max-[350px]:px-3 sm:gap-4 sm:px-10">
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg sm:gap-2.5">
        <PeekMark className="h-[18px] w-7 shrink-0 max-[350px]:h-[14px] max-[350px]:w-[22px] sm:h-[22px] sm:w-[34px]" />
        {/* With two links there's no room for the name on a phone; the logo stays and screen readers still get it. */}
        <span className={`text-base max-[350px]:text-sm font-bold sm:text-lg tracking-[-0.02em] ${links.length > 1 ? "max-[420px]:sr-only" : ""}`}>BusyHamster</span>
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
