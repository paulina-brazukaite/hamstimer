"use client";

import { toggleTheme } from "@/lib/theme";

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      className="min-h-9 rounded-lg border border-line px-3 font-mono text-xs text-muted transition-colors hover:text-fg"
    >
      Theme
    </button>
  );
}
