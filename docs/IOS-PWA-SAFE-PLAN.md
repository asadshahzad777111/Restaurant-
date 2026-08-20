# iOS / iPhone safe web + PWA plan

Android APKs do **not** run on iPhone. iOS guests, staff, and Admin use **Safari / Chrome web** and optional **Add to Home Screen (PWA)**.  
Same isolation rules as Android Staff/Customer APKs — **no kitchen merge**.

Companion: `docs/WORLD-PRO-APK-ALERTS-PLAN.md` (Android + alerts).

Live app host: `https://ordo.asfins.com` (never `control.asfins.com` for kitchens).

---

## 1. Product rule

| Platform | Distribution |
|---|---|
| Android | Per-tenant Staff + Customer **APK** (Super upload → Admin download) |
| iPhone / iPad | Per-tenant **web links** + **Add to Home Screen** (no App Store binary required for v1) |

Both surfaces show the **same** Settings logo/name and the **same** tenant-scoped data.

---

## 2. Entry URLs (locked to kitchen code)

| Audience | URL pattern | Shell |
|---|---|---|
| **Customer** | `/guest?app=customer&tenant=CODE` | Customer — opens that menu only |
| **Staff / Admin / POS** | `/login?app=staff&tenant=CODE` | Staff — restaurant login only (no Super HQ) |

Admin Settings shows **copyable** absolute URLs for both. Share via WhatsApp / Messages.

Optional PWA start after install: same URLs (manifest `start_url` includes `tenant` + `app`).

---

## 3. Isolation (never break)

1. `tenant=CODE` always present on Customer/Staff install links  
2. Customer shell with baked tenant: **no code picker** / cannot open another kitchen  
3. Staff shell: Super HQ hidden; `control.asfins.com` is not part of kitchen PWA  
4. Logged-in staff session is `session.tenantId` only — APIs never cross tenants  
5. `localStorage` last-kitchen keys must not override a **locked** Customer start URL  
6. Mix-up check: Kitchen A Home Screen icon must not load Kitchen B menu/orders  

---

## 4. Branding

| Layer | iOS behaviour |
|---|---|
| In-Safari / PWA chrome (header, splash, sidebar) | Live `branding.name` + `branding.logoUrl` from Settings |
| Home Screen **label** | Best-effort via dynamic web manifest `name` / `short_name` = restaurant · Staff/Customer |
| Home Screen **icon** | Prefer restaurant logo URL in manifest when HTTPS image available; else ORDO mark. Changing icon after first Add to Home Screen usually needs remove + re-add |

Document for Admin: in-app branding is live; Home Screen icon/label may need re-add after logo change.

---

## 5. Order alerts on iOS (Safari + PWA)

Staff alerts (continuous beep, Stop, stock-low) use the same Web Audio path as Android WebView.

| Constraint | Professional UX |
|---|---|
| Autoplay blocked until gesture | Persistent **Enable order sound** (saved) |
| Background Safari often suspends audio | On-screen **Stop alert** panel + optional OS notify when permitted; poll when visible |
| Installed PWA slightly better foreground | Same Enable / Stop controls |
| Notifications | Best-effort `Notification` API; iOS version-dependent |

Never rely on silent background alone — panel + beep while app is open is the world-pro bar.

---

## 6. Online vs offline

| Capability | Online | Offline |
|---|---|---|
| Menu / place order / POS / kitchen tickets | Yes | No (needs API) |
| Cached static shell / last branding flash | Best-effort browser cache | Limited |
| Alerts / poll | Yes when connected | Pause |

v1 does **not** ship a full offline-first service worker catalog. Honest copy: “Needs internet; Add to Home Screen for app-like icon.”

---

## 7. Admin Settings UX (apply)

Under **Your apps**:

1. Android: Staff/Customer APK (+ AAB) downloads (existing)  
2. **iPhone / iPad** section:
   - Customer install link (copy)  
   - Staff install link (copy)  
   - Short steps: Safari → Open link → Share → **Add to Home Screen**  
   - Reminder: logo/name = Settings; no mix with other kitchens  

---

## 8. Technical apply

- Dynamic manifest: `/api/manifest?tenant=CODE&app=staff|customer`  
- Client swaps `link[rel=manifest]` + apple-mobile-web-app-title when shell+tenant known  
- Global layout keeps capable apple web app meta  
- Customer/Staff paths already branded; harden lock + Admin copy  

---

## 9. Checklist

- [x] This plan doc  
- [x] Dynamic tenant manifest API  
- [x] Client PWA meta binder  
- [x] Admin iPhone install URLs + copy  
- [x] Customer locked-shell isolation harden  
- [x] World-pro plan cross-link  
- [x] Commit / push (CI → main when green)  

---

## 10. How Admin tests (iPhone)

1. Settings → copy Customer URL → open on iPhone Safari → only that kitchen  
2. Share → Add to Home Screen → open icon → still same kitchen  
3. Copy Staff URL → login → logo/name match Settings → Enable sound → order beep → Stop  
4. Confirm no path to ORDO HQ from Staff PWA  
