"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./OtpInput.module.css";

export type OtpStatus = "idle" | "verifying" | "success" | "error";

export interface OtpInputProps {
  /** Number of boxes — 4 to 6 (default 6). */
  length?: number;
  /** Fired on every keystroke with the current full code. */
  onChange?: (code: string) => void;
  /**
   * Called automatically when the last box is filled. Return true (or a
   * Promise that resolves true) to mark success; false/throw → error + shake.
   */
  onComplete?: (code: string) => Promise<boolean> | boolean;
  /** Called when the user taps Resend after the cooldown ends. */
  onResend?: () => Promise<void> | void;
  /** Cooldown in seconds before Resend is allowed (default 30). */
  resendCooldown?: number;
  /** Disable all interaction (e.g. while submitting elsewhere). */
  disabled?: boolean;
  /** Focus the first box on mount. */
  autoFocus?: boolean;
  /** Auto-trigger onComplete when the last box is filled. Default true. */
  verifyOnComplete?: boolean;
  /** Show the success/error status area (default true). */
  showStatus?: boolean;
  /** Enable the resend row (default true). */
  showResend?: boolean;
  /** Heading / label above the boxes. */
  title?: string;
  /** Small helper text under the boxes. */
  helperText?: string;
  /** Replace the default error message. */
  errorMessage?: string;
  /** Replace the default success message. */
  successMessage?: string;
  /** Inline-reserved height (px) for the status message → zero layout shift. */
  statusHeight?: number;
}

/** Imperative control: reset to empty, focus, or set a full code programmatically. */
export interface OtpInputHandle {
  reset: () => void;
  focus: () => void;
  setValue: (code: string) => void;
}

