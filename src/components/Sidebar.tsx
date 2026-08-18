"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Permission } from "@/lib/types";
import styles from "./Sidebar.module.css";

const NAV: { href: string; label: string; perm: Permission }[] = [
  { href: "/home", label: "Home", perm: "home" },
  { href: "/pos", label: "POS", perm: "pos" },
  { href: "/orders", label: "Orders", perm: "orders" },
  { href: "/kitchen", label: "Kitchen", perm: "kitchen" },
  { href: "/menu", label: "Menu", perm: "menu" },
  { href: "/settings", label: "Settings", perm: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, tenant } = useStore();
  const perms = new Set(user?.permissions ?? []);

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
          <p className={styles.code}>{tenant?.code}</p>
        </div>
      </div>
      <nav className={styles.nav}>
        {NAV.filter((n) => perms.has(n.perm) || user?.role === "admin").map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={pathname === n.href ? styles.active : styles.link}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
