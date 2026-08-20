# APK shells — Super only · per restaurant

ORDO ships **two** Capacitor Android WebView shells. Super uploads **named** binaries per kitchen so clients never mix restaurants.

| App | Folder | Deep link | Isolation |
|---|---|---|---|
| **Staff** | `mobile/ordo-pos` | `/login?app=staff&tenant=CODE` | That kitchen’s POS, kitchen, orders only. Never Super HQ. |
| **Customer** | `mobile/ordo-guest` | `/guest?app=customer&tenant=CODE` | That kitchen’s menu & orders only. |

Filenames: `ORDO-{CODE}-Staff.apk` · `ORDO-{CODE}-Customer.apk`  
App labels: `{Restaurant Name} Staff` · `{Restaurant Name} Order`

## Build per restaurant (Windows / Mac with Android SDK)

Needs **JDK 17+** (Android Studio’s `jbr`). Java 8 → Gradle “compatible with Java 11” failure.

```cmd
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr
node scripts\build-tenant-apks.cjs --code=LAHORE1 --name="Lahore Grill"
```

```bash
# From repo root — configures Capacitor + builds when ANDROID_HOME is set
# Script also auto-picks Android Studio JBR when present
node scripts/build-tenant-apks.cjs --code=LAHORE1 --name="Lahore Grill"

# Config only (this cloud VM has no SDK):
node scripts/build-tenant-apks.cjs --code=LAHORE1 --name="Lahore Grill" --skip-gradle
```

Then **Super → Apps → select restaurant → Upload** Staff + Customer.

After upload, **Admin → Settings → Your apps** downloads **only that kitchen’s** Customer/Staff APK (own `tenantId` — no other restaurant).

Legacy template build (Windows): `scripts/build-apks.ps1` → `.data/apks/ORDO-Staff.apk`.

## Admin → customers
1. Admin sets **name + logo** in Settings (live in-app branding).
2. Super builds with `--name="…"` (phone home-screen label) and uploads.
3. Admin downloads **Customer APK** and shares with diners.
4. Customer APK opens `/guest?app=customer&tenant=CODE` → that menu only.

Phone **icon** needs a rebuild when logo changes at build time; **in-app** logo follows Settings live.

## Rules
- Tenant code is baked into the start URL — guests/staff of Kitchen A cannot land on Kitchen B.
- Admin API never serves another kitchen’s APK.
- APKs never open `/super` or `/control`.
- Same live catalog & order API as the website.

## APK UX (web shell)
Notification permission prompt, tip messages, scanner during pause billing, Staff order popups.
