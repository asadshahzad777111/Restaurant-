"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, TOKEN_KEY, OWNER_TOKEN_KEY } from "@/lib/store";
import { planAllows, upgradeHint } from "@/lib/plans";
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
  const {
    loading,
    token,
    role,
    tenant,
    user,
    impersonating,
    planId,
    setToken,
    logout,
  } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!token || role === "super")) {
      if (role === "super") router.replace("/control");
      else router.replace("/login");
    }
  }, [loading, token, role, router]);

  async function backToHq() {
    const owner = localStorage.getItem(OWNER_TOKEN_KEY);
    if (owner) {
      localStorage.setItem(TOKEN_KEY, owner);
      localStorage.removeItem(OWNER_TOKEN_KEY);
      setToken(owner);
      router.push("/control");
      return;
    }
    await logout();
    router.push("/login?owner=1");
  }

  if (loading || !tenant || !user) {
    return <div className={styles.loading}>Loading…</div>;
  }

  const isSample = tenant.code === "DEMO" || tenant.code === "ISO2";
  const hint = upgradeHint(planId);

  return (
    <div className={styles.shell} data-staff-shell="1">
      <Sidebar />
      <div className={styles.main}>
        {impersonating && (
          <div className={styles.helpBanner}>
            <div>
              <strong>
                {isSample
                  ? "Help mode · sample restaurant"
                  : `Help mode · ${tenant.branding.name}`}
              </strong>
              <span>
                {isSample
                  ? " This is not your HQ. DEMO is a test kitchen so you can try tools. Real clients get their own name after you Add restaurant."
                  : ` You are helping ${tenant.code} without their password. This is their panel — not ORDO HQ.`}
              </span>
            </div>
            <button type="button" onClick={() => void backToHq()}>
              Back to ORDO HQ
            </button>
          </div>
        )}
        <header className={styles.top}>
          <div className={styles.topLeft}>
            <div className={styles.chips}>
              {impersonating ? (
                <span className={styles.helpChip}>ORDO HQ · helping</span>
              ) : (
                <span className={styles.panelChip}>Restaurant panel</span>
              )}
              {isSample && (
                <span className={styles.demoChip}>Sample / test only</span>
              )}
            </div>
            <p className={styles.brand}>{tenant.branding.name}</p>
            <h1 className={styles.title}>{title}</h1>
          </div>
          <div className={styles.meta}>
            <span className={styles.user}>
              {user.roleLabel} · {user.username}
            </span>
            <button
              type="button"
              className={styles.logout}
              onClick={async () => {
                if (impersonating) {
                  await backToHq();
                  return;
                }
                await logout();
                router.push("/login");
              }}
            >
              {impersonating ? "Back to HQ" : "Log out"}
            </button>
          </div>
        </header>
        {planId === "starter" && !planAllows(planId, "sales") && hint && (
          <div className={styles.planNudge}>
            <strong>Starter plan</strong>
            <span>{hint}</span>
          </div>
        )}
        <StaffAlerts />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
