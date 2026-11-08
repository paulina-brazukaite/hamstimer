import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About",
  description: "BusyHamster is a small focus timer that remembers where your head was.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <div className="flex min-h-svh flex-col">
        <AppHeader links={[{ href: "/", label: "Timer" }]} />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">About BusyHamster</h1>

          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-pretty text-muted">
            <p>
              Most timers are good at telling you to stop. BusyHamster cares about the moment after: coming back to
              your work and knowing straight away where you were.
            </p>
            <p>
              Type what you&apos;re working on and press Enter, then run a pomodoro on it. Add the next step as you
              go, and tick lines off as you finish them. When you return, the line you were on is the first thing
              you see, and one key picks it back up.
            </p>
          </div>

          <h2 className="mt-12 text-lg font-semibold tracking-tight text-fg">Your data</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">
            There&apos;s no account. Your tasks and their steps are stored in your own browser and never sent to us.
            You can download everything as a file from{" "}
            <Link href="/history" className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg">
              History
            </Link>{" "}
            at any time. It also works offline, and you can install it as an app.
          </p>

          <p className="mt-12">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-5 text-[15px] text-fg transition-colors hover:border-faint"
            >
              Open the timer
            </Link>
          </p>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
