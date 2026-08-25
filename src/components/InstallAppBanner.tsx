"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { isCustomerShell, isStaffShell } from "@/lib/app-shell";
import { tenantApkLoadsPath } from "@/lib/apk-urls";
import { sheetTransition, usePrefersReducedMotion } from "@/lib/motion";
import styles from "./InstallAppBanner.module.css";

const DISMISS_KEY = "ordo_install_banner_dismissed";

/**
 * Professional "install the app" prompt shown on the guest order page (web
 * browsers only). Once the tenant is known, the Customer app deep link locks
 * to that restaurant, so the installed app opens this kitchen directly.
 */
export function InstallAppBanner({
  tenantCode,
  restaurantName,
  logoUrl,
}: {
  tenantCode: string;
  restaurantName: string;
  logoUrl?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Never show inside an installed APK/PWA shell.
    if (isCustomerShell() || isStaffShell()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === tenantCode) return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [tenantCode]);

  if (!visible || dismissed || !tenantCode) return null;

  const href = `${window.location.origin}${tenantApkLoadsPath(tenantCode, "customer")}`;
  const name = restaurantName.trim() || tenantCode;

  return (
    <AnimatePresence>
      <motion.aside
        className={styles.banner}
        role="status"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={sheetTransition}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className={styles.logo} />
        ) : (
          <span className={styles.logoFallback} aria-hidden>
            {name.slice(0, 1)}
          </span>
        )}
        <div className={styles.copy}>
          <strong className={styles.title}>
            Order faster with the {name} app
          </strong>
          <p className={styles.body}>
            Install it once and it opens <em>{name}</em> directly — scan, order, and track your food
            without opening the browser again.
          </p>
        </div>
        <div className={styles.actions}>
          <a className={styles.install} href={href}>
            📲 Install app
          </a>
          <button
            type="button"
            className={styles.dismiss}
            aria-label="Dismiss install prompt"
            onClick={() => {
              setDismissed(true);
              try {
                localStorage.setItem(DISMISS_KEY, tenantCode);
              } catch {
                /* ignore */
              }
            }}
          >
            ✕
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
