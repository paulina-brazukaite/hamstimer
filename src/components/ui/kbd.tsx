import type { ComponentProps } from "react";
import { cn } from "./cn";

export type KbdTone = "on-fill" | "faint";

/**
 * A keyboard shortcut shown next to a label ("Resume  R"). Hidden on touch
 * screens, where it means nothing.
 * - `on-fill`: inside a filled button (primary / solid); follows the button's text colour.
 * - `faint`: anywhere else.
 */
export function Kbd({
  tone = "faint",
  className,
  ...props
}: ComponentProps<"kbd"> & { tone?: KbdTone }) {
  return (
    <kbd
      className={cn(
        "text-xs pointer-coarse:hidden",
        tone === "on-fill" ? "font-normal opacity-70" : "text-faint",
        className,
      )}
      {...props}
    />
  );
}
