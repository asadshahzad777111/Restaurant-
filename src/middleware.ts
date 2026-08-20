import { NextRequest, NextResponse } from "next/server";
import {
  LIVE_APP_HOST,
  LIVE_CONTROL_HOST,
  allowedAppOrigins,
  isApiHost,
  isAppHost,
  isControlHost,
  isLocalHost,
} from "@/lib/urls";

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
 * Host split:
 * - api.ordo.asfins.com     → /api/* only
 * - control.asfins.com      → owner control plane only (/control, /login)
 * - ordo.asfins.com         → restaurants; /super and /control blocked
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
            hint: `Restaurants → https://${LIVE_APP_HOST} · Owner → https://${LIVE_CONTROL_HOST}`,
          },
          { status: 404 },
        ),
      );
    }
    return applyCors(req, withSecurity(NextResponse.next()));
  }

  if (isControlHost(host)) {
    if (pathname === "/" || pathname === "/super") {
      const url = req.nextUrl.clone();
      url.pathname = "/control";
      return withSecurity(NextResponse.redirect(url));
    }
    // Owner panel + temporary staff UI after Help this restaurant (no restaurant password)
    const allowed =
      pathname.startsWith("/control") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/home") ||
      pathname.startsWith("/pos") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/kitchen") ||
      pathname.startsWith("/menu") ||
      pathname.startsWith("/tables") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/day-close") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next");
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = "/control";
      return withSecurity(NextResponse.redirect(url));
    }
    return withSecurity(NextResponse.next());
  }

  // Restaurant app host (and production app): never expose owner panel
  if (isAppHost(host) && !isLocalHost(host)) {
    if (pathname.startsWith("/super") || pathname.startsWith("/control")) {
      return withSecurity(
        NextResponse.json(
          { error: "Not available on restaurant host" },
          { status: 404 },
        ),
      );
    }
  }

  // Localhost: /super → /control (same panel, no “Super” URL)
  if (isLocalHost(host) && pathname === "/super") {
    const url = req.nextUrl.clone();
    url.pathname = "/control";
    return withSecurity(NextResponse.redirect(url));
  }

  return withSecurity(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)"],
};
