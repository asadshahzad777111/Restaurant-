# asfins.com — ORDO live subdomains

| Role | Hostname | Purpose |
|------|----------|---------|
| **Restaurants** | `ordo.asfins.com` | Guest + staff. **No owner panel.** |
| **Owner control** | `control.asfins.com` | **You only** — create restaurants, Open to help (no restaurant password) |
| **API** | `api.ordo.asfins.com` | `/api/*` only |
| **Media + backups** | `media.ordo.asfins.com` | Cloudflare R2 (logos + JSON backups) |

Guest: `https://ordo.asfins.com/order?tenant=DEMO`  
Owner: `https://control.asfins.com/login` → Control → **Open**  
Health: `https://api.ordo.asfins.com/api/health`

Hosting: Vercel **Hobby (free) is enough** — no Pro upgrade required for this MVP.  
Data backup: **Cloudflare R2** (Settings → Backup to R2), not a paid Vercel add-on.

---

## Cloudflare DNS

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `ordo` | `cname.vercel-dns.com` | DNS only |
| CNAME | `control` | `cname.vercel-dns.com` | DNS only |
| CNAME | `api.ordo` | `cname.vercel-dns.com` | DNS only |
| CNAME | `media.ordo` | *(R2 custom domain)* | Orange OK |

---

## Hosting domains (same project)

Add: `ordo.asfins.com`, `control.asfins.com`, `api.ordo.asfins.com`

---

## Env

```
NEXT_PUBLIC_APP_URL=https://ordo.asfins.com
NEXT_PUBLIC_CONTROL_URL=https://control.asfins.com
NEXT_PUBLIC_API_URL=https://api.ordo.asfins.com
NEXT_PUBLIC_APP_HOST=ordo.asfins.com
NEXT_PUBLIC_CONTROL_HOST=control.asfins.com
NEXT_PUBLIC_API_HOST=api.ordo.asfins.com
MONGODB_URI=...
MONGODB_DB=ordo
DEMO_SEED=true
SESSION_SECRET=...
CONTACT_WHATSAPP=92XXXXXXXXXX
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=ordo-media
R2_PUBLIC_BASE_URL=https://media.ordo.asfins.com
```

## R2 backup

1. Bucket `ordo-media` + public domain `media.ordo.asfins.com`  
2. API token with Object Read & Write  
3. Restaurant Settings → **Backup to Cloudflare R2** → `backups/CODE/...json`  
4. Rotate keys anytime — no chat/git secrets

## Checklist

- [ ] DNS rows above  
- [ ] Domains + env  
- [ ] Restaurant login has **no** owner button  
- [ ] `control.asfins.com` → Open restaurant works without their password  
- [ ] R2 backup button works  
