"use client";

import { useState } from "react";
import { OtpInput } from "@/components/OtpInput";
import styles from "./otp.module.css";

/** Demo: try code 1234 to see success, anything else triggers error + shake. */
function VerifyCard({
  length,
  label,
  onResend,
}: {
  length: number;
  label: string;
  onResend?: () => Promise<void>;
}) {
  const [result, setResult] = useState<string>("");

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.dot} aria-hidden />
        <div>
          <p className={styles.cardTitle}>{label}</p>
          <p className={styles.cardSub}>
            Verify as soon as the last box fills — no submit button. Paste a code to fill all at once.
            Success code: <code>1234</code>.
          </p>
        </div>
      </div>
      <OtpInput
        length={length}
        resendCooldown={30}
        onResend={onResend}
        title={`${length}-digit code`}
        onChange={(c) => setResult(c.length ? `Typing: ${c}` : "")}
        onComplete={async (code) => {
          // Simulated verification — swap for a real API call.
          await new Promise((r) => setTimeout(r, 900));
          return code === "1234";
        }}
      />
      <p className={styles.result}>{result}</p>
    </div>
  );
}

export default function OtpLabPage() {
  const [lastResend, setLastResend] = useState<string>("");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.brand}>ORDO</p>
        <h1>OTP / PIN input</h1>
        <p className={styles.sub}>
          Reusable auto-verifying code component. Individual boxes, auto-focus forward, backspace-to-prev,
          full paste, digits-only, auto-verify on complete, loading + success + error-shake, and a resend
          countdown. Fully typed and responsive.
        </p>
      </header>

      <div className={styles.grid}>
        <VerifyCard length={4} label="4-digit PIN" onResend={async () => {
          await new Promise((r) => setTimeout(r, 500));
          setLastResend(`Code re-sent at ${new Date().toLocaleTimeString()}`);
        }} />
        <VerifyCard length={6} label="6-digit OTP" onResend={async () => {
          await new Promise((r) => setTimeout(r, 500));
          setLastResend(`Code re-sent at ${new Date().toLocaleTimeString()}`);
        }} />
      </div>

      {lastResend && <p className={styles.lastResend}>{lastResend}</p>}
    </div>
  );
}
