import type { Metadata } from "next";
import { NotToday } from "@/components/not-today";

export const metadata: Metadata = {
  title: "Not Today",
  robots: { index: false },
};

export default function NotTodayPage() {
  return <NotToday />;
}
