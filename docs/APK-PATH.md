# APK shells — Super only · per restaurant

ORDO ships **two** Capacitor Android WebView shells. Super uploads **named** binaries per kitchen so clients never mix restaurants.

| App | Folder | Deep link | Isolation |
|---|---|---|---|
| **Staff** | `mobile/ordo-pos` | `/login?app=staff&tenant=CODE` | That kitchen’s POS, kitchen, orders only. Never Super HQ. |
| **Customer** | `mobile/ordo-guest` | `/guest?app=customer&tenant=CODE` | That kitchen’s menu & orders only. |

Filenames: `ORDO-{CODE}-Staff.apk` · `ORDO-{CODE}-Customer.apk`  
App labels: `{Restaurant Name} Staff` · `{Restaurant Name} Order`

## Build per restaurant (Windows / Mac with Android SDK)

```bash
# From repo root — configures Capacitor + builds when ANDROID_HOME is set
node scripts/build-tenant-apks.mjs --code=LAHORE1 --name="Lahore Grill"

# Config only (this cloud VM has no SDK):
node scripts/build-tenant-apks.mjs --code=LAHORE1 --name="Lahore Grill" --skip-gradle
```

Then **Super → Apps → select restaurant → Upload** Staff + Customer.

Legacy template build (Windows): `scripts/build-apks.ps1` → `.data/apks/ORDO-Staff.apk`.

## Rules
- Tenant code is baked into the start URL — guests/staff of Kitchen A cannot land on Kitchen B.
- APKs never open `/super` or `/control`.
- Same live catalog & order API as the website.

## APK UX (web shell)
Notification permission prompt, tip messages, scanner during pause billing, Staff order popups.
