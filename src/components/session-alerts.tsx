"use client";

import { useEffect } from "react";
import { onBreakEnd, onFocusEnd, subscribe } from "@/lib/timer-store";
import { readSettings } from "@/lib/settings";
import { playChime, unlockAudio } from "@/lib/sound";
import { currentLine, type TimerState } from "@/lib/timer";

/**
 * Renders nothing. Mounted once in the root layout, so on every page it:
 * - keeps the timer clock running (by subscribing to the store),
 * - plays the chime and shows a notification when focus ends,
 * - shows a "break's over" notification when the break ends.
 *
 * Notifications only appear while the tab is in the background: if you're
 * looking at the app, the chime and the screen already tell you.
 */
export function SessionAlerts() {
  useEffect(() => {
    const unsubscribe = subscribe(() => {});

    // Browsers block sound until the person has interacted with the page.
    const unlock = () => unlockAudio();
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("pointerdown", unlock, { once: true });

    const stopFocusEnd = onFocusEnd((state) => {
      if (readSettings().sound) playChime();
      notify("Focus done. Time for a break.", state);
    });
    const stopBreakEnd = onBreakEnd((state) => notify("Break's over. Back to it?", state));

    return () => {
      unsubscribe();
      stopFocusEnd();
      stopBreakEnd();
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  return null;
}

function notify(title: string, state: TimerState) {
  if (
    !readSettings().notify ||
    document.visibilityState !== "hidden" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }
  const n = new Notification(title, {
    body: currentLine(state)?.text || state.task.title || undefined,
    tag: "nextline-session", // replaces the previous one instead of stacking
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}
