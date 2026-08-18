# ORDO — Multi-tenant Restaurant OS

Next.js App Router + TypeScript + CSS Modules.

**Localhost:** file store `.data/` (no Mongo needed) — `/lab` works.  
**LIVE (asfins.com):**  
- Restaurants → `https://ordo.asfins.com` (no owner panel)  
- Owner control → `https://control.asfins.com` (Open without restaurant password)  
- API → `https://api.ordo.asfins.com`  
- Media/backups → `https://media.ordo.asfins.com` (R2)  
See `docs/ASFINS-DNS.md`. Vercel Hobby is enough; backups on R2.

## Quick start (localhost)

```bash
npm install
npm run dev
```

Open http://localhost:3000/lab

| Role | Login |
|---|---|
| Super | `super` / `super123` |
| Rest Admin | Code `DEMO` · `admin` / `admin123` |
| 2nd tenant | Code `ISO2` (after Mongo seed / Super create) |
| Guest | `/order?tenant=DEMO` |

## LIVE stack
GitHub · Vercel · MongoDB Atlas · Cloudflare DNS · Cloudflare R2 · Resend · WhatsApp number · Uptime on `/api/health`  
POS APK later. No Render. No refunds (cancel/void only).

Env placeholders: `.env.example` → paste real values only in **Vercel Environment Variables**.
