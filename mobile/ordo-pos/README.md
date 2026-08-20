# ORDO Staff (Android)

Capacitor shell for **POS, billing, kitchen, and staff**. Live URL: `https://ordo.asfins.com/login?app=staff`

- Does **not** open Super Admin (`/super`). Super has no extra domain.
- Login requires a **restaurant code**. After login you stay on that tenant.
- One of two Super-only APKs (the other is Customer). Not on the public marketing page.

```bash
cd mobile/ordo-pos
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleRelease
```

Upload the file in Super → Apps as `ORDO-Staff.apk`.
