"use client";

import { useEffect, useState } from "react";
import { setNotifications, updateSettings } from "@/lib/settings";
import { useSettings } from "@/lib/use-stored";
import { Button, Card } from "@/components/ui";

/**
 * Asks about notifications once, in context: during a focus block, when a
 * heads-up is obviously useful. It's our own card, not the browser's popup;
 * only "Turn on" triggers the browser's permission request, so people see that
 * popup when they already want it. Either answer is remembered; the ⌘K menu
 * still has "Turn notifications on/off" for changing your mind.
 */
export function NotifyPrompt() {
  const settings = useSettings();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(id);
  }, [message]);

  if (message) {
    return (
      <p role="status" className="max-w-md text-center text-sm text-muted">
        {message}
      </p>
    );
  }

  const supported = typeof window !== "undefined" && "Notification" in window;
  if (!supported || settings.notify || settings.notifyAsked || Notification.permission === "denied") return null;

  return (
    <Card
      as="section"
      radius="lg"
      aria-label="Notifications"
      className="animate-rise-in flex w-full max-w-xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5 flex-none text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
        <path d="M10 20a2.2 2.2 0 0 0 4 0" />
      </svg>
      <p className="min-w-0 flex-1 basis-56 text-sm leading-snug text-fg">
        Want a nudge when this block or your break ends, even if you&apos;re in another tab?
      </p>
      <div className="flex gap-2">
        <Button
          variant="solid"
          onClick={() =>
            void setNotifications(true).then((problem) =>
              setMessage(problem ?? "Done. You'll get a nudge when a block or break ends."),
            )
          }
        >
          Turn on
        </Button>
        <Button variant="ghost" onClick={() => updateSettings({ notifyAsked: true })}>
          No thanks
        </Button>
      </div>
    </Card>
  );
}
