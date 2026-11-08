/**
 * The BusyHamster mark, "Peek": a hamster peeking over a line. The eyes are real
 * holes (even-odd fill), so the background shows through on any theme. This is
 * the small-size drawing: bigger eyes and no nose, which would just be noise at
 * header size. The app icons in public/icons carry the full drawing.
 */
export function PeekMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="4 20 56 36" className={className} aria-hidden="true">
      <circle cx="18" cy="28" r="7" className="fill-fg" />
      <circle cx="46" cy="28" r="7" className="fill-fg" />
      <path
        fillRule="evenodd"
        className="fill-fg"
        d="M13 45a19 19 0 0 1 38 0zM21.5 36.5a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0-7.2 0zM35.3 36.5a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0-7.2 0z"
      />
      <rect x="5" y="48" width="54" height="7" rx="3.5" className="fill-lamp" />
    </svg>
  );
}
