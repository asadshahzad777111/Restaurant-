"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/lang-context";
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
      <strong className={styles.statValue} suppressHydrationWarning>{value}</strong>
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
  { href: "/printer", label: "Printer", emoji: "🖨️", perm: "pos", note: "Thermal print" },
  { href: "/kitchen", label: "Kitchen", emoji: "🍳", perm: "kitchen", note: "Live tickets" },
  { href: "/orders", label: "Orders / billing", emoji: "🧾", perm: "orders", note: "Queue + pay" },
  { href: "/tables", label: "Tables", emoji: "🪑", perm: "pos", note: "Floor map" },
  { href: "/sales", label: "Sales & Profit", emoji: "📊", perm: "settings", note: "This week" },
  { href: "/day-close", label: "Day close", emoji: "🌙", perm: "settings", note: "Shift record" },
];

export default function HomePage() {
  const { tenant, user } = useStore();
  const { t } = useLang();
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
  // Stable "today" baseline — resolve the calendar day once, not on every render.
  const day = useMemo(() => new Date().toDateString(), []);
  const today = useMemo(
    () =>
      orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d.toDateString() === day;
      }),
    [orders, day],
  );
  const revenue = today.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const completed = today.filter((o) => o.status === "completed").length;
  const open = today.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const cancelled = today.filter((o) => o.status === "cancelled").length;
  const lowStock = (tenant?.stock ?? []).filter((s) => s.quantity <= s.lowThreshold);
  const zeroStockCount = lowStock.filter((s) => s.quantity <= 0).length;
  const cur = tenant?.shop.currency || "PKR";
  const revenueShown = useCountUp(revenue);
  const openShown = useCountUp(open);
  const doneShown = useCountUp(completed);

  // Analytics — today's orders by channel / service
  const byChannel = useMemo(() => {
    const c: Record<string, number> = {};
    today.forEach((o) => {
      c[o.channel] = (c[o.channel] || 0) + 1;
    });
    return Object.entries(c);
  }, [today]);
  const byService = useMemo(() => {
    const s: Record<string, number> = {};
    today.forEach((o) => {
      s[o.serviceType] = (s[o.serviceType] || 0) + 1;
    });
    return Object.entries(s);
  }, [today]);

  const dateLine = now.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const clock = now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  const firstName = (user?.username || "there").replace(/^./, (c) => c.toUpperCase());

  return (
    <AppShell title={t("home")}>
      <div className={styles.page}>
        {user?.mustChangePassword && (
          <motion.div
            className={styles.card}
            style={{ marginBottom: "1rem", borderColor: "var(--staff-warning)" }}
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
          <StatCard label={t("todayRevenue")} value={money(cur, revenueShown)} accent hint="PKR · live" />
          <StatCard label={t("openTickets")} value={String(openShown)} hint={t("onThePass")} />
          <StatCard
            label={t("completedVoid")}
            value={`${doneShown} / ${cancelled}`}
            hint={t("todayShiftLabel")}
          />
        </motion.div>

        {today.length > 0 && (
          <motion.div
            className={styles.reportSplit}
            variants={listContainer(0.08)}
            initial="hidden"
            animate="show"
          >
            <div className={styles.card}>
              <h3 style={{ marginTop: 0 }}>By channel</h3>
              <ul className={styles.reportList}>
                {byChannel.map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.card}>
              <h3 style={{ marginTop: 0 }}>By service · today</h3>
              <ul className={styles.reportList}>
                {byService.map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {lowStock.length > 0 && (
          <motion.div
            className={`${styles.card} ${zeroStockCount > 0 ? styles.stockCritical : ""}`}
            style={{ marginTop: "1rem", borderColor: zeroStockCount > 0 ? "var(--staff-danger)" : "var(--staff-warning)" }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <strong>
              {zeroStockCount > 0
                ? `⚠ ${zeroStockCount} item${zeroStockCount > 1 ? "s" : ""} are out of stock`
                : "⚠ Low stock — warning only, app still works"}
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
          <h3 className={styles.quickTitle}>{t("quickActions")}</h3>
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
