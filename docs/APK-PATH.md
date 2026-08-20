# APK shells — Super only

ORDO ships **two** Android WebView shells. They are **not** on the public marketing page and **not** on restaurant Admin. Super downloads them from **Super → Apps**.

| App | Capacitor folder | Loads | Isolation |
|---|---|---|---|
| ORDO Staff | `mobile/ordo-pos` | `/login?app=staff` | Restaurant **code** required. Home: POS, kitchen, orders/billing, staff. Super is not in this APK. |
| ORDO Customer | `mobile/ordo-guest` | `/guest?app=customer` (+ `/scan`) | Kitchen **code** or table **QR**. Dining, pickup, delivery, COD. |

Runtime copies (gitignored): `.data/apks/ORDO-Staff.apk` and `.data/apks/ORDO-Customer.apk`. Super Upload writes the same paths.

## Build debug APKs (Windows)

Needs Android SDK + JDK 17+. This machine typically has SDK at `%LOCALAPPDATA%\Android\Sdk` and Android Studio's JBR.

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

# Copy app\build\outputs\apk\debug\app-debug.apk → .data\apks\ORDO-Staff.apk
# Repeat for mobile/ordo-guest → ORDO-Customer.apk
```

Or run `scripts/build-apks.ps1` from the repo root.

If Android SDK is missing, keep the Capacitor folders and use Super → Apps → **Upload APK** after building on another machine.

## Super how to download

1. Sign in at `/login` as Super (`super` / `super123` on demo).
2. Open **Apps**.
3. **Download APK** for Staff and Customer (enabled once a file exists in `.data/apks/`).
4. **Upload APK** replaces the file for that slot.

PWA remains available in the browser (`public/manifest.webmanifest`).
