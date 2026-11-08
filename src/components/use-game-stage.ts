"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { hasWebGL } from "@/components/hamster-stage";

interface GameStage {
  setTheme(theme: { dark: boolean }): void;
  dispose(): void;
}

type StageFactory<T> = (canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }) => T;

/**
 * Lazily loads a three.js game scene onto a canvas and keeps it in step with the
 * theme. `load` must be stable (define it outside the component). `failed` means
 * no 3D here: an old browser, blocked WebGL, or a chunk that didn't load.
 */
export function useGameStage<T extends GameStage>(canvas: RefObject<HTMLCanvasElement | null>, load: () => Promise<StageFactory<T>>) {
  const api = useRef<T | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    let cancelled = false;
    let themeObserver: MutationObserver | null = null;

    (el && hasWebGL() ? load() : Promise.reject(new Error("no WebGL")))
      .then((create) => {
        if (cancelled || !el) return;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const stage = create(el, { reducedMotion });
        api.current = stage;
        const applyTheme = () => stage.setTheme({ dark: document.documentElement.dataset.theme !== "light" });
        applyTheme();
        themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      themeObserver?.disconnect();
      api.current?.dispose();
      api.current = null;
    };
  }, [canvas, load]);

  return { api, ready, failed };
}
