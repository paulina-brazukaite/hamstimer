"use client";

import { useEffect, useRef } from "react";

const EMBED_SRC = "https://app.trysoro.com/api/embed/2f03c6c6-392d-43af-80af-fbccafdde9fa";

// Blog posts published from Soro. Not next/script: it loads each src only once
// per browser session, so coming back to /blog through a Link would leave the
// widget empty. Adding the script on every mount fills it each time.
export function SoroBlog({ className }: { className?: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = container.current;
    let script: HTMLScriptElement | undefined;
    // Deferred so Strict Mode's throwaway first mount never starts a download.
    const timer = setTimeout(() => {
      script = document.createElement("script");
      script.src = EMBED_SRC;
      document.body.appendChild(script);
    }, 0);
    return () => {
      clearTimeout(timer);
      script?.remove();
      target?.replaceChildren();
    };
  }, []);

  return <div id="soro-blog" ref={container} className={className} />;
}
