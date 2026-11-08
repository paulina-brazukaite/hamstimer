// Browser side of export/import: downloading and reading files, touching
// localStorage. The format itself (and its tests) lives in history.ts.

import { PREFIX, createBackup, parseBackup } from "./history";

export function exportBackup(): void {
  const backup = createBackup(window.localStorage, new Date());
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `busyhamster-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validates the file, asks for confirmation, replaces all nextline:* data and
 * reloads. Returns an error message, or null (done, or cancelled).
 */
export async function importBackupFile(file: File): Promise<string | null> {
  try {
    const backup = parseBackup(await file.text());
    const when = backup.exportedAt ? ` from ${new Date(backup.exportedAt).toLocaleString()}` : "";
    if (!window.confirm(`Replace all your BusyHamster data with this backup${when}? This can't be undone.`)) {
      return null;
    }
    // Clear our keys first so nothing from before the backup lingers.
    const ours: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) ours.push(key);
    }
    ours.forEach((key) => localStorage.removeItem(key));
    for (const [key, value] of Object.entries(backup.data)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    // Reload so the theme, timer and history all pick up the restored data.
    window.location.reload();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Couldn't import that file.";
  }
}

/** Opens the file picker without needing an <input> in the page (used by the command menu). */
export function pickBackupFile(onError: (message: string) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const error = await importBackupFile(file);
    if (error) onError(error);
  };
  input.click();
}
