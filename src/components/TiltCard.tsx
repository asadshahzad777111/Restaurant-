"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
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
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el || !enabled) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ rx: -py * max * 2, ry: px * max * 2 });
    },
    [enabled, max],
  );

  const onLeave = useCallback(() => setTilt({ rx: 0, ry: 0 }), []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transformStyle: "preserve-3d",
        transform: enabled
          ? `perspective(900px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
          : undefined,
        transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
