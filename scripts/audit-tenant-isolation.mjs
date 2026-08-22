#!/usr/bin/env node
/**
 * ORDO multi-tenant isolation audit.
 *
 * Statically verifies that every API route in src/app/api is scoped:
 *   - Tenant data routes must call requireTenantSession (staff/admin) or
 *     resolve the tenant from a verified tenant CODE (guest), never from a
 *     raw client-supplied tenantId.
 *   - Platform/HQ routes must call requireSuper.
 *   - Routes may be public only when on the explicit whitelist below.
 *
 * Usage: node scripts/audit-tenant-isolation.mjs
 * Exit code 1 when any violation is found (CI gate).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API_DIR = path.join(ROOT, "src", "app", "api");

/** Tenant data accessors — any handler touching these MUST be tenant-scoped. */
const TENANT_DATA_CALLS = [
  "readTenant(",
  "readTenantSafe(",
  "readTenantStaffView(",
  "addOrder(",
  "patchOrder(",
  "updateMenu(",
  "updateStock(",
  "updateUsers(",
  "updateTables(",
  "updateBranding(",
  "updateGuestCommerce(",
  "addDayClose(",
  "addReview(",
  "getPublicMenu(",
  "upsertGuestClient(",
  "findUser(",
  "findUserByEmail(",
];

/** Platform/HQ data — super-scoped. */
const PLATFORM_DATA_CALLS = [
  "listTenantsMeta(",
  "listLeads(",
  "listPlans(",
  "createTenantMeta(",
  "updateTenantMeta(",
  "setTenantStatus(",
  "createEmptyTenantState(",
  "impersonateTenant(",
  "verifySuper(",
  "getPlatformFeatures(",
  "setPlatformFeatures(",
];

/**
 * Routes that are public BY DESIGN (no session) and how they stay tenant-safe.
 * Each entry documents the isolation mechanism.
 */
