import type { ComponentProps } from "react";
import { cn } from "./cn";

/**
 * - `md`: a full-width boxed input ("What's next?").
 * - `sm`: a compact number box inside a sentence (Focus [50] min). Takes the
 *   surrounding text size.
 *
 * The big underlined "What are you working on?" input and the task title are
 * deliberately bespoke (they are the lead of the screen) and live in task-view.tsx.
 */
export type TextInputSize = "sm" | "md";

const SIZES: Record<TextInputSize, string> = {
  sm: "bg-well px-2 py-1.5",
  md: "bg-transparent px-3.5 py-3 text-[15px]",
};

export function TextInput({
  size = "md",
  className,
  ...props
}: Omit<ComponentProps<"input">, "size"> & { size?: TextInputSize }) {
  return (
    <input
      className={cn(
        "block rounded-xl border border-line text-fg outline-none placeholder:text-faint focus:border-faint",
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
