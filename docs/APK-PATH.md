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

The build script sets `GRADLE_USER_HOME` to repo `.gradle-home\` (gitignored) so a corrupt global `%USERPROFILE%\.gradle` lock does not block builds.

```cmd
cd /d C:\Users\asad2\Desktop\Restaurant-
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

### Live (Vercel) storage — Cloudflare R2

Super uploads on **control.asfins.com** must not write to `.data/apks` (ephemeral / read-only on serverless). With `R2_*` env vars set, binaries go to R2:

- `tenants/{tenantId}/apks/staff.apk` · `customer.apk` (and `.aab`)
- Downloads still go through Super/Admin APIs (own-tenant only) — not a public “open folder”

Seed DEMO without the UI (needs R2 credentials in the shell):

```bash
node scripts/upload-demo-apks-to-r2.cjs \
  --staff=ORDO-DEMO-Staff.apk \
  --customer=ORDO-DEMO-Customer.apk \
  --tenant-id=tenant_demo
```

Vercel request bodies are capped around **4.5MB**. Keep sideload APKs under ~4.2MB, or use the R2 seed script for larger builds.

Legacy template build (Windows): `scripts/build-apks.ps1` → `.data/apks/ORDO-Staff.apk`.

## Play Store (Google)
Use signed **`.aab`** (not APK) — see `docs/PLAY-STORE.md`.

```cmd
node scripts\build-tenant-apks.cjs --code=DEMO --name="Demo Kitchen" --release --version-code=1 --version-name=1.0.0
```

Super → Apps → Upload `.aab` · Admin Settings can download AAB for Play Console.

## Troubleshooting (Windows CMD)

### `Unexpected lock protocol found in lock file. Expected 3, found 0`
Corrupt Gradle compile cache. Stop daemons, wipe caches, rebuild:

```cmd
cd /d C:\Users\asad2\Desktop\Restaurant-
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr

if exist mobile\ordo-pos\android\gradlew.bat (
  cd mobile\ordo-pos\android & gradlew.bat --stop & cd /d C:\Users\asad2\Desktop\Restaurant-
)
if exist mobile\ordo-guest\android\gradlew.bat (
  cd mobile\ordo-guest\android & gradlew.bat --stop & cd /d C:\Users\asad2\Desktop\Restaurant-
)

rmdir /s /q "%USERPROFILE%\.gradle\caches" 2>nul
rmdir /s /q "%USERPROFILE%\.gradle\daemon" 2>nul
rmdir /s /q .gradle-home 2>nul
rmdir /s /q mobile\ordo-pos\android\.gradle 2>nul
rmdir /s /q mobile\ordo-guest\android\.gradle 2>nul

node scripts\build-tenant-apks.cjs --code=DEMO --name="Demo Kitchen"
```

### `platforms;android-34` in wrong folder (`android-34-2`)
SDK Manager sometimes installs API 34 as `platforms\android-34-2`. AGP expects `android-34`.

```cmd
dir "%LOCALAPPDATA%\Android\Sdk\platforms"
ren "%LOCALAPPDATA%\Android\Sdk\platforms\android-34-2" android-34
```

Or: Android Studio → **SDK Manager** → SDK Platforms → uncheck/reinstall **Android 14.0 (API 34)**.


## Rules
- Tenant code is baked into the start URL — guests/staff of Kitchen A cannot land on Kitchen B.
- Admin API never serves another kitchen’s APK.
- APKs never open `/super` or `/control`.
- Same live catalog & order API as the website.

## APK UX (web shell)
Notification permission prompt, tip messages, scanner during pause billing, Staff order popups.
