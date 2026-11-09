import { cn } from "./cn";

/**
 * Amber progress on a quiet track. Always decorative (aria-hidden): the same
 * information is in text nearby ("Paused at 12 of 50 min", the clock).
 * - `xs` 2px, rounded: inside a card.
 * - `sm` 3px, square: the full-width line at the top of the timer.
 * - `md` 6px, rounded: game progress.
 */
export type ProgressBarSize = "xs" | "sm" | "md";

const SIZES: Record<ProgressBarSize, { track: string; fill: string }> = {
  xs: { track: "h-0.5 rounded-full", fill: "rounded-full" },
  sm: { track: "h-[3px]", fill: "transition-[width] duration-300" },
  md: { track: "h-1.5 overflow-hidden rounded-full", fill: "rounded-full" },
};

export function ProgressBar({
  value,
  size = "xs",
  className,
}: {
  /** 0 to 1. */
  value: number;
  size?: ProgressBarSize;
  className?: string;
}) {
  const s = SIZES[size];
  const pct = Math.min(1, Math.max(0, value)) * 100;
  return (
    <div className={cn("w-full bg-line-soft", s.track, className)} aria-hidden="true">
      <div className={cn("h-full bg-lamp", s.fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}
