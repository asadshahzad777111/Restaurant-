"use client";

import { motion, type Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/motion";

const easePrimary = [0.22, 1, 0.36, 1] as const;

function wordVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.16 } },
    };
  }
  return {
    hidden: { opacity: 0, y: "0.55em", rotateX: 8 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { duration: 0.5, ease: easePrimary, delay: 0.08 + i * 0.05 },
    }),
  };
}

interface KineticHeadingProps {
  /** Plain text split into words (whitespace-separated). */
  text: string;
  /** Optional accent segment rendered as <em> with a longer delay ("lands last"). */
  accent?: string;
  className?: string;
  level?: "h1" | "h2" | "h3";
  /** Animate on mount (hero) instead of on scroll into view. */
  animate?: "mount" | "inView";
  "aria-label"?: string;
}

/**
 * Kinetic typography: splits text into words and staggers each word up + fade
 * in with a subtle rotateX, so the headline reads as a sequence instead of a
 * single block. The optional accent (orange em-dash segment) gets a longer
 * delay and lands last to draw the eye.
 *
 * prefers-reduced-motion → a plain opacity fade, no per-word movement.
 * The component renders a motion element that works on mount or whileInView.
 */
export default function KineticHeading({
  text,
  accent,
  className,
  level = "h1",
  animate = "mount",
  ...rest
}: KineticHeadingProps) {
  const reduced = usePrefersReducedMotion();
  const variants = wordVariants(reduced);
  const words = text.split(/\s+/).filter(Boolean);

  const Tag = motion[level] as typeof motion.h1;
  const shown = {
    initial: "hidden",
    ...(animate === "mount"
      ? { animate: "show" }
      : { whileInView: "show", viewport: { once: true, amount: 0.5 } }),
  } as const;

  return (
    <Tag
      className={className}
      variants={variants}
      style={{ perspective: 700 }}
      {...shown}
      {...rest}
    >
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          variants={variants}
          custom={i}
          style={{ display: "inline-block", marginRight: "0.24em", willChange: "transform" }}
        >
          {w}
        </motion.span>
      ))}
      {accent ? (
        <motion.em
          variants={variants}
          custom={words.length + 2}
          style={{ display: "inline-block", willChange: "transform" }}
        >
          {accent}
        </motion.em>
      ) : null}
    </Tag>
  );
}
