/**
 * Upload DEMO Staff + Customer APKs to Cloudflare R2 (production storage).
 *
 * Requires R2_* env vars (same as Vercel). Does NOT commit binaries.
 *
 * Usage:
 *   node scripts/upload-demo-apks-to-r2.cjs \
 *     --staff=/path/to/ORDO-DEMO-Staff.apk \
 *     --customer=/path/to/ORDO-DEMO-Customer.apk
 *
 * Optional:
 *   --tenant-id=tenant_demo   (default)
 *   --code=DEMO               (label only)
 *
 * Keys written (per-tenant isolation):
 *   tenants/tenant_demo/apks/staff.apk
 *   tenants/tenant_demo/apks/customer.apk
 *
 * After upload, Admin (DEMO) can download via /api/admin/apks once this code is deployed.
 */
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

function arg(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function requiredEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function main() {
  const staffPath = arg("staff");
  const customerPath = arg("customer");
  const tenantId = arg("tenant-id", "tenant_demo");
  const code = arg("code", "DEMO");

  if (!staffPath || !customerPath) {
    console.error(
      "Usage: node scripts/upload-demo-apks-to-r2.cjs --staff=ORDO-DEMO-Staff.apk --customer=ORDO-DEMO-Customer.apk",
    );
    process.exit(1);
  }
  if (!fs.existsSync(staffPath) || !fs.existsSync(customerPath)) {
    throw new Error("Staff or Customer APK path not found");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(tenantId)) {
    throw new Error("Invalid tenant id");
  }

  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requiredEnv("R2_BUCKET");
  const publicBase = (process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || "").trim();
  if (!publicBase) {
    console.warn("Warning: R2_PUBLIC_URL unset (downloads still work via auth API after deploy)");
  }

  const client = new S3Client({
    region: process.env.R2_REGION?.trim() || "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const uploads = [
    { slot: "staff", file: staffPath, key: `tenants/${tenantId}/apks/staff.apk` },
    { slot: "customer", file: customerPath, key: `tenants/${tenantId}/apks/customer.apk` },
  ];

  for (const u of uploads) {
    const body = fs.readFileSync(u.file);
    const filename = u.slot === "staff" ? `ORDO-${code}-Staff.apk` : `ORDO-${code}-Customer.apk`;
    console.log(`Uploading ${filename} (${body.length} bytes) → ${u.key}`);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: u.key,
        Body: body,
        ContentType: "application/vnd.android.package-archive",
        ContentDisposition: `attachment; filename="${filename}"`,
      }),
    );
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: u.key }));
    console.log(`  OK · ${head.ContentLength} bytes · ${head.LastModified?.toISOString() || "?"}`);
  }

  console.log("\nDone. After deploy of R2-backed APK routes:");
  console.log("  Super → Apps → Demo Restaurant · DEMO — should show Staff + Customer available");
  console.log("  Admin (DEMO) → Settings → Your apps — download Customer/Staff APK");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
