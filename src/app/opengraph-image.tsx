import { OG_SIZE, renderOg } from "@/lib/og";
import { TAGLINE } from "@/lib/site";

// The default share image for every page (pages below can override it).
export const alt = "Hamstimer: a focus timer that remembers where your head was";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ title: TAGLINE, clock: "50:00" });
}
