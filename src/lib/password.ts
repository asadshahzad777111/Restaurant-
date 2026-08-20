import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);

const PREFIX = "scrypt$";

export function isHashedPassword(stored: string) {
  return stored.startsWith(PREFIX);
}

/** Store as scrypt$salt$hex — never log the plaintext. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scrypt(plain, salt, 64)) as Buffer;
  return `${PREFIX}${salt}$${buf.toString("hex")}`;
}

/**
 * Verify password. Supports legacy plaintext once (returns needsRehash).
 * Timing-safe compare for hashed values.
 */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };
  if (!isHashedPassword(stored)) {
    return { ok: plain === stored, needsRehash: plain === stored };
  }
  const parts = stored.split("$");
  if (parts.length !== 3) return { ok: false, needsRehash: false };
  const salt = parts[1];
  const expectHex = parts[2];
  const buf = (await scrypt(plain, salt, 64)) as Buffer;
  const expect = Buffer.from(expectHex, "hex");
  if (expect.length !== buf.length) return { ok: false, needsRehash: false };
  return { ok: timingSafeEqual(buf, expect), needsRehash: false };
}

/** Idempotent: hash plaintext; leave scrypt$ values alone. */
export async function ensureHashed(plainOrHash: string) {
  if (!plainOrHash) return plainOrHash;
  if (isHashedPassword(plainOrHash)) return plainOrHash;
  return hashPassword(plainOrHash);
}
