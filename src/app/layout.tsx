import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
// Fonts ship inside the `geist` package (no Google Fonts request at build or
// runtime), which also means they work offline once the PWA is installed.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { KEYS } from "@/lib/storage";
import { InlineScript } from "@/components/inline-script";
import { CommandMenu } from "@/components/command-menu";
import { SessionAlerts } from "@/components/session-alerts";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nextline · focus timer",
  description:
    "A focus timer that remembers where your head was. Save your next step when you stop, pick it up in one key when you come back.",
};

export const viewport: Viewport = {
  themeColor: "#0f1012",
};

// Runs during HTML parsing, before first paint, so a saved light theme never
// flashes dark first. Wrapped in try/catch because localStorage can throw.
const themeScript = `try{var t=JSON.parse(localStorage.getItem("${KEYS.theme}"));if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="flex min-h-full flex-col bg-ground font-sans text-fg">
        {children}
        <SessionAlerts />
        <ServiceWorker />
        {/* Suspense: the menu reads the URL (usePathname), which some pages only know at request time. */}
        <Suspense fallback={null}>
          <CommandMenu />
        </Suspense>
      </body>
    </html>
  );
}
