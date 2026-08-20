# APK shells — Super only

ORDO ships **two** Android WebView shells. They are **not** on the public marketing page and **not** on restaurant Admin. Super downloads them from **Super → Apps** (per restaurant).

| App | Capacitor folder | Loads | Isolation |
|---|---|---|---|
| ORDO Staff | `mobile/ordo-pos` | `/login?app=staff&tenant=CODE` | Kitchen **code** required. POS, kitchen, orders/billing, staff. Super never opens. |
| ORDO Customer | `mobile/ordo-guest` | `/guest?app=customer&tenant=CODE` (+ `/scan`) | Kitchen **code** or table **QR**. Dining, pickup, delivery, COD. |

Per-restaurant binaries: `.data/apks/tenants/{tenantId}/` → `ORDO-{CODE}-Staff.apk` / `ORDO-{CODE}-Customer.apk`.

## APK experience (web shell)

When `?app=staff` or `?app=customer` is set, ORDO turns on:

- Delayed **notification permission** popup
- Tip messages (scanner stays available during pause billing)
- Staff order popups via Web Notifications + sound
- Customer: scanner → menu even when kitchen billing is paused (orders blocked only when fully suspended)

## Google / Gmail

Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (and matching OAuth client for `ordo.asfins.com`).

- **Staff**: Gmail must already be saved on that user (Super → Passwords & Gmail, or Admin Settings).
- **Customer**: Sign in with Google registers a guest client for that restaurant **code** only.

## Super → Admin without password

**Open Admin (no password)** = Help mode. Yellow banner + Back to ORDO HQ. Never shares the Super session with the kitchen.

## Build debug APKs (Windows)

Needs Android SDK + JDK 17+.

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

cd mobile/ordo-pos
npm install
npx cap add android
npx cap sync android
cd android
.\gradlew.bat assembleDebug
# Upload via Super → Apps for that restaurant
```

Repeat for `mobile/ordo-guest`. Or `scripts/build-apks.ps1`.

Bake tenant into Capacitor `server.url` when packaging a kitchen-specific APK, e.g.  
`https://ordo.asfins.com/login?app=staff&tenant=LAHORE1`.
