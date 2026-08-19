# ORDO POS (Android)

Capacitor shell for **staff counter**. Live URL: `https://ordo.asfins.com/pos`

- Does **not** open Super Admin (`/super`). Super has no separate domain.
- Staff log in with **restaurant code** on the POS/login screen.
- Built APK is uploaded on Super → **Apps** (not on restaurant admin).

```bash
cd mobile/ordo-pos
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleRelease
```

Copy the APK into Super Apps upload as `ORDO-POS.apk`.
