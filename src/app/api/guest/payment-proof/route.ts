import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode } from "@/lib/db";
import { r2Configured } from "@/lib/env";
import { uploadPublicAsset } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Guest payment-proof upload (screenshot). Tenant-scoped by code — no staff auth.
 * Used when diner pays JazzCash / EasyPaisa / bank in advance.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    if (!r2Configured()) {
      return NextResponse.json(
        { error: "Upload not available — ask restaurant to accept COD or counter pay" },
        { status: 503 },
      );
    }
    const form = await req.formData();
    const tenantCode = String(form.get("tenantCode") || "").trim().toUpperCase();
    const file = form.get("file");
    if (!tenantCode) {
      return NextResponse.json({ error: "tenantCode required" }, { status: 400 });
    }
    const meta = await findTenantMetaByCode(tenantCode);
    if (!meta || meta.status === "suspended") {
      return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Screenshot file required" }, { status: 400 });
    }
    const type = file.type || "";
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image screenshots allowed" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 4MB screenshot" }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `tenants/${meta.id}/payment-proofs/${Date.now()}.${ext}`;
    const result = await uploadPublicAsset({
      key,
      body: buf,
      contentType: type || "image/jpeg",
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }
    return NextResponse.json({ url: result.url, key: result.key });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
