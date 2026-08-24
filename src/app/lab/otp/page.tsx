"use client";

import { useRef, useState } from "react";
import { OtpInput, type OtpInputHandle } from "@/components/OtpInput";
import styles from "./otp.module.css";

/**
 * Demo — try code 1234 to see success, anything else triggers error + shake.
 * Reset button exercises the imperative ref (useful for PIN-lock retry screens).
 */
function VerifyCard({
  length,
  label,
  onResend,
}: {
  length: number;
  label: string;
  onResend?: () => Promise<void>;
}) {
  const ref = useRef<OtpInputHandle>(null);
  const [result, setResult] = useState<string>("");
  const [lastState, setLastState] = useState<string>("");

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.dot} aria-hidden />
        <div>
          <p className={styles.cardTitle}>{label}</p>
          <p className={styles.cardSub}>
            Verifies the instant the last box fills — no submit button. Paste a full code to fill all
            boxes at once. Success code: <code>1234</code>.
          </p>
        </div>
      </div>

      <OtpInput
        ref={ref}
        length={length}
        resendCooldown={30}
        onResend={onResend}
        title={`${length}-digit code`}
        helperText="Typing forwards focus · Backspace goes back"
        onChange={(c) => {
          setResult(c.length ? `Typing: ${c}` : "");
          setLastState("");
        }}
        onComplete={async (code) => {
          // Simulated verification — swap for a real API call.
          await new Promise((r) => setTimeout(r, 900));
          const ok = code === "1234";
          setLastState(ok ? "success" : "error");
          return ok;
        }}
      />
      <p className={styles.result} data-state={lastState || undefined}>{result}</p>

      <button type="button" className={styles.resetBtn} onClick={() => ref.current?.reset()}>
        Reset code
      </button>
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
          countdown. Strictly typed and responsive — drop it into email / phone verification or PIN-lock
          screens.
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
