import type { ComponentProps } from "react";
import { cn } from "./cn";

/**
 * A small pill you pick from a set (focus lengths). The caller supplies the
 * group semantics, e.g. role="radio" + aria-checked inside a role="radiogroup".
 */
export function Chip({
  selected = false,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        "min-h-10 rounded-full border px-4 text-sm tabular-nums transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        selected ? "border-fg font-semibold text-fg" : "border-line text-muted hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}
