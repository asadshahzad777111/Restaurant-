"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import { useCountUp } from "@/lib/use-count-up";
import { listContainer, listItem, usePrefersReducedMotion } from "@/lib/motion";
import type { Permission } from "@/lib/types";
import styles from "../staff.module.css";

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      className={`${styles.card} ${styles.statCard}${accent ? ` ${styles.statAccent}` : ""}`}
      variants={listItem(false, false)}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      <span className={styles.muted}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </motion.div>
  );
}

const ACTIONS: {
  href: string;
  label: string;
  emoji: string;
  perm: "pos" | "orders" | "kitchen" | "staff" | "settings";
  note: string;
}[] = [
  { href: "/pos", label: "POS / counter", emoji: "🛒", perm: "pos", note: "New bill" },
  { href: "/kitchen", label: "Kitchen", emoji: "🍳", perm: "kitchen", note: "Live tickets" },
  { href: "/orders", label: "Orders / billing", emoji: "🧾", perm: "orders", note: "Queue + pay" },
  { href: "/tables", label: "Tables", emoji: "🪑", perm: "pos", note: "Floor map" },
  { href: "/sales", label: "Sales & Profit", emoji: "📊", perm: "settings", note: "This week" },
  { href: "/day-close", label: "Day close", emoji: "🌙", perm: "settings", note: "Shift record" },
];

export default function HomePage() {
  const { tenant, user } = useStore();
  const reduced = usePrefersReducedMotion();
  const perms = new Set(user?.permissions ?? []);
  const isAdmin = user?.role === "admin";
  const can = (perm: Permission) => isAdmin || perms.has(perm);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const orders = tenant?.orders ?? [];
  const today = useMemo(
    () =>
      orders.filter((o) => {
        const d = new Date(o.createdAt);
        const n = new Date();
        return d.toDateString() === n.toDateString();
      }),
    [orders],
  );
  const revenue = today.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const completed = today.filter((o) => o.status === "completed").length;
  const open = today.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const cancelled = today.filter((o) => o.status === "cancelled").length;
  const lowStock = (tenant?.stock ?? []).filter((s) => s.quantity <= s.lowThreshold);
  const zeroStock = lowStock.some((s) => s.quantity <= 0);
  const cur = tenant?.shop.currency || "PKR";
  const revenueShown = useCountUp(revenue);
  const openShown = useCountUp(open);
  const doneShown = useCountUp(completed);

  const dateLine = now.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const clock = now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  const firstName = (user?.username || "there").replace(/^./, (c) => c.toUpperCase());

  return (
    <AppShell title="Home">
      <div className={styles.page}>
        {user?.mustChangePassword && (
          <motion.div
            className={styles.card}
            style={{ marginBottom: "1rem", borderColor: "#f5c542" }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <strong>Password change recommended</strong>
            <p className={styles.muted}>
              Demo passwords are for /lab only. Production mein Settings → Change password use karein.
            </p>
            <Link href="/settings" prefetch className={styles.btn}>
              Open settings
            </Link>
          </motion.div>
        )}

        <motion.header
          className={styles.homeHero}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div>
            <h2 className={styles.homeGreeting}>Salam, {firstName} 👋</h2>
            <p className={styles.muted}>
              {tenant?.branding.name} · {tenant?.code} · {dateLine}
            </p>
          </div>
          <div className={styles.homeClock} aria-label={`Current time ${clock}`}>
            <strong>{clock}</strong>
            <span>today's shift</span>
          </div>
        </motion.header>

        <motion.div
          className={styles.grid}
          variants={listContainer(0.07)}
          initial="hidden"
          animate="show"
        >
          <StatCard label="Today revenue" value={money(cur, revenueShown)} accent hint="PKR · live" />
          <StatCard label="Open tickets" value={String(openShown)} hint="placed → ready" />
          <StatCard
            label="Completed / void"
            value={`${doneShown} / ${cancelled}`}
            hint="today"
          />
        </motion.div>

        {lowStock.length > 0 && (
          <motion.div
            className={`${styles.card} ${zeroStock ? styles.stockCritical : ""}`}
            style={{ marginTop: "1rem", borderColor: zeroStock ? "#c94a3c" : "#ffb020" }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <strong>
              {zeroStock ? "⚠ Stock empty — items 86" : "⚠ Low stock (warning only — app still works)"}
            </strong>
            <p className={styles.muted}>
              {lowStock.map((s) => `${s.name} (${s.quantity}${s.unit})`).join(" · ")}
            </p>
            {can("stock") && (
              <Link href="/menu" prefetch className={styles.btn}>
                Manage menu / stock
              </Link>
            )}
          </motion.div>
        )}

        <motion.section
          className={styles.quickWrap}
          variants={listContainer(0.055)}
          initial="hidden"
          animate="show"
        >
          <h3 className={styles.quickTitle}>Quick actions</h3>
          <div className={styles.quickGrid}>
            {ACTIONS.filter((a) => can(a.perm)).map((a) => (
              <motion.div key={a.href} variants={listItem(reduced, false)}>
                <Link
                  href={a.href}
                  prefetch
                  className={styles.quickTile}
                  style={{ animationDelay: "0s" }}
                >
                  <span className={styles.quickEmoji} aria-hidden>
                    {a.emoji}
                  </span>
                  <strong>{a.label}</strong>
                  <em>{a.note}</em>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </AppShell>
  );
}
