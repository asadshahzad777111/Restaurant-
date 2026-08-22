"use client";

import { AnimatePresence, motion } from "framer-motion";
import { backdropTransition, sheetTransition, usePrefersReducedMotion } from "@/lib/motion";
import { tenantApkHomeLabels } from "@/lib/apk-urls";
import styles from "./ApkExperience.module.css";

export function ApkWelcome(props: {
  kind: "staff" | "customer";
  restaurantName: string;
  personName?: string;
  roleLabel?: string;
  code?: string;
  onContinue: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const labels = tenantApkHomeLabels(props.restaurantName);
  const hello =
    props.kind === "staff"
      ? `Hello${props.personName ? `, ${props.personName}` : ""}`
      : `Welcome to ${props.restaurantName}`;

  return (
    <AnimatePresence>
      <motion.div
        key="apk-welcome"
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
          aria-labelledby="apk-welcome-title"
        >
          <p className={styles.kicker}>
            {props.kind === "staff" ? labels.staff : labels.customer}
            {props.code ? ` · ${props.code}` : ""}
          </p>
          <h2 id="apk-welcome-title">{hello}</h2>
          {props.kind === "staff" ? (
            <p>
              You are in <strong>{props.restaurantName}</strong>
              {props.roleLabel ? ` as ${props.roleLabel}` : ""}. POS billing, kitchen tickets, and
              Bluetooth thermal print live here. Guests use a separate Customer app — Admin sends it
              from Settings → Your apps.
            </p>
          ) : (
            <p>
              This app stays on <strong>{props.restaurantName}</strong> only. Order dine-in, pickup,
              or delivery. Kitchen staff use a different Staff app for billing and print.
            </p>
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={props.onContinue}>
              Continue
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
