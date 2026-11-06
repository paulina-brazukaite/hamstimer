"use client";

import { KEYS, writeJSON } from "@/lib/storage";

// The current theme lives on <html data-theme>, set before first paint by the
// inline script in layout.tsx. This button only flips that attribute and saves it.
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    writeJSON(KEYS.theme, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className="min-h-9 rounded-lg border border-line px-3 font-mono text-xs text-muted transition-colors hover:text-fg"
    >
      Theme
    </button>
  );
}
