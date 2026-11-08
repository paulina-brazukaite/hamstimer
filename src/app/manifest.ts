import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest and linked from every page automatically.
// This (plus HTTPS and the service worker) is what makes the app installable.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BusyHamster · focus timer",
    short_name: "BusyHamster",
    description: "A focus timer that remembers where your head was.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f1012",
    theme_color: "#0f1012",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
