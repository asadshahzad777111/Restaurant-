"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/lang-context";
import type { Permission } from "@/lib/types";
import type { DictKey } from "@/lib/i18n";
import styles from "./Sidebar.module.css";

const NAV: { href: string; key: DictKey; perm: Permission | "any" }[] = [
  { href: "/home", key: "home", perm: "home" },
  { href: "/pos", key: "pos", perm: "pos" },
  { href: "/printer", key: "printer", perm: "pos" },
  { href: "/orders", key: "orders", perm: "orders" },
  { href: "/kitchen", key: "kitchen", perm: "kitchen" },
  { href: "/tables", key: "tables", perm: "pos" },
  { href: "/menu", key: "menu", perm: "menu" },
  { href: "/staff", key: "staff", perm: "staff" },
  { href: "/day-close", key: "dayClose", perm: "settings" },
  { href: "/sales", key: "sales", perm: "settings" },
  { href: "/settings", key: "settings", perm: "settings" },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenant, api, applyTenant } = useStore();
  const { t } = useLang();
  const perms = new Set(user?.permissions ?? []);
  const isAdmin = user?.role === "admin";

  async function togglePause() {
    const paused = !tenant?.orderingPaused;
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "orderingPaused", paused }),
    });
    const data = await res.json();
    if (res.ok && data.tenant) applyTenant(data.tenant);
  }

  useEffect(() => {
    for (const n of NAV) router.prefetch(n.href);
  }, [router]);

  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} aria-hidden />}
      <aside className={`${styles.side}${open ? ` ${styles.sideOpen}` : ""}`}>
        <div className={styles.sideHead}>
          <div className={styles.logoWrap}>
            {tenant?.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.branding.logoUrl} alt="" className={styles.logo} />
            ) : (
              <div className={styles.mark}>{tenant?.branding.name?.slice(0, 1) ?? "R"}</div>
            )}
            <div>
              <strong>{tenant?.branding.name}</strong>
              <p className={styles.code}>{tenant?.code}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className={styles.nav}>
          {NAV.filter((n) => isAdmin || n.perm === "any" || perms.has(n.perm as Permission)).map(
            (n) => (
              <Link
                key={n.href}
                href={n.href}
                prefetch
                onClick={onClose}
                className={pathname === n.href ? styles.active : styles.link}
              >
                {t(n.key)}
              </Link>
            ),
          )}
        </nav>
        {isAdmin && (
          <button
            type="button"
            className={`${styles.pauseBtn}${tenant?.orderingPaused ? ` ${styles.pauseOn}` : ""}`}
            onClick={() => void togglePause()}
            title={tenant?.orderingPaused ? "Resume guest ordering" : "Pause guest ordering (billing pause)"}
          >
            {tenant?.orderingPaused ? "▶ Resume ordering" : "⏸ Pause ordering"}
          </button>
        )}
      </aside>
    </>
  );
}
