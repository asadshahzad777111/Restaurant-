import { NextRequest, NextResponse } from "next/server";
import { HELP_MODE_COOKIE } from "@/lib/help-mode";
import {
  LIVE_APP_HOST,
  LIVE_CONTROL_HOST,
  allowedAppOrigins,
  isApiHost,
  isAppHost,
  isControlHost,
  isLocalHost,
} from "@/lib/urls";

/** Restaurant Admin chrome. Allowed on control.asfins.com only during explicit Help. */
const STAFF_UI = [
  "/home",
  "/pos",
  "/orders",
  "/kitchen",
  "/menu",
  "/tables",
  "/settings",
  "/day-close",
  "/sales",
  "/staff",
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
  // HSTS — always serve over HTTPS, subdomains included, long-lived.
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // Isolation — stop other origins from embedding our resources or opening us.
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  // Legacy XSS filter (harmless) — modern CSP is handled app-side where inline
  // styles/print iframes require it.
  "X-XSS-Protection": "1; mode=block",
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
 * Host split (roles must never mix):
 * - api.ordo.asfins.com     → /api/* only
 * - control.asfins.com      → Super HQ only (/control, /login). Staff UI only if Help cookie.
 * - ordo.asfins.com         → restaurants; /super and /control blocked (Admin cannot open HQ)
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
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/control";
      return withSecurity(NextResponse.redirect(url));
    }
    const helping = req.cookies.get(HELP_MODE_COOKIE)?.value === "1";
    const hq =
      pathname.startsWith("/control") ||
      pathname.startsWith("/super") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next");
    const staffUi = helping && STAFF_UI.some((p) => pathname.startsWith(p));
    if (!hq && !staffUi) {
      const url = req.nextUrl.clone();
      url.pathname = "/control";
      return withSecurity(NextResponse.redirect(url));
    }
    return withSecurity(NextResponse.next());
  }

  // Restaurant host: Admin/staff/guest only. Never serve HQ — APKs must not open /super.
  // /lab is the localhost demo index — not for production guests or staff.
  if (isAppHost(host) && !isLocalHost(host)) {
    if (
      pathname.startsWith("/control") ||
      pathname.startsWith("/super") ||
      pathname.startsWith("/lab")
    ) {
      return withSecurity(
        NextResponse.json(
          { error: "Not available on restaurant host" },
          { status: 404 },
        ),
      );
    }
  }

  return withSecurity(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
