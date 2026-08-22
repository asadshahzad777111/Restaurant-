"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { isStaffShell } from "@/lib/app-shell";
import { hasSeenApkWelcome, markApkWelcomeSeen, staffWelcomeId } from "@/lib/apk-welcome";
import { ApkWelcome } from "./ApkWelcome";

/** First Staff APK / phone login: Hello + restaurant + role. */
export function StaffApkWelcome() {
  const { tenant, user } = useStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!tenant || !user) return;
    if (!isStaffShell()) return;
    const id = staffWelcomeId(tenant.id, user.id);
    setOpen(!hasSeenApkWelcome("staff", id));
  }, [tenant, user]);

  if (!open || !tenant || !user) return null;

  return (
    <ApkWelcome
      kind="staff"
      restaurantName={tenant.branding.name || tenant.code}
      personName={user.username}
      roleLabel={user.role === "admin" ? "Restaurant Admin" : user.roleLabel}
      code={tenant.code}
      onContinue={() => {
        markApkWelcomeSeen("staff", staffWelcomeId(tenant.id, user.id));
        setOpen(false);
      }}
    />
  );
}
