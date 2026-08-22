"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./motion";

/**
 * Smooth count-up toward `target`. Respects prefers-reduced-motion.
 * Used for PKR revenue, order counts, and margin figures across dashboards.
 */
export function useCountUp(target: number, duration = 700): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return value;
}
