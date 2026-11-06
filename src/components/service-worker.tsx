"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js (offline support). Production only: in `next dev` files
 * change constantly and a caching service worker would serve stale code.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // not fatal: the app works fine online without it
    });
  }, []);
  return null;
}
