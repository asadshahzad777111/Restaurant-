import { NextRequest, NextResponse } from "next/server";
import { LIVE_APP_HOST, allowedAppOrigins, isApiHost } from "@/lib/urls";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

function withSecurity(res: NextResponse) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

function applyCors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin") || "";
  if (allowedAppOrigins().includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.headers.set("Access-Control-Max-Age", "86400");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

/**
 * Split surface on asfins.com:
 * - api.ordo.asfins.com → backend only (/api/*)
 * - ordo.asfins.com → restaurant OS UI (calls API host via NEXT_PUBLIC_API_URL)
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  if (isApiHost(host)) {
    if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
      return applyCors(req, withSecurity(new NextResponse(null, { status: 204 })));
    }
    if (!pathname.startsWith("/api/")) {
      return withSecurity(
        NextResponse.json(
          {
            error: "API host only",
            hint: `Open https://${LIVE_APP_HOST} for ORDO Restaurant OS`,
          },
          { status: 404 },
        ),
      );
    }
    return applyCors(req, withSecurity(NextResponse.next()));
  }

  return withSecurity(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)"],
};
