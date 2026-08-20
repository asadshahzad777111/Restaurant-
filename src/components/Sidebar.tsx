"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Permission } from "@/lib/types";
import styles from "./Sidebar.module.css";

const NAV: { href: string; label: string; hint?: string; perm: Permission | "any" }[] = [
  { href: "/home", label: "Home", perm: "home" },
  { href: "/pos", label: "POS", hint: "Counter sales", perm: "pos" },
  { href: "/orders", label: "Orders", hint: "Live tickets", perm: "orders" },
  { href: "/kitchen", label: "Kitchen", hint: "Prep board", perm: "kitchen" },
  { href: "/tables", label: "Tables", perm: "pos" },
  { href: "/menu", label: "Menu", perm: "menu" },
  { href: "/day-close", label: "Day close", perm: "settings" },
  { href: "/settings", label: "Settings", perm: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, tenant } = useStore();
  const perms = new Set(user?.permissions ?? []);
  const isAdmin = user?.role === "admin";

  return (
    <aside className={styles.side}>
      <div className={styles.logoWrap}>
        {tenant?.branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.branding.logoUrl} alt="" className={styles.logo} />
        ) : (
          <div className={styles.mark}>{tenant?.branding.name?.slice(0, 1) ?? "R"}</div>
        )}
        <div>
          <strong>{tenant?.branding.name}</strong>
          <p className={styles.code}>
            {tenant?.code} · Staff tools
          </p>
        </div>
      </div>
      <nav className={styles.nav}>
        {NAV.filter((n) => isAdmin || n.perm === "any" || perms.has(n.perm as Permission)).map(
          (n) => (
            <Link
              key={n.href}
              href={n.href}
              className={pathname === n.href ? styles.active : styles.link}
            >
              <span className={styles.linkLabel}>{n.label}</span>
              {n.hint ? <span className={styles.linkHint}>{n.hint}</span> : null}
            </Link>
          ),
        )}
      </nav>
    </aside>
  );
}
