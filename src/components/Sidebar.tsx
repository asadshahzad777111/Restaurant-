"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Permission } from "@/lib/types";
import { planAllows, type PlanCapability } from "@/lib/plans";
import styles from "./Sidebar.module.css";

const NAV: {
  href: string;
  label: string;
  hint?: string;
  perm: Permission | "any";
  cap?: PlanCapability;
}[] = [
  { href: "/home", label: "Home", perm: "home" },
  { href: "/pos", label: "POS", hint: "Billing", perm: "pos", cap: "pos" },
  { href: "/orders", label: "Orders", hint: "Tickets", perm: "orders", cap: "orders" },
  { href: "/kitchen", label: "Kitchen", hint: "Prep", perm: "kitchen", cap: "kitchen" },
  { href: "/tables", label: "Tables", perm: "pos", cap: "tables" },
  { href: "/menu", label: "Menu", perm: "menu", cap: "menu" },
  { href: "/day-close", label: "Day close", perm: "settings", cap: "dayClose" },
  { href: "/settings", label: "Settings", perm: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, tenant, planId } = useStore();
  const perms = new Set(user?.permissions ?? []);
  const isAdmin = user?.role === "admin";

  const items = NAV.filter((n) => {
    if (!(isAdmin || n.perm === "any" || perms.has(n.perm as Permission))) return false;
    if (n.cap && !planAllows(planId, n.cap)) return false;
    return true;
  });

  return (
    <aside className={styles.side}>
      <div className={styles.logoWrap}>
        {tenant?.branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.branding.logoUrl} alt="" className={styles.logo} />
        ) : (
          <div className={styles.mark}>{tenant?.branding.name?.slice(0, 1) ?? "R"}</div>
        )}
        <div className={styles.logoText}>
          <strong>{tenant?.branding.name}</strong>
          <p className={styles.code}>
            {tenant?.code} · Staff tools
          </p>
        </div>
      </div>
      <nav className={styles.nav}>
        {items.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={pathname === n.href ? styles.active : styles.link}
          >
            <span className={styles.linkLabel}>{n.label}</span>
            {n.hint ? <span className={styles.linkHint}>{n.hint}</span> : null}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
