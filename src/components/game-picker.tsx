import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import cheekStufferShot from "@/app/tired/cheek-stuffer.webp";
import notTodayShot from "@/app/tired/not-today.webp";
import ticTacToeShot from "@/app/tired/tic-tac-toe.webp";

const GAMES: { href: string; name: string; shot: StaticImageData; alt: string }[] = [
  {
    href: "/tired/tic-tac-toe",
    name: "Tic Tac Toe",
    shot: ticTacToeShot,
    alt: "The hamster on a desk, drawing a circle on a tic-tac-toe grid with a pen bigger than itself.",
  },
  {
    href: "/tired/not-today",
    name: "Not Today",
    shot: notTodayShot,
    alt: "The hamster on a cobbled village street with an alarm clock and a bucket stuck to it, as a glowing seed and another alarm clock fall.",
  },
  {
    href: "/tired/cheek-stuffer",
    name: "Cheek Stuffer",
    shot: cheekStufferShot,
    alt: "The hamster with enormous cheeks, between its nest and a line of seeds.",
  },
];

export function GamePicker() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader links={[{ href: "/", label: "Timer" }]} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 max-[350px]:px-3 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Tired?</h1>
        <p className="mt-1 text-sm text-muted">Pick a game.</p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {GAMES.map((game) => (
            <li key={game.href}>
              <Link href={game.href} className="group block overflow-hidden rounded-3xl border border-line bg-surface transition-colors hover:border-faint">
                <Image
                  src={game.shot}
                  alt={game.alt}
                  placeholder="blur"
                  loading="eager"
                  sizes="(min-width: 640px) 290px, 100vw"
                  className="aspect-[3/2] w-full object-cover"
                />
                <h2 className="px-5 py-4 text-base font-semibold tracking-tight">{game.name}</h2>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
