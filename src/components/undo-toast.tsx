"use client";

import { useEffect } from "react";
import { undoFinishTask } from "@/lib/timer-store";
import { useModKey } from "@/lib/use-stored";

/**
 * "Task finished · Undo", shown for a few seconds after Finish task so a stray
 * Esc can be taken back. ⌘Z / Ctrl+Z works too, except while you're typing in a
 * box that has text (there it's the box's own undo).
 *
 * The live region is always in the page and only its content changes, so screen
 * readers announce it reliably.
 */
export function UndoToast({ visible }: { visible: boolean }) {
  const mod = useModKey();

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement | null;
      if ((t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) && t.value !== "") return;
      if (t?.isContentEditable) return;
      e.preventDefault();
      undoFinishTask();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      {visible && (
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-line bg-surface py-1 pr-1 pl-4 text-sm text-muted shadow-card">
          <span>Task finished.</span>
          <button
            type="button"
            // Don't take focus from a text box: its blur could save, which ends the undo.
            onMouseDown={(e) => e.preventDefault()}
            onClick={undoFinishTask}
            className="inline-flex min-h-9 items-center gap-2.5 rounded-md px-3 text-fg underline decoration-line underline-offset-4 transition-colors hover:decoration-fg"
          >
            Undo
            <kbd className="font-mono text-xs text-faint no-underline pointer-coarse:hidden">{mod} Z</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
