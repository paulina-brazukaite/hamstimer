"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { finishTaskUndoable, update } from "@/lib/timer-store";
import { focusLineInput } from "@/components/task-view";
import { useTimer } from "@/lib/use-timer";
import { useSettings } from "@/lib/use-stored";
import { setNotifications, updateSettings } from "@/lib/settings";
import { toggleTheme } from "@/lib/theme";
import { playChime } from "@/lib/sound";
import { exportBackup, pickBackupFile } from "@/lib/backup-actions";
import {
  PRESETS,
  canStart,
  choosePreset,
  currentLine,
  extend,
  isRunning,
  markCurrentDone,
  pause,
  resumeSession,
  start,
  stop,
} from "@/lib/timer";

const OPEN_EVENT = "nextline:open-menu";

/** Lets any button open the menu (e.g. the ⌘K button in the header). */
export function openCommandMenu() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface Command {
  id: string;
  group: string;
  label: string;
  /** Shortcut shown on the right, if the action has one. */
  keys?: string;
  run: () => void;
}

/**
 * ⌘K / Ctrl+K anywhere. The panel is only mounted while open, so every time it
 * opens it starts with an empty search and the first item selected.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); // browsers use Ctrl+K for the search bar
        setOpen((o) => !o);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  return open ? <MenuPanel onClose={() => setOpen(false)} /> : null;
}

function MenuPanel({ onClose }: { onClose: () => void }) {
  const commands = useCommands();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = commands.filter((c) => {
    const text = `${c.group} ${c.label}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  const index = Math.min(active, results.length - 1);

  useEffect(() => {
    document.getElementById(`cmd-${index}`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function run(c: Command | undefined) {
    if (!c) return;
    onClose();
    c.run();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ground/70 px-4 pt-[14vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-card"
      >
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((index + 1) % Math.max(1, results.length));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((index - 1 + results.length) % Math.max(1, results.length));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(results[index]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }
          }}
          placeholder="Type a command…"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmd-list"
          aria-activedescendant={index >= 0 ? `cmd-${index}` : undefined}
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-[15px] text-fg outline-none placeholder:text-faint"
        />

        <ul id="cmd-list" role="listbox" aria-label="Commands" className="max-h-[50vh] overflow-y-auto py-2 [scrollbar-width:thin]">
          {results.map((c, i) => (
            <li key={c.id}>
              {(i === 0 || results[i - 1].group !== c.group) && (
                <p className="px-5 pt-2 pb-1 text-[11px] text-faint">{c.group}</p>
              )}
              <div
                id={`cmd-${i}`}
                role="option"
                aria-selected={i === index}
                onMouseMove={() => i !== index && setActive(i)}
                onClick={() => run(c)}
                className="mx-2 flex min-h-10 cursor-pointer items-center justify-between gap-4 rounded-lg px-3 text-sm text-muted aria-selected:bg-well aria-selected:text-fg"
              >
                <span>{c.label}</span>
                {c.keys && <kbd className="text-xs text-faint">{c.keys}</kbd>}
              </div>
            </li>
          ))}
          {results.length === 0 && <li className="px-5 py-3 text-sm text-faint">No matching command</li>}
        </ul>

        <p className="flex gap-4 border-t border-line px-4 py-2.5 text-[11px] text-faint">
          <span>↑↓ move</span>
          <span>Enter run</span>
          <span>Esc close</span>
        </p>
      </div>
    </div>
  );
}

/** Every action in the app, filtered to the ones that make sense right now. */
function useCommands(): Command[] {
  const snap = useTimer();
  const router = useRouter();
  const pathname = usePathname();
  const settings = useSettings();

  const state = snap?.state;
  const phase = state?.phase ?? "idle";
  const active = phase === "focus" || phase === "break";
  const running = state ? isRunning(state) : false;
  const startable = state ? canStart(state) : false;
  const hasLines = (state?.task.lines.length ?? 0) > 0;
  const goTimer = () => {
    if (pathname !== "/") router.push("/");
  };
  const list: Command[] = [];
  const add = (group: string, label: string, run: () => void, keys?: string) =>
    list.push({ id: `${group}:${label}`, group, label, run, keys });

  // Timer and task
  if (snap?.resume) {
    add("Timer", "Resume where you left off", () => update(resumeSession), "R");
    add("Task", "Finish task", finishTaskUndoable, "Esc");
  } else {
    if (!active && startable) add("Timer", "Start focus", () => {
        update(start);
        goTimer();
      }, "Space");
    if (running) add("Timer", "Pause", () => update(pause), "Space");
    if (active && !running) add("Timer", "Resume", () => update(start), "Space");
    if (active) add("Timer", "Add 15 minutes", () => update(extend), "E");
    if (active) add("Timer", "Stop", () => update(stop));
    add("Task", "Add a line", () => {
        goTimer();
        requestAnimationFrame(focusLineInput);
      }, "A");
    if (state && currentLine(state)) add("Task", "Mark current line done", () => update(markCurrentDone), "D");
    if (hasLines) add("Task", "Finish task", finishTaskUndoable);
  }
  if (!active) {
    for (const p of PRESETS) {
      add("Session length", `${p.label} minutes`, () => {
        update((s) => choosePreset(s, p.id));
        goTimer();
      });
    }
    add("Session length", "Custom…", () => {
      update((s) => choosePreset(s, "custom"));
      goTimer();
    });
  }

  // Navigation
  if (pathname !== "/") add("Go to", "Timer", () => router.push("/"));
  if (pathname !== "/history") add("Go to", "History", () => router.push("/history"));
  if (pathname !== "/blog") add("Go to", "Blog", () => router.push("/blog"));
  if (pathname !== "/about") add("Go to", "About", () => router.push("/about"));

  // Data
  add("Data", "Export backup", exportBackup);
  add("Data", "Import backup…", () => pickBackupFile((msg) => window.alert(msg)));

  // Preferences
  add("Preferences", "Toggle light / dark theme", toggleTheme);
  add("Preferences", settings.sound ? "Turn end-of-focus sound off" : "Turn end-of-focus sound on", () =>
    updateSettings({ sound: !settings.sound }),
  );
  add("Preferences", "Play the chime", playChime);
  add(
    "Preferences",
    settings.notify ? "Turn notifications off" : "Turn notifications on",
    () => void setNotifications(!settings.notify).then((msg) => msg && window.alert(msg)),
  );

  return list;
}
