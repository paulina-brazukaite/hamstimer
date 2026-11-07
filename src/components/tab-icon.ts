"use client";

import { useEffect } from "react";
import type { HamsterPose } from "@/lib/hamster";

/**
 * The tab icon follows the hamster: running while you focus, sitting up on a
 * break, asleep while the resume card waits. Any other time the site's own
 * icon shows. Only the picture changes; the tab title already shows the time.
 *
 * Works by adding one extra <link rel="icon"> after the site's own; browsers use
 * the last one, and removing it brings the normal icon back.
 */
const ID = "nextline-state-icon";

const FUR = "#d9964f";
const ICONS = {
  focus: `<ellipse cx="13" cy="20" rx="9" ry="6.5" fill="${FUR}"/><circle cx="22" cy="17" r="5.5" fill="${FUR}"/><circle cx="23.5" cy="16" r="1.1" fill="#15171a"/><rect x="2" y="27" width="28" height="3" rx="1.5" fill="#f2c230"/>`,
  break: `<ellipse cx="16" cy="19" rx="8" ry="8" fill="${FUR}"/><circle cx="16" cy="10" r="6" fill="${FUR}"/><circle cx="11.5" cy="5.5" r="2.2" fill="${FUR}"/><circle cx="20.5" cy="5.5" r="2.2" fill="${FUR}"/><circle cx="14" cy="9.5" r="1" fill="#15171a"/><circle cx="18" cy="9.5" r="1" fill="#15171a"/><rect x="2" y="27" width="28" height="3" rx="1.5" fill="#9cc5a1"/>`,
  away: `<path d="M4 26c0-9 6-14 13-14s11 5 11 11c0 2-1 3-2 3z" fill="${FUR}"/><path d="M20 16c3 0 5 3 5 6 0 2-2 2-3 1-2-1-3-5-2-7z" fill="#f4eadb"/>`,
};

type IconKind = keyof typeof ICONS;

function kindFor(pose: HamsterPose | null): IconKind | null {
  if (pose === "wheel" || pose === "laptop") return "focus";
  if (pose === "eat") return "break";
  if (pose === "sleep") return "away";
  return null;
}

export function useTabIcon(pose: HamsterPose | null) {
  const kind = kindFor(pose);
  useEffect(() => {
    document.getElementById(ID)?.remove();
    if (!kind) return;
    const link = document.createElement("link");
    link.id = ID;
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${ICONS[kind]}</svg>`)}`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [kind]);
}
