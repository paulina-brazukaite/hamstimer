"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { useGameStage } from "@/components/use-game-stage";
import type { Hud } from "@/lib/hamster3d/not-today-game";
import { HIT_LINES, PERIODS, laziness, verdict, type GameEvent, type Run } from "@/lib/not-today";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";

const loadStage = () => import("@/lib/hamster3d/not-today-game").then((m) => m.createNotToday);

const EMPTY_HUD: Hud = { period: 0, progress: 0, dodged: 0, stuck: 0, seeds: 0 };
const FIRST_LINE = "Today, the hamster will do nothing.";

const pill = "inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-medium whitespace-nowrap transition-colors";
const primary = `${pill} bg-lamp text-lamp-fg`;
const secondary = `${pill} border border-line bg-surface text-fg hover:border-faint`;

interface Result {
  title: string;
  score: number;
  best: number;
  isNew: boolean;
  dodged: number;
  stuck: number;
  seeds: number;
}

function lineFor(event: GameEvent): string | null {
  switch (event.type) {
    case "hit":
      return HIT_LINES[event.kind];
    case "seed":
      return "Mmf.";
    case "pillow":
      return "Zzz… everything slows down.";
    case "cancel":
      return "Cancelled!";
    case "period":
      return `${PERIODS[event.period]}. Still nope.`;
    case "home":
      return "Home. Finally.";
    default:
      return null;
  }
}

export function NotToday() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { api, ready, failed } = useGameStage(canvas, loadStage);
  const [playing, setPlaying] = useState(false);
  const [hud, setHud] = useState(EMPTY_HUD);
  const [line, setLine] = useState(FIRST_LINE);
  const [result, setResult] = useState<Result | null>(null);

  function finish(run: Run) {
    const score = laziness(run);
    const saved = readJSON<unknown>(KEYS.notTodayBest, 0);
    const previous = typeof saved === "number" && Number.isFinite(saved) ? saved : 0;
    const isNew = score > previous;
    if (isNew) writeJSON(KEYS.notTodayBest, score);
    setPlaying(false);
    setResult({ title: verdict(run.stuck.length), score, best: Math.max(previous, score), isNew, dodged: run.dodged, stuck: run.stuck.length, seeds: run.seeds });
  }

  function start() {
    if (!api.current) return;
    setResult(null);
    setHud(EMPTY_HUD);
    setLine(`${PERIODS[0]}. Nope.`);
    setPlaying(true);
    api.current.start({
      onHud: setHud,
      onEvent: (event) => {
        const next = lineFor(event);
        if (next) setLine(next);
      },
      onEnd: finish,
    });
  }

  function steer(clientX: number, box: DOMRect) {
    api.current?.steer((clientX - box.left) / box.width);
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!playing || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    const direction = e.key === "ArrowLeft" || e.key === "a" ? -1 : e.key === "ArrowRight" || e.key === "d" ? 1 : 0;
    if (direction === 0) return;
    e.preventDefault();
    api.current?.setDirection(e.type === "keydown" ? direction : 0);
  });

  // Next keeps a page you've left alive but hidden, and its 3D scene is rebuilt on
  // return, so a day in progress can't be resumed. Coming back starts fresh.
  useEffect(
    () => () => {
      setPlaying(false);
      setResult(null);
      setHud(EMPTY_HUD);
      setLine(FIRST_LINE);
    },
    [],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
    };
  }, []);

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader links={[{ href: "/tired", label: "Games" }]} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 max-[350px]:px-3 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Not Today</h1>
        <p className="mt-1 text-sm text-muted">Get through the whole day without doing a single thing.</p>

        {failed ? (
          <p className="mt-6 rounded-3xl bg-well p-8 text-center text-sm text-muted">
            This game needs 3D graphics, and this browser isn&apos;t offering any. Cheek Stuffer works without them.
          </p>
        ) : (
          <>
            <div className="relative mt-6">
              <div
                aria-hidden="true"
                onPointerDown={(e) => steer(e.clientX, e.currentTarget.getBoundingClientRect())}
                onPointerMove={(e) => steer(e.clientX, e.currentTarget.getBoundingClientRect())}
                className="relative aspect-[3/2] w-full touch-none select-none overflow-hidden rounded-3xl bg-well"
              >
                <canvas ref={canvas} className={`absolute inset-0 size-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} />
              </div>
              {!result && (
                <p aria-live="polite" className="pointer-events-none absolute top-3 left-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-fg shadow-sm">
                  {line}
                </p>
              )}
              {!playing && !result && ready && (
                <button type="button" onClick={start} className={`${primary} absolute bottom-5 left-1/2 -translate-x-1/2`}>
                  Start the day
                </button>
              )}
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
              <div className="h-full rounded-full bg-lamp" style={{ width: `${hud.progress * 100}%` }} />
            </div>
            <dl className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted">
              <Stat label="Time" value={PERIODS[hud.period]} />
              <Stat label="Dodged" value={hud.dodged} />
              <Stat label="Stuck" value={hud.stuck} />
              <Stat label="Seeds" value={hud.seeds} />
            </dl>

            {result ? (
              <section aria-live="polite" className="mt-6 text-center">
                <p className="text-sm text-muted">Today&apos;s verdict</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{result.title}</p>
                <p className="mt-1 text-sm text-muted">
                  Laziness score {result.score}. {result.isNew ? "A new personal best!" : `Your best is ${result.best}.`}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={start} className={primary}>
                    Another day
                  </button>
                  <Link href="/" className={secondary}>
                    Back to work
                  </Link>
                </div>
              </section>
            ) : (
              <p className="mt-4 text-center text-xs text-faint">
                <span className="pointer-coarse:hidden">Move your mouse, or use the arrow keys. </span>
                <span className="hidden pointer-coarse:inline">Drag across the picture to move. </span>
                Seeds score, but make you wider.
              </p>
            )}
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
