# ORDO — Security Audit & Hardening

> Audit date: 2026. Reviewee: the ORDO web app (orcdo.asfins.com, control.asfins.com,
> api.ordo.asfins.com). Non-auditor note: multi-tenant isolation is enforced and
> covered by `scripts/audit-tenant-isolation.mjs`.

## 1. What's already solid

- **No secrets committed.** The repo is public — verified: no Resend/Vercel tokens,
  no hardcoded keys, no `.env.local`, `.env.production`, `.pem`. `.env.example` is
  placeholders only. `git grep` for the live token values returned nothing.
- **Secrets live only in Vercel env vars** (LIVE) and `.env.local` (localhost).
  `.env*` is gitignored (exception: `.env.example`).
- **Tenant isolation** — each kitchen is its own tenant document; staff routes use
  `requireTenantSession` + `session.tenantId`; guest routes resolve by code; Super has
  no `tenantId`. CI-gated by `node scripts/audit-tenant-isolation.mjs` (33 handlers, 0
  violations).
- **Password hashing** — scrypt (`src/lib/password.ts`). `superKnownPassword` is a
  Super-only recoverable copy that is **never** returned on staff/public APIs.
- **Session model** — Super vs tenant_admin vs staff are distinct roles; a Super token
  has no `tenantId` so it can never act as a kitchen Admin, and Help mode is a separate
  flagged session.
- **Transport** — HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy,
  Permissions-Policy, Cross-Origin-Opener/Resource-Policy applied on every response via
  middleware.
- **CSRF** — state-changing APIs use an `Authorization: Bearer` token (not cookies),
  which is not auto-sent by browsers, so CSRF risk is low.
- **File store** — tenant ids sanitized (`[A-Za-z0-9_-]{1,80}`) before any path is built;
  local media path blocks `..` traversal.

## 2. Hardening added in this pass

- **Security headers:** `Strict-Transport-Security` (63072000s, includeSubDomains),
  `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`,
  `X-XSS-Protection`.
- **Login brute-force throttle:** `/api/auth` POST — 10 attempts/min per IP, returns 429
  + `Retry-After` (in-memory per warm instance).
- **Lead spam throttle:** `/api/leads` POST — 5 submissions/min per IP.

## 3. Remaining risks / action for the owner (you)

1. **Rotate exposed tokens.** The Resend API key and Vercel token were shared in chat
   earlier. Revoke/rotate them:
   - [Vercel tokens](https://vercel.com/account/tokens) → delete the `vcp_...`.
   - [Resend API keys](https://resend.com/api-keys) → create a new one, put it in
     Vercel env + `.env.local`, delete the old.
2. **Change default credentials.** The platform Super is seeded as `super` / `super123`
   and the DEMO kitchen Admin as `admin` / `admin123`. The control host is reachable at
   `control.asfins.com`. Change the Super password and any demo passwords before
   real use. Tenants already force a password change (`mustChangePassword`).
3. **Rate limiter scope.** The in-memory limiter is per-warm-instance (not a global
   store). For stronger protection use Vercel Firewall / Upstash Redis-backed limiter.
   Not blocking (see #4).
4. **CSP intentionally not added.** A strict `Content-Security-Policy` would break the
   app's inline styles, `next/font`, the print iframe and image/data: assets. Left
   header-based controls above; revisit only if you want a tuned CSP with nonces.
5. **Inbound email webhook** (`/api/webhooks/resend`) verifies the Svix signature when
   `RESEND_WEBHOOK_SECRET` is set — keep it set. Without it, inbound email is accepted
   as a lead (stub). Keep the secret configured.

## 4. Honest limits

- No app can be "100% immune". These controls raise the bar and close the realistic
  holes; they do not replace monitoring, strong unique passwords, and rotating secrets.
- The rate limiter is not distributed. Use a managed limiter for hard guarantees.

## 5. Run the checks

```
node scripts/audit-tenant-isolation.mjs   # 0 violations = isolation intact
```
