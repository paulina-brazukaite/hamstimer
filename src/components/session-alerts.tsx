"use client";

import { useEffect } from "react";
import { onFocusEnd, subscribe } from "@/lib/timer-store";
import { readSettings } from "@/lib/settings";
import { playChime, unlockAudio } from "@/lib/sound";
import { currentLine } from "@/lib/timer";

/**
 * Renders nothing. Mounted once in the root layout, so on every page it:
 * - keeps the timer clock running (by subscribing to the store),
 * - plays the chime and shows a notification when focus ends.
 */
export function SessionAlerts() {
  useEffect(() => {
    const unsubscribe = subscribe(() => {});

    // Browsers block sound until the person has interacted with the page.
    const unlock = () => unlockAudio();
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("pointerdown", unlock, { once: true });

    const stopListening = onFocusEnd((state) => {
      const settings = readSettings();
      if (settings.sound) playChime();
      if (
        settings.notify &&
        document.visibilityState === "hidden" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Focus done. Time for a break.", {
          body: currentLine(state)?.text || state.task.title || undefined,
          tag: "nextline-focus-end", // replaces an older one instead of stacking
        });
      }
    });

    return () => {
      unsubscribe();
      stopListening();
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  return null;
}
