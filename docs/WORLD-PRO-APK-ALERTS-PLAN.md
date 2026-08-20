# World-pro APK branding + staff alerts

Plan for **per-restaurant branded Staff/Customer APKs** and **kitchen-grade order/stock alerts**.  
Live hosts: `ordo.asfins.com` (kitchens) · `control.asfins.com` (Super only).

---

## 1. Isolation rules (never break)

| Rule | How |
|---|---|
| Tenant code baked | Staff: `/login?app=staff&tenant=CODE` · Customer: `/guest?app=customer&tenant=CODE` |
| Admin API own tenant only | `/api/admin/apks` uses `session.tenantId` — never another kitchen’s binary |
| No Super in APKs | Staff/Customer shells never open `/super` or `/control` |
| Logo/name sources | **In-app**: live `tenant.branding` from Settings · **Home-screen icon/label**: rebuild APK |
| Data isolation | Orders, stock, menu scoped by tenant session / guest `tenant=CODE` |

Mix-up regression check: Kitchen A APK must not load Kitchen B branding or orders.

---

## 2. Branding layers

| Layer | Source | Updates when |
|---|---|---|
| Android launcher label / icon | Capacitor build (`scripts/build-tenant-apks.cjs`) | **Rebuild** + Super re-upload |
| Staff login splash | Live `/api/state?tenant=CODE` when Staff APK / `tenant` preset | Settings save |
| Staff sidebar + header | Logged-in `tenant.branding.logoUrl` + `name` | Settings save |
| Customer guest splash + order header | Same live branding | Settings save |

**Documented for Admin:** phone home-screen name/icon needs a new APK build; **in-app** logo/name follow Settings immediately after save.

---

## 3. Admin share flow

1. Super uploads per-tenant Staff + Customer APK (R2) under Apps  
2. Admin → **Settings** → **Your apps** card  
3. Download **Staff APK** → share with cashiers / kitchen phones  
4. Download **Customer APK** → share with diners (WhatsApp / sideload)  
5. Preview shows **this** kitchen’s logo + name + code (locked)

Copy must say: Customer APK = diners · Staff APK = team · logos match Settings.

---

## 4. Alert architecture — who hears what

| Audience | New order alert | Continuous beep | Stock low / 86 warn |
|---|---|---|---|
| Staff / POS / Kitchen / Admin (perms: orders, kitchen, pos, or admin) | Yes | Yes until Stop | Yes (admin or stock/pos/settings) |
| Customer APK | No kitchen beep | Status notify only (optional OS notify) | No |

Order detection: poll `/api/orders?poll=1` (~10s) + store merge; first snapshot primes “seen” so historical tickets do not beep.

---

## 5. Continuous beep + stop control

- User enables sound once (gesture) → preference persisted (`localStorage`)  
- New order → **looping** alert tone until staff taps **Stop alert** / Acknowledge  
- On-screen panel: order #, type (Dine-in / Delivery / Pickup / Counter), table or address snippet  
- Capacitor WebView: AudioContext unlocked on Enable sound  
- Optional OS notification via existing `apk-notify` helpers  

---

## 6. Delivery / table / pickup coverage

| `serviceType` | Label | Extra line |
|---|---|---|
| `table` | Dine-in | Table number |
| `delivery` | Delivery | Address / phone (short) |
| `pickup` | Takeaway | Customer name if present |
| `counter` | Counter | POS channel |

All of the above trigger the same continuous beep + typed message (distinct labels, shared tone is OK for v1).

---

## 7. Stock-low alerts

- Trigger: stock row `quantity <= lowThreshold` (default threshold **5** if missing/invalid) or qty ≤ 0 (86-style stock block already in order API)  
- Surface: StaffAlerts banner/toast (not only Home/POS cards) when items **newly** enter low state after hydrate  
- Who: Admin, or staff with `stock` / `pos` / `settings`  

---

## 8. Already exists vs gaps

| Area | Exists | Gap → this rollout |
|---|---|---|
| Admin APK download (R2) | `AdminApkCard`, `/api/admin/apks` | Clearer share copy |
| Customer splash branding | Guest + order header | Keep consistent |
| Staff sidebar logo | Yes | Header logo; Staff login live brand |
| Poll + short beep | `StaffAlerts` one-shot osc | Continuous loop + Stop |
| Sound preference | In-memory button only | Persist enable |
| Order type message | Generic “guest order” | Type + table/delivery |
| Stock low | Home/POS cards only | Alert toast when newly low |
| Plan doc | World-pro roadmap | This focused plan |

---

## 9. Apply checklist

- [x] Plan doc (`docs/WORLD-PRO-APK-ALERTS-PLAN.md`)  
- [x] Staff sound lib: loop + stop + persisted pref  
- [x] StaffAlerts: all service types, stop UI, stock-low  
- [x] Staff login branding when `tenant` / Staff shell  
- [x] AppShell header logo from Settings  
- [x] AdminApkCard copy polish  
- [x] Guest splash already branded — verify name+logo  
- [x] No APK binaries / keystores in git  
- [x] iOS / PWA plan + Admin install links + dynamic manifest  
- [ ] `tsc` / lint · push · PR → main when green  

---

## 10. Admin test script

1. Settings → set logo + name → save  
2. Open Staff shell (or APK): login/home show that logo/name  
3. Enable order sound → place guest table / delivery / pickup order  
4. Hear continuous beep → tap **Stop alert** → sound stops  
5. Drop a stock qty under threshold → see stock-low alert  
6. Download Staff + Customer APKs; confirm filenames include kitchen code  

---

## 11. iPhone / iOS (web + PWA — no APK)

iOS cannot install Android APKs. Kitchens use **Safari / Add to Home Screen** with the **same** `tenant=CODE` isolation and Settings branding.

Full plan: **`docs/IOS-PWA-SAFE-PLAN.md`**.

| Audience | Install link |
|---|---|
| Customer | `/guest?app=customer&tenant=CODE` |
| Staff / Admin | `/login?app=staff&tenant=CODE` |

Admin Settings shows copyable absolute URLs + Add to Home Screen steps. Alerts: same Enable sound / Stop alert (iOS autoplay limits documented in iOS plan).  
