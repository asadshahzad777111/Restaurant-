"use client";

/** Continuous kitchen alert tone for Staff / POS WebView (Capacitor-safe). */

export const SOUND_PREF_KEY = "ordo_staff_order_sound_v1";

export function readSoundPref(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_PREF_KEY) === "1";
}

export function writeSoundPref(on: boolean) {
  localStorage.setItem(SOUND_PREF_KEY, on ? "1" : "0");
}

type Ctx = AudioContext;

let sharedCtx: Ctx | null = null;
let loopTimer: number | null = null;
let active = false;

function getCtx(): Ctx | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

/** Call from a user gesture so WebView/browser unlocks audio. */
export async function unlockStaffAlertAudio(): Promise<boolean> {
  const ctx = getCtx();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    // Tiny silent blip to satisfy autoplay policies.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
    return true;
  } catch {
    return false;
  }
}

function chirp(ctx: Ctx, freq: number, start: number, dur: number, vol = 0.07) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** One alert pattern (two tones). Looped by startContinuousAlert. */
function playPattern(kind: "order" | "stock" = "order") {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);
  const t = ctx.currentTime;
  if (kind === "stock") {
    chirp(ctx, 660, t, 0.16, 0.05);
    chirp(ctx, 520, t + 0.2, 0.18, 0.05);
  } else {
    chirp(ctx, 880, t, 0.18, 0.07);
    chirp(ctx, 1100, t + 0.22, 0.2, 0.07);
    chirp(ctx, 880, t + 0.48, 0.16, 0.06);
  }
}

export function isStaffAlertActive() {
  return active;
}

/** Loop until stopStaffAlert(). Safe to call repeatedly — restarts cleanly. */
export function startContinuousAlert(kind: "order" | "stock" = "order") {
  stopStaffAlert();
  active = true;
  playPattern(kind);
  loopTimer = window.setInterval(() => {
    if (!active) return;
    playPattern(kind);
  }, kind === "stock" ? 2200 : 1400);
}

export function stopStaffAlert() {
  active = false;
  if (loopTimer != null) {
    window.clearInterval(loopTimer);
    loopTimer = null;
  }
}

/** Best-effort iOS Safari/PWA: resume AudioContext after tab returns (autoplay still needs Enable sound once). */
export function resumeStaffAlertAudioIfNeeded() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
}

let visibilityHooked = false;

/** Call once from StaffAlerts so returning to the PWA can resume the unlocked context. */
export function ensureStaffAlertVisibilityResume() {
  if (typeof document === "undefined" || visibilityHooked) return;
  visibilityHooked = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resumeStaffAlertAudioIfNeeded();
  });
}
