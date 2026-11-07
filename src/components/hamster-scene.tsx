import type { ReactNode } from "react";
import type { HamsterPose } from "@/lib/hamster";

/**
 * The little hamster above the task. Pure decoration: hidden from screen
 * readers, not clickable, not focusable, and always the same size, so a pose
 * change never moves the layout. These are flat placeholder drawings; the
 * three.js hamster will replace them, playing the same pose names.
 */
export function HamsterScene({ pose, className = "" }: { pose: HamsterPose; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 104"
      aria-hidden="true"
      focusable="false"
      data-pose={pose}
      className={`pointer-events-none block h-auto w-full select-none ${className}`}
    >
      <line x1="28" y1="102" x2="132" y2="102" className="stroke-line" strokeWidth="1.5" strokeLinecap="round" />
      {POSES[pose]}
    </svg>
  );
}

// Fur and face colours stay the same in both themes; the objects follow the theme.
const FUR = "#d9964f";
const BELLY = "#f4eadb";
const PAW = "#f0d9c6";
const EAR = "#e7ae98";
const NOSE = "#d98c84";
const EYE = "#15171a";

const wheel = (
  <g transform="translate(4 -4.4) scale(0.253)">
    <line x1="300" y1="215" x2="222" y2="420" className="stroke-prop" strokeWidth="12" strokeLinecap="round" />
    <line x1="300" y1="215" x2="378" y2="420" className="stroke-prop" strokeWidth="12" strokeLinecap="round" />
    <circle cx="300" cy="215" r="150" fill="none" className="stroke-prop" strokeWidth="12" />
    <circle cx="300" cy="215" r="137" fill="none" className="stroke-prop-soft" strokeWidth="14" strokeDasharray="3 13" />
    <circle cx="300" cy="215" r="12" className="fill-prop" />
    <ellipse cx="236" cy="330" rx="16" ry="6" fill={PAW} transform="rotate(-18 236 330)" />
    <ellipse cx="318" cy="334" rx="15" ry="6" fill={PAW} transform="rotate(24 318 334)" />
    <path d="M214 300c0-34 30-56 72-56 34 0 60 14 70 40 4 12 2 26-6 36-14 16-44 22-78 22-36 0-58-14-58-42z" fill={FUR} />
    <path d="M236 320c14 10 36 14 60 14 22 0 40-4 52-12-6 14-30 22-58 22-24 0-44-8-54-24z" fill={BELLY} />
    <circle cx="352" cy="276" r="34" fill={FUR} />
    <ellipse cx="366" cy="292" rx="20" ry="15" fill={BELLY} />
    <ellipse cx="336" cy="246" rx="11" ry="13" fill={FUR} />
    <ellipse cx="337" cy="248" rx="6" ry="8" fill={EAR} />
    <circle cx="364" cy="270" r="6" fill={EYE} />
    <circle cx="384" cy="283" r="4" fill={NOSE} />
  </g>
);

const laptop = (
  <g transform="translate(0 12)">
    <line x1="128" y1="86" x2="120" y2="50" className="stroke-prop" strokeWidth="5" strokeLinecap="round" />
    <line x1="90" y1="87" x2="129" y2="87" className="stroke-prop-soft" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="52" cy="89" rx="6" ry="2.4" fill={PAW} />
    <ellipse cx="62" cy="72" rx="22" ry="17" fill={FUR} />
    <ellipse cx="70" cy="78" rx="13" ry="10" fill={BELLY} />
    <circle cx="80" cy="54" r="13" fill={FUR} />
    <ellipse cx="86" cy="58" rx="8" ry="6" fill={BELLY} />
    <ellipse cx="74" cy="42" rx="4.5" ry="5.5" fill={FUR} />
    <ellipse cx="74" cy="43" rx="2.6" ry="3.4" fill={EAR} />
    <circle cx="84" cy="51" r="1.9" fill={EYE} />
    <circle cx="93" cy="55" r="1.4" fill={NOSE} />
    <ellipse cx="90" cy="82" rx="6" ry="2.6" fill={PAW} transform="rotate(12 90 82)" />
  </g>
);

// Sitting up, facing you. `seed` adds the seed in its paws and the bowl (break).
function sitting(seed: boolean) {
  return (
    <>
      {seed && (
        <>
          <ellipse cx="116" cy="99" rx="15" ry="3.5" className="fill-prop-soft" />
          <ellipse cx="111" cy="96.5" rx="2.4" ry="1.4" fill="#3b3733" />
          <ellipse cx="117" cy="96" rx="2.4" ry="1.4" fill="#e8e2d6" />
          <ellipse cx="122" cy="96.6" rx="2.4" ry="1.4" fill="#3b3733" />
        </>
      )}
      <g transform={seed ? "translate(13 5.7) scale(0.45)" : "translate(19 5.7) scale(0.45)"}>
        <path d="M84 196c-6-40 18-70 54-70 32 0 52 24 50 58-1 14-8 22-18 26-28 6-62 4-86-14z" fill={FUR} />
        <path d="M96 196c8 10 26 16 46 16 14 0 26-4 32-10-4 12-20 18-38 18-18 0-32-8-40-24z" fill={BELLY} />
        <circle cx="140" cy="124" r="28" fill={FUR} />
        <ellipse cx="140" cy="138" rx="19" ry="13" fill={BELLY} />
        <ellipse cx="120" cy="100" rx="9" ry="11" fill={FUR} />
        <ellipse cx="120" cy="102" rx="5" ry="6.5" fill={EAR} />
        <ellipse cx="160" cy="100" rx="9" ry="11" fill={FUR} />
        <ellipse cx="160" cy="102" rx="5" ry="6.5" fill={EAR} />
        <circle cx="130" cy="120" r="4.5" fill={EYE} />
        <circle cx="150" cy="120" r="4.5" fill={EYE} />
        <circle cx="140" cy="131" r="3" fill={NOSE} />
        {seed && <ellipse cx="140" cy="150" rx="7" ry="9" fill="#3b3733" />}
        <ellipse cx="131" cy={seed ? 152 : 160} rx="6" ry="4.5" fill={PAW} />
        <ellipse cx="149" cy={seed ? 152 : 160} rx="6" ry="4.5" fill={PAW} />
      </g>
    </>
  );
}

const sleeping = (
  <g transform="translate(-46 15.6) scale(0.3)">
    <ellipse cx="420" cy="262" rx="130" ry="26" className="fill-prop-soft" />
    <path d="M300 258c20-22 60-30 120-30s104 8 124 30c-30-10-72-14-124-14s-92 4-120 14z" className="fill-prop" />
    <path d="M350 250c-4-40 30-72 76-72 40 0 70 24 70 58 0 10-4 18-10 22-40 8-96 6-136-8z" fill={FUR} />
    <path d="M450 214c18-2 34 10 38 28 2 8 0 14-6 16-14 2-34-4-40-18-4-10 0-24 8-26z" fill={BELLY} />
    <ellipse cx="452" cy="196" rx="9" ry="7" fill={FUR} />
    <ellipse cx="452" cy="197" rx="5" ry="4" fill={EAR} />
    <path d="M462 224q6 4 12 0" fill="none" stroke={EYE} strokeWidth="3.4" strokeLinecap="round" />
  </g>
);

const POSES: Record<HamsterPose, ReactNode> = {
  wheel,
  laptop,
  sit: sitting(false),
  eat: sitting(true),
  sleep: sleeping,
};
