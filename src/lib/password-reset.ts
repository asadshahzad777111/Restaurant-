import { createHash, randomInt } from "crypto";

/**
 * Password-reset OTP store. In-memory with a 10-minute expiry.
 * Suitable for single-instance / warm serverless; a multi-region prod
 * deployment would move this to Redis/Mongo. The stored value is a one-way
 * hash, so a leaked store never reveals a usable OTP.
 */
interface OtpRecord {
  hash: string;
  attempts: number;
  expiresAt: number;
}

const store = new Map<string, OtpRecord>();
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function key(code: string, email: string) {
  return `${code.toUpperCase()}|${email.trim().toLowerCase()}`;
}

function digest(code: string, email: string, otp: string) {
  return createHash("sha256").update(`${key(code, email)}::${otp}`).digest("hex");
}

/** Generate a 6-digit OTP, store its hash, return the plaintext for the email. */
export function issueOtp(code: string, email: string): string {
  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  store.set(key(code, email), {
    hash: digest(code, email, otp),
    attempts: 0,
    expiresAt: Date.now() + TTL_MS,
  });
  return otp;
}

/** Verify an OTP; consumes it on success, counts failures up to MAX_ATTEMPTS. */
export function verifyOtp(code: string, email: string, otp: string): boolean {
  const k = key(code, email);
  const rec = store.get(k);
  if (!rec) return false;
  if (Date.now() > rec.expiresAt) {
    store.delete(k);
    return false;
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    store.delete(k);
    return false;
  }
  if (digest(code, email, otp.trim()) !== rec.hash) {
    rec.attempts += 1;
    return false;
  }
  store.delete(k);
  return true;
}

export function otpTtlMs() {
  return TTL_MS;
}
