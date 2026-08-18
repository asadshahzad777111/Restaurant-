# ORDO LIVE on asfins.com — code in Cursor; secrets only in Vercel

## Professional hosts (already wired in code)

| Surface | URL |
|---------|-----|
| Restaurant OS UI | https://ordo.asfins.com |
| Backend API only | https://api.ordo.asfins.com |
| Media (R2) | https://media.ordo.asfins.com |

Full DNS click-path: **[ASFINS-DNS.md](./ASFINS-DNS.md)**

## Aap 1 baar (accounts + paste)

### A) MongoDB Atlas
Create free cluster → copy URI → Vercel env `MONGODB_URI`

### B) Vercel
Import `Restaurant-` → branch `cursor/live-stack-mongo-98ba`  
Domains: `ordo.asfins.com` + `api.ordo.asfins.com`  
Env: copy from `.env.example` (real values)

### C) Cloudflare DNS (asfins.com)
See ASFINS-DNS.md — CNAME `ordo` + `api.ordo` → Vercel

### D) R2 bucket `ordo-media` + custom domain `media.ordo.asfins.com`

### E) WhatsApp
Set `CONTACT_WHATSAPP` (e.g. `92300...`) on Vercel — app builds `wa.me` links

### F) Uptime
Monitor `https://api.ordo.asfins.com/api/health`

## Cursor ne code mein kya laga diya
- Split hosts + middleware (API host serves `/api` only)
- CORS allowlist for `ordo.asfins.com`
- Security headers
- Client calls go to `NEXT_PUBLIC_API_URL` when set
- Mongo / R2 / Resend / health (file fallback on localhost `/lab`)

## Important
Aapke Cursor browser ka Cloudflare/WhatsApp login **cloud agent tak share nahi hota**.  
DNS aapke Cloudflare dashboard mein add karo; phir agent deploy checks karega.
