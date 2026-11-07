"use client";

import { useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { KEYS } from "@/lib/storage";
import { useStoredRaw } from "@/lib/use-stored";
import { formatDuration, parseHistory, pomodoroCount, type HistoryEntry } from "@/lib/history";
import { Pomodoros } from "@/components/task-view";
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
            No finished tasks yet. When you press Finish task, the task shows up here with its lines and
            pomodoros.
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
  const pomodoros = pomodoroCount(entry);
  return (
    <li className="border-b border-line-soft py-5">
      <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
        <p className="text-[15px] font-medium text-fg">{entry.title || entry.lines[0]?.text || "Untitled task"}</p>
        <p className="text-right font-mono text-[13px] text-muted tabular-nums">{formatDuration(entry.focusedMs)}</p>
        <p className="font-mono text-xs text-faint">
          {entry.lines.length} {entry.lines.length === 1 ? "line" : "lines"}
          {pomodoros > 0 && ` · ${pomodoros} pomodoro${pomodoros === 1 ? "" : "s"}`}
        </p>
        <p className="text-right font-mono text-xs whitespace-nowrap text-faint">
          <time dateTime={new Date(entry.endedAt).toISOString()}>{formatWhen(entry.endedAt)}</time>
        </p>
      </div>
      {/* An untitled one-line task already shows its line as the heading. */}
      {(entry.title || entry.lines.length > 1) && (
      <ul className="mt-3 flex flex-col gap-1.5">
        {entry.lines.map((l) => (
          <li key={l.id} className="flex items-center gap-3 text-sm">
            <span aria-hidden="true" className="w-3 flex-none font-mono text-xs text-faint">
              {l.doneAt !== null ? "✓" : "·"}
            </span>
            <span className={`min-w-0 flex-1 break-words ${l.doneAt !== null ? "text-muted" : "text-faint"}`}>
              {l.text}
              {l.doneAt === null && <span className="sr-only"> (not done)</span>}
            </span>
            <Pomodoros count={l.pomodoros} lit={false} />
          </li>
        ))}
      </ul>
      )}
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
