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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenant } = useStore();
  const { t } = useLang();
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
          <p className={styles.code}>{tenant?.code}</p>
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
              {t(n.key)}
            </Link>
          ),
        )}
      </nav>
    </aside>
  );
}
