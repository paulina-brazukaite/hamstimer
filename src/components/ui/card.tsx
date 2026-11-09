import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Corner radius grows with the card's size and importance:
 * - `md` 12px: inline panels (the "Done with this?" question, the command menu)
 * - `lg` 16px: prompts (notifications)
 * - `xl` 20px: the resume card
 * - `2xl` 24px: big media cards (game tiles, game stages)
 */
export type CardRadius = "md" | "lg" | "xl" | "2xl";

const RADIUS: Record<CardRadius, string> = {
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-[20px]",
  "2xl": "rounded-3xl",
};

export interface CardStyle {
  radius?: CardRadius;
  /** Lifts the card off the page with the theme's shadow. Use for things that arrive (resume card, toast, menu). */
  raised?: boolean;
  /** Border turns stronger on hover, for cards that are links. */
  interactive?: boolean;
}

/** The class string, for elements that must be something else (e.g. a <Link>). */
export function cardClass({ radius = "md", raised = false, interactive = false }: CardStyle = {}, className?: string) {
  return cn(
    "border border-line bg-surface",
    RADIUS[radius],
    raised && "shadow-card",
    interactive && "transition-colors hover:border-faint",
    className,
  );
}

/** A surface with a border. Padding is the caller's: cards range from 16px to 36px. */
export function Card({
  as: Tag = "div",
  radius,
  raised,
  interactive,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & CardStyle & { as?: "div" | "section" | "article" | "li" }) {
  return <Tag className={cardClass({ radius, raised, interactive }, className)} {...props} />;
}
