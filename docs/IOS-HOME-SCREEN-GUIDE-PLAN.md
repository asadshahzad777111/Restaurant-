# iOS Add to Home Screen — in-link visual guide

## Goal
Jis iPhone user ko **Add to Home Screen** nahi aata, shared Customer/Staff link kholte hi **asaan picture steps** (optional short tip animation) dikhein — video hosting ke baghair, WhatsApp-friendly.

## Flow
1. Admin copies Customer/Staff URL (already includes `tenant=CODE` + `app=`).
2. URL also includes `guide=1` so first open always offers the guide.
3. On **iPhone/iPad Safari** (not already Home Screen / standalone): full-screen / sheet guide with 3–4 visual steps.
4. Buttons: **Home Screen pe add kar liya** → continue · **Abhi Safari mein chalo** → dismiss for session.
5. Already installed PWA (`standalone` / `navigator.standalone`): guide skip.

## Steps shown (Safari)
1. Bottom/top **Share** button (square + arrow)  
2. Scroll → **Add to Home Screen**  
3. Tap **Add**  
4. Open icon from Home Screen (branded kitchen)

## Surfaces
| Page | When |
|---|---|
| `/guest?app=customer&tenant=CODE&guide=1` | Diners |
| `/login?app=staff&tenant=CODE&guide=1` | Staff / Admin POS |
| Optional order entry | If still iOS browser mid-flow |

## Isolation
Guide does not change tenant; it only teaches install. Locked `tenant=CODE` unchanged.

## Apply
- `IosHomeScreenGuide` component + CSS illustrations  
- `guide=1` on `tenantInstallUrl`  
- Guest: delay auto-menu redirect until guide finished/skipped on iOS  
- Staff login: show guide above form  
- Admin Install card: note “link kholte hi guide aati hai”  
- Docs + main ship  
