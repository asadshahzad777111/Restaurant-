import { createHash, createHmac, randomUUID } from "crypto";
import fs from "fs";
import path from "path";

/**
 * Media for logos and menu photos.
 *
 * Cloudflare R2 (S3-compatible) when all of these env vars are set:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 * Optional: R2_REGION (default "auto")
 *
 * If R2 is unset or a put fails, files land under `.data/media/` and are served at `/api/media/...`.
 * Never commit real keys. Copy names from `.env.example`.
 */

const DATA_ROOT = path.join(process.cwd(), ".data", "media");
const MAX_BYTES = 4 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type MediaKind = "logo" | "menu";

function r2PublicBase() {
  return (process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      r2PublicBase(),
  );
}

export function mediaBackend(): "r2" | "file-store" {
  return isR2Configured() ? "r2" : "file-store";
}

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string) {
  return createHash("sha256").update(data).digest("hex");
}

function signatureKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function objectKey(tenantId: string, kind: MediaKind, ext: string) {
  return `tenants/${tenantId}/${kind}/${randomUUID()}.${ext}`;
}

async function r2Put(key: string, body: Buffer, contentType: string) {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKey = process.env.R2_ACCESS_KEY_ID!;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET!;
  const region = process.env.R2_REGION || "auto";
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signing = signatureKey(secretKey, dateStamp, region, "s3");
  const signature = createHmac("sha256", signing).update(stringToSign, "utf8").digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "X-Amz-Date": amzDate,
      "X-Amz-Content-Sha256": payloadHash,
      Authorization: authorization,
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    throw new Error(`R2 upload failed (${res.status})`);
  }
}

function publicR2Url(key: string) {
  return `${r2PublicBase()}/${key}`;
}

function writeLocal(key: string, body: Buffer) {
  const dest = path.join(DATA_ROOT, ...key.split("/"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
  return `/api/media/${key}`;
}

export function resolveLocalMedia(parts: string[]): { file: string; contentType: string } | null {
  if (parts.length < 4 || parts[0] !== "tenants") return null;
  if (parts.some((p) => !p || p === "." || p === ".." || p.includes("\\"))) return null;
  if (!parts.every((p) => /^[A-Za-z0-9._-]+$/.test(p))) return null;
  const file = path.join(DATA_ROOT, ...parts);
  const root = path.resolve(DATA_ROOT);
  const resolved = path.resolve(file);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  const ext = path.extname(resolved).slice(1).toLowerCase();
  const contentType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "application/octet-stream";
  return { file: resolved, contentType };
}

export async function saveMedia(input: {
  tenantId: string;
  kind: MediaKind;
  bytes: Buffer;
  contentType: string;
}): Promise<{ url: string; storage: "r2" | "file-store" }> {
  if (!/^[A-Za-z0-9_-]+$/.test(input.tenantId)) {
    throw new Error("Invalid tenant");
  }
  if (input.kind !== "logo" && input.kind !== "menu") {
    throw new Error("Invalid kind");
  }
  const ext = EXT[input.contentType];
  if (!ext) throw new Error("Use JPEG, PNG, WebP, or GIF");
  if (input.bytes.length < 24) throw new Error("File too small");
  if (input.bytes.length > MAX_BYTES) throw new Error("Image must be under 4 MB");

  const key = objectKey(input.tenantId, input.kind, ext);
  if (isR2Configured()) {
    try {
      await r2Put(key, input.bytes, input.contentType);
      return { url: publicR2Url(key), storage: "r2" };
    } catch {
      /* keep serving locally if R2 is misconfigured */
    }
  }
  return { url: writeLocal(key, input.bytes), storage: "file-store" };
}
