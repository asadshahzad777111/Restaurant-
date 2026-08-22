"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { isStaffShell } from "@/lib/app-shell";
import { tenantApkHomeLabels } from "@/lib/apk-urls";
import styles from "@/app/staff.module.css";

export function StaffHomeHub() {
  const { tenant, user } = useStore();
  const perms = new Set(user?.permissions ?? []);
  const isAdmin = user?.role === "admin";
  const can = (perm: "pos" | "orders" | "kitchen" | "settings") => isAdmin || perms.has(perm);
  const name = tenant?.branding.name || tenant?.code || "Kitchen";
  const labels = tenantApkHomeLabels(name);
  const helloName = user?.username || user?.roleLabel || "team";
  const apk = isStaffShell();

  return (
    <div className={styles.helloCard}>
      <p className={styles.helloKicker}>{apk ? labels.staff : "Staff"}</p>
      <h2 className={styles.helloTitle}>Hello, {helloName}</h2>
      <p className={styles.muted} style={{ margin: "0.35rem 0 0" }}>
        <strong>{name}</strong>
        {user?.role === "admin" ? " · Restaurant Admin" : user?.roleLabel ? ` · ${user.roleLabel}` : ""}
        {tenant?.code ? ` · ${tenant.code}` : ""}
      </p>
      <div className={styles.hubGrid}>
        {can("pos") && (
          <Link href="/pos" className={styles.hubTile}>
            <strong>POS billing</strong>
            <span>Counter tickets &amp; takeaway</span>
          </Link>
        )}
        {can("kitchen") && (
          <Link href="/kitchen" className={styles.hubTile}>
            <strong>Kitchen</strong>
            <span>Tickets + order alert</span>
          </Link>
        )}
        {can("orders") && (
          <Link href="/orders" className={styles.hubTile}>
            <strong>Orders</strong>
            <span>Print &amp; complete</span>
          </Link>
        )}
        {can("pos") && (
          <Link href="/tables" className={styles.hubTile}>
            <strong>Tables</strong>
            <span>Floor &amp; dine-in</span>
          </Link>
        )}
        {can("settings") && (
          <Link href="/settings#thermal" className={styles.hubTile}>
            <strong>Thermal printer</strong>
            <span>{apk ? "Bluetooth in this Staff app" : "Open Staff APK to print"}</span>
          </Link>
        )}
        {isAdmin && (
          <Link href="/settings#apps" className={styles.hubTile}>
            <strong>Customer app</strong>
            <span>Download &amp; send to guests</span>
          </Link>
        )}
      </div>
    </div>
  );
}
