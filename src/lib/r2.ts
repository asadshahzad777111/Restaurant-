import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Configured, r2PublicBase } from "./env";

export function getR2Client() {
  if (!r2Configured()) return null;
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadPublicAsset(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string; key: string } | { error: string }> {
  const client = getR2Client();
  if (!client) {
    return { error: "R2 not configured — set R2_* env vars on Vercel" };
  }
  const bucket = process.env.R2_BUCKET!;
  const base = r2PublicBase();
  if (!base) {
    return { error: "R2 not configured — set R2_PUBLIC_URL or R2_PUBLIC_BASE_URL" };
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
  return { url: `${base}/${input.key}`, key: input.key };
}
