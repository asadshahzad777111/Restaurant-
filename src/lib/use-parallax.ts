"use client";

import { useScroll, useTransform, type MotionValue } from "framer-motion";
import type { RefObject } from "react";

type Range = [number, number];

export interface ParallaxInput {
  /** translateY range while the section travels through the viewport. */
  y?: Range;
  /** scale range (1 → 1.08 feels like depth). */
  scale?: Range;
  /** extra rotate offset layered on top of any ambient CSS spin. */
  rotate?: Range;
  /** opacity fade (e.g. cards drifting out as the section leaves). */
  opacity?: Range;
}

export interface ParallaxResult {
  y?: MotionValue<number>;
  scale?: MotionValue<number>;
  rotate?: MotionValue<number>;
  opacity?: MotionValue<number>;
  /** Raw progress (0 at "start start", 1 at "end start") — derive more transforms with useTransform. */
  scrollYProgress: MotionValue<number>;
}

/**
 * Scroll-linked parallax scoped to ONE section container.
 *
 * - `target` must be a ref on the section element; Framer Motion's useScroll
 *   measures that container only, so nothing is computed while the section is
 *   far off-screen, and the listener is cleaned up on unmount.
 * - `offset: ["start start", "end start"]` = progress 0 when the section top
 *   hits the viewport top, progress 1 when the section bottom reaches the top.
 * - Only transform/opacity values are returned — never top/left (no layout
 *   thrashing). Apply them via `style` on motion elements.
 *
 * Callers decide whether to *use* the values: when prefers-reduced-motion is
 * on, pass `enabled={false}` so the elements stay static (values are still
 * computed to keep hook order stable, but the caller simply doesn't attach
 * them to style).
 */
export function useParallax<T extends HTMLElement>(
  target: RefObject<T | null>,
  input: ParallaxInput = {},
  enabled = true,
): ParallaxResult {
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end start"],
  });

  // Hooks must run unconditionally — compute always, gate usage by `enabled`.
  const y = input.y ? useTransform(scrollYProgress, [0, 1], input.y) : undefined;
  const scale = input.scale ? useTransform(scrollYProgress, [0, 1], input.scale) : undefined;
  const rotate = input.rotate ? useTransform(scrollYProgress, [0, 1], input.rotate) : undefined;
  const opacity = input.opacity ? useTransform(scrollYProgress, [0, 1], input.opacity) : undefined;

  return { y, scale, rotate, opacity, scrollYProgress };
}
