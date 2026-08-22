"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Permission } from "@/lib/types";
import styles from "./Sidebar.module.css";

const NAV: { href: string; label: string; perm: Permission | "any" }[] = [
  { href: "/home", label: "Home", perm: "home" },
  { href: "/pos", label: "POS", perm: "pos" },
  { href: "/orders", label: "Orders", perm: "orders" },
  { href: "/kitchen", label: "Kitchen", perm: "kitchen" },
  { href: "/tables", label: "Tables", perm: "pos" },
  { href: "/menu", label: "Menu", perm: "menu" },
  { href: "/staff", label: "Staff", perm: "staff" },
  { href: "/day-close", label: "Day close", perm: "settings" },
  { href: "/sales", label: "Sales & Profit", perm: "settings" },
  { href: "/settings", label: "Settings", perm: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenant } = useStore();
  const perms = new Set(user?.permissions ?? []);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    for (const n of NAV) router.prefetch(n.href);
  }, [router]);

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
            {user?.username ? `${user.username} · ` : ""}
            {tenant?.code}
          </p>
        </div>
      </div>
      <nav className={styles.nav}>
        {NAV.filter((n) => isAdmin || n.perm === "any" || perms.has(n.perm as Permission)).map(
          (n) => (
            <Link
              key={n.href}
              href={n.href}
              prefetch
              className={pathname === n.href ? styles.active : styles.link}
            >
              {n.label}
            </Link>
          ),
        )}
      </nav>
    </aside>
  );
}
