import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * The h1 at the top of a page, with an optional one-line description under it.
 * - `md`: app screens (History, Tired?, the games).
 * - `lg`: reading pages (About, Blog); a step bigger from the sm breakpoint.
 */
export function PageHeading({
  children,
  description,
  size = "md",
  className,
}: {
  children: ReactNode;
  description?: ReactNode;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={className}>
      <h1 className={cn("text-2xl font-semibold tracking-tight", size === "lg" && "sm:text-3xl")}>{children}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  );
}
