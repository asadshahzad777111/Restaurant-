"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy Super desk. HQ is /control — never auto-impersonate, never bounce to Admin /home. */
export default function SuperPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/control");
  }, [router]);
  return <p style={{ padding: "2rem", color: "#646970" }}>Opening ORDO HQ…</p>;
}
