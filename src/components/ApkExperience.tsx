"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { isStaffShell, isCustomerShell, readAppShell, readLockedCustomerTenant } from "@/lib/app-shell";
import { hasSeenApkWelcome } from "@/lib/apk-welcome";
import {
  markApkInboxSeen,
  markApkNotifyPrompted,
  requestApkNotifyPermission,
  shouldPromptApkNotify,
  showApkNotify,
  apkInboxSeen,
} from "@/lib/apk-notify";
import { backdropTransition, sheetTransition, usePrefersReducedMotion } from "@/lib/motion";
import styles from "./ApkExperience.module.css";

type Tip = { id: string; title: string; body: string; href?: string };

function tipsForShell(shell: string): Tip[] {
  if (shell === "customer") {
    return [
      {
        id: "welcome-kitchen",
        title: "This kitchen only",
        body: "The restaurant name at the top is yours. Menu, cart, and order tracking stay on this kitchen — other restaurants cannot open here.",
      },
      {
        id: "scan-menu",
        title: "Scan to open the menu",
        body: "Use Scanner anytime — even when a kitchen’s billing is paused you can still open their menu from a table QR.",
        href: "/scan",
      },
      {
        id: "notify-ready",
        title: "Order updates",
        body: "Allow notifications so ORDO can tip you when your order moves. You can change this later in system settings.",
      },
    ];
  }
  if (shell === "staff") {
    return [
      {
        id: "hello-staff",
        title: "Hello — your kitchen app",
        body: "Top bar shows your name and this restaurant. POS billing, kitchen tickets, and Bluetooth thermal print are in this Staff app. Admin sends the Customer app from Settings → Your apps.",
      },
      {
        id: "staff-alerts",
        title: "Order alerts + sound",
        body: "Tap Enable order sound once (needed on iPhone Safari too). New dine-in, delivery, and pickup tickets beep until you tap Stop alert.",
      },
      {
        id: "billing-scan",
        title: "Scanner stays available",
        body: "If billing is past due you will see a banner — Scanner still opens the guest menu for table QR checks.",
        href: "/scan",
      },
    ];
  }
  return [];
}

/** Distinct APK chrome: delayed notify prompt + tip popups. Web browsers get a lighter path. */
export function ApkExperience() {
  const reduced = usePrefersReducedMotion();
  const [shell, setShell] = useState("web");
  const [promptOpen, setPromptOpen] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const s = readAppShell();
    setShell(s);
    if (s !== "staff" && s !== "customer" && !isStaffShell() && !isCustomerShell()) return;

    const promptTimer = window.setTimeout(() => {
      if (s === "customer") {
        const code = readLockedCustomerTenant();
        if (code && !hasSeenApkWelcome("customer", code)) return;
      }
      if (shouldPromptApkNotify()) setPromptOpen(true);
    }, 16000);

    const tipTimer = window.setTimeout(() => {
      const seen = new Set(apkInboxSeen());
      const next = tipsForShell(s).find((t) => !seen.has(t.id));
      if (next) setTip(next);
    }, 14000);

    return () => {
      window.clearTimeout(promptTimer);
      window.clearTimeout(tipTimer);
    };
  }, []);

  async function allowNotify() {
    markApkNotifyPrompted();
    const perm = await requestApkNotifyPermission();
    setPromptOpen(false);
    if (perm === "granted") {
      showApkNotify("ORDO", "Notifications are on for this restaurant app.", "ordo-welcome");
    }
  }

  function dismissTip() {
    if (tip) markApkInboxSeen(tip.id);
    setTip(null);
  }

  if (shell !== "staff" && shell !== "customer") return null;

  return (
    <AnimatePresence>
      {promptOpen && (
        <motion.div
          key="apk-notify"
          className={styles.layer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition(reduced)}
        >
          <motion.div
            className={styles.card}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={sheetTransition}
            role="dialog"
            aria-labelledby="apk-notify-title"
          >
            <p className={styles.kicker}>{shell === "customer" ? "Customer app" : "Staff app"}</p>
            <h2 id="apk-notify-title">Allow notifications?</h2>
            <p>
              {shell === "customer"
                ? "Get a quiet popup when your order is cooking or ready."
                : "Get a popup when a guest places a new order."}
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => void allowNotify()}>
                Allow
              </button>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  markApkNotifyPrompted();
                  setPromptOpen(false);
                }}
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {!promptOpen && tip && (
        <motion.aside
          key={tip.id}
          className={styles.toast}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={sheetTransition}
          role="status"
        >
          <strong>{tip.title}</strong>
          <p>{tip.body}</p>
          <div className={styles.actions}>
            {tip.href && (
              <a className={styles.primary} href={tip.href}>
                Open scanner
              </a>
            )}
            <button type="button" className={styles.ghost} onClick={dismissTip}>
              Got it
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
