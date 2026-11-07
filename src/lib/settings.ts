import { KEYS, readJSON, writeJSON } from "./storage";

export interface Settings {
  /** Gentle chime when focus ends. */
  sound: boolean;
  /** Browser notification when focus or a break ends while the tab is in the background. */
  notify: boolean;
  /** We've shown the "want a heads-up?" card once; don't show it again (the ⌘K command stays). */
  notifyAsked: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, notify: false, notifyAsked: false };

export function parseSettings(raw: unknown): Settings {
  const s = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Settings>;
  return {
    sound: typeof s.sound === "boolean" ? s.sound : DEFAULT_SETTINGS.sound,
    notify: typeof s.notify === "boolean" ? s.notify : DEFAULT_SETTINGS.notify,
    notifyAsked: typeof s.notifyAsked === "boolean" ? s.notifyAsked : DEFAULT_SETTINGS.notifyAsked,
  };
}

export function readSettings(): Settings {
  return parseSettings(readJSON<unknown>(KEYS.settings, null));
}

export function updateSettings(patch: Partial<Settings>): void {
  writeJSON(KEYS.settings, { ...readSettings(), ...patch });
}

/** Turn notifications on (asking the browser first) or off. Returns a message if it couldn't. */
export async function setNotifications(on: boolean): Promise<string | null> {
  if (!on) {
    updateSettings({ notify: false, notifyAsked: true });
    return null;
  }
  updateSettings({ notifyAsked: true }); // whatever the browser answers, the card has done its job
  if (!("Notification" in window)) return "This browser doesn't support notifications.";
  const permission =
    Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") {
    updateSettings({ notify: false });
    return "Notifications are blocked for this site. Allow them in your browser's site settings.";
  }
  updateSettings({ notify: true });
  return null;
}
