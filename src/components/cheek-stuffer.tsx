"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { HamsterScene } from "@/components/hamster-scene";
import { useGameStage } from "@/components/use-game-stage";
import { TRIPS, bank, fullness, mumble, newGame, nextTrip, reviewTitle, stuff, type Game } from "@/lib/cheek-stuffer";
import type { CheekGameApi } from "@/lib/hamster3d/cheek-game";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";

const loadStage = () => import("@/lib/hamster3d/cheek-game").then((m) => m.createCheekGame);

/** How long the message stays up when there is no 3D animation to wait for. */
const NO_3D_PAUSE = 900;

const pill = "inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-medium whitespace-nowrap transition-colors max-[350px]:px-3";
const primary = `${pill} bg-lamp text-lamp-fg aria-disabled:opacity-50`;
const secondary = `${pill} border border-line bg-surface text-fg hover:border-faint aria-disabled:opacity-50`;

export function CheekStuffer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { api, ready } = useGameStage(canvas, loadStage); // without 3D the flat drawing stays and the game still plays
  // The server can't roll a random limit, and nothing shows it, so the real one is rolled on mount.
  const [game, setGame] = useState(() => newGame(() => 0.5));
  const latest = useRef(game); // taps can land faster than React renders
  const [best, setBest] = useState<{ score: number; isNew: boolean } | null>(null);
  const pause = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = newGame();
    return () => {
      // Next keeps a page you've left alive but hidden, and the 3D scene is rebuilt on return, so start fresh.
      clearTimeout(pause.current);
      const fresh = newGame(() => 0.5);
      latest.current = fresh;
      setGame(fresh);
      setBest(null);
    };
  }, []);

  function commit(next: Game) {
    latest.current = next;
    setGame(next);
  }

  function afterAnimation() {
    const next = nextTrip(latest.current);
    commit(next);
    if (next.phase !== "over") return;
    const saved = readJSON<unknown>(KEYS.cheekBest, 0);
    const previous = typeof saved === "number" && Number.isFinite(saved) ? saved : 0;
    const isNew = next.banked > previous;
    if (isNew) writeJSON(KEYS.cheekBest, next.banked);
    setBest({ score: Math.max(previous, next.banked), isNew });
  }

  function animate(run: (stage: CheekGameApi) => void) {
    if (api.current) run(api.current);
    else pause.current = setTimeout(afterAnimation, NO_3D_PAUSE);
  }

  function onStuff() {
    const before = latest.current;
    const after = stuff(before);
    if (after === before) return;
    commit(after);
    if (after.phase === "burst") animate((s) => s.burst(before.cheeks + 1, afterAnimation));
    else api.current?.stuff(after.cheeks, fullness(after));
  }

  function onBank() {
    const before = latest.current;
    const after = bank(before);
    if (after === before) return;
    commit(after);
    animate((s) => s.bank(before.cheeks, afterAnimation));
  }

  function playAgain() {
    commit(newGame());
    setBest(null);
    api.current?.reset();
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    if (e.key === "b" || e.key === "B") {
      onBank();
    } else if (e.code === "Space" && target === document.body) {
      // On a focused button, Space already clicks that button.
      e.preventDefault();
      onStuff();
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const over = game.phase === "over";
  const busy = game.phase !== "stuffing";

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader links={[{ href: "/tired", label: "Games" }]} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 max-[350px]:px-3 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Cheek Stuffer</h1>
        <p className="mt-1 text-sm text-muted">Stuff the hamster&apos;s cheeks, then waddle the seeds to the nest before they burst.</p>

        <div className="relative mt-6">
          {/* The buttons below are the accessible way to play; this is the big tap target. */}
          <div
            aria-hidden="true"
            onPointerDown={(e) => {
              if (e.button === 0) onStuff();
            }}
            className="relative aspect-[3/2] w-full cursor-pointer touch-manipulation select-none overflow-hidden rounded-3xl bg-well"
          >
            <HamsterScene pose="eat" className={`absolute inset-0 m-auto w-1/2 transition-opacity duration-300 ${ready ? "opacity-0" : "opacity-100"}`} />
            <canvas ref={canvas} className={`absolute inset-0 size-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} />
          </div>
          {!over && (
            <p aria-live="polite" className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-fg shadow-sm">
              {mumble(game)}
            </p>
          )}
        </div>

        <dl className="mt-4 flex justify-between gap-4 text-sm text-muted">
          <Stat label="Trip" value={`${game.trip} of ${TRIPS}`} />
          <Stat label="In cheeks" value={game.cheeks} />
          <Stat label="In nest" value={game.banked} />
        </dl>

        {over ? (
          <section aria-live="polite" className="mt-6 text-center">
            <p className="text-sm text-muted">Your performance review</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{reviewTitle(game.banked)}</p>
            <p className="mt-1 text-sm text-muted">
              {game.banked} {game.banked === 1 ? "seed" : "seeds"} in the nest.{" "}
              {best?.isNew ? "A new personal best!" : `Your best is ${best?.score ?? 0}.`}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={playAgain} className={primary}>
                Stuff again
              </button>
              <Link href="/" className={secondary}>
                Back to work
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={onStuff} aria-disabled={busy} className={primary}>
                Stuff a seed
              </button>
              <button type="button" onClick={onBank} aria-disabled={busy || game.cheeks === 0} className={secondary}>
                Waddle to nest
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-faint pointer-coarse:hidden">Space to stuff, B to waddle</p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="font-medium tabular-nums text-fg">{value}</dd>
    </div>
  );
}
