"use client";

import { useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { KEYS } from "@/lib/storage";
import { useStoredRaw } from "@/lib/use-stored";
import { formatDuration, parseHistory, type HistoryEntry } from "@/lib/history";
import { exportBackup, importBackupFile } from "@/lib/backup-actions";

const button =
  "inline-flex min-h-9 items-center rounded-lg border border-line px-3 font-mono text-xs text-muted transition-colors hover:text-fg";

export function HistoryScreen() {
  const raw = useStoredRaw(KEYS.history);
  // useMemo: only re-parse when the stored text actually changes.
  const entries = useMemo(() => (raw ? parseHistory(safeParse(raw)) : []), [raw]);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function exportData() {
    exportBackup();
    setMessage("Backup downloaded.");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader links={[{ href: "/", label: "Timer" }]} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <div className="flex gap-2">
            <button type="button" onClick={exportData} className={button}>
              Export
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className={button}>
              Import
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = ""; // allow picking the same file again
                if (file) void importBackupFile(file).then((error) => error && setMessage(error));
              }}
            />
          </div>
        </div>

        <p role="status" className="mt-3 min-h-5 font-mono text-xs text-faint">
          {message}
        </p>

        {raw === undefined ? null : entries.length === 0 ? (
          <p className="mt-10 text-muted">
            No sessions yet. Once you&apos;ve focused for a minute (or left a note) and paused, stopped or finished,
            it shows up here.
          </p>
        ) : (
          <ol className="mt-6 border-t border-line-soft">
            {entries.map((e) => (
              <HistoryRow key={e.id} entry={e} />
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-b border-line-soft py-4">
      <p className="text-[15px] text-fg">{entry.intention || "Untitled session"}</p>
      <p className="text-right font-mono text-[13px] text-muted tabular-nums">{formatDuration(entry.focusedMs)}</p>
      <p className="text-sm text-muted">{entry.note && <>↳ {entry.note}</>}</p>
      <p className="text-right font-mono text-xs whitespace-nowrap text-faint">
        <time dateTime={new Date(entry.endedAt).toISOString()}>{formatWhen(entry.endedAt)}</time>
      </p>
    </li>
  );
}

/** "Today 14:32", "Yesterday 09:10", "Mon 3 Nov, 14:32", in the visitor's locale. */
function formatWhen(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  const sameYear = d.getFullYear() === today.getFullYear();
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  return `${date}, ${time}`;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
