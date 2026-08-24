"use client";

import { useEffect, useState } from "react";
import type { Transition, Variants } from "framer-motion";

/** ORDO storefront motion — calm, AsFix/Gear-like feel (not flashy). */

export const easePrimary = [0.22, 1, 0.36, 1] as const;
export const easeOutAlt = [0.16, 1, 0.3, 1] as const;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);
  return reduced;
}

export function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);
  return coarse;
}

export function pageEnter(reduced: boolean, coarse: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.16 } },
    };
  }
  if (coarse) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.16, ease: easePrimary } },
    };
  }
  return {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22, ease: easePrimary },
    },
  };
}

export function sectionEnter(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.2 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: easePrimary },
    },
  };
}

export function listContainer(stagger = 0.055): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: 0.04 },
    },
  };
}

export function listItem(reduced: boolean, coarse: boolean): Variants {
  if (reduced || coarse) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.2, ease: easePrimary } },
    };
  }
  return {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: easePrimary },
    },
  };
}

export function emptyState(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.25 } },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.98 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.35, ease: easeOutAlt },
    },
  };
}

export const sheetTransition: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 36,
  mass: 0.85,
};

export function backdropTransition(reduced: boolean): Transition {
  return { duration: reduced ? 0.12 : 0.2, ease: easePrimary };
}

export const toastTransition: Transition = {
  duration: 0.2,
  ease: easePrimary,
};

export const viewOnce = {
  once: true,
  amount: 0.2 as const,
  margin: "0px 0px -40px 0px" as const,
};
