import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "./cn";

/** A link inside running text: ink colour with a quiet underline that darkens on hover. */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn("text-fg underline decoration-line underline-offset-4 transition-colors hover:decoration-fg", className)}
      {...props}
    />
  );
}
