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
  const { loading, token, role, tenant, user, impersonating, logout } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!token || role === "super")) {
      if (role === "super") router.replace("/super");
      else router.replace("/login");
    }
  }, [loading, token, role, router]);

  if (loading || !tenant || !user) {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <header className={styles.top}>
          <div>
            <p className={styles.brand}>{tenant.branding.name}</p>
            <h1 className={styles.title}>{title}</h1>
          </div>
          <div className={styles.meta}>
            {impersonating && <span className={styles.badge}>Impersonating</span>}
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
