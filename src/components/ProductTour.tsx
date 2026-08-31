"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sectionEnter, usePrefersReducedMotion, viewOnce } from "@/lib/motion";
import styles from "./ProductTour.module.css";

gsap.registerPlugin(ScrollTrigger);

type TourStep = { title: string; body: string };

/**
 * Product tour — scroll-driven horizontal carousel (GSAP ScrollTrigger).
 *
 * The section is pinned while the user scrolls; vertical scroll is translated
 * into horizontal movement of the card track (scrub). Each card takes its turn
 * centered, scales up to 1.05 with an orange glow, and passed cards shrink to
 * 0.85 / opacity 0.6. prefers-reduced-motion falls back to a plain grid.
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
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const cards = Array.from(track.children) as HTMLElement[];
    if (cards.length < 2) return;

    const mm = gsap.matchMedia();

    const buildTimeline = (isMobile: boolean) => {
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
          // Desktop: 300% of viewport height of scroll. Mobile: less, so the
          // scrub stays natural on a short thumb swipe.
          end: () => "+=" + window.innerHeight * (isMobile ? 2 : 3),
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
    };

    mm.add("(min-width: 768px)", () => buildTimeline(false));
    mm.add("(max-width: 767px)", () => buildTimeline(true));

    return () => mm.revert();
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
            <div className={styles.track} ref={trackRef}>
              {steps.map((s, i) => (
                <article key={s.title} className={styles.card}>
                  <span className={styles.cardNo}>0{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
