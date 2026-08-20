"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dismissIosGuide,
  shouldShowIosHomeGuide,
} from "@/lib/ios-guide";
import styles from "./IosHomeScreenGuide.module.css";

type Props = {
  /** customer = diner menu · staff = POS / Admin login */
  audience: "customer" | "staff";
  restaurantName?: string;
  /** Called when user continues (guide hidden). */
  onFinished?: () => void;
  /** Force from ?guide=1 even if previously dismissed. */
  force?: boolean;
};

const STEPS = [
  {
    title: "1 · Share dabao",
    ur: "Safari ke neeche (ya upar) Share button — box + up arrow.",
    en: "Tap the Share button (square with an arrow).",
    art: "share",
  },
  {
    title: "2 · Add to Home Screen",
    ur: "List scroll karo → “Add to Home Screen” / “Home Screen par add karein”.",
    en: "Scroll the sheet → tap Add to Home Screen.",
    art: "list",
  },
  {
    title: "3 · Add",
    ur: "Upar-right Add dabao. Icon Home pe aa jayega.",
    en: "Tap Add. The icon appears on your Home Screen.",
    art: "add",
  },
  {
    title: "4 · Icon se kholo",
    ur: "Ab app Home Screen se kholo — yeh kitchen lock rehti hai.",
    en: "Open from Home Screen — this kitchen stays locked.",
    art: "home",
  },
] as const;

function StepArt({ kind }: { kind: (typeof STEPS)[number]["art"] }) {
  if (kind === "share") {
    return (
      <svg className={styles.art} viewBox="0 0 120 80" aria-hidden>
        <rect x="28" y="8" width="64" height="64" rx="12" className={styles.phone} />
        <rect x="48" y="58" width="24" height="6" rx="2" className={styles.accent} />
        <path
          d="M60 28v22M60 28l-8 8M60 28l8 8"
          className={styles.arrow}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "list") {
    return (
      <svg className={styles.art} viewBox="0 0 120 80" aria-hidden>
        <rect x="20" y="10" width="80" height="60" rx="10" className={styles.sheet} />
        <rect x="32" y="22" width="56" height="8" rx="2" className={styles.row} />
        <rect x="32" y="36" width="56" height="10" rx="2" className={styles.rowHi} />
        <text x="60" y="44" textAnchor="middle" className={styles.mini}>
          Add to Home Screen
        </text>
        <rect x="32" y="52" width="40" height="8" rx="2" className={styles.row} />
      </svg>
    );
  }
  if (kind === "add") {
    return (
      <svg className={styles.art} viewBox="0 0 120 80" aria-hidden>
        <rect x="18" y="18" width="84" height="44" rx="8" className={styles.sheet} />
        <text x="36" y="44" className={styles.mini}>
          Cancel
        </text>
        <rect x="72" y="30" width="22" height="16" rx="4" className={styles.accent} />
        <text x="83" y="42" textAnchor="middle" className={styles.miniOn}>
          Add
        </text>
      </svg>
    );
  }
  return (
    <svg className={styles.art} viewBox="0 0 120 80" aria-hidden>
      <rect x="20" y="12" width="28" height="28" rx="6" className={styles.icon} />
      <rect x="56" y="12" width="28" height="28" rx="6" className={styles.iconDim} />
      <rect x="20" y="46" width="28" height="28" rx="6" className={styles.iconDim} />
      <rect x="56" y="46" width="28" height="28" rx="6" className={styles.iconDim} />
      <circle cx="34" cy="26" r="6" className={styles.accent} />
    </svg>
  );
}

export function IosHomeScreenGuide({ audience, restaurantName, onFinished, force }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceGuide = force || params.get("guide") === "1" || params.get("install") === "1";
    const show = shouldShowIosHomeGuide({ forceGuideParam: forceGuide });
    setOpen(show);
    if (!show) onFinished?.();
    // intentionally only re-check when force flips; onFinished is a signal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [force]);

  const finish = useCallback(
    (persist: boolean) => {
      if (persist) dismissIosGuide();
      setOpen(false);
      onFinished?.();
    },
    [onFinished],
  );

  if (!open) return null;

  const name = restaurantName?.trim() || (audience === "staff" ? "Staff" : "Restaurant");
  const current = STEPS[step]!;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="ios-guide-title">
      <div className={styles.panel}>
        <p className={styles.kicker}>iPhone · Home Screen</p>
        <h2 id="ios-guide-title">
          {audience === "staff" ? `${name} Staff app` : `${name} order app`}
        </h2>
        <p className={styles.lead}>
          APK iPhone pe nahi chalti. Neeche 4 steps — Share → Add to Home Screen. Phir icon se
          kholo (is kitchen only).
        </p>

        <div className={styles.stepCard}>
          <StepArt kind={current.art} />
          <h3>{current.title}</h3>
          <p className={styles.ur}>{current.ur}</p>
          <p className={styles.en}>{current.en}</p>
        </div>

        <div className={styles.dots}>
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className={i === step ? styles.dotOn : styles.dot}
              aria-label={`Step ${i + 1}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className={styles.actions}>
          {step < STEPS.length - 1 ? (
            <button type="button" className={styles.primary} onClick={() => setStep((s) => s + 1)}>
              Next step
            </button>
          ) : (
            <button type="button" className={styles.primary} onClick={() => finish(true)}>
              Home Screen pe add kar liya
            </button>
          )}
          <button type="button" className={styles.ghost} onClick={() => finish(false)}>
            Abhi Safari mein continue
          </button>
        </div>
        <p className={styles.foot}>
          Tip: Chrome se bhi Share sheet Safari jaisi hoti hai. Pehle se icon laga ho to yeh guide
          skip.
        </p>
      </div>
    </div>
  );
}