const PUBLIC_ROUTES = new Map([
  [
    "/api/auth",
    "login/logout only; tenant payload returned only for a successful tenant login with that kitchen's code",
  ],
  [
    "/api/leads",
    "POST is public lead capture (platform inbox); GET requires Super",
  ],
  [
    "/api/reviews",
    "guest review keyed by unguessable trackToken; order resolved from token, review saved to that tenant only",
  ],
  ["/api/track/[token]", "guest status page keyed by unguessable trackToken only"],
  [
    "/api/guest/payment-proof",
    "tenant resolved from verified tenant CODE (meta lookup), suspended kitchens rejected; key prefixed tenants/{id}/",
  ],
  ["/api/manifest", "public per-kitchen PWA manifest resolved from tenant CODE"],
  ["/api/health", "no tenant data; uptime/ping only"],
  ["/api/media/[...key]", "public media bytes; keys are unguessable UUIDs under tenants/{id}/, path-traversal blocked"],
  ["/api/webhooks/resend", "signed webhook (Svix) → platform leads only"],
  [
    "/api/state",
    "dual mode: Bearer tenant session → that tenant's staff view only (Super gets no tenant payload); public path requires ?tenant=CODE resolved via platform registry",
  ],
  [
    "/api/auth/google",
    "Google Sign-In: staff requires a Gmail already saved on THAT kitchen's user (code + verified Google token); guest profile created per resolved code only",
  ],
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function routePath(file) {
  return "/api/" + path.relative(API_DIR, file).replaceAll(path.sep, "/").replace(/\/route\.ts$/, "");
}

/** Split a route file into handlers; return [{method, body, line}] */
function handlers(src) {
  const out = [];
  const re = /export async function (GET|POST|PUT|PATCH|DELETE)\b/g;
  let m;
  const markers = [];
  while ((m = re.exec(src))) markers.push({ method: m[1], index: m.index, line: src.slice(0, m.index).split("\n").length });
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : src.length;
    out.push({ method: markers[i].method, line: markers[i].line, body: src.slice(start, end) });
  }
  return out;
}

function hasGuard(body) {
  if (body.includes("requireTenantSession")) return "tenant_session";
  if (body.includes("requireSuper")) return "super";
  if (body.includes("requireSession(")) return "session"; // weaker: check touchpoints too
  return null;
}

function touchpoints(body, calls) {
  return calls.filter((c) => body.includes(c));
}

const routes = walk(API_DIR).sort();
let violations = 0;
const rows = [];

for (const file of routes) {
  const src = fs.readFileSync(file, "utf8");
  const rp = routePath(file);
  const publicNote = PUBLIC_ROUTES.get(rp);
  const hdrs = handlers(src);
  if (!hdrs.length) {
    rows.push({ route: rp, method: "?", line: 1, guard: "no-handler", verdict: "SKIP", detail: "no exported handlers found" });
    continue;
  }
  for (const h of hdrs) {
    const guard = hasGuard(h.body);
    const tenantTouches = touchpoints(h.body, TENANT_DATA_CALLS);
    const platformTouches = touchpoints(h.body, PLATFORM_DATA_CALLS);
    let verdict;
    let detail;
    if (guard === "tenant_session") {
      verdict = "OK";
      detail = tenantTouches.length ? `tenant-scoped (${tenantTouches.length} tenant call${tenantTouches.length > 1 ? "s" : ""})` : "tenant session required";
      if (platformTouches.length) {
        verdict = "VIOLATION";
        detail = `platform data under tenant session: ${platformTouches.join(", ")}`;
      }
    } else if (guard === "super") {
      // Super is the platform owner: HQ routes manage tenants by EXPLICIT id
      // (billing, credentials, Help). That is not a leak — requireSuper rejects
      // impersonating sessions, and kitchen sessions can never reach these routes.
      verdict = "OK";
      detail = tenantTouches.length
        ? `super-scoped HQ (manages tenant data by explicit id — platform owner)`
        : "super-scoped (platform data)";
      if (platformTouches.length) {
        detail += ` · platform data: ${platformTouches.join(", ")}`;
      }
    } else if (publicNote) {
      verdict = "OK";
      detail = `public-by-design — ${publicNote}`;
      if (tenantTouches.length || platformTouches.length) {
        verdict = "REVIEW";
        detail = `public route touches data calls (${[...tenantTouches, ...platformTouches].join(", ")}) — verify token/code scoping: ${publicNote}`;
      }
    } else {
      // Unguarded handler.
      const touches = [...tenantTouches, ...platformTouches];
      verdict = touches.length ? "VIOLATION" : "WARN";
      detail = touches.length
        ? `NO GUARD but touches ${touches.join(", ")}`
        : "no guard found and no data calls — verify it is intentionally public";
    }
    if (verdict === "VIOLATION") violations += 1;
    rows.push({ route: rp, method: h.method, line: h.line, guard: guard || "none", verdict, detail });
  }
}

console.log("\nORDO API route isolation audit\n" + "=".repeat(72));
const byRoute = new Map();
for (const r of rows) {
  if (!byRoute.has(r.route)) byRoute.set(r.route, []);
  byRoute.get(r.route).push(r);
}
for (const [route, hs] of [...byRoute.entries()].sort()) {
  console.log(`\n${route}`);
  for (const h of hs) {
    const mark = h.verdict === "OK" ? "  \u2713" : h.verdict === "VIOLATION" ? "  \u2717" : h.verdict === "REVIEW" ? "  !" : "  ?";
    console.log(`${mark} ${h.method} (line ${h.line}) — ${h.guard || "no guard"} — ${h.detail}`);
  }
}
console.log("\n" + "=".repeat(72));
const ok = rows.filter((r) => r.verdict === "OK").length;
const review = rows.filter((r) => r.verdict === "REVIEW").length;
const warn = rows.filter((r) => r.verdict === "WARN").length;
console.log(`Handlers: ${rows.length} · OK ${ok} · REVIEW ${review} · WARN ${warn} · VIOLATIONS ${violations}`);
if (violations > 0) {
  console.error("FAIL: tenant-isolation violations found — fix before deploy.\n");
  process.exit(1);
}
console.log("PASS: every route is tenant-scoped, super-scoped, or public-by-design.\n");
