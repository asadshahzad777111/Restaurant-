/** Client-safe iOS / Home Screen helpers for install guide. */

export function isIosDevice(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS desktop UA
  if (typeof navigator !== "undefined" && /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  } catch {
    /* ignore */
  }
  return false;
}

const DISMISS_KEY = "ordo_ios_homescreen_guide_v1";

export function wasIosGuideDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissIosGuide() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Show guide on iOS browser when not yet a Home Screen app. */
export function shouldShowIosHomeGuide(opts?: { forceGuideParam?: boolean }) {
  if (typeof window === "undefined") return false;
  if (!isIosDevice()) return false;
  if (isStandaloneDisplay()) return false;
  if (opts?.forceGuideParam) return true;
  if (wasIosGuideDismissed()) return false;
  return true;
}
