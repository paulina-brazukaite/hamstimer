"use client";

import { update } from "@/lib/timer-store";
import { choosePreset, type TimerState } from "@/lib/timer";

/**
 * Focus and break minutes for the "Custom…" length. The fixed presets live in
 * the command menu (and the /timer pages); this only shows once Custom is chosen.
 */
export function CustomLength({ state }: { state: TimerState }) {
  const focusMin = state.focusMs / 60_000;
  const breakMin = state.breakMs / 60_000;

  function setCustom(f: number, b: number) {
    update((s) => choosePreset(s, "custom", f, b));
  }

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-muted">
      <MinutesInput label="Focus" value={focusMin} max={240} onCommit={(f) => setCustom(f, breakMin)} />
      <MinutesInput label="Break" value={breakMin} max={60} onCommit={(b) => setCustom(focusMin, b)} />
    </div>
  );
}

// Uncontrolled input: the browser owns what's typed, and we only save it when
// it's a valid number. That way typing "90" doesn't get clamped at the "9".
function MinutesInput(props: { label: string; value: number; max: number; onCommit: (n: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      {props.label}
      <input
        type="number"
        min={1}
        max={props.max}
        defaultValue={props.value}
        onBlur={(e) => {
          const n = Number(e.currentTarget.value);
          if (n >= 1) props.onCommit(n);
          e.currentTarget.value = String(Math.min(props.max, Math.max(1, Math.round(n) || props.value)));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-16 rounded-lg border border-line bg-well px-2 py-1.5 text-fg"
      />
      min
    </label>
  );
}
