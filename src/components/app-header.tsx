"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { openCommandMenu } from "@/components/command-menu";
import { useModKey } from "@/lib/use-stored";

const navLink =
  "inline-flex min-h-9 items-center rounded-lg px-3 font-mono text-xs text-muted transition-colors hover:text-fg";

/** Logo (links home), nav links, the ⌘K menu button, theme toggle. Used on every app screen. */
export function AppHeader({ links = [] }: { links?: { href: string; label: string }[] }) {
  const mod = useModKey();
  return (
    <header className="flex items-center justify-between gap-4 px-6 pt-6 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5 rounded-lg">
        <span className="size-2 rounded-full bg-lamp" aria-hidden="true" />
        <span className="text-[15px] font-semibold tracking-tight">Nextline</span>
      </Link>
      <nav className="flex items-center gap-1">
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
