"use client";

import { useEffect, useState } from "react";
import { isCustomerShell } from "@/lib/app-shell";
import { hasSeenApkWelcome, markApkWelcomeSeen } from "@/lib/apk-welcome";
import { ApkWelcome } from "./ApkWelcome";

/** First Customer APK open for this kitchen. */
export function CustomerApkWelcome({
  restaurantName,
  code,
}: {
  restaurantName: string;
  code: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isCustomerShell() || !code) return;
    setOpen(!hasSeenApkWelcome("customer", code));
  }, [code]);

  if (!open || !restaurantName) return null;

  return (
    <ApkWelcome
      kind="customer"
      restaurantName={restaurantName}
      code={code}
      onContinue={() => {
        markApkWelcomeSeen("customer", code);
        setOpen(false);
      }}
    />
  );
}
