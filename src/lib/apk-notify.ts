"use client";

/** Web / Capacitor WebView notification helpers for Staff + Customer APK shells. */

const PROMPT_KEY = "ordo_apk_notify_prompted_v1";
const MSG_KEY = "ordo_apk_inbox_seen_v1";

export function apkNotifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function apkNotifyPermission() {
  if (!apkNotifySupported()) return "unsupported" as const;
  return Notification.permission;
}

export async function requestApkNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!apkNotifySupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showApkNotify(title: string, body: string, tag?: string) {
  if (!apkNotifySupported() || Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, {
      body,
      tag: tag || "ordo",
      icon: "/ordo-icon.svg",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function shouldPromptApkNotify() {
  if (typeof window === "undefined") return false;
  if (!apkNotifySupported()) return false;
  if (Notification.permission !== "default") return false;
  return localStorage.getItem(PROMPT_KEY) !== "1";
}

export function markApkNotifyPrompted() {
  localStorage.setItem(PROMPT_KEY, "1");
}

export function apkInboxSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(MSG_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function markApkInboxSeen(id: string) {
  const next = [...new Set([...apkInboxSeen(), id])];
  localStorage.setItem(MSG_KEY, JSON.stringify(next.slice(-40)));
}
