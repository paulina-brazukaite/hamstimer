"use client";

import { useEffect, useRef, useState } from "react";
import { HamsterScene } from "@/components/hamster-scene";
import type { HamsterPose } from "@/lib/hamster";
import type { HamsterStageApi } from "@/lib/hamster3d/stage";

/**
 * The hamster above the task: the 3D clay hamster when WebGL is available,
 * the flat drawing otherwise (and while three.js is still loading).
 *
 * Decoration only: hidden from screen readers, not clickable, and a fixed box,
 * so nothing on the page moves when it loads or changes pose. three.js is
 * imported lazily, after the page is up, so it never delays the timer.
 */
export function HamsterStage({ pose, className = "" }: { pose: HamsterPose; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<HamsterStageApi | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !hasWebGL()) return;
    let cancelled = false;
    let themeObserver: MutationObserver | null = null;

    import("@/lib/hamster3d/stage")
      .then(({ createHamsterStage }) => {
        if (cancelled) return;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const stage = createHamsterStage(el, { reducedMotion, look: lookFromUrl() });
        api.current = stage;
        const applyTheme = () => stage.setTheme(readTheme());
        applyTheme();
        themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        setReady(true); // the effect below then gives it the current pose
      })
      .catch(() => {
        // No 3D (old browser, blocked WebGL, chunk failed): the drawing stays.
      });

    return () => {
      cancelled = true;
      themeObserver?.disconnect();
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.setPose(pose);
  }, [pose, ready]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative mx-auto aspect-[160/104] w-[170px] select-none sm:w-[220px] ${className}`}
    >
      <HamsterScene
        pose={pose}
        className={`absolute inset-0 transition-opacity duration-300 ${ready ? "opacity-0" : "opacity-100"}`}
      />
      <canvas
        ref={canvas}
        className={`absolute inset-0 size-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

/**
 * Which hamster look to draw. TEMPORARY while we compare: "painted" by default,
 * `?look=clay` shows the clay one. Remove once a look is chosen.
 */
function lookFromUrl(): "clay" | "painted" {
  return new URLSearchParams(window.location.search).get("look") === "clay" ? "clay" : "painted";
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function readTheme() {
  const css = getComputedStyle(document.documentElement);
  return {
    prop: css.getPropertyValue("--prop").trim() || "#9ea3aa",
    propSoft: css.getPropertyValue("--prop-soft").trim() || "#c6cacf",
    dark: document.documentElement.dataset.theme !== "light",
  };
}
