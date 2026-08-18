# ORDO — Multi-tenant Restaurant OS

Next.js App Router + TypeScript + CSS Modules. File-backed store under `.data/` (no DB yet).

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/lab](http://localhost:3000/lab) for demo links.

### Demo credentials

| Role | Path | Login |
|---|---|---|
| Super Admin | `/super` | `super` / `super123` |
| Restaurant Admin | `/login` | Code `DEMO` · `admin` / `admin123` |
| Guest | `/order?tenant=DEMO` | — |

## Architecture

- **Platform** (`.data/platform.json`): super admin, plans, tenant registry, sessions, leads
- **Tenant** (`.data/tenants/{id}/tenant.json`): branding, users, menu, orders, stock, reviews

Hard rule: Tenant A data never mixes with Tenant B.

See `docs/MULTI-TENANT-SAAS.md` for the full product brief.
