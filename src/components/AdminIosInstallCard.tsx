"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { tenantInstallUrl } from "@/lib/pwa-links";
import styles from "@/app/staff.module.css";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function AdminIosInstallCard() {
  const { tenant } = useStore();
  const [copied, setCopied] = useState<"customer" | "staff" | "">("");

  const code = (tenant?.code || "").trim().toUpperCase();
  if (!code) return null;

  const customerUrl = tenantInstallUrl(code, "customer");
  const staffUrl = tenantInstallUrl(code, "staff");
  const name = tenant?.branding.name || code;

  async function onCopy(which: "customer" | "staff", url: string) {
    const ok = await copyText(url);
    setCopied(ok ? which : "");
    if (ok) window.setTimeout(() => setCopied(""), 2200);
  }

  return (
    <div className={styles.card}>
      <h3 style={{ marginTop: 0 }}>Install on iPhone</h3>
      <p className={styles.muted}>
        Android APKs iPhone pe nahi chalte. Share these <strong>locked</strong> links (
        <code>tenant={code}</code>) — Customer = diners, Staff = team / POS / Admin. Add to Home
        Screen se app-like icon. Logo & name = Settings. Dusri kitchen merge nahi hoti.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Customer (diners)</strong>
        <p className={styles.muted} style={{ margin: "0.25rem 0" }}>
          Opens {name} menu only.
        </p>
        <code style={{ display: "block", wordBreak: "break-all", fontSize: "0.85rem" }}>
          {customerUrl}
        </code>
        <button
          type="button"
          className={styles.btn}
          style={{ marginTop: "0.5rem" }}
          onClick={() => void onCopy("customer", customerUrl)}
        >
          {copied === "customer" ? "Copied" : "Copy Customer URL"}
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Staff / Admin / POS</strong>
        <p className={styles.muted} style={{ margin: "0.25rem 0" }}>
          Restaurant login only — Super HQ is not in this link.
        </p>
        <code style={{ display: "block", wordBreak: "break-all", fontSize: "0.85rem" }}>
          {staffUrl}
        </code>
        <button
          type="button"
          className={styles.btnGhost}
          style={{ marginTop: "0.5rem" }}
          onClick={() => void onCopy("staff", staffUrl)}
        >
          {copied === "staff" ? "Copied" : "Copy Staff URL"}
        </button>
      </div>

      <ol className={styles.muted} style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
        <li>iPhone pe Customer/Staff link WhatsApp se bhejo (Copy buttons upar).</li>
        <li>
          Link kholte hi <strong>picture guide</strong> aati hai: Share → Add to Home Screen → Add.
        </li>
        <li>Home icon se kholo — same kitchen code locked rehti hai.</li>
        <li>
          Staff: login ke baad <strong>Enable order sound</strong> — naya order beep,{" "}
          <strong>Stop alert</strong> se band.
        </li>
      </ol>
      <p className={styles.muted} style={{ marginBottom: 0 }}>
        Jis customer ko Add to Home Screen nahi aata, guide usi link ke andar steps dikhati hai — alag
        video bhejne ki zaroorat nahi. Needs internet. Detail: docs/IOS-HOME-SCREEN-GUIDE-PLAN.md
      </p>
    </div>
  );
}
