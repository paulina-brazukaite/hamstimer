import type { Metadata } from "next";
import { TicTacToe } from "@/components/tic-tac-toe";

export const metadata: Metadata = {
  title: "Tic Tac Toe",
  robots: { index: false },
};

export default function TicTacToePage() {
  return <TicTacToe />;
}
