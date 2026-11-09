"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows a token's resolved value in the theme it sits in (read from the page,
 * so it can never drift from globals.css).
 */
export function TokenValue({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (ref.current) setValue(getComputedStyle(ref.current).getPropertyValue(`--${name}`).trim());
  }, [name]);

  return (
    <span ref={ref} className="font-mono text-[11px] text-faint">
      {value || " "}
    </span>
  );
}
