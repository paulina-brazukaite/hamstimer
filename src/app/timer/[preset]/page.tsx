import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FocusScreen } from "@/components/focus-screen";
import { TIMER_PAGES, findTimerPage } from "@/lib/timer-pages";

// One template for /timer/50-10, /timer/25-5 and /timer/90-minute.
// generateStaticParams lists them, so all three are built as static HTML.
// ensureStatic: these pages must stay fully static (fast loads, instant navigation);
// Next checks that in dev and at build time.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return TIMER_PAGES.map((p) => ({ preset: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/timer/[preset]">): Promise<Metadata> {
  const page = findTimerPage((await params).preset);
  if (!page) return {};
  const url = `/timer/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url },
  };
}

export default function TimerLandingPage({ params }: PageProps<"/timer/[preset]">) {
  // Reading the URL inside <Suspense> keeps client-side navigation instant: the
  // shared shell renders right away and this part follows. The three known pages
  // are still fully prerendered, because their params are known at build time.
  return (
    <Suspense fallback={null}>
      <TimerLanding params={params} />
    </Suspense>
  );
}

async function TimerLanding({ params }: { params: Promise<{ preset: string }> }) {
  // In Next 16, params is a Promise: await it to read the URL segment.
  const page = findTimerPage((await params).preset);
  if (!page) notFound(); // any other /timer/... is a 404

  return (
    <FocusScreen
      preset={page.presetId}
      intro={
        <section className="mx-auto max-w-xl px-6 pt-10 text-center sm:pt-14">
          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{page.heading}</h1>
          {page.intro.map((p) => (
            <p key={p.slice(0, 20)} className="mt-3 text-[15px] leading-relaxed text-pretty text-muted">
              {p}
            </p>
          ))}
        </section>
      }
    />
  );
}
