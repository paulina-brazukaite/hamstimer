import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "./cn";
import { Kbd } from "./kbd";

/**
 * - `primary`: amber. The one main action of a moment (Resume, Done, Play again).
 *   At most one per view; see DESIGN.md for where amber is allowed.
 * - `solid`: ink on ground. A strong action that isn't the amber one (Start, Add, Turn on).
 * - `secondary`: bordered surface. A real alternative (Stop, Export, Back to work).
 * - `outline`: bordered, muted text. A quiet alternative next to a primary (Still on it).
 * - `ghost`: text only. The least important action (Finish task, No thanks).
 */
export type ButtonVariant = "primary" | "solid" | "secondary" | "outline" | "ghost";

/**
 * - `sm` 36px: inline, inside a card or input.
 * - `md` 40px: toolbars and prompts.
 * - `lg` 44px: the main controls of a screen.
 * - `xl` 48px: big touch targets (game controls).
 */
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const BASE =
  "inline-flex items-center justify-center rounded-full whitespace-nowrap transition-[opacity,color,border-color] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg aria-disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-lamp font-semibold text-lamp-fg hover:opacity-90",
  solid: "bg-fg font-semibold text-ground hover:opacity-85",
  secondary: "border border-line bg-surface text-fg hover:border-faint",
  outline: "border border-line text-muted hover:text-fg",
  ghost: "text-muted hover:text-fg",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 gap-2.5 px-4 text-sm",
  md: "min-h-10 gap-2.5 px-4 text-sm",
  lg: "min-h-11 gap-3 px-5 text-[15px]",
  xl: "min-h-12 gap-3 px-6 text-sm max-[350px]:px-3",
};

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Keyboard shortcut shown after the label, e.g. "R" or "Esc". Hidden on touch screens. */
  shortcut?: string;
}

/** The class string, for the rare element that can't be a <Button> or <ButtonLink>. */
export function buttonClass({ variant = "secondary", size = "md" }: StyleProps = {}, className?: string): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

function Label({ children, shortcut, variant = "secondary" }: StyleProps & { children: ReactNode }) {
  return (
    <>
      {children}
      {shortcut && <Kbd tone={variant === "primary" || variant === "solid" ? "on-fill" : "faint"}>{shortcut}</Kbd>}
    </>
  );
}

export function Button({
  variant,
  size,
  shortcut,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return (
    <button type={type} className={buttonClass({ variant, size }, className)} {...props}>
      <Label variant={variant} shortcut={shortcut}>
        {children}
      </Label>
    </button>
  );
}

/** A link that looks like a button (navigation, not an action). */
export function ButtonLink({
  variant,
  size,
  shortcut,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return (
    <Link className={buttonClass({ variant, size }, className)} {...props}>
      <Label variant={variant} shortcut={shortcut}>
        {children}
      </Label>
    </Link>
  );
}
