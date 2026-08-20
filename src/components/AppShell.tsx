"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, TOKEN_KEY, OWNER_TOKEN_KEY } from "@/lib/store";
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
  const { loading, token, role, tenant, user, impersonating, setToken, logout } = useStore();
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

  const isDemo = tenant.code === "DEMO" || tenant.code === "ISO2";

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        {impersonating && (
          <div className={styles.helpBanner}>
            <div>
              <strong>Helping: {tenant.branding.name}</strong>
              <span>
                {" "}
                ({tenant.code}) — you are in their restaurant panel, not ORDO HQ
              </span>
            </div>
            <button type="button" onClick={() => void backToHq()}>
              Back to ORDO HQ
            </button>
          </div>
        )}
        <header className={styles.top}>
          <div>
            <div className={styles.chips}>
              <span className={styles.panelChip}>Restaurant panel</span>
              {isDemo && <span className={styles.demoChip}>Demo / trial</span>}
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
                await logout();
                router.push("/login");
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
