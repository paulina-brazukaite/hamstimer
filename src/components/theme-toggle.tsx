"use client";

import { toggleTheme } from "@/lib/theme";

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      className="min-h-10 rounded-full border border-line px-3.5 text-sm text-muted transition-colors hover:text-fg"
    >
      Theme
    </button>
  );
}
