// Renders the app icons as PNGs using Next's built-in image renderer (next/og),
// so we don't need an image library. Run after changing the design:
//   node scripts/generate-icons.mjs
import { writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const GROUND = "#0f1012";
const LAMP = "#e9a84c";

// Full-bleed square (the OS applies its own rounding/mask). The dot sits well
// inside the 80% "safe zone", so the same image works as a maskable icon.
function icon(size) {
  const dot = Math.round(size * 0.28);
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: GROUND,
      },
    },
    h("div", { style: { width: dot, height: dot, borderRadius: "50%", background: LAMP } }),
  );
}

const targets = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["src/app/apple-icon.png", 180],
];

for (const [file, size] of targets) {
  const res = new ImageResponse(icon(size), { width: size, height: size });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log("wrote", file);
}
