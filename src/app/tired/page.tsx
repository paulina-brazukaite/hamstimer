import type { Metadata } from "next";
import { GamePicker } from "@/components/game-picker";

export const metadata: Metadata = {
  title: "Tired?",
  robots: { index: false },
};

export default function TiredPage() {
  return <GamePicker />;
}
