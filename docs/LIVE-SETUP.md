# ORDO LIVE — Cursor does the code; you only paste secrets once

Aapko Atlas/Vercel/Cloudflare **accounts** khud banana parta hai (Cursor aapke password se login nahi kar sakta).  
Code, Mongo wiring, R2 upload, Resend, health check — **Cursor ne ready kar diya**.

## Aap sirf ye 1 baar karo (copy-paste)

### A) MongoDB Atlas (5 min)
1. https://cloud.mongodb.com → Create free cluster  
2. Database Access → user + password  
3. Network Access → `0.0.0.0/0`  
4. Connect → Drivers → copy URI  

### B) Vercel (5 min)
1. https://vercel.com → Add New → Project → Import `Restaurant-`  
2. Branch: `cursor/live-stack-mongo-98ba` (or `main` after merge)  
3. **Settings → Environment Variables** → paste from `.env.example` (real values)  
4. Deploy  

### C) Cloudflare DNS
1. Domain Cloudflare pe ho  
2. Vercel → Project → Domains → add `yourdomain.com`  
3. Jo records Vercel bataye, Cloudflare DNS mein lagao  

### D) Cloudflare R2
1. R2 → Create bucket `ordo-media`  
2. Public URL / custom domain `media.yourdomain.com`  
3. Manage R2 API Tokens → create → fill `R2_*` on Vercel  

### E) Resend
1. https://resend.com → API key  
2. Domain verify (DNS)  
3. Set `RESEND_API_KEY` + `RESEND_FROM` on Vercel  

### F) Uptime
1. UptimeRobot → monitor `https://yourdomain.com/api/health`  

## Cursor ne kya kar diya
- Mongo adapter + file fallback (`/lab` localhost pe `.data/` se chalega)
- Seed: **DEMO** + **ISO2** (2 isolated restaurants) jab `MONGODB_URI` + `DEMO_SEED=true`
- `/api/upload` → R2
- Leads → Resend (agar key ho)
- WhatsApp `wa.me` + optional Cloud API env
- `/api/health` for uptime
- No refunds; cancel/void only

## Isolation check (live)
1. Login Super → create / open DEMO vs ISO2  
2. Guest `/order?tenant=DEMO` vs `/order?tenant=ISO2` — menus must not mix  
3. Export backup from Settings before any migration  

## Backup before migrate
Settings → Backup (Menu/Orders JSON) **pehley** download karo, phir Mongo pe switch.
