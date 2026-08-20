# ORDO LIVE — restaurants vs owner control + R2 backup

## Hosts
| Who | URL |
|-----|-----|
| Restaurants / demo | https://ordo.asfins.com |
| **You (owner)** | https://control.asfins.com |
| API | https://api.ordo.asfins.com |
| Media + backups | https://media.ordo.asfins.com |

Restaurant `/login` = staff only (**no Super button**).  
Owner uses **control** → **Open** = enter restaurant without their password.

DNS detail: [ASFINS-DNS.md](./ASFINS-DNS.md)

## Hosting note
Vercel **Hobby free tier is enough** for this MVP — no Pro upgrade required.  
Backups use **Cloudflare R2**, not paid Vercel storage.

## You paste once
1. Mongo URI  
2. Domains: ordo + control + api.ordo  
3. R2 keys + `media.ordo`  
4. `CONTACT_WHATSAPP`  
5. Deploy branch `main` (Vercel Production)

## Local
`npm run dev` → http://localhost:3000/lab  
Owner local: `/login?owner=1` → `/control`
