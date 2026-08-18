# asfins.com — ORDO live subdomains

Professional split (UI ≠ backend hostname):

| Role | Hostname | Purpose |
|------|----------|---------|
| **App (Restaurant OS)** | `ordo.asfins.com` | Guest order, staff POS, kitchen, super admin UI |
| **API (Backend)** | `api.ordo.asfins.com` | All `/api/*` only — no pages |
| **Media (R2)** | `media.ordo.asfins.com` | Logos / menu images (Cloudflare R2) |

Guest link example: `https://ordo.asfins.com/order?tenant=DEMO`  
Health: `https://api.ordo.asfins.com/api/health`

> Subdomain split + CORS + Bearer auth reduces attack surface. It does **not** make a system “unhackable” — keep secrets in Vercel only, rotate passwords, and never commit `.env`.

---

## Cloudflare DNS (asfins.com zone)

Proxy status: **DNS only (grey cloud)** for Vercel app/API CNAMEs (avoids double SSL issues).  
R2 media can be **proxied (orange)** if you prefer.

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `ordo` | `cname.vercel-dns.com` | DNS only |
| CNAME | `api.ordo` | `cname.vercel-dns.com` | DNS only |
| CNAME | `media.ordo` | *(R2 custom domain target from Cloudflare R2)* | Orange OK |

Exact Vercel target: after you add domains in Vercel, use the CNAME value Vercel shows if different.

---

## Vercel domains

Project → Settings → Domains → add:

1. `ordo.asfins.com`
2. `api.ordo.asfins.com`

Same project, same deploy. Middleware enforces API-host = `/api` only.

---

## Vercel env (production)

```
NEXT_PUBLIC_APP_URL=https://ordo.asfins.com
NEXT_PUBLIC_API_URL=https://api.ordo.asfins.com
NEXT_PUBLIC_APP_HOST=ordo.asfins.com
NEXT_PUBLIC_API_HOST=api.ordo.asfins.com
MONGODB_URI=...
MONGODB_DB=ordo
DEMO_SEED=true
SESSION_SECRET=...long-random...
CONTACT_WHATSAPP=92XXXXXXXXXX
R2_PUBLIC_BASE_URL=https://media.ordo.asfins.com
```

Plus R2 keys / Resend when ready.

---

## WhatsApp

1. Set `CONTACT_WHATSAPP` on Vercel (digits with country code, e.g. `92300...`).
2. App uses `wa.me` links for status / marketing (works without Cloud API).
3. Optional later: WhatsApp Cloud API token + phone number id.

**Agent browser note:** Cloudflare / WhatsApp login on *your* Cursor window is not shared with the cloud agent. DNS records must be created in *your* Cloudflare dashboard (or paste a Cloudflare API token into Cursor secrets later).

---

## Checklist

- [ ] Cloudflare DNS rows above
- [ ] Vercel domains + env
- [ ] Deploy branch `cursor/live-stack-mongo-98ba`
- [ ] Open `https://ordo.asfins.com/lab` or `/login`
- [ ] Hit `https://api.ordo.asfins.com/api/health`
- [ ] Confirm `api.ordo.asfins.com/` returns API-only 404 (no UI)
