import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { resolveLocalMedia } from "@/lib/media";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const found = resolveLocalMedia(key || []);
  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = fs.readFileSync(found.file);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": found.contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
