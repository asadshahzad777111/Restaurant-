"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { planAllows, upgradeHint, type PlanCapability } from "@/lib/plans";
import styles from "@/app/staff.module.css";

export function PlanGate({
  need,
  children,
}: {
  need: PlanCapability;
  children: React.ReactNode;
}) {
  const store = useStore();
  const planId = "planId" in store ? (store as { planId?: string | null }).planId : "pro";
  if (!planId || planAllows(planId, need)) return <>{children}</>;
  return (
    <div className={styles.upgrade}>
      <strong>Not on your plan</strong>
      <p className={styles.muted} style={{ margin: "0.4rem 0 0", color: "inherit" }}>
        {upgradeHint(planId) || "Upgrade to unlock this tool."}
      </p>
      <div className={styles.row}>
        <Link href="/pos" className={styles.btn}>
          Back to POS billing
        </Link>
        <Link href="/home" className={styles.btnGhost}>
          Home
        </Link>
      </div>
    </div>
  );
}
