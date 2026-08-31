"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sectionEnter, usePrefersReducedMotion, viewOnce } from "@/lib/motion";
import TiltCard from "@/components/TiltCard";
import styles from "./ProductTour.module.css";

gsap.registerPlugin(ScrollTrigger);

type TourStep = { title: string; body: string };

/** Role-tinted backgrounds — each card gets its own faint wash as it centers. */
const TINTS = [
  "rgba(255, 133, 0, 0.10)", // Guest · orange
  "rgba(255, 170, 60, 0.10)", // Counter POS · amber
  "rgba(224, 84, 60, 0.10)", // Kitchen · warm red
  "rgba(140, 128, 116, 0.12)", // Owner · neutral
];

/**
 * Product tour — scroll-driven horizontal carousel (GSAP ScrollTrigger).
 *
 * The section is pinned while the user scrolls; vertical scroll is translated
 * into horizontal movement of the card track (scrub). Each card takes its turn
 * centered, scales up to 1.05 with an orange glow, and passed cards shrink to
 * 0.85 / opacity 0.6. A progress rail + role-tinted background wash track the
 * active card. prefers-reduced-motion falls back to a plain grid.
 */
export default function ProductTour({
  kicker,
  title,
  lead,
  steps,
}: {
  kicker: string;
  title: string;
  lead: string;
  steps: TourStep[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    const tint = tintRef.current;
    if (!section || !track || !tint) return;

    const cards = Array.from(track.children) as HTMLElement[];
    if (cards.length < 2) return;

    const mm = gsap.matchMedia();

    const buildTimeline = (distance: number, isMobile: boolean) => {
      const gap = parseFloat(getComputedStyle(track).gap) || 22;
      const step = cards[0].offsetWidth + gap;
      const totalX = -(step * (cards.length - 1));

      const active = {
        scale: 1.05,
        opacity: 1,
        boxShadow:
          "0 0 0 3px rgba(255,133,0,0.22), 0 24px 60px -20px rgba(255,133,0,0.5)",
      };
      const quiet = {
        scale: 1,
        opacity: 1,
        boxShadow:
          "0 0 0 0 rgba(255,133,0,0), 0 24px 60px -20px rgba(255,133,0,0)",
      };
      const passed = {
        scale: 0.85,
        opacity: 0.6,
        boxShadow:
          "0 0 0 0 rgba(255,133,0,0), 0 24px 60px -20px rgba(255,133,0,0)",
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + window.innerHeight * distance,
          scrub: true,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Whole track travels left; each card centers on its turn.
      tl.to(track, { x: totalX, duration: cards.length - 1 }, 0);

      // Per-card states keyed into the same timeline (n cards → n−1 steps,
      // each one step long so scrub pacing matches the track travel).
      cards.forEach((cardEl, i) => {
        if (i === 0) {
          gsap.set(cardEl, active);
          if (cards.length > 1) tl.to(cardEl, { ...passed, duration: 1 }, 0);
        } else if (i === cards.length - 1) {
          tl.fromTo(cardEl, quiet, { ...active, duration: 1 }, i - 1);
        } else {
          tl.fromTo(cardEl, quiet, { ...active, duration: 1 }, i - 1);
          tl.to(cardEl, { ...passed, duration: 1 }, i);
        }
      });

      // Progress rail: the dot of the active card lights up.
      dotRefs.current.forEach((dot, i) => {
        if (!dot) return;
        const dim = { scale: 1, opacity: 0.35, backgroundColor: "var(--m-muted)" };
        const lit = { scale: 1.25, opacity: 1, backgroundColor: "var(--m-orange)" };
        if (i === 0) {
          gsap.set(dot, lit);
          if (cards.length > 1) tl.to(dot, { ...dim, duration: 1 }, 0);
        } else if (i === cards.length - 1) {
          tl.fromTo(dot, dim, { ...lit, duration: 1 }, i - 1);
        } else {
          tl.fromTo(dot, dim, { ...lit, duration: 1 }, i - 1);
          tl.to(dot, { ...dim, duration: 1 }, i);
        }
      });

      // Background wash: faint role tint shifts as each card becomes active.
      if (!isMobile) {
        tint.style.opacity = "1";
        tl.fromTo(
          tint,
          { backgroundColor: TINTS[0] },
          { backgroundColor: TINTS[TINTS.length - 1], duration: cards.length - 1 },
          0,
        );
      }
    };

    // Desktop: 300% scroll. Tablet: 250%. Mobile: 200% (smaller cards, less travel).
    mm.add("(min-width: 1024px)", () => buildTimeline(3, false));
    mm.add("(min-width: 768px) and (max-width: 1023px)", () => buildTimeline(2.5, false));
    mm.add("(max-width: 767px)", () => buildTimeline(2, true));

    // Mobile browser address-bar show/hide shifts the pin; refresh on it.
    const onOrientation = () => ScrollTrigger.refresh();
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("resize", onOrientation);

    return () => {
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("resize", onOrientation);
      mm.revert();
    };
  }, [reduced]);

  const entrance = sectionEnter(reduced);

  return (
    <section className={styles.section} id="tour" ref={sectionRef}>
      <div className={styles.wrap}>
        <motion.div variants={entrance} initial="hidden" whileInView="show" viewport={viewOnce}>
          <p className={styles.kicker}>{kicker}</p>
          <h2>{title}</h2>
          <p className={styles.leadWide}>{lead}</p>
        </motion.div>

        {reduced ? (
          <div className={styles.grid}>
            {steps.map((s, i) => (
              <article key={s.title} className={styles.card}>
                <span className={styles.cardNo}>0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.stage} aria-label="Product tour — scroll to explore">
            <div className={styles.tourTint} ref={tintRef} aria-hidden />
            <div className={styles.track} ref={trackRef}>
              {steps.map((s, i) => (
                <article key={s.title} className={styles.card}>
                  <TiltCard max={6} className={styles.cardInner}>
                    <span className={styles.cardNo}>0{i + 1}</span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </TiltCard>
                </article>
              ))}
            </div>
            <div className={styles.tourProgress} aria-hidden>
              {steps.map((s, i) => (
                <span
                  key={s.title}
                  ref={(el) => {
                    dotRefs.current[i] = el;
                  }}
                  className={styles.tourDot}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
