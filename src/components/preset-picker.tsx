"use client";

import { update } from "@/lib/timer-store";
import { PRESETS, choosePreset, type TimerState } from "@/lib/timer";
import { Chip, TextInput } from "@/components/ui";

/**
 * Focus / break length, under the clock while nothing is running. Changing it
 * mid-block isn't allowed (choosePreset ignores it), so it hides then.
 */
export function PresetPicker({ state }: { state: TimerState }) {
  const isCustom = state.presetId === "custom";
  const focusMin = state.focusMs / 60_000;
  const breakMin = state.breakMs / 60_000;

  function setCustom(f: number, b: number) {
    update((s) => choosePreset(s, "custom", f, b));
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Focus and break length">
        {PRESETS.map((p) => (
          <Chip
            key={p.id}
            role="radio"
            aria-checked={state.presetId === p.id}
            selected={state.presetId === p.id}
            onClick={() => update((s) => choosePreset(s, p.id))}
          >
            {p.label}
          </Chip>
        ))}
        <Chip role="radio" aria-checked={isCustom} selected={isCustom} onClick={() => setCustom(focusMin, breakMin)}>
          Custom
        </Chip>
      </div>

      {isCustom && (
        <div className="flex items-center gap-3 text-xs text-muted">
          <MinutesInput label="Focus" value={focusMin} max={240} onCommit={(f) => setCustom(f, breakMin)} />
          <MinutesInput label="Break" value={breakMin} max={60} onCommit={(b) => setCustom(focusMin, b)} />
        </div>
      )}
    </div>
  );
}

// Uncontrolled input: the browser owns what's typed, and we only save it when
// it's a valid number. That way typing "90" doesn't get clamped at the "9".
function MinutesInput(props: { label: string; value: number; max: number; onCommit: (n: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      {props.label}
      <TextInput
        size="sm"
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
        className="w-16"
      />
      min
    </label>
  );
}
