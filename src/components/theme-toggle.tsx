"use client";

import { toggleTheme } from "@/lib/theme";

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      className="min-h-10 rounded-full border border-line px-2.5 text-sm text-muted max-[350px]:px-2 sm:px-3.5 transition-colors hover:text-fg"
    >
      Theme
    </button>
  );
}
