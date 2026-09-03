# ORDO — Multi-tenant Restaurant OS

Next.js App Router + TypeScript + CSS Modules.

**Localhost:** file store `.data/` (no Mongo needed) — `/lab` works.  
**LIVE (asfins.com):**  
- Restaurants → `https://ordo.asfins.com`  
- Owner control → `https://control.asfins.com`  
- API → `https://api.ordo.asfins.com`  
- Media/backups → `https://media.ordo.asfins.com` (R2)  
See `docs/ASFINS-DNS.md`.

Plans: Starter **₨999** · Pro **₨1,999** · Enterprise **₨4,499** / month. Isolated per kitchen. 42-item demo catalog.

## Quick start (localhost)

```bash
npm install
npm run dev
```

Open http://localhost:3000/lab

| Role | Path | Login |
|---|---|---|
| Super Admin | `/super` | `super` / `super123` |
| Restaurant Admin | `/login` | Code `DEMO` · `admin` / `admin123` |
| 2nd tenant | `/login` | Code `ISO2` (after Mongo seed / Super create) |
| Guest | `/order?tenant=DEMO` | — |

## LIVE stack
GitHub · Vercel · MongoDB Atlas · Cloudflare DNS · Cloudflare R2 · Resend · WhatsApp · Uptime on `/api/health`  
Env placeholders: `.env.example` → paste real values only in **Vercel Environment Variables**.

**Free-plan tip:** ping `GET /api/health?ping=1` every 5–10 minutes (UptimeRobot / cron-job.org) so Vercel + Mongo stay warm. Full `/api/health` is for dashboards.

## Sell model
- **You = Super** → create restaurants, plans, leads, Super-only APK downloads
- **Each restaurant = Rest Admin** → own menu, stock, staff, QR, branding
- Staff permissions are per-user; guest QR never mixes tenants

## APK
Two Android shells, download only from **Super → Apps** (not the public marketing page):
- Staff: `/login?app=staff` — restaurant code, then Home (POS, kitchen, orders, staff)
- Customer: `/guest` + `/scan` — kitchen code or table QR

Built files go to `.data/apks/` as `ORDO-Staff.apk` and `ORDO-Customer.apk`. See `docs/APK-PATH.md`.

## Media / Cloudflare R2

Logos and menu photos upload via `POST /api/media`. Health: `GET /api/health` (`integrations.r2`).

Health: `GET /api/health` reports `mongo` and `r2` booleans. Either `R2_PUBLIC_URL` or `R2_PUBLIC_BASE_URL` is accepted.

If R2 env vars are set, files go to R2; otherwise they are stored under `.data/media/` and served at `/api/media/...`. Live Vercel has no persistent disk — paste R2 keys in the Vercel dashboard for photos to stick.

## Architecture
See `docs/MULTI-TENANT-SAAS.md`.

## Local MoA agency (Apple Silicon / $0 demos)
Offline Mixture-of-Agents scaffold for VIP demo sites + visual QA + n8n preview outreach:  
[`agency/README.md`](agency/README.md) · evaluation [`docs/LOCAL-MOA-ARCHITECTURE.md`](docs/LOCAL-MOA-ARCHITECTURE.md).
