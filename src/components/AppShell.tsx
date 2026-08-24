"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/lang-context";
import type { DictKey } from "@/lib/i18n";
import { Sidebar } from "./Sidebar";
import { StaffAlerts } from "./StaffAlerts";
import { usePrintBridge } from "@/lib/usePrintBridge";
import styles from "./AppShell.module.css";

const TITLE_KEYS: Record<string, DictKey> = {
  Home: "home",
  POS: "pos",
  Orders: "orders",
  Kitchen: "kitchen",
  Tables: "tables",
  Menu: "menu",
  Staff: "staff",
  "Day close": "dayClose",
  "Sales & Profit": "sales",
  Printer: "printer",
  Settings: "settings",
};

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { loading, token, role, tenant, user, impersonating, logout, refresh, exitHelp, billingPastDue } =
    useStore();
  const { lang, toggle, t } = useLang();
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();
  const { online: bridgeOnline } = usePrintBridge();

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    // Super without Help is not restaurant Admin — send them to HQ, never keep them in this shell.
    if (role === "super" && !impersonating) {
      router.replace("/control");
    }
  }, [loading, token, role, impersonating, router]);

  useEffect(() => {
    if (loading || !token || role === "super" || (tenant && user)) return;
    void refresh();
  }, [loading, token, role, tenant, user, refresh]);

  if (!tenant || !user) {
    return <div className={styles.loading}>{t("loading")}</div>;
  }

  return (
    <div className={styles.shell}>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className={styles.main}>
        {impersonating && (
          <div className={styles.helpBanner} role="status">
            <strong>{t("helpTitle")}</strong>
            <span>
              {t("helpBody").replace("{name}", tenant.branding.name).replace("{code}", tenant.code)}
            </span>
            <button
              type="button"
              className={styles.helpExit}
              onClick={async () => {
                await exitHelp();
                router.push("/control");
              }}
            >
              {t("backHq")}
            </button>
          </div>
        )}
        {billingPastDue && !impersonating && (
          <div className={styles.billingBanner} role="status">
            <strong>{t("billingTitle")}</strong>
            <span>{t("billingBody")}</span>
            <a href="/scan" className={styles.helpExit}>
              {t("openScanner")}
            </a>
          </div>
        )}
        <header className={styles.top}>
          <button type="button" className={styles.burgerBtn} onClick={() => setNavOpen(true)} aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <div className={styles.brandBlock}>
            {tenant.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.branding.logoUrl}
                alt=""
                className={styles.brandLogo}
              />
            ) : (
              <div className={styles.brandMark} aria-hidden>
                {(tenant.branding.name || tenant.code || "R").slice(0, 1)}
              </div>
            )}
            <div>
              <p className={styles.brand}>{tenant.branding.name}</p>
              <h1 className={styles.title}>{title ? (TITLE_KEYS[title] ? t(TITLE_KEYS[title]) : title) : undefined}</h1>
            </div>
          </div>
          <div className={styles.meta}>
            <button
              type="button"
              className={styles.langBtn}
              onClick={toggle}
              title={lang === "en" ? "اردو / Roman Urdu" : "English"}
            >
              {lang === "en" ? "اردو" : "EN"}
            </button>
            {impersonating ? (
              <span className={styles.badge}>{t("superHelping")}</span>
            ) : (
              <span className={styles.badgeMuted}>
                {user.role === "admin" ? t("restaurantAdmin") : t("staffRole")} · {tenant.code}
              </span>
            )}
            <span className={styles.user}>
              {user.roleLabel} · {user.username}
              {user.email ? ` · ${user.email}` : ""}
            </span>
            <button
              type="button"
              className={styles.logout}
              onClick={async () => {
                await logout();
                router.push(impersonating ? "/login?owner=1" : "/login");
              }}
            >
              {t("logout")}
            </button>
          </div>
        </header>
        <StaffAlerts />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
