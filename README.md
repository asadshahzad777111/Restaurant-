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
Two Android shells, download only from **Super → Apps** (not the public marketing page):
- Staff: `/login?app=staff` — restaurant code, then Home (POS, kitchen, orders, staff)
- Customer: `/guest` + `/scan` — kitchen code or table QR

Built files go to `.data/apks/` as `ORDO-Staff.apk` and `ORDO-Customer.apk`. See `docs/APK-PATH.md`.

## Media / Cloudflare R2

Logos and menu photos upload via `POST /api/media`. Health: `GET /api/health` (`integrations.r2`).

If these env vars are set, files go to R2; otherwise they are stored under `.data/media/` and served at `/api/media/...`:

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
R2_REGION=auto
```

Copy `.env.example` to `.env.local`. Do not commit real keys.

## Architecture
See `docs/MULTI-TENANT-SAAS.md`.
