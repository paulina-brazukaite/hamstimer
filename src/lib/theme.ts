import { KEYS, writeJSON } from "./storage";

export type Theme = "dark" | "light";

// The current theme lives on <html data-theme>, set before first paint by the
// inline script in layout.tsx. Flipping it is just changing that attribute.
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function toggleTheme(): void {
  const next: Theme = currentTheme() === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  writeJSON(KEYS.theme, next);
}