/** Strictly numeric, capped at a generous max for paste. */
function sanitize(value: string): string {
  return value.replace(/\D/g, "").slice(0, 12);
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(
  function OtpInput(
    {
      length = 6,
      onChange,
      onComplete,
      onResend,
      resendCooldown = 30,
      disabled = false,
      autoFocus = false,
      verifyOnComplete = true,
      showStatus = true,
      showResend = true,
      title,
      helperText,
      errorMessage = "That code didn't match. Please try again.",
      successMessage = "Verified successfully",
      statusHeight = 60,
    },
    ref,
  ) {
    const n = Math.max(4, Math.min(6, Math.round(length)));
    const reduced = useReducedMotion();

    const [digits, setDigits] = useState<string[]>(() => Array(n).fill(""));
    const [status, setStatus] = useState<OtpStatus>("idle");
    const [errorKey, setErrorKey] = useState(0);
    const [cooldown, setCooldown] = useState(resendCooldown);
    const [resending, setResending] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);

    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const busyRef = useRef(false);
    const timersRef = useRef<number[]>([]);

    const focusBox = useCallback(
      (i: number) => {
        const idx = Math.max(0, Math.min(n - 1, i));
        setFocusedIndex(idx);
        const el = inputRefs.current[idx];
        if (el) {
          el.focus();
          el.select();
        }
      },
      [n],
    );

    // Reset the digit buffer + timers when length changes.
    useEffect(() => {
      setDigits(Array(n).fill(""));
      setStatus("idle");
      setFocusedIndex(autoFocus ? 0 : null);
    }, [n, autoFocus]);

    // Resend countdown.
    useEffect(() => {
      if (cooldown <= 0) return;
      const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
      return () => window.clearInterval(id);
    }, [cooldown]);

    // Auto-focus first box.
    useEffect(() => {
      if (autoFocus && !disabled && status !== "success") focusBox(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFocus, disabled]);

    // Clear pending timers on unmount.
    useEffect(() => {
      return () => timersRef.current.forEach((t) => window.clearTimeout(t));
    }, []);

    const scheduleReset = useCallback(() => {
      const delay = reduced ? 500 : 900;
      const id = window.setTimeout(() => {
        setDigits(Array(n).fill(""));
        setStatus("idle");
        focusBox(0);
      }, delay);
      timersRef.current.push(id);
    }, [reduced, n, focusBox]);

    /** Try to verify when all boxes are filled. */
    const tryVerify = useCallback(
      async (fullCode: string) => {
        if (!verifyOnComplete || busyRef.current || fullCode.length !== n || !onComplete) return;
        if (status === "success") return;
        busyRef.current = true;
        setStatus("verifying");
        try {
          const ok = await Promise.resolve(onComplete(fullCode));
          if (ok) {
            setStatus("success");
          } else {
            setErrorKey((k) => k + 1);
            setStatus("error");
            scheduleReset();
          }
        } catch {
          setErrorKey((k) => k + 1);
          setStatus("error");
          scheduleReset();
        } finally {
          busyRef.current = false;
        }
      },
      [n, verifyOnComplete, onComplete, reduced, status, scheduleReset],
    );

    const commit = useCallback(
      (next: string[]) => {
        setDigits(next);
        onChange?.(next.join(""));
        if (next.every((d) => d !== "")) {
          void tryVerify(next.join(""));
        }
      },
      [onChange, tryVerify],
    );

    const resetAll = useCallback(() => {
      setDigits(Array(n).fill(""));
      setStatus("idle");
      setErrorKey(0);
      focusBox(0);
    }, [n, focusBox]);

    useImperativeHandle(
      ref,
      () => ({
        reset: resetAll,
        focus: () => focusBox(0),
        setValue: (code: string) => {
          const digitsArr = Array(n).fill("");
          const clean = sanitize(code);
          for (let k = 0; k < Math.min(n, clean.length); k++) digitsArr[k] = clean[k];
          commit(digitsArr);
        },
      }),
      [resetAll, focusBox, n, commit],
    );

    function setDigit(i: number, raw: string) {
      if (disabled || status === "verifying" || status === "success") return;
      const digit = sanitize(raw).slice(0, 1);
      const next = digits.slice();
      next[i] = digit;
      commit(next);
      if (digit && i < n - 1) focusBox(i + 1);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
      if (disabled || status === "verifying" || status === "success") return;
      if (e.key === "Backspace") {
        e.preventDefault();
        if (digits[i]) {
          const next = digits.slice();
          next[i] = "";
          commit(next);
          focusBox(i);
        } else if (i > 0) {
          const next = digits.slice();
          next[i - 1] = "";
          commit(next);
          focusBox(i - 1);
        }
      } else if (e.key === "ArrowLeft" && i > 0) {
        e.preventDefault();
        focusBox(i - 1);
      } else if (e.key === "ArrowRight" && i < n - 1) {
        e.preventDefault();
        focusBox(i + 1);
      }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, _i: number) {
      if (disabled || status === "verifying" || status === "success") return;
      const text = sanitize(e.clipboardData.getData("text"));
      if (!text) return;
      e.preventDefault();
      const next = Array(n).fill("");
      for (let k = 0; k < Math.min(n, text.length); k++) next[k] = text[k];
      commit(next);
      focusBox(Math.min(text.length, n - 1));
    }

    async function handleResend() {
      if (cooldown > 0 || resending || disabled) return;
      setResending(true);
      try {
        await onResend?.();
        setCooldown(resendCooldown);
        setDigits(Array(n).fill(""));
        setStatus("idle");
        focusBox(0);
      } catch {
        /* surface to the caller via onResend; keep state unchanged */
        setStatus("error");
      } finally {
        setResending(false);
      }
    }

    const shake = errorKey > 0 && status === "error";

    return (
      <div className={styles.wrap} style={{ minHeight: statusHeight }}>
        {title ? <p className={styles.title}>{title}</p> : null}

        <motion.div
          className={styles.row}
          role="group"
          aria-label={title || "One-time code"}
          animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={shake ? { duration: reduced ? 0.3 : 0.42 } : undefined}
          data-status={status}
        >
          {digits.map((d, i) => {
            const filled = d !== "";
            const isActive = status === "idle" && focusedIndex === i;
            return (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                disabled={disabled || status === "verifying" || status === "success"}
                aria-label={`Digit ${i + 1}`}
                data-state={filled ? "filled" : "empty"}
                data-active={isActive ? "true" : "false"}
                className={styles.box}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onPaste={(e) => handlePaste(e, i)}
                onFocus={(e) => {
                  setFocusedIndex(i);
                  e.target.select();
                }}
                onBlur={() => setFocusedIndex((f) => (f === i ? null : f))}
              />
            );
          })}
        </motion.div>

        {showStatus && (
          <div className={styles.statusArea} aria-live="polite">
            <AnimatePresence mode="wait">
              {status === "verifying" && (
                <motion.div
                  key="verifying"
                  className={styles.verifying}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  <span className={styles.spinner} aria-hidden />
                  <span>Verifying…</span>
                </motion.div>
              )}
              {status === "error" && (
                <motion.div
                  key="error"
                  role="alert"
                  className={styles.error}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {errorMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {showResend && (
          <div className={styles.resendRow}>
            <span className={styles.resendText}>
              {cooldown > 0 ? (
                <>Didn&apos;t receive the code? Resend in {cooldown}s</>
              ) : (
                <>Didn&apos;t receive the code?</>
              )}
            </span>
            {cooldown <= 0 && (
              <button
                type="button"
                className={styles.resendBtn}
                onClick={() => void handleResend()}
                disabled={resending || disabled}
              >
                {resending ? "Sending…" : "Resend"}
              </button>
            )}
          </div>
        )}

        {helperText ? <p className={styles.helper}>{helperText}</p> : null}

        {status === "success" && (
          <motion.div
            className={styles.success}
            role="status"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
          >
            <span className={styles.successIcon} aria-hidden>
              <svg viewBox="0 0 52 52">
                <circle className={styles.successRing} cx="26" cy="26" r="23" />
                <path className={styles.successTick} d="M15 27.2 22.4 34.4 37 18.8" />
              </svg>
            </span>
            <span>{successMessage}</span>
          </motion.div>
        )}
      </div>
    );
  },
);

OtpInput.displayName = "OtpInput";

