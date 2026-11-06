/**
 * Type for the lead line: the one thing to act on (the intention while you work,
 * the next step on the resume card). Long text steps down a size so a
 * 120-character intention doesn't become a wall of bold on a phone.
 */
const BASE = "leading-snug font-semibold tracking-tight break-words text-fg";

export const LEAD_SIZE = "text-2xl sm:text-[28px]";
const LONG_SIZE = "text-xl sm:text-2xl";
const LONG_AFTER = 60; // characters

export function leadClass(text: string, wrap: "balance" | "pretty" = "balance"): string {
  const size = text.length > LONG_AFTER ? LONG_SIZE : LEAD_SIZE;
  return `${BASE} ${size} ${wrap === "balance" ? "text-balance" : "text-pretty"}`;
}
