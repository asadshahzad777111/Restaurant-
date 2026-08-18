# APK / installable app path

ORDO is a Next.js web app. After the website look is set, ship phones like this:

## Phase 1 — PWA (already wired)
1. Open the site on a phone (Chrome / Safari).
2. **Add to Home Screen** — uses `public/manifest.webmanifest` + icon.
3. Guests, staff, and Super can each bookmark their entry:
   - Guest: `/order?tenant=CODE`
   - Staff: `/login`
   - Super: `/super`

## Phase 2 — Android APK (Capacitor)
When you are ready for a real Play Store / sideload APK:

```bash
npm i -D @capacitor/core @capacitor/cli @capacitor/android
npx cap init ORDO com.ordo.restaurant --web-dir out
```

Then:
1. Set Next.js `output: "export"` **or** point Capacitor at your hosted URL (recommended for multi-tenant SaaS).
2. `npx cap add android`
3. `npx cap open android` → Build APK/AAB in Android Studio.

**Recommended for SaaS:** keep one APK that loads your live domain (WebView shell). Each restaurant still logs in with their code — same Super / Rest Admin model.

## Roles to sell
| Role | Entry | Purpose |
|---|---|---|
| Super | `/super` | You — create restaurants, plans, leads |
| Rest Admin | `/login` + restaurant code | Sold to each restaurant owner |
| Staff | same login, limited permissions | Cashiers / kitchen |
| Guest | QR → `/order?tenant=CODE` | Diners |

Native ESC/POS printer APK hooks come after the web UX is locked.
