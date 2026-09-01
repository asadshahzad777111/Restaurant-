"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useFinePointer, usePrefersReducedMotion } from "@/lib/motion";

interface TiltCardProps {
  children: ReactNode;
  /** Max tilt in degrees (default 6). */
  max?: number;
  className?: string;
}

/**
 * 3D tilt-on-hover card: rotateX/rotateY driven by the cursor position inside
 * the card (max ~6deg), with preserve-3d so children can pop with translateZ.
 *
 * Desktop-only: gated on `(hover: hover) and (pointer: fine)` and
 * prefers-reduced-motion. On touch / reduced motion no transform is applied
 * and no listeners are attached.
 *
 * Uses a single `perspective()` inside the transform (GPU-friendly), never
 * animates top/left. Children that should sit "above" the tilt can use
 * `transform: translateZ(30px)` via their own CSS.
 */
export default function TiltCard({ children, max = 6, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const enabled = fine && !reduced;
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
        const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        const rx = -py * max * 2;
        const ry = px * max * 2;
        el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
    },
    [enabled, max],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transformStyle: "preserve-3d",
        transform: enabled
          ? "perspective(900px) rotateX(0deg) rotateY(0deg)"
          : undefined,
        transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
