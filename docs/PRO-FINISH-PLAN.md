# Professional finish plan — ORDO

Ship remaining production gaps + per-restaurant APK packaging.  
**“86”** = item marked unavailable (menu 86). Stock low-warn stays separate; **86 hard-blocks** sales on POS + guest.

---

## 1. Security
- Hash staff/admin/super passwords with Node `scrypt` (`scrypt$salt$hash`)
- Verify supports legacy plaintext once, then re-hash on login
- Never log passwords/tokens

## 2. Stock / 86
- Guest + POS + order API refuse `available: false` items (already partial)
- POS cannot add 86 items; guest tiles disabled; clear “86” label
- Optional: block when linked stock qty is 0 (if stock row exists)

## 3. Owner / marketing polish
- Marketing **product tour** section (POS → kitchen → guest → Super)
- Sales & Profit **CSV export**
- Guest paused/suspended banners + scanner CTA
- Track page: **WhatsApp status share** link (wa.me with track URL)

## 4. Per-restaurant APKs (Staff + Customer)
Pattern (AsFix-style Capacitor WebView):

| Slot | Loads | Isolation |
|---|---|---|
| Staff | `/login?app=staff&tenant=CODE` | That kitchen’s POS/orders only |
| Customer | `/guest?app=customer&tenant=CODE` | That kitchen’s menu/orders only |

Build script `scripts/build-tenant-apks.mjs`:
- Args: `--code=LAHORE1 --name="Lahore Grill"`
- Writes Capacitor `appName` = `{Name} Staff` / `{Name} Order`
- `appId` suffix from code (safe)
- `server.url` baked with `tenant=CODE`
- Outputs named APKs for Super → Apps upload

If this VM cannot assemble Android binaries, ship scripts + configs; Super upload path already stores per-tenant APKs.

## 5. Deploy
Apply → `tsc` → push **`main`**.
