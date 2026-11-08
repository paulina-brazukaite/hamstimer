import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
// Geist Mono ships inside the `geist` package (used for code in blog posts).
// Schibsted Grotesk is self-hosted by next/font at build time: the browser never
// asks Google for it, so it still works offline once the PWA is installed.
import { Schibsted_Grotesk } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { KEYS } from "@/lib/storage";
import { DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { InlineScript } from "@/components/inline-script";
import { CommandMenu } from "@/components/command-menu";
import { SessionAlerts } from "@/components/session-alerts";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: a focus timer that remembers where you were`,
    template: `%s · ${SITE_NAME}`, // pages set just their own part, e.g. "History"
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME },
  twitter: { card: "summary_large_image" },
};

const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted" });

export const viewport: Viewport = {
  themeColor: "#121417",
};

// Runs during HTML parsing, before first paint, so nothing flashes:
// - a saved light theme is applied before the dark default shows;
// - returning visitors get data-returning, which collapses the first-visit intro (CSS).
// Wrapped in try/catch because localStorage can throw.
const beforePaintScript = `try{var d=document.documentElement,l=localStorage,t=JSON.parse(l.getItem("${KEYS.theme}"));if(t==="light"||t==="dark")d.dataset.theme=t;if(l.getItem("${KEYS.onboarded}"))d.dataset.returning="1"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${schibsted.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={beforePaintScript} />
      </head>
      <body className="flex min-h-full flex-col bg-ground font-sans text-fg">
        {children}
        <SessionAlerts />
        <ServiceWorker />
        {/* Suspense: the menu reads the URL (usePathname), which some pages only know at request time. */}
        <Suspense fallback={null}>
          <CommandMenu />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
