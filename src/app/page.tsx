import type { Metadata } from "next";
import { FocusScreen } from "@/components/focus-screen";
import { FirstVisitIntro } from "@/components/first-visit-intro";
import { JsonLd } from "@/components/json-ld";
import { DESCRIPTION, SITE_NAME, SITE_URL, TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

// Tells search engines this page is a free web app.
const webApplication = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
};

// "/" is a Server Component: the intro below is plain HTML from the server, and
// FocusScreen (a Client Component) runs the timer in the browser.
export default function Home() {
  return (
    <>
      <JsonLd data={webApplication} />
      <FocusScreen
        intro={
          <FirstVisitIntro>
            <h1 className="text-xl font-semibold tracking-tight text-balance text-fg sm:text-2xl">{TAGLINE}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted">
              Type what you&apos;re working on, press Enter, and start a pomodoro on it. Add the next step as you go.
              Next time, BusyHamster opens on exactly where you left off: one key to resume.
            </p>
            <p className="mt-3 text-xs text-faint">No account · your data stays in this browser</p>
          </FirstVisitIntro>
        }
      />
    </>
  );
}
