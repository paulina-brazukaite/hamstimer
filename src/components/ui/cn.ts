/**
 * Joins class names, skipping falsy ones: cn("a", cond && "b").
 *
 * It does not merge conflicting Tailwind utilities. If a primitive sets `px-4`,
 * passing `px-6` in `className` is not guaranteed to win, so add a size or
 * variant to the primitive instead of overriding its spacing or colours.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
