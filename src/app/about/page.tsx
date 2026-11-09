import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink, PageHeading, TextLink } from "@/components/ui";

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
          <PageHeading size="lg">About BusyHamster</PageHeading>

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
            <TextLink href="/history">History</TextLink>{" "}
            at any time. It also works offline, and you can install it as an app.
          </p>

          <p className="mt-12">
            <ButtonLink href="/" variant="secondary" size="lg">
              Open the timer
            </ButtonLink>
          </p>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
