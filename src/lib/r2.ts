import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { r2Configured, r2PublicBase } from "./env";

export function getR2Client() {
  if (!r2Configured()) return null;
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: process.env.R2_REGION?.trim() || "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function bucketName() {
  return process.env.R2_BUCKET!;
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Public CDN assets (logos, menu photos, backups). */
export async function uploadPublicAsset(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string; key: string } | { error: string }> {
  const client = getR2Client();
  if (!client) {
    return { error: "R2 not configured — set R2_* env vars on Vercel" };
  }
  const base = r2PublicBase();
  if (!base) {
    return { error: "R2 not configured — set R2_PUBLIC_URL or R2_PUBLIC_BASE_URL" };
  }
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "R2 upload failed";
    return { error: msg };
  }
  return { url: `${base}/${input.key}`, key: input.key };
}

/** Private-ish object put (APKs still live in the media bucket; downloads go through auth APIs). */
export async function putR2Object(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ key: string } | { error: string }> {
  const client = getR2Client();
  if (!client) {
    return { error: "R2 not configured — set R2_* env vars on Vercel" };
  }
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentDisposition: `attachment; filename="${input.key.split("/").pop() || "download"}"`,
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "R2 upload failed";
    return { error: msg };
  }
  return { key: input.key };
}

export async function headR2Object(
  key: string,
): Promise<{ sizeBytes: number; updatedAt: string | null } | null> {
  const client = getR2Client();
  if (!client) return null;
  try {
    const out = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName(),
        Key: key,
      }),
    );
    return {
      sizeBytes: Number(out.ContentLength || 0),
      updatedAt: out.LastModified ? out.LastModified.toISOString() : null,
    };
  } catch {
    return null;
  }
}

export async function getR2Object(
  key: string,
): Promise<{ body: Buffer; contentType: string; sizeBytes: number } | null> {
  const client = getR2Client();
  if (!client) return null;
  try {
    const out = await client.send(
      new GetObjectCommand({
        Bucket: bucketName(),
        Key: key,
      }),
    );
    const body = await bodyToBuffer(out.Body);
    return {
      body,
      contentType: out.ContentType || "application/octet-stream",
      sizeBytes: Number(out.ContentLength || body.length),
    };
  } catch {
    return null;
  }
}

export async function deleteR2Object(key: string): Promise<{ ok: true } | { error: string }> {
  const client = getR2Client();
  if (!client) {
    return { error: "R2 not configured — set R2_* env vars on Vercel" };
  }
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName(),
        Key: key,
      }),
    );
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "R2 delete failed";
    return { error: msg };
  }
}
