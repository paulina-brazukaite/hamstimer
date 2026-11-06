import type { Metadata } from "next";
import { HistoryScreen } from "@/components/history-screen";

export const metadata: Metadata = {
  title: "History · Nextline",
  // Personal data lives in the visitor's browser; nothing here for search engines.
  robots: { index: false },
};

export default function HistoryPage() {
  return <HistoryScreen />;
}
