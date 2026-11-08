import type { Metadata } from "next";
import { CheekStuffer } from "@/components/cheek-stuffer";

export const metadata: Metadata = {
  title: "Cheek Stuffer",
  robots: { index: false },
};

export default function CheekStufferPage() {
  return <CheekStuffer />;
}
