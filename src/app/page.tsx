import type { Metadata } from "next";
import { FocusScreen } from "@/components/focus-screen";
import { FirstVisitIntro } from "@/components/first-visit-intro";
import { TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

// "/" is a Server Component: the intro below is plain HTML from the server, and
// FocusScreen (a Client Component) runs the timer in the browser.
export default function Home() {
  return (
    <FocusScreen
      intro={
        <FirstVisitIntro>
          <h1 className="text-xl font-semibold tracking-tight text-balance text-fg sm:text-2xl">{TAGLINE}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted">
            Type what you&apos;re working on, press Enter, and start a pomodoro on it. Add the next step as you
            go. Next time, Hamstimer opens on exactly where you left off: one key to resume.
          </p>
          <p className="mt-3 text-xs text-faint">No account · your data stays in this browser</p>
        </FirstVisitIntro>
      }
    />
  );
}
