"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFinePointer, usePrefersReducedMotion } from "@/lib/motion";

interface MagneticProps {
  children: ReactNode;
  /** Max translate distance in px (default 8). */
  strength?: number;
  className?: string;
  /** Render as a block wrapper (full-width CTA) instead of inline-block. */
  block?: boolean;
  "aria-hidden"?: boolean;
}

/**
 * Magnetic button wrapper — the wrapped CTA subtly follows the cursor within
 * a small radius (~strength px) and snaps back on mouse leave.
 *
 * Desktop-only: gated on `(hover: hover) and (pointer: fine)` AND
 * `prefers-reduced-motion`. On touch devices / reduced motion it renders a
 * plain span with no listeners and no transform, so there is zero cost.
 *
 * Renders a `<span>` (not a button/link) so it can wrap any existing
 * Link/button without changing semantics.
 */
export default function MagneticButton({
  children,
  strength = 8,
  className,
  block = false,
  ...rest
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const enabled = fine && !reduced;

  // Direct DOM style mutation (rAF-coalesced) — a mousemove storm never
  // re-renders React; only the transform on this span changes.
  const raf = useRef(0);
  useEffect(() => {
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el || !enabled) return;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        // Clamp to strength px so the button never wanders far from its slot.
        const clamp = (v: number) => Math.max(-strength, Math.min(strength, v));
        el.style.transform = `translate3d(${clamp(dx * 0.22)}px, ${clamp(dy * 0.22)}px, 0)`;
      });
    },
    [enabled, strength],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.transform = "translate3d(0, 0, 0)";
  }, []);

  return (
    <span
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        enabled
          ? {
              display: block ? "block" : "inline-block",
              transform: "translate3d(0, 0, 0)",
              transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </span>
  );
}
