# ORDO — Multi-tenant Restaurant OS

Next.js App Router + TypeScript + CSS Modules. File-backed store under `.data/` (no DB yet).

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/lab](http://localhost:3000/lab) for demo links.

### Guest look (mobile)
- Light UI · orange accents · food photos · category pills · Place cart bar
- Track page with live kitchen timeline
- Open: `/order?tenant=DEMO` or `/order?tenant=DEMO&table=3`

### Demo credentials

| Role | Path | Login |
|---|---|---|
| Super Admin | `/super` | `super` / `super123` |
| Restaurant Admin | `/login` | Code `DEMO` · `admin` / `admin123` |
| Guest | `/order?tenant=DEMO` | — |

## Sell model
- **You = Super** → create restaurants, plans, leads
- **Each restaurant = Rest Admin** → own menu, stock, staff, QR, branding
- Staff permissions are per-user; guest QR never mixes tenants

## APK
See `docs/APK-PATH.md` (PWA first, then Capacitor Android shell).

## Architecture
See `docs/MULTI-TENANT-SAAS.md`.
