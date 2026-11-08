// Shared look for the Open Graph images (the preview card when a link is shared).
// Rendered at build time by next/og; uses the Geist TTFs bundled with `geist`.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const fontDir = join(process.cwd(), "node_modules/geist/dist/fonts");

// 'use cache': with Cache Components on, reading files counts as uncached data and
// would make the image render on every request. Caching the fonts lets Next build
// the images once, at build time.
async function loadFonts() {
  "use cache";
  const files = ["geist-sans/Geist-Regular.ttf", "geist-sans/Geist-SemiBold.ttf", "geist-mono/GeistMono-Regular.ttf"];
  // Cached values must be serialisable, so the bytes travel as base64 text.
  return Promise.all(files.map(async (f) => (await readFile(join(fontDir, f))).toString("base64")));
}

function toArrayBuffer(base64: string): ArrayBuffer {
  return new Uint8Array(Buffer.from(base64, "base64")).buffer;
}

/** With `clock`: big timer + title (home, timer pages). Without: small eyebrow + large title (blog). */
export async function renderOg({ title, clock, eyebrow }: { title: string; clock?: string; eyebrow?: string }) {
  const [sans, sansBold, mono] = (await loadFonts()).map(toArrayBuffer);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#121417",
          color: "#eceef0",
          fontFamily: "Geist",
          padding: "64px 80px",
        }}
      >
        {/* progress line */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: 1200, height: 6, background: "#23272c" }}>
          <div style={{ width: 640, height: 6, background: "#f2c230" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="62" height="40" viewBox="4 20 56 36">
            <circle cx="18" cy="28" r="7" fill="#eceef0" />
            <circle cx="46" cy="28" r="7" fill="#eceef0" />
            <path
              fill="#eceef0"
              fillRule="evenodd"
              d="M13 45a19 19 0 0 1 38 0zM22.5 36a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM35.5 36a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM29.4 41.2a2.6 2 0 1 0 5.2 0a2.6 2 0 1 0-5.2 0z"
            />
            <rect x="5" y="48" width="54" height="7" rx="3.5" fill="#f2c230" />
          </svg>
          <div style={{ fontSize: 34, fontWeight: 600 }}>BusyHamster</div>
        </div>

        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
          {clock ? (
            <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 168, letterSpacing: -8, lineHeight: 1 }}>
              {clock}
            </div>
          ) : (
            <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 28, color: "#a3a9b1" }}>{eyebrow}</div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: clock ? 46 : 64,
              fontWeight: 600,
              lineHeight: 1.15,
              color: "#eceef0",
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 24, color: "#a3a9b1" }}>
          <span style={{ color: "#f2c230", marginRight: 14 }}>↳ next</span>
          <span>pick up exactly where you left off</span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: sans, weight: 400, style: "normal" },
        { name: "Geist", data: sansBold, weight: 600, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
