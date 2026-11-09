import type { ReactNode } from "react";

/**
 * One "label value" pair in a <dl> row of stats (scores, trips). Put several in
 * `<dl className="flex justify-between gap-4 text-sm text-muted">`.
 */
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="font-medium tabular-nums text-fg">{value}</dd>
    </div>
  );
}
