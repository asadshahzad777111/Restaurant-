# ORDO Guest (Android)

Capacitor shell for **customers / clients**. Live URL: `https://ordo.asfins.com/guest`

- Does **not** open Super Admin (`/super`). Super has no separate domain.
- Guest uses restaurant code or QR.
- Built APK is uploaded on Super → **Apps** (not on restaurant admin).

```bash
cd mobile/ordo-guest
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleRelease
```

Copy the APK into Super Apps upload as `ORDO-Guest.apk`.
