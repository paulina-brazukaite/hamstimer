import { OG_SIZE, renderOg } from "@/lib/og";
import { TIMER_PAGES, findTimerPage } from "@/lib/timer-pages";

export const alt = "Nextline focus timer";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return TIMER_PAGES.map((p) => ({ preset: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ preset: string }> }) {
  const page = findTimerPage((await params).preset) ?? TIMER_PAGES[0];
  return renderOg({ title: page.heading, clock: page.clock });
}
