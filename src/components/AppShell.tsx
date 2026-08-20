"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { StaffAlerts } from "./StaffAlerts";
import styles from "./AppShell.module.css";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { loading, token, role, tenant, user, impersonating, logout, refresh, exitHelp, billingPastDue } =
    useStore();
  const router = useRouter();

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
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        {impersonating && (
          <div className={styles.helpBanner} role="status">
            <strong>Help mode · Super</strong>
            <span>
              You are helping {tenant.branding.name} ({tenant.code}). This is not ORDO HQ and not their
              Admin login — open any Admin screen without their password.
            </span>
            <button
              type="button"
              className={styles.helpExit}
              onClick={async () => {
                await exitHelp();
                router.push("/control");
              }}
            >
              Back to ORDO HQ
            </button>
          </div>
        )}
        {billingPastDue && !impersonating && (
          <div className={styles.billingBanner} role="status">
            <strong>Billing past due</strong>
            <span>
              Contact ORDO Super to renew. Staff tools stay open. Guests can still use Scanner → menu.
            </span>
            <a href="/scan" className={styles.helpExit}>
              Open scanner
            </a>
          </div>
        )}
        <header className={styles.top}>
          <div>
            <p className={styles.brand}>{tenant.branding.name}</p>
            <h1 className={styles.title}>{title}</h1>
          </div>
          <div className={styles.meta}>
            {impersonating ? (
              <span className={styles.badge}>Super helping this restaurant</span>
            ) : (
              <span className={styles.badgeMuted}>
                {user.role === "admin" ? "Restaurant Admin" : "Staff"} · {tenant.code}
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
              Log out
            </button>
          </div>
        </header>
        <StaffAlerts />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
