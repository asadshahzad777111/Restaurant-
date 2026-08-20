# ORDO Customer (Android)

Capacitor shell for **dining, pickup, delivery, COD, and QR scan**. Live URL: `https://ordo.asfins.com/guest?app=customer`

- Guests enter a restaurant code or scan a table QR, then stay on that kitchen.
- Does **not** open Super Admin. Download only from Super → Apps.

```bash
cd mobile/ordo-guest
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleRelease
```

Upload the file in Super → Apps as `ORDO-Customer.apk`.
