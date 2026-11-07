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
          background: "#0f1012",
          color: "#ece9e3",
          fontFamily: "Geist",
          padding: "64px 80px",
        }}
      >
        {/* progress line */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: 1200, height: 6, background: "#23262b" }}>
          <div style={{ width: 640, height: 6, background: "#e9a84c" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#e9a84c" }} />
          <div style={{ fontSize: 34, fontWeight: 600 }}>Hamstimer</div>
        </div>

        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
          {clock ? (
            <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 168, letterSpacing: -8, lineHeight: 1 }}>
              {clock}
            </div>
          ) : (
            <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 28, color: "#9a9ea6" }}>{eyebrow}</div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: clock ? 46 : 64,
              fontWeight: 600,
              lineHeight: 1.15,
              color: "#ece9e3",
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 24, color: "#9a9ea6" }}>
          <span style={{ color: "#e9a84c", marginRight: 14 }}>↳ next</span>
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
