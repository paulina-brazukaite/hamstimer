// Content for the /timer/[preset] landing pages. One template renders them all
// (src/app/timer/[preset]/page.tsx); add a page by adding an entry here.

import type { PresetId } from "./timer";

export interface TimerPage {
  slug: string;
  presetId: PresetId;
  /** Shown big on the page. */
  heading: string;
  /** <title> (the layout adds " · Nextline"). */
  title: string;
  description: string;
  /** Short and unique per page: a couple of paragraphs, no filler. */
  intro: string[];
  /** Big clock text on the OG image. */
  clock: string;
}

export const TIMER_PAGES: TimerPage[] = [
  {
    slug: "50-10",
    presetId: "50-10",
    heading: "50/10 focus timer",
    title: "50/10 timer: 50 minutes focus, 10 minutes break",
    description:
      "A 50/10 focus timer. Fifty minutes of focus, a ten-minute break, and a list of steps so the next block starts where this one ended.",
    intro: [
      "Fifty minutes is long enough to get properly into a problem and short enough that you'll actually stop. Ten minutes off is a real break: stand up, refill, look out of a window.",
      "Type what you're doing and press Enter. When the break arrives, tick it off or keep going, and type the next step, so the next block starts where this one ended.",
    ],
    clock: "50:00",
  },
  {
    slug: "25-5",
    presetId: "25-5",
    heading: "25/5 focus timer",
    title: "25/5 timer: 25 minutes focus, 5 minutes break",
    description:
      "A 25/5 focus timer for short, steady cycles. Type what you're on, work for 25 minutes, rest for 5, and add the next step as you go.",
    intro: [
      "Twenty-five on, five off is the classic short cycle. It works best for things that are easy to put off: inbox, admin, or the first steps of a task that feels too big.",
      "Type what you're on and press Enter. Five minutes is short, so when the break arrives, type the next step and come straight back to it.",
    ],
    clock: "25:00",
  },
  {
    slug: "90-minute",
    presetId: "90-15",
    heading: "90-minute focus timer",
    title: "90-minute timer for deep work (90/15)",
    description:
      "A 90-minute focus timer for deep work: writing, design, hard code. A 15-minute break, +15 minutes with one key, and your steps to pick up from.",
    intro: [
      "Ninety minutes is a deep-work block: enough time for writing, design or hard code to really get going. Take the full fifteen-minute break afterwards; you'll have earned it.",
      "If you're mid-thought when the break arrives, press E for fifteen more minutes. When you do stop, type the very next step. Future you will be grateful.",
    ],
    clock: "90:00",
  },
];

export function findTimerPage(slug: string): TimerPage | undefined {
  return TIMER_PAGES.find((p) => p.slug === slug);
}
